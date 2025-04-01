"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Edit, Trash2, Plus, AlertCircle } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { AppointmentTag, useAppointmentTags } from "@/contexts/appointment-tags-context"
import { toast } from "sonner"

interface ColorOption {
  name: string
  value: string
}

const colorOptions: ColorOption[] = [
  { name: "Morado", value: "#E040FB" },
  { name: "Amarillo", value: "#FBC02D" },
  { name: "Rojo", value: "#EF5350" },
  { name: "Verde", value: "#66BB6A" },
  { name: "Azul", value: "#42A5F5" },
  { name: "Naranja", value: "#FF9800" },
  { name: "Rosa", value: "#EC407A" },
  { name: "Cian", value: "#26C6DA" },
  { name: "Indigo", value: "#5C6BC0" },
  { name: "Verde Lima", value: "#9CCC65" },
  { name: "Marrón", value: "#8D6E63" },
  { name: "Gris", value: "#78909C" },
]

type TagFormData = {
  name: string
  color: string
  description: string
}

export function AppointmentTagsManager() {
  const { tags, loading, createTag, updateTag, deleteTag, isTagUsed } = useAppointmentTags() || {
    tags: [],
    loading: false,
    createTag: async () => ({ id: "", name: "", color: "", isActive: false }),
    updateTag: async () => null,
    deleteTag: async () => false,
    isTagUsed: async () => false,
  }

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedTag, setSelectedTag] = useState<AppointmentTag | null>(null)
  const [formData, setFormData] = useState<TagFormData>({
    name: "",
    color: colorOptions[0].value,
    description: "",
  })
  const [tagInUse, setTagInUse] = useState(false)

  // Resetear formulario cuando se abre o cierra el diálogo
  useEffect(() => {
    if (isDialogOpen) {
      if (selectedTag) {
        setFormData({
          name: selectedTag.name,
          color: selectedTag.color,
          description: selectedTag.description || "",
        })
      } else {
        setFormData({
          name: "",
          color: colorOptions[0].value,
          description: "",
        })
      }
    }
  }, [isDialogOpen, selectedTag])

  // Abrir diálogo de creación
  const handleCreate = () => {
    setSelectedTag(null)
    setIsDialogOpen(true)
  }

  // Abrir diálogo de edición
  const handleEdit = (tag: AppointmentTag) => {
    setSelectedTag(tag)
    setIsDialogOpen(true)
  }

  // Abrir diálogo de confirmación de eliminación
  const handleDeleteClick = async (tag: AppointmentTag) => {
    setSelectedTag(tag)
    
    // Verificar si la etiqueta está en uso
    const used = await isTagUsed(tag.id)
    setTagInUse(used)
    
    setIsDeleteDialogOpen(true)
  }

  // Confirmar eliminación
  const confirmDelete = async () => {
    if (!selectedTag) return
    
    try {
      const success = await deleteTag(selectedTag.id)
      if (success) {
        toast.success(`Etiqueta "${selectedTag.name}" eliminada correctamente`)
      } else {
        toast.error("No se pudo eliminar la etiqueta")
      }
    } catch (error) {
      console.error("Error al eliminar etiqueta:", error)
      toast.error("Error al eliminar la etiqueta")
    } finally {
      setIsDeleteDialogOpen(false)
      setSelectedTag(null)
    }
  }

  // Manejar cambios en el formulario
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Seleccionar color
  const handleColorSelect = (color: string) => {
    setFormData((prev) => ({
      ...prev,
      color,
    }))
  }

  // Guardar etiqueta (crear o actualizar)
  const handleSave = async () => {
    try {
      if (!formData.name) {
        toast.error("El nombre de la etiqueta es obligatorio")
        return
      }

      if (selectedTag) {
        // Actualizar etiqueta existente
        const updated = await updateTag(selectedTag.id, {
          name: formData.name,
          color: formData.color,
          description: formData.description || undefined,
        })

        if (updated) {
          toast.success(`Etiqueta "${formData.name}" actualizada correctamente`)
        } else {
          toast.error("No se pudo actualizar la etiqueta")
        }
      } else {
        // Crear nueva etiqueta
        const newTag = await createTag({
          name: formData.name,
          color: formData.color,
          description: formData.description || undefined,
          isActive: true,
        })

        toast.success(`Etiqueta "${newTag.name}" creada correctamente`)
      }

      setIsDialogOpen(false)
    } catch (error) {
      console.error("Error al guardar etiqueta:", error)
      toast.error("Error al guardar la etiqueta")
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Etiquetas de Citas</CardTitle>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Crear Etiqueta
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin mr-2">⏳</div>
            <span>Cargando etiquetas...</span>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Color</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tags.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4 text-gray-500">
                    No hay etiquetas definidas
                  </TableCell>
                </TableRow>
              ) : (
                tags.map((tag) => (
                  <TableRow key={tag.id}>
                    <TableCell>
                      <div
                        className="w-6 h-6 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{tag.name}</TableCell>
                    <TableCell>{tag.description || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(tag)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500"
                          onClick={() => handleDeleteClick(tag)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Dialog de creación/edición */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedTag ? `Editar etiqueta: ${selectedTag.name}` : "Crear nueva etiqueta"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium">
                Nombre *
              </label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Ej: Confirmada"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Color</label>
              <div className="grid grid-cols-6 gap-2">
                {colorOptions.map((color) => (
                  <div
                    key={color.value}
                    className={`w-8 h-8 rounded-full cursor-pointer transition-all ${
                      formData.color === color.value
                        ? "ring-2 ring-offset-2 ring-black"
                        : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => handleColorSelect(color.value)}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <label htmlFor="description" className="text-sm font-medium">
                Descripción
              </label>
              <Input
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Descripción (opcional)"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación de eliminación */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {tagInUse ? (
              <div className="flex items-start gap-2 text-yellow-600 bg-yellow-50 p-3 rounded-md">
                <AlertCircle className="h-5 w-5 mt-0.5" />
                <div>
                  <p className="font-medium">La etiqueta está en uso</p>
                  <p className="text-sm">
                    Esta etiqueta se está utilizando en citas. Si continúa, la etiqueta se desactivará pero no se eliminará permanentemente.
                  </p>
                </div>
              </div>
            ) : (
              <p>
                ¿Está seguro de que desea eliminar la etiqueta "<strong>{selectedTag?.name}</strong>"?
                Esta acción no se puede deshacer.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              {tagInUse ? "Desactivar etiqueta" : "Eliminar etiqueta"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
} 