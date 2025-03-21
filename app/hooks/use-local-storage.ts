"use client"

import { useState, useEffect } from 'react'

// Hook personalizado para utilizar localStorage
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  // Obtener el valor inicial del localStorage o usar el valor predeterminado
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }

    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(`Error al leer '${key}' de localStorage:`, error)
      return initialValue
    }
  })

  // Actualizar localStorage cuando cambia el valor
  const setValue = (value: T) => {
    try {
      setStoredValue(value)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(value))
      }
    } catch (error) {
      console.error(`Error al escribir '${key}' en localStorage:`, error)
    }
  }

  // Sincronizar con otros tabs/ventanas
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          setStoredValue(JSON.parse(e.newValue))
        } catch (error) {
          console.error(`Error al sincronizar '${key}' desde otro tab:`, error)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [key])

  return [storedValue, setValue]
} 