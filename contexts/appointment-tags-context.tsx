"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

// Interfaz para la etiqueta de cita
export interface AppointmentTag {
  id: string
  name: string
  color: string
  description?: string
  isActive: boolean
}

// Interfaz para el contexto
interface AppointmentTagsContextType {
  tags: AppointmentTag[]
  loading: boolean
  error: string | null
  getTags: () => AppointmentTag[]
  getTagById: (id: string) => AppointmentTag | undefined
  createTag: (tag: Omit<AppointmentTag, 'id'>) => Promise<AppointmentTag>
  updateTag: (id: string, data: Partial<AppointmentTag>) => Promise<AppointmentTag | null>
  deleteTag: (id: string) => Promise<boolean>
  isTagUsed: (id: string) => Promise<boolean>
}

// Datos predeterminados para demostración
const defaultTags: AppointmentTag[] = [
  { id: '1', name: 'En Salle D\'attente', color: '#E040FB', isActive: true },
  { id: '2', name: 'Il ne répond pas', color: '#FBC02D', isActive: true },
  { id: '3', name: 'Rendez-vous annulé', color: '#EF5350', isActive: true },
  { id: '4', name: 'Rendez-vous confirmé', color: '#66BB6A', isActive: true },
  { id: '5', name: 'Rendez-vous en retard', color: '#42A5F5', isActive: true },
  { id: '6', name: 'Rendez-vous reporté', color: '#FF9800', isActive: true },
]

// Funciones vacías que se utilizarán cuando no esté disponible el contexto
const emptyFunctions = {
  tags: [],
  loading: false,
  error: null,
  getTags: () => defaultTags.filter(tag => tag.isActive),
  getTagById: (id: string) => defaultTags.find(tag => tag.id === id),
  createTag: async () => ({ id: '0', name: '', color: '', isActive: false }),
  updateTag: async () => null,
  deleteTag: async () => false,
  isTagUsed: async () => false,
}

// Crear el contexto
const AppointmentTagsContext = createContext<AppointmentTagsContextType | undefined>(undefined)

// Proveeedor del contexto
export function AppointmentTagsProvider({ children }: { children: ReactNode }) {
  const [tags, setTags] = useState<AppointmentTag[]>(defaultTags)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Simulación de guardar los cambios (en memoria)
  const saveTags = async (updatedTags: AppointmentTag[]): Promise<boolean> => {
    try {
      setTags(updatedTags)
      return true
    } catch (err) {
      console.error('Error saving tags:', err)
      return false
    }
  }

  // Obtener todas las etiquetas
  const getTags = () => tags.filter(tag => tag.isActive)

  // Obtener una etiqueta por ID
  const getTagById = (id: string) => tags.find(tag => tag.id === id)

  // Crear una nueva etiqueta
  const createTag = async (tagData: Omit<AppointmentTag, 'id'>): Promise<AppointmentTag> => {
    const newTag: AppointmentTag = {
      ...tagData,
      id: Date.now().toString(), // Generar ID único
    }

    const updatedTags = [...tags, newTag]
    await saveTags(updatedTags)
    return newTag
  }

  // Actualizar una etiqueta existente
  const updateTag = async (id: string, data: Partial<AppointmentTag>): Promise<AppointmentTag | null> => {
    const tagIndex = tags.findIndex(t => t.id === id)
    if (tagIndex === -1) return null

    const updatedTags = [...tags]
    updatedTags[tagIndex] = {
      ...updatedTags[tagIndex],
      ...data
    }

    await saveTags(updatedTags)
    return updatedTags[tagIndex]
  }

  // Eliminar una etiqueta
  const deleteTag = async (id: string): Promise<boolean> => {
    // Primero verificamos si la etiqueta está en uso
    const isUsed = await isTagUsed(id)
    if (isUsed) {
      // Si está en uso, la marcamos como inactiva en vez de eliminarla
      return await updateTag(id, { isActive: false }) !== null
    }

    // Si no está en uso, la eliminamos
    const updatedTags = tags.filter(tag => tag.id !== id)
    return await saveTags(updatedTags)
  }

  // Verificar si una etiqueta está siendo usada
  const isTagUsed = async (id: string): Promise<boolean> => {
    // En una aplicación real, aquí consultaríamos a la base de datos
    // para verificar si hay citas que usan esta etiqueta
    // Para esta simulación, devolvemos false
    return false
  }

  // Valor del contexto
  const contextValue: AppointmentTagsContextType = {
    tags,
    loading,
    error,
    getTags,
    getTagById,
    createTag,
    updateTag,
    deleteTag,
    isTagUsed,
  }

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
    console.warn('useAppointmentTags debe ser usado dentro de AppointmentTagsProvider')
    return emptyFunctions
  }
  return context
} 