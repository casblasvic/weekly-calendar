"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import dynamic from 'next/dynamic'
import { useClinic } from "@/contexts/clinic-context"

// Componente de carga separado para reutilización
const LoadingFallback = () => (
  <div className="flex flex-col items-center justify-center min-h-screen">
    <p className="text-lg mb-2">Cargando agenda...</p>
    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    <p className="mt-4 text-sm text-gray-500">Si la carga tarda demasiado, intenta recargar la página</p>
  </div>
)

// Importar el componente WeeklyAgenda de forma dinámica para evitar problemas de hidratación
const WeeklyAgenda = dynamic(() => import('@/components/weekly-agenda'), {
  ssr: false,
  loading: () => <LoadingFallback />
})

export default function AgendaPage() {
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const { activeClinic } = useClinic()
  const [retryCount, setRetryCount] = useState(0)
  const [mountKey, setMountKey] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  
  const previousClinicIdRef = useRef<string | number | null>(null)
  const remountTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Referencias para evitar bucles de actualización
  const errorHandlerRef = useRef<((event: ErrorEvent) => void) | null>(null);
  
  // Manejo de errores mejorado
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Crear un nuevo manejador de errores
    if (!errorHandlerRef.current) {
      errorHandlerRef.current = (event: ErrorEvent) => {
        console.error("[AgendaPage] Error detectado:", event.error);
        setHasError(true);
        setErrorMessage(event.error?.message || "Error desconocido en la aplicación");
      };
    }
    
    window.addEventListener('error', errorHandlerRef.current);
    
    return () => {
      if (errorHandlerRef.current) {
        window.removeEventListener('error', errorHandlerRef.current);
      }
    };
  }, []);

  // Memoizar los datos de la clínica para evitar re-renderizados innecesarios
  const clinicData = useMemo(() => {
    return activeClinic ? {
      id: activeClinic.id,
      config: activeClinic.config
    } : null;
  }, [activeClinic]);
  
  // Efecto para detectar cambios de clínica y forzar remontaje del componente WeeklyAgenda
  useEffect(() => {
    // Limpiar cualquier timeout previo para evitar cambios múltiples
    if (remountTimeoutRef.current) {
      clearTimeout(remountTimeoutRef.current);
      remountTimeoutRef.current = null;
    }
    
    if (clinicData?.id) {
      const currentClinicId = clinicData.id;
      
      // Verificar si es el primer montaje (previousClinicIdRef.current es null)
      if (previousClinicIdRef.current === null) {
        previousClinicIdRef.current = currentClinicId;
        return;
      }
      
      // Solo forzar remontaje si la clínica ha cambiado realmente
      if (previousClinicIdRef.current !== currentClinicId) {
        console.log("[AgendaPage] Clínica activa cambiada, forzando reinicio de la agenda", 
          { previous: previousClinicIdRef.current, current: currentClinicId });
        
        // Mostrar estado de carga y luego remontar para evitar bloqueo de interfaz
        setIsLoading(true);
        
        // Usar un timeout para dar tiempo al navegador a mostrar la UI de carga
        remountTimeoutRef.current = setTimeout(() => {
          // Actualizar la referencia antes de incrementar la clave
          previousClinicIdRef.current = currentClinicId;
          
          // Incrementar la clave para forzar remontaje
          setMountKey(prev => prev + 1);
          
          // Dar tiempo adicional antes de ocultar el indicador de carga
          setTimeout(() => {
            setIsLoading(false);
          }, 100);
        }, 100);
      }
    }
    
    // Limpiar el timeout al desmontar
    return () => {
      if (remountTimeoutRef.current) {
        clearTimeout(remountTimeoutRef.current);
      }
    };
  }, [clinicData?.id]);

  // Fallback en caso de error
  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h2 className="text-xl font-bold mb-4">Ha ocurrido un error</h2>
        <p className="mb-6">{errorMessage}</p>
        <button 
          className="px-4 py-2 bg-blue-600 text-white rounded"
          onClick={() => {
            console.log("[AgendaPage] Intentando recuperarse de error...")
            setHasError(false)
            setRetryCount(prev => prev + 1)
            window.location.reload()
          }}
        >
          Recargar la página
        </button>
      </div>
    )
  }
  
  // Mostrar indicador de carga durante el cambio de clínica
  if (isLoading) {
    return <LoadingFallback />;
  }
  
  // Renderizar la agenda sólo cuando hay datos de clínica
  return (
    <div className="w-full h-full" key={`page-container-${retryCount}-${mountKey}`}>
      {clinicData ? (
        <WeeklyAgenda 
          key={`desktop-view-${retryCount}-${mountKey}-${String(clinicData.id)}`} 
          initialClinic={clinicData} 
        />
      ) : (
        <LoadingFallback />
      )}
    </div>
  )
}

