"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

const colors = [
  { id: "sin-color", name: "Sin color", value: "transparent" },
  { id: "verde", name: "Verde", value: "#4CAF50" },
  { id: "violeta", name: "Violeta", value: "#9C27B0" },
  { id: "naranja", name: "Naranja", value: "#FF9800" },
  { id: "amarillo", name: "Amarillo", value: "#FFEB3B" },
  { id: "rosa", name: "Rosa", value: "#E91E63" },
  { id: "gris", name: "Gris", value: "#9E9E9E" },
  { id: "gris-claro", name: "Gris claro", value: "#E0E0E0" },
  { id: "azul-marino", name: "Azul marino", value: "#1976D2" },
  { id: "azul-claro", name: "Azul claro", value: "#03A9F4" },
  { id: "verde-oliva", name: "Verde oliva", value: "#827717" },
  { id: "verde-claro", name: "Verde claro", value: "#8BC34A" },
  { id: "violeta-medio", name: "Violeta medio", value: "#7B1FA2" },
  { id: "violeta-claro", name: "Violeta claro", value: "#BA68C8" },
  { id: "rosa-medio", name: "Rosa medio", value: "#D81B60" },
  { id: "rosa-claro", name: "Rosa claro", value: "#F48FB1" },
  { id: "amarillo-brillo", name: "Amarillo brillo", value: "#FDD835" },
  { id: "amarillo-claro", name: "Amarillo claro", value: "#FFF176" },
  { id: "naranja-medio", name: "Naranja medio", value: "#F57C00" },
  { id: "naranja-claro", name: "Naranja claro", value: "#FFB74D" },
  { id: "sepia", name: "Sepia", value: "#795548" },
  { id: "sepia-claro", name: "Sepia claro", value: "#A1887F" },
  { id: "aguamarina", name: "Aguamarina", value: "#009688" },
  { id: "aguamarina-claro", name: "Aguamarina claro", value: "#4DB6AC" },
  { id: "azul", name: "Azul", value: "#2196F3" },
]

interface CabinColorSelectProps {
  value: string
  onValueChange: (value: string) => void
}

export function CabinColorSelect({ value, onValueChange }: CabinColorSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Seleccionar color">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "h-4 w-4 rounded-full border border-gray-200",
                value === "transparent" ? "bg-gray-100" : "",
              )}
              style={value !== "transparent" ? { backgroundColor: value } : {}}
            />
            <span>{colors.find((c) => c.value === value)?.name || "Seleccionar color"}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {colors.map((color) => (
          <SelectItem key={color.id} value={color.value}>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "h-4 w-4 rounded-full border border-gray-200",
                  color.value === "transparent" ? "bg-gray-100" : "",
                )}
                style={color.value !== "transparent" ? { backgroundColor: color.value } : {}}
              />
              <span>{color.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

