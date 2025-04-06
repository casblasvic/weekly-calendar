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

export default function GestionTarifas() {
  const router = useRouter()
  const clinicContext = useClinic()
  const tarifContext = useTarif()
  const tarifas = tarifContext.tarifas || []

  // Obtenemos las clínicas directamente del contexto
  const [clinics, setClinics] = useState<any[]>([])
  
  // Cargar las clínicas cuando el contexto esté disponible
  useEffect(() => {
    if (clinicContext && clinicContext.clinics && clinicContext.clinics.length > 0) {
      setClinics(clinicContext.clinics);
      console.log("Clínicas cargadas desde el contexto:", clinicContext.clinics.length);
    } else {
      console.log("Context no disponible o sin clínicas - usando clínicas hardcoded");
      
      // Hardcodear las clínicas que sabemos que existen en defaultClinics
      const clinicasHardcoded = [
        {
          id: 1,
          prefix: "000001",
          name: "Californie Multilaser - Organicare",
          city: "Casablanca",
          isActive: true
        },
        {
          id: 2,
          prefix: "Cafc",
          name: "Cafc Multilaser",
          city: "Casablanca",
          isActive: true
        },
        {
          id: 3,
          prefix: "TEST",
          name: "CENTRO TEST",
          city: "Casablanca",
          isActive: false
        }
      ];
      
      setClinics(clinicasHardcoded);
      console.log("Cargadas clínicas hardcoded:", clinicasHardcoded.length);
    }
  }, [clinicContext]);
  
  // Para depuración
  console.log("Clínicas disponibles:", clinics)
  console.log("¿Array de clínicas vacío?", clinics.length === 0)
  console.log("¿clinicContext es null?", clinicContext === null)
  console.log("¿clinicContext es undefined?", clinicContext === undefined)
  console.log("Valores exactos de isActive en clínicas:")
  clinics.forEach(c => {
    console.log(`Clínica: ${c.name}, isActive: ${c.isActive}, tipo: ${typeof c.isActive}, es true?: ${c.isActive === true}, es false?: ${c.isActive === false}`)
  });

  const [isNewTarifaOpen, setIsNewTarifaOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [nuevaTarifa, setNuevaTarifa] = useState<Omit<Tarifa, "id">>({
    nombre: "",
    clinicaId: "",
    clinicasIds: [],
    deshabilitada: false,
    isActive: true
  })
  const [isSaving, setIsSaving] = useState(false)

  // Filtrar tarifas según término de búsqueda
  const tarifasFiltradas = tarifas.filter((tarifa) => tarifa.name?.toLowerCase().includes(searchTerm.toLowerCase()))

  // Filtrar clínicas según el estado del checkbox "Deshabilitada"
  const clinicasFiltradas = clinics.filter((clinic) => {
    // Si está marcado "Deshabilitada" o "Incluir clínicas deshabilitadas", mostrar todas
    if (nuevaTarifa.deshabilitada) {
      return true;
    }
    
    // De lo contrario, solo mostrar clínicas activas
    return clinic.isActive === true;
  });
  
  // Depuración de las clínicas filtradas
  console.log("Clínicas filtradas:", clinicasFiltradas)
  console.log("Estado de nuevaTarifa:", nuevaTarifa)
  console.log("Total de clínicas:", clinics.length)
  console.log("Nombres de clínicas:", clinics.map(c => c.name).join(", "))

  // Manejar creación de nueva tarifa
  const handleCrearTarifa = () => {
    setIsSaving(true)

    // Asegurar que tengamos clinicasIds
    const tarifaToSave = {
      ...nuevaTarifa,
      clinicasIds: nuevaTarifa.clinicasIds || [nuevaTarifa.clinicaId].filter(Boolean)
    };

    // Simulamos guardado
    setTimeout(() => {
      // Añadir la tarifa usando la función del contexto
      const newId = tarifContext.addTarifa(tarifaToSave);

      setIsSaving(false)
      setIsNewTarifaOpen(false)

      // Redirigir a la página de configuración de tarifa
      router.push(`/configuracion/tarifas/${newId}`)
    }, 1000)
  }

  // Manejar eliminación de tarifa
  const handleEliminarTarifa = (id: string | number) => {
    // Convertir id a string
    const stringId = String(id);
    const tarifasActualizadas = tarifas.filter((tarifa) => String(tarifa.id) !== stringId)

    // Actualizar todas las tarifas en el contexto
    tarifasActualizadas.forEach(tarifa => {
      tarifContext.updateTarifa(String(tarifa.id), tarifa)
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

      {/* Tabla de tarifas */}
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
                  {tarifa.clinicasIds && tarifa.clinicasIds.length > 0 ? (
                    <div className="flex flex-col space-y-1">
                      {/* Mostrar la clínica principal */}
                      <div className="flex items-center">
                        <span className="font-medium">
                          {clinics.find(c => c.prefix === tarifa.clinicaId)?.name || 
                           (tarifa.clinicaId ? `${tarifa.clinicaId}` : '-')}
                        </span>
                        <span className="ml-1.5 text-xs bg-indigo-100 px-1.5 py-0.5 rounded-full text-indigo-700">
                          Principal
                        </span>
                      </div>
                      
                      {/* Mostrar las clínicas adicionales si existen */}
                      {tarifa.clinicasIds.length > 1 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {tarifa.clinicasIds
                            .filter((id: string) => id !== tarifa.clinicaId)
                            .map((clinicaId: string) => {
                              const clinic = clinics.find(c => c.prefix === clinicaId);
                              return clinic ? (
                                <span 
                                  key={clinic.prefix} 
                                  className="text-xs px-1.5 py-0.5 bg-gray-100 rounded-full"
                                  title={`${clinic.prefix} - ${clinic.name}`}
                                >
                                  {clinic.name}
                                </span>
                              ) : (
                                <span 
                                  key={clinicaId} 
                                  className="text-xs px-1.5 py-0.5 bg-gray-100 rounded-full"
                                >
                                  {clinicaId}
                                </span>
                              );
                            })
                          }
                        </div>
                      )}
                    </div>
                  ) : (
                    <span>{clinics.find(c => c.prefix === tarifa.clinicaId)?.name || 
                           (tarifa.clinicaId ? `${tarifa.clinicaId}` : '-')}</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      tarifa.isActive === false
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {tarifa.isActive === false ? "Desactivada" : "Activa"}
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

            <div className="space-y-3">
              <label htmlFor="clinica" className="text-sm font-medium">
                Clínica(s)
              </label>
              <Select
                onValueChange={(value) => {
                  if (value && !nuevaTarifa.clinicasIds.includes(value)) {
                    // Si es la primera clínica, establecerla como principal también
                    const isFirst = nuevaTarifa.clinicasIds.length === 0;
                    
                    setNuevaTarifa({
                      ...nuevaTarifa,
                      clinicasIds: [...nuevaTarifa.clinicasIds, value],
                      // Establecer como clinicaId principal si es la primera
                      clinicaId: isFirst ? value : nuevaTarifa.clinicaId || value
                    });
                  }
                }}
              >
                <SelectTrigger id="clinica" className="w-full bg-white border-gray-300">
                  <SelectValue placeholder="Añadir clínica" />
                </SelectTrigger>
                <SelectContent className="overflow-y-auto bg-white max-h-60">
                  {clinics
                    .filter(c => !nuevaTarifa.clinicasIds.includes(c.prefix) && 
                                 (nuevaTarifa.deshabilitada || c.isActive === true))
                    .map((clinic) => (
                      <SelectItem 
                        key={clinic.id} 
                        value={clinic.prefix}
                        className="flex items-center py-2"
                      >
                        {clinic.prefix} - {clinic.name}
                      </SelectItem>
                    ))}
                  {clinics.filter(c => !nuevaTarifa.clinicasIds.includes(c.prefix) && 
                                 (nuevaTarifa.deshabilitada || c.isActive === true)).length === 0 && (
                    <div className="p-2 text-sm text-gray-500">
                      Todas las clínicas disponibles ya han sido seleccionadas
                    </div>
                  )}
                </SelectContent>
              </Select>
              
              {/* Mostrar clínicas seleccionadas como chips */}
              {nuevaTarifa.clinicasIds.length > 0 && (
                <div className="mt-3">
                  <label className="block mb-2 text-sm font-medium">Clínicas seleccionadas</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {nuevaTarifa.clinicasIds.map((clinicaId) => {
                      const clinic = clinics.find(c => c.prefix === clinicaId);
                      const isPrimary = clinicaId === nuevaTarifa.clinicaId;
                      
                      return clinic || clinicaId ? (
                        <div 
                          key={clinic?.prefix || clinicaId} 
                          className={`px-3 py-1.5 rounded-full flex items-center gap-1 text-sm ${
                            isPrimary 
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-300' 
                              : 'bg-gray-100 text-gray-800 border border-gray-200'
                          }`}
                        >
                          <span>{clinic?.name || clinicaId}</span>
                          {isPrimary && (
                            <span className="ml-1 text-xs bg-indigo-200 px-1.5 py-0.5 rounded-full text-indigo-800">
                              Principal
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              // Si eliminamos la clínica principal, asignar otra como principal
                              let newClinicaId = nuevaTarifa.clinicaId;
                              if (isPrimary && nuevaTarifa.clinicasIds.length > 1) {
                                // Encontrar otra clínica que no sea esta para asignarla como principal
                                const otherClinicId = nuevaTarifa.clinicasIds.find(id => id !== clinicaId);
                                newClinicaId = otherClinicId || "";
                              } else if (isPrimary) {
                                // Si era la única, limpiar clinicaId
                                newClinicaId = "";
                              }
                              
                              setNuevaTarifa({
                                ...nuevaTarifa,
                                clinicasIds: nuevaTarifa.clinicasIds.filter(id => id !== clinicaId),
                                clinicaId: newClinicaId
                              });
                            }}
                            className="ml-1 text-gray-500 hover:text-red-500"
                            title="Eliminar clínica"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 6L6 18"></path>
                              <path d="M6 6l12 12"></path>
                            </svg>
                          </button>
                          {!isPrimary && (
                            <button
                              type="button"
                              onClick={() => {
                                setNuevaTarifa({
                                  ...nuevaTarifa,
                                  clinicaId: clinicaId
                                });
                              }}
                              className="ml-1 text-indigo-500 hover:text-indigo-700"
                              title="Establecer como clínica principal"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                              </svg>
                            </button>
                          )}
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center pt-2 space-x-2">
              <Checkbox
                id="deshabilitada"
                checked={nuevaTarifa.deshabilitada}
                onCheckedChange={(checked) => setNuevaTarifa({ 
                  ...nuevaTarifa, 
                  deshabilitada: checked as boolean,
                  isActive: !(checked as boolean)
                })}
              />
              <label htmlFor="deshabilitada" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Deshabilitada
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewTarifaOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCrearTarifa} 
              disabled={!nuevaTarifa.nombre || isSaving} 
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

