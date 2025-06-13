"use client"

import { useState } from "react"
import {
  Settings, Users, Tag, Zap, Bell, Shield, Database, 
  Globe, Palette, Mail, MessageSquare, Calendar, 
  FileText, Download, Upload, Save, RefreshCw,
  ChevronRight, Info, AlertCircle, CheckCircle
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export default function ConfiguracionPage() {
  const [activeTab, setActiveTab] = useState("general")
  const [unsavedChanges, setUnsavedChanges] = useState(false)

  // Estados de ejemplo para configuraciones
  const [settings, setSettings] = useState({
    // General
    leadAutoAssignment: true,
    duplicateDetection: true,
    defaultCurrency: "EUR",
    timezone: "Europe/Madrid",
    
    // Pipeline
    pipelines: [
      { id: 1, name: "Pipeline Principal", stages: 5, active: true },
      { id: 2, name: "Pipeline Secundario", stages: 3, active: false }
    ],
    
    // Notificaciones
    emailNotifications: true,
    smsNotifications: false,
    inAppNotifications: true,
    
    // Integraciones
    googleCalendar: true,
    mailchimp: false,
    whatsapp: true,
  })

  const pipelineStages = [
    { id: 1, name: "Nuevo Lead", color: "bg-blue-500", order: 1 },
    { id: 2, name: "Contactado", color: "bg-yellow-500", order: 2 },
    { id: 3, name: "Cualificado", color: "bg-purple-500", order: 3 },
    { id: 4, name: "Propuesta", color: "bg-orange-500", order: 4 },
    { id: 5, name: "Negociación", color: "bg-pink-500", order: 5 },
    { id: 6, name: "Ganado", color: "bg-green-500", order: 6 },
    { id: 7, name: "Perdido", color: "bg-red-500", order: 7 },
  ]

  const integrations = [
    { 
      name: "Google Calendar", 
      icon: Calendar, 
      status: "connected", 
      description: "Sincroniza citas y eventos"
    },
    { 
      name: "WhatsApp Business", 
      icon: MessageSquare, 
      status: "connected", 
      description: "Envía mensajes automatizados"
    },
    { 
      name: "Mailchimp", 
      icon: Mail, 
      status: "disconnected", 
      description: "Gestiona campañas de email"
    },
    { 
      name: "Facebook Ads", 
      icon: Globe, 
      status: "disconnected", 
      description: "Importa leads de Facebook"
    },
  ]

  return (
    <div className="flex flex-col h-full pb-20 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Configuración del CRM</h1>
          <p className="text-gray-600 mt-1">Personaliza el comportamiento y las funciones de tu CRM</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Restablecer
          </Button>
          <Button 
            className="bg-purple-600 hover:bg-purple-700"
            onClick={() => setUnsavedChanges(false)}
          >
            <Save className="mr-2 h-4 w-4" />
            Guardar cambios
          </Button>
        </div>
      </div>

      {/* Alert de cambios sin guardar */}
      {unsavedChanges && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Tienes cambios sin guardar. Asegúrate de guardar antes de salir de esta página.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs de configuración */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="campos">Campos</TabsTrigger>
          <TabsTrigger value="automatizacion">Automatización</TabsTrigger>
          <TabsTrigger value="integraciones">Integraciones</TabsTrigger>
          <TabsTrigger value="permisos">Permisos</TabsTrigger>
        </TabsList>

        {/* Tab General */}
        <TabsContent value="general" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración General</CardTitle>
              <CardDescription>Ajustes básicos del sistema CRM</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Moneda por defecto</Label>
                  <Select 
                    value={settings.defaultCurrency}
                    onValueChange={(value) => {
                      setSettings({...settings, defaultCurrency: value})
                      setUnsavedChanges(true)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="USD">USD - Dólar</SelectItem>
                      <SelectItem value="GBP">GBP - Libra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Zona horaria</Label>
                  <Select 
                    value={settings.timezone}
                    onValueChange={(value) => {
                      setSettings({...settings, timezone: value})
                      setUnsavedChanges(true)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Europe/Madrid">Madrid (GMT+1)</SelectItem>
                      <SelectItem value="America/Mexico_City">Ciudad de México (GMT-6)</SelectItem>
                      <SelectItem value="America/New_York">Nueva York (GMT-5)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Comportamiento del Sistema</h3>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Asignación automática de leads</Label>
                    <p className="text-sm text-gray-500">Distribuir leads entre el equipo automáticamente</p>
                  </div>
                  <Switch 
                    checked={settings.leadAutoAssignment}
                    onCheckedChange={(checked) => {
                      setSettings({...settings, leadAutoAssignment: checked})
                      setUnsavedChanges(true)
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Detección de duplicados</Label>
                    <p className="text-sm text-gray-500">Alertar cuando se detecten contactos duplicados</p>
                  </div>
                  <Switch 
                    checked={settings.duplicateDetection}
                    onCheckedChange={(checked) => {
                      setSettings({...settings, duplicateDetection: checked})
                      setUnsavedChanges(true)
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notificaciones</CardTitle>
              <CardDescription>Configura cómo recibir alertas del sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificaciones por email</Label>
                  <p className="text-sm text-gray-500">Recibir alertas importantes por correo</p>
                </div>
                <Switch 
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => {
                    setSettings({...settings, emailNotifications: checked})
                    setUnsavedChanges(true)
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificaciones SMS</Label>
                  <p className="text-sm text-gray-500">Alertas urgentes por mensaje de texto</p>
                </div>
                <Switch 
                  checked={settings.smsNotifications}
                  onCheckedChange={(checked) => {
                    setSettings({...settings, smsNotifications: checked})
                    setUnsavedChanges(true)
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificaciones en la app</Label>
                  <p className="text-sm text-gray-500">Mostrar alertas dentro de la aplicación</p>
                </div>
                <Switch 
                  checked={settings.inAppNotifications}
                  onCheckedChange={(checked) => {
                    setSettings({...settings, inAppNotifications: checked})
                    setUnsavedChanges(true)
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Pipeline */}
        <TabsContent value="pipeline" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Pipelines</CardTitle>
              <CardDescription>Configura los embudos de ventas y sus etapas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Lista de pipelines */}
              <div className="space-y-4">
                {settings.pipelines.map((pipeline) => (
                  <div key={pipeline.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div>
                        <h4 className="font-medium">{pipeline.name}</h4>
                        <p className="text-sm text-gray-500">{pipeline.stages} etapas</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={pipeline.active ? "default" : "secondary"}>
                        {pipeline.active ? "Activo" : "Inactivo"}
                      </Badge>
                      <Button variant="outline" size="sm">Editar</Button>
                    </div>
                  </div>
                ))}
              </div>

              <Button variant="outline" className="w-full">
                + Añadir nuevo pipeline
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Etapas del Pipeline</CardTitle>
              <CardDescription>Define las etapas por las que pasan las oportunidades</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pipelineStages.map((stage) => (
                  <div key={stage.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${stage.color}`} />
                      <span className="font-medium">{stage.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">↑</Button>
                      <Button variant="ghost" size="sm">↓</Button>
                      <Button variant="ghost" size="sm">Editar</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Campos */}
        <TabsContent value="campos" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Campos Personalizados</CardTitle>
              <CardDescription>Añade campos adicionales a leads, contactos y oportunidades</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Gestión de campos personalizados</h3>
                <p className="text-gray-600 mb-4">Define campos adicionales para capturar información específica de tu negocio</p>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  Configurar campos
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Automatización */}
        <TabsContent value="automatizacion" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Reglas de Automatización</CardTitle>
              <CardDescription>Crea flujos de trabajo automáticos para ahorrar tiempo</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="lead-scoring">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Lead Scoring Automático
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-4">
                      <p className="text-sm text-gray-600">
                        Asigna puntuaciones automáticamente a los leads basándose en sus acciones y características.
                      </p>
                      <Button variant="outline" size="sm">Configurar reglas</Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="email-sequences">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Secuencias de Email
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-4">
                      <p className="text-sm text-gray-600">
                        Envía emails automatizados basados en triggers y comportamientos.
                      </p>
                      <Button variant="outline" size="sm">Crear secuencia</Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="task-automation">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Tareas Automáticas
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-4">
                      <p className="text-sm text-gray-600">
                        Crea tareas automáticamente cuando se cumplan ciertas condiciones.
                      </p>
                      <Button variant="outline" size="sm">Definir triggers</Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Integraciones */}
        <TabsContent value="integraciones" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Integraciones Disponibles</CardTitle>
              <CardDescription>Conecta tu CRM con otras herramientas y servicios</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {integrations.map((integration, index) => {
                  const Icon = integration.icon
                  return (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-medium">{integration.name}</h4>
                            <p className="text-sm text-gray-500 mt-1">{integration.description}</p>
                          </div>
                        </div>
                        <Badge 
                          variant={integration.status === "connected" ? "default" : "secondary"}
                          className={integration.status === "connected" ? "bg-green-100 text-green-800" : ""}
                        >
                          {integration.status === "connected" ? "Conectado" : "Desconectado"}
                        </Badge>
                      </div>
                      <div className="mt-4">
                        <Button 
                          variant={integration.status === "connected" ? "outline" : "default"}
                          size="sm" 
                          className="w-full"
                        >
                          {integration.status === "connected" ? "Configurar" : "Conectar"}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Permisos */}
        <TabsContent value="permisos" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Permisos</CardTitle>
              <CardDescription>Control de acceso por roles y usuarios</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Configuración de permisos</h3>
                <p className="text-gray-600 mb-4">Define qué pueden ver y hacer los diferentes roles en el CRM</p>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  Gestionar permisos
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer con información */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">¿Necesitas ayuda?</h4>
              <p className="text-sm text-blue-700 mt-1">
                Consulta nuestra documentación o contacta con soporte para obtener ayuda con la configuración del CRM.
              </p>
              <div className="flex gap-2 mt-3">
                <Button variant="outline" size="sm" className="text-blue-700 border-blue-300">
                  Ver documentación
                </Button>
                <Button variant="outline" size="sm" className="text-blue-700 border-blue-300">
                  Contactar soporte
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
