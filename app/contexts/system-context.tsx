"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useLocalStorage } from '@/app/hooks/use-local-storage'
import { ThemeConfig } from '@/app/contexts/theme-context'

// Interfaz para la configuración del sistema
export interface SystemConfig {
  // Configuración visual
  theme: ThemeConfig;
  
  // Configuración general
  companyName: string;
  language: string;
  timeZone: string;
  dateFormat: string;
  
  // Configuración de almacenamiento
  maxFileSize: number; // En MB
  allowedFileTypes: string[];
  storageQuota: number; // En MB
  
  // Configuración de usuarios
  defaultUserRole: string;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };
}

// Valores predeterminados del sistema
const defaultSystemConfig: SystemConfig = {
  theme: {
    primaryColor: '#7c3aed', // Purple-600
    secondaryColor: '#8b5cf6', // Purple-500
    accentColor: '#a78bfa', // Purple-400
    textColor: '#111827', // Gray-900
    backgroundColor: '#ffffff', // White
    logoUrl: '/placeholder-logo.svg', // Logo predeterminado Qleven
  },
  companyName: 'Mi Empresa',
  language: 'es',
  timeZone: 'Europe/Madrid',
  dateFormat: 'DD/MM/YYYY',
  maxFileSize: 10,
  allowedFileTypes: ['image/png', 'image/jpeg', 'image/gif', 'application/pdf', 'text/plain'],
  storageQuota: 1000,
  defaultUserRole: 'user',
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
  },
}

// Interfaz para el contexto
interface SystemContextType {
  systemConfig: SystemConfig;
  updateSystemConfig: (config: Partial<SystemConfig>) => void;
  updateTheme: (theme: ThemeConfig) => void;
  resetSystemConfig: () => void;
  
  // Métodos de utilidad
  saveSystemConfig: () => Promise<boolean>;
  getLogoUrl: () => string;
}

// Crear el contexto
const SystemContext = createContext<SystemContextType | undefined>(undefined)

// Hook personalizado para acceder al contexto
export const useSystem = () => {
  const context = useContext(SystemContext)
  if (!context) {
    throw new Error('useSystem debe ser usado dentro de un SystemProvider')
  }
  return context
}

// Proveedor del contexto
export const SystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Usar localStorage para persistir la configuración
  const [storedConfig, setStoredConfig] = useLocalStorage<SystemConfig>('app-system-config', defaultSystemConfig)
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(storedConfig)
  const [isSaving, setIsSaving] = useState<boolean>(false)

  // Sincronizar con localStorage
  useEffect(() => {
    setSystemConfig(storedConfig)
  }, [storedConfig])

  // Actualizar la configuración completa o parcial
  const updateSystemConfig = (config: Partial<SystemConfig>) => {
    setSystemConfig(prev => ({
      ...prev,
      ...config
    }))
  }

  // Actualizar solo el tema
  const updateTheme = (theme: ThemeConfig) => {
    setSystemConfig(prev => ({
      ...prev,
      theme
    }))
  }

  // Restablecer a valores predeterminados
  const resetSystemConfig = () => {
    setSystemConfig(defaultSystemConfig)
  }

  // Guardar la configuración
  const saveSystemConfig = async (): Promise<boolean> => {
    try {
      setIsSaving(true)
      
      // Aquí se guardaría en la base de datos en un entorno real
      // Por ahora, solo actualizamos el localStorage
      setStoredConfig(systemConfig)
      
      // Simular un delay para mostrar el feedback de guardado
      await new Promise(resolve => setTimeout(resolve, 500))
      
      return true
    } catch (error) {
      console.error('Error al guardar la configuración del sistema:', error)
      return false
    } finally {
      setIsSaving(false)
    }
  }

  // Obtener la URL del logo (con tratamiento para URLs relativas o absolutas)
  const getLogoUrl = (): string => {
    const logoUrl = systemConfig.theme.logoUrl
    
    // Si es una URL absoluta o un objeto URL (creado con createObjectURL), devolverla directamente
    if (logoUrl.startsWith('http') || logoUrl.startsWith('blob:')) {
      return logoUrl
    }
    
    // Si es una ruta relativa, construir la URL completa
    return logoUrl.startsWith('/') 
      ? `${window.location.origin}${logoUrl}` 
      : `${window.location.origin}/${logoUrl}`
  }

  return (
    <SystemContext.Provider
      value={{
        systemConfig,
        updateSystemConfig,
        updateTheme,
        resetSystemConfig,
        saveSystemConfig,
        getLogoUrl,
      }}
    >
      {children}
    </SystemContext.Provider>
  )
}

// Hook para guardar y manejar el estado de guardado
export const useSaveSystem = () => {
  const { saveSystemConfig } = useSystem()
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaveResult, setLastSaveResult] = useState<boolean | null>(null)

  const save = async () => {
    setIsSaving(true)
    try {
      const result = await saveSystemConfig()
      setLastSaveResult(result)
      return result
    } finally {
      setIsSaving(false)
    }
  }

  return { save, isSaving, lastSaveResult }
} 