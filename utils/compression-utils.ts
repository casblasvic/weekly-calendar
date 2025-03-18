/**
 * Utilidades para comprimir y descomprimir datos
 * Esto ayuda a reducir el tamaño de los datos almacenados en cookies
 */

import { isBrowser } from "./client-utils"

/**
 * Comprime datos para reducir su tamaño
 * @param data Datos a comprimir
 * @returns Datos comprimidos
 */
export function compressData<T>(data: T): T {
  // En un entorno de servidor, devolver los datos sin comprimir
  if (!isBrowser) return data

  try {
    // Convertir a JSON
    const jsonString = JSON.stringify(data)

    // Para datos pequeños, no comprimir
    if (jsonString.length < 500) return data

    // Comprimir usando LZString si está disponible
    if (typeof window !== "undefined" && "LZString" in window) {
      // @ts-ignore - LZString podría estar disponible globalmente
      const compressed = window.LZString.compressToUTF16(jsonString)
      return { __compressed: compressed } as unknown as T
    }

    // Si no hay LZString, intentar usar btoa para una compresión básica
    const compressed = btoa(jsonString)
    return { __compressed_b64: compressed } as unknown as T
  } catch (error) {
    console.warn("Error al comprimir datos:", error)
    return data
  }
}

/**
 * Descomprime datos previamente comprimidos
 * @param data Datos comprimidos
 * @returns Datos descomprimidos
 */
export function decompressData<T>(data: any): T {
  // En un entorno de servidor, devolver los datos sin descomprimir
  if (!isBrowser) return data as T

  try {
    // Verificar si los datos están comprimidos
    if (data && typeof data === "object") {
      // Datos comprimidos con LZString
      if ("__compressed" in data && typeof data.__compressed === "string") {
        // @ts-ignore - LZString podría estar disponible globalmente
        if (typeof window !== "undefined" && "LZString" in window) {
          // @ts-ignore
          const decompressed = window.LZString.decompressFromUTF16(data.__compressed)
          return JSON.parse(decompressed)
        }
      }

      // Datos comprimidos con btoa
      if ("__compressed_b64" in data && typeof data.__compressed_b64 === "string") {
        const decompressed = atob(data.__compressed_b64)
        return JSON.parse(decompressed)
      }
    }

    // Si no está comprimido, devolver tal cual
    return data as T
  } catch (error) {
    console.warn("Error al descomprimir datos:", error)
    return data as T
  }
}

/**
 * Estima el tamaño en bytes de un objeto
 * @param obj Objeto a medir
 * @returns Tamaño aproximado en bytes
 */
export function estimateSize(obj: any): number {
  if (!isBrowser) return 0

  try {
    const jsonString = JSON.stringify(obj)
    return new Blob([jsonString]).size
  } catch (error) {
    console.warn("Error al estimar tamaño:", error)
    return 0
  }
}

/**
 * Verifica si un objeto excede un tamaño máximo
 * @param obj Objeto a verificar
 * @param maxSizeKB Tamaño máximo en KB
 * @returns true si excede el tamaño máximo
 */
export function exceedsMaxSize(obj: any, maxSizeKB = 4): boolean {
  const sizeInBytes = estimateSize(obj)
  return sizeInBytes > maxSizeKB * 1024
}

