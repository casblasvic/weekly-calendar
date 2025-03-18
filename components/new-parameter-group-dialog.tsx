"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface NewParameterGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (name: string) => void
}

export function NewParameterGroupDialog({ open, onOpenChange, onSave }: NewParameterGroupDialogProps) {
  const [groupName, setGroupName] = useState("")

  const handleSave = () => {
    if (groupName.trim()) {
      onSave(groupName)
      setGroupName("")
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nuevo grupo de parámetros</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del grupo</Label>
            <Input
              id="name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Ej: Parámetro IV"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Guardar</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

