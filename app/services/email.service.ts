import { Email } from "@/types/email"

class EmailService {
  private emails: Email[] = []
  private drafts: Email[] = []
  private sent: Email[] = []
  private spam: Email[] = []
  private trash: Email[] = []

  constructor() {
    // Inicializar con datos de ejemplo
    this.emails = [
      {
        id: "1",
        from: {
          name: "María García",
          email: "maria.garcia@clinicaestetica.com",
          avatar: "https://i.pravatar.cc/150?img=1"
        },
        subject: "Reunión de equipo - Planificación mensual",
        preview: "Hola equipo, adjunto encontrarán la agenda para la reunión de planificación mensual...",
        date: "10:30",
        isRead: false,
        isStarred: true,
        isImportant: true,
        hasAttachments: true,
        labels: ["Trabajo", "Importante"]
      },
      {
        id: "2",
        from: {
          name: "Carlos Ruiz",
          email: "carlos.ruiz@clinicaestetica.com",
          avatar: "https://i.pravatar.cc/150?img=2"
        },
        subject: "Actualización de inventario",
        preview: "El inventario ha sido actualizado. Por favor, revisen los cambios...",
        date: "09:15",
        isRead: true,
        isStarred: false,
        isImportant: false,
        hasAttachments: false,
        labels: ["Inventario"]
      }
    ]
  }

  // Obtener correos por carpeta
  getEmails(folder: string): Email[] {
    switch (folder) {
      case "Recibidos":
        return this.emails
      case "Enviados":
        return this.sent
      case "Borradores":
        return this.drafts
      case "Spam":
        return this.spam
      case "Papelera":
        return this.trash
      default:
        return this.emails
    }
  }

  // Crear nuevo correo
  createEmail(email: Omit<Email, "id" | "date">): Email {
    const newEmail: Email = {
      ...email,
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
    this.sent.push(newEmail)
    return newEmail
  }

  // Guardar borrador
  saveDraft(email: Omit<Email, "id" | "date">): Email {
    const draft: Email = {
      ...email,
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
    this.drafts.push(draft)
    return draft
  }

  // Marcar como leído/no leído
  toggleRead(id: string, folder: string): void {
    const emails = this.getEmails(folder)
    const email = emails.find(e => e.id === id)
    if (email) {
      email.isRead = !email.isRead
    }
  }

  // Marcar como favorito
  toggleStarred(id: string, folder: string): void {
    const emails = this.getEmails(folder)
    const email = emails.find(e => e.id === id)
    if (email) {
      email.isStarred = !email.isStarred
    }
  }

  // Mover a spam
  moveToSpam(id: string, folder: string): void {
    const emails = this.getEmails(folder)
    const emailIndex = emails.findIndex(e => e.id === id)
    if (emailIndex !== -1) {
      const email = emails.splice(emailIndex, 1)[0]
      this.spam.push(email)
    }
  }

  // Mover a papelera
  moveToTrash(id: string, folder: string): void {
    const emails = this.getEmails(folder)
    const emailIndex = emails.findIndex(e => e.id === id)
    if (emailIndex !== -1) {
      const email = emails.splice(emailIndex, 1)[0]
      this.trash.push(email)
    }
  }

  // Eliminar permanentemente
  deletePermanently(id: string): void {
    const trashIndex = this.trash.findIndex(e => e.id === id)
    if (trashIndex !== -1) {
      this.trash.splice(trashIndex, 1)
    }
  }

  // Vaciar papelera
  emptyTrash(): void {
    this.trash = []
  }

  // Restaurar de papelera
  restoreFromTrash(id: string): void {
    const trashIndex = this.trash.findIndex(e => e.id === id)
    if (trashIndex !== -1) {
      const email = this.trash.splice(trashIndex, 1)[0]
      this.emails.push(email)
    }
  }

  // Buscar correos
  searchEmails(query: string): Email[] {
    const allEmails = [...this.emails, ...this.sent, ...this.drafts]
    return allEmails.filter(email =>
      email.subject.toLowerCase().includes(query.toLowerCase()) ||
      email.from.name.toLowerCase().includes(query.toLowerCase()) ||
      email.from.email.toLowerCase().includes(query.toLowerCase())
    )
  }

  // Agregar nuevo correo
  addEmail(email: Email): void {
    this.emails.push(email)
  }
}

export const emailService = new EmailService() 