import { Clinic, Cabin } from "@prisma/client"; // Importar tipos de Prisma

// Interfaces optimizadas para reducir el tamaño de las cookies
export interface OptimizedClinic {
  id: string
  prefix: string | null
  name: string
  city: string | null
  config: OptimizedClinicConfig
}

export interface OptimizedClinicConfig {
  openTime: string
  closeTime: string
  slotDuration: number
  activeCabins: OptimizedCabin[]
}

export interface OptimizedCabin {
  id: string
  code: string | null
  name: string
  color: string | null
}

/**
 * Optimiza los datos de una clínica para almacenarlos en cookies
 */
export function optimizeClinicForCookie(clinic: Clinic & { cabins?: Cabin[] }): OptimizedClinicConfig {
  const getScheduleValue = <K extends keyof Clinic['independentSchedule'] & keyof Clinic['linkedScheduleTemplate']>(
    key: K,
    defaultValue: NonNullable<Clinic['independentSchedule'][K]> | NonNullable<Clinic['linkedScheduleTemplate'][K]>
  ): NonNullable<Clinic['independentSchedule'][K]> | NonNullable<Clinic['linkedScheduleTemplate'][K]> => {
    const independentValue = (clinic as any).independentSchedule?.[key];
    if (independentValue !== undefined && independentValue !== null) return independentValue;
    const templateValue = (clinic as any).linkedScheduleTemplate?.[key];
    if (templateValue !== undefined && templateValue !== null) return templateValue;
    return defaultValue;
  };

  const openTime = getScheduleValue('openTime', "09:00");
  const closeTime = getScheduleValue('closeTime', "20:00");
  const slotDuration = Number(getScheduleValue('slotDuration', 15));

  return {
    openTime: openTime,
    closeTime: closeTime,
    slotDuration: slotDuration,
    activeCabins: (clinic.cabins || [])
      .filter(cabin => cabin.isActive)
      .map(cabin => ({ id: cabin.id, name: cabin.name, color: cabin.color, code: cabin.code }))
  };
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

