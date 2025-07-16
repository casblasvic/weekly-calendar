/**
 * 🔧 HOOK DE CONFIGURACIÓN DE LOGS WEBSOCKET
 * Hook para gestionar la configuración de logs de WebSocket
 * @see docs/WEBSOCKET_LOG_MANAGEMENT.md
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { WebSocketLogSettings, WebSocketLogConfig } from '@/lib/websocket/log-manager'

interface WebSocketLogResponse {
  success: boolean
  data: WebSocketLogSettings
  message?: string
}

/**
 * Obtener configuración de logs
 */
async function fetchWebSocketLogs(): Promise<WebSocketLogSettings> {
  const response = await fetch('/api/internal/websocket-logs')
  
  if (!response.ok) {
    throw new Error('Error al obtener configuración de logs')
  }
  
  const data: WebSocketLogResponse = await response.json()
  return data.data
}

/**
 * Actualizar configuración completa de logs
 */
async function updateWebSocketLogs(settings: WebSocketLogSettings): Promise<WebSocketLogSettings> {
  const response = await fetch('/api/internal/websocket-logs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(settings),
  })
  
  if (!response.ok) {
    throw new Error('Error al actualizar configuración de logs')
  }
  
  const data: WebSocketLogResponse = await response.json()
  return data.data
}

/**
 * Actualizar tipo específico de log
 */
async function updateLogType(logType: string, enabled: boolean): Promise<WebSocketLogSettings> {
  const response = await fetch('/api/internal/websocket-logs', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ logType, enabled }),
  })
  
  if (!response.ok) {
    throw new Error('Error al actualizar tipo de log')
  }
  
  const data: WebSocketLogResponse = await response.json()
  return data.data
}

/**
 * Resetear configuración de logs
 */
async function resetWebSocketLogs(): Promise<WebSocketLogSettings> {
  const response = await fetch('/api/internal/websocket-logs', {
    method: 'DELETE',
  })
  
  if (!response.ok) {
    throw new Error('Error al resetear configuración de logs')
  }
  
  const data: WebSocketLogResponse = await response.json()
  return data.data
}

/**
 * Hook principal para gestionar logs de WebSocket
 */
export function useWebSocketLogs() {
  const queryClient = useQueryClient()
  
  const {
    data: logSettings,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['websocket-logs'],
    queryFn: fetchWebSocketLogs,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  })

  const updateSettingsMutation = useMutation({
    mutationFn: updateWebSocketLogs,
    onSuccess: (data) => {
      queryClient.setQueryData(['websocket-logs'], data)
      toast.success('Configuración de logs actualizada exitosamente')
    },
    onError: (error) => {
      console.error('Error al actualizar configuración:', error)
      toast.error('Error al actualizar configuración de logs')
    }
  })

  const updateLogTypeMutation = useMutation({
    mutationFn: ({ logType, enabled }: { logType: string; enabled: boolean }) => 
      updateLogType(logType, enabled),
    onSuccess: (data) => {
      queryClient.setQueryData(['websocket-logs'], data)
      toast.success('Configuración de log actualizada')
    },
    onError: (error) => {
      console.error('Error al actualizar tipo de log:', error)
      toast.error('Error al actualizar tipo de log')
    }
  })

  const resetMutation = useMutation({
    mutationFn: resetWebSocketLogs,
    onSuccess: (data) => {
      queryClient.setQueryData(['websocket-logs'], data)
      toast.success('Configuración de logs reseteada exitosamente')
    },
    onError: (error) => {
      console.error('Error al resetear configuración:', error)
      toast.error('Error al resetear configuración de logs')
    }
  })

  return {
    // Datos
    logSettings,
    isLoading,
    error,
    
    // Acciones
    updateSettings: updateSettingsMutation.mutate,
    updateLogType: updateLogTypeMutation.mutate,
    resetSettings: resetMutation.mutate,
    refetch,
    
    // Estados de carga
    isUpdating: updateSettingsMutation.isPending,
    isUpdatingLogType: updateLogTypeMutation.isPending,
    isResetting: resetMutation.isPending,
    
    // Helpers
    isLogTypeEnabled: (logType: keyof WebSocketLogConfig) => {
      if (!logSettings) return false
      return logSettings.enabled && logSettings.config[logType]
    },
    
    isLoggingEnabled: () => {
      if (!logSettings) return false
      return logSettings.enabled
    },
    
    getEnabledLogsCount: () => {
      if (!logSettings) return 0
      return Object.values(logSettings.config).filter(Boolean).length
    },
    
    getTotalLogsCount: () => {
      if (!logSettings) return 0
      return Object.keys(logSettings.config).length
    }
  }
}

export default useWebSocketLogs