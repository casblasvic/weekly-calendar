"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { 
  Instagram, 
  Facebook, 
  Twitter, 
  MessageCircle, 
  Mail,
  Share2,
  Key,
  Link,
  Server,
  User,
  Lock,
  Bell,
  Globe,
  Shield,
  Database,
  Zap
} from "lucide-react"
import { emailSyncService } from "@/app/services/email-sync.service"
import { toast } from "react-hot-toast"

// Datos de ejemplo para las configuraciones
const mockConfigs = {
  instagram: {
    name: "Instagram",
    icon: Instagram,
    color: "from-purple-500 to-pink-500",
    connected: true,
    lastSync: "Hace 5 minutos",
    config: {
      apiKey: "********************",
      apiSecret: "********************",
      accessToken: "********************",
      webhookUrl: "https://api.tudominio.com/webhooks/instagram",
      autoSync: true,
      syncInterval: "5 minutos",
      notifications: true
    }
  },
  facebook: {
    name: "Facebook",
    icon: Facebook,
    color: "from-blue-500 to-blue-600",
    connected: true,
    lastSync: "Hace 10 minutos",
    config: {
      appId: "********************",
      appSecret: "********************",
      accessToken: "********************",
      webhookUrl: "https://api.tudominio.com/webhooks/facebook",
      autoSync: true,
      syncInterval: "5 minutos",
      notifications: true
    }
  },
  twitter: {
    name: "Twitter",
    icon: Twitter,
    color: "from-blue-400 to-blue-500",
    connected: false,
    lastSync: "Nunca",
    config: {
      apiKey: "",
      apiSecret: "",
      accessToken: "",
      accessTokenSecret: "",
      webhookUrl: "https://api.tudominio.com/webhooks/twitter",
      autoSync: false,
      syncInterval: "5 minutos",
      notifications: true
    }
  },
  whatsapp: {
    name: "WhatsApp Business",
    icon: MessageCircle,
    color: "from-green-500 to-green-600",
    connected: true,
    lastSync: "Hace 2 minutos",
    config: {
      phoneNumberId: "********************",
      accessToken: "********************",
      webhookUrl: "https://api.tudominio.com/webhooks/whatsapp",
      autoSync: true,
      syncInterval: "1 minuto",
      notifications: true,
      businessProfile: {
        name: "Clínica Estética",
        description: "Centro de estética y bienestar",
        address: "Calle Principal 123",
        email: "contacto@clinicaestetica.com"
      }
    }
  },
  email: {
    name: "Email",
    icon: Mail,
    color: "from-red-500 to-red-600",
    connected: true,
    lastSync: "Hace 1 minuto",
    config: {
      smtp: {
        host: "smtp.gmail.com",
        port: 587,
        username: "tu@email.com",
        password: "********************",
        secure: true
      },
      imap: {
        host: "imap.gmail.com",
        port: 993,
        username: "tu@email.com",
        password: "********************",
        secure: true
      },
      autoSync: true,
      syncInterval: "1 minuto",
      notifications: true,
      folders: ["INBOX", "SENT", "DRAFTS", "TRASH"]
    }
  }
}

export default function SocialConfigPage() {
  const [activeTab, setActiveTab] = useState("instagram")
  const [configs, setConfigs] = useState(mockConfigs)

  const handleConnect = (channel: string) => {
    // Aquí iría la lógica de conexión con cada plataforma
    console.log(`Conectando con ${channel}...`)
  }

  const handleSaveConfig = async (key: string) => {
    if (key === "email") {
      try {
        await emailSyncService.configure(configs.email.config)
        toast.success("Configuración de email guardada y sincronización iniciada")
      } catch (error) {
        toast.error("Error al configurar el email")
        console.error(error)
      }
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Share2 className="w-8 h-8 text-purple-600" />
          <h1 className="text-2xl font-semibold">Configuración de Redes Sociales</h1>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700">
          <Zap className="w-4 h-4 mr-2" />
          Probar Conexiones
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full">
          {Object.entries(configs).map(([key, config]) => (
            <TabsTrigger
              key={key}
              value={key}
              className="flex items-center gap-2"
            >
              <div className={`p-1 rounded-lg bg-gradient-to-r ${config.color}`}>
                <config.icon className="w-4 h-4 text-white" />
              </div>
              <span>{config.name}</span>
              {config.connected && (
                <Badge variant="success" className="ml-2">
                  Conectado
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(configs).map(([key, config]) => (
          <TabsContent key={key} value={key}>
            <Card className="p-6">
              <div className="space-y-6">
                {/* Estado de conexión */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Estado de Conexión</h3>
                    <p className="text-sm text-gray-500">
                      Última sincronización: {config.lastSync}
                    </p>
                  </div>
                  <Button
                    variant={config.connected ? "outline" : "default"}
                    onClick={() => handleConnect(key)}
                  >
                    {config.connected ? "Desconectar" : "Conectar"}
                  </Button>
                </div>

                {/* Configuración específica por plataforma */}
                <div className="space-y-4">
                  <h4 className="font-medium">Credenciales de API</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(config.config).map(([configKey, value]) => {
                      if (typeof value === "string" && configKey.includes("key") || configKey.includes("token") || configKey.includes("secret") || configKey.includes("password")) {
                        return (
                          <div key={configKey} className="space-y-2">
                            <Label htmlFor={configKey}>
                              {configKey.replace(/([A-Z])/g, ' $1').toLowerCase()}
                            </Label>
                            <div className="flex gap-2">
                              <Input
                                id={configKey}
                                type="password"
                                value={value}
                                onChange={(e) => {
                                  setConfigs(prev => ({
                                    ...prev,
                                    [key]: {
                                      ...prev[key],
                                      config: {
                                        ...prev[key].config,
                                        [configKey]: e.target.value
                                      }
                                    }
                                  }))
                                }}
                              />
                              <Button variant="outline" size="icon">
                                <Key className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )
                      }
                      return null
                    })}
                  </div>

                  {/* Configuraciones adicionales específicas por plataforma */}
                  {key === "whatsapp" && (
                    <div className="space-y-4">
                      <h4 className="font-medium">Perfil de Negocio</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(config.config.businessProfile).map(([key, value]) => (
                          <div key={key} className="space-y-2">
                            <Label htmlFor={key}>
                              {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                            </Label>
                            <Input
                              id={key}
                              value={value as string}
                              onChange={(e) => {
                                setConfigs(prev => ({
                                  ...prev,
                                  whatsapp: {
                                    ...prev.whatsapp,
                                    config: {
                                      ...prev.whatsapp.config,
                                      businessProfile: {
                                        ...prev.whatsapp.config.businessProfile,
                                        [key]: e.target.value
                                      }
                                    }
                                  }
                                }))
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {key === "email" && (
                    <div className="space-y-4">
                      <h4 className="font-medium">Configuración SMTP</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(config.config.smtp).map(([key, value]) => (
                          <div key={key} className="space-y-2">
                            <Label htmlFor={`smtp-${key}`}>
                              {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                            </Label>
                            <Input
                              id={`smtp-${key}`}
                              type={key === "password" ? "password" : "text"}
                              value={value as string}
                              onChange={(e) => {
                                setConfigs(prev => ({
                                  ...prev,
                                  email: {
                                    ...prev.email,
                                    config: {
                                      ...prev.email.config,
                                      smtp: {
                                        ...prev.email.config.smtp,
                                        [key]: e.target.value
                                      }
                                    }
                                  }
                                }))
                              }}
                            />
                          </div>
                        ))}
                      </div>

                      <h4 className="font-medium">Configuración IMAP</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(config.config.imap).map(([key, value]) => (
                          <div key={key} className="space-y-2">
                            <Label htmlFor={`imap-${key}`}>
                              {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                            </Label>
                            <Input
                              id={`imap-${key}`}
                              type={key === "password" ? "password" : "text"}
                              value={value as string}
                              onChange={(e) => {
                                setConfigs(prev => ({
                                  ...prev,
                                  email: {
                                    ...prev.email,
                                    config: {
                                      ...prev.email.config,
                                      imap: {
                                        ...prev.email.config.imap,
                                        [key]: e.target.value
                                      }
                                    }
                                  }
                                }))
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Configuraciones generales */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Configuraciones Generales</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`${key}-webhook`}>Webhook URL</Label>
                        <Input
                          id={`${key}-webhook`}
                          value={config.config.webhookUrl}
                          onChange={(e) => {
                            setConfigs(prev => ({
                              ...prev,
                              [key]: {
                                ...prev[key],
                                config: {
                                  ...prev[key].config,
                                  webhookUrl: e.target.value
                                }
                              }
                            }))
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`${key}-sync`}>Intervalo de Sincronización</Label>
                        <Input
                          id={`${key}-sync`}
                          value={config.config.syncInterval}
                          onChange={(e) => {
                            setConfigs(prev => ({
                              ...prev,
                              [key]: {
                                ...prev[key],
                                config: {
                                  ...prev[key].config,
                                  syncInterval: e.target.value
                                }
                              }
                            }))
                          }}
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`${key}-autoSync`}
                          checked={config.config.autoSync}
                          onCheckedChange={(checked) => {
                            setConfigs(prev => ({
                              ...prev,
                              [key]: {
                                ...prev[key],
                                config: {
                                  ...prev[key].config,
                                  autoSync: checked
                                }
                              }
                            }))
                          }}
                        />
                        <Label htmlFor={`${key}-autoSync`}>
                          Sincronización Automática
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`${key}-notifications`}
                          checked={config.config.notifications}
                          onCheckedChange={(checked) => {
                            setConfigs(prev => ({
                              ...prev,
                              [key]: {
                                ...prev[key],
                                config: {
                                  ...prev[key].config,
                                  notifications: checked
                                }
                              }
                            }))
                          }}
                        />
                        <Label htmlFor={`${key}-notifications`}>
                          Notificaciones
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex justify-end gap-2">
                  <Button variant="outline">Cancelar</Button>
                  <Button
                    className="bg-purple-600 hover:bg-purple-700"
                    onClick={() => handleSaveConfig(key)}
                  >
                    Guardar Configuración
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
      <div className="flex justify-end mt-4">
        <Button onClick={() => handleSaveConfig(activeTab)}>
          Guardar configuración
        </Button>
      </div>
    </div>
  )
} 