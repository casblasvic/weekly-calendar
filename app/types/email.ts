export interface Email {
  id: string
  from: string
  to: string
  subject: string
  content: string
  date: string
  read: boolean
  isStarred: boolean
  isImportant: boolean
  preview: string
  attachments: {
    name: string
    url: string
    type: string
  }[]
  sender: {
    name: string
    avatar: string
  }
} 