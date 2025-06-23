'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useScheduleConfig } from '@/lib/hooks/use-schedule-config'
import { useClinic } from '@/contexts/clinic-context'

interface GranularityContextValue {
  minuteGranularity: number
  setMinuteGranularity: (value: number) => void
  slotDuration: number
  moveGranularity: number
  isLoading: boolean
}

const GranularityContext = createContext<GranularityContextValue | null>(null)

interface GranularityProviderProps {
  children: React.ReactNode
}

export function GranularityProvider({ children }: GranularityProviderProps) {
  const { activeClinic } = useClinic()
  const clinicId = activeClinic?.id || ''
  const { config, loading } = useScheduleConfig({ clinicId })
  const [minuteGranularity, setMinuteGranularity] = useState(config.createGranularity)
  
  // ✅ ESTABILIZAR VALORES: Solo cambiar cuando NO esté loading
  const [stableConfig, setStableConfig] = useState(config)
  
  // Actualizar solo cuando termine de cargar y haya valores definitivos
  useEffect(() => {
    if (!loading) {
      setStableConfig(config)
      setMinuteGranularity(config.createGranularity)
    }
  }, [config, loading])
  
  // Si no hay clínica activa, usar valores por defecto
  if (!activeClinic) {
    return (
      <GranularityContext.Provider 
        value={{ 
          minuteGranularity: 5,
          setMinuteGranularity,
          slotDuration: 30,
          moveGranularity: 1,
          isLoading: false
        }}
      >
        {children}
      </GranularityContext.Provider>
    )
  }
  
  return (
    <GranularityContext.Provider 
      value={{ 
        minuteGranularity,
        setMinuteGranularity,
        slotDuration: stableConfig.slotDuration, // ✅ Usar config estable
        moveGranularity: stableConfig.moveGranularity, // ✅ Usar config estable
        isLoading: loading
      }}
    >
      {children}
    </GranularityContext.Provider>
  )
}

export function useGranularity() {
  const context = useContext(GranularityContext)
  if (!context) {
    throw new Error('useGranularity debe usarse dentro de GranularityProvider')
  }
  return context
}
