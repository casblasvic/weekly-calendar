/**
 * 🔧 WEBSOCKET MANAGER - CONFIGURACIÓN DE LOGS
 * Página para gestionar la configuración de logs de WebSocket
 * @see docs/WEBSOCKET_LOG_MANAGEMENT.md
 */

'use client'

import { useWebSocketLogs } from '@/lib/hooks/use-websocket-logs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { 
  Activity, 
  Zap, 
  Radio, 
  Settings, 
  RotateCcw, 
  CheckCircle, 
  XCircle,
  Info,
  AlertCircle,
  Terminal
} from 'lucide-react'

const logTypeConfig = {
  liveSample: {
    label: 'Live Sample',
    description: 'Logs de muestras de datos en tiempo real',
    icon: Activity,
    color: 'bg-blue-500'
  },
  webSocketRaw: {
    label: 'WebSocket Raw',
    description: 'Logs de mensajes WebSocket raw',
    icon: Radio,
    color: 'bg-purple-500'
  },
  deviceStatusUpdate: {
    label: 'Device Status Update',
    description: 'Logs de actualizaciones de estado de dispositivos',
    icon: Settings,
    color: 'bg-green-500'
  },
  deviceUpdate: {
    label: 'Device Update',
    description: 'Logs de callbacks de dispositivos ejecutados',
    icon: Zap,
    color: 'bg-yellow-500'
  },
  socketJs: {
    label: 'Socket.JS',
    description: 'Logs del procesamiento de Socket.js',
    icon: Terminal,
    color: 'bg-red-500'
  },
  apiCalls: {
    label: 'API Calls',
    description: 'Logs de llamadas a APIs relacionadas con WebSocket',
    icon: Activity,
    color: 'bg-indigo-500'
  }
}

export default function WebSocketManagerPage() {
  const {
    logSettings,
    isLoading,
    error,
    updateLogType,
    resetSettings,
    isUpdatingLogType,
    isResetting,
    isLoggingEnabled,
    getEnabledLogsCount,
    getTotalLogsCount
  } = useWebSocketLogs()

  const handleMasterToggle = (enabled: boolean) => {
    updateLogType('enabled', enabled)
  }

  const handleLogTypeToggle = (logType: string, enabled: boolean) => {
    updateLogType(logType, enabled)
  }

  const handleResetSettings = () => {
    toast.loading('Reseteando configuración...')
    resetSettings()
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center space-x-2">
          <Terminal className="h-6 w-6" />
          <h1 className="text-2xl font-bold">WebSocket Manager</h1>
        </div>
        <div className="grid gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center space-x-2">
          <Terminal className="h-6 w-6" />
          <h1 className="text-2xl font-bold">WebSocket Manager</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-red-600">
              <XCircle className="h-5 w-5" />
              <span>Error al cargar la configuración de logs</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!logSettings) {
    return null
  }

  const enabledCount = getEnabledLogsCount()
  const totalCount = getTotalLogsCount()

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Terminal className="h-6 w-6" />
          <h1 className="text-2xl font-bold">WebSocket Manager</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={isLoggingEnabled() ? 'default' : 'secondary'}>
            {isLoggingEnabled() ? 'Activo' : 'Inactivo'}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {enabledCount}/{totalCount} logs activos
          </span>
        </div>
      </div>

      {/* Configuración General */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Configuración General</span>
          </CardTitle>
          <CardDescription>
            Configuración principal del sistema de logs de WebSocket
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="font-medium">Logs de WebSocket</span>
                {isLoggingEnabled() ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Activa o desactiva todos los logs de WebSocket
              </p>
            </div>
            <Switch
              checked={isLoggingEnabled()}
              onCheckedChange={handleMasterToggle}
              disabled={isUpdatingLogType}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="font-medium">Última actualización</span>
              <p className="text-sm text-muted-foreground">
                {new Date(logSettings.lastUpdated).toLocaleString()}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetSettings}
              disabled={isResetting}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Resetear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configuración por Tipo de Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Tipos de Log</span>
          </CardTitle>
          <CardDescription>
            Configura individualmente cada tipo de log de WebSocket
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(logTypeConfig).map(([key, config]) => {
            const Icon = config.icon
            const isEnabled = logSettings.config[key as keyof typeof logSettings.config]
            
            return (
              <div key={key} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${config.color}`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{config.label}</span>
                      <Badge variant={isEnabled ? 'default' : 'secondary'} className="text-xs">
                        {isEnabled ? 'ON' : 'OFF'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {config.description}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={(enabled) => handleLogTypeToggle(key, enabled)}
                  disabled={isUpdatingLogType || !isLoggingEnabled()}
                />
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Información de Uso */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Info className="h-5 w-5" />
            <span>Información de Uso</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-medium text-blue-900">Tipos de Log</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <p><strong>Live Sample:</strong> Logs de datos en tiempo real recibidos cada segundo</p>
                  <p><strong>WebSocket Raw:</strong> Mensajes raw de WebSocket antes de procesamiento</p>
                  <p><strong>Device Status Update:</strong> Actualizaciones de estado de dispositivos Shelly</p>
                  <p><strong>Device Update:</strong> Callbacks ejecutados cuando se actualiza un dispositivo</p>
                  <p><strong>Socket.JS:</strong> Logs del procesamiento interno de Socket.js</p>
                  <p><strong>API Calls:</strong> Llamadas a APIs relacionadas con WebSocket</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-yellow-50 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-medium text-yellow-900">Recomendaciones</h4>
                <div className="text-sm text-yellow-700 space-y-1">
                  <p>• Activa solo los logs necesarios para evitar spam en consola</p>
                  <p>• Los logs Live Sample generan mucha información - usar solo para debugging</p>
                  <p>• Los logs se aplican inmediatamente sin necesidad de reiniciar</p>
                  <p>• La configuración se guarda automáticamente en localStorage</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}