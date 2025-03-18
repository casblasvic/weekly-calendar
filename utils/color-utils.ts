import type React from "react"
/**
 * Utilidades para el manejo de colores en la aplicación
 */

/**
 * Convierte colores hexadecimales abreviados (#RGB) a formato completo (#RRGGBB)
 * @param color Color en formato hexadecimal
 * @returns Color en formato hexadecimal completo
 */
export function expandHexColor(color: string): string {
  // Si no hay color o no es un color hexadecimal válido, devolver un color por defecto
  if (!color) return "#6b46c1" // Color morado por defecto

  // Si ya está en formato completo, devolverlo tal cual
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return color
  }

  // Si está en formato abreviado (#RGB), expandirlo a formato completo (#RRGGBB)
  if (/^#[0-9A-Fa-f]{3}$/.test(color)) {
    return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
  }

  // Si no es un color hexadecimal válido, devolver el color por defecto
  return "#6b46c1"
}

/**
 * Convierte un color hexadecimal a formato RGB
 * @param hex Color en formato hexadecimal
 * @returns Objeto con componentes RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Expandir el color si está en formato abreviado
  const fullHex = expandHexColor(hex)

  // Extraer componentes RGB
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex)

  if (!result) {
    return null
  }

  return {
    r: Number.parseInt(result[1], 16),
    g: Number.parseInt(result[2], 16),
    b: Number.parseInt(result[3], 16),
  }
}

/**
 * Genera una clase de Tailwind para un color hexadecimal
 * @param color Color en formato hexadecimal
 * @returns Clase de Tailwind para el color
 */
export function getTailwindColorClass(color: string): string {
  // Normalizar el color (quitar # y convertir a minúsculas)
  const normalizedColor = expandHexColor(color).replace("#", "").toLowerCase()

  // Mapeo de colores comunes a clases de Tailwind
  const colorMap: Record<string, string> = {
    ff0000: "bg-red-600",
    "00ff00": "bg-green-500",
    "0000ff": "bg-blue-600",
    ffff00: "bg-yellow-400",
    ff00ff: "bg-pink-500",
    "00ffff": "bg-cyan-500",
    "880000": "bg-red-900",
    "008800": "bg-green-900",
    "000088": "bg-blue-900",
    "888888": "bg-gray-500",
    "000000": "bg-black",
    ffffff: "bg-white text-gray-800", // Texto oscuro para fondo blanco
  }

  // Devolver la clase de Tailwind si existe, o una clase por defecto
  return colorMap[normalizedColor] || "bg-purple-600"
}

/**
 * Genera un estilo CSS para un color hexadecimal
 * @param color Color en formato hexadecimal
 * @returns Objeto de estilo CSS
 */
export function getColorStyle(color: string): React.CSSProperties {
  const expandedColor = expandHexColor(color)
  return { backgroundColor: expandedColor, color: "white" }
}

