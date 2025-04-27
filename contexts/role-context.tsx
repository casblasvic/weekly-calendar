"use client"

import React from 'react';
import { createContext, useContext, useState, type ReactNode, useEffect, useCallback, useMemo } from "react"
// import { useInterfaz } from "@/contexts/interfaz-Context" // No parece necesario aquí
// import { PerfilEmpleado } from "@/services/data/models/interfaces" // Usaremos el tipo Role de Prisma
import { Role as PrismaRole } from '@prisma/client'; // Importar tipo Role de Prisma
import { useSession } from "next-auth/react"; // <<< Importar useSession

// Ya no necesitamos PERFILES_MOCK
/*
const PERFILES_MOCK: PerfilEmpleado[] = [
  { id: "1", nombre: "Administrador", permisos: ["admin", "read", "write"], isDefault: false },
  // ... resto de mocks
];
*/

// Usar el tipo Role de Prisma en la interfaz
interface RoleContextType {
  roles: PrismaRole[]; // <-- Usar PrismaRole
  isLoading: boolean; // <-- Añadir estado de carga
  error: string | null; // <-- Añadir estado de error
  refetchRoles: () => Promise<void>; // <-- Añadir función para recargar
  // --- Funciones que operarán sobre estado local por ahora --- 
  getAll: () => Promise<PrismaRole[]>; // Ahora simplemente devuelve el estado
  getById: (id: string) => Promise<PrismaRole | null>;
  getByName: (name: string) => Promise<PrismaRole | null>;
  // Las siguientes funciones deberían llamar a API, por ahora modifican estado local si se implementan
  create: (roleData: Omit<PrismaRole, 'id' | 'createdAt' | 'updatedAt' | 'systemId'>) => Promise<PrismaRole | null>; 
  update: (id: string, roleUpdate: Partial<Omit<PrismaRole, 'id' | 'createdAt' | 'updatedAt' | 'systemId'>>) => Promise<boolean>;
  deleteRole: (id: string) => Promise<boolean>; // Renombrar para evitar conflicto con palabra reservada
  isNameAvailable: (name: string, excludeId?: string) => Promise<boolean>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [roles, setRoles] = useState<PrismaRole[]>([]);
  // const [initialized, setInitialized] = useState(false); // Ya no necesario con isLoading
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session, status } = useSession(); // <<< Obtener estado de la sesión
  // const interfaz = useInterfaz(); // No parece necesario

  // Función para cargar roles desde la API
  const fetchRoles = useCallback(async () => {
    // console.log("[RoleContext] fetchRoles llamado"); // DEBUG
    // <<< Asegurarnos de que solo se ejecuta si está autenticado >>>
    if (status !== 'authenticated') {
        console.log("[RoleContext] Sesión no autenticada, saltando fetchRoles.");
        setIsLoading(false); // Indicar que ya no estamos cargando (porque no hay nada que cargar)
        setRoles([]); // Asegurar que los roles están vacíos si no hay sesión
        return; 
    }

    setIsLoading(true);
    setError(null);
    try {
      // console.log("[RoleContext] Haciendo fetch a /api/roles..."); // DEBUG
      const response = await fetch('/api/roles');
      // console.log("[RoleContext] Respuesta recibida:", response.status, response.ok); // DEBUG
      if (!response.ok) {
        // Capturar el texto del error 401 si es posible
        let errorText = response.statusText;
        if (response.status === 401) {
            try {
                 const errorBody = await response.json();
                 errorText = errorBody.message || errorText;
            } catch (e) {}
        }
        throw new Error(`Error ${response.status}: ${errorText}`);
      }
      const loadedRoles: PrismaRole[] = await response.json();
      // console.log("[RoleContext] Roles cargados desde API:", loadedRoles); // DEBUG
      setRoles(loadedRoles);
    } catch (err) {
      console.error("Error al cargar roles desde API:", err);
      setError(err instanceof Error ? err.message : 'Error desconocido al cargar roles');
      setRoles([]); // Limpiar roles en caso de error
    } finally {
      setIsLoading(false);
      // console.log("[RoleContext] fetchRoles finalizado. isLoading:", false); // DEBUG
    }
    // <<< Añadir status como dependencia para reaccionar a cambios de sesión >>>
  }, [status]);

  // Cargar roles iniciales SOLO si la sesión está autenticada
  useEffect(() => {
    // console.log("[RoleContext] useEffect inicial ejecutado, status:", status);
    if (status === 'authenticated') {
        // console.log("[RoleContext] Sesión autenticada, llamando a fetchRoles.");
        fetchRoles();
    } else if (status === 'unauthenticated') {
        // console.log("[RoleContext] Sesión no autenticada, limpiando roles y carga.");
        setRoles([]); // Limpiar roles si el usuario cierra sesión
        setIsLoading(false); // Indicar que ya no se está cargando
        setError(null);
    } else {
       // status === 'loading' - No hacer nada, esperar a que se resuelva
       // console.log("[RoleContext] Sesión en estado de carga...");
       setIsLoading(true); // Mantener cargando mientras la sesión se verifica
    }
    // <<< Añadir fetchRoles y status como dependencias >>>
  }, [fetchRoles, status]);

  // --- Implementación de funciones (Mayormente operan sobre estado local por ahora) ---

  // Obtener todos los roles (devuelve la copia del estado)
  const getAll = useCallback(async (): Promise<PrismaRole[]> => {
    return [...roles]; // Devolver copia
  }, [roles]);

  // Obtener rol por ID (busca en el estado)
  const getById = useCallback(async (id: string): Promise<PrismaRole | null> => {
    const role = roles.find(r => r.id === id);
    return role || null;
  }, [roles]);

  // Obtener rol por nombre (busca en el estado)
  const getByName = useCallback(async (name: string): Promise<PrismaRole | null> => {
    const role = roles.find(r => r.name.toLowerCase() === name.toLowerCase());
    return role || null;
  }, [roles]);

  // Crear nuevo rol (MODIFICARÍA ESTADO LOCAL - PENDIENTE API)
  const create = useCallback(async (roleData: Omit<PrismaRole, 'id' | 'createdAt' | 'updatedAt' | 'systemId'>): Promise<PrismaRole | null> => {
    console.warn("RoleContext.create no implementado con API. Modificando estado local temporalmente.");
    const nameExists = roles.some(r => r.name.toLowerCase() === roleData.name.toLowerCase());
    if (nameExists) {
        setError(`Ya existe un rol con el nombre "${roleData.name}"`);
        return null;
    }
    // Simular creación local
    const tempId = `temp_${Date.now()}`;
    const newRole: PrismaRole = {
        ...roleData,
        id: tempId,
        systemId: 'placeholder_system_id', // Necesitaríamos el systemId real
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    setRoles(prev => [...prev, newRole]);
    return newRole;
    // TODO: Llamar a POST /api/roles y actualizar estado con la respuesta real
  }, [roles]);

  // Actualizar rol (MODIFICARÍA ESTADO LOCAL - PENDIENTE API)
  const update = useCallback(async (id: string, roleUpdate: Partial<Omit<PrismaRole, 'id' | 'createdAt' | 'updatedAt' | 'systemId'>>): Promise<boolean> => {
    console.warn(`RoleContext.update no implementado con API para rol ${id}. Modificando estado local temporalmente.`);
    const roleIndex = roles.findIndex(r => r.id === id);
    if (roleIndex === -1) {
        setError(`No se encontró rol con ID ${id} para actualizar.`);
        return false;
    }
    // Verificar nombre duplicado si se cambia
    if (roleUpdate.name && roles.some(r => r.id !== id && r.name.toLowerCase() === roleUpdate.name?.toLowerCase())) {
        setError(`Ya existe otro rol con el nombre "${roleUpdate.name}"`);
        return false;
    }
    setRoles(prev => prev.map((r, index) => index === roleIndex ? { ...r, ...roleUpdate, updatedAt: new Date() } : r));
    return true;
    // TODO: Llamar a PUT /api/roles/[id] y actualizar estado con la respuesta real
  }, [roles]);

  // Eliminar rol (MODIFICARÍA ESTADO LOCAL - PENDIENTE API)
  const deleteRole = useCallback(async (id: string): Promise<boolean> => {
    console.warn(`RoleContext.deleteRole no implementado con API para rol ${id}. Modificando estado local temporalmente.`);
    const roleExists = roles.some(r => r.id === id);
    if (!roleExists) {
        setError(`No se encontró rol con ID ${id} para eliminar.`);
        return false;
    }
    setRoles(prev => prev.filter(r => r.id !== id));
    return true;
    // TODO: Llamar a DELETE /api/roles/[id] y actualizar estado
  }, [roles]);

  // Verificar si un nombre está disponible (busca en el estado)
  const isNameAvailable = useCallback(async (name: string, excludeId?: string): Promise<boolean> => {
    const existing = roles.find(r => 
      r.name.toLowerCase() === name.toLowerCase() && 
      (!excludeId || r.id !== excludeId)
    );
    return !existing;
  }, [roles]);

  // Valor del contexto
  const contextValue = useMemo(() => ({
    roles,
    isLoading,
    error,
    refetchRoles: fetchRoles, // Usar la función de fetch
    getAll,
    getById,
    getByName,
    create,
    update,
    deleteRole, // Usar nombre corregido
    isNameAvailable
    // Las dependencias deben incluir todo lo usado en el objeto
  }), [roles, isLoading, error, fetchRoles, getAll, getById, getByName, create, update, deleteRole, isNameAvailable]);

  return <RoleContext.Provider value={contextValue}>{children}</RoleContext.Provider>;
}

// Hook para consumir el contexto
export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error("useRole debe ser usado dentro de un RoleProvider");
  }
  return context;
} 