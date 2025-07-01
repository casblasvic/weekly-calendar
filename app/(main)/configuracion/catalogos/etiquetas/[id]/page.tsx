"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ColorPicker } from "@/components/ui/color-picker"
import { ArrowLeft, Save, Loader2 } from "lucide-react"
import { useAppointmentTags } from "@/contexts/appointment-tags-context"
import Link from "next/link"
import React from "react"

interface EditAppointmentTagPageProps {
  params: Promise<{
    id: string
  }>
}

export default function EditAppointmentTagPage({ params }: EditAppointmentTagPageProps) {
  const { id } = React.use(params)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { updateTag } = useAppointmentTags()
  const router = useRouter()
  
  // Cargar datos de la etiqueta desde la API
  useEffect(() => {
    const fetchTag = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/tags/${id}`)
        
        if (!response.ok) {
          throw new Error('Etiqueta no encontrada')
        }
        
        const tag = await response.json()
        setName(tag.name || "")
        setDescription(tag.description || "")
        setColor(tag.color || "#E040FB")
      } catch (err) {
        console.error('Error loading tag:', err)
        setError(err instanceof Error ? err.message : 'Error al cargar la etiqueta')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchTag()
  }, [id])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!name.trim()) {
      setError("El nombre de la etiqueta es obligatorio")
      return
    }
    
    try {
      setIsSubmitting(true)
      const result = await updateTag(id, { name, color, description })
      if (result) {
        router.push("/configuracion/catalogos/etiquetas")
      } else {
        setError("No se pudo actualizar la etiqueta")
      }
    } catch (err) {
      console.error("Error al actualizar la etiqueta:", err)
      setError("Ha ocurrido un error al actualizar la etiqueta")
    } finally {
      setIsSubmitting(false)
    }
  }
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-2xl">
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            <p className="text-gray-500">Cargando etiqueta...</p>
          </div>
        </div>
      </div>
    )
  }
  
  if (error && !name) {
    return (
      <div className="container mx-auto p-4 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Etiqueta no encontrada</h1>
          <Link href="/configuracion/catalogos/etiquetas">
            <Button variant="outline" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              Volver a etiquetas
            </Button>
          </Link>
        </div>
        <div className="bg-red-50 p-6 rounded-lg border border-red-200 text-red-600 flex flex-col items-center justify-center h-48">
          <p className="mb-4">No se pudo encontrar la etiqueta con ID: {id}</p>
          <Link href="/configuracion/catalogos/etiquetas">
            <Button variant="outline">Volver a la lista de etiquetas</Button>
          </Link>
        </div>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Editar Etiqueta</h1>
        <Link href="/configuracion/catalogos/etiquetas">
          <Button variant="outline" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </Link>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg border shadow-sm">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-base">Nombre de la etiqueta *</Label>
          <Input
            id="name"
            placeholder="Ej: Paciente en espera"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description" className="text-base">Descripción</Label>
          <Input
            id="description"
            placeholder="Descripción opcional"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="color" className="text-base">Color *</Label>
          <ColorPicker 
            color={color} 
            onChange={setColor} 
          />
          <p className="text-sm text-gray-500">
            Elige un color para identificar visualmente esta etiqueta.
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 p-3 rounded border border-red-200 text-red-600">
            {error}
          </div>
        )}
        
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/configuracion/catalogos/etiquetas")}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button 
            type="submit"
            className="bg-purple-600 hover:bg-purple-700 gap-2"
            disabled={isSubmitting}
          >
            <Save className="h-4 w-4" />
            {isSubmitting ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </div>
  )
}