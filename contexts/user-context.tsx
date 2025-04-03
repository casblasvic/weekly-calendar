"use client"

import { createContext, useContext, useState, type ReactNode, useEffect } from "react"
import { useInterfaz } from "@/contexts/interfaz-Context"
import { Usuario as UsuarioModel } from "@/services/data/models/interfaces"

// Función auxiliar para comparar IDs que pueden ser string o number
const isSameId = (id1: string | number | undefined | null, id2: string | number | undefined | null): boolean => {
  if (id1 === null || id1 === undefined || id2 === null || id2 === undefined) return false;
  return String(id1) === String(id2);
}

// Definir alias para los tipos usando los tipos del modelo central
export type Usuario = UsuarioModel;

interface UserContextType {
  usuarios: Usuario[];
  getAllUsuarios: () => Promise<Usuario[]>;
  getUsuarioById: (id: string) => Promise<Usuario | null>;
  getUsuariosByClinica: (clinicaId: string) => Promise<Usuario[]>;
  createUsuario: (usuario: Omit<Usuario, 'id'>) => Promise<string>;
  updateUsuario: (id: string, usuario: Partial<Usuario>) => Promise<boolean>;
  deleteUsuario: (id: string) => Promise<boolean>;
  toggleUsuarioStatus: (id: string) => Promise<boolean>;
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [initialized, setInitialized] = useState(false)
  const [dataFetched, setDataFetched] = useState(false)
  const interfaz = useInterfaz()

  // Cargar datos iniciales
  useEffect(() => {
    const loadUsuarios = async () => {
      if (interfaz.initialized && !dataFetched) {
        try {
          // Cargar usuarios
          const loadedUsuarios = await interfaz.getAllUsuarios();
          
          // Establecer los usuarios
          setUsuarios(loadedUsuarios);
          
          setDataFetched(true);
          setInitialized(true);
          console.log("UserContext: Datos cargados correctamente");
        } catch (error) {
          console.error("Error al cargar usuarios:", error);
          setUsuarios([]);
          setInitialized(true);
        }
      }
    };
    
    loadUsuarios();
  }, [interfaz.initialized, dataFetched]);

  // Obtener todos los usuarios
  const getAllUsuarios = async (): Promise<Usuario[]> => {
    try {
      const usuarios = await interfaz.getAllUsuarios();
      setUsuarios(usuarios);
      return usuarios;
    } catch (error) {
      console.error("Error al obtener todos los usuarios:", error);
      return usuarios; // Devolver estado local como fallback
    }
  };

  // Obtener usuario por ID
  const getUsuarioById = async (id: string): Promise<Usuario | null> => {
    try {
      const usuario = await interfaz.getUsuarioById(id);
      
      // Si el usuario no está en el estado local, o tiene datos diferentes, 
      // actualizar el estado local para asegurar sincronización
      if (usuario) {
        const localUserIndex = usuarios.findIndex(u => isSameId(u.id, id));
        if (localUserIndex === -1 || JSON.stringify(usuarios[localUserIndex]) !== JSON.stringify(usuario)) {
          setUsuarios(prev => {
            const newUsuarios = [...prev];
            if (localUserIndex === -1) {
              newUsuarios.push(usuario);
            } else {
              newUsuarios[localUserIndex] = usuario;
            }
            return newUsuarios;
          });
        }
      }
      
      return usuario;
    } catch (error) {
      console.error("Error al obtener usuario por ID:", error);
      // Intentar recuperar del estado local
      const localUser = usuarios.find(u => isSameId(u.id, id));
      return localUser || null;
    }
  };

  // Obtener usuarios por clínica
  const getUsuariosByClinica = async (clinicaId: string): Promise<Usuario[]> => {
    try {
      const usuariosClinica = await interfaz.getUsuariosByClinica(clinicaId);
      return usuariosClinica;
    } catch (error) {
      console.error(`Error al obtener usuarios para la clínica ${clinicaId}:`, error);
      // Filtrar usuarios del estado local que pertenecen a esta clínica
      return usuarios.filter(u => u.clinicasIds.includes(clinicaId));
    }
  };

  // Crear nuevo usuario
  const createUsuario = async (usuario: Omit<Usuario, 'id'>): Promise<string> => {
    try {
      const nuevoUsuario = await interfaz.createUsuario(usuario);
      
      if (nuevoUsuario && nuevoUsuario.id) {
        // Actualizar estado local
        setUsuarios(prev => [...prev, nuevoUsuario]);
        return String(nuevoUsuario.id);
      } else {
        throw new Error("No se pudo crear el usuario");
      }
    } catch (error) {
      console.error("Error al crear usuario:", error);
      throw error;
    }
  };

  // Actualizar usuario
  const updateUsuario = async (id: string, usuario: Partial<Usuario>): Promise<boolean> => {
    try {
      // Asegurar que el ID siempre sea un string
      const usuarioId = String(id);
      const updatedUsuario = await interfaz.updateUsuario(usuarioId, usuario);
      
      if (updatedUsuario) {
        // Actualizar estado local
        setUsuarios(prev => 
          prev.map(u => isSameId(u.id, usuarioId) ? { ...u, ...usuario } : u)
        );
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error al actualizar usuario:", error);
      return false;
    }
  };

  // Eliminar usuario
  const deleteUsuario = async (id: string): Promise<boolean> => {
    try {
      const stringId = String(id);
      const success = await interfaz.deleteUsuario(stringId);
      
      if (success) {
        // Actualizar estado local
        setUsuarios(prev => prev.filter(u => !isSameId(u.id, stringId)));
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      return false;
    }
  };

  // Activar/desactivar usuario
  const toggleUsuarioStatus = async (id: string): Promise<boolean> => {
    try {
      const usuario = await getUsuarioById(id);
      if (!usuario) return false;
      
      const nuevoEstado = !usuario.isActive;
      const resultado = await updateUsuario(id, { isActive: nuevoEstado });
      
      return resultado;
    } catch (error) {
      console.error("Error al cambiar estado del usuario:", error);
      return false;
    }
  };

  const value = {
    usuarios,
    getAllUsuarios,
    getUsuarioById,
    getUsuariosByClinica,
    createUsuario,
    updateUsuario,
    deleteUsuario,
    toggleUsuarioStatus,
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser debe ser usado dentro de un UserProvider")
  }
  return context
} 