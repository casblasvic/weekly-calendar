"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { LoadingIndicator } from "./loading-indicator"

interface HydrationWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  loadingComponent?: React.ReactNode
  skipHydrationCheck?: boolean
}

/**
 * Componente que envuelve contenido que necesita estar hidratado antes de renderizarse
 * Útil para componentes que acceden a localStorage, sessionStorage o window
 */
export function HydrationWrapper({
  children,
  fallback = null,
  loadingComponent = <LoadingIndicator />,
  skipHydrationCheck = false,
}: HydrationWrapperProps) {
  const [isHydrated, setIsHydrated] = useState(skipHydrationCheck)
  const [isClient, setIsClient] = useState(false)

  // Detectar si estamos en el cliente
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Marcar como hidratado después del primer renderizado en el cliente
  useEffect(() => {
    if (isClient) {
      // Pequeño retraso para asegurar que la hidratación se ha completado
      const timer = setTimeout(() => {
        setIsHydrated(true)
      }, 10)
      return () => clearTimeout(timer)
    }
  }, [isClient])

  // En el servidor o durante la hidratación, mostrar el fallback
  if (!isClient) {
    return fallback
  }

  // Durante la transición de hidratación, mostrar el componente de carga
  if (!isHydrated) {
    return loadingComponent
  }

  // Una vez hidratado, mostrar el contenido real
  return <>{children}</>
}

