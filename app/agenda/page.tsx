"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import WeeklyAgenda from "@/components/weekly-agenda"
import { HydrationWrapper } from "@/components/hydration-wrapper"
import { useClinic } from "@/contexts/clinic-context"
import { ThemeProvider } from "@/contexts/theme"

// Colores por defecto (fallback)
const defaultThemeColors = {
  primaryColor: "#7c3aed",
  secondaryColor: "#8b5cf6",
  accentColor: "#a78bfa",
  textColor: "#111827",
  backgroundColor: "#ffffff",
  headerBackgroundColor: "#7c3aed",
  sidebarBackgroundColor: "#f9fafb",
}

export default function AgendaPage() {
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const { activeClinic } = useClinic()
  const [retryCount, setRetryCount] = useState(0)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  
  // Efecto para detectar hidratación
  useEffect(() => {
    setIsHydrated(true)
  }, [])
  
  // Inicialización de componentes
  useEffect(() => {
    if (typeof window === "undefined") return
    
    console.log("[AgendaPage] Inicializando: hydrated =", isHydrated)
    console.log("[AgendaPage] Datos de clínica activa:", activeClinic)
    
    if (isHydrated && !isInitialized) {
      console.log("[AgendaPage] Ejecutando inicialización completa")
      setIsInitialized(true)
    }
  }, [isHydrated, activeClinic, isInitialized])

  // Manejo de errores mejorado
  useEffect(() => {
    if (typeof window === "undefined") return
    
    const handleError = (event: ErrorEvent) => {
      console.error("[AgendaPage] Error detectado:", event.error)
      
      // No mostrar errores durante la hidratación
      if (!isHydrated) return
      
      // No mostrar errores durante la inicialización
      if (!isInitialized) return
      
      setHasError(true)
      setErrorMessage(event.error?.message || "Error desconocido en la aplicación")
    }

    console.log("[AgendaPage] Configurando detector de errores")
    window.addEventListener('error', handleError)
    
    return () => {
      console.log("[AgendaPage] Eliminando detector de errores")
      window.removeEventListener('error', handleError)
    }
  }, [isHydrated, isInitialized])

  // Fallback mientras se carga
  const loadingFallback = (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <p className="text-lg mb-2">Cargando agenda...</p>
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-sm text-gray-500">Si la carga tarda demasiado, intenta recargar la página</p>
    </div>
  )

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
  
  // Renderizar siempre la vista de escritorio, sin condiciones para móvil
  return (
    <HydrationWrapper 
      fallback={loadingFallback}
      timeout={5000}
    >
      {(isHydrated && isInitialized) ? (
        <WeeklyAgenda key={`desktop-view-${retryCount}`} />
      ) : (
        loadingFallback
      )}
    </HydrationWrapper>
  )
}

