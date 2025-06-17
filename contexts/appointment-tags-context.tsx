"use client"

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from "react"

// Interfaz para la etiqueta de cita
export interface AppointmentTag {
  id: string
  name: string
  color: string
  description?: string
  isActive: boolean
  systemId: string
  createdAt: string
  updatedAt: string
}

// Interfaz para el contexto
interface AppointmentTagsContextType {
  tags: AppointmentTag[]
  loading: boolean
  error: string | null
  fetchTags: () => Promise<void>
  createTag: (tag: Omit<AppointmentTag, 'id' | 'systemId' | 'createdAt' | 'updatedAt'>) => Promise<AppointmentTag | null>
  updateTag: (id: string, data: Partial<AppointmentTag>) => Promise<AppointmentTag | null>
  deleteTag: (id: string) => Promise<boolean>
  getTags: () => AppointmentTag[]
  getTagById: (id: string) => AppointmentTag | undefined
}

// Crear el contexto
const AppointmentTagsContext = createContext<AppointmentTagsContextType | undefined>(undefined)

// Caché para evitar recargas innecesarias
let tagsCache: AppointmentTag[] | null = null
let lastFetchTime: number | null = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

// Proveedor del contexto
export function AppointmentTagsProvider({ children }: { children: ReactNode }) {
  const [tags, setTags] = useState<AppointmentTag[]>(tagsCache || [])
  const [loading, setLoading] = useState(!tagsCache)
  const [error, setError] = useState<string | null>(null)

  // Cargar etiquetas desde la API con caché
  const fetchTags = useCallback(async (forceRefresh = false) => {
    // Si tenemos caché válido y no forzamos refresh, usar el caché
    if (!forceRefresh && tagsCache && lastFetchTime && (Date.now() - lastFetchTime < CACHE_DURATION)) {
      setTags(tagsCache)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/tags')
      
      if (!response.ok) {
        throw new Error('Error al cargar las etiquetas')
      }
      
      const data = await response.json()
      const loadedTags = Array.isArray(data) ? data : []
      
      // Actualizar caché
      tagsCache = loadedTags
      lastFetchTime = Date.now()
      
      setTags(loadedTags)
    } catch (err) {
      console.error('Error fetching tags:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  // Crear etiqueta
  const createTag = useCallback(async (tagData: Omit<AppointmentTag, 'id' | 'systemId' | 'createdAt' | 'updatedAt'>): Promise<AppointmentTag | null> => {
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tagData),
      })

      if (!response.ok) {
        throw new Error('Error al crear la etiqueta')
      }

      const newTag = await response.json()
      
      // Actualizar el estado local y caché inmediatamente
      const updatedTags = [...tags, newTag]
      setTags(updatedTags)
      tagsCache = updatedTags
      
      return newTag
    } catch (err) {
      console.error('Error creating tag:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      return null
    }
  }, [tags])

  // Actualizar etiqueta
  const updateTag = useCallback(async (id: string, data: Partial<AppointmentTag>): Promise<AppointmentTag | null> => {
    try {
      const response = await fetch(`/api/tags/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Error al actualizar la etiqueta')
      }

      const updatedTag = await response.json()
      
      // Actualizar el estado local y caché inmediatamente
      const updatedTags = tags.map(tag => tag.id === id ? updatedTag : tag)
      setTags(updatedTags)
      tagsCache = updatedTags
      
      return updatedTag
    } catch (err) {
      console.error('Error updating tag:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      return null
    }
  }, [tags])

  // Eliminar etiqueta
  const deleteTag = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/tags/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Error al eliminar la etiqueta')
      }

      // Actualizar el estado local y caché inmediatamente
      const updatedTags = tags.filter(tag => tag.id !== id)
      setTags(updatedTags)
      tagsCache = updatedTags
      
      return true
    } catch (err) {
      console.error('Error deleting tag:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      return false
    }
  }, [tags])

  // Obtener todas las etiquetas (método síncrono)
  const getTags = useCallback(() => {
    return tags.filter(tag => tag.isActive)
  }, [tags])

  // Obtener etiqueta por ID (método síncrono)
  const getTagById = useCallback((id: string) => {
    return tags.find(tag => tag.id === id)
  }, [tags])

  // Cargar etiquetas al montar el componente
  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  const contextValue = useMemo(() => ({
    tags,
    loading,
    error,
    fetchTags,
    createTag,
    updateTag,
    deleteTag,
    getTags,
    getTagById,
  }), [tags, loading, error, fetchTags, createTag, updateTag, deleteTag, getTags, getTagById])

  return (
    <AppointmentTagsContext.Provider value={contextValue}>
      {children}
    </AppointmentTagsContext.Provider>
  )
}

// Hook para usar el contexto
export function useAppointmentTags() {
  const context = useContext(AppointmentTagsContext)
  if (context === undefined) {
    throw new Error('useAppointmentTags debe ser usado dentro de AppointmentTagsProvider')
  }
  return context
}