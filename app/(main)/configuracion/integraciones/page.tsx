/**
 * 🔧 INTEGRACIONES - PÁGINA PRINCIPAL
 * Página principal para gestionar las integraciones del sistema
 * @see docs/WEBSOCKET_LOG_MANAGEMENT.md
 */

'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Terminal, 
  Settings, 
  Activity, 
  ArrowRight,
  Zap,
  Radio
} from 'lucide-react'
import Link from 'next/link'

const integrations = [
  {
    id: 'websocket-manager',
    title: 'WebSocket Manager',
    description: 'Gestiona la configuración de logs de WebSocket y dispositivos en tiempo real',
    icon: Terminal,
    href: '/configuracion/integraciones/websocket-manager',
    status: 'active',
    features: [
      'Configuración de logs en tiempo real',
      'Control de logs por tipo',
      'Gestión de dispositivos Shelly',
      'Monitoreo de API calls'
    ]
  },
  {
    id: 'shelly-devices',
    title: 'Dispositivos Shelly',
    description: 'Configuración y gestión de dispositivos Shelly inteligentes',
    icon: Zap,
    href: '/configuracion/integraciones/shelly-devices',
    status: 'coming-soon',
    features: [
      'Gestión de credenciales',
      'Configuración de dispositivos',
      'Monitoreo de estado',
      'Alertas y notificaciones'
    ]
  },
  {
    id: 'api-monitoring',
    title: 'Monitoreo de APIs',
    description: 'Monitorea y gestiona todas las APIs del sistema',
    icon: Activity,
    href: '/configuracion/integraciones/api-monitoring',
    status: 'coming-soon',
    features: [
      'Logs de API calls',
      'Métricas de rendimiento',
      'Alertas de errores',
      'Análisis de uso'
    ]
  },
  {
    id: 'realtime-communications',
    title: 'Comunicaciones en Tiempo Real',
    description: 'Configuración de WebSocket y comunicaciones en tiempo real',
    icon: Radio,
    href: '/configuracion/integraciones/realtime-communications',
    status: 'coming-soon',
    features: [
      'Configuración de WebSocket',
      'Gestión de conexiones',
      'Monitoreo de mensajes',
      'Debugging en tiempo real'
    ]
  }
]

export default function IntegracionesPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Integraciones</h1>
      </div>
      
      <p className="text-muted-foreground">
        Gestiona las integraciones y servicios externos del sistema
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        {integrations.map((integration) => {
          const Icon = integration.icon
          const isActive = integration.status === 'active'
          
          return (
            <Card key={integration.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${isActive ? 'bg-primary' : 'bg-muted'}`}>
                      <Icon className={`h-5 w-5 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{integration.title}</CardTitle>
                      <Badge variant={isActive ? 'default' : 'secondary'} className="mt-1">
                        {isActive ? 'Activo' : 'Próximamente'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <CardDescription className="mt-2">
                  {integration.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Características:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {integration.features.map((feature, index) => (
                      <li key={index} className="flex items-center space-x-2">
                        <div className="w-1 h-1 bg-current rounded-full" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="pt-4">
                  {isActive ? (
                    <Button asChild className="w-full">
                      <Link href={integration.href}>
                        Configurar
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="outline" disabled className="w-full">
                      Próximamente
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Estado del Sistema</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="font-medium text-green-900">WebSocket</span>
              </div>
              <p className="text-sm text-green-700 mt-1">Activo y funcionando</p>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span className="font-medium text-blue-900">APIs</span>
              </div>
              <p className="text-sm text-blue-700 mt-1">Todos los servicios operativos</p>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full" />
                <span className="font-medium text-purple-900">Dispositivos</span>
              </div>
              <p className="text-sm text-purple-700 mt-1">Conectados y monitoreados</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}