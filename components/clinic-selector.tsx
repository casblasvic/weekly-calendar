"use client"

import { useState, useEffect } from "react"
import { useDataWithRevalidation } from "@/hooks/use-data-with-revalidation"
import { useAuth } from "@/contexts/auth-context"
import { trackEvent } from "@/utils/analytics"
import type { Clinic } from "@/mockData"
import { getClinics } from "@/mockData"

export default function ClinicSelector() {
  const { user } = useAuth()
  const [selectedClinicId, setSelectedClinicId] = useState<number | null>(null)

  // Usar el hook de revalidación para obtener las clínicas
  const {
    data: clinics,
    isLoading,
    error,
    revalidate,
  } = useDataWithRevalidation<Clinic[]>({
    cookieKey: "user_clinics",
    cacheKey: "clinics_data",
    fetchFn: async () => {
      // En un entorno real, esto sería una llamada API
      // return api.cached.get<Clinic[]>('/api/clinics');

      // Para este ejemplo, usamos los datos mock
      return getClinics()
    },
    defaultValue: [],
    revalidateOnMount: true,
  })

  // Establecer la clínica seleccionada al cargar
  useEffect(() => {
    if (clinics.length > 0 && !selectedClinicId) {
      // Si el usuario tiene una clínica asignada, seleccionarla
      if (user?.clinicId) {
        const userClinic = clinics.find((c) => c.id === user.clinicId)
        if (userClinic) {
          setSelectedClinicId(userClinic.id)
          return
        }
      }

      // De lo contrario, seleccionar la primera clínica
      setSelectedClinicId(clinics[0].id)
    }
  }, [clinics, user, selectedClinicId])

  // Manejar el cambio de clínica
  const handleClinicChange = (clinicId: number) => {
    setSelectedClinicId(clinicId)

    // Registrar el evento en el sistema de análisis
    trackEvent("user_action", "change_clinic", { clinicId })
  }

  // Manejar la actualización manual
  const handleRefresh = () => {
    revalidate()
  }

  if (isLoading) {
    return <div className="p-4">Cargando clínicas...</div>
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error al cargar las clínicas: {error.message}
        <button onClick={handleRefresh} className="ml-2 px-2 py-1 bg-blue-500 text-white rounded">
          Reintentar
        </button>
      </div>
    )
  }

  if (clinics.length === 0) {
    return <div className="p-4">No hay clínicas disponibles</div>
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Seleccionar Clínica</h2>
        <button
          onClick={handleRefresh}
          className="px-2 py-1 bg-gray-200 rounded"
          aria-label="Actualizar lista de clínicas"
        >
          Actualizar
        </button>
      </div>

      <div className="grid gap-4">
        {clinics.map((clinic) => (
          <div
            key={clinic.id}
            className={`p-4 border rounded cursor-pointer ${
              selectedClinicId === clinic.id ? "border-blue-500 bg-blue-50" : "border-gray-200"
            }`}
            onClick={() => handleClinicChange(clinic.id)}
          >
            <h3 className="font-bold">{clinic.commercialName}</h3>
            <p className="text-sm text-gray-600">{clinic.city}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

