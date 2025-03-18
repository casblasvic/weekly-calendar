"use client"

/**
 * Utilidades para manejar la hidratación segura en Next.js
 */

import { useEffect, useState } from "react"
import React from "react"

/**
 * Verifica si el código se está ejecutando en el navegador
 */
export const isBrowser = typeof window !== "undefined"

/**
 * Verifica si el componente está hidratado (renderizado en el cliente)
 * @returns {boolean} true si el componente está hidratado
 */
export function isHydrated(): boolean {
  return isBrowser
}

/**
 * Hook personalizado para verificar si el componente está hidratado
 * @returns {boolean} true si el componente está hidratado
 */
export function useIsHydrated(): boolean {
  const [hydrated, setHydrated] = React.useState(false)

  React.useEffect(() => {
    setHydrated(true)
  }, [])

  return hydrated
}

/**
 * Componente que renderiza su contenido solo cuando está hidratado
 * @param {Object} props - Propiedades del componente
 * @param {React.ReactNode} props.children - Contenido a renderizar cuando esté hidratado
 * @param {React.ReactNode} props.fallback - Contenido a renderizar mientras no esté hidratado
 * @returns {React.ReactNode} El contenido o el fallback
 */
export function HydrationGuard({
  children,
  fallback = null,
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
}): React.ReactNode {
  const isHydrated = useIsHydrated()

  if (!isHydrated) {
    return fallback
  }

  return children
}

/**
 * Ejecuta una función solo en el cliente
 * @param {Function} fn - Función a ejecutar
 * @returns {any} El resultado de la función o undefined si no estamos en el cliente
 */
export function runOnlyInClient<T>(fn: () => T): T | undefined {
  if (isBrowser) {
    return fn()
  }
  return undefined
}

/**
 * Obtiene un valor de localStorage con fallback seguro para SSR
 * @param {string} key - Clave en localStorage
 * @param {T} defaultValue - Valor por defecto si no existe o estamos en el servidor
 * @returns {T} El valor almacenado o el valor por defecto
 */
export function getFromStorageSafe<T>(key: string, defaultValue: T): T {
  if (!isBrowser) {
    return defaultValue
  }

  try {
    const item = localStorage.getItem(key)
    if (item === null) {
      return defaultValue
    }
    return JSON.parse(item) as T
  } catch (error) {
    console.error(`Error al leer de localStorage (${key}):`, error)
    return defaultValue
  }
}

/**
 * Guarda un valor en localStorage de forma segura para SSR
 * @param {string} key - Clave en localStorage
 * @param {any} value - Valor a guardar
 * @returns {boolean} true si se guardó correctamente
 */
export function saveToStorageSafe<T>(key: string, value: T): boolean {
  if (!isBrowser) {
    return false
  }

  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.error(`Error al guardar en localStorage (${key}):`, error)
    return false
  }
}

/**
 * Hook personalizado para hidratar datos de manera segura
 * @param serverData Datos iniciales del servidor
 * @param clientDataFn Función que obtiene los datos del cliente (localStorage, etc.)
 * @param isEqual Función opcional para comparar si los datos son iguales (evita re-renders innecesarios)
 * @returns Datos hidratados y un flag que indica si la hidratación se ha completado
 */
export function useHydratedData<T>(
  serverData: T,
  clientDataFn: () => T | null,
  isEqual: (a: T, b: T) => boolean = (a, b) => JSON.stringify(a) === JSON.stringify(b),
): [T, boolean] {
  // Inicializar con los datos del servidor
  const [data, setData] = useState<T>(serverData)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    // Solo ejecutar en el cliente
    if (typeof window === "undefined") return

    // Obtener datos del cliente
    const clientData = clientDataFn()

    // Si hay datos del cliente y son diferentes a los del servidor, actualizar
    if (clientData && !isEqual(clientData, data)) {
      setData(clientData)
    }

    // Marcar como hidratado
    setIsHydrated(true)
  }, [])

  return [data, isHydrated]
}

/**
 * Función para combinar datos del servidor con datos del cliente
 * @param serverData Datos iniciales del servidor
 * @param clientData Datos del cliente (localStorage, etc.)
 * @returns Datos combinados
 */
export function mergeServerClientData<T extends Record<string, any>>(serverData: T, clientData: Partial<T>): T {
  return {
    ...serverData,
    ...clientData,
  }
}

/**
 * Función para determinar si estamos en el primer render del servidor
 * @returns true si estamos en el primer render del servidor
 */
export function isServerFirstRender(): boolean {
  return typeof window === "undefined" || !window.__NEXT_DATA__?.props?.pageProps
}

// Añadir la propiedad __NEXT_DATA__ a Window
declare global {
  interface Window {
    __NEXT_DATA__?: {
      props?: {
        pageProps?: any
      }
    }
  }
}

