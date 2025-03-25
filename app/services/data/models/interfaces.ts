export interface BaseSocialConfig {
  autoSync: boolean
  syncInterval: string
  notifications: boolean
}

export interface InstagramConfig extends BaseSocialConfig {
  apiKey: string
  apiSecret: string
  accessToken: string
  webhookUrl: string
  businessProfile?: string
}

export interface FacebookConfig extends BaseSocialConfig {
  appId: string
  appSecret: string
  accessToken: string
  webhookUrl: string
  businessProfile?: string
}

export interface TwitterConfig extends BaseSocialConfig {
  apiKey: string
  apiSecret: string
  accessToken: string
  accessTokenSecret: string
  webhookUrl: string
  businessProfile?: string
  features: {
    directMessages: {
      enabled: boolean
      autoReply: boolean
      replyTemplate?: string
    }
    posts: {
      enabled: boolean
      autoPost: boolean
      postTemplate?: string
      schedulePosts: boolean
      postingSchedule?: {
        frequency: string
        times: string[]
      }
    }
  }
}

export interface EmailConfig extends BaseSocialConfig {
  smtp: {
    host: string
    port: number
    username: string
    password: string
    secure: boolean
  }
  imap: {
    host: string
    port: number
    username: string
    password: string
    secure: boolean
  }
  folders: string[]
}

export interface WhatsAppConfig extends BaseSocialConfig {
  businessId: string
  phoneNumber: string
  accessToken: string
  webhookUrl: string
  features: {
    messages: {
      enabled: boolean
      autoReply: boolean
      replyTemplate: string
      businessHours: {
        enabled: boolean
        startTime: string
        endTime: string
        timezone: string
      }
    }
    templates: {
      enabled: boolean
      templates: Array<{
        name: string
        language: string
        category: string
        content: string
      }>
    }
  }
}

export interface SocialChannel {
  id: string
  name: string
  icon: string
  color: string
  connected: boolean
  lastSync: string
  config: InstagramConfig | FacebookConfig | TwitterConfig | WhatsAppConfig | EmailConfig
} 