import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Send, X, Save, Paperclip } from "lucide-react"
import { emailService } from "@/app/services/email.service"
import { Email } from "@/app/types/email"

interface ComposeEmailProps {
  isOpen: boolean
  onClose: () => void
  onSend: () => void
  onSaveDraft: () => void
  replyTo?: Email
}

export function ComposeEmail({ isOpen, onClose, onSend, onSaveDraft, replyTo }: ComposeEmailProps) {
  const [to, setTo] = useState(replyTo ? replyTo.from.email : "")
  const [subject, setSubject] = useState(replyTo ? `Re: ${replyTo.subject}` : "")
  const [content, setContent] = useState("")
  const [attachments, setAttachments] = useState<File[]>([])

  const handleSend = () => {
    const newEmail: Omit<Email, "id" | "date"> = {
      from: {
        name: "Tu Nombre",
        email: "tu@email.com",
        avatar: "https://i.pravatar.cc/150?img=3"
      },
      to: to.split(",").map(email => email.trim()),
      subject,
      preview: content.substring(0, 100) + "...",
      content,
      isRead: true,
      isStarred: false,
      isImportant: false,
      hasAttachments: attachments.length > 0,
      labels: [],
      attachments: attachments.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file)
      }))
    }

    emailService.createEmail(newEmail)
    onSend()
    onClose()
  }

  const handleSaveDraft = () => {
    const draft: Omit<Email, "id" | "date"> = {
      from: {
        name: "Tu Nombre",
        email: "tu@email.com",
        avatar: "https://i.pravatar.cc/150?img=3"
      },
      to: to.split(",").map(email => email.trim()),
      subject,
      preview: content.substring(0, 100) + "...",
      content,
      isRead: true,
      isStarred: false,
      isImportant: false,
      hasAttachments: attachments.length > 0,
      labels: ["Borrador"],
      attachments: attachments.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file)
      }))
    }

    emailService.saveDraft(draft)
    onSaveDraft()
    onClose()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments([...attachments, ...Array.from(e.target.files)])
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[80vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex justify-between items-center">
            <span>Nuevo correo</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="to">Para:</Label>
              <Input
                id="to"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="ejemplo@email.com"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Asunto:</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Asunto del correo"
                className="w-full"
              />
            </div>

            <div className="flex-1 space-y-2">
              <Label htmlFor="content">Contenido:</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="flex-1 min-h-[300px] resize-none"
                placeholder="Escribe tu mensaje aquí..."
              />
            </div>

            {attachments.length > 0 && (
              <div className="space-y-2">
                <Label>Archivos adjuntos:</Label>
                <div className="flex flex-wrap gap-2">
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-md"
                    >
                      <span className="text-sm">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 hover:bg-gray-200"
                        onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center px-6 py-4 border-t">
          <div className="flex gap-2">
            <Button onClick={handleSend} className="px-6">
              <Send className="h-4 w-4 mr-2" />
              Enviar
            </Button>
            <Button variant="outline" onClick={handleSaveDraft} className="px-6">
              <Save className="h-4 w-4 mr-2" />
              Guardar borrador
            </Button>
            <Button 
              variant="outline" 
              onClick={() => document.getElementById("attachment")?.click()}
              className="px-6"
            >
              <Paperclip className="h-4 w-4 mr-2" />
              Adjuntar
            </Button>
            <input
              id="attachment"
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 