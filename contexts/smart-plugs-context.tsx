"use client"

import React, { createContext, useContext, ReactNode } from 'react'
import { useIntegrationModules } from '@/hooks/use-integration-modules'
import { useSmartPlugsFloatingMenu } from '@/hooks/use-smart-plugs-floating-menu'

interface SmartPlugsContextType {
  smartPlugsData: any | null
  isShellyActive: boolean
  isLoading: boolean
}

const SmartPlugsContext = createContext<SmartPlugsContextType | undefined>(undefined)

interface SmartPlugsProviderProps {
  children: ReactNode
}

export function SmartPlugsProvider({ children }: SmartPlugsProviderProps) {
  const { isShellyActive, isLoading: isLoadingIntegrations } = useIntegrationModules()
  
  // ✅ SIEMPRE ejecutar el hook para mantener orden consistente de hooks
  const smartPlugsDataRaw = useSmartPlugsFloatingMenu()
  
  // ✅ PERO solo usar los datos si el módulo está activo
  const smartPlugsData = isShellyActive ? smartPlugsDataRaw : null
  
  const value: SmartPlugsContextType = {
    smartPlugsData,
    isShellyActive,
    isLoading: isLoadingIntegrations
  }

  return (
    <SmartPlugsContext.Provider value={value}>
      {children}
    </SmartPlugsContext.Provider>
  )
}

export function useSmartPlugsContext(): SmartPlugsContextType {
  const context = useContext(SmartPlugsContext)
  if (context === undefined) {
    throw new Error('useSmartPlugsContext debe usarse dentro de un SmartPlugsProvider')
  }
  return context
}

// Hook opcional que no lanza error si se usa fuera del provider
export function useSmartPlugsContextOptional(): SmartPlugsContextType | null {
  const context = useContext(SmartPlugsContext)
  return context || null
} 