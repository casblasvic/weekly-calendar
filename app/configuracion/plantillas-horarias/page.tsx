"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { PlusIcon, Trash2Icon, SearchIcon } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScheduleConfig } from "@/components/schedule-config"
import { useTemplates, type ScheduleTemplate } from "@/hooks/use-templates"
import { DEFAULT_SCHEDULE, type WeekSchedule } from "@/types/schedule"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function PlantillasHorariasPage() {
  const { templates, addTemplate, updateTemplate, deleteTemplate } = useTemplates()
  const [isAddingTemplate, setIsAddingTemplate] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ScheduleTemplate | null>(null)
  const [newTemplateName, setNewTemplateName] = useState("")
  const [newTemplateSchedule, setNewTemplateSchedule] = useState<WeekSchedule>(DEFAULT_SCHEDULE)

  const handleAddTemplate = () => {
    if (newTemplateName.trim() === "") return
    addTemplate({
      id: Date.now().toString(),
      description: newTemplateName,
      schedule: newTemplateSchedule,
    })
    setIsAddingTemplate(false)
    setNewTemplateName("")
    setNewTemplateSchedule(DEFAULT_SCHEDULE)
  }

  const handleEditTemplate = () => {
    if (!editingTemplate) return
    updateTemplate({
      ...editingTemplate,
      schedule: newTemplateSchedule,
    })
    setEditingTemplate(null)
  }

  const handleDeleteTemplate = (id: string) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar esta plantilla?")) {
      deleteTemplate(id)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Plantillas Horarias</h1>
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descripción</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>{template.description}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingTemplate(template)
                          setNewTemplateSchedule(template.schedule)
                        }}
                      >
                        <SearchIcon className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteTemplate(template.id)}>
                        <Trash2Icon className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Button className="mt-4" onClick={() => setIsAddingTemplate(true)}>
        <PlusIcon className="mr-2 h-4 w-4" /> Añadir Plantilla
      </Button>

      <Dialog open={isAddingTemplate} onOpenChange={setIsAddingTemplate}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sticky top-0 bg-background z-10 pb-4">
            <DialogTitle>Nueva Plantilla</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="templateName">Nombre de la plantilla</Label>
              <Input
                id="templateName"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="Introduce el nombre de la plantilla"
              />
            </div>
            <Card>
              <CardContent className="pt-6">
                <ScheduleConfig value={newTemplateSchedule} onChange={setNewTemplateSchedule} />
              </CardContent>
            </Card>
          </div>
          <DialogFooter className="sticky bottom-0 bg-background z-10 pt-4 mt-4">
            <Button variant="outline" onClick={() => setIsAddingTemplate(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddTemplate}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sticky top-0 bg-background z-10 pb-4">
            <DialogTitle>Editar Plantilla: {editingTemplate?.description}</DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <ScheduleConfig value={newTemplateSchedule} onChange={setNewTemplateSchedule} />
                </CardContent>
              </Card>
              <DialogFooter className="sticky bottom-0 bg-background z-10 pt-4 mt-4">
                <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleEditTemplate}>Guardar</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

