import type { Clinic, Cabin } from "@/mockData"

// Interfaces optimizadas para reducir el tamaño de las cookies
export interface OptimizedClinic {
  id: number
  prefix: string
  name: string
  city: string
  config: OptimizedClinicConfig
}

export interface OptimizedClinicConfig {
  openTime: string
  closeTime: string
  weekendOpenTime: string
  weekendCloseTime: string
  saturdayOpen: boolean
  sundayOpen: boolean
  slotDuration: number
  activeCabins: OptimizedCabin[]
}

export interface OptimizedCabin {
  id: number
  code: string
  name: string
  color: string
}

/**
 * Optimiza los datos de una clínica para almacenarlos en cookies
 */
export function optimizeClinicForCookie(clinic: Clinic): OptimizedClinic {
  // Filtrar solo las cabinas activas
  const activeCabins = clinic.cabins.filter((cabin) => cabin.isActive).map((cabin) => optimizeCabinForCookie(cabin))

  return {
    id: clinic.id,
    prefix: clinic.prefix,
    name: clinic.commercialName,
    city: clinic.city,
    config: {
      openTime: clinic.openTime,
      closeTime: clinic.closeTime,
      weekendOpenTime: clinic.weekendOpenTime,
      weekendCloseTime: clinic.weekendCloseTime,
      saturdayOpen: clinic.saturdayOpen,
      sundayOpen: clinic.sundayOpen,
      slotDuration: 15, // Valor por defecto
      activeCabins,
    },
  }
}

/**
 * Optimiza los datos de una cabina para almacenarlos en cookies
 */
export function optimizeCabinForCookie(cabin: Cabin): OptimizedCabin {
  return {
    id: cabin.id,
    code: cabin.code,
    name: cabin.name,
    color: cabin.color,
  }
}

/**
 * Comprime una cadena para reducir el tamaño
 * Nota: Esta es una implementación simple. Para producción,
 * considera usar una biblioteca de compresión como pako o lz-string
 */
export function compressString(str: string): string {
  if (typeof window === "undefined") return str

  try {
    // Usar btoa para codificar en base64 (compresión simple)
    return btoa(encodeURIComponent(str))
  } catch (error) {
    console.error("Error compressing string:", error)
    return str
  }
}

/**
 * Descomprime una cadena previamente comprimida
 */
export function decompressString(compressed: string): string {
  if (typeof window === "undefined") return compressed

  try {
    // Usar atob para decodificar desde base64
    return decodeURIComponent(atob(compressed))
  } catch (error) {
    console.error("Error decompressing string:", error)
    return compressed
  }
}

/**
 * Comprime y optimiza datos para cookies
 */
export function optimizeForCookie<T>(data: T): string {
  const jsonString = JSON.stringify(data)
  return compressString(jsonString)
}

/**
 * Descomprime y parsea datos de cookies
 */
export function parseFromCookie<T>(compressed: string, defaultValue: T): T {
  try {
    const jsonString = decompressString(compressed)
    return JSON.parse(jsonString) as T
  } catch (error) {
    console.error("Error parsing from cookie:", error)
    return defaultValue
  }
}

