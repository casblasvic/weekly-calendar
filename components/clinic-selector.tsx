"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useDataWithRevalidation } from "@/hooks/use-data-with-revalidation"
import { useAuth } from "@/contexts/auth-context"
import { trackEvent } from "@/utils/analytics"
import { useClinic, Clinica } from "@/contexts/clinic-context"

export function ClinicSelector() {
  const { user } = useAuth()
  const { activeClinic, setActiveClinic, getActiveClinicas, getClinicaById } = useClinic()
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(activeClinic?.id?.toString() || null)
  const isChangingRef = useRef(false)
  const pendingChangeRef = useRef<string | null>(null)

  // Usar el hook de revalidación para obtener las clínicas
  const {
    data: clinics,
    isLoading,
    error,
    revalidate,
  } = useDataWithRevalidation<Clinica[]>({
    cookieKey: "user_clinics",
    cacheKey: "clinics_data",
    fetchFn: async () => {
      // Usar el contexto especializado para obtener las clínicas
      return getActiveClinicas()
    },
    defaultValue: [],
    revalidateOnMount: true,
  })

  // Establecer la clínica seleccionada al cargar
  useEffect(() => {
    if (clinics.length > 0 && !selectedClinicId) {
      // Si el usuario tiene una clínica asignada, seleccionarla
      if (user?.clinicId) {
        const userClinic = clinics.find((c) => c.id.toString() === user.clinicId.toString())
        if (userClinic) {
          setSelectedClinicId(userClinic.id.toString())
          return
        }
      }
      
      // Si no, seleccionar la primera
      setSelectedClinicId(clinics[0].id.toString())
    }
  }, [clinics, selectedClinicId, user])

  // Gestionar el cambio de clínica pendiente
  useEffect(() => {
    // Si hay un cambio pendiente y no estamos en proceso de cambio
    if (pendingChangeRef.current && !isChangingRef.current) {
      const changeClinic = async () => {
        isChangingRef.current = true;
        try {
          const clinicId = pendingChangeRef.current!;
          const clinic = await getClinicaById(clinicId);
          
          if (clinic) {
            console.log("Cambiando clínica activa a:", clinic.name);
            // Usar un timeout para asegurar que React complete los ciclos de renderizado
            setTimeout(() => {
              setActiveClinic(clinic);
              // Esperar un poco más antes de limpiar la bandera de cambio
              setTimeout(() => {
                isChangingRef.current = false;
                pendingChangeRef.current = null;
              }, 50);
            }, 50);
          } else {
            // Limpiar estado si no se encontró la clínica
            isChangingRef.current = false;
            pendingChangeRef.current = null;
          }
        } catch (error) {
          console.error("Error al cambiar de clínica:", error);
          isChangingRef.current = false;
          pendingChangeRef.current = null;
        }
      };
      
      changeClinic();
    }
  }, [getClinicaById, setActiveClinic]);

  // Sincronizar el ID seleccionado con activeClinic
  useEffect(() => {
    if (activeClinic?.id && selectedClinicId !== activeClinic.id.toString() && !isChangingRef.current) {
      setSelectedClinicId(activeClinic.id.toString());
    }
  }, [activeClinic, selectedClinicId]);

  const handleClinicChange = useCallback(async (clinicId: string) => {
    if (clinicId === selectedClinicId || isChangingRef.current) return;
    
    // Actualizar UI inmediatamente
    setSelectedClinicId(clinicId);
    
    // Programar el cambio real como pendiente
    pendingChangeRef.current = clinicId;
    
    // Registrar el evento de analítica
    trackEvent("user_action", "clinic_change", {
      clinicId,
      clinicName: clinics.find(c => c.id.toString() === clinicId)?.name || "Unknown",
    });
  }, [selectedClinicId, clinics]);

  const handleRefresh = () => {
    revalidate()
  }

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-sm text-gray-500">Cargando clínicas...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <div className="text-red-500 mb-2">Error al cargar las clínicas</div>
        <button
          onClick={handleRefresh}
          className="text-sm text-blue-600 hover:underline focus:outline-none"
        >
          Intentar nuevamente
        </button>
      </div>
    )
  }

  if (clinics.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500">No hay clínicas disponibles</p>
      </div>
    )
  }

  return (
    <div className="max-h-[300px] overflow-y-auto">
      <div className="text-xs text-gray-500 px-3 py-2">Seleccionar clínica</div>
      <div className="divide-y">
        {clinics.map((clinic) => (
          <div
            key={clinic.id}
            className={`p-3 cursor-pointer transition-colors hover:bg-gray-100 ${
              selectedClinicId === clinic.id.toString() ? "bg-purple-50" : ""
            }`}
            onClick={() => handleClinicChange(clinic.id.toString())}
          >
            <h3 className="font-bold">{clinic.name}</h3>
            <p className="text-sm text-gray-600">{clinic.city}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ClinicSelector

