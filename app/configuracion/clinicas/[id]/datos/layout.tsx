"use client"

import type React from "react"
import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/button"
import { ArrowLeft, HelpCircle, Save } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useClinic } from "@/contexts/clinic-context"

export default function DatosClinicaLayout(
  props: {
    children: React.ReactNode
    params: Promise<{ id: string }>
  }
) {
  const params = use(props.params);

  const {
    children
  } = props;

  const router = useRouter()
  const { updateClinica } = useClinic()
  const [hasChanges, setHasChanges] = useState(false)
  const clinicId = params.id

  // Listen for changes in the clinic data
  useEffect(() => {
    const handleDataChange = (e: CustomEvent) => {
      const { entityType, entityId } = e.detail;
      if (entityType === 'clinic' && entityId === clinicId) {
        setHasChanges(true)
      }
    }

    window.addEventListener('data-change' as any, handleDataChange)
    return () => {
      window.removeEventListener('data-change' as any, handleDataChange)
    }
  }, [clinicId])

  const saveClinic = async () => {
    try {
      // Obtener los datos actuales de la clínica desde el contexto global o localStorage
      const currentData = localStorage.getItem(`clinic_edit_${clinicId}`);
      
      if (currentData) {
        const clinicData = JSON.parse(currentData);
        
        // Actualizar la clínica usando la interfaz
        await updateClinica(clinicId, clinicData);
        
        // Limpiar datos temporales
        localStorage.removeItem(`clinic_edit_${clinicId}`);
        
        // Mostrar confirmación
        toast.success("Clínica actualizada correctamente");
        
        // Reiniciar estado
        setHasChanges(false);
        
        // Disparar evento para notificar a otros componentes
        window.dispatchEvent(
          new CustomEvent('data-change', {
            detail: { entityType: 'clinic', entityId: clinicId }
          })
        );
      } else {
        console.log("No hay cambios para guardar");
      }
    } catch (error) {
      console.error("Error al guardar la clínica:", error);
      toast.error("Error al guardar los cambios");
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <h1 className="text-2xl font-semibold">Datos de la clínica</h1>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button onClick={saveClinic}>
              <Save className="mr-2 h-4 w-4" />
              Guardar cambios
            </Button>
          )}
          <Button variant="ghost" size="icon">
            <HelpCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {children}
    </div>
  )
}

