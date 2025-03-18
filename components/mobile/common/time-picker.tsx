"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { MobileBottomSheet } from "@/components/mobile/layout/bottom-sheet"

interface MobileTimePickerProps {
  isOpen: boolean
  onClose: () => void
  value: string
  onChange: (time: string) => void
}

export function MobileTimePicker({ isOpen, onClose, value, onChange }: MobileTimePickerProps) {
  const [selectedHour, setSelectedHour] = useState(value.split(":")[0] || "00")
  const [selectedMinute, setSelectedMinute] = useState(value.split(":")[1] || "00")

  useEffect(() => {
    if (value) {
      const [hour, minute] = value.split(":")
      setSelectedHour(hour)
      setSelectedMinute(minute)
    }
  }, [value])

  const handleSave = () => {
    onChange(`${selectedHour}:${selectedMinute}`)
    onClose()
  }

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"))
  const minutes = Array.from({ length: 4 }, (_, i) => (i * 15).toString().padStart(2, "0"))

  return (
    <MobileBottomSheet isOpen={isOpen} onClose={onClose} title="Seleccionar hora">
      <div className="p-4 space-y-4">
        <div className="flex justify-center space-x-4">
          <div className="w-1/2">
            <h3 className="text-center mb-2 text-purple-600">Hora</h3>
            <div className="h-48 overflow-y-auto">
              {hours.map((hour) => (
                <Button
                  key={hour}
                  variant={hour === selectedHour ? "default" : "ghost"}
                  className={`w-full ${hour === selectedHour ? "bg-purple-600 text-white" : ""}`}
                  onClick={() => setSelectedHour(hour)}
                >
                  {hour}
                </Button>
              ))}
            </div>
          </div>
          <div className="w-1/2">
            <h3 className="text-center mb-2 text-purple-600">Minuto</h3>
            <div className="h-48 overflow-y-auto">
              {minutes.map((minute) => (
                <Button
                  key={minute}
                  variant={minute === selectedMinute ? "default" : "ghost"}
                  className={`w-full ${minute === selectedMinute ? "bg-purple-600 text-white" : ""}`}
                  onClick={() => setSelectedMinute(minute)}
                >
                  {minute}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <Button onClick={handleSave} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
          Confirmar
        </Button>
      </div>
    </MobileBottomSheet>
  )
}

