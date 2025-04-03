"use client"

import { createContext, useContext, useState, type ReactNode, useEffect } from "react"
import { useInterfaz } from "@/contexts/interfaz-Context"
import { PerfilEmpleado } from "@/services/data/models/interfaces"

// Mock data para perfiles (roles) de usuario
const PERFILES_MOCK: PerfilEmpleado[] = [
  { id: "1", nombre: "Administrador", permisos: ["admin", "read", "write"], isDefault: false },
  { id: "2", nombre: "Central", permisos: ["read", "write"], isDefault: false },
  { id: "3", nombre: "Contabilidad", permisos: ["read", "accounting"], isDefault: false },
  { id: "4", nombre: "Doctor Administrador", permisos: ["read", "write", "doctor"], isDefault: false },
  { id: "5", nombre: "Encargado", permisos: ["read", "write", "manager"], isDefault: false },
  { id: "6", nombre: "Gerente de zona", permisos: ["read", "write", "manager"], isDefault: false },
  { id: "7", nombre: "Marketing", permisos: ["read", "marketing"], isDefault: false },
  { id: "8", nombre: "Operador Call Center", permisos: ["read", "callcenter"], isDefault: false },
  { id: "9", nombre: "Personal sin acceso", permisos: [], isDefault: false },
  { id: "10", nombre: "Personal", permisos: ["read"], isDefault: true },
  { id: "11", nombre: "Profesional", permisos: ["read", "write", "professional"], isDefault: false },
  { id: "12", nombre: "Recepción", permisos: ["read", "write", "reception"], isDefault: false },
  { id: "13", nombre: "Supervisor Call Center", permisos: ["read", "write", "callcenter"], isDefault: false }
];

interface RoleContextType {
  roles: PerfilEmpleado[];
  getAll: () => Promise<PerfilEmpleado[]>;
  getById: (id: string) => Promise<PerfilEmpleado | null>;
  getByName: (name: string) => Promise<PerfilEmpleado | null>;
  create: (role: Omit<PerfilEmpleado, 'id'>) => Promise<string>;
  update: (id: string, role: Partial<PerfilEmpleado>) => Promise<boolean>;
  delete: (id: string) => Promise<boolean>;
  isNameAvailable: (name: string, excludeId?: string) => Promise<boolean>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [roles, setRoles] = useState<PerfilEmpleado[]>([]);
  const [initialized, setInitialized] = useState(false);
  const interfaz = useInterfaz();

  // Inicializar roles
  useEffect(() => {
    const loadRoles = async () => {
      if (interfaz.initialized && !initialized) {
        try {
          // En producción, esto sería una llamada a la API
          setRoles(PERFILES_MOCK);
          setInitialized(true);
        } catch (error) {
          console.error("Error al cargar perfiles:", error);
          setRoles([]);
        }
      }
    };
    
    loadRoles();
  }, [interfaz.initialized, initialized]);

  // Obtener todos los roles
  const getAll = async (): Promise<PerfilEmpleado[]> => {
    try {
      // En producción, esto sería una llamada a la API
      return [...roles]; // Devolver copia para evitar mutaciones
    } catch (error) {
      console.error("Error al obtener todos los perfiles:", error);
      return [];
    }
  };

  // Obtener rol por ID
  const getById = async (id: string): Promise<PerfilEmpleado | null> => {
    try {
      // En producción, esto sería una llamada a la API
      const role = roles.find(r => String(r.id) === String(id));
      return role || null;
    } catch (error) {
      console.error(`Error al obtener perfil con ID ${id}:`, error);
      return null;
    }
  };

  // Obtener rol por nombre
  const getByName = async (name: string): Promise<PerfilEmpleado | null> => {
    try {
      // En producción, esto sería una llamada a la API
      const role = roles.find(r => r.nombre.toLowerCase() === name.toLowerCase());
      return role || null;
    } catch (error) {
      console.error(`Error al obtener perfil con nombre "${name}":`, error);
      return null;
    }
  };

  // Crear nuevo rol
  const create = async (role: Omit<PerfilEmpleado, 'id'>): Promise<string> => {
    try {
      // Verificar que el nombre no esté duplicado
      const existing = await getByName(role.nombre);
      if (existing) {
        throw new Error(`Ya existe un perfil con el nombre "${role.nombre}"`);
      }
      
      // En producción, esto sería una llamada a la API
      const newId = String(Date.now()); // Generar ID temporal
      const newRole: PerfilEmpleado = {
        ...role,
        id: newId
      };
      
      // Actualizar estado
      setRoles(prev => [...prev, newRole]);
      
      return newId;
    } catch (error) {
      console.error("Error al crear perfil:", error);
      throw error;
    }
  };

  // Actualizar rol
  const update = async (id: string, role: Partial<PerfilEmpleado>): Promise<boolean> => {
    try {
      // Verificar que exista el rol
      const existing = await getById(id);
      if (!existing) {
        throw new Error(`No se encontró un perfil con ID ${id}`);
      }
      
      // Si se cambia el nombre, verificar que no esté duplicado
      if (role.nombre && role.nombre !== existing.nombre) {
        const nameExists = await isNameAvailable(role.nombre, id);
        if (!nameExists) {
          throw new Error(`Ya existe un perfil con el nombre "${role.nombre}"`);
        }
      }
      
      // En producción, esto sería una llamada a la API
      // Actualizar estado
      setRoles(prev => 
        prev.map(r => String(r.id) === String(id) ? { ...r, ...role } : r)
      );
      
      return true;
    } catch (error) {
      console.error(`Error al actualizar perfil con ID ${id}:`, error);
      return false;
    }
  };

  // Eliminar rol
  const delete_ = async (id: string): Promise<boolean> => {
    try {
      // Verificar que exista el rol
      const existing = await getById(id);
      if (!existing) {
        throw new Error(`No se encontró un perfil con ID ${id}`);
      }
      
      // En producción, esto sería una llamada a la API
      // Actualizar estado
      setRoles(prev => prev.filter(r => String(r.id) !== String(id)));
      
      return true;
    } catch (error) {
      console.error(`Error al eliminar perfil con ID ${id}:`, error);
      return false;
    }
  };

  // Verificar si un nombre está disponible
  const isNameAvailable = async (name: string, excludeId?: string): Promise<boolean> => {
    try {
      const existing = roles.find(r => 
        r.nombre.toLowerCase() === name.toLowerCase() && 
        (!excludeId || String(r.id) !== String(excludeId))
      );
      
      return !existing;
    } catch (error) {
      console.error(`Error al verificar disponibilidad del nombre "${name}":`, error);
      return false;
    }
  };

  const value = {
    roles,
    getAll,
    getById,
    getByName,
    create,
    update,
    delete: delete_,
    isNameAvailable
  };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error("useRole debe ser usado dentro de un RoleProvider");
  }
  return context;
} 