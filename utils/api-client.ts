import { trackApiRequest, trackError } from "./analytics"
import { getCachedData, cacheData } from "./cache-utils"

// Opciones para las solicitudes API
interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  headers?: Record<string, string>
  body?: any
  cache?: boolean
  cacheDuration?: number
}

// Opciones por defecto
const DEFAULT_OPTIONS: ApiRequestOptions = {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
  },
  cache: false,
  cacheDuration: 5 * 60 * 1000, // 5 minutos
}

/**
 * Cliente API con soporte para caché y análisis
 */
export async function apiClient<T = any>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options }
  const { method, headers, body, cache, cacheDuration } = mergedOptions

  // Para solicitudes GET, intentar obtener de la caché primero
  if (cache && method === "GET") {
    const cacheKey = `api:${endpoint}`
    const cachedData = getCachedData<T>(cacheKey, cacheDuration)
    if (cachedData) {
      return cachedData
    }
  }

  // Preparar la solicitud
  const requestOptions: RequestInit = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  }

  // Registrar el tiempo de inicio para medir la duración
  const startTime = Date.now()

  try {
    // Realizar la solicitud
    const response = await fetch(endpoint, requestOptions)
    const duration = Date.now() - startTime

    // Analizar la respuesta
    let data: T
    const contentType = response.headers.get("content-type")

    if (contentType && contentType.includes("application/json")) {
      data = await response.json()
    } else {
      const text = await response.text()
      data = text as unknown as T
    }

    // Registrar la solicitud en el sistema de análisis
    trackApiRequest(endpoint, method, response.status, duration, { contentType, size: JSON.stringify(data).length })

    // Si la respuesta no es exitosa, lanzar un error
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    // Para solicitudes GET exitosas, almacenar en caché si está habilitado
    if (cache && method === "GET") {
      const cacheKey = `api:${endpoint}`
      cacheData(cacheKey, data, cacheDuration)
    }

    return data
  } catch (error) {
    // Registrar el error
    trackError("api_error", (error as Error).message, (error as Error).stack, { endpoint, method })

    // Relanzar el error para que el llamador pueda manejarlo
    throw error
  }
}

/**
 * Métodos de conveniencia para diferentes tipos de solicitudes
 */
export const api = {
  get: <T>(endpoint: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) => 
    apiClient<T>(endpoint, { ...options, method: 'GET' }),
    
  post: <T>(endpoint: string, body: any, options?: Omit<ApiRequestOptions, 'method'>) => 
    apiClient<T>(endpoint, { ...options, method: 'POST', body }),
    
  put: <T>(endpoint: string, body: any, options?: Omit<ApiRequestOptions, 'method'>) => 
    apiClient<T>(endpoint, { ...options, method: 'PUT', body }),
    
  patch: <T>(endpoint: string, body: any, options?: Omit<ApiRequestOptions, 'method'>) => 
    apiClient<T>(endpoint, { ...options, method: 'PATCH', body }),
    
  delete: <T>(endpoint: string, options?: Omit<ApiRequestOptions, 'method'>) => 
    apiClient<T>(endpoint, { ...options, method: 'DELETE' }),
    
  // Versión con caché habilitada por defecto
  cached: {
    get: <T>(endpoint: string, options?: Omit<ApiRequestOptions, 'method' | 'body' | 'cache'>) => 
      apiClient<T>(endpoint, { ...options, method: 'GET', cache: true })
  }
};

