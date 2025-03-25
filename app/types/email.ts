export interface Email {
  id: string
  from: {
    name: string
    email: string
    avatar: string
  }
  to?: string[]
  subject: string
  preview: string
  content: string
  date: string
  isRead: boolean
  isStarred: boolean
  isImportant: boolean
  hasAttachments: boolean
  labels: string[]
  attachments: {
    name: string
    size: number
    type: string
    url: string
  }[]
} 