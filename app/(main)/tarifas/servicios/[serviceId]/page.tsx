"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useServicio, Servicio } from "@/contexts/servicios-context"
import { ImageUploader } from "@/components/image-uploader"
import { DeviceImage } from "@/contexts/equipment-context"
import { toast } from "sonner"

export default function ServicioPage() {
  const params = useParams()
  const router = useRouter()
  const serviceId = params.serviceId as string
  const isNew = serviceId === "new"
  
  const { 
    crearServicio, 
    getServicioById, 
    actualizarServicio, 
    setServicioActual 
  } = useServicio()
  
  const [servicio, setServicio] = useState<Partial<Servicio>>({
    nombre: "",
    codigo: "",
    tarifaId: "",
    tarifaBase: "",
    familiaId: "",
    precioConIVA: "",
    ivaId: "",
    colorAgenda: "#00BFFF",
    duracion: 30,
    equipoId: "",
    tipoComision: "",
    comision: "",
    requiereParametros: false,
    visitaValoracion: false,
    apareceEnApp: true,
    descuentosAutomaticos: true,
    descuentosManuales: true,
    aceptaPromociones: true,
    aceptaEdicionPVP: false,
    afectaEstadisticas: true,
    deshabilitado: false,
    precioCoste: "",
    tarifaPlanaId: "",
    archivoAyuda: null,
    consumos: []
  })
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [images, setImages] = useState<DeviceImage[]>([])
  
  // Cargar servicio al iniciar
  useEffect(() => {
    if (serviceId !== "new") {
      const existingService = getServicioById(serviceId)
      if (existingService) {
        setServicio(existingService)
      } else {
        toast.error("No se encontró el servicio")
        router.push("/tarifas/servicios")
      }
    }
    
    setIsLoading(false)
  }, [serviceId, getServicioById, router])
  
  // Manejar cambios en los campos
  const handleChange = (field: keyof Servicio, value: any) => {
    setServicio(prev => ({
      ...prev,
      [field]: value
    }))
  }
  
  // Manejar cambios en las imágenes
  const handleImagesChange = (updatedImages: DeviceImage[]) => {
    setImages(updatedImages)
  }
  
  // Guardar servicio
  const handleSave = async () => {
    setIsSaving(true)
    
    try {
      let id = serviceId
      
      if (isNew) {
        // Crear nuevo servicio
        id = crearServicio(servicio as Omit<Servicio, "id">)
        console.log(`Servicio creado con ID: ${id}`)
      } else {
        // Actualizar servicio existente
        actualizarServicio(serviceId, servicio)
        console.log(`Servicio ${serviceId} actualizado`)
      }
      
      // Establecer como servicio actual
      const updatedService = getServicioById(id)
      if (updatedService) {
        setServicioActual(updatedService)
      }
      
      toast.success(`Servicio ${isNew ? 'creado' : 'actualizado'} correctamente`)
      
      // Redirigir si es nuevo
      if (isNew) {
        router.push(`/tarifas/servicios/${id}`)
      }
    } catch (error) {
      console.error('Error al guardar servicio:', error)
      toast.error('Error al guardar servicio')
    } finally {
      setIsSaving(false)
    }
  }
  
  if (isLoading) {
    return (
      <div className="container p-6 mx-auto">
        <Card className="p-6">
          <p>Cargando datos del servicio...</p>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="container p-6 pb-24 mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          {isNew ? "Nuevo Servicio" : `Editar Servicio: ${servicio.nombre}`}
        </h1>
        <Button 
          onClick={() => router.push("/tarifas/servicios")}
          variant="outline"
        >
          Volver
        </Button>
      </div>
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Primera columna: Datos básicos */}
        <Card className="p-6 space-y-4 md:col-span-2">
          <h2 className="text-lg font-semibold">Información básica</h2>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre*</Label>
              <Input
                id="nombre"
                value={servicio.nombre || ""}
                onChange={(e) => handleChange("nombre", e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="codigo">Código*</Label>
              <Input
                id="codigo"
                value={servicio.codigo || ""}
                onChange={(e) => handleChange("codigo", e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="precioConIVA">Precio con IVA*</Label>
              <Input
                id="precioConIVA"
                type="number"
                value={servicio.precioConIVA || ""}
                onChange={(e) => handleChange("precioConIVA", e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="duracion">Duración (min)*</Label>
              <Input
                id="duracion"
                type="number"
                value={servicio.duracion || 30}
                onChange={(e) => handleChange("duracion", parseInt(e.target.value))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="colorAgenda">Color en agenda</Label>
              <div className="flex space-x-2">
                <Input
                  id="colorAgenda"
                  type="color"
                  value={servicio.colorAgenda || "#00BFFF"}
                  onChange={(e) => handleChange("colorAgenda", e.target.value)}
                  className="w-12"
                />
                <Input
                  value={servicio.colorAgenda || "#00BFFF"}
                  onChange={(e) => handleChange("colorAgenda", e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="deshabilitado"
                checked={servicio.deshabilitado || false}
                onChange={(e) => handleChange("deshabilitado", e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="deshabilitado">Deshabilitado</Label>
            </div>
          </div>
        </Card>
        
        {/* Segunda columna: Imágenes */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Imágenes del servicio</h2>
          
          <ImageUploader
            entityType="service"
            entityId={serviceId}
            clinicId="1" // Clínica por defecto
            onChange={handleImagesChange}
          />
        </Card>
      </div>
      
      {/* Botones de acción */}
      <div className="fixed bottom-0 left-0 right-0 px-6 py-4 bg-white border-t">
        <div className="container flex justify-end space-x-2 mx-auto">
          <Button 
            variant="outline" 
            onClick={() => router.push("/tarifas/servicios")}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  )
} 