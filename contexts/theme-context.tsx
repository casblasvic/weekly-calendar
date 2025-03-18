"use client"

import { createContext, useContext, useState, useEffect, useRef } from "react"
import type React from "react"
import { setCookie, syncDataWithCookies, COOKIE_KEYS, type CookieOptions } from "@/utils/cookie-utils"
import { isBrowser, runOnlyInBrowser } from "@/utils/client-utils"
import { compressData } from "@/utils/compression-utils"
import { useMobileDetection } from "@/hooks/use-mobile-detection"

// Definir un evento personalizado para cambios de tema
export const THEME_CHANGED_EVENT = "theme-colors-changed"

interface ThemeColors {
  primary: string
  secondary: string
  accent: string
  background: string
  text: string
  mobileColors?: {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
  }
}

interface ThemeContextType {
  colors: ThemeColors
  setColors: (colors: Partial<ThemeColors>, options?: SetColorsOptions) => void
  isMobile: boolean
  resetToDefaults: () => void
  deviceInfo: {
    isTablet: boolean
    isTouch: boolean
    orientation: "portrait" | "landscape"
  }
  debug: {
    lastUpdated: Date | null
    source: "cookie" | "localStorage" | "default" | null
    updateCount: number
    errors: Array<{ message: string; timestamp: Date }>
    isCompressed: boolean
    storageSize: {
      cookie: number
      localStorage: number
    }
  }
}

// Opciones para la función setColors
interface SetColorsOptions {
  /** Si es true, no se emitirá el evento de cambio de tema */
  silent?: boolean
  /** Opciones para la cookie */
  cookieOptions?: CookieOptions
  /** Si es true, no se guardará en localStorage */
  skipLocalStorage?: boolean
}

const defaultColors: ThemeColors = {
  primary: "rgb(147, 51, 234)", // Purple
  secondary: "#f3f4f6", // Light gray
  accent: "#4b5563", // Dark gray
  background: "#ffffff", // White
  text: "#1f2937", // Almost black
  mobileColors: {
    primary: "rgb(147, 51, 234)", // Can be different for mobile
    secondary: "#f3f4f6",
    accent: "#4b5563",
    background: "#ffffff",
    text: "#1f2937",
  },
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

// Clave para la cookie del tema
const THEME_COLORS_KEY = COOKIE_KEYS.THEME_COLORS

// Función para emitir el evento de cambio de tema
const emitThemeChangedEvent = (colors: ThemeColors) => {
  runOnlyInBrowser(() => {
    const event = new CustomEvent(THEME_CHANGED_EVENT, { detail: { colors } })
    window.dispatchEvent(event)
  })
}

// Función para estimar el tamaño de los datos en bytes
const estimateSize = (data: any): number => {
  if (!data) return 0
  return new TextEncoder().encode(JSON.stringify(data)).length
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [colors, setColorsState] = useState<ThemeColors>(defaultColors)
  const [initialized, setInitialized] = useState(false)

  // Estado para información de depuración
  const [debugInfo, setDebugInfo] = useState({
    lastUpdated: null as Date | null,
    source: null as "cookie" | "localStorage" | "default" | null,
    updateCount: 0,
    errors: [] as Array<{ message: string; timestamp: Date }>,
    isCompressed: false,
    storageSize: {
      cookie: 0,
      localStorage: 0,
    },
  })

  // Usar el nuevo hook para detectar dispositivo móvil
  const { isMobile, isTablet, isTouch, orientation } = useMobileDetection({
    breakpoint: 768,
    includeTablets: false, // No considerar tablets como móviles por defecto
    considerOrientation: true,
    detectTouch: true,
  })

  // Referencia para rastrear si estamos en el primer renderizado del servidor
  const isFirstRender = useRef(true)

  // Cargar colores del tema desde cookies (prioridad) o localStorage (fallback)
  useEffect(() => {
    if (!initialized) {
      try {
        // Usar syncDataWithCookies que ahora prioriza cookies sobre localStorage
        const result = syncDataWithCookies<ThemeColors>(THEME_COLORS_KEY, defaultColors, true)

        setColorsState(result.data)

        // Actualizar información de depuración
        setDebugInfo((prev) => ({
          ...prev,
          lastUpdated: new Date(),
          source: result.source,
          isCompressed: result.isCompressed || false,
          storageSize: {
            cookie: estimateSize(result.data),
            localStorage: isBrowser ? estimateSize(localStorage.getItem(THEME_COLORS_KEY)) : 0,
          },
        }))
      } catch (error) {
        console.warn("Error al cargar colores del tema:", error)
        // En caso de error, usar los colores por defecto
        setColorsState(defaultColors)

        // Registrar el error
        setDebugInfo((prev) => ({
          ...prev,
          lastUpdated: new Date(),
          source: "default",
          errors: [
            ...prev.errors,
            {
              message: error instanceof Error ? error.message : String(error),
              timestamp: new Date(),
            },
          ],
        }))
      } finally {
        setInitialized(true)
        isFirstRender.current = false
      }
    }
  }, [initialized])

  // Función para actualizar los colores del tema
  const setColors = (newColors: Partial<ThemeColors>, options: SetColorsOptions = {}) => {
    const { silent = false, cookieOptions, skipLocalStorage = false } = options

    setColorsState((prev) => {
      const updatedColors = { ...prev, ...newColors }

      try {
        // Comprimir datos para reducir tamaño
        const compressedColors = compressData(updatedColors)
        const isCompressed = compressedColors !== updatedColors

        // Guardar en cookie (prioridad)
        setCookie(THEME_COLORS_KEY, compressedColors, cookieOptions)

        // También guardar en localStorage como fallback, a menos que se especifique lo contrario
        if (!skipLocalStorage && isBrowser) {
          try {
            localStorage.setItem(THEME_COLORS_KEY, JSON.stringify(updatedColors))
          } catch (localStorageError) {
            console.warn("No se pudo guardar el tema en localStorage:", localStorageError)

            // Registrar el error
            setDebugInfo((prev) => ({
              ...prev,
              errors: [
                ...prev.errors,
                {
                  message: `Error al guardar en localStorage: ${localStorageError instanceof Error ? localStorageError.message : String(localStorageError)}`,
                  timestamp: new Date(),
                },
              ],
            }))
          }
        }

        // Emitir evento de cambio de tema, a menos que se especifique silent
        if (!silent) {
          emitThemeChangedEvent(updatedColors)
        }

        // Actualizar información de depuración
        setDebugInfo((prev) => ({
          ...prev,
          lastUpdated: new Date(),
          updateCount: prev.updateCount + 1,
          isCompressed,
          storageSize: {
            cookie: estimateSize(compressedColors),
            localStorage: isBrowser && !skipLocalStorage ? estimateSize(updatedColors) : prev.storageSize.localStorage,
          },
        }))
      } catch (error) {
        console.error("Error al guardar colores del tema:", error)

        // Registrar el error
        setDebugInfo((prev) => ({
          ...prev,
          errors: [
            ...prev.errors,
            {
              message: `Error al guardar colores: ${error instanceof Error ? error.message : String(error)}`,
              timestamp: new Date(),
            },
          ],
        }))

        // Intentar guardar sin compresión como último recurso
        try {
          setCookie(THEME_COLORS_KEY, updatedColors, cookieOptions)

          // Actualizar información de depuración
          setDebugInfo((prev) => ({
            ...prev,
            lastUpdated: new Date(),
            updateCount: prev.updateCount + 1,
            isCompressed: false,
            storageSize: {
              cookie: estimateSize(updatedColors),
              localStorage: prev.storageSize.localStorage,
            },
          }))
        } catch (fallbackError) {
          console.error("Error crítico al guardar colores del tema:", fallbackError)

          // Registrar el error
          setDebugInfo((prev) => ({
            ...prev,
            errors: [
              ...prev.errors,
              {
                message: `Error crítico: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
                timestamp: new Date(),
              },
            ],
          }))
        }
      }

      return updatedColors
    })
  }

  // Función para restablecer los colores por defecto
  const resetToDefaults = () => {
    setColors(defaultColors, {
      cookieOptions: {
        expires: 365, // Establecer una fecha de expiración larga para la cookie
      },
    })
  }

  // Información adicional sobre el dispositivo
  const deviceInfo = {
    isTablet,
    isTouch,
    orientation,
  }

  return (
    <ThemeContext.Provider
      value={{
        colors,
        setColors,
        isMobile,
        resetToDefaults,
        deviceInfo,
        debug: debugInfo,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme debe usarse dentro de un ThemeProvider")
  }
  return context
}

