import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
// Importar User de Prisma si se usa directamente
// import { User as PrismaUser } from '@prisma/client'
import React from 'react'

// Definir aquí el tipo Usuario que se usará en el contexto
// Este tipo puede ser una versión simplificada o extendida del modelo Prisma
export interface Usuario {
  id: string
  firstName: string | null // Asegurarse que estos campos coinciden con Prisma o la API
  lastName: string | null
  email: string
  emailVerified?: Date | null
  password?: string // Considerar si esto debe estar en el contexto
  phone?: string | null // Campo añadido
  image?: string | null // Mantener si se usa
  isActive?: boolean // Asegurarse que este campo existe y se usa
  roles?: string[] // Ejemplo si se manejan roles como array de strings
  clinicas?: string[] // Ejemplo si se manejan clínicas asignadas
  // Añadir otros campos relevantes si es necesario
}

// ---- RESTAURAR CÓDIGO DEL CONTEXTO ----
interface UserContextType {
  usuarios: Usuario[];
  addUsuario: (usuario: Omit<Usuario, 'id'>) => Promise<boolean>;
  updateUsuario: (id: string, updates: Partial<Omit<Usuario, 'id'>>) => Promise<boolean>;
  deleteUsuario: (id: string) => Promise<boolean>;
  getUsuarioById: (id: string) => Usuario | undefined;
  getUsuariosByClinica: (clinicaId: string) => Promise<Usuario[]>;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadUsers = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/users');
        if (!response.ok) throw new Error('Failed to fetch users');
        const data = await response.json();
        setUsuarios(data);
      } catch (error) {
        console.error("Error loading users:", error);
        setUsuarios([]); 
      }
      setIsLoading(false);
    };
    loadUsers();
  }, []);
  
  const addUsuario = async (usuarioData: Omit<Usuario, 'id'>): Promise<boolean> => {
    console.log("addUsuario - API call pending", usuarioData);
    // TODO: POST /api/users
    return false;
  };
  const updateUsuario = async (id: string, updates: Partial<Omit<Usuario, 'id'>>): Promise<boolean> => {
    console.log("updateUsuario - API call pending", id, updates);
    // TODO: PUT /api/users/[id]
    return false;
  };
  const deleteUsuario = async (id: string): Promise<boolean> => {
    console.log("deleteUsuario - API call pending", id);
    // TODO: DELETE /api/users/[id]
    return false;
  };
  const getUsuarioById = (id: string): Usuario | undefined => {
    return usuarios.find(u => u.id === id);
  };
  const getUsuariosByClinica = async (clinicaId: string): Promise<Usuario[]> => {
    console.log("getUsuariosByClinica - Calling API", clinicaId);
    try {
      const response = await fetch(`/api/users/byClinic/${clinicaId}`);
      if (!response.ok) throw new Error('Failed to fetch users by clinic');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching users for clinic ${clinicaId}:`, error);
      return [];
    }
  };

  const value: UserContextType = {
    usuarios,
    addUsuario,
    updateUsuario,
    deleteUsuario,
    getUsuarioById,
    getUsuariosByClinica,
    isLoading,
  };

  // Return con sintaxis JSX explícita y correcta
  return React.createElement(
    UserContext.Provider,
    { value: value },
    children
  );
}
// ---- FIN RESTAURAR CÓDIGO ---- 