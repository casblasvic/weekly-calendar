"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"
import { MessageSquare } from "lucide-react"

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
      <DialogContent className="sm:max-w-[425px] p-4">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-purple-600 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comentarios
          </DialogTitle>
        </DialogHeader>
        <div className="mt-2 mb-4">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Escriba su comentario aquí..."
            className="min-h-[150px] resize-none border border-gray-200 rounded-md focus:border-purple-600 focus:ring-1 focus:ring-purple-600 p-3"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={onClose} 
            className="bg-white hover:bg-gray-50 border-gray-200 text-gray-700"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            className="bg-[#2F0E5D] hover:bg-[#260b4a] text-white"
          >
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

