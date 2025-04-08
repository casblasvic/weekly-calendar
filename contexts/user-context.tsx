"use client"

import React from 'react'
import { createContext, useContext, useState, type ReactNode, useEffect, useCallback, useMemo } from "react"
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

// --- NUEVO TIPO para datos de actualización --- 
// Incluye los campos base OMITIDOS de Usuario y 
// opcionalmente el campo clinicAssignments
export type UsuarioUpdatePayload = 
  Partial<Omit<Usuario, 'id' | 'createdAt' | 'updatedAt' | 'systemId'>> 
  & { 
    clinicAssignments?: { clinicId: string; roleId: string }[];
    // Añadir otros campos si se gestionan aquí (ej: contraseña al crear)
  };

interface UserContextType {
  usuarios: Usuario[];
  isLoading: boolean;
  error: string | null;
  refetchUsuarios: () => Promise<void>;
  getUsuarioById: (id: string) => Promise<Usuario | null>;
  getUsuariosByClinica: (clinicaId: string) => Promise<Usuario[]>;
  createUsuario: (usuarioData: Omit<Usuario, 'id' | 'createdAt' | 'updatedAt' | 'systemId'> & { password?: string }) => Promise<Usuario | null>;
  updateUsuario: (id: string, usuarioUpdate: UsuarioUpdatePayload) => Promise<Usuario | null>;
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
  const getUsuarioById = useCallback(async (id: string): Promise<Usuario | null> => {
    // Siempre buscar en API para obtener datos completos
    console.log(`[UserContext] getUsuarioById(${id}) - Buscando en API...`);
    // setIsLoading(true) // Considerar si este isLoading debe afectar a toda la lista o ser específico
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
      // setIsLoading(false)
    }
  }, [setUsuarios])

  // Obtener usuarios por clínica
  const getUsuariosByClinica = useCallback(async (clinicaId: string): Promise<Usuario[]> => {
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
  }, [])

  // Crear nuevo usuario (requiere contraseña)
  const createUsuario = useCallback(async (usuarioData: Omit<Usuario, 'id' | 'createdAt' | 'updatedAt' | 'systemId'> & { password?: string }): Promise<Usuario | null> => {
    if (!usuarioData.password) {
      // setError("La contraseña es obligatoria para crear un usuario.") // Usar toast?
      console.error("createUsuario: La contraseña es obligatoria.");
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
  }, [setUsuarios])

  // Actualizar usuario (sin contraseña)
  const updateUsuario = useCallback(async (id: string, usuarioUpdate: UsuarioUpdatePayload): Promise<Usuario | null> => {
    setIsLoading(true)
    setError(null)
    const usuarioId = String(id)
    try {
      console.log(`[UserContext] updateUsuario(${usuarioId}) - Payload:`, JSON.stringify(usuarioUpdate, null, 2)); // Log para depurar
      const response = await fetch(`/api/users/${usuarioId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usuarioUpdate), // Enviar el payload completo
      })
      if (!response.ok) {
        const errorData = await response.json()
        // Log detallado del error de la API
        console.error(`[UserContext] updateUsuario(${usuarioId}) - API Error ${response.status}:`, errorData);
        throw new Error(errorData.message || `Error ${response.status}`)
      }
      const updatedUser: Usuario = await response.json()
      console.log(`[UserContext] updateUsuario(${usuarioId}) - Success. API Response:`, updatedUser);
      // Actualizar estado local (crucial que updatedUser incluya las asignaciones actualizadas)
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
  }, [setUsuarios])

  // Eliminar usuario
  const deleteUsuario = useCallback(async (id: string): Promise<boolean> => {
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
  }, [setUsuarios])

  // Cambiar estado activo/inactivo
  const toggleUsuarioStatus = useCallback(async (id: string): Promise<boolean> => {
    // Lógica API (Descomentada y activada)
    setError(null);
    const stringId = String(id);
    try {
        // Asegurarse que la ruta y método son correctos (PATCH es común para toggle)
        const response = await fetch(`/api/users/${stringId}/toggle-status`, { method: 'PATCH' });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Error ${response.status}`);
        }
        // La API debe devolver el usuario actualizado para reflejar el cambio
        // const updatedUser: Usuario = await response.json(); // Ya no es necesario si no actualizamos estado global
        // --- MODIFICADO: Eliminar actualización de estado global aquí ---\n        // setUsuarios(prev => prev.map(u => isSameId(u.id, stringId) ? updatedUser : u)); \n        return true; // Éxito\n    } catch (err) {\n        console.error(`Error toggling status for user ${stringId}:`, err);\n        setError(err instanceof Error ? err.message : 'Error desconocido al cambiar estado');
        return true; // Éxito
    } catch (err) {
        console.error(`Error toggling status for user ${stringId}:`, err);
        setError(err instanceof Error ? err.message : 'Error desconocido al cambiar estado');
        // MODIFICADO: Devolver false en caso de error
        return false; // Fallo
    }
  }, [setError])

  // Las dependencias de useMemo son los valores que contiene
  // y las funciones memoizadas (envueltas en useCallback)
  const contextValue = useMemo(() => ({
    usuarios,
    isLoading,
    error,
    refetchUsuarios: fetchUsuarios, // fetchUsuarios ya está en useCallback
    getUsuarioById,
    getUsuariosByClinica,
    createUsuario,
    updateUsuario,
    deleteUsuario,
    toggleUsuarioStatus,
  // Las dependencias de useMemo son los valores que contiene
  // y las funciones memoizadas
  }), [usuarios, isLoading, error, fetchUsuarios, getUsuarioById, getUsuariosByClinica, createUsuario, updateUsuario, deleteUsuario, toggleUsuarioStatus]);

  return <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser debe usarse dentro de un UserProvider")
  }
  return context
} 