"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { LoadingIndicator } from "./loading-indicator"

interface HydrationWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  loadingComponent?: React.ReactNode
  skipHydrationCheck?: boolean
  timeout?: number // Tiempo máximo de espera para hidratación
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
  timeout = 2000, // 2 segundos por defecto
}: HydrationWrapperProps) {
  const [isHydrated, setIsHydrated] = useState(skipHydrationCheck)
  const [isClient, setIsClient] = useState(false)
  const [hasError, setHasError] = useState(false)

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

      // Establecer un tiempo máximo de espera
      const timeoutTimer = setTimeout(() => {
        if (!isHydrated) {
          console.warn("Tiempo de hidratación excedido, forzando renderizado")
          setIsHydrated(true)
        }
      }, timeout)

      // Escuchar eventos de error durante la hidratación
      const handleError = () => {
        console.error("Error detectado durante la hidratación")
        setHasError(true)
      }

      window.addEventListener("error", handleError)

      return () => {
        clearTimeout(timer)
        clearTimeout(timeoutTimer)
        window.removeEventListener("error", handleError)
      }
    }
  }, [isClient, isHydrated, timeout])

  // Escuchar evento de inicialización de almacenamiento
  useEffect(() => {
    if (isClient) {
      const handleStorageInit = () => {
        console.log("Almacenamiento inicializado, completando hidratación")
        setIsHydrated(true)
      }

      window.addEventListener("storage-initialized", handleStorageInit)
      return () => window.removeEventListener("storage-initialized", handleStorageInit)
    }
  }, [isClient])

  // En caso de error, mostrar fallback
  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h2 className="text-xl font-bold mb-4">Error de hidratación</h2>
        <p className="mb-4">Ha ocurrido un error al cargar los datos necesarios.</p>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded"
          onClick={() => window.location.reload()}
        >
          Recargar la página
        </button>
      </div>
    )
  }

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

