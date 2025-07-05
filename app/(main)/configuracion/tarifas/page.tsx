"use client"

import { useState, useEffect, useContext } from "react"
import { Search, Pencil, Trash2, ChevronDown, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { useClinic } from "@/contexts/clinic-context"
import { Tarifa, useTarif } from "@/contexts/tarif-context"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableHeader, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/table"

// --- Skeleton para la tabla de tarifas ---
const renderTarifTableSkeleton = () => (
  <div className="space-y-4">
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><Skeleton className="h-5 w-32" /></TableHead>
            <TableHead><Skeleton className="h-5 w-48" /></TableHead>
            <TableHead><Skeleton className="h-5 w-20" /></TableHead>
            <TableHead className="text-right"><Skeleton className="h-5 w-24" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, index) => (
            <TableRow key={`skeleton-tarif-${index}`}>
              <TableCell><Skeleton className="h-5 w-full" /></TableCell>
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

export default function GestionTarifas() {
  const router = useRouter()
  const clinicContext = useClinic()
  const tarifContext = useTarif()

  const isLoadingTarifs = (tarifContext?.isLoading ?? true) && (tarifContext?.tarifas?.length === 0);
  const tarifas = tarifContext?.tarifas ?? [];
  const addTarifa = tarifContext?.addTarifa;
  const updateTarifa = tarifContext?.updateTarifa;

  const clinics = clinicContext?.clinics ?? [];

  const [isNewTarifaOpen, setIsNewTarifaOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [nuevaTarifa, setNuevaTarifa] = useState<Partial<Omit<Tarifa, "id" | "createdAt" | "updatedAt" | "systemId" | "clinics">>>({
    name: "",
    isActive: true
  })
  const [isSaving, setIsSaving] = useState(false)

  // Filtrar tarifas según término de búsqueda
  const tarifasFiltradas = tarifas.filter((tarifa) => tarifa.name?.toLowerCase().includes(searchTerm.toLowerCase()))

  // Filtrar clínicas según el estado del checkbox "Deshabilitada"
  const clinicasFiltradas = clinics;
  
  // Depuración de las clínicas filtradas
  console.log("Clínicas filtradas:", clinicasFiltradas)
  console.log("Estado de nuevaTarifa:", nuevaTarifa)
  console.log("Total de clínicas:", clinics.length)
  console.log("Nombres de clínicas:", clinics.map(c => c.name).join(", "))

  // Manejar creación de nueva tarifa
  const handleCrearTarifa = async () => {
    setIsSaving(true)
    if (!addTarifa) {
        console.error("addTarifa function not available from context.");
        setIsSaving(false);
        return;
    }

    // Usar directamente nuevaTarifa ya que ahora coincide con el tipo esperado por addTarifa
    const tarifaToSave = { ...nuevaTarifa };

    // Asegurar que el nombre no está vacío antes de guardar
    if (!tarifaToSave.name) {
        console.error("Error: El nombre de la tarifa no puede estar vacío.");
        // TODO: Mostrar mensaje de error al usuario
        setIsSaving(false);
        return;
    }

    try {
      // Ahora sabemos que tarifaToSave.name es string
      const newTariff = await addTarifa(tarifaToSave as Omit<Tarifa, "id" | "createdAt" | "updatedAt" | "systemId">);
      if (newTariff) {
        setIsSaving(false)
        setIsNewTarifaOpen(false)
        // Restablecer formulario
        setNuevaTarifa({
            name: "",
            isActive: true
        });
        // Redirigir a la página de configuración de tarifa
        router.push(`/configuracion/tarifas/${newTariff.id}`)
      } else {
          // Manejar error si addTarifa devuelve null
          console.error("Error: No se pudo crear la tarifa.");
          // Mostrar mensaje al usuario
          setIsSaving(false); 
      }
    } catch (error) {
        console.error("Error al intentar crear la tarifa:", error);
        // Mostrar mensaje al usuario
        setIsSaving(false);
    }
  }

  // Manejar eliminación de tarifa
  const handleEliminarTarifa = (id: string | number) => {
    // Convertir id a string
    const stringId = String(id);
    // >>> Comprobar si updateTarifa existe <<<
    if (!updateTarifa) {
        console.error("updateTarifa function not available from context.");
        return; // Salir si la función no está disponible
    }
    const tarifasActualizadas = tarifas.filter((tarifa) => String(tarifa.id) !== stringId)

    // Actualizar todas las tarifas en el contexto
    tarifasActualizadas.forEach(tarifa => {
      updateTarifa(String(tarifa.id), tarifa)
    })
  }

  // Manejar edición de tarifa
  const handleEditarTarifa = (id: string | number) => {
    // Convertir id a string
    router.push(`/configuracion/tarifas/${String(id)}`)
  }

  console.log("Tarifas disponibles:", tarifas)

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Gestión de tarifas</h1>

      {/* Alerta informativa */}
      <div className="p-4 text-sm border rounded-md bg-amber-50 border-amber-200 text-amber-800">
        Las operaciones con las tarifas realizan un uso intensivo de los datos. Esto puede ocasionar que el sistema
        responda significativamente más lento, por lo que recomendamos su uso fuera del horario de trabajo habitual, o
        en horas de mínima afluencia.
      </div>

      <h2 className="mt-6 text-lg font-medium">Listado de tarifas</h2>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute text-gray-400 transform -translate-y-1/2 left-3 top-1/2" size={18} />
        <Input
          className="w-full py-2 pl-10 pr-4"
          placeholder="Buscar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tabla de tarifas - Condicional */} 
      {isLoadingTarifs ? (
        renderTarifTableSkeleton()
      ) : (
        <div className="overflow-x-auto border rounded-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="table-header">
                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase">
                  Nombre
                </th>
                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase">
                  Clínica
                </th>
                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase">
                  Estado
                </th>
                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-right uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tarifasFiltradas.map((tarifa) => (
                <tr key={tarifa.id} className="table-row-hover">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                    {tarifa.name}
                    {tarifa.isActive === false && (
                      <AlertCircle className="inline-block w-4 h-4 ml-2 text-amber-500" aria-label="Tarifa deshabilitada" />
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                    {tarifa.clinics && tarifa.clinics.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1">
                        {/* Asumimos que la primera clínica es la "principal" si hay varias, o se podría añadir una lógica específica si hay un campo "isPrimary" en la relación */}
                        {tarifa.clinics.map((clinic, index) => (
                           <span 
                             key={clinic.id} 
                             className={`text-xs px-1.5 py-0.5 rounded-full ${index === 0 ? 'bg-indigo-100 text-indigo-700 font-medium' : 'bg-gray-100'}`}
                             title={`${clinic.prefix || 'ID:' + clinic.id} - ${clinic.name}`}
                           >
                             {clinic.name}
                             {index === 0 && tarifa.clinics.length > 1 && <span className="ml-1">(Principal)</span>} {/* Marcar principal si hay más */} 
                           </span>
                        ))}
                      </div>
                    ) : (
                      <span>-</span> // Mostrar guion si no hay clínicas asociadas
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        tarifa.isActive === true ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {tarifa.isActive === true ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleEditarTarifa(String(tarifa.id))}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Pencil size={18} />
                      </button>
                      <button 
                        onClick={() => handleEliminarTarifa(String(tarifa.id))} 
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {tarifasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-sm text-center text-gray-500">
                    No se encontraron tarifas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Botones de acción fijos */}
      <div className="fixed flex space-x-2 bottom-6 right-6">
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
        <DialogContent className="p-6 sm:max-w-md">
          <DialogHeader className="mb-4">
            <DialogTitle>Nueva tarifa</DialogTitle>
          </DialogHeader>
          <div className="mb-6 space-y-6">
            <div className="space-y-3">
              <label htmlFor="tarifa-nombre" className="text-sm font-medium">
                Nombre
              </label>
              <Input
                id="tarifa-nombre"
                value={nuevaTarifa.name || ''}
                onChange={(e) => setNuevaTarifa({ ...nuevaTarifa, name: e.target.value })}
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <label htmlFor="tarifa-activa" className="text-sm font-medium">
                Tarifa activa
              </label>
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="col-start-2 col-span-3 flex items-center space-x-2">
                  <Checkbox
                    id="tarifa-activa"
                    checked={nuevaTarifa.isActive}
                    onCheckedChange={(checked) => setNuevaTarifa({ ...nuevaTarifa, isActive: Boolean(checked) })}
                  />
                  <label
                    htmlFor="tarifa-activa"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Tarifa activa
                  </label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewTarifaOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCrearTarifa} 
              disabled={!nuevaTarifa.name || isSaving} 
              className="btn-primary"
            >
              {isSaving ? (
                <div className="flex items-center space-x-2">
                  <span className="w-4 h-4 border-2 rounded-full animate-spin border-t-transparent" />
                  <span>Guardando...</span>
                </div>
              ) : (
                "Guardar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

