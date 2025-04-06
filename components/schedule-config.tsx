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
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
// Importar tipos necesarios del schema Prisma
import type { ScheduleTemplateBlock, ClinicScheduleBlock, DayOfWeek as PrismaDayOfWeek } from '@prisma/client'
// Importar Clinica si no está ya importada
import type { Clinica } from '@/services/data/models/interfaces'; 

export interface ScheduleConfigProps {
  clinic: Clinica | null;
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

// --- Función Helper para convertir bloques al formato WeekSchedule ---
const convertBlocksToWeekSchedule = (
    blocks: (ScheduleTemplateBlock | ClinicScheduleBlock)[] | undefined | null,
    defaultOpenTime: string,
    defaultCloseTime: string
): WeekSchedule => {
    const initialSchedule: WeekSchedule = {
        monday: { isOpen: false, ranges: [] },
        tuesday: { isOpen: false, ranges: [] },
        wednesday: { isOpen: false, ranges: [] },
        thursday: { isOpen: false, ranges: [] },
        friday: { isOpen: false, ranges: [] },
        saturday: { isOpen: false, ranges: [] },
        sunday: { isOpen: false, ranges: [] },
    };

    if (!blocks || blocks.length === 0) {
        // Si no hay bloques, podríamos devolver un horario por defecto basado en open/close generales
        // O el 24/7 como antes. Por ahora, mantengamos el cerrado por defecto.
        // Opcionalmente: rellenar L-V con open/close
        /*
        Object.keys(initialSchedule).forEach(dayKey => {
            if (dayKey !== 'saturday' && dayKey !== 'sunday') {
                initialSchedule[dayKey as keyof WeekSchedule] = {
                    isOpen: true,
                    ranges: [{ start: defaultOpenTime, end: defaultCloseTime }]
                };
            }
        });
        */
        return initialSchedule; 
    }

    const weekSchedule = blocks.reduce((acc, block) => {
        const dayKey = block.dayOfWeek.toLowerCase() as keyof WeekSchedule;
        if (acc[dayKey]) { // Asegurar que el día existe en nuestro objeto
            acc[dayKey].isOpen = true;
            acc[dayKey].ranges.push({ start: block.startTime, end: block.endTime });
            // Ordenar rangos por hora de inicio si hay múltiples
            acc[dayKey].ranges.sort((a, b) => a.start.localeCompare(b.start));
        }
        return acc;
    }, initialSchedule);

    return weekSchedule;
};
// --- Fin Función Helper ---

export function ScheduleConfig({ clinic, onChange, showTemplateSelector = false }: ScheduleConfigProps) {
  const { templates } = useTemplates()

  const [currentSchedule, setCurrentSchedule] = useState<WeekSchedule | null>(null);
  const [expandedDays, setExpandedDays] = React.useState<string[]>([])

  // *** useEffect ahora depende de la PROP 'clinic' ***
  useEffect(() => {
      const defaultEmptySchedule: WeekSchedule = {
          monday: { isOpen: false, ranges: [] }, tuesday: { isOpen: false, ranges: [] },
          wednesday: { isOpen: false, ranges: [] }, thursday: { isOpen: false, ranges: [] },
          friday: { isOpen: false, ranges: [] }, saturday: { isOpen: false, ranges: [] },
          sunday: { isOpen: false, ranges: [] },
      };
      
      if (!clinic) {
          console.log("[ScheduleConfig] No clinic prop provided, setting empty schedule.");
          setCurrentSchedule(defaultEmptySchedule);
          setExpandedDays([]); 
          return;
      }

      console.log("[ScheduleConfig useEffect] Checking clinic prop:", JSON.stringify(clinic, null, 2));

      console.log("[ScheduleConfig] Clinic prop updated, deriving schedule...");
      let derivedSchedule: WeekSchedule;
      const defaultOpen = clinic.openTime || "00:00";
      const defaultClose = clinic.closeTime || "23:59";

      // --- Leer bloques desde la PROP clinic --- 
      const templateBlocks = clinic.linkedScheduleTemplate?.blocks; 
      const independentBlocks = clinic.independentScheduleBlocks;
      
      console.log(`[ScheduleConfig useEffect] Found templateBlocks: ${templateBlocks ? templateBlocks.length : 'null or empty'}`);
      console.log(`[ScheduleConfig useEffect] Found independentBlocks: ${independentBlocks ? independentBlocks.length : 'null or empty'}`);
      
      if (templateBlocks && templateBlocks.length > 0) {
          console.log("[ScheduleConfig] Using blocks from LINKED template (from prop).");
          derivedSchedule = convertBlocksToWeekSchedule(templateBlocks, defaultOpen, defaultClose);
      } else if (independentBlocks && independentBlocks.length > 0) {
          console.log("[ScheduleConfig] Using INDEPENDENT blocks (from prop).");
          derivedSchedule = convertBlocksToWeekSchedule(independentBlocks, defaultOpen, defaultClose);
      } else {
          console.log(`[ScheduleConfig] No blocks found in prop, using default schedule based on open/close times: ${defaultOpen} - ${defaultClose}`);
           derivedSchedule = convertBlocksToWeekSchedule(null, defaultOpen, defaultClose); 
           Object.keys(derivedSchedule).forEach(dayKey => {
                if (dayKey !== 'saturday' && dayKey !== 'sunday') {
                    derivedSchedule[dayKey as keyof WeekSchedule] = {
                        isOpen: true,
                        ranges: [{ start: defaultOpen, end: defaultClose }]
                    };
                }
            });
      }

      console.log("[ScheduleConfig] Derived schedule being set (from prop):", JSON.stringify(derivedSchedule, null, 2)); 
      setCurrentSchedule(derivedSchedule); 

      // Expandir días basados en el horario derivado
      const openDays = Object.entries(derivedSchedule)
          .filter(([_, daySchedule]) => daySchedule.isOpen)
          .map(([dayKey]) => dayKey);
      setExpandedDays(openDays);

  }, [clinic]); // Ya no depende de initialValueFromProp

  const toggleDay = (day: string) => {
    setExpandedDays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day]))
  }

  // ESTA FUNCIÓN AHORA ACTUALIZA 'currentSchedule' y llama a 'onChange'
  const updateDaySchedule = (day: keyof WeekSchedule, schedule: DaySchedule) => {
    const updatedSchedule = {
      ...currentSchedule, // Usar currentSchedule como base
      [day]: schedule,
    }
    setCurrentSchedule(updatedSchedule); // Actualizar estado interno
    onChange(updatedSchedule); // Notificar al padre del cambio

    // Notificar a la agenda que la configuración ha cambiado
    if (typeof window !== "undefined" && (window as any).notifyClinicConfigUpdated) {
      ;(window as any).notifyClinicConfigUpdated()
    }
  }

  const copySchedule = (fromDay: keyof WeekSchedule, toDay: keyof WeekSchedule) => {
    const scheduleToCopy = currentSchedule[fromDay]; // Copiar desde el estado actual
    const updatedSchedule = {
        ...currentSchedule,
        [toDay]: { ...scheduleToCopy }
    }
    setCurrentSchedule(updatedSchedule); // Actualizar estado interno
    onChange(updatedSchedule); // Notificar al padre
  }

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId)
    if (template && template.schedule) { // Asumiendo que la plantilla tiene un campo 'schedule' con formato WeekSchedule
        // O si la plantilla tiene .blocks, convertirla
        // const scheduleFromTemplate = convertBlocksToWeekSchedule(template.blocks, activeClinic?.openTime ?? "00:00", activeClinic?.closeTime ?? "23:59");
        // setCurrentSchedule(scheduleFromTemplate);
        // onChange(scheduleFromTemplate);
        
        // --- Si template.schedule ya tiene formato WeekSchedule --- 
        setCurrentSchedule(template.schedule); 
        onChange(template.schedule); 
        // --- FIN --- 
    }
  }

  const updateTimeRange = (day: keyof WeekSchedule, index: number, field: "start" | "end", newValue: string) => {
    const currentOpenTime = clinic?.openTime ?? "00:00";
    const currentCloseTime = clinic?.closeTime ?? "23:59";
    
    if (field === "start" && newValue < currentOpenTime) {
      newValue = currentOpenTime
    }
    if (field === "end" && newValue > currentCloseTime) {
      newValue = currentCloseTime
    }

    const daySchedule = currentSchedule[day];
    if (!daySchedule) return;

    const updatedRanges = [...daySchedule.ranges]
    updatedRanges[index] = { ...updatedRanges[index], [field]: newValue }
    updateDaySchedule(day, { ...daySchedule, ranges: updatedRanges })
  }

  const removeTimeRange = (day: keyof WeekSchedule, index: number) => {
    const daySchedule = currentSchedule[day];
    if (!daySchedule) return;
    const updatedRanges = daySchedule.ranges.filter((_, i) => i !== index)
    updateDaySchedule(day, { ...daySchedule, ranges: updatedRanges })
  }

  const addTimeRange = (day: keyof WeekSchedule) => {
    const daySchedule = currentSchedule[day];
    if (!daySchedule) return;
    const newRange: TimeRange = {
      start: clinic?.openTime ?? "00:00",
      end: clinic?.closeTime ?? "23:59",
    }
    updateDaySchedule(day, { ...daySchedule, ranges: [...daySchedule.ranges, newRange] })
  }

  // En el renderizado, añadir comprobación por si currentSchedule es null inicialmente
  if (!currentSchedule) {
      // Mostrar un loader o un mensaje mientras se carga el horario
      return <div>Cargando horario...</div>; 
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
                <SelectItem key={String(template.id)} value={String(template.id)}>
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
                  checked={currentSchedule[day as keyof WeekSchedule]?.isOpen || false}
                  onCheckedChange={(checked) => {
                    const dayKey = day as keyof WeekSchedule;
                    const currentDaySchedule = currentSchedule[dayKey] || { ranges: [] };
                    updateDaySchedule(dayKey, {
                      ...currentDaySchedule,
                      isOpen: checked as boolean,
                      ranges: checked
                        ? (currentDaySchedule.ranges?.length
                          ? currentDaySchedule.ranges
                          : [{ start: clinic?.openTime ?? "00:00", end: clinic?.closeTime ?? "23:59" }])
                        : [],
                    })
                  }}
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

            {expandedDays.includes(day) && currentSchedule[day as keyof WeekSchedule]?.isOpen && (
              <div className="mt-4 space-y-4">
                {currentSchedule[day as keyof WeekSchedule].ranges.map((range, index) => (
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

