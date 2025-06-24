"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useInterfaz } from "./interfaz-Context"
// QUITAR importación antigua
// import { Servicio as ServicioModel, EntityImage, EntityDocument } from "@/services/data/models/interfaces"
// USAR importación de Prisma
import { Service as PrismaService, EntityImage, EntityDocument, EntityType } from '@prisma/client';

// Alias para tipos específicos usando tipos de Prisma
export type Servicio = PrismaService; // Usar PrismaService
export type ServicioImage = EntityImage;
export type ServicioDocument = EntityDocument;

interface ServicioContextType {
  servicios: Servicio[]
  servicioActual: Servicio | null
  crearServicio: (servicio: Omit<Servicio, "id" | "createdAt" | "updatedAt" | "systemId">) => Promise<string> // Ajustar tipo Omit
  actualizarServicio: (id: string, servicio: Partial<Omit<Servicio, "id" | "createdAt" | "updatedAt" | "systemId">>) => Promise<boolean> // Ajustar tipo Partial
  eliminarServicio: (id: string) => Promise<boolean>
  getServicioById: (id: string) => Promise<Servicio | null>
  getServiciosByCategoryId: (categoryId: string) => Promise<Servicio[]> // Cambiar tarifaId por categoryId
  // guardarServicio: () => Promise<string> // Eliminar, usar crear/actualizar
  setServicioActual: (servicio: Servicio | null) => void
  validarCamposObligatorios: (servicio: Partial<Servicio>) => { valido: boolean; camposFaltantes: string[] } // Pasar servicio como argumento
  // Funciones para manejar imágenes
  getServiceImages: (servicioId: string) => Promise<ServicioImage[]>
  saveServiceImages: (servicioId: string, images: ServicioImage[]) => Promise<boolean>
  deleteServiceImages: (servicioId: string) => Promise<boolean>
  // Funciones para manejar documentos
  getServiceDocuments: (servicioId: string, category?: string) => Promise<ServicioDocument[]>
  saveServiceDocuments: (servicioId: string, documents: ServicioDocument[], category?: string) => Promise<boolean>
  deleteServiceDocuments: (servicioId: string, category?: string) => Promise<boolean>
  getAllServicios: () => Promise<Servicio[]>;
}

const ServicioContext = createContext<ServicioContextType | undefined>(undefined);

export const ServicioProvider = ({ children }: { children: ReactNode }) => {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [servicioActual, setServicioActual] = useState<Servicio | null>(null);
  const [dataFetched, setDataFetched] = useState(false);
  const router = useRouter();
  const interfaz = useInterfaz();

  // Cargar datos iniciales
  useEffect(() => {
    const loadInitialData = async () => {
      if (interfaz.initialized && !dataFetched) {
        try {
          const loadedServicios = await interfaz.getAllServicios();
          setServicios(loadedServicios as Servicio[]); // Cast a Servicio (PrismaService)
          setDataFetched(true);
          // console.log("ServicioContext: Datos cargados correctamente"); // Log optimizado
        } catch (error) {
          console.error("Error al cargar datos iniciales en ServicioContext:", error);
        }
      }
    };
    loadInitialData();
  }, [interfaz.initialized, dataFetched]);

  // Función para disparar el evento de actualización
  const dispatchServicioUpdateEvent = (categoryId: string | null | undefined, action: string) => {
    try {
      // Usar categoryId o un valor genérico si no está disponible
      window.dispatchEvent(new CustomEvent("servicios-updated", {
        detail: { categoryId: categoryId ?? 'all', action }
      }));
    } catch (eventError) {
      console.error("Error al disparar evento de actualización:", eventError);
    }
  };

  // Crear nuevo servicio - Adaptado a PrismaService
  const crearServicio = async (servicio: Omit<Servicio, "id" | "createdAt" | "updatedAt" | "systemId">): Promise<string> => {
    try {
      // Asegurarse que los campos obligatorios no opcionales estén
      const servicioParaCrear = {
        ...servicio,
        // Asegurar valores default si son obligatorios en Prisma
        name: servicio.name || "Servicio sin nombre",
        durationMinutes: servicio.durationMinutes || 0,
        // Los campos de ServiceSetting ya no están directamente en Service
        // requiresMedicalSignOff: servicio.requiresMedicalSignOff ?? false,
        // pointsAwarded: servicio.pointsAwarded ?? 0,
        // price, code, categoryId, vatTypeId, colorCode deben venir en el objeto
      };
      const nuevoServicio = await interfaz.createServicio(servicioParaCrear as any); // Usar any temporalmente

      if (!nuevoServicio || !nuevoServicio.id) {
        throw new Error("No se pudo crear el servicio. Respuesta incompleta del servidor.");
      }

      const nuevoServicioPrisma = nuevoServicio as Servicio;
      setServicios(prev => [...prev, nuevoServicioPrisma]);
      setServicioActual(nuevoServicioPrisma);
      dispatchServicioUpdateEvent(nuevoServicioPrisma.categoryId, 'create');
      return nuevoServicioPrisma.id;
    } catch (error) {
      console.error("Error al crear servicio:", error);
      throw error;
    }
  };

  // Actualizar servicio existente - Adaptado a PrismaService
  const actualizarServicio = async (id: string, servicioActualizado: Partial<Omit<Servicio, "id" | "createdAt" | "updatedAt" | "systemId">>): Promise<boolean> => {
    try {
      const resultado = await interfaz.updateServicio(id, servicioActualizado as any); // Usar any temporalmente

      if (!resultado) {
        throw new Error("No se pudo actualizar el servicio.");
      }
      const updatedServicePrisma = resultado as Servicio; // Cast al tipo correcto

      setServicios(prevServicios =>
        prevServicios.map(servicio =>
          servicio.id === id ? updatedServicePrisma : servicio
        )
      );

      if (servicioActual && servicioActual.id === id) {
        setServicioActual(updatedServicePrisma);
      }

      dispatchServicioUpdateEvent(updatedServicePrisma.categoryId, 'update');
      return true;
    } catch (error) {
      console.error("Error al actualizar servicio:", error);
      return false;
    }
  };

  // Eliminar servicio
  const eliminarServicio = async (id: string): Promise<boolean> => {
    try {
      const servicioAEliminar = servicios.find(s => s.id === id);
      const categoryId = servicioAEliminar?.categoryId;

      const resultado = await interfaz.deleteServicio(id);

      if (resultado) {
        setServicios(prevServicios => prevServicios.filter(servicio => servicio.id !== id));
        if (servicioActual && servicioActual.id === id) {
          setServicioActual(null);
        }
        dispatchServicioUpdateEvent(categoryId, 'delete');
      }
      return resultado;
    } catch (error) {
      console.error("Error al eliminar servicio:", error);
      return false;
    }
  };

  // Obtener servicio por ID
  const getServicioById = async (id: string): Promise<Servicio | null> => {
    if (!id) {
      console.warn("Se solicitó un servicio con ID vacío");
      return null;
    }
    try {
      const servicio = await interfaz.getServicioById(id);
      if (!servicio) {
        const servicioLocal = servicios.find(s => s.id === id);
        if (servicioLocal) {
          console.log("Servicio obtenido del estado local:", id);
          return servicioLocal;
        }
        return null;
      }
      return servicio as Servicio; // Cast a Servicio (PrismaService)
    } catch (error) {
      console.error("Error al obtener servicio por ID:", error);
      const servicioLocal = servicios.find(s => s.id === id);
      if (servicioLocal) {
        console.log("Servicio recuperado del estado local tras error:", id);
        return servicioLocal;
      }
      return null;
    }
  };

  // Obtener servicios por Category ID
  const getServiciosByCategoryId = async (categoryId: string): Promise<Servicio[]> => {
    if (!categoryId) {
      console.warn("Se solicitaron servicios con ID de categoría vacío");
      return [];
    }
    try {
      // Asumiendo que interfaz tiene un método para esto o getAllServicios y filtramos
      // const serviciosCategoria = await interfaz.getServiciosByCategoryId(categoryId);
      // Por ahora, filtrar del estado local
      const serviciosCategoria = servicios.filter(s => s.categoryId === categoryId);
      return serviciosCategoria as Servicio[];
    } catch (error) {
      console.error(`Error al obtener servicios para la categoría ${categoryId}:`, error);
      return [];
    }
  };

  // Eliminar guardarServicio, usar crearServicio/actualizarServicio directamente
  // const guardarServicio = ...

  // Validar campos obligatorios - Adaptado a PrismaService
  const validarCamposObligatorios = (servicio: Partial<Servicio>) => {
    // No usar servicioActual directamente
    const camposFaltantes = [];
    if (!servicio.name?.trim()) camposFaltantes.push('Nombre');
    if (!servicio.code?.trim()) camposFaltantes.push('Código');
    if (!servicio.categoryId) camposFaltantes.push('Categoría');
    // durationMinutes es number, no string
    if (servicio.durationMinutes === undefined || servicio.durationMinutes === null || servicio.durationMinutes <= 0) camposFaltantes.push('Duración (debe ser > 0)');
    // price es number, no string
    const precioNum = servicio.price ?? 0;
    if (precioNum > 0 && !servicio.vatTypeId) {
      camposFaltantes.push('Tipo de IVA (requerido si Precio > 0)');
    }

    return {
      valido: camposFaltantes.length === 0,
      camposFaltantes,
    };
  };

  // Funciones para manejar imágenes
  const getServiceImages = async (servicioId: string): Promise<ServicioImage[]> => {
    if (!servicioId) {
      console.warn("Se solicitaron imágenes con ID de servicio vacío");
      return [];
    }
    try {
      // Usar EntityType.SERVICE
      const imagenes = await interfaz.getEntityImages(EntityType.SERVICE, servicioId);
      return (imagenes || []) as ServicioImage[]; // Cast a ServicioImage (EntityImage)
    } catch (error) {
      console.error("Error al obtener imágenes de servicio:", error);
      return [];
    }
  };

  const saveServiceImages = async (servicioId: string, images: ServicioImage[]): Promise<boolean> => {
    if (!servicioId) {
      console.warn("Se intentaron guardar imágenes con ID de servicio vacío");
      return false;
    }
    try {
      // Usar EntityType.SERVICE
      const resultado = await interfaz.saveEntityImages(EntityType.SERVICE, servicioId, images);
      if (resultado) {
        const servicio = servicios.find(s => s.id === servicioId);
        dispatchServicioUpdateEvent(servicio?.categoryId, 'update-images');
      }
      return resultado;
    } catch (error) {
      console.error("Error al guardar imágenes de servicio:", error);
      return false;
    }
  };

  const deleteServiceImages = async (servicioId: string): Promise<boolean> => {
    if (!servicioId) {
      console.warn("Se intentaron eliminar imágenes con ID de servicio vacío");
      return false;
    }
    try {
      // Usar EntityType.SERVICE
      const resultado = await interfaz.deleteEntityImages(EntityType.SERVICE, servicioId);
      if (resultado) {
        const servicio = servicios.find(s => s.id === servicioId);
        dispatchServicioUpdateEvent(servicio?.categoryId, 'delete-images');
      }
      return resultado;
    } catch (error) {
      console.error("Error al eliminar imágenes de servicio:", error);
      return false;
    }
  };

  // Funciones para manejar documentos
  const getServiceDocuments = async (servicioId: string, category: string = 'default'): Promise<ServicioDocument[]> => {
    if (!servicioId) {
      console.warn("Se solicitaron documentos con ID de servicio vacío");
      return [];
    }
    try {
      // Usar EntityType.SERVICE
      const documentos = await interfaz.getEntityDocuments(EntityType.SERVICE, servicioId, category);
      return (documentos || []) as ServicioDocument[]; // Cast a ServicioDocument (EntityDocument)
    } catch (error) {
      console.error("Error al obtener documentos de servicio:", error);
      return [];
    }
  };

  const saveServiceDocuments = async (
    servicioId: string,
    documents: ServicioDocument[],
    category: string = 'default'
  ): Promise<boolean> => {
    if (!servicioId) {
      console.warn("Se intentaron guardar documentos con ID de servicio vacío");
      return false;
    }
    try {
      // Usar EntityType.SERVICE
      const resultado = await interfaz.saveEntityDocuments(EntityType.SERVICE, servicioId, documents, category);
      if (resultado) {
        const servicio = servicios.find(s => s.id === servicioId);
        dispatchServicioUpdateEvent(servicio?.categoryId, 'update-documents');
      }
      return resultado;
    } catch (error) {
      console.error("Error al guardar documentos de servicio:", error);
      return false;
    }
  };

  const deleteServiceDocuments = async (
    servicioId: string,
    category: string = 'default'
  ): Promise<boolean> => {
    if (!servicioId) {
      console.warn("Se intentaron eliminar documentos con ID de servicio vacío");
      return false;
    }
    try {
      // Usar EntityType.SERVICE
      const resultado = await interfaz.deleteEntityDocuments(EntityType.SERVICE, servicioId, category);
      if (resultado) {
        const servicio = servicios.find(s => s.id === servicioId);
        dispatchServicioUpdateEvent(servicio?.categoryId, 'delete-documents');
      }
      return resultado;
    } catch (error) {
      console.error("Error al eliminar documentos de servicio:", error);
      return false;
    }
  };

  // Implementar getAllServicios
  const getAllServicios = async (): Promise<Servicio[]> => {
    return [...servicios];
  };

  return (
    <ServicioContext.Provider
      value={{
        servicios,
        servicioActual,
        crearServicio,
        actualizarServicio,
        eliminarServicio,
        getServicioById,
        // Cambiado a getServiciosByCategoryId
        getServiciosByCategoryId,
        // guardarServicio, // Eliminado
        setServicioActual,
        validarCamposObligatorios,
        getServiceImages,
        saveServiceImages,
        deleteServiceImages,
        getServiceDocuments,
        saveServiceDocuments,
        deleteServiceDocuments,
        getAllServicios
      }}
    >
      {children}
    </ServicioContext.Provider>
  );
};

export const useServicio = () => {
  const context = useContext(ServicioContext);
  if (context === undefined) {
    throw new Error('useServicio debe ser usado dentro de un ServicioProvider');
  }
  return context;
}; 