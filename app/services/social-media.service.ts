import { SocialChannel, InstagramConfig, FacebookConfig, TwitterConfig, WhatsAppConfig, EmailConfig } from "./data/models/interfaces"
import { 
  getSocialChannels, 
  getSocialChannelById, 
  updateSocialChannel, 
  toggleSocialChannelConnection, 
  updateSocialChannelConfig 
} from "./data/mockData"

class SocialMediaService {
  async getAllChannels(): Promise<SocialChannel[]> {
    return getSocialChannels()
  }

  async getChannelById(id: string): Promise<SocialChannel | null> {
    return getSocialChannelById(id)
  }

  async updateChannel(id: string, data: Partial<SocialChannel>): Promise<SocialChannel | null> {
    return updateSocialChannel(id, data)
  }

  async toggleConnection(id: string): Promise<SocialChannel | null> {
    return toggleSocialChannelConnection(id)
  }

  async updateConfig(id: string, config: InstagramConfig | FacebookConfig | TwitterConfig | WhatsAppConfig | EmailConfig): Promise<SocialChannel | null> {
    // Obtener el canal actual
    const currentChannel = await this.getChannelById(id)
    if (!currentChannel) return null

    // Crear una copia profunda de la configuración actual
    const currentConfig = JSON.parse(JSON.stringify(currentChannel.config))

    // Actualizar la configuración manteniendo la estructura anidada
    const updatedConfig = {
      ...currentConfig,
      ...config
    }

    // Actualizar el canal
    return updateSocialChannelConfig(id, updatedConfig)
  }
}

export const socialMediaService = new SocialMediaService() 