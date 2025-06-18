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
  
  // Actualizar cuando cambie la configuración de BD
  useEffect(() => {
    setMinuteGranularity(config.createGranularity)
  }, [config.createGranularity])
  
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
        slotDuration: config.slotDuration,
        moveGranularity: config.moveGranularity,
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
