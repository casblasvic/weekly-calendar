"use client"

import { useState, use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Pencil, Trash2, ChevronDown } from "lucide-react"
import { useTarif } from "@/contexts/tarif-context"
import { useIVA } from "@/contexts/iva-context"

export default function TiposIVA({ params }: { params: { id: string } }) {
  const router = useRouter()
  const tarifaId = use(params).id
  
  const { getTarifaById } = useTarif()
  const { tiposIVA, addTipoIVA, updateTipoIVA, deleteTipoIVA, getTiposIVAByTarifaId } = useIVA()
  const tarifa = getTarifaById(tarifaId)
  const tiposIVATarifa = getTiposIVAByTarifaId(tarifaId)

  const [isNewIVAOpen, setIsNewIVAOpen] = useState(false)
  const [isEditIVAOpen, setIsEditIVAOpen] = useState(false)
  const [currentIVA, setCurrentIVA] = useState({ id: "", descripcion: "", porcentaje: 0 })
  const [nuevoIVA, setNuevoIVA] = useState({ descripcion: "", porcentaje: 0 })
  const [isSaving, setIsSaving] = useState(false)

  if (!tarifa) {
    return <div>Tarifa no encontrada</div>
  }

  // Manejar creación de nuevo IVA
  const handleCrearIVA = () => {
    setIsSaving(true)

    // Simulamos guardado
    setTimeout(() => {
      addTipoIVA({
        descripcion: nuevoIVA.descripcion,
        porcentaje: nuevoIVA.porcentaje,
        tarifaId: tarifaId
      })

      setIsSaving(false)
      setIsNewIVAOpen(false)
      setNuevoIVA({ descripcion: "", porcentaje: 0 })
    }, 500)
  }

  // Manejar actualización de IVA
  const handleActualizarIVA = () => {
    setIsSaving(true)

    // Simulamos guardado
    setTimeout(() => {
      updateTipoIVA(currentIVA.id, {
        descripcion: currentIVA.descripcion,
        porcentaje: currentIVA.porcentaje
      })

      setIsSaving(false)
      setIsEditIVAOpen(false)
    }, 500)
  }

  // Manejar edición de IVA
  const handleEditarIVA = (id: string) => {
    const tipoIVA = tiposIVATarifa.find(tipo => tipo.id === id)
    if (tipoIVA) {
      setCurrentIVA({
        id: tipoIVA.id,
        descripcion: tipoIVA.descripcion,
        porcentaje: tipoIVA.porcentaje
      })
      setIsEditIVAOpen(true)
    }
  }

  // Manejar eliminación de IVA
  const handleEliminarIVA = (id: string) => {
    if (window.confirm("¿Está seguro de eliminar este tipo de IVA?")) {
      deleteTipoIVA(id)
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
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">
                Descripción
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">
                Porcentaje
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-purple-700 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tiposIVATarifa.map((tipoIVA) => (
              <tr key={tipoIVA.id} className="hover:bg-purple-50/50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {tipoIVA.descripcion}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {tipoIVA.porcentaje.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                  <div className="flex justify-center space-x-2">
                    <button
                      onClick={() => handleEditarIVA(tipoIVA.id)}
                      className="text-purple-600 hover:text-purple-900"
                    >
                      <Pencil size={18} />
                    </button>
                    <button 
                      onClick={() => handleEliminarIVA(tipoIVA.id)} 
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {tiposIVATarifa.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                  No se encontraron tipos de IVA
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Botones de acción fijos */}
      <div className="fixed bottom-6 right-6 flex space-x-2">
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