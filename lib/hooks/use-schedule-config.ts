'use client'

import { useState, useEffect } from 'react'

interface ScheduleConfig {
  slotDuration: number
  createGranularity: number
  moveGranularity: number
}

interface UseScheduleConfigProps {
  clinicId: string
}

// Granularidades válidas por duración de slot
export const VALID_GRANULARITIES: Record<number, number[]> = {
  15: [1, 3, 5, 15],
  30: [1, 2, 3, 5, 6, 10, 15, 30],
  45: [1, 3, 5, 9, 15, 45],
  60: [1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60]
}

// Granularidades por defecto recomendadas
export const DEFAULT_GRANULARITIES: Record<number, number> = {
  15: 5,   // Cada 5 minutos (3 posiciones por slot)
  30: 10,  // Cada 10 minutos (3 posiciones por slot)
  45: 15,  // Cada 15 minutos (3 posiciones por slot)
  60: 15   // Cada 15 minutos (4 posiciones por slot)
}

export function validateGranularity(slotDuration: number, granularity: number): boolean {
  return slotDuration % granularity === 0
}

export function getValidGranularities(slotDuration: number): number[] {
  return VALID_GRANULARITIES[slotDuration] || [1, 5, 10, 15]
}

export function useScheduleConfig({ clinicId }: UseScheduleConfigProps) {
  const [config, setConfig] = useState<ScheduleConfig>({
    slotDuration: 30,
    createGranularity: 5,
    moveGranularity: 1
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchScheduleConfig() {
      try {
        setLoading(true)
        
        // Primero obtener la clínica para ver si usa template
        const clinicResponse = await fetch(`/api/clinics/${clinicId}`)
        if (!clinicResponse.ok) throw new Error('Error al cargar clínica')
        const clinic = await clinicResponse.json()
        
        let scheduleData: any
        
        if (clinic.linkedScheduleTemplateId) {
          // Usar template
          const templateResponse = await fetch(`/api/schedule-templates/${clinic.linkedScheduleTemplateId}`)
          if (!templateResponse.ok) throw new Error('Error al cargar template')
          scheduleData = await templateResponse.json()
        } else {
          // Usar horario personalizado
          const scheduleResponse = await fetch(`/api/clinics/${clinicId}/schedule`)
          if (!scheduleResponse.ok) throw new Error('Error al cargar horario')
          scheduleData = await scheduleResponse.json()
        }
        
        // Aplicar configuración con valores por defecto si no existen
        const slotDuration = scheduleData.slotDuration || 30
        const createGranularity = scheduleData.createGranularity || DEFAULT_GRANULARITIES[slotDuration] || 5
        
        // Validar coherencia
        if (!validateGranularity(slotDuration, createGranularity)) {
          console.warn(`Granularidad ${createGranularity} no es divisor de slot ${slotDuration}, usando valor por defecto`)
          setConfig({
            slotDuration,
            createGranularity: DEFAULT_GRANULARITIES[slotDuration] || 5,
            moveGranularity: 1
          })
        } else {
          setConfig({
            slotDuration,
            createGranularity,
            moveGranularity: 1
          })
        }
        
      } catch (err) {
        console.error('Error cargando configuración de horario:', err)
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }
    
    if (clinicId) {
      fetchScheduleConfig()
    }
  }, [clinicId])
  
  return { config, loading, error }
}
