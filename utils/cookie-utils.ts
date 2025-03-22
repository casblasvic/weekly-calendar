import Cookies from "js-cookie"
import { isBrowser } from "./client-utils"
import { trackCookieOperation } from "./analytics"
import { optimizeForCookie, parseFromCookie } from "./cookie-optimizer"

// Duración por defecto de las cookies (7 días)
const DEFAULT_EXPIRY_DAYS = 7

// Claves para cookies importantes del sistema
export const COOKIE_KEYS = {
  THEME: "theme",
  THEME_COLORS: "theme_colors",
  ACTIVE_CLINIC: "active_clinic",
  CLINICS: "clinics",
  USER_PREFERENCES: "user_preferences",
}

/**
 * Opciones para cookies
 */
export interface CookieOptions {
  expires?: number // días
  path?: string
  secure?: boolean
  sameSite?: "strict" | "lax" | "none"
}

/**
 * Obtiene el valor de una cookie
 * @param key Nombre de la cookie
 * @param defaultValue Valor por defecto si no existe
 */
export function getCookie<T>(key: string, defaultValue: T): T {
  if (!isBrowser) {
    return defaultValue
  }

  try {
    const cookieValue = Cookies.get(key)
    if (!cookieValue) {
      trackCookieOperation("read", key, false, { reason: "not_found" })
      return defaultValue
    }

    const parsedValue = parseFromCookie<T>(cookieValue, defaultValue)
    trackCookieOperation("read", key, true, { size: cookieValue.length })
    return parsedValue
  } catch (error) {
    trackCookieOperation("read", key, false, { error: (error as Error).message })
    console.error(`Error al leer cookie (${key}):`, error)
    return defaultValue
  }
}

/**
 * Establece una cookie con el valor especificado
 * @param key Nombre de la cookie
 * @param value Valor a guardar
 * @param options Opciones adicionales para la cookie
 */
export function setCookie<T>(key: string, value: T, options?: CookieOptions): boolean {
  if (!isBrowser) {
    return false
  }

  try {
    const defaultOptions = {
      expires: DEFAULT_EXPIRY_DAYS,
      path: "/",
      secure: window.location.protocol === "https:",
      sameSite: "lax" as const,
    }

    const cookieOptions = { ...defaultOptions, ...options }

    // Optimizar y comprimir el valor para reducir el tamaño
    const optimizedValue = optimizeForCookie(value)

    Cookies.set(key, optimizedValue, cookieOptions)
    trackCookieOperation("write", key, true, {
      size: optimizedValue.length,
      expires: cookieOptions.expires,
    })
    return true
  } catch (error) {
    trackCookieOperation("write", key, false, { error: (error as Error).message })
    console.error(`Error al guardar cookie (${key}):`, error)
    return false
  }
}

/**
 * Elimina una cookie
 * @param key Nombre de la cookie
 * @param options Opciones adicionales para la eliminación
 */
export function removeCookie(key: string, options?: Omit<CookieOptions, "expires">): boolean {
  if (!isBrowser) {
    return false
  }

  try {
    const defaultOptions = {
      path: "/",
      secure: window.location.protocol === "https:",
      sameSite: "lax" as const,
    }

    const cookieOptions = { ...defaultOptions, ...options }
    Cookies.remove(key, cookieOptions)
    trackCookieOperation("delete", key, true)
    return true
  } catch (error) {
    trackCookieOperation("delete", key, false, { error: (error as Error).message })
    console.error(`Error al eliminar cookie (${key}):`, error)
    return false
  }
}

/**
 * Sincroniza datos entre localStorage y cookies
 * - En el cliente: lee de localStorage y actualiza cookies
 * - En el servidor: las cookies ya están disponibles
 */
export function syncDataWithCookies<T>(key: string, defaultValue: T, options: CookieOptions = {}): T {
  if (typeof window === 'undefined') return defaultValue;

  try {
    // Primero, intentar obtener de cookies
    const cookieValue = getCookie<T>(key, defaultValue);
    const localData = localStorage.getItem(key);

    // Si hay datos en la cookie, sincronizar con localStorage y devolver
    if (cookieValue && typeof cookieValue === 'string') {
      // Parsear datos de la cookie
      const parsedData = parseJSONSafe<T>(cookieValue, defaultValue);
      
      // Sincronizar con localStorage
      try {
        localStorage.setItem(key, JSON.stringify(parsedData));
      } catch (e) {
        console.warn(`No se pudo almacenar en localStorage: ${e}`);
      }
      
      return parsedData;
    }
    
    // Si hay datos en localStorage pero no en cookie, sincronizar y devolver
    if (localData) {
      const localParsedData = parseJSONSafe<T>(localData, defaultValue);
      
      // Guardar en cookie
      setCookie(key, localParsedData, options);
      
      return localParsedData;
    }
    
    // Si no hay datos, establecer los valores por defecto
    setCookie(key, defaultValue, options);
    try {
      localStorage.setItem(key, JSON.stringify(defaultValue));
    } catch (e) {
      console.warn(`No se pudo almacenar en localStorage: ${e}`);
    }
    
    return defaultValue;
  } catch (error) {
    console.warn(`Error al sincronizar datos: ${error}`);
    return defaultValue;
  }
}

/**
 * Parsea datos JSON de forma segura, manejando errores
 */
export function parseJSONSafe<T>(jsonString: string | null, defaultValue: T): T {
  if (!jsonString) return defaultValue;
  
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.warn('Error al parsear JSON:', error);
    return defaultValue;
  }
}

