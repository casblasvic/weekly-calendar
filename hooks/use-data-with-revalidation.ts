"use client"

import { useState, useEffect } from "react"
import { getCookie, setCookie } from "@/utils/cookie-utils"
import { getCachedData, cacheData } from "@/utils/cache-utils"
import { isBrowser } from "@/utils/client-utils"

interface UseDataWithRevalidationOptions<T> {
  cookieKey: string
  cacheKey: string
  fetchFn: () => Promise<T>
  defaultValue: T
  revalidateOnMount?: boolean
  cacheDuration?: number
}

/**
 * Hook personalizado que implementa una estrategia de revalidación
 * 1. Intenta obtener datos de la cookie (disponible en SSR)
 * 2. Luego intenta obtener datos de la caché (más rápido que una solicitud)
 * 3. Finalmente, realiza una solicitud para obtener datos frescos
 */
export function useDataWithRevalidation<T>({
  cookieKey,
  cacheKey,
  fetchFn,
  defaultValue,
  revalidateOnMount = true,
  cacheDuration = 5 * 60 * 1000, // 5 minutos por defecto
}: UseDataWithRevalidationOptions<T>) {
  const [data, setData] = useState<T>(defaultValue)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Función para obtener datos frescos
  const revalidate = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const freshData = await fetchFn()
      setData(freshData)

      // Actualizar caché y cookie
      if (isBrowser) {
        cacheData(cacheKey, freshData, cacheDuration)
        setCookie(cookieKey, freshData)
      }

      return freshData
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Error desconocido")
      setError(error)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  // Efecto para cargar datos iniciales y revalidar
  useEffect(() => {
    // Paso 1: Intentar obtener datos de la cookie (disponible en SSR)
    const cookieData = getCookie<T>(cookieKey, defaultValue)
    if (cookieData !== defaultValue) {
      setData(cookieData)
    }

    // Paso 2: Intentar obtener datos de la caché (más rápido que una solicitud)
    if (isBrowser) {
      const cachedData = getCachedData<T>(cacheKey, cacheDuration)
      if (cachedData) {
        setData(cachedData)
        setIsLoading(false)
      }
    }

    // Paso 3: Revalidar con datos frescos si es necesario
    if (revalidateOnMount) {
      revalidate()
    } else {
      setIsLoading(false)
    }
  }, [cookieKey, cacheKey, revalidateOnMount])

  return { data, isLoading, error, revalidate }
}

