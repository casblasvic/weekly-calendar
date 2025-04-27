"use client"

import { createContext, useContext, useState, type ReactNode, useEffect } from "react"
import { useInterfaz } from "@/contexts/interfaz-Context"
import type { Category as PrismaFamily, Service as PrismaService } from '@prisma/client'

// Define a new type that extends PrismaFamily and includes services
interface CategoryWithServices extends PrismaFamily {
  servicios?: PrismaService[]; // Optional array of services
}

// Mock data para familias (Category)
const FAMILIAS_MOCK: PrismaFamily[] = [
  { id: "fam1", name: "Tratamientos faciales", description: null, systemId: "sys1", parentId: null, createdAt: new Date(), updatedAt: new Date() },
  { id: "fam2", name: "Tratamientos corporales", description: null, systemId: "sys1", parentId: null, createdAt: new Date(), updatedAt: new Date() },
  { id: "fam3", name: "Depilación", description: null, systemId: "sys1", parentId: null, createdAt: new Date(), updatedAt: new Date() },
  { id: "fam4", name: "Masajes", description: null, systemId: "sys1", parentId: null, createdAt: new Date(), updatedAt: new Date() },
  { id: "fam5", name: "Manicura y pedicura", description: null, systemId: "sys1", parentId: null, createdAt: new Date(), updatedAt: new Date() },
  { id: "fam6", name: "Tratamientos capilares", description: null, systemId: "sys1", parentId: null, createdAt: new Date(), updatedAt: new Date() },
];

// Mock data para servicios (Service)
const SERVICIOS_MOCK: PrismaService[] = [
  { id: "serv1", name: "Limpieza facial", code: "LF", categoryId: "fam1", durationMinutes: 60, colorCode: "#f0f8ff", price: 45, description: null, systemId: "sys1", requiresMedicalSignOff: false, pointsAwarded: 0, isActive: true, vatTypeId: "vat1", createdAt: new Date(), updatedAt: new Date() },
  { id: "serv2", name: "Tratamiento anti-edad", code: "TAE", categoryId: "fam1", durationMinutes: 90, colorCode: "#f0f8ff", price: 75, description: null, systemId: "sys1", requiresMedicalSignOff: false, pointsAwarded: 0, isActive: true, vatTypeId: "vat1", createdAt: new Date(), updatedAt: new Date() },
  { id: "serv3", name: "Hidratación profunda", code: "HP", categoryId: "fam1", durationMinutes: 45, colorCode: "#f0f8ff", price: 55, description: null, systemId: "sys1", requiresMedicalSignOff: false, pointsAwarded: 0, isActive: true, vatTypeId: "vat1", createdAt: new Date(), updatedAt: new Date() },
  { id: "serv4", name: "Exfoliación corporal", code: "EC", categoryId: "fam2", durationMinutes: 60, colorCode: "#fff0f5", price: 65, description: null, systemId: "sys1", requiresMedicalSignOff: false, pointsAwarded: 0, isActive: true, vatTypeId: "vat1", createdAt: new Date(), updatedAt: new Date() },
  { id: "serv5", name: "Tratamiento reafirmante", code: "TR", categoryId: "fam2", durationMinutes: 90, colorCode: "#fff0f5", price: 85, description: null, systemId: "sys1", requiresMedicalSignOff: false, pointsAwarded: 0, isActive: true, vatTypeId: "vat1", createdAt: new Date(), updatedAt: new Date() },
  { id: "serv6", name: "Masaje anticelulítico", code: "MA", categoryId: "fam2", durationMinutes: 60, colorCode: "#fff0f5", price: 70, description: null, systemId: "sys1", requiresMedicalSignOff: false, pointsAwarded: 0, isActive: true, vatTypeId: "vat1", createdAt: new Date(), updatedAt: new Date() },
  { id: "serv7", name: "Depilación láser", code: "DL", categoryId: "fam3", durationMinutes: 30, colorCode: "#ffe4e1", price: 40, description: null, systemId: "sys1", requiresMedicalSignOff: true, pointsAwarded: 0, isActive: true, vatTypeId: "vat1", createdAt: new Date(), updatedAt: new Date() },
  { id: "serv8", name: "Depilación con cera", code: "DC", categoryId: "fam3", durationMinutes: 45, colorCode: "#ffe4e1", price: 35, description: null, systemId: "sys1", requiresMedicalSignOff: false, pointsAwarded: 0, isActive: true, vatTypeId: "vat1", createdAt: new Date(), updatedAt: new Date() },
  { id: "serv9", name: "Masaje relajante", code: "MR", categoryId: "fam4", durationMinutes: 60, colorCode: "#e6e6fa", price: 55, description: null, systemId: "sys1", requiresMedicalSignOff: false, pointsAwarded: 0, isActive: true, vatTypeId: "vat1", createdAt: new Date(), updatedAt: new Date() },
  { id: "serv10", name: "Masaje descontracturante", code: "MD", categoryId: "fam4", durationMinutes: 60, colorCode: "#e6e6fa", price: 60, description: null, systemId: "sys1", requiresMedicalSignOff: false, pointsAwarded: 0, isActive: true, vatTypeId: "vat1", createdAt: new Date(), updatedAt: new Date() },
  { id: "serv11", name: "Masaje deportivo", code: "MDep", categoryId: "fam4", durationMinutes: 90, colorCode: "#e6e6fa", price: 75, description: null, systemId: "sys1", requiresMedicalSignOff: false, pointsAwarded: 0, isActive: true, vatTypeId: "vat1", createdAt: new Date(), updatedAt: new Date() },
  { id: "serv12", name: "Manicura simple", code: "MS", categoryId: "fam5", durationMinutes: 30, colorCode: "#ffb6c1", price: 25, description: null, systemId: "sys1", requiresMedicalSignOff: false, pointsAwarded: 0, isActive: true, vatTypeId: "vat1", createdAt: new Date(), updatedAt: new Date() },
  { id: "serv13", name: "Pedicura completa", code: "PC", categoryId: "fam5", durationMinutes: 45, colorCode: "#ffb6c1", price: 35, description: null, systemId: "sys1", requiresMedicalSignOff: false, pointsAwarded: 0, isActive: true, vatTypeId: "vat1", createdAt: new Date(), updatedAt: new Date() },
  { id: "serv14", name: "Esmaltado permanente", code: "EP", categoryId: "fam5", durationMinutes: 60, colorCode: "#ffb6c1", price: 40, description: null, systemId: "sys1", requiresMedicalSignOff: false, pointsAwarded: 0, isActive: true, vatTypeId: "vat1", createdAt: new Date(), updatedAt: new Date() },
  { id: "serv15", name: "Corte de pelo", code: "CP", categoryId: "fam6", durationMinutes: 30, colorCode: "#98fb98", price: 25, description: null, systemId: "sys1", requiresMedicalSignOff: false, pointsAwarded: 0, isActive: true, vatTypeId: "vat1", createdAt: new Date(), updatedAt: new Date() },
  { id: "serv16", name: "Tinte", code: "TI", categoryId: "fam6", durationMinutes: 90, colorCode: "#98fb98", price: 60, description: null, systemId: "sys1", requiresMedicalSignOff: false, pointsAwarded: 0, isActive: true, vatTypeId: "vat1", createdAt: new Date(), updatedAt: new Date() },
  { id: "serv17", name: "Tratamiento hidratante", code: "TH", categoryId: "fam6", durationMinutes: 45, colorCode: "#98fb98", price: 45, description: null, systemId: "sys1", requiresMedicalSignOff: false, pointsAwarded: 0, isActive: true, vatTypeId: "vat1", createdAt: new Date(), updatedAt: new Date() },
];

// Funciones auxiliares
function findServicesByCategoryId(categoryId: string): PrismaService[] {
  return SERVICIOS_MOCK.filter(service => service.categoryId === categoryId);
}

interface ServiceContextType {
  familias: PrismaFamily[];
  servicios: PrismaService[];
  selectedService: PrismaService | null;
  getFamiliaById: (id: string) => Promise<CategoryWithServices | null>;
  getServiceById: (id: string) => Promise<PrismaService | null>;
  setSelectedServiceById: (id: string | null) => void;
  loading: boolean;
  getAllFamilias: () => Promise<PrismaFamily[]>;
  getServiciosByCategoryId: (categoryId: string) => Promise<PrismaService[]>;
  getAllServicios: () => Promise<PrismaService[]>;
}

const ServiceContext = createContext<ServiceContextType | undefined>(undefined);

export function ServiceProvider({ children }: { children: ReactNode }) {
  const [familias, setFamilias] = useState<PrismaFamily[]>([]);
  const [servicios, setServicios] = useState<PrismaService[]>([]);
  const [initialized, setInitialized] = useState(false);
  const interfaz = useInterfaz();
  const [selectedService, setSelectedService] = useState<PrismaService | null>(null);
  const [loading, setLoading] = useState(false);

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
  const getAllFamilias = async (): Promise<PrismaFamily[]> => {
    try {
      // En producción, esto sería una llamada a la API
      return [...familias]; // Devolver copia para evitar mutaciones
    } catch (error) {
      console.error("Error al obtener todas las familias:", error);
      return [];
    }
  };

  // Obtener familia por ID
  const getFamiliaById = async (id: string): Promise<CategoryWithServices | null> => {
    try {
      setLoading(true);
      // En producción, esto sería una llamada a la API
      const familia = familias.find(f => String(f.id) === String(id));
      if (familia) {
        // Cargar servicios asociados a esta categoría (familia)
        const serviciosCategoria = servicios.filter(s => String(s.categoryId) === String(id));
        // Construct the object with the new type
        const familiaConServicios: CategoryWithServices = {
          ...familia,
          servicios: serviciosCategoria
        };
        return familiaConServicios;
      } else {
        return null;
      }
    } catch (error) {
      console.error(`Error al obtener familia con ID ${id}:`, error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Obtener servicio por ID
  const getServiceById = async (id: string): Promise<PrismaService | null> => {
    try {
      // En producción, esto sería una llamada a la API
      const servicio = servicios.find(s => String(s.id) === String(id));
      return servicio || null;
    } catch (error) {
      console.error(`Error al obtener servicio con ID ${id}:`, error);
      return null;
    }
  };

  // Obtener servicios por categoría (familia)
  const getServiciosByCategoryId = async (categoryId: string): Promise<PrismaService[]> => {
    try {
      // En producción, esto sería una llamada a la API
      const serviciosFiltrados = servicios.filter(s => String(s.categoryId) === String(categoryId));
      return serviciosFiltrados;
    } catch (error) {
      console.error(`Error al obtener servicios para la categoría ${categoryId}:`, error);
      return [];
    }
  };

  // Obtener todos los servicios
  const getAllServicios = async (): Promise<PrismaService[]> => {
    try {
      // En producción, esto sería una llamada a la API
      return [...servicios]; // Devolver copia para evitar mutaciones
    } catch (error) {
      console.error("Error al obtener todos los servicios:", error);
      return [];
    }
  };

  const setSelectedServiceById = (id: string | null) => {
    if (id === null) {
      setSelectedService(null);
    } else {
      getServiceById(id).then(service => {
        if (service) {
          setSelectedService(service);
        }
      });
    }
  };

  const value = {
    familias,
    servicios,
    selectedService,
    getFamiliaById,
    getServiceById,
    setSelectedServiceById,
    loading,
    getAllFamilias,
    getServiciosByCategoryId,
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