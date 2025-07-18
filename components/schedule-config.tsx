"use client"

import * as React from "react"
import { Clock, Plus, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { WeekSchedule, DaySchedule, TimeRange } from "@/types/schedule"
import { useTemplates } from "@/hooks/use-templates"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
// Importar tipos necesarios del schema Prisma
import type { ScheduleTemplateBlock, ClinicScheduleBlock, DayOfWeek as PrismaDayOfWeek, Clinic } from '@prisma/client'

export interface ScheduleConfigProps {
  clinic: Clinic | null;
  onChange: (newSchedule: WeekSchedule) => void;
  showTemplateSelector?: boolean;
  isReadOnly?: boolean;
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

export function ScheduleConfig({ clinic, onChange, showTemplateSelector = false, isReadOnly = false }: ScheduleConfigProps) {
  // Datos de ejemplo para la tabla de excepciones (solo para diseño)
  const { templates, loading: isLoadingTemplates } = useTemplates()

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
      // Usar aserciones de tipo para acceder a campos potencialmente no incluidos
      const defaultOpen = (clinic as any)?.openTime || "00:00"; 
      const defaultClose = (clinic as any)?.closeTime || "23:59";

      // --- Leer bloques desde la PROP clinic --- 
      // Usar aserciones de tipo para acceder a relaciones potencialmente no incluidas
      const templateBlocks = (clinic as any)?.linkedScheduleTemplate?.blocks; 
      const independentBlocks = (clinic as any)?.independentScheduleBlocks;
      
      console.log(`[ScheduleConfig useEffect] Found templateBlocks: ${templateBlocks ? templateBlocks.length : 'null or empty'}`);
      console.log(`[ScheduleConfig useEffect] Found independentBlocks: ${independentBlocks ? independentBlocks.length : 'null or empty'}`);
      
      if (templateBlocks && templateBlocks.length > 0) {
          console.log("[ScheduleConfig] Using blocks from LINKED template (from prop).");
          derivedSchedule = convertBlocksToWeekSchedule(templateBlocks, defaultOpen, defaultClose);
      } else if (independentBlocks && independentBlocks.length > 0) {
          console.log("[ScheduleConfig] Using INDEPENDENT blocks (from prop).");
          derivedSchedule = convertBlocksToWeekSchedule(independentBlocks, defaultOpen, defaultClose);
      } else {
          console.log(`[ScheduleConfig] No blocks found in prop, using default CLOSED schedule.`);
           // <<< MODIFICACIÓN: Llamar a convertBlocksToWeekSchedule con null y DEFAULTS FIJOS >>>
           // Esto devolverá un horario completamente cerrado.
           derivedSchedule = convertBlocksToWeekSchedule(null, "09:00", "17:00"); 
           // <<< ELIMINAR BUCLE QUE FORZABA L-V ABIERTO CON TIEMPOS POTENCIALMENTE INVÁLIDOS >>>
           /*
           Object.keys(derivedSchedule).forEach(dayKey => {
                if (dayKey !== 'saturday' && dayKey !== 'sunday') {
                    derivedSchedule[dayKey as keyof WeekSchedule] = {
                        isOpen: true,
                        ranges: [{ start: defaultOpen, end: defaultClose }]
                    };
                }
            });
           */
      }

      console.log("[ScheduleConfig] Derived schedule being set (from prop):", JSON.stringify(derivedSchedule, null, 2)); 
      setCurrentSchedule(derivedSchedule); 

      // Expandir días basados en el horario derivado
      const openDays = Object.entries(derivedSchedule)
          .filter(([_, daySchedule]) => daySchedule.isOpen)
          .map(([dayKey]) => dayKey);
      setExpandedDays(openDays);

  }, [clinic?.id, clinic?.linkedScheduleTemplateId]); 

  const toggleDay = (day: string) => {
    setExpandedDays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day]))
  }

  // ESTA FUNCIÓN AHORA ACTUALIZA 'currentSchedule' y llama a 'onChange'
  const updateDaySchedule = (day: keyof WeekSchedule, schedule: DaySchedule) => {
    // --- BEGIN LOGS ---
    console.log(`[ScheduleConfig updateDaySchedule] Called with: day=${day}, schedule=`, JSON.stringify(schedule));
    // --- END LOGS ---
    const updatedSchedule = {
      ...(currentSchedule ?? {}), // Usar currentSchedule como base, manejar null inicial
      [day]: schedule,
    } as WeekSchedule; // Asegurar el tipo
    
    // --- BEGIN LOGS ---
    console.log("[ScheduleConfig updateDaySchedule] Calculated updatedSchedule:", JSON.stringify(updatedSchedule));
    console.log("[ScheduleConfig updateDaySchedule] Calling setCurrentSchedule...");
    // --- END LOGS ---
    setCurrentSchedule(updatedSchedule); // Actualizar estado interno <<-- PUNTO CLAVE 1
    
    // --- BEGIN LOGS ---
    console.log("[ScheduleConfig updateDaySchedule] State potentially updated. Calling PARENT onChange...");
    // --- END LOGS ---
    onChange(updatedSchedule); 
    // --- FIN CAMBIO ---

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
    // <<< COMENTAR LÓGICA OBSOLETA: Las plantillas no tienen .schedule directamente >>>

  if (isLoadingTemplates) {
    return <div>Cargando plantillas...</div>;
  }

  // Eliminada la comprobación de templatesError aquí

  if (!currentSchedule) {
    return <div>Cargando configuración de horario...</div>; // O un spinner/placeholder más elegante
  }

  return (
    <div className="space-y-6">
      {showTemplateSelector && (
        <div className="space-y-2">
          <Label>Seleccionar plantilla</Label>
          <Select
            value={clinic?.linkedScheduleTemplateId || ""} // Usar el ID de la plantilla vinculada desde la prop clinic
            onValueChange={handleTemplateChange}
            disabled={isReadOnly || isLoadingTemplates}
          >
            <SelectTrigger>
              <SelectValue placeholder={isLoadingTemplates ? "Cargando plantillas..." : "Seleccionar plantilla"} />
            </SelectTrigger>
            <SelectContent>
              {templates?.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {clinic?.linkedScheduleTemplateId && (
            <p className="mt-1 text-xs text-muted-foreground">
              Actualmente usando la plantilla: {templates.find(t => t.id === clinic.linkedScheduleTemplateId)?.name || 'Desconocida'}.
              Los cambios directos al horario general se guardarán como horario individual y desvincularán la plantilla.
            </p>
          )}
        </div>
      )}

      {Object.entries(DAYS).map(([dayKey, dayName]) => {
        const daySchedule = currentSchedule[dayKey as keyof WeekSchedule]
        if (!daySchedule) return null // Manejo por si currentSchedule no está completamente inicializado

        return (
          <Card key={dayKey} className="overflow-hidden">
            <div className="flex items-center justify-between p-4 cursor-pointer bg-gray-50 hover:bg-gray-100">
              <div className="flex items-center space-x-3">
                {!isReadOnly && (
                  <Checkbox
                    id={`cb-${dayKey}`}
                    checked={daySchedule.isOpen}
                    onCheckedChange={(checked) => {
                      const newDaySchedule = { ...daySchedule, isOpen: !!checked };
                      if (!!checked && newDaySchedule.ranges.length === 0) {
                        // Si se marca como abierto y no hay rangos, añadir uno por defecto
                        newDaySchedule.ranges.push({ start: "09:00", end: "17:00" });
                      }
                      updateDaySchedule(dayKey as keyof WeekSchedule, newDaySchedule);
                    }}
                    // Deshabilitar si es read-only
                    disabled={isReadOnly}
                    className="mr-3"
                  />
                )}
                <Label htmlFor={`cb-${dayKey}`} className="text-lg font-semibold capitalize cursor-pointer">
                  {dayName}
                </Label>
              </div>
              <div className="flex flex-wrap items-center w-full gap-2 sm:w-auto">
                <Button variant="ghost" size="sm" className="flex-shrink-0" disabled={isReadOnly}>
                  {expandedDays.includes(dayKey) ? "Ocultar" : "Mostrar"}
                </Button>
                <Select
                  value=""
                  onValueChange={(copyFrom) => {
                    if (copyFrom) {
                      copySchedule(copyFrom as keyof WeekSchedule, dayKey as keyof WeekSchedule)
                    }
                  }}
                  disabled={isReadOnly}
                >
                  <SelectTrigger className="w-full sm:w-[130px]" disabled={isReadOnly}>
                    <SelectValue placeholder="Copiar de..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DAYS).map(
                      ([key, label]) =>
                        key !== dayKey && (
                          <SelectItem key={key} value={key} disabled={isReadOnly}>
                            {label}
                          </SelectItem>
                        ),
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {expandedDays.includes(dayKey) && daySchedule.isOpen && (
              <div className="p-4 space-y-3 border-t">
                {daySchedule?.ranges.map((range, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      type="time"
                      value={range.start}
                      onChange={(e) => {
                        const newRanges = [...daySchedule.ranges]
                        newRanges[index] = { ...newRanges[index], start: e.target.value }
                        updateDaySchedule(dayKey as keyof WeekSchedule, { ...daySchedule, ranges: newRanges })
                      }}
                      className="w-32"
                      // Deshabilitar si es read-only
                      disabled={isReadOnly} 
                    />
                    <span>-</span>
                    <Input
                      type="time"
                      value={range.end}
                      onChange={(e) => {
                        const newRanges = [...daySchedule.ranges]
                        newRanges[index] = { ...newRanges[index], end: e.target.value }
                        updateDaySchedule(dayKey as keyof WeekSchedule, { ...daySchedule, ranges: newRanges })
                      }}
                      className="w-32"
                      // Deshabilitar si es read-only
                      disabled={isReadOnly} 
                    />
                    {!isReadOnly && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const newRanges = daySchedule.ranges.filter((_, i) => i !== index)
                          updateDaySchedule(dayKey as keyof WeekSchedule, { ...daySchedule, ranges: newRanges })
                        }}
                        disabled={isReadOnly} 
                      >
                        <Trash className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
                {!isReadOnly && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newRanges = [...daySchedule.ranges, { start: "09:00", end: "17:00" }]
                      updateDaySchedule(dayKey as keyof WeekSchedule, { ...daySchedule, ranges: newRanges })
                    }}
                    className="mt-2"
                    disabled={isReadOnly} 
                  >
                    <Plus className="w-4 h-4 mr-2" /> Añadir Rango
                  </Button>
                )}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
  // <<< COMENTAR LÓGICA OBSOLETA: Las plantillas no tienen .schedule directamente >>>
    /*
    if (template && template.schedule) { // Asumiendo que la plantilla tiene un campo 'schedule' con formato WeekSchedule
        // O si la plantilla tiene .blocks, convertirla
        // const scheduleFromTemplate = convertBlocksToWeekSchedule(template.blocks, activeClinic?.openTime ?? "00:00", activeClinic?.closeTime ?? "23:59");
        // setCurrentSchedule(scheduleFromTemplate);
        // onChange(scheduleFromTemplate);
    }
    */
    // Si se habilita showTemplateSelector, aquí debería ir la lógica para 
    // convertir template.blocks y llamar a onChange.
    // Por ahora, esta función no hará nada si se llama desde el selector interno (si existiera).
    console.warn("[ScheduleConfig] handleTemplateChange called, but internal logic is commented out/incomplete.");
  }

  const updateTimeRange = (day: keyof WeekSchedule, index: number, field: "start" | "end", newValue: string) => {
    // --- BEGIN LOGS ---
    console.log(`[ScheduleConfig updateTimeRange] Called with: day=${day}, index=${index}, field=${field}, newValue=${newValue}`);
    console.log('[ScheduleConfig updateTimeRange] currentSchedule BEFORE update:', JSON.stringify(currentSchedule));
    // --- END LOGS ---

    const daySchedule = currentSchedule?.[day];
    if (!daySchedule) {
        // --- BEGIN LOGS ---
        console.error(`[ScheduleConfig updateTimeRange] ERROR: daySchedule for ${day} is null or undefined. Exiting.`);
        // --- END LOGS ---
        return;
    }

    const updatedRanges = [...daySchedule.ranges]
    // --- BEGIN LOGS ---
    console.log('[ScheduleConfig updateTimeRange] current daySchedule.ranges:', JSON.stringify(daySchedule.ranges));
    // --- END LOGS ---
    if (index < 0 || index >= updatedRanges.length) {
        // --- BEGIN LOGS ---
        console.error(`[ScheduleConfig updateTimeRange] ERROR: Invalid index ${index} for ranges length ${updatedRanges.length}. Exiting.`);
        // --- END LOGS ---
        return;
    }
    updatedRanges[index] = { ...updatedRanges[index], [field]: newValue }
    // --- BEGIN LOGS ---
    console.log('[ScheduleConfig updateTimeRange] updatedRanges calculated:', JSON.stringify(updatedRanges));
    console.log('[ScheduleConfig updateTimeRange] Calling updateDaySchedule...');
    // --- END LOGS ---
    
    // <<< NUEVO LOG para verificar el objeto actualizado >>>
    console.log(`[ScheduleConfig updateTimeRange] updatedRanges[${index}] AFTER update:`, JSON.stringify(updatedRanges[index]));
    
    updateDaySchedule(day, { ...daySchedule, ranges: updatedRanges })
  }

  const removeTimeRange = (day: keyof WeekSchedule, index: number) => {
    const daySchedule = currentSchedule?.[day];
    if (!daySchedule) return;
    const updatedRanges = daySchedule.ranges.filter((_, i) => i !== index)
    updateDaySchedule(day, { ...daySchedule, ranges: updatedRanges })
  }

  const addTimeRange = (day: keyof WeekSchedule) => {
    const daySchedule = currentSchedule?.[day];
    if (!daySchedule) return;

    // Determinar hora de inicio por defecto (ej: fin de la última franja + 15 min, o 09:00)
    let defaultStartTime = "09:00";
    if (daySchedule.ranges.length > 0) {
        const lastEndTime = daySchedule.ranges[daySchedule.ranges.length - 1].end;
        // Lógica simple para añadir 1 hora (mejorar si es necesario)
        try {
           const [hour, minute] = lastEndTime.split(':').map(Number);
           let nextHour = hour + 1;
           if (nextHour < 24) { // Evitar pasar de medianoche
               defaultStartTime = `${String(nextHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
           }
        } catch (e) { /* usar 09:00 si falla */ }
    }

    // Hora de fin por defecto (ej: 1 hora después del inicio)
    let defaultEndTime = "10:00";
    try {
       const [startH, startM] = defaultStartTime.split(':').map(Number);
       let endHour = startH + 1;
       if (endHour < 24) {
           defaultEndTime = `${String(endHour).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;
       }
    } catch(e) { /* usar 10:00 si falla */ }
    
    // Asegurarse de que end > start
    if (defaultEndTime <= defaultStartTime) defaultEndTime = defaultStartTime; // O manejar mejor el error

    const newRange: TimeRange = { start: defaultStartTime, end: defaultEndTime };
    const updatedRanges = [...daySchedule.ranges, newRange];
    // Opcional: ordenar rangos después de añadir
    updatedRanges.sort((a, b) => a.start.localeCompare(b.start));

    updateDaySchedule(day, { ...daySchedule, ranges: updatedRanges });
  }

  // En el renderizado, añadir comprobación por si currentSchedule es null inicialmente
  if (!currentSchedule) {
      // Mostrar un loader o un mensaje mientras se carga el horario
      return <div>Cargando horario...</div>; 
  }

  return (
    <div className={`space-y-4 ${isReadOnly ? 'opacity-70 pointer-events-none' : ''}`}>
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {Object.entries(DAYS).map(([dayKey, dayName]) => {
          const daySchedule = currentSchedule[dayKey as keyof WeekSchedule];
          const isExpanded = expandedDays.includes(dayKey);
          // Asegurar que daySchedule existe antes de acceder a isOpen
          const isOpen = daySchedule?.isOpen ?? false; 

          return (
            <Card key={dayKey} className="overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer bg-gray-50 hover:bg-gray-100"
                onClick={() => toggleDay(dayKey)}
              >
                <div className="flex items-center">
                  <Checkbox
                    id={`cb-${dayKey}`}
                    checked={isOpen}
                    onCheckedChange={(checked) => {
                      // Solo permitir cambio si NO es read-only
                      if (!isReadOnly) {
                         updateDaySchedule(dayKey as keyof WeekSchedule, { ...(daySchedule ?? { ranges: [] }), isOpen: !!checked });
                      }
                    }}
                    // Deshabilitar si es read-only
                    disabled={isReadOnly}
                    className="mr-3"
                  />
                  <Label htmlFor={`cb-${dayKey}`} className="font-medium">
                    {dayName}
                  </Label>
                </div>
                <div className="flex flex-wrap items-center w-full gap-2 sm:w-auto">
                  <Button variant="ghost" size="sm" className="flex-shrink-0" disabled={isReadOnly}>
                    {isExpanded ? "Ocultar" : "Mostrar"}
                  </Button>
                  <Select
                    value=""
                    onValueChange={(copyFrom) => {
                      if (copyFrom) {
                        copySchedule(copyFrom as keyof WeekSchedule, dayKey as keyof WeekSchedule)
                      }
                    }}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger className="w-full sm:w-[130px]" disabled={isReadOnly}>
                      <SelectValue placeholder="Copiar de..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DAYS).map(
                        ([key, label]) =>
                          key !== dayKey && (
                            <SelectItem key={key} value={key} disabled={isReadOnly}>
                              {label}
                            </SelectItem>
                          ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isExpanded && isOpen && (
                <div className="p-4 space-y-3 border-t">
                  {daySchedule?.ranges.map((range, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        type="time"
                        value={range.start}
                        onChange={(e) => updateTimeRange(dayKey as keyof WeekSchedule, index, "start", e.target.value)}
                        className="w-32"
                        // Deshabilitar si es read-only
                        disabled={isReadOnly} 
                      />
                      <span>-</span>
                      <Input
                        type="time"
                        value={range.end}
                        onChange={(e) => updateTimeRange(dayKey as keyof WeekSchedule, index, "end", e.target.value)}
                        className="w-32"
                        // Deshabilitar si es read-only
                        disabled={isReadOnly}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTimeRange(dayKey as keyof WeekSchedule, index);
                        }}
                        className="text-red-500 hover:text-red-700"
                        // Deshabilitar si es read-only
                        disabled={isReadOnly}
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      addTimeRange(dayKey as keyof WeekSchedule);
                    }}
                    // Deshabilitar si es read-only
                    disabled={isReadOnly}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Añadir franja
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  )
}

