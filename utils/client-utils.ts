"use client"

import type React from "react"

// Asegurarnos de que la función isBrowser esté correctamente implementada
export const isBrowser = typeof window !== "undefined"

// Función para ejecutar código solo en el navegador
export function runOnlyInBrowser(callback: () => void): void {
  if (isBrowser) {
    callback()
  }
}

/**
 * Hook personalizado para ejecutar código solo en el cliente
 * @param callback Función a ejecutar en el cliente
 * @param deps Dependencias del efecto (similar a useEffect)
 */
import { useEffect, useRef } from "react"

export function useClientEffect(callback: () => void | (() => void), deps: React.DependencyList = []): void {
  const isClient = useRef(false)

  useEffect(() => {
    if (!isClient.current) {
      isClient.current = true
    }
  }, [])

  useEffect(() => {
    if (isClient.current) {
      return callback()
    }
  }, deps)
}

/**
 * Obtiene el valor de una variable de entorno del cliente
 * Solo funciona con variables que empiezan con NEXT_PUBLIC_
 * @param key Nombre de la variable de entorno
 * @param defaultValue Valor por defecto si no existe
 */
export function getClientEnv(key: string, defaultValue = ""): string {
  if (!isBrowser) return defaultValue

  // En el cliente, las variables de entorno están en process.env
  const value = (window as any).__ENV__?.[key] || process.env?.[key] || defaultValue

  return value
}

/**
 * Detecta si el dispositivo actual es móvil basado en el ancho de la ventana
 * @param breakpoint Punto de quiebre para considerar móvil (por defecto 768px)
 */
export function isMobileDevice(breakpoint = 768): boolean {
  return runOnlyInBrowser(() => window.innerWidth < breakpoint) || false
}

/**
 * Detecta si el dispositivo actual es iOS
 */
export function isIOSDevice(): boolean {
  return (
    runOnlyInBrowser(() => {
      return (
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
      )
    }) || false
  )
}

/**
 * Obtiene un valor de localStorage de forma segura
 * @param key Clave a buscar
 * @param defaultValue Valor por defecto si no existe o hay error
 */
export function getLocalStorage<T>(key: string, defaultValue: T): T {
  if (!isBrowser) return defaultValue

  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    
    // Verificar si el string es un JSON válido antes de parsearlo
    try {
      return JSON.parse(item) as T;
    } catch (parseError) {
      console.warn(`Error al analizar JSON de localStorage para la clave ${key}:`, parseError);
      // Si hay un error al parsear, eliminar el valor corrupto
      localStorage.removeItem(key);
      return defaultValue;
    }
  } catch (error) {
    console.warn(`Error al leer de localStorage (${key}):`, error);
    return defaultValue;
  }
}

/**
 * Guarda un valor en localStorage de forma segura
 * @param key Clave para guardar
 * @param value Valor a guardar
 * @returns true si se guardó correctamente, false en caso contrario
 */
export function setLocalStorage(key: string, value: any): boolean {
  if (!isBrowser) return false

  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.error(`Error al guardar en localStorage (${key}):`, error)
    return false
  }
}

/**
 * Elimina un valor de localStorage de forma segura
 * @param key Clave a eliminar
 * @returns true si se eliminó correctamente, false en caso contrario
 */
export function removeLocalStorage(key: string): boolean {
  if (!isBrowser) return false

  try {
    localStorage.removeItem(key)
    return true
  } catch (error) {
    console.error(`Error al eliminar de localStorage (${key}):`, error)
    return false
  }
}

/**
 * Añade un event listener de forma segura
 * @param target Elemento al que añadir el listener
 * @param event Nombre del evento
 * @param callback Función a ejecutar
 * @param options Opciones del event listener
 */
export function safeAddEventListener(
  target: EventTarget,
  event: string,
  callback: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions,
): void {
  if (isBrowser) {
    target.addEventListener(event, callback, options)
  }
}

/**
 * Elimina un event listener de forma segura
 * @param target Elemento del que eliminar el listener
 * @param event Nombre del evento
 * @param callback Función a eliminar
 * @param options Opciones del event listener
 */
export function safeRemoveEventListener(
  target: EventTarget,
  event: string,
  callback: EventListenerOrEventListenerObject,
  options?: boolean | EventListenerOptions,
): void {
  if (isBrowser) {
    target.removeEventListener(event, callback, options)
  }
}

/**
 * Dispara un evento personalizado de forma segura
 * @param eventName Nombre del evento
 * @param detail Detalles del evento
 */
export function safeDispatchEvent(eventName: string, detail?: any): void {
  if (isBrowser) {
    const event = new CustomEvent(eventName, { detail })
    window.dispatchEvent(event)
  }
}

