"use client"

import { useState, useEffect } from "react"
import { isBrowser, runOnlyInBrowser } from "@/utils/client-utils"

export interface MobileDetectionOptions {
  /** Ancho de pantalla por debajo del cual se considera móvil (por defecto 768px) */
  breakpoint?: number
  /** Si es true, también detecta tablets como dispositivos móviles */
  includeTablets?: boolean
  /** Si es true, considera la preferencia de reducción de movimiento del usuario */
  considerReducedMotion?: boolean
  /** Si es true, considera la orientación del dispositivo */
  considerOrientation?: boolean
  /** Si es true, detecta dispositivos táctiles como móviles */
  detectTouch?: boolean
}

export interface MobileDetectionResult {
  /** Si el dispositivo actual es móvil */
  isMobile: boolean
  /** Si el dispositivo actual es una tablet (solo si includeTablets es true) */
  isTablet: boolean
  /** Si el dispositivo actual tiene pantalla táctil */
  isTouch: boolean
  /** Si el usuario prefiere reducción de movimiento */
  prefersReducedMotion: boolean
  /** Orientación actual del dispositivo: 'portrait' o 'landscape' */
  orientation: "portrait" | "landscape"
  /** Ancho actual de la ventana */
  windowWidth: number
  /** Altura actual de la ventana */
  windowHeight: number
}

const defaultOptions: MobileDetectionOptions = {
  breakpoint: 768,
  includeTablets: true,
  considerReducedMotion: false,
  considerOrientation: true,
  detectTouch: true,
}

/**
 * Hook para detectar si el dispositivo actual es móvil
 * @param options Opciones de configuración
 * @returns Objeto con información sobre el dispositivo
 */
export function useMobileDetection(options: MobileDetectionOptions = {}): MobileDetectionResult {
  const opts = { ...defaultOptions, ...options }

  // Valores iniciales seguros para SSR
  const [result, setResult] = useState<MobileDetectionResult>({
    isMobile: false,
    isTablet: false,
    isTouch: false,
    prefersReducedMotion: false,
    orientation: "portrait",
    windowWidth: 0,
    windowHeight: 0,
  })

  useEffect(() => {
    if (!isBrowser) return

    // Función para actualizar todos los valores
    const updateValues = () => {
      const windowWidth = window.innerWidth
      const windowHeight = window.innerHeight

      // Detectar si es móvil basado en el ancho de la ventana
      const isMobileByWidth = windowWidth < opts.breakpoint!

      // Detectar si es tablet (entre móvil y desktop)
      const isTablet = windowWidth >= 768 && windowWidth <= 1024

      // Detectar si tiene pantalla táctil
      const isTouch = opts.detectTouch ? "ontouchstart" in window || navigator.maxTouchPoints > 0 : false

      // Detectar preferencia de reducción de movimiento
      const prefersReducedMotion = opts.considerReducedMotion
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false

      // Detectar orientación
      const orientation = opts.considerOrientation
        ? windowWidth > windowHeight
          ? "landscape"
          : "portrait"
        : "portrait"

      // Determinar si es móvil considerando todos los factores
      let isMobile = isMobileByWidth

      // Si includeTablets es true, considerar tablets como móviles
      if (opts.includeTablets && isTablet) {
        isMobile = true
      }

      setResult({
        isMobile,
        isTablet,
        isTouch,
        prefersReducedMotion,
        orientation,
        windowWidth,
        windowHeight,
      })
    }

    // Actualizar valores inicialmente
    updateValues()

    // Actualizar valores cuando cambia el tamaño de la ventana
    window.addEventListener("resize", updateValues)

    // Actualizar valores cuando cambia la orientación
    if (opts.considerOrientation) {
      window.addEventListener("orientationchange", updateValues)
    }

    // Actualizar valores cuando cambia la preferencia de reducción de movimiento
    if (opts.considerReducedMotion) {
      const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
      reducedMotionQuery.addEventListener("change", updateValues)
    }

    // Limpiar event listeners
    return () => {
      window.removeEventListener("resize", updateValues)

      if (opts.considerOrientation) {
        window.removeEventListener("orientationchange", updateValues)
      }

      if (opts.considerReducedMotion) {
        const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
        reducedMotionQuery.removeEventListener("change", updateValues)
      }
    }
  }, [opts.breakpoint, opts.includeTablets, opts.considerReducedMotion, opts.considerOrientation, opts.detectTouch])

  return result
}

/**
 * Detecta si el dispositivo actual es móvil (versión simple)
 * Esta función es segura para usar en cualquier contexto (cliente o servidor)
 * @param breakpoint Ancho de pantalla por debajo del cual se considera móvil
 * @returns true si el dispositivo es móvil, false en caso contrario o en el servidor
 */
export function isMobileDevice(breakpoint = 768): boolean {
  return runOnlyInBrowser(() => window.innerWidth < breakpoint) || false
}

/**
 * Detecta si el dispositivo actual es una tablet
 * Esta función es segura para usar en cualquier contexto (cliente o servidor)
 * @returns true si el dispositivo es una tablet, false en caso contrario o en el servidor
 */
export function isTabletDevice(): boolean {
  return (
    runOnlyInBrowser(() => {
      const width = window.innerWidth
      return width >= 768 && width <= 1024
    }) || false
  )
}

/**
 * Detecta si el dispositivo actual tiene pantalla táctil
 * Esta función es segura para usar en cualquier contexto (cliente o servidor)
 * @returns true si el dispositivo tiene pantalla táctil, false en caso contrario o en el servidor
 */
export function isTouchDevice(): boolean {
  return (
    runOnlyInBrowser(() => {
      return "ontouchstart" in window || navigator.maxTouchPoints > 0
    }) || false
  )
}

