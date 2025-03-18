import { isBrowser } from "./client-utils"
import { trackCacheOperation } from "./analytics"

// Duración predeterminada de la caché: 5 minutos
const DEFAULT_CACHE_DURATION = 5 * 60 * 1000

interface CacheItem<T> {
  data: T
  timestamp: number
}

/**
 * Almacena datos en la caché (sessionStorage)
 */
export function cacheData<T>(key: string, data: T, duration?: number): void {
  if (isBrowser) {
    try {
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now(),
      }
      const jsonString = JSON.stringify(cacheItem)
      sessionStorage.setItem(key, jsonString)
      trackCacheOperation("write", key, true, { size: jsonString.length })
    } catch (error) {
      trackCacheOperation("write", key, false, { error: (error as Error).message })
      console.error("Error caching data:", error)
    }
  }
}

/**
 * Obtiene datos de la caché si no han expirado
 */
export function getCachedData<T>(key: string, cacheDuration = DEFAULT_CACHE_DURATION): T | null {
  if (!isBrowser) return null

  try {
    const cached = sessionStorage.getItem(key)
    if (!cached) {
      trackCacheOperation("read", key, false, { reason: "not_found" })
      return null
    }

    const cacheItem: CacheItem<T> = JSON.parse(cached)
    const isExpired = Date.now() - cacheItem.timestamp > cacheDuration

    if (isExpired) {
      trackCacheOperation("read", key, false, { reason: "expired" })
      return null
    }

    trackCacheOperation("read", key, true, {
      age: Date.now() - cacheItem.timestamp,
      size: cached.length,
    })

    return cacheItem.data
  } catch (error) {
    trackCacheOperation("read", key, false, { error: (error as Error).message })
    console.error("Error retrieving cached data:", error)
    return null
  }
}

/**
 * Elimina un elemento específico de la caché
 */
export function removeCachedItem(key: string): void {
  if (isBrowser) {
    try {
      sessionStorage.removeItem(key)
      trackCacheOperation("delete", key, true)
    } catch (error) {
      trackCacheOperation("delete", key, false, { error: (error as Error).message })
      console.error("Error removing cached item:", error)
    }
  }
}

/**
 * Limpia toda la caché
 */
export function clearCache(): void {
  if (isBrowser) {
    try {
      sessionStorage.clear()
      trackCacheOperation("clear", "all", true)
    } catch (error) {
      trackCacheOperation("clear", "all", false, { error: (error as Error).message })
      console.error("Error clearing cache:", error)
    }
  }
}

/**
 * Hook para obtener datos con caché
 * Primero intenta obtener datos de la caché, luego realiza la solicitud si es necesario
 */
export async function fetchWithCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  cacheDuration = DEFAULT_CACHE_DURATION,
): Promise<T> {
  // Intentar obtener de la caché primero
  const cachedData = getCachedData<T>(key, cacheDuration)
  if (cachedData) {
    return cachedData
  }

  // Si no hay datos en caché o han expirado, realizar la solicitud
  try {
    const startTime = Date.now()
    const freshData = await fetchFn()
    const duration = Date.now() - startTime

    cacheData(key, freshData, cacheDuration)
    trackCacheOperation("fetch", key, true, { duration })

    return freshData
  } catch (error) {
    trackCacheOperation("fetch", key, false, { error: (error as Error).message })
    console.error(`Error fetching data for key ${key}:`, error)
    throw error
  }
}

