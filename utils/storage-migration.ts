"use client"

import { isBrowser } from "./client-utils"
import { getCookie, setCookie, COOKIE_KEYS, type CookieOptions } from "./cookie-utils"
import { useEffect } from "react"

// Claves conocidas en localStorage que necesitan ser migradas
export const KNOWN_STORAGE_KEYS = {
  // Claves de tema
  THEME: "theme",
  THEME_COLORS: "theme_colors",

  // Claves de clínica
  ACTIVE_CLINIC: "activeClinic",
  ACTIVE_CLINIC_KEY: "activeClinicKey",
  CLINICS: "clinics",
  CLINICS_KEY: "clinicsKey",

  // Claves de agenda
  AGENDA_OPEN_TIME: "agenda_open_time",
  AGENDA_CLOSE_TIME: "agenda_close_time",
  AGENDA_TIMESTAMP: "agenda_timestamp",
  ACTIVE_CLINIC_ID: "activeClinicId",

  // Otras claves
  USER_PREFERENCES: "user_preferences",
  LAST_VISITED: "last_visited",
}

// Mapeo de claves de localStorage a claves de cookies
export const STORAGE_TO_COOKIE_MAP: Record<string, string> = {
  [KNOWN_STORAGE_KEYS.THEME]: COOKIE_KEYS.THEME,
  [KNOWN_STORAGE_KEYS.THEME_COLORS]: COOKIE_KEYS.THEME_COLORS,
  [KNOWN_STORAGE_KEYS.ACTIVE_CLINIC]: COOKIE_KEYS.ACTIVE_CLINIC,
  [KNOWN_STORAGE_KEYS.ACTIVE_CLINIC_KEY]: COOKIE_KEYS.ACTIVE_CLINIC,
  [KNOWN_STORAGE_KEYS.CLINICS]: COOKIE_KEYS.CLINICS,
  [KNOWN_STORAGE_KEYS.CLINICS_KEY]: COOKIE_KEYS.CLINICS,
  [KNOWN_STORAGE_KEYS.USER_PREFERENCES]: COOKIE_KEYS.USER_PREFERENCES,
}

// Opciones por defecto para las cookies
const DEFAULT_COOKIE_OPTIONS: CookieOptions = {
  expires: 30, // 30 días
  path: "/",
  secure: isBrowser ? window.location.protocol === "https:" : false,
  sameSite: "lax",
}

/**
 * Migra una clave específica de localStorage a cookies
 * @param storageKey Clave en localStorage
 * @param cookieKey Clave para la cookie (si es diferente)
 * @param options Opciones para la cookie
 * @returns true si la migración fue exitosa, false en caso contrario
 */
export function migrateKey(storageKey: string, cookieKey?: string, options?: CookieOptions): boolean {
  if (!isBrowser) return false

  try {
    // Determinar la clave de la cookie
    const targetCookieKey = cookieKey || STORAGE_TO_COOKIE_MAP[storageKey] || storageKey

    // Verificar si ya existe en cookies (para no sobrescribir)
    const existingCookieValue = getCookie(targetCookieKey, null)
    if (existingCookieValue !== null) {
      console.log(`La cookie ${targetCookieKey} ya existe, no se sobrescribirá`)
      return true
    }

    // Obtener el valor de localStorage
    const value = localStorage.getItem(storageKey)
    if (!value) {
      // No hay valor que migrar
      return true
    }

    // Parsear el valor
    let parsedValue
    try {
      parsedValue = JSON.parse(value)
    } catch (e) {
      // Si no es JSON válido, usar el valor como string
      parsedValue = value
    }

    // Establecer la cookie con las opciones combinadas
    const mergedOptions = { ...DEFAULT_COOKIE_OPTIONS, ...options }
    const success = setCookie(targetCookieKey, parsedValue, mergedOptions)

    if (success) {
      console.log(`Migrado con éxito: ${storageKey} -> ${targetCookieKey}`)
    } else {
      console.warn(`No se pudo migrar: ${storageKey} -> ${targetCookieKey}`)
    }

    return success
  } catch (error) {
    console.error(`Error al migrar ${storageKey}:`, error)
    return false
  }
}

/**
 * Migra todas las claves conocidas de localStorage a cookies
 * @param options Opciones para las cookies
 * @returns Objeto con resultados de la migración
 */
export function migrateAllKnownKeys(options?: CookieOptions): {
  successful: string[]
  failed: string[]
} {
  if (!isBrowser) {
    return { successful: [], failed: [] }
  }

  const successful: string[] = []
  const failed: string[] = []

  // Migrar todas las claves conocidas
  Object.values(KNOWN_STORAGE_KEYS).forEach((key) => {
    const success = migrateKey(key, undefined, options)
    if (success) {
      successful.push(key)
    } else {
      failed.push(key)
    }
  })

  return { successful, failed }
}

/**
 * Migra todas las claves de localStorage a cookies
 * @param options Opciones para las cookies
 * @returns Objeto con resultados de la migración
 */
export function migrateAllLocalStorage(options?: CookieOptions): {
  successful: string[]
  failed: string[]
} {
  if (!isBrowser) {
    return { successful: [], failed: [] }
  }

  const successful: string[] = []
  const failed: string[] = []

  // Obtener todas las claves de localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) {
      const success = migrateKey(key, undefined, options)
      if (success) {
        successful.push(key)
      } else {
        failed.push(key)
      }
    }
  }

  return { successful, failed }
}

/**
 * Verifica si una migración es necesaria
 * @returns true si hay datos en localStorage que no están en cookies
 */
export function isMigrationNeeded(): boolean {
  if (!isBrowser) return false

  // Verificar claves conocidas
  for (const storageKey of Object.values(KNOWN_STORAGE_KEYS)) {
    const cookieKey = STORAGE_TO_COOKIE_MAP[storageKey] || storageKey

    // Si hay datos en localStorage pero no en cookies, se necesita migración
    if (localStorage.getItem(storageKey) !== null && getCookie(cookieKey, null) === null) {
      return true
    }
  }

  return false
}

/**
 * Ejecuta la migración automática si es necesario
 * @param options Opciones para las cookies
 * @returns Resultado de la migración o null si no fue necesaria
 */
export function runAutoMigration(options?: CookieOptions): {
  successful: string[]
  failed: string[]
} | null {
  if (!isBrowser) return null

  // Verificar si la migración es necesaria
  if (!isMigrationNeeded()) {
    return null
  }

  // Ejecutar la migración de claves conocidas
  return migrateAllKnownKeys(options)
}

/**
 * Hook para usar en _app.tsx o layout.tsx para migrar datos automáticamente
 * @param options Opciones para las cookies
 */
export function useMigration(options?: CookieOptions): void {
  useEffect(() => {
    if (!isBrowser) return
    // Ejecutar migración automática al cargar la aplicación
    const migrationResult = runAutoMigration(options)

    if (migrationResult) {
      console.log("Migración automática completada:", migrationResult)
    }
  }, [options])
}

/**
 * Comprueba el tamaño de los datos en localStorage para verificar si caben en cookies
 * @returns Objeto con información sobre el tamaño de los datos
 */
export function checkStorageSize(): {
  totalSize: number
  largeItems: Array<{ key: string; size: number }>
  willFitInCookies: boolean
} {
  if (!isBrowser) {
    return { totalSize: 0, largeItems: [], willFitInCookies: true }
  }

  let totalSize = 0
  const largeItems: Array<{ key: string; size: number }> = []

  // Tamaño máximo recomendado para cookies (4KB)
  const MAX_COOKIE_SIZE = 4 * 1024

  // Verificar cada elemento en localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) {
      const value = localStorage.getItem(key) || ""
      const size = value.length

      totalSize += size

      // Si el elemento es grande (más de 1KB), añadirlo a la lista
      if (size > 1024) {
        largeItems.push({ key, size })
      }
    }
  }

  // Determinar si los datos cabrán en cookies
  const willFitInCookies = totalSize < MAX_COOKIE_SIZE

  return { totalSize, largeItems, willFitInCookies }
}

