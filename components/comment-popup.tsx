"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface CommentPopupProps {
  isOpen: boolean
  onClose: () => void
  onSave: (comment: string) => void
}

export function CommentPopup({ isOpen, onClose, onSave }: CommentPopupProps) {
  const [comment, setComment] = useState("")

  const handleSave = () => {
    onSave(comment)
    setComment("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Añadir comentario</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            placeholder="Escriba su comentario aquí..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="min-h-[100px]"
          />
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
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

