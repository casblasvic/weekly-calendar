"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
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
  timeout = 200, // Reducido para una respuesta más rápida
}: HydrationWrapperProps) {
  const [isHydrated, setIsHydrated] = useState(skipHydrationCheck)
  const [isClient, setIsClient] = useState(false)
  
  // Para evitar parpadeos, usamos una ref para rastrear si la hidratación está en curso
  const hydrationInProgressRef = useRef(false);

  // Detectar si estamos en el cliente de forma inmediata
  useEffect(() => {
    // Marcar como cliente inmediatamente
    setIsClient(true)
    
    // Si ya estamos hidratados o la hidratación está en curso, no hacer nada
    if (isHydrated || hydrationInProgressRef.current) return;
    
    // Marcar que la hidratación está en curso
    hydrationInProgressRef.current = true;
    
    // Hidratar inmediatamente sin esperar un frame
    setIsHydrated(true);
    
    // No necesitamos un timeout adicional ya que estamos hidratando inmediatamente
  }, [isHydrated]);

  // Si estamos en el cliente y estamos hidratados (o saltamos la verificación), mostrar el contenido
  if (isClient && isHydrated) {
    return <>{children}</>
  }

  // Durante la transición, mostrar componente de carga muy simple
  if (isClient) {
    return loadingComponent
  }

  // En el servidor, mostrar fallback
  return fallback
}

