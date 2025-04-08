"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { PlusIcon, Trash2Icon, SearchIcon, ArrowLeft } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScheduleConfig } from "@/components/schedule-config"
import { useTemplates } from "@/hooks/use-templates"
import { ScheduleTemplate, ScheduleTemplateBlock, DayOfWeek as PrismaDayOfWeek } from "@prisma/client"
import type { Clinica } from '@/services/data/models/interfaces'
import { DEFAULT_SCHEDULE, type WeekSchedule } from "@/types/schedule"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { Skeleton } from "@/components/ui/skeleton"

// --- Helper function to convert blocks --- 
const convertBlocksToWeekSchedule = (
    blocks: ScheduleTemplateBlock[] | undefined | null,
    defaultOpenTime: string,
    defaultCloseTime: string
): WeekSchedule => {
    const initialSchedule: WeekSchedule = {
        monday: { isOpen: false, ranges: [] }, tuesday: { isOpen: false, ranges: [] },
        wednesday: { isOpen: false, ranges: [] }, thursday: { isOpen: false, ranges: [] },
        friday: { isOpen: false, ranges: [] }, saturday: { isOpen: false, ranges: [] },
        sunday: { isOpen: false, ranges: [] },
    };
    if (!blocks || blocks.length === 0) {
        // Optionally fill default Mon-Fri based on open/close times here if needed
        // Example:
        // Object.keys(initialSchedule).forEach(dayKey => { ... });
        return initialSchedule;
    }
    const weekSchedule = blocks.reduce((acc, block) => {
        const dayKey = block.dayOfWeek.toLowerCase() as keyof WeekSchedule;
        if (acc[dayKey]) {
            acc[dayKey].isOpen = true;
            acc[dayKey].ranges.push({ start: block.startTime, end: block.endTime });
            // Sort ranges within the day
            acc[dayKey].ranges.sort((a, b) => a.start.localeCompare(b.start));
        }
        return acc;
    }, initialSchedule);
    return weekSchedule;
};

// --- Helper function to convert WeekSchedule BACK to blocks ---
const convertWeekScheduleToBlocks = (
    schedule: WeekSchedule,
    templateId: string // Need template ID to associate blocks
): Omit<ScheduleTemplateBlock, 'id' | 'createdAt' | 'updatedAt'>[] => {
    const blocks: Omit<ScheduleTemplateBlock, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    const dayMap: Record<keyof WeekSchedule, PrismaDayOfWeek> = {
        monday: PrismaDayOfWeek.MONDAY,
        tuesday: PrismaDayOfWeek.TUESDAY,
        wednesday: PrismaDayOfWeek.WEDNESDAY,
        thursday: PrismaDayOfWeek.THURSDAY,
        friday: PrismaDayOfWeek.FRIDAY,
        saturday: PrismaDayOfWeek.SATURDAY,
        sunday: PrismaDayOfWeek.SUNDAY,
    };

    for (const dayKey in schedule) {
        const dayData = schedule[dayKey as keyof WeekSchedule];
        const prismaDay = dayMap[dayKey as keyof WeekSchedule];
        if (dayData.isOpen && prismaDay) {
            dayData.ranges.forEach(range => {
                blocks.push({
                    templateId: templateId, // Associate with the template
                    dayOfWeek: prismaDay,
                    startTime: range.start,
                    endTime: range.end,
                    isWorking: true,
                });
            });
        }
    }
    return blocks;
};

// --- Skeleton para la tabla de plantillas ---
const renderTemplateTableSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-8 w-1/4 mb-4" /> {/* Skeleton para el título */} 
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><Skeleton className="h-5 w-32" /></TableHead>
            <TableHead><Skeleton className="h-5 w-48" /></TableHead>
            <TableHead className="text-right"><Skeleton className="h-5 w-24" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 4 }).map((_, index) => (
            <TableRow key={`skeleton-${index}`}>
              <TableCell><Skeleton className="h-5 w-full" /></TableCell>
              <TableCell><Skeleton className="h-5 w-full" /></TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end space-x-2">
                  <Skeleton className="w-8 h-8 rounded-md" />
                  <Skeleton className="w-8 h-8 rounded-md" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </div>
);
// --- Fin Skeleton ---

export default function PlantillasHorariasPage() {
  const { templates, addTemplate, updateTemplate, deleteTemplate, loading: loadingTemplates } = useTemplates()
  const [isAddingTemplate, setIsAddingTemplate] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ScheduleTemplate & { blocks?: ScheduleTemplateBlock[] } | null>(null)
  const [currentTemplateName, setCurrentTemplateName] = useState("")
  const [currentTemplateDescription, setCurrentTemplateDescription] = useState("")
  const [currentSchedule, setCurrentSchedule] = useState<WeekSchedule>(DEFAULT_SCHEDULE)
  const [currentOpenTime, setCurrentOpenTime] = useState("09:00")
  const [currentCloseTime, setCurrentCloseTime] = useState("17:00")
  const [currentSlotDuration, setCurrentSlotDuration] = useState<number>(15);
  const [simulatedClinicForModal, setSimulatedClinicForModal] = useState<Partial<Clinica> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Opciones para el selector de slotDuration
  const slotDurationOptions = Array.from({ length: 12 }, (_, i) => (i + 1) * 5); // 5, 10, ..., 60

  useEffect(() => {
    if (editingTemplate) {
      console.log("Editing template data (with blocks?):", editingTemplate)
      setCurrentTemplateName(editingTemplate.name || "")
      setCurrentTemplateDescription(editingTemplate.description || "")
      const scheduleValue = convertBlocksToWeekSchedule(
          editingTemplate.blocks,
          editingTemplate.openTime || "00:00",
          editingTemplate.closeTime || "23:59"
      )
      setCurrentSchedule(scheduleValue)
      setCurrentOpenTime(editingTemplate.openTime || "00:00")
      setCurrentCloseTime(editingTemplate.closeTime || "23:59")
      const slotDuration = editingTemplate.slotDuration ?? 15;
      setCurrentSlotDuration(slotDuration);

      // --- SIMPLIFIED simulated clinic object --- 
      setSimulatedClinicForModal({
        id: editingTemplate.id, 
        name: editingTemplate.name || "",
        openTime: editingTemplate.openTime || "00:00",
        closeTime: editingTemplate.closeTime || "23:59",
        independentScheduleBlocks: (editingTemplate.blocks || []) as any, 
        linkedScheduleTemplateId: null, 
        slotDuration: slotDuration,
      });

    } else {
      setCurrentTemplateName("")
      setCurrentTemplateDescription("")
      setCurrentSchedule(DEFAULT_SCHEDULE)
      setCurrentOpenTime("09:00")
      setCurrentCloseTime("17:00")
      setCurrentSlotDuration(15);
      setSimulatedClinicForModal(null);
    }
  }, [editingTemplate])

  const handleOpenAddModal = () => {
    setEditingTemplate(null)
    setIsAddingTemplate(true)
  }

  const handleAddTemplate = () => {
    if (currentTemplateName.trim() === "") return
    const templateData = {
      name: currentTemplateName.trim(),
      description: currentTemplateDescription.trim(),
      schedule: currentSchedule,
      openTime: currentOpenTime,
      closeTime: currentCloseTime,
      slotDuration: currentSlotDuration,
    }
    console.log("Calling addTemplate with:", templateData)
    addTemplate(templateData as any)
    setIsAddingTemplate(false)
  }

  const handleOpenEditModal = (template: ScheduleTemplate & { blocks?: ScheduleTemplateBlock[] }) => {
    setEditingTemplate({ ...template, id: String(template.id) })
  }

  const handleEditTemplate = async () => {
    if (!editingTemplate || isSaving) return;
    setIsSaving(true);

    const updatedData = {
      name: currentTemplateName.trim(),
      description: currentTemplateDescription.trim(),
      schedule: currentSchedule, 
      openTime: currentOpenTime,
      closeTime: currentCloseTime,
      slotDuration: currentSlotDuration,
    };
    console.log(`Calling updateTemplate for ID ${editingTemplate.id} with:`, updatedData);
    
    try {
      // Llamar a updateTemplate y esperar resultado
      const result = await updateTemplate(editingTemplate.id, updatedData as any);

      if (result) {
        // Éxito
        toast({ 
          title: "Plantilla Actualizada", 
          description: `La plantilla "${result.name}" se guardó correctamente.`,
        });
        setEditingTemplate(null); // Cerrar modal solo si tiene éxito
      } else {
        // Error (manejado en el contexto, pero mostrar toast aquí)
        toast({ 
          title: "Error al Actualizar", 
          description: "No se pudo guardar la plantilla. Revisa la consola para más detalles.",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Error inesperado en la llamada (poco probable si el contexto lo maneja)
      console.error("Unexpected error in handleEditTemplate:", error);
      toast({ 
        title: "Error Inesperado", 
        description: "Ocurrió un error inesperado al guardar.",
        variant: "destructive",
      });
    } finally {
       setIsSaving(false); // <-- Finalizar estado de guardado
    }
  };

  const handleDeleteTemplate = (id: string | number) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar esta plantilla?")) {
      deleteTemplate(String(id))
    }
  }

  const handleTemplateDataChange = useCallback((updates: Record<string, any> | { schedule: WeekSchedule }) => {
      console.log("handleTemplateDataChange received:", updates)
      if ('schedule' in updates && typeof updates.schedule === 'object') {
          setCurrentSchedule(updates.schedule)
      } else if (typeof updates === 'object' && updates !== null) {
          console.warn("Received unexpected update structure in handleTemplateDataChange:", updates)
      }
  }, [])

  return (
    <div className="container px-0 pt-4 pb-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold mb-4">Plantillas Horarias</h1>
        <Button
          variant="outline"
          onClick={() => window.history.back()}
          className="px-4 py-2 text-sm text-gray-600 bg-white rounded-md shadow-md hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
      </div>

      {/* Condición para mostrar Skeleton o Tabla */} 
      {loadingTemplates ? (
        renderTemplateTableSkeleton()
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Horario General</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={String(template.id)} className="hover:bg-muted/50">
                    <TableCell>{template.name || '-'}</TableCell>
                    <TableCell>{template.description || '-'}</TableCell>
                    <TableCell>
                      {template.openTime || '--:--'} - {template.closeTime || '--:--'}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditModal(template as ScheduleTemplate & { blocks?: ScheduleTemplateBlock[] })}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <SearchIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTemplate(String(template.id))}
                          className="text-destructive hover:text-red-700"
                        >
                          <Trash2Icon className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!loadingTemplates && templates.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">No hay plantillas horarias definidas.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={isAddingTemplate || !!editingTemplate} onOpenChange={(open) => {
        setIsAddingTemplate(false);
        setEditingTemplate(null);
      }}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sticky top-0 bg-background z-10 pb-4">
            <DialogTitle>{isAddingTemplate ? "Nueva Plantilla Horaria" : "Editar Plantilla: " + (editingTemplate?.name || '...')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-2 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newTemplateName">Nombre</Label>
                <Input
                  id="newTemplateName"
                  value={currentTemplateName}
                  onChange={(e) => setCurrentTemplateName(e.target.value)}
                  placeholder="Ej: Horario Estándar Oficina"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newTemplateDescription">Descripción</Label>
                <Input
                  id="newTemplateDescription"
                  value={currentTemplateDescription}
                  onChange={(e) => setCurrentTemplateDescription(e.target.value)}
                  placeholder="Ej: L-V de 9 a 17h"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newOpenTime">Hora Apertura General</Label>
                <Input
                  id="newOpenTime"
                  type="time"
                  value={currentOpenTime}
                  onChange={(e) => setCurrentOpenTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newCloseTime">Hora Cierre General</Label>
                <Input
                  id="newCloseTime"
                  type="time"
                  value={currentCloseTime}
                  onChange={(e) => setCurrentCloseTime(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="newSlotDuration">Duración del Slot (minutos)</Label>
                <Select 
                    value={String(currentSlotDuration)} 
                    onValueChange={(value) => setCurrentSlotDuration(Number(value))}
                >
                    <SelectTrigger id="newSlotDuration">
                        <SelectValue placeholder="Seleccionar duración" />
                    </SelectTrigger>
                    <SelectContent>
                        {slotDurationOptions.map(duration => (
                            <SelectItem key={duration} value={String(duration)}>
                                {duration} minutos
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <Label>Horario Detallado por Día</Label>
            <Card>
              <CardContent className="pt-6">
                <ScheduleConfig 
                    clinic={{
                       id: 'new-template',
                       name: currentTemplateName,
                       openTime: currentOpenTime,
                       closeTime: currentCloseTime,
                       independentScheduleBlocks: [],
                       linkedScheduleTemplateId: null,
                       slotDuration: currentSlotDuration,
                    } as Clinica}
                    onChange={() => {}} 
                    isReadOnly={true}
                /> 
              </CardContent>
            </Card>
          </div>
          <DialogFooter className="sticky bottom-0 bg-background z-10 pt-4 mt-4 px-6">
            <Button variant="outline" onClick={() => setIsAddingTemplate(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddTemplate} disabled={!currentTemplateName.trim()}>Guardar Plantilla</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

