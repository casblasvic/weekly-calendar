"use client"

import { useState, useEffect, useContext } from "react"
import { Search, Pencil, Trash2, ChevronDown, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { MockData } from "@/lib/mock-data"
import { ClinicContext } from "@/context/clinic-context"
import { useTarif } from "@/contexts/tarif-context"

// Interfaces
interface Tarifa {
  id: string
  nombre: string
  clinicaId: string
  deshabilitada: boolean
}

export default function GestionTarifas() {
  const router = useRouter()
  const clinicContext = useContext(ClinicContext)
  const tarifContext = useTarif()
  const tarifas = tarifContext.tarifas || []

  // Verificamos que el contexto esté disponible y accedemos a las clínicas
  const clinics = clinicContext?.clinics || []

  // Para depuración - mostrar las clínicas en la consola
  console.log("Clínicas disponibles en el contexto:", clinics)

  const [isNewTarifaOpen, setIsNewTarifaOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [nuevaTarifa, setNuevaTarifa] = useState<Omit<Tarifa, "id">>({
    nombre: "",
    clinicaId: "",
    deshabilitada: false,
  })
  const [isSaving, setIsSaving] = useState(false)

  // Filtrar tarifas según término de búsqueda
  const tarifasFiltradas = tarifas.filter((tarifa) => tarifa.nombre.toLowerCase().includes(searchTerm.toLowerCase()))

  // Filtrar clínicas según el estado del checkbox "Deshabilitada"
  const clinicasFiltradas = clinics.filter((clinic) => (nuevaTarifa.deshabilitada ? true : clinic.isActive))

  // Manejar creación de nueva tarifa
  const handleCrearTarifa = () => {
    setIsSaving(true)

    // Simulamos guardado
    setTimeout(() => {
      const newId = `tarifa-${Date.now()}`
      const nuevaTarifaCompleta = {
        id: newId,
        ...nuevaTarifa,
      }

      // Actualizar MockData
      MockData.tarifas = [...(MockData.tarifas || []), nuevaTarifaCompleta]
      setTarifas([...tarifas, nuevaTarifaCompleta])

      setIsSaving(false)
      setIsNewTarifaOpen(false)

      // Redirigir a la página de configuración de tarifa
      router.push(`/configuracion/tarifas/${newId}`)
    }, 1000)
  }

  // Manejar eliminación de tarifa
  const handleEliminarTarifa = (id: string) => {
    // Filtrar la tarifa a eliminar
    const tarifasActualizadas = tarifas.filter((tarifa) => tarifa.id !== id)

    // Actualizar MockData
    MockData.tarifas = tarifasActualizadas
    setTarifas(tarifasActualizadas)
  }

  // Manejar edición de tarifa
  const handleEditarTarifa = (id: string) => {
    router.push(`/configuracion/tarifas/${id}`)
  }

  console.log("Tarifas disponibles:", tarifas)

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Gestión de tarifas</h1>

      {/* Alerta informativa */}
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-md text-sm text-amber-800">
        Las operaciones con las tarifas realizan un uso intensivo de los datos. Esto puede ocasionar que el sistema
        responda significativamente más lento, por lo que recomendamos su uso fuera del horario de trabajo habitual, o
        en horas de mínima afluencia.
      </div>

      <h2 className="text-lg font-medium mt-6">Listado de tarifas</h2>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <Input
          className="pl-10 pr-4 py-2 w-full"
          placeholder="Buscar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tabla de tarifas */}
      <div className="overflow-x-auto rounded-md border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              >
                <div className="flex items-center space-x-1">
                  <span>Nombre</span>
                  <ChevronDown size={14} />
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tarifasFiltradas.map((tarifa) => (
              <tr key={tarifa.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <div className="flex items-center">
                    {tarifa.nombre}
                    {tarifa.deshabilitada && (
                      <AlertCircle className="ml-2 h-4 w-4 text-amber-500" title="Tarifa deshabilitada" />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                  <div className="flex justify-center space-x-2">
                    <button
                      onClick={() => handleEditarTarifa(tarifa.id)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      <Pencil size={18} />
                    </button>
                    <button onClick={() => handleEliminarTarifa(tarifa.id)} className="text-red-600 hover:text-red-900">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {tarifasFiltradas.length === 0 && (
              <tr>
                <td colSpan={2} className="px-6 py-4 text-center text-sm text-gray-500">
                  No se encontraron tarifas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Botones de acción fijos */}
      <div className="fixed bottom-6 right-6 flex space-x-2">
        <Button variant="outline" onClick={() => router.back()}>
          Volver
        </Button>
        <Button variant="default" onClick={() => setIsNewTarifaOpen(true)}>
          Nueva tarifa
        </Button>
        <Button variant="outline">Ayuda</Button>
      </div>

      {/* Modal de nueva tarifa */}
      <Dialog open={isNewTarifaOpen} onOpenChange={setIsNewTarifaOpen}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="pb-4">
            <DialogTitle>Nueva tarifa</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label htmlFor="nombre" className="text-sm font-medium">
                Nombre
              </label>
              <Input
                id="nombre"
                value={nuevaTarifa.nombre}
                onChange={(e) => setNuevaTarifa({ ...nuevaTarifa, nombre: e.target.value })}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="clinica" className="text-sm font-medium">
                Clínica
              </label>
              <Select
                value={nuevaTarifa.clinicaId}
                onValueChange={(value) => setNuevaTarifa({ ...nuevaTarifa, clinicaId: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="(Ninguna)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">(Ninguna)</SelectItem>
                  {clinicasFiltradas.map((clinic) => (
                    <SelectItem key={clinic.id} value={clinic.prefix}>
                      <div className="flex items-center">
                        {clinic.prefix} - {clinic.name}
                        {!clinic.isActive && (
                          <AlertCircle className="ml-2 h-4 w-4 text-amber-500" title="Clínica deshabilitada" />
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="deshabilitada"
                checked={nuevaTarifa.deshabilitada}
                onCheckedChange={(checked) => setNuevaTarifa({ ...nuevaTarifa, deshabilitada: checked as boolean })}
              />
              <label htmlFor="deshabilitada" className="text-sm font-medium">
                Deshabilitada
              </label>
            </div>
          </div>
          <div className="flex justify-between items-center pt-4">
            <Button variant="outline" onClick={() => setIsNewTarifaOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCrearTarifa} disabled={!nuevaTarifa.nombre || isSaving} className="relative">
              {isSaving ? (
                <>
                  <span className="opacity-0">Guardar</span>
                  <span className="absolute inset-0 flex items-center justify-center">
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </span>
                </>
              ) : (
                "Guardar"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

