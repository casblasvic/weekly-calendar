"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { useStorage } from "@/contexts/storage-context"
import { toast } from "sonner"
import StorageQuotaSettings from "@/components/storage/storage-quota-settings"
import { BackButton } from "@/components/ui/button"
import { ActionButtons } from "@/app/components/ui/action-buttons"
import { Briefcase } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useClinic } from "@/contexts/clinic-context"

// Definir una constante para el almacenamiento total del sistema (en bytes)
const SYSTEM_TOTAL_STORAGE = 1024 * 1024 * 1024 * 1024; // 1TB

export default function ConfiguracionAlmacenamientoPage() {
  const router = useRouter()
  const { getStorageStats, setQuota, getQuota, distributeStorageProportionally } = useStorage()
  const { getActiveClinicas } = useClinic()
  const [saving, setSaving] = useState(false)
  const [configChanged, setConfigChanged] = useState(false)
  const [needsUpdate, setNeedsUpdate] = useState(0)
  
  // Lista de clínicas y sus cuotas
  const [clinics, setClinics] = useState<any[]>([])
  const [clinicQuotas, setClinicQuotas] = useState<Record<string, any>>({})
  
  // Total asignado a las clínicas
  const [totalAssigned, setTotalAssigned] = useState<number>(0)
  
  // Estadísticas globales
  const [globalStats, setGlobalStats] = useState<any>(null)
  const [globalQuota, setGlobalQuota] = useState<any>(null)
  const [dataLoaded, setDataLoaded] = useState(false)
  
  // Cargar datos iniciales
  useEffect(() => {
    loadInitialData()
  }, [needsUpdate])
  
  // Función para cargar datos iniciales
  const loadInitialData = async () => {
    try {
      // Obtener lista de clínicas desde la interfaz
      const clinicsList = await getActiveClinicas();
      
      // Convertir a formato compatible con el resto del código
      const formattedClinics = clinicsList.map(clinic => ({
        id: clinic.id.toString(),
        name: clinic.name,
        city: clinic.city || ""
      }));
      
      setClinics(formattedClinics);
      
      // Obtener y preparar datos de cuotas para cada clínica
      const quotas: Record<string, any> = {};
      let totalUsed = 0;
      
      for (const clinic of formattedClinics) {
        const clinicId = clinic.id.toString();
        const stats = await getStorageStats(clinicId);
        const quota = await getQuota("clinic", clinicId);
        
        quotas[clinicId] = {
          ...stats,
          quota: quota,
          isUnlimited: quota === null || quota.quotaSize === 0,
          id: clinicId
        };
        
        totalUsed += stats.used || 0;
      }
      
      setClinicQuotas(quotas);
      
      // Calcular total asignado
      const totalQuotaAssigned = Object.values(quotas).reduce(
        (sum, item: any) => sum + (item.isUnlimited ? 0 : (item.quota?.quotaSize || 0)), 
        0
      );
      
      setTotalAssigned(totalQuotaAssigned);
      setDataLoaded(true);
      
    } catch (error) {
      console.error("Error al cargar datos iniciales:", error);
      toast.error("Error al cargar los datos de almacenamiento");
      setDataLoaded(true); // Marcar como cargado incluso con error para mostrar una UI
    }
  };
  
  // Actualizar cuota global o por clínica
  const handleUpdateQuota = (size: number, isUnlimited: boolean) => {
    console.log("handleUpdateQuota llamada con:", size, isUnlimited);
    
    // Mostrar notificación de proceso
    const toastId = toast.loading('Aplicando configuración...');
    
    try {
      // Aplicar los cambios directamente y luego recargar datos
      // Necesitamos obtener las clínicas seleccionadas del componente
      const storageQuotaSettings = document.querySelector('[data-component="storage-quota-settings"]');
      const selectedClinicsElement = storageQuotaSettings?.querySelector('[data-selected-clinics]');
      const selectedClinicsStr = selectedClinicsElement?.getAttribute('data-selected-clinics') || '[]';
      const selectedClinics = JSON.parse(selectedClinicsStr);
      
      console.log("Clínicas seleccionadas:", selectedClinics);
      
      // Aplicar cambios a cada clínica seleccionada
      let success = true;
      selectedClinics.forEach((clinicId: string) => {
        console.log(`Aplicando configuración a clínica ${clinicId}: ${size} bytes, Sin límite: ${isUnlimited}`);
        const result = setQuota('clinic', clinicId, size, isUnlimited);
        if (!result) {
          success = false;
          console.error(`Error al aplicar cuota a clínica ${clinicId}`);
        }
      });
      
      // Recargar los datos para reflejar los cambios
      loadInitialData().then(() => {
        // Actualizar notificación según resultado
        if (success) {
          toast.success(`Configuración aplicada a ${selectedClinics.length} clínica(s)`, {
            id: toastId, 
          });
        } else {
          toast.error('Hubo errores al aplicar la configuración', {
            id: toastId,
          });
        }
        
        // Marcar que hubo cambios
        setConfigChanged(true);
      });
    } catch (error) {
      console.error("Error al aplicar la configuración:", error);
      toast.error('Error al aplicar la configuración', {
        id: toastId,
      });
    }
  }
  
  // Guardar la configuración
  const handleSaveConfig = async () => {
    setSaving(true)
    
    try {
      // Simulamos un retraso para mostrar el spinner
      await new Promise(resolve => setTimeout(resolve, 800))
      
      toast.success("Configuración guardada correctamente")
      setConfigChanged(false)
      
      // Redirigir a la página principal
      setTimeout(() => {
        router.push("/configuracion/almacenamiento")
      }, 500)
    } catch (error) {
      toast.error("Error al guardar la configuración")
    } finally {
      setSaving(false)
    }
  }
  
  // Cancelar la edición
  const handleCancel = () => {
    if (configChanged) {
      if (confirm("¿Estás seguro de que quieres cancelar? Los cambios no guardados se perderán.")) {
        router.push("/configuracion/almacenamiento")
      }
    } else {
      router.push("/configuracion/almacenamiento")
    }
  }
  
  // Formatear bytes en una unidad legible
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
  
  // Función para distribuir el almacenamiento proporcionalmente
  const handleDistributeProportionally = () => {
    if (confirm('¿Estás seguro de que quieres distribuir el almacenamiento proporcionalmente? Esta acción modificará las cuotas existentes.')) {
      distributeStorageProportionally(SYSTEM_TOTAL_STORAGE);
      toast.success('Almacenamiento distribuido proporcionalmente');
      
      // Actualizar inmediatamente
      loadInitialData().then(() => {
        setConfigChanged(true);
      });
    }
  }
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Configuración de almacenamiento</h1>
          <p className="text-gray-500">Gestiona el espacio de almacenamiento para cada clínica</p>
        </div>
        <BackButton href="/configuracion/almacenamiento">Volver</BackButton>
      </div>
      
      {!dataLoaded ? (
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando datos de almacenamiento...</p>
        </div>
      ) : (
        <>
          <Card key={`card-${needsUpdate}`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Configuración de cuotas por clínica
              </CardTitle>
              <CardDescription>
                Establece límites de almacenamiento para todas las clínicas o configura cuotas individuales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <StorageQuotaSettings 
                  key={`quota-settings-${needsUpdate}`}
                  onSave={handleUpdateQuota}
                  advancedMode={true}
                  systemTotal={SYSTEM_TOTAL_STORAGE}
                  showTotalInfo={true}
                />
                
                {/* Distribución proporcional */}
                <div className="mt-4 p-4 border border-dashed border-blue-300 bg-blue-50 rounded-md flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-medium text-blue-700">Distribución Proporcional Automática</h3>
                    <p className="text-xs text-gray-600">
                      Distribuye automáticamente el espacio de almacenamiento de forma equitativa entre todas las clínicas registradas.
                    </p>
                  </div>
                  <Button 
                    variant="default"
                    size="sm"
                    onClick={handleDistributeProportionally}
                  >
                    Distribuir proporcionalmente
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="mt-6">
            <ActionButtons
              onSave={handleSaveConfig}
              onCancel={handleCancel}
              isSaving={saving}
              saveText="Guardar configuración"
              cancelText="Cancelar"
              alignment="end"
            />
          </div>
        </>
      )}
    </div>
  )
} 