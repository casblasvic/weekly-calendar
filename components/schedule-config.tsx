"use client"

import * as React from "react"
import { Clock, Plus, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { WeekSchedule, DaySchedule, TimeRange } from "@/types/schedule"
import { useTemplates } from "@/hooks/use-templates"
import { useClinic } from "@/contexts/clinic-context"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"

interface ScheduleConfigProps {
  value: WeekSchedule
  onChange: (schedule: WeekSchedule) => void
  showTemplateSelector?: boolean
}

const DAYS = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
} as const

export function ScheduleConfig({ value, onChange, showTemplateSelector = false }: ScheduleConfigProps) {
  const { templates } = useTemplates()
  const { activeClinic, updateClinicConfig } = useClinic()

  // Inicializar los estados con los valores de la clínica activa
  const [openTime, setOpenTime] = useState(activeClinic?.config?.openTime || "00:00")
  const [closeTime, setCloseTime] = useState(activeClinic?.config?.closeTime || "23:59")
  const [slotDuration, setSlotDuration] = useState(activeClinic?.config?.slotDuration || 15)
  const [expandedDays, setExpandedDays] = React.useState<string[]>([])

  // Actualizar los estados cuando cambie la clínica activa
  useEffect(() => {
    if (activeClinic?.config) {
      setOpenTime(activeClinic.config.openTime)
      setCloseTime(activeClinic.config.closeTime)
      setSlotDuration(activeClinic.config.slotDuration || 15)
    }
  }, [activeClinic])

  const toggleDay = (day: string) => {
    setExpandedDays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day]))
  }

  const updateDaySchedule = (day: keyof WeekSchedule, schedule: DaySchedule) => {
    const updatedSchedule = {
      ...value,
      [day]: schedule,
    }

    onChange(updatedSchedule)

    // Notificar a la agenda que la configuración ha cambiado
    if (typeof window !== "undefined" && (window as any).notifyClinicConfigUpdated) {
      ;(window as any).notifyClinicConfigUpdated()
    }
  }

  const copySchedule = (fromDay: keyof WeekSchedule, toDay: keyof WeekSchedule) => {
    onChange({
      ...value,
      [toDay]: { ...value[fromDay] },
    })
  }

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId)
    if (template) {
      onChange(template.schedule)
    }
  }

  const handleOpenTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newOpenTime = e.target.value
    setOpenTime(newOpenTime)
    // Actualizar la configuración de la clínica
    if (activeClinic) {
      updateClinicConfig(activeClinic.id, {
        ...activeClinic.config,
        openTime: newOpenTime,
      })
    }
  }

  const handleCloseTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCloseTime = e.target.value
    setCloseTime(newCloseTime)
    // Actualizar la configuración de la clínica
    if (activeClinic) {
      updateClinicConfig(activeClinic.id, {
        ...activeClinic.config,
        closeTime: newCloseTime,
      })
    }
  }

  const handleSlotDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDuration = Number.parseInt(e.target.value, 10)
    if (!isNaN(newDuration) && newDuration > 0 && newDuration <= 60) {
      setSlotDuration(newDuration)
      // Actualizar la configuración de la clínica
      if (activeClinic) {
        updateClinicConfig(activeClinic.id, {
          ...activeClinic.config,
          slotDuration: newDuration,
        })
      }
    }
  }

  const updateTimeRange = (day: keyof WeekSchedule, index: number, field: "start" | "end", newValue: string) => {
    // Validar que el horario no exceda los límites de la clínica
    if (field === "start" && newValue < openTime) {
      newValue = openTime
    }
    if (field === "end" && newValue > closeTime) {
      newValue = closeTime
    }

    const updatedRanges = [...value[day].ranges]
    updatedRanges[index] = { ...updatedRanges[index], [field]: newValue }
    updateDaySchedule(day, { ...value[day], ranges: updatedRanges })
  }

  const removeTimeRange = (day: keyof WeekSchedule, index: number) => {
    const updatedRanges = value[day].ranges.filter((_, i) => i !== index)
    updateDaySchedule(day, { ...value[day], ranges: updatedRanges })
  }

  const addTimeRange = (day: keyof WeekSchedule) => {
    const newRange: TimeRange = {
      start: openTime,
      end: closeTime,
    }
    updateDaySchedule(day, { ...value[day], ranges: [...value[day].ranges, newRange] })
  }

  return (
    <div className="space-y-4">
      {showTemplateSelector && templates.length > 0 && (
        <div className="space-y-2">
          <Label>Seleccionar plantilla</Label>
          <Select onValueChange={handleTemplateChange}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar una plantilla" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {Object.entries(DAYS).map(([day, label]) => (
          <Card key={day} className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <Checkbox
                  checked={value[day as keyof WeekSchedule]?.isOpen || false}
                  onCheckedChange={(checked) =>
                    updateDaySchedule(day as keyof WeekSchedule, {
                      ...(value[day as keyof WeekSchedule] || { ranges: [] }),
                      isOpen: checked as boolean,
                      ranges: checked
                        ? (value[day as keyof WeekSchedule]?.ranges?.length
                          ? value[day as keyof WeekSchedule].ranges
                          : [{ start: openTime, end: closeTime }])
                        : [],
                    })
                  }
                />
                <Label className="font-medium">{label}</Label>
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <Button variant="ghost" size="sm" onClick={() => toggleDay(day)} className="flex-shrink-0">
                  {expandedDays.includes(day) ? "Ocultar" : "Mostrar"}
                </Button>
                <Select
                  value=""
                  onValueChange={(copyFrom) => {
                    if (copyFrom) {
                      copySchedule(copyFrom as keyof WeekSchedule, day as keyof WeekSchedule)
                    }
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[130px]">
                    <SelectValue placeholder="Copiar de..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DAYS).map(
                      ([key, label]) =>
                        key !== day && (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ),
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {expandedDays.includes(day) && value[day as keyof WeekSchedule]?.isOpen && (
              <div className="mt-4 space-y-4">
                {value[day as keyof WeekSchedule].ranges.map((range, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <div className="grid grid-cols-2 gap-4 flex-1">
                      <div>
                        <Label>Hora inicio</Label>
                        <Input
                          type="time"
                          value={range.start}
                          onChange={(e) => updateTimeRange(day as keyof WeekSchedule, index, "start", e.target.value)}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                        />
                      </div>
                      <div>
                        <Label>Hora fin</Label>
                        <Input
                          type="time"
                          value={range.end}
                          onChange={(e) => updateTimeRange(day as keyof WeekSchedule, index, "end", e.target.value)}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                        />
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeTimeRange(day as keyof WeekSchedule, index)}>
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => addTimeRange(day as keyof WeekSchedule)} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Añadir rango horario
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}

