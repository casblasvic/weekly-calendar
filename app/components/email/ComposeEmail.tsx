"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { emailService } from "@/app/services/email.service"
import { Email } from "@/app/types/email"
import { toast } from "sonner"

interface ComposeEmailProps {
  isOpen: boolean
  onClose: () => void
  onSend: () => void
  onSaveDraft: () => void
  replyTo?: Email
}

export function ComposeEmail({ isOpen, onClose, onSend, onSaveDraft, replyTo }: ComposeEmailProps) {
  const [to, setTo] = useState("")
  const [subject, setSubject] = useState("")
  const [content, setContent] = useState("")

  const handleSend = async () => {
    try {
      await emailService.sendEmail({
        to,
        from: "usuario@correo.com", // TODO: Obtener del usuario actual
        subject,
        content,
        read: false,
        isStarred: false,
        isImportant: false,
        preview: content.substring(0, 100),
        attachments: [],
        sender: {
          name: "Usuario Actual",
          avatar: "https://via.placeholder.com/40"
        }
      })
      toast.success("Correo enviado correctamente")
      onSend()
      onClose()
    } catch (error) {
      toast.error("Error al enviar el correo")
    }
  }

  const handleSaveDraft = async () => {
    try {
      await emailService.saveDraft({
        to,
        from: "usuario@correo.com", // TODO: Obtener del usuario actual
        subject,
        content,
        read: false,
        isStarred: false,
        isImportant: false,
        preview: content.substring(0, 100),
        attachments: [],
        sender: {
          name: "Usuario Actual",
          avatar: "https://via.placeholder.com/40"
        }
      })
      toast.success("Borrador guardado correctamente")
      onSaveDraft()
      onClose()
    } catch (error) {
      toast.error("Error al guardar el borrador")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Nuevo correo</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="to">Para</Label>
            <Input
              id="to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="destinatario@correo.com"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="subject">Asunto</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Asunto del correo"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="content">Contenido</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escribe tu mensaje aquí..."
              className="min-h-[200px]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleSaveDraft}>
              Guardar borrador
            </Button>
            <Button onClick={handleSend}>
              Enviar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 