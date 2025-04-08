"use client"

import React from 'react'
import { createContext, useContext, useState, type ReactNode, useEffect, useCallback } from "react"
// import { Usuario as UsuarioModel } from "@/services/data/models/interfaces.ts" // <- Comentar ruta con alias
import { Usuario as UsuarioModel } from "../services/data/models/interfaces.ts"; // <<< Usar ruta relativa
import { User as PrismaUser } from '@prisma/client';

// Función auxiliar para comparar IDs que pueden ser string o number
const isSameId = (id1: string | number | undefined | null, id2: string | number | undefined | null): boolean => {
  if (id1 === null || id1 === undefined || id2 === null || id2 === undefined) return false;
  return String(id1) === String(id2);
}

// Usar un tipo que excluya passwordHash por defecto
export type Usuario = Omit<PrismaUser, 'passwordHash'>;
// Nota: Las funciones de API ya devuelven este tipo sin el hash

interface UserContextType {
  usuarios: Usuario[];
  isLoading: boolean;
  error: string | null;
  refetchUsuarios: () => Promise<void>;
  getUsuarioById: (id: string) => Promise<Usuario | null>;
  getUsuariosByClinica: (clinicaId: string) => Promise<Usuario[]>;
  createUsuario: (usuarioData: Omit<Usuario, 'id' | 'createdAt' | 'updatedAt' | 'systemId'> & { password?: string }) => Promise<Usuario | null>;
  updateUsuario: (id: string, usuarioUpdate: Partial<Omit<Usuario, 'id' | 'createdAt' | 'updatedAt' | 'systemId'>>) => Promise<Usuario | null>;
  deleteUsuario: (id: string) => Promise<boolean>;
  toggleUsuarioStatus: (id: string) => Promise<boolean>;
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Función para cargar/recargar usuarios desde la API
  const fetchUsuarios = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/users')
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      const loadedUsuarios: Usuario[] = await response.json()
      setUsuarios(loadedUsuarios)
      console.log("UserContext: Usuarios cargados/actualizados desde API")
    } catch (err) {
      console.error("Error al cargar usuarios desde API:", err)
      setError(err instanceof Error ? err.message : 'Error desconocido al cargar usuarios')
      setUsuarios([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Cargar datos iniciales al montar
  useEffect(() => {
    fetchUsuarios()
  }, [fetchUsuarios])

  // Obtener usuario por ID
  const getUsuarioById = async (id: string): Promise<Usuario | null> => {
    const localUser = usuarios.find(u => isSameId(u.id, id))
    if (localUser) return localUser

    setIsLoading(true)
    try {
      const response = await fetch(`/api/users/${id}`)
      if (response.status === 404) return null
      if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`)
      const usuario: Usuario = await response.json()
      // Opcional: Actualizar estado local
      setUsuarios(prev => prev.map(u => isSameId(u.id, id) ? usuario : u))
      return usuario
    } catch (err) {
      console.error(`Error fetching user ${id} from API:`, err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      return null
    } finally {
      setIsLoading(false)
    }
  }

  // Obtener usuarios por clínica
  const getUsuariosByClinica = async (clinicaId: string): Promise<Usuario[]> => {
    // console.warn("getUsuariosByClinica no implementado con API (filtrado necesario en backend)") // Comentado
    // return [] // Comentado
    
    // >>> NUEVA IMPLEMENTACIÓN CON API <<<
    setIsLoading(true) // Opcional: indicar carga específica para esta llamada
    setError(null)
    try {
      const response = await fetch(`/api/users/byClinic/${clinicaId}`)
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      const usuariosDeClinica: Usuario[] = await response.json()
      console.log(`UserContext: ${usuariosDeClinica.length} usuarios cargados para clinicId ${clinicaId}`);
      // Opcional: Podríamos actualizar el estado general `usuarios` también?
      // Por ahora, solo devolvemos los usuarios específicos de la clínica
      return usuariosDeClinica;
    } catch (err) {
      console.error(`Error al cargar usuarios para clínica ${clinicaId}:`, err)
      setError(err instanceof Error ? err.message : 'Error desconocido al cargar usuarios de clínica')
      return []; // Devolver vacío en caso de error
    } finally {
      setIsLoading(false) // Opcional: finalizar carga específica
    }
    // >>> FIN NUEVA IMPLEMENTACIÓN <<<
  }

  // Crear nuevo usuario (requiere contraseña)
  const createUsuario = async (usuarioData: Omit<Usuario, 'id' | 'createdAt' | 'updatedAt' | 'systemId'> & { password?: string }): Promise<Usuario | null> => {
    if (!usuarioData.password) {
      setError("La contraseña es obligatoria para crear un usuario.")
      return null
    }
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usuarioData), // La API espera la contraseña aquí
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Error ${response.status}`)
      }
      const newUser: Usuario = await response.json()
      setUsuarios(prev => [...prev, newUser])
      return newUser
    } catch (err) {
      console.error("Error creando usuario vía API:", err)
      setError(err instanceof Error ? err.message : 'Error desconocido al crear')
      return null
    } finally {
      setIsLoading(false)
    }
  }

  // Actualizar usuario (sin contraseña)
  const updateUsuario = async (id: string, usuarioUpdate: Partial<Omit<Usuario, 'id' | 'createdAt' | 'updatedAt' | 'systemId'>>): Promise<Usuario | null> => {
    setIsLoading(true)
    setError(null)
    const usuarioId = String(id)
    try {
      const response = await fetch(`/api/users/${usuarioId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usuarioUpdate), // La API ignora password si se envía
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Error ${response.status}`)
      }
      const updatedUser: Usuario = await response.json()
      setUsuarios(prev => 
        prev.map(u => isSameId(u.id, usuarioId) ? updatedUser : u)
      )
      return updatedUser
    } catch (err) {
      console.error(`Error updating user ${usuarioId} via API:`, err)
      setError(err instanceof Error ? err.message : 'Error desconocido al actualizar')
      return null
    } finally {
      setIsLoading(false)
    }
  }

  // Eliminar usuario
  const deleteUsuario = async (id: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    const stringId = String(id)
    try {
      const response = await fetch(`/api/users/${stringId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Error ${response.status}`)
      }
      setUsuarios(prev => prev.filter(u => !isSameId(u.id, stringId)))
      return true
    } catch (err) {
      console.error(`Error deleting user ${stringId} via API:`, err)
      setError(err instanceof Error ? err.message : 'Error desconocido al eliminar')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Cambiar estado activo/inactivo (PENDIENTE API)
  const toggleUsuarioStatus = async (id: string): Promise<boolean> => {
    console.warn("toggleUsuarioStatus no implementado con API todavía.")
    // Podría ser un PUT a /api/users/[id] con { isActive: ... } o una ruta dedicada.
    // const currentUser = usuarios.find(u => isSameId(u.id, id));
    // if (!currentUser) return false;
    // const result = await updateUsuario(id, { isActive: !currentUser.isActive });
    // return !!result;
    return false
  }

  const contextValue: UserContextType = {
    usuarios,
    isLoading,
    error,
    refetchUsuarios: fetchUsuarios,
    getUsuarioById,
    getUsuariosByClinica,
    createUsuario,
    updateUsuario,
    deleteUsuario,
    toggleUsuarioStatus,
  }

  return <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser debe usarse dentro de un UserProvider")
  }
  return context
} 