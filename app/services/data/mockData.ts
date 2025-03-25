import { SocialChannel, InstagramConfig, FacebookConfig, TwitterConfig, WhatsAppConfig, EmailConfig } from "./models/interfaces"

export const mockSocialChannels: SocialChannel[] = [
  {
    id: "instagram",
    name: "Instagram",
    icon: "instagram",
    color: "from-purple-500 to-pink-500",
    connected: true,
    lastSync: "2024-02-20T10:00:00Z",
    config: {
      apiKey: "********************",
      apiSecret: "********************",
      accessToken: "********************",
      webhookUrl: "https://api.tudominio.com/webhooks/instagram",
      businessProfile: "mi_perfil_negocio",
      autoSync: true,
      syncInterval: "30",
      notifications: true
    } as InstagramConfig
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: "facebook",
    color: "from-blue-500 to-blue-700",
    connected: true,
    lastSync: "2024-02-20T10:00:00Z",
    config: {
      appId: "********************",
      appSecret: "********************",
      accessToken: "********************",
      webhookUrl: "https://api.tudominio.com/webhooks/facebook",
      businessProfile: "mi_pagina_negocio",
      autoSync: true,
      syncInterval: "30",
      notifications: true
    } as FacebookConfig
  },
  {
    id: "twitter",
    name: "Twitter",
    icon: "twitter",
    color: "from-blue-400 to-blue-600",
    connected: true,
    lastSync: "2024-02-20T10:00:00Z",
    config: {
      apiKey: "********************",
      apiSecret: "********************",
      accessToken: "********************",
      accessTokenSecret: "********************",
      webhookUrl: "https://api.tudominio.com/webhooks/twitter",
      businessProfile: "mi_cuenta_negocio",
      autoSync: true,
      syncInterval: "30",
      notifications: true,
      features: {
        directMessages: {
          enabled: true,
          autoReply: false,
          replyTemplate: "Gracias por tu mensaje. Te responderemos pronto."
        },
        posts: {
          enabled: true,
          autoPost: false,
          postTemplate: "Nuevo servicio disponible: {servicio}",
          schedulePosts: false,
          postingSchedule: {
            frequency: "diario",
            times: ["09:00", "12:00", "15:00"]
          }
        }
      }
    } as TwitterConfig
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    icon: "whatsapp",
    color: "from-green-500 to-green-700",
    connected: true,
    lastSync: "2024-02-20T10:00:00Z",
    config: {
      businessId: "********************",
      phoneNumber: "+34 123 456 789",
      accessToken: "********************",
      webhookUrl: "https://api.tudominio.com/webhooks/whatsapp",
      autoSync: true,
      syncInterval: "30",
      notifications: true,
      features: {
        messages: {
          enabled: true,
          autoReply: false,
          replyTemplate: "Gracias por tu mensaje. Te responderemos en horario de atención.",
          businessHours: {
            enabled: true,
            startTime: "09:00",
            endTime: "18:00",
            timezone: "Europe/Madrid"
          }
        },
        templates: {
          enabled: true,
          templates: [
            {
              name: "Bienvenida",
              language: "es",
              category: "marketing",
              content: "¡Bienvenido a nuestra clínica! ¿En qué podemos ayudarte?"
            },
            {
              name: "Confirmación Cita",
              language: "es",
              category: "appointment",
              content: "Tu cita ha sido confirmada para el {fecha} a las {hora}."
            }
          ]
        }
      }
    } as WhatsAppConfig
  },
  {
    id: "email",
    name: "Email",
    icon: "email",
    color: "from-red-500 to-red-700",
    connected: true,
    lastSync: "2024-02-20T10:00:00Z",
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
      folders: ["INBOX", "SENT", "DRAFTS"],
      autoSync: true,
      syncInterval: "30",
      notifications: true
    } as EmailConfig
  }
]

// Funciones para manipular los datos mock
export const getSocialChannels = async (): Promise<SocialChannel[]> => {
  return mockSocialChannels
}

export const getSocialChannelById = async (id: string): Promise<SocialChannel | null> => {
  return mockSocialChannels.find(channel => channel.id === id) || null
}

export const updateSocialChannel = async (id: string, data: Partial<SocialChannel>): Promise<SocialChannel | null> => {
  const index = mockSocialChannels.findIndex(channel => channel.id === id)
  if (index === -1) return null

  // Crear una copia profunda del canal actual
  const currentChannel = JSON.parse(JSON.stringify(mockSocialChannels[index]))
  
  // Actualizar solo los campos proporcionados
  const updatedChannel = {
    ...currentChannel,
    ...data,
    lastSync: new Date().toISOString()
  }

  // Actualizar el canal en el array
  mockSocialChannels[index] = updatedChannel

  // Notificar cambios
  window.dispatchEvent(
    new CustomEvent("data-change", {
      detail: { entityType: "socialChannel", entityId: id }
    })
  )

  return updatedChannel
}

export const toggleSocialChannelConnection = async (id: string): Promise<SocialChannel | null> => {
  const channel = await getSocialChannelById(id)
  if (!channel) return null

  return updateSocialChannel(id, {
    connected: !channel.connected
  })
}

export const updateSocialChannelConfig = async (
  id: string, 
  config: InstagramConfig | FacebookConfig | TwitterConfig | WhatsAppConfig | EmailConfig
): Promise<SocialChannel | null> => {
  const channel = await getSocialChannelById(id)
  if (!channel) return null

  // Crear una copia profunda del canal actual
  const currentChannel = JSON.parse(JSON.stringify(channel))
  
  // Actualizar la configuración manteniendo la estructura anidada
  let updatedConfig = { ...currentChannel.config }

  if (id === "email") {
    const emailConfig = config as EmailConfig
    updatedConfig = {
      ...currentChannel.config,
      smtp: {
        ...currentChannel.config.smtp,
        ...emailConfig.smtp
      },
      imap: {
        ...currentChannel.config.imap,
        ...emailConfig.imap
      },
      folders: emailConfig.folders || currentChannel.config.folders,
      autoSync: emailConfig.autoSync ?? currentChannel.config.autoSync,
      syncInterval: emailConfig.syncInterval || currentChannel.config.syncInterval,
      notifications: emailConfig.notifications ?? currentChannel.config.notifications
    }
  } else {
    updatedConfig = {
      ...currentChannel.config,
      ...config
    }
  }

  const updatedChannel = {
    ...currentChannel,
    config: updatedConfig,
    lastSync: new Date().toISOString()
  }

  // Actualizar el canal en el array
  const index = mockSocialChannels.findIndex(c => c.id === id)
  if (index === -1) return null

  mockSocialChannels[index] = updatedChannel

  // Notificar cambios
  window.dispatchEvent(
    new CustomEvent("data-change", {
      detail: { entityType: "socialChannel", entityId: id }
    })
  )

  return updatedChannel
} 