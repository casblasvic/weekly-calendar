"use client"

import { useState, useEffect } from "react"
import { MobileBottomSheet } from "@/components/mobile-bottom-sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CabinColorSelect } from "../cabin-color-select"

interface MobileCabinBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  cabinId?: number
}

interface Cabin {
  id: number
  code: string
  name: string
  color?: string
  isActive?: boolean
}

export function MobileCabinBottomSheet({ isOpen, onClose, cabinId }: MobileCabinBottomSheetProps) {
  const [cabin, setCabin] = useState<Cabin>({
    id: 0,
    code: "",
    name: "",
    color: "#5a1e9d",
    isActive: true,
  })

  const [formData, setFormData] = useState({
    id: 0,
    code: "",
    name: "",
    color: "#5a1e9d",
    isActive: true,
  })

  useEffect(() => {
    if (cabinId && isOpen) {
      // In a real app, fetch cabin data from API
      // For now, we'll use mock data
      const mockCabin: Cabin = {
        id: cabinId,
        code: "Con",
        name: "Consultation",
        color: "#5a1e9d",
        isActive: true,
      }
      setCabin(mockCabin)
      setFormData(mockCabin)
    } else {
      setFormData({
        id: 0,
        code: "",
        name: "",
        color: "#5a1e9d",
        isActive: true,
      })
    }
  }, [cabinId, isOpen])

  const handleSave = () => {
    // Save cabin data
    console.log("Saving cabin:", formData)
    onClose()
  }

  return (
    <MobileBottomSheet isOpen={isOpen} onClose={onClose} title={cabinId ? "Editar cabina" : "Nueva cabina"}>
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="mobile-code">Código</Label>
          <Input
            id="mobile-code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mobile-name">Nombre</Label>
          <Input
            id="mobile-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="color">Color</Label>
          <CabinColorSelect
            value={formData.color}
            onValueChange={(value) => setFormData({ ...formData, color: value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mobile-status">Estado</Label>
          <Select
            value={formData.isActive ? "active" : "inactive"}
            onValueChange={(value) => setFormData({ ...formData, isActive: value === "active" })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Activa</SelectItem>
              <SelectItem value="inactive">Inactiva</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="pt-4 flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button className="bg-purple-600 hover:bg-purple-700 flex-1" onClick={handleSave}>
            Guardar
          </Button>
        </div>
      </div>
    </MobileBottomSheet>
  )
}

