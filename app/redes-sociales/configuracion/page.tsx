"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { 
  Instagram, 
  Facebook, 
  Twitter,
  Mail,
  MessageCircle,
} from "lucide-react"
import { emailSyncService } from "@/app/services/email-sync.service"
import { socialMediaService } from "@/app/services/social-media.service"
import { SocialChannel, InstagramConfig, FacebookConfig, TwitterConfig, EmailConfig, WhatsAppConfig } from "@/app/services/data/models/interfaces"
import { toast } from "sonner"

const configs = {
  instagram: {
    name: "Instagram",
    icon: Instagram,
    color: "from-purple-500 to-pink-500"
  },
  facebook: {
    name: "Facebook",
    icon: Facebook,
    color: "from-blue-500 to-blue-700"
  },
  twitter: {
    name: "Twitter",
    icon: Twitter,
    color: "from-blue-400 to-blue-600"
  },
  whatsapp: {
    name: "WhatsApp Business",
    icon: MessageCircle,
    color: "from-green-500 to-green-700"
  },
  email: {
    name: "Email",
    icon: Mail,
    color: "from-red-500 to-red-700"
  }
}

export default function SocialConfigPage() {
  const [activeTab, setActiveTab] = useState("instagram")
  const [channels, setChannels] = useState<SocialChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadChannels()
  }, [])

  useEffect(() => {
    const handleDataChange = (e: CustomEvent) => {
      const { entityType, entityId } = e.detail
      if (entityType === "socialChannel") {
        loadChannels()
      }
    }

    window.addEventListener("data-change" as any, handleDataChange)
    return () => {
      window.removeEventListener("data-change" as any, handleDataChange)
    }
  }, [])

  const loadChannels = async () => {
    try {
      setLoading(true)
      const data = await socialMediaService.getAllChannels()
      setChannels(data)
      setError(null)
    } catch (error) {
      console.error("Error al cargar canales:", error)
      setError("Error al cargar los canales")
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async (id: string) => {
    try {
      const updatedChannel = await socialMediaService.toggleConnection(id)
      if (updatedChannel) {
        toast.success(
          updatedChannel.connected 
            ? "Canal conectado correctamente" 
            : "Canal desconectado correctamente"
        )
      }
    } catch (error) {
      console.error("Error al actualizar conexión:", error)
      toast.error("Error al actualizar la conexión")
    }
  }

  const handleConfigChange = (id: string, config: InstagramConfig | FacebookConfig | TwitterConfig | WhatsAppConfig | EmailConfig) => {
    setChannels(prev => prev.map(channel => 
      channel.id === id ? { ...channel, config } : channel
    ))
  }

  const handleSaveConfig = async (id: string) => {
    const channel = channels.find(c => c.id === id)
    if (!channel) return

    try {
      if (id === "email") {
        const emailConfig = channel.config as EmailConfig
        await emailSyncService.configure({
          provider: "gmail",
          email: emailConfig.smtp.username,
          password: emailConfig.smtp.password,
          imapServer: emailConfig.imap.host,
          imapPort: emailConfig.imap.port,
          smtpServer: emailConfig.smtp.host,
          smtpPort: emailConfig.smtp.port,
          useSSL: emailConfig.smtp.secure,
          syncInterval: parseInt(channel.config.syncInterval)
        })
      }

      const updatedChannel = await socialMediaService.updateConfig(id, channel.config)
      if (updatedChannel) {
        setChannels(prev => prev.map(c => 
          c.id === id ? updatedChannel : c
        ))
        toast.success("Configuración guardada correctamente")
      }
    } catch (error) {
      console.error("Error al guardar configuración:", error)
      toast.error("Error al guardar la configuración")
      loadChannels()
    }
  }

  const renderConfigForm = (channel: SocialChannel) => {
    switch (channel.id) {
      case "instagram":
        const instagramConfig = channel.config as InstagramConfig
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input 
                  type="password" 
                  value={instagramConfig.apiKey}
                  onChange={(e) => handleConfigChange(channel.id, {
                    ...instagramConfig,
                    apiKey: e.target.value
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>API Secret</Label>
                <Input 
                  type="password" 
                  value={instagramConfig.apiSecret}
                  onChange={(e) => handleConfigChange(channel.id, {
                    ...instagramConfig,
                    apiSecret: e.target.value
                  })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Access Token</Label>
              <Input 
                type="password" 
                value={instagramConfig.accessToken}
                onChange={(e) => handleConfigChange(channel.id, {
                  ...instagramConfig,
                  accessToken: e.target.value
                })}
              />
            </div>
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <Input 
                value={instagramConfig.webhookUrl}
                onChange={(e) => handleConfigChange(channel.id, {
                  ...instagramConfig,
                  webhookUrl: e.target.value
                })}
              />
            </div>
            <div className="space-y-2">
              <Label>Perfil de Negocio</Label>
              <Input 
                value={instagramConfig.businessProfile}
                onChange={(e) => handleConfigChange(channel.id, {
                  ...instagramConfig,
                  businessProfile: e.target.value
                })}
              />
            </div>
          </div>
        )

      case "facebook":
        const facebookConfig = channel.config as FacebookConfig
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>App ID</Label>
                <Input 
                  type="password" 
                  value={facebookConfig.appId}
                  onChange={(e) => handleConfigChange(channel.id, {
                    ...facebookConfig,
                    appId: e.target.value
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>App Secret</Label>
                <Input 
                  type="password" 
                  value={facebookConfig.appSecret}
                  onChange={(e) => handleConfigChange(channel.id, {
                    ...facebookConfig,
                    appSecret: e.target.value
                  })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Access Token</Label>
              <Input 
                type="password" 
                value={facebookConfig.accessToken}
                onChange={(e) => handleConfigChange(channel.id, {
                  ...facebookConfig,
                  accessToken: e.target.value
                })}
              />
            </div>
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <Input 
                value={facebookConfig.webhookUrl}
                onChange={(e) => handleConfigChange(channel.id, {
                  ...facebookConfig,
                  webhookUrl: e.target.value
                })}
              />
            </div>
            <div className="space-y-2">
              <Label>Perfil de Negocio</Label>
              <Input 
                value={facebookConfig.businessProfile}
                onChange={(e) => handleConfigChange(channel.id, {
                  ...facebookConfig,
                  businessProfile: e.target.value
                })}
              />
            </div>
          </div>
        )

      case "twitter":
        const twitterConfig = channel.config as TwitterConfig
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Credenciales de API</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input 
                    type="password" 
                    value={twitterConfig.apiKey}
                    onChange={(e) => handleConfigChange(channel.id, {
                      ...twitterConfig,
                      apiKey: e.target.value
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>API Secret</Label>
                  <Input 
                    type="password" 
                    value={twitterConfig.apiSecret}
                    onChange={(e) => handleConfigChange(channel.id, {
                      ...twitterConfig,
                      apiSecret: e.target.value
                    })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Access Token</Label>
                  <Input 
                    type="password" 
                    value={twitterConfig.accessToken}
                    onChange={(e) => handleConfigChange(channel.id, {
                      ...twitterConfig,
                      accessToken: e.target.value
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Access Token Secret</Label>
                  <Input 
                    type="password" 
                    value={twitterConfig.accessTokenSecret}
                    onChange={(e) => handleConfigChange(channel.id, {
                      ...twitterConfig,
                      accessTokenSecret: e.target.value
                    })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <Input 
                  value={twitterConfig.webhookUrl}
                  onChange={(e) => handleConfigChange(channel.id, {
                    ...twitterConfig,
                    webhookUrl: e.target.value
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Perfil de Negocio</Label>
                <Input 
                  value={twitterConfig.businessProfile}
                  onChange={(e) => handleConfigChange(channel.id, {
                    ...twitterConfig,
                    businessProfile: e.target.value
                  })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Mensajes Directos</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="dm-enabled"
                    checked={twitterConfig.features.directMessages.enabled}
                    onChange={(e) => handleConfigChange(channel.id, {
                      ...twitterConfig,
                      features: {
                        ...twitterConfig.features,
                        directMessages: {
                          ...twitterConfig.features.directMessages,
                          enabled: e.target.checked
                        }
                      }
                    })}
                  />
                  <Label htmlFor="dm-enabled">Habilitar mensajes directos</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="dm-auto-reply"
                    checked={twitterConfig.features.directMessages.autoReply}
                    onChange={(e) => handleConfigChange(channel.id, {
                      ...twitterConfig,
                      features: {
                        ...twitterConfig.features,
                        directMessages: {
                          ...twitterConfig.features.directMessages,
                          autoReply: e.target.checked
                        }
                      }
                    })}
                  />
                  <Label htmlFor="dm-auto-reply">Respuesta automática</Label>
                </div>
                <div className="space-y-2">
                  <Label>Plantilla de respuesta</Label>
                  <Input 
                    value={twitterConfig.features.directMessages.replyTemplate}
                    onChange={(e) => handleConfigChange(channel.id, {
                      ...twitterConfig,
                      features: {
                        ...twitterConfig.features,
                        directMessages: {
                          ...twitterConfig.features.directMessages,
                          replyTemplate: e.target.value
                        }
                      }
                    })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Publicaciones</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="posts-enabled"
                    checked={twitterConfig.features.posts.enabled}
                    onChange={(e) => handleConfigChange(channel.id, {
                      ...twitterConfig,
                      features: {
                        ...twitterConfig.features,
                        posts: {
                          ...twitterConfig.features.posts,
                          enabled: e.target.checked
                        }
                      }
                    })}
                  />
                  <Label htmlFor="posts-enabled">Habilitar publicaciones</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="posts-auto"
                    checked={twitterConfig.features.posts.autoPost}
                    onChange={(e) => handleConfigChange(channel.id, {
                      ...twitterConfig,
                      features: {
                        ...twitterConfig.features,
                        posts: {
                          ...twitterConfig.features.posts,
                          autoPost: e.target.checked
                        }
                      }
                    })}
                  />
                  <Label htmlFor="posts-auto">Publicación automática</Label>
                </div>
                <div className="space-y-2">
                  <Label>Plantilla de publicación</Label>
                  <Input 
                    value={twitterConfig.features.posts.postTemplate}
                    onChange={(e) => handleConfigChange(channel.id, {
                      ...twitterConfig,
                      features: {
                        ...twitterConfig.features,
                        posts: {
                          ...twitterConfig.features.posts,
                          postTemplate: e.target.value
                        }
                      }
                    })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="posts-schedule"
                    checked={twitterConfig.features.posts.schedulePosts}
                    onChange={(e) => handleConfigChange(channel.id, {
                      ...twitterConfig,
                      features: {
                        ...twitterConfig.features,
                        posts: {
                          ...twitterConfig.features.posts,
                          schedulePosts: e.target.checked
                        }
                      }
                    })}
                  />
                  <Label htmlFor="posts-schedule">Programar publicaciones</Label>
                </div>
                {twitterConfig.features.posts.schedulePosts && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Frecuencia</Label>
                      <select
                        value={twitterConfig.features.posts.postingSchedule?.frequency}
                        onChange={(e) => handleConfigChange(channel.id, {
                          ...twitterConfig,
                          features: {
                            ...twitterConfig.features,
                            posts: {
                              ...twitterConfig.features.posts,
                              postingSchedule: {
                                ...twitterConfig.features.posts.postingSchedule!,
                                frequency: e.target.value
                              }
                            }
                          }
                        })}
                        className="w-full p-2 border rounded"
                      >
                        <option value="diario">Diario</option>
                        <option value="semanal">Semanal</option>
                        <option value="mensual">Mensual</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Horarios (separados por coma)</Label>
                      <Input 
                        value={twitterConfig.features.posts.postingSchedule?.times.join(", ")}
                        onChange={(e) => handleConfigChange(channel.id, {
                          ...twitterConfig,
                          features: {
                            ...twitterConfig.features,
                            posts: {
                              ...twitterConfig.features.posts,
                              postingSchedule: {
                                ...twitterConfig.features.posts.postingSchedule!,
                                times: e.target.value.split(",").map(t => t.trim())
                              }
                            }
                          }
                        })}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      case "whatsapp":
        const whatsappConfig = channel.config as WhatsAppConfig
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Credenciales de WhatsApp Business</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Business ID</Label>
                  <Input 
                    type="password" 
                    value={whatsappConfig.businessId}
                    onChange={(e) => handleConfigChange(channel.id, {
                      ...whatsappConfig,
                      businessId: e.target.value
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Número de Teléfono</Label>
                  <Input 
                    value={whatsappConfig.phoneNumber}
                    onChange={(e) => handleConfigChange(channel.id, {
                      ...whatsappConfig,
                      phoneNumber: e.target.value
                    })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Access Token</Label>
                <Input 
                  type="password" 
                  value={whatsappConfig.accessToken}
                  onChange={(e) => handleConfigChange(channel.id, {
                    ...whatsappConfig,
                    accessToken: e.target.value
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <Input 
                  value={whatsappConfig.webhookUrl}
                  onChange={(e) => handleConfigChange(channel.id, {
                    ...whatsappConfig,
                    webhookUrl: e.target.value
                  })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Mensajes</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="whatsapp-messages-enabled"
                    checked={whatsappConfig.features.messages.enabled}
                    onChange={(e) => handleConfigChange(channel.id, {
                      ...whatsappConfig,
                      features: {
                        ...whatsappConfig.features,
                        messages: {
                          ...whatsappConfig.features.messages,
                          enabled: e.target.checked
                        }
                      }
                    })}
                  />
                  <Label htmlFor="whatsapp-messages-enabled">Habilitar mensajes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="whatsapp-auto-reply"
                    checked={whatsappConfig.features.messages.autoReply}
                    onChange={(e) => handleConfigChange(channel.id, {
                      ...whatsappConfig,
                      features: {
                        ...whatsappConfig.features,
                        messages: {
                          ...whatsappConfig.features.messages,
                          autoReply: e.target.checked
                        }
                      }
                    })}
                  />
                  <Label htmlFor="whatsapp-auto-reply">Respuesta automática</Label>
                </div>
                <div className="space-y-2">
                  <Label>Plantilla de respuesta</Label>
                  <Input 
                    value={whatsappConfig.features.messages.replyTemplate}
                    onChange={(e) => handleConfigChange(channel.id, {
                      ...whatsappConfig,
                      features: {
                        ...whatsappConfig.features,
                        messages: {
                          ...whatsappConfig.features.messages,
                          replyTemplate: e.target.value
                        }
                      }
                    })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Horario de Atención</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="whatsapp-business-hours"
                    checked={whatsappConfig.features.messages.businessHours.enabled}
                    onChange={(e) => handleConfigChange(channel.id, {
                      ...whatsappConfig,
                      features: {
                        ...whatsappConfig.features,
                        messages: {
                          ...whatsappConfig.features.messages,
                          businessHours: {
                            ...whatsappConfig.features.messages.businessHours,
                            enabled: e.target.checked
                          }
                        }
                      }
                    })}
                  />
                  <Label htmlFor="whatsapp-business-hours">Habilitar horario de atención</Label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hora de inicio</Label>
                    <Input 
                      type="time"
                      value={whatsappConfig.features.messages.businessHours.startTime}
                      onChange={(e) => handleConfigChange(channel.id, {
                        ...whatsappConfig,
                        features: {
                          ...whatsappConfig.features,
                          messages: {
                            ...whatsappConfig.features.messages,
                            businessHours: {
                              ...whatsappConfig.features.messages.businessHours,
                              startTime: e.target.value
                            }
                          }
                        }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora de fin</Label>
                    <Input 
                      type="time"
                      value={whatsappConfig.features.messages.businessHours.endTime}
                      onChange={(e) => handleConfigChange(channel.id, {
                        ...whatsappConfig,
                        features: {
                          ...whatsappConfig.features,
                          messages: {
                            ...whatsappConfig.features.messages,
                            businessHours: {
                              ...whatsappConfig.features.messages.businessHours,
                              endTime: e.target.value
                            }
                          }
                        }
                      })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Zona horaria</Label>
                  <Input 
                    value={whatsappConfig.features.messages.businessHours.timezone}
                    onChange={(e) => handleConfigChange(channel.id, {
                      ...whatsappConfig,
                      features: {
                        ...whatsappConfig.features,
                        messages: {
                          ...whatsappConfig.features.messages,
                          businessHours: {
                            ...whatsappConfig.features.messages.businessHours,
                            timezone: e.target.value
                          }
                        }
                      }
                    })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Plantillas de Mensajes</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="whatsapp-templates-enabled"
                    checked={whatsappConfig.features.templates.enabled}
                    onChange={(e) => handleConfigChange(channel.id, {
                      ...whatsappConfig,
                      features: {
                        ...whatsappConfig.features,
                        templates: {
                          ...whatsappConfig.features.templates,
                          enabled: e.target.checked
                        }
                      }
                    })}
                  />
                  <Label htmlFor="whatsapp-templates-enabled">Habilitar plantillas</Label>
                </div>
                <div className="space-y-4">
                  {whatsappConfig.features.templates.templates.map((template, index) => (
                    <div key={index} className="space-y-4 p-4 border rounded-lg">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nombre</Label>
                          <Input 
                            value={template.name}
                            onChange={(e) => {
                              const newTemplates = [...whatsappConfig.features.templates.templates]
                              newTemplates[index] = { ...template, name: e.target.value }
                              handleConfigChange(channel.id, {
                                ...whatsappConfig,
                                features: {
                                  ...whatsappConfig.features,
                                  templates: {
                                    ...whatsappConfig.features.templates,
                                    templates: newTemplates
                                  }
                                }
                              })
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Idioma</Label>
                          <Input 
                            value={template.language}
                            onChange={(e) => {
                              const newTemplates = [...whatsappConfig.features.templates.templates]
                              newTemplates[index] = { ...template, language: e.target.value }
                              handleConfigChange(channel.id, {
                                ...whatsappConfig,
                                features: {
                                  ...whatsappConfig.features,
                                  templates: {
                                    ...whatsappConfig.features.templates,
                                    templates: newTemplates
                                  }
                                }
                              })
                            }}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Categoría</Label>
                        <Input 
                          value={template.category}
                          onChange={(e) => {
                            const newTemplates = [...whatsappConfig.features.templates.templates]
                            newTemplates[index] = { ...template, category: e.target.value }
                            handleConfigChange(channel.id, {
                              ...whatsappConfig,
                              features: {
                                ...whatsappConfig.features,
                                templates: {
                                  ...whatsappConfig.features.templates,
                                  templates: newTemplates
                                }
                              }
                            })
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Contenido</Label>
                        <Input 
                          value={template.content}
                          onChange={(e) => {
                            const newTemplates = [...whatsappConfig.features.templates.templates]
                            newTemplates[index] = { ...template, content: e.target.value }
                            handleConfigChange(channel.id, {
                              ...whatsappConfig,
                              features: {
                                ...whatsappConfig.features,
                                templates: {
                                  ...whatsappConfig.features.templates,
                                  templates: newTemplates
                                }
                              }
                            })
                          }}
                        />
                      </div>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          const newTemplates = whatsappConfig.features.templates.templates.filter((_, i) => i !== index)
                          handleConfigChange(channel.id, {
                            ...whatsappConfig,
                            features: {
                              ...whatsappConfig.features,
                              templates: {
                                ...whatsappConfig.features.templates,
                                templates: newTemplates
                              }
                            }
                          })
                        }}
                      >
                        Eliminar Plantilla
                      </Button>
                    </div>
                  ))}
                  <Button
                    onClick={() => {
                      const newTemplate = {
                        name: "",
                        language: "es",
                        category: "marketing",
                        content: ""
                      }
                      handleConfigChange(channel.id, {
                        ...whatsappConfig,
                        features: {
                          ...whatsappConfig.features,
                          templates: {
                            ...whatsappConfig.features.templates,
                            templates: [...whatsappConfig.features.templates.templates, newTemplate]
                          }
                        }
                      })
                    }}
                  >
                    Añadir Plantilla
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )

      case "email":
        const emailConfig = channel.config as EmailConfig
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Servidor SMTP</Label>
              <Input 
                value={emailConfig.smtp.host}
                onChange={(e) => handleConfigChange(channel.id, {
                  ...emailConfig,
                  smtp: {
                    ...emailConfig.smtp,
                    host: e.target.value
                  }
                })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Puerto SMTP</Label>
                <Input 
                  type="number" 
                  value={emailConfig.smtp.port}
                  onChange={(e) => handleConfigChange(channel.id, {
                    ...emailConfig,
                    smtp: {
                      ...emailConfig.smtp,
                      port: parseInt(e.target.value)
                    }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Usuario SMTP</Label>
                <Input 
                  value={emailConfig.smtp.username}
                  onChange={(e) => handleConfigChange(channel.id, {
                    ...emailConfig,
                    smtp: {
                      ...emailConfig.smtp,
                      username: e.target.value
                    }
                  })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Contraseña SMTP</Label>
              <Input 
                type="password" 
                value={emailConfig.smtp.password}
                onChange={(e) => handleConfigChange(channel.id, {
                  ...emailConfig,
                  smtp: {
                    ...emailConfig.smtp,
                    password: e.target.value
                  }
                })}
              />
            </div>
            <div className="space-y-2">
              <Label>Servidor IMAP</Label>
              <Input 
                value={emailConfig.imap.host}
                onChange={(e) => handleConfigChange(channel.id, {
                  ...emailConfig,
                  imap: {
                    ...emailConfig.imap,
                    host: e.target.value
                  }
                })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Puerto IMAP</Label>
                <Input 
                  type="number" 
                  value={emailConfig.imap.port}
                  onChange={(e) => handleConfigChange(channel.id, {
                    ...emailConfig,
                    imap: {
                      ...emailConfig.imap,
                      port: parseInt(e.target.value)
                    }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Usuario IMAP</Label>
                <Input 
                  value={emailConfig.imap.username}
                  onChange={(e) => handleConfigChange(channel.id, {
                    ...emailConfig,
                    imap: {
                      ...emailConfig.imap,
                      username: e.target.value
                    }
                  })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Contraseña IMAP</Label>
              <Input 
                type="password" 
                value={emailConfig.imap.password}
                onChange={(e) => handleConfigChange(channel.id, {
                  ...emailConfig,
                  imap: {
                    ...emailConfig.imap,
                    password: e.target.value
                  }
                })}
              />
            </div>
            <div className="space-y-2">
              <Label>Carpetas a sincronizar</Label>
              <Input 
                value={emailConfig.folders.join(", ")}
                onChange={(e) => handleConfigChange(channel.id, {
                  ...emailConfig,
                  folders: e.target.value.split(",").map(f => f.trim())
                })}
              />
            </div>
          </div>
        )

      default:
        return null
    }
  }

  if (loading) {
    return <div className="container mx-auto py-8">Cargando...</div>
  }

  if (error) {
    return <div className="container mx-auto py-8 text-red-500">{error}</div>
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Configuración de Redes Sociales</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full">
          {Object.entries(configs).map(([key, config]) => {
            const Icon = config.icon
            const channel = channels.find(c => c.id === key)
            return (
              <TabsTrigger
                key={key}
                value={key}
                className="flex items-center gap-2"
              >
                <div className={`p-1 rounded-lg bg-gradient-to-r ${config.color}`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span>{config.name}</span>
                {channel?.connected && (
                  <Badge variant="default" className="ml-2 bg-green-500">
                    Conectado
                  </Badge>
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {Object.entries(configs).map(([key, config]) => {
          const Icon = config.icon
          const channel = channels.find(c => c.id === key)
          if (!channel) return null

          return (
            <TabsContent key={key} value={key}>
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold">{config.name}</h2>
                    <p className="text-sm text-gray-500">
                      Última sincronización: {new Date(channel.lastSync).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant={channel.connected ? "secondary" : "default"}
                    onClick={() => handleConnect(channel.id)}
                  >
                    {channel.connected ? "Desconectar" : "Conectar"}
                  </Button>
                </div>

                {renderConfigForm(channel)}

                <div className="mt-6 flex justify-end">
                  <Button onClick={() => handleSaveConfig(channel.id)}>
                    Guardar Configuración
                  </Button>
                </div>
              </Card>
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
} 