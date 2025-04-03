"use client"

import { createContext, useContext, useState, type ReactNode, useEffect } from "react"
import { useInterfaz } from "@/contexts/interfaz-Context"
import { FamiliaServicio, Servicio as ServicioCompleto } from "@/services/data/models/interfaces"

// Interfaz simplificada de Servicio para nuestro caso de uso
interface ServicioBase {
  id: string;
  nombre: string;
  codigo: string;
  familiaId: string;
  duracion: number;
  colorAgenda: string;
  precioConIVA: string;
}

// Tipo que usaremos en toda la aplicación 
// En desarrollo usamos la versión base, en producción la versión completa
export type Servicio = ServicioBase;

// Mock data para familias y servicios
const FAMILIAS_MOCK: FamiliaServicio[] = [
  { id: "fam1", nombre: "Tratamientos faciales", isActive: true },
  { id: "fam2", nombre: "Tratamientos corporales", isActive: true },
  { id: "fam3", nombre: "Depilación", isActive: true },
  { id: "fam4", nombre: "Masajes", isActive: true },
  { id: "fam5", nombre: "Manicura y pedicura", isActive: true },
  { id: "fam6", nombre: "Tratamientos capilares", isActive: true },
];

const SERVICIOS_MOCK: Servicio[] = [
  { id: "serv1", nombre: "Limpieza facial", codigo: "LF", familiaId: "fam1", duracion: 60, colorAgenda: "#f0f8ff", precioConIVA: "45" },
  { id: "serv2", nombre: "Tratamiento anti-edad", codigo: "TAE", familiaId: "fam1", duracion: 90, colorAgenda: "#f0f8ff", precioConIVA: "75" },
  { id: "serv3", nombre: "Hidratación profunda", codigo: "HP", familiaId: "fam1", duracion: 45, colorAgenda: "#f0f8ff", precioConIVA: "55" },
  { id: "serv4", nombre: "Exfoliación corporal", codigo: "EC", familiaId: "fam2", duracion: 60, colorAgenda: "#fff0f5", precioConIVA: "65" },
  { id: "serv5", nombre: "Tratamiento reafirmante", codigo: "TR", familiaId: "fam2", duracion: 90, colorAgenda: "#fff0f5", precioConIVA: "85" },
  { id: "serv6", nombre: "Masaje anticelulítico", codigo: "MA", familiaId: "fam2", duracion: 60, colorAgenda: "#fff0f5", precioConIVA: "70" },
  { id: "serv7", nombre: "Depilación láser", codigo: "DL", familiaId: "fam3", duracion: 30, colorAgenda: "#ffe4e1", precioConIVA: "40" },
  { id: "serv8", nombre: "Depilación con cera", codigo: "DC", familiaId: "fam3", duracion: 45, colorAgenda: "#ffe4e1", precioConIVA: "35" },
  { id: "serv9", nombre: "Masaje relajante", codigo: "MR", familiaId: "fam4", duracion: 60, colorAgenda: "#e6e6fa", precioConIVA: "55" },
  { id: "serv10", nombre: "Masaje descontracturante", codigo: "MD", familiaId: "fam4", duracion: 60, colorAgenda: "#e6e6fa", precioConIVA: "60" },
  { id: "serv11", nombre: "Masaje deportivo", codigo: "MDep", familiaId: "fam4", duracion: 90, colorAgenda: "#e6e6fa", precioConIVA: "75" },
  { id: "serv12", nombre: "Manicura simple", codigo: "MS", familiaId: "fam5", duracion: 30, colorAgenda: "#ffb6c1", precioConIVA: "25" },
  { id: "serv13", nombre: "Pedicura completa", codigo: "PC", familiaId: "fam5", duracion: 45, colorAgenda: "#ffb6c1", precioConIVA: "35" },
  { id: "serv14", nombre: "Esmaltado permanente", codigo: "EP", familiaId: "fam5", duracion: 60, colorAgenda: "#ffb6c1", precioConIVA: "40" },
  { id: "serv15", nombre: "Corte de pelo", codigo: "CP", familiaId: "fam6", duracion: 30, colorAgenda: "#98fb98", precioConIVA: "25" },
  { id: "serv16", nombre: "Tinte", codigo: "TI", familiaId: "fam6", duracion: 90, colorAgenda: "#98fb98", precioConIVA: "60" },
  { id: "serv17", nombre: "Tratamiento hidratante", codigo: "TH", familiaId: "fam6", duracion: 45, colorAgenda: "#98fb98", precioConIVA: "45" },
];

// Funciones auxiliares
function findServicesByFamilyId(familyId: string): Servicio[] {
  return SERVICIOS_MOCK.filter(service => service.familiaId === familyId);
}

interface ServiceContextType {
  familias: FamiliaServicio[];
  servicios: Servicio[];
  getAllFamilias: () => Promise<FamiliaServicio[]>;
  getFamiliaById: (id: string) => Promise<FamiliaServicio | null>;
  getServicioById: (id: string) => Promise<Servicio | null>;
  getServiciosByFamiliaId: (familiaId: string) => Promise<Servicio[]>;
  getAllServicios: () => Promise<Servicio[]>;
}

const ServiceContext = createContext<ServiceContextType | undefined>(undefined);

export function ServiceProvider({ children }: { children: ReactNode }) {
  const [familias, setFamilias] = useState<FamiliaServicio[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [initialized, setInitialized] = useState(false);
  const interfaz = useInterfaz();

  // Inicializar datos
  useEffect(() => {
    const loadData = async () => {
      if (interfaz.initialized && !initialized) {
        try {
          // En producción, esto sería una llamada a la API
          setFamilias(FAMILIAS_MOCK);
          setServicios(SERVICIOS_MOCK);
          setInitialized(true);
        } catch (error) {
          console.error("Error al cargar familias y servicios:", error);
          setFamilias([]);
          setServicios([]);
        }
      }
    };
    
    loadData();
  }, [interfaz.initialized, initialized]);

  // Obtener todas las familias
  const getAllFamilias = async (): Promise<FamiliaServicio[]> => {
    try {
      // En producción, esto sería una llamada a la API
      return [...familias]; // Devolver copia para evitar mutaciones
    } catch (error) {
      console.error("Error al obtener todas las familias:", error);
      return [];
    }
  };

  // Obtener familia por ID
  const getFamiliaById = async (id: string): Promise<FamiliaServicio | null> => {
    try {
      // En producción, esto sería una llamada a la API
      const familia = familias.find(f => String(f.id) === String(id));
      if (familia) {
        // Cargar servicios asociados a esta familia
        const serviciosFamilia = servicios.filter(s => String(s.familiaId) === String(id));
        return {
          ...familia,
          servicios: serviciosFamilia
        };
      }
      return null;
    } catch (error) {
      console.error(`Error al obtener familia con ID ${id}:`, error);
      return null;
    }
  };

  // Obtener servicio por ID
  const getServicioById = async (id: string): Promise<Servicio | null> => {
    try {
      // En producción, esto sería una llamada a la API
      const servicio = servicios.find(s => String(s.id) === String(id));
      return servicio || null;
    } catch (error) {
      console.error(`Error al obtener servicio con ID ${id}:`, error);
      return null;
    }
  };

  // Obtener servicios por familia
  const getServiciosByFamiliaId = async (familiaId: string): Promise<Servicio[]> => {
    try {
      // En producción, esto sería una llamada a la API
      const serviciosFiltrados = servicios.filter(s => String(s.familiaId) === String(familiaId));
      return serviciosFiltrados;
    } catch (error) {
      console.error(`Error al obtener servicios para la familia ${familiaId}:`, error);
      return [];
    }
  };

  // Obtener todos los servicios
  const getAllServicios = async (): Promise<Servicio[]> => {
    try {
      // En producción, esto sería una llamada a la API
      return [...servicios]; // Devolver copia para evitar mutaciones
    } catch (error) {
      console.error("Error al obtener todos los servicios:", error);
      return [];
    }
  };

  const value = {
    familias,
    servicios,
    getAllFamilias,
    getFamiliaById,
    getServicioById,
    getServiciosByFamiliaId,
    getAllServicios
  };

  return <ServiceContext.Provider value={value}>{children}</ServiceContext.Provider>;
}

export function useService() {
  const context = useContext(ServiceContext);
  if (context === undefined) {
    throw new Error("useService debe ser usado dentro de un ServiceProvider");
  }
  return context;
} 