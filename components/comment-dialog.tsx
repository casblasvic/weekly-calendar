"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"

interface CommentDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (comment: string) => void
  initialComment?: string
}

export function CommentDialog({ isOpen, onClose, onSave, initialComment = "" }: CommentDialogProps) {
  const [comment, setComment] = useState(initialComment)

  const handleSave = () => {
    onSave(comment)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-purple-600">Comentarios</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Escriba su comentario aquí..."
            className="min-h-[150px] resize-none"
          />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} className="bg-white hover:bg-gray-50">
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700 text-white">
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

