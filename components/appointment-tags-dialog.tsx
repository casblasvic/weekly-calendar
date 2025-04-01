"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Check, Tag } from "lucide-react"
import { AppointmentTag, useAppointmentTags } from "@/contexts/appointment-tags-context"

interface AppointmentTagsDialogProps {
  isOpen: boolean
  onClose: () => void
  selectedTags: string[]
  onTagSelect: (tagId: string) => void
}

export function AppointmentTagsDialog({
  isOpen,
  onClose,
  selectedTags,
  onTagSelect,
}: AppointmentTagsDialogProps) {
  const { getTags } = useAppointmentTags() || { getTags: () => [] }
  const [availableTags, setAvailableTags] = useState<AppointmentTag[]>([])
  
  useEffect(() => {
    // Solo cargar etiquetas cuando el diálogo está abierto
    if (isOpen) {
      setAvailableTags(getTags())
    }
  }, [isOpen, getTags])

  const handleTagClick = (tagId: string) => {
    onTagSelect(tagId)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Seleccionar etiquetas
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[300px] overflow-y-auto p-0">
          {availableTags.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <p>No hay etiquetas disponibles</p>
              <p className="text-sm mt-1">Crea etiquetas en Configuración &gt; Catálogos &gt; Etiquetas</p>
            </div>
          ) : (
            <div className="grid gap-0.5">
              {availableTags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between px-4 py-3 cursor-pointer transition-colors"
                  style={{
                    backgroundColor: tag.color,
                    color: "#FFFFFF",
                  }}
                  onClick={() => handleTagClick(tag.id)}
                >
                  <span className="font-medium">{tag.name}</span>
                  {selectedTags.includes(tag.id) && <Check className="h-5 w-5" />}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 border-t flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 