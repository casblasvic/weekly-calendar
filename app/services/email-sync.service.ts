import { Email } from "@/types/email"
import { emailService } from "./email.service"

interface EmailConfig {
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
}

class EmailSyncService {
  private config: EmailConfig | null = null
  private syncInterval: NodeJS.Timeout | null = null

  constructor() {
    // Inicializar con la configuración por defecto
    this.config = {
      smtp: {
        host: "smtp.gmail.com",
        port: 587,
        username: "",
        password: "",
        secure: true
      },
      imap: {
        host: "imap.gmail.com",
        port: 993,
        username: "",
        password: "",
        secure: true
      }
    }
  }

  async configure(config: EmailConfig) {
    this.config = config
    await this.initializeSync()
  }

  private async initializeSync() {
    if (!this.config) return

    // Iniciar sincronización
    this.startSync()
  }

  private startSync() {
    // Sincronizar cada minuto
    this.syncInterval = setInterval(() => {
      this.syncEmails()
    }, 60000)

    // Sincronización inicial
    this.syncEmails()
  }

  private async syncEmails() {
    if (!this.config) return

    try {
      const response = await fetch("/api/email/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(this.config),
      })

      if (!response.ok) {
        throw new Error("Error al sincronizar correos")
      }

      const data = await response.json()
      
      if (data.success && data.emails) {
        // Agregar los correos al servicio
        data.emails.forEach((email: Email) => {
          emailService.addEmail(email)
        })
      }
    } catch (error) {
      console.error("Error en la sincronización:", error)
    }
  }

  async sendEmail(email: Omit<Email, "id" | "date">) {
    if (!this.config) {
      throw new Error("Email no configurado")
    }

    try {
      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          config: this.config,
          email,
        }),
      })

      if (!response.ok) {
        throw new Error("Error al enviar correo")
      }

      const data = await response.json()
      return data.success
    } catch (error) {
      console.error("Error al enviar correo:", error)
      throw error
    }
  }

  stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }
}

export const emailSyncService = new EmailSyncService() 