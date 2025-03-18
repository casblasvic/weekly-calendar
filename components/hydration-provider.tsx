"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { LoadingIndicator } from "./loading-indicator"

interface HydrationProviderProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function HydrationProvider({ children, fallback }: HydrationProviderProps) {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    // Marcar como hidratado después de que el componente se monte en el cliente
    setIsHydrated(true)
  }, [])

  // Si no estamos hidratados, mostrar el fallback o un indicador de carga por defecto
  if (!isHydrated) {
    return fallback || <LoadingIndicator message="Cargando aplicación..." size="lg" />
  }

  // Una vez hidratado, mostrar los hijos
  return <>{children}</>
}

