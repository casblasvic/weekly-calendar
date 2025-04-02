"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Pencil, Trash2, ChevronDown } from "lucide-react"
import { useTarif } from "@/contexts/tarif-context"
import { useIVA } from "@/contexts/iva-context"
import { TipoIVA } from "@/services/data/models/interfaces"
import { toast } from "@/components/ui/use-toast"

interface PageParams {
  id: string;
  [key: string]: string | string[];
}

export default function TiposIVA() {
  const router = useRouter()
  const params = useParams<PageParams>()
  const tarifaId = String(params?.id || "")
  
  const { getTarifaById } = useTarif()
  const { tiposIVA, addTipoIVA, updateTipoIVA, deleteTipoIVA, getTiposIVAByTarifaId } = useIVA()
  
  // Estados para la tarifa y los tipos de IVA
  const [tarifa, setTarifa] = useState<any>(null)
  const [tiposIVATarifa, setTiposIVATarifa] = useState<TipoIVA[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [isNewIVAOpen, setIsNewIVAOpen] = useState(false)
  const [isEditIVAOpen, setIsEditIVAOpen] = useState(false)
  const [currentIVA, setCurrentIVA] = useState({ id: "", descripcion: "", porcentaje: 0 })
  const [nuevoIVA, setNuevoIVA] = useState({ descripcion: "", porcentaje: 0 })
  const [isSaving, setIsSaving] = useState(false)
  
  // Cargar la tarifa
  useEffect(() => {
    const loadTarifa = async () => {
      try {
        const tarifaData = await getTarifaById(tarifaId)
        setTarifa(tarifaData)
      } catch (error) {
        console.error("Error al cargar la tarifa:", error)
        toast({
          title: "Error",
          description: "No se pudo cargar la información de la tarifa",
          variant: "destructive",
        })
      }
    }
    
    loadTarifa()
  }, [tarifaId, getTarifaById])

  // Cargar los tipos de IVA para esta tarifa
  useEffect(() => {
    const loadTiposIVA = async () => {
      try {
        setIsLoading(true)
        console.log("Cargando tipos de IVA para tarifa:", tarifaId)
        const data = await getTiposIVAByTarifaId(tarifaId)
        setTiposIVATarifa(data || [])
        console.log("Tipos de IVA cargados:", data?.length || 0)
      } catch (error) {
        console.error("Error al cargar tipos de IVA:", error)
        setTiposIVATarifa([]) // Asegurar que siempre sea un array
        toast({
          title: "Error",
          description: "No se pudieron cargar los tipos de IVA",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    loadTiposIVA()
  }, [tarifaId, getTiposIVAByTarifaId])

  if (!tarifa) {
    return <div className="p-6">Cargando información de la tarifa...</div>
  }

  // Manejar creación de nuevo IVA
  const handleCrearIVA = async () => {
    try {
      setIsSaving(true)
      
      // Añadir el nuevo tipo de IVA
      await addTipoIVA({
        descripcion: nuevoIVA.descripcion,
        porcentaje: nuevoIVA.porcentaje,
        tarifaId: tarifaId
      })
      
      // Recargar la lista de tipos de IVA
      const tiposActualizados = await getTiposIVAByTarifaId(tarifaId)
      setTiposIVATarifa(tiposActualizados || [])
      
      // Restablecer el formulario y cerrar el modal
      setNuevoIVA({ descripcion: "", porcentaje: 0 })
      setIsNewIVAOpen(false)
      
      // Mostrar notificación de éxito
      toast({
        title: "Tipo de IVA creado",
        description: "El nuevo tipo de IVA se ha creado correctamente",
      })
    } catch (error) {
      console.error("Error al crear tipo de IVA:", error)
      toast({
        title: "Error",
        description: "No se pudo crear el tipo de IVA",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Manejar actualización de IVA
  const handleActualizarIVA = async () => {
    try {
      setIsSaving(true)
      
      // Actualizar el tipo de IVA
      await updateTipoIVA(String(currentIVA.id), {
        descripcion: currentIVA.descripcion,
        porcentaje: currentIVA.porcentaje
      })
      
      // Recargar la lista de tipos de IVA
      const tiposActualizados = await getTiposIVAByTarifaId(tarifaId)
      setTiposIVATarifa(tiposActualizados || [])
      
      // Cerrar el modal
      setIsEditIVAOpen(false)
      
      // Mostrar notificación de éxito
      toast({
        title: "Tipo de IVA actualizado",
        description: "El tipo de IVA se ha actualizado correctamente",
      })
    } catch (error) {
      console.error("Error al actualizar tipo de IVA:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el tipo de IVA",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Manejar edición de IVA
  const handleEditarIVA = (id: string) => {
    const tipoIVA = tiposIVATarifa.find(tipo => String(tipo.id) === id)
    if (tipoIVA) {
      setCurrentIVA({
        id: String(tipoIVA.id),
        descripcion: tipoIVA.descripcion,
        porcentaje: tipoIVA.porcentaje
      })
      setIsEditIVAOpen(true)
    } else {
      toast({
        title: "Error",
        description: "No se encontró el tipo de IVA para editar",
        variant: "destructive",
      })
    }
  }

  // Manejar eliminación de IVA
  const handleEliminarIVA = async (id: string) => {
    if (window.confirm("¿Está seguro de eliminar este tipo de IVA?")) {
      try {
        await deleteTipoIVA(String(id))
        
        // Recargar la lista de tipos de IVA
        const tiposActualizados = await getTiposIVAByTarifaId(tarifaId)
        setTiposIVATarifa(tiposActualizados || [])
        
        // Mostrar notificación de éxito
        toast({
          title: "Tipo de IVA eliminado",
          description: "El tipo de IVA se ha eliminado correctamente",
        })
      } catch (error) {
        console.error("Error al eliminar tipo de IVA:", error)
        toast({
          title: "Error",
          description: "No se pudo eliminar el tipo de IVA",
          variant: "destructive",
        })
      }
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tipos de IVA para tarifa: {tarifa.nombre}</h1>
          <p className="text-gray-600">Gestión de tipos de IVA aplicables a esta tarifa</p>
        </div>
      </div>

      {/* Tabla de IVA */}
      <div className="overflow-x-auto rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-purple-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-purple-700 uppercase">
                Descripción
              </th>
              <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-purple-700 uppercase">
                Porcentaje
              </th>
              <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-center text-purple-700 uppercase">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-sm text-center text-gray-500">
                  Cargando tipos de IVA...
                </td>
              </tr>
            ) : Array.isArray(tiposIVATarifa) && tiposIVATarifa.length > 0 ? (
              tiposIVATarifa.map((tipoIVA) => (
                <tr key={tipoIVA.id} className="hover:bg-purple-50/50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                    {tipoIVA.descripcion}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                    {tipoIVA.porcentaje.toFixed(2)}%
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-500 whitespace-nowrap">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => handleEditarIVA(String(tipoIVA.id))}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        <Pencil size={18} />
                      </button>
                      <button 
                        onClick={() => handleEliminarIVA(String(tipoIVA.id))} 
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-sm text-center text-gray-500">
                  No se encontraron tipos de IVA
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Botones de acción fijos */}
      <div className="fixed flex space-x-2 bottom-6 right-6">
        <Button variant="outline" onClick={() => router.push(`/configuracion/tarifas/${tarifaId}`)}>
          Volver
        </Button>
        <Button variant="default" onClick={() => setIsNewIVAOpen(true)}>
          Nuevo IVA
        </Button>
        <Button variant="outline">Ayuda</Button>
      </div>

      {/* Modal de nuevo IVA */}
      <Dialog open={isNewIVAOpen} onOpenChange={setIsNewIVAOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo tipo de IVA</DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700">
                Descripción
              </label>
              <Input
                id="descripcion"
                value={nuevoIVA.descripcion}
                onChange={(e) => setNuevoIVA({ ...nuevoIVA, descripcion: e.target.value })}
                placeholder="Ej: IVA General, IVA Reducido..."
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="porcentaje" className="block text-sm font-medium text-gray-700">
                Porcentaje (%)
              </label>
              <Input
                id="porcentaje"
                type="number"
                min="0"
                step="0.01"
                value={nuevoIVA.porcentaje}
                onChange={(e) => setNuevoIVA({ ...nuevoIVA, porcentaje: parseFloat(e.target.value) })}
                placeholder="Ej: 21.00"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsNewIVAOpen(false)}>
                Cancelar
              </Button>
              <Button 
                variant="default" 
                onClick={handleCrearIVA}
                disabled={isSaving || !nuevoIVA.descripcion}
              >
                {isSaving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de edición de IVA */}
      <Dialog open={isEditIVAOpen} onOpenChange={setIsEditIVAOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar tipo de IVA</DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <label htmlFor="descripcion-edit" className="block text-sm font-medium text-gray-700">
                Descripción
              </label>
              <Input
                id="descripcion-edit"
                value={currentIVA.descripcion}
                onChange={(e) => setCurrentIVA({ ...currentIVA, descripcion: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="porcentaje-edit" className="block text-sm font-medium text-gray-700">
                Porcentaje (%)
              </label>
              <Input
                id="porcentaje-edit"
                type="number"
                min="0"
                step="0.01"
                value={currentIVA.porcentaje}
                onChange={(e) => setCurrentIVA({ ...currentIVA, porcentaje: parseFloat(e.target.value) })}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditIVAOpen(false)}>
                Cancelar
              </Button>
              <Button 
                variant="default" 
                onClick={handleActualizarIVA}
                disabled={isSaving || !currentIVA.descripcion}
              >
                {isSaving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 