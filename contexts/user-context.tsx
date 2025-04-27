"use client"

import React from 'react'
import { createContext, useContext, useState, type ReactNode, useEffect, useCallback, useMemo } from "react"
// import { Usuario as UsuarioModel } from "@/services/data/models/interfaces.ts" // <- Comentar ruta con alias
import { Usuario as UsuarioModel } from "../services/data/models/interfaces.ts"; // <<< Usar ruta relativa
import { User as PrismaUser } from '@prisma/client';
import { useSession } from "next-auth/react"; // <<< Importar useSession

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

// Añadir export a la interfaz
export interface UserContextType {
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
  const { data: session, status } = useSession(); // <<< Obtener estado de sesión

  const fetchUsuarios = useCallback(async () => {
     if (status !== 'authenticated') {
        console.log("[UserContext] Sesión no autenticada, saltando fetchUsuarios.");
        setIsLoading(false);
        setUsuarios([]);
        return;
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/users')
      if (!response.ok) {
         let errorText = response.statusText;
         if (response.status === 401) {
             try { const errorBody = await response.json(); errorText = errorBody.message || errorText; } catch (e) {}
         }
         throw new Error(`Error ${response.status}: ${errorText}`)
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
  }, [status])

  useEffect(() => {
    if (status === 'authenticated') {
        fetchUsuarios()
    } else if (status === 'unauthenticated') {
        setUsuarios([])
        setIsLoading(false)
        setError(null)
    } else {
        setIsLoading(true)
    }
  }, [fetchUsuarios, status])

  const getUsuarioById = useCallback(async (id: string): Promise<Usuario | null> => {
    if (status !== 'authenticated') return null;
    
    console.log(`[UserContext] getUsuarioById(${id}) - Buscando en API...`);
    try {
      const response = await fetch(`/api/users/${id}`)
      if (response.status === 404) return null
      if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`)
      const usuario: Usuario = await response.json()
      setUsuarios(prev => prev.map(u => isSameId(u.id, id) ? usuario : u))
      return usuario
    } catch (err) {
      console.error(`Error fetching user ${id} from API:`, err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      return null
    }
  }, [setUsuarios, status])

  const getUsuariosByClinica = useCallback(async (clinicaId: string): Promise<Usuario[]> => {
    if (status !== 'authenticated') return [];

    setIsLoading(true) 
    setError(null)
    try {
      const response = await fetch(`/api/users/byClinic/${clinicaId}`)
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      const usuariosDeClinica: Usuario[] = await response.json()
      console.log(`UserContext: ${usuariosDeClinica.length} usuarios cargados para clinicId ${clinicaId}`);
      return usuariosDeClinica;
    } catch (err) {
      console.error(`Error al cargar usuarios para clínica ${clinicaId}:`, err)
      setError(err instanceof Error ? err.message : 'Error desconocido al cargar usuarios de clínica')
      return [];
    } finally {
      setIsLoading(false)
    }
  }, [status])

  const createUsuario = useCallback(async (usuarioData: Omit<Usuario, 'id' | 'createdAt' | 'updatedAt' | 'systemId'> & { password?: string }): Promise<Usuario | null> => {
    if (status !== 'authenticated') return null;

    if (!usuarioData.password) {
      console.error("createUsuario: La contraseña es obligatoria.");
      return null
    }
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usuarioData),
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
  }, [setUsuarios, status])

  const updateUsuario = useCallback(async (id: string, usuarioUpdate: UsuarioUpdatePayload): Promise<Usuario | null> => {
    if (status !== 'authenticated') return null;

    setIsLoading(true)
    setError(null)
    const usuarioId = String(id)
    try {
      console.log(`[UserContext] updateUsuario(${usuarioId}) - Payload:`, JSON.stringify(usuarioUpdate, null, 2));
      const response = await fetch(`/api/users/${usuarioId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usuarioUpdate),
      })
      if (!response.ok) {
        const errorData = await response.json()
        console.error(`[UserContext] updateUsuario(${usuarioId}) - API Error ${response.status}:`, errorData);
        throw new Error(errorData.message || `Error ${response.status}`)
      }
      const updatedUser: Usuario = await response.json()
      console.log(`[UserContext] updateUsuario(${usuarioId}) - Success. API Response:`, updatedUser);
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
  }, [setUsuarios, status])

  const deleteUsuario = useCallback(async (id: string): Promise<boolean> => {
    if (status !== 'authenticated') return false;

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
  }, [setUsuarios, status])

  const toggleUsuarioStatus = useCallback(async (id: string): Promise<boolean> => {
    if (status !== 'authenticated') return false;
    
    setError(null);
    const stringId = String(id);
    try {
        const response = await fetch(`/api/users/${stringId}/toggle-status`, { method: 'PATCH' });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Error ${response.status}`);
        }
        return true;
    } catch (err) {
        console.error(`Error toggling status for user ${stringId}:`, err);
        setError(err instanceof Error ? err.message : 'Error desconocido al cambiar estado');
        return false; // Fallo
    }
  }, [setError, status])

  const contextValue = useMemo(() => ({
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
  }), [
      usuarios, 
      isLoading, 
      error, 
      fetchUsuarios, 
      getUsuarioById, 
      getUsuariosByClinica, 
      createUsuario, 
      updateUsuario, 
      deleteUsuario, 
      toggleUsuarioStatus
    ]);

  return <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
} 