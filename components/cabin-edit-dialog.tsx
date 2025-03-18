"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CabinColorSelect } from "./cabin-color-select"

interface CabinEditDialogProps {
  isOpen: boolean
  onClose: () => void
  cabin: Cabin | null
  onSave: (cabin: Cabin) => void
}

interface Cabin {
  id: number
  code: string
  name: string
  color: string
  isActive: boolean
}

export function CabinEditDialog({ isOpen, onClose, cabin, onSave }: CabinEditDialogProps) {
  const [formData, setFormData] = useState<Cabin>({
    id: 0,
    code: "",
    name: "",
    color: "#5a1e9d",
    isActive: true,
  })

  useEffect(() => {
    if (cabin) {
      setFormData(cabin)
    } else {
      setFormData({
        id: 0,
        code: "",
        name: "",
        color: "#5a1e9d",
        isActive: true,
      })
    }
  }, [cabin])

  const handleSave = () => {
    onSave(formData)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{cabin && cabin.id !== 0 ? "Editar cabina" : "Nueva cabina"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="code" className="text-right">
              Código
            </Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nombre
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="color" className="text-right">
              Color
            </Label>
            <div className="col-span-3">
              <CabinColorSelect
                value={formData.color}
                onValueChange={(value) => setFormData({ ...formData, color: value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Estado
            </Label>
            <Select
              value={formData.isActive ? "active" : "inactive"}
              onValueChange={(value) => setFormData({ ...formData, isActive: value === "active" })}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activa</SelectItem>
                <SelectItem value="inactive">Inactiva</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleSave}>
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

