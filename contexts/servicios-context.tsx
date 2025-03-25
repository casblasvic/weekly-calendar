"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useInterfaz } from "./interfaz-Context"
import { Servicio as ServicioModel, EntityImage, EntityDocument } from "@/services/data/models/interfaces"

// Alias para tipos específicos usando tipos de interfaz
export type Servicio = ServicioModel;
export type ServicioImage = EntityImage;
export type ServicioDocument = EntityDocument;

interface ServicioContextType {
  servicios: Servicio[]
  servicioActual: Servicio | null
  crearServicio: (servicio: Omit<Servicio, "id">) => Promise<string>
  actualizarServicio: (id: string, servicio: Partial<Servicio>) => Promise<boolean>
  eliminarServicio: (id: string) => Promise<boolean>
  getServicioById: (id: string) => Promise<Servicio | null>
  getServiciosByTarifaId: (tarifaId: string) => Promise<Servicio[]>
  guardarServicio: () => Promise<string>
  setServicioActual: (servicio: Servicio | null) => void
  validarCamposObligatorios: () => { valido: boolean; camposFaltantes: string[] }
  // Funciones para manejar imágenes
  getServiceImages: (servicioId: string) => Promise<ServicioImage[]>
  saveServiceImages: (servicioId: string, images: ServicioImage[]) => Promise<boolean>
  deleteServiceImages: (servicioId: string) => Promise<boolean>
  // Funciones para manejar documentos
  getServiceDocuments: (servicioId: string, category?: string) => Promise<ServicioDocument[]>
  saveServiceDocuments: (servicioId: string, documents: ServicioDocument[], category?: string) => Promise<boolean>
  deleteServiceDocuments: (servicioId: string, category?: string) => Promise<boolean>
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
          // Cargar servicios
          const loadedServicios = await interfaz.getAllServicios();
          setServicios(loadedServicios);
          setDataFetched(true);
          console.log("ServicioContext: Datos cargados correctamente");
        } catch (error) {
          console.error("Error al cargar datos iniciales en ServicioContext:", error);
        }
      }
    };
    
    loadInitialData();
  }, [interfaz.initialized, dataFetched]);

  // Función para disparar el evento de actualización
  const dispatchServicioUpdateEvent = (tarifaId: string, action: string) => {
    try {
      window.dispatchEvent(new CustomEvent("servicios-updated", {
        detail: { tarifaId, action }
      }));
    } catch (eventError) {
      console.error("Error al disparar evento de actualización:", eventError);
      // No bloqueamos la operación principal por un error en el evento
    }
  };

  // Crear nuevo servicio
  const crearServicio = async (servicio: Omit<Servicio, "id">): Promise<string> => {
    try {
      const nuevoServicio = await interfaz.createServicio(servicio);
      
      if (!nuevoServicio || !nuevoServicio.id) {
        throw new Error("No se pudo crear el servicio. Respuesta incompleta del servidor.");
      }
      
      // Actualizar estado local
      setServicios(prev => [...prev, nuevoServicio]);
      setServicioActual(nuevoServicio);
      
      // Disparar evento para notificar cambio en datos
      dispatchServicioUpdateEvent(servicio.tarifaId, 'create');
      
      return nuevoServicio.id;
    } catch (error) {
      console.error("Error al crear servicio:", error);
      throw error;
    }
  };

  // Actualizar servicio existente
  const actualizarServicio = async (id: string, servicioActualizado: Partial<Servicio>): Promise<boolean> => {
    try {
      const resultado = await interfaz.updateServicio(id, servicioActualizado);
      
      if (!resultado) {
        throw new Error("No se pudo actualizar el servicio.");
      }
      
      // Actualizar el estado local
      setServicios(prevServicios => 
        prevServicios.map(servicio => 
          servicio.id === id ? { ...servicio, ...servicioActualizado } : servicio
        )
      );
      
      // Actualizar servicio actual si corresponde
      if (servicioActual && servicioActual.id === id) {
        setServicioActual({...servicioActual, ...servicioActualizado});
      }
      
      // Disparar evento para notificar cambio en datos
      const tarifaId = servicioActualizado.tarifaId || 
        (servicioActual?.tarifaId || '') ||
        servicios.find(s => s.id === id)?.tarifaId || '';
      
      dispatchServicioUpdateEvent(tarifaId, 'update');
      
      return true;
    } catch (error) {
      console.error("Error al actualizar servicio:", error);
      return false;
    }
  };

  // Eliminar servicio
  const eliminarServicio = async (id: string): Promise<boolean> => {
    try {
      // Obtener tarifaId antes de eliminar
      const servicioAEliminar = servicios.find(s => s.id === id);
      const tarifaId = servicioAEliminar?.tarifaId || '';
      
      const resultado = await interfaz.deleteServicio(id);
      
      if (resultado) {
        // Actualizar estado local
        setServicios(prevServicios => prevServicios.filter(servicio => servicio.id !== id));
        
        // Actualizar servicio actual si corresponde
        if (servicioActual && servicioActual.id === id) {
          setServicioActual(null);
        }
        
        // Disparar evento para notificar eliminación
        if (tarifaId) {
          dispatchServicioUpdateEvent(tarifaId, 'delete');
        }
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
      
      // Si no se encuentra el servicio en la interfaz pero está en nuestro estado local
      if (!servicio) {
        const servicioLocal = servicios.find(s => s.id === id);
        if (servicioLocal) {
          console.log("Servicio obtenido del estado local:", id);
          return servicioLocal;
        }
        return null;
      }
      
      return servicio;
    } catch (error) {
      console.error("Error al obtener servicio por ID:", error);
      
      // Intentar recuperar del estado local en caso de error
      const servicioLocal = servicios.find(s => s.id === id);
      if (servicioLocal) {
        console.log("Servicio recuperado del estado local tras error:", id);
        return servicioLocal;
      }
      
      return null;
    }
  };

  // Obtener servicios por tarifa ID
  const getServiciosByTarifaId = async (tarifaId: string): Promise<Servicio[]> => {
    if (!tarifaId) {
      console.warn("Se solicitaron servicios con ID de tarifa vacío");
      return [];
    }
    
    try {
      return await interfaz.getServiciosByTarifaId(tarifaId);
    } catch (error) {
      console.error("Error al obtener servicios por tarifa ID:", error);
      // Intentar recuperar del estado local en caso de error
      const serviciosLocales = servicios.filter(s => s.tarifaId === tarifaId);
      if (serviciosLocales.length > 0) {
        console.log("Servicios recuperados del estado local tras error:", tarifaId);
        return serviciosLocales;
      }
      return [];
    }
  };

  // Guardar el servicio actual (crear si es nuevo o actualizar si existe)
  const guardarServicio = async (): Promise<string> => {
    if (!servicioActual) return "";

    try {
      if (servicioActual.id) {
        // Actualizar existente
        const resultado = await interfaz.updateServicio(servicioActual.id, servicioActual);
        if (resultado) {
          dispatchServicioUpdateEvent(servicioActual.tarifaId, 'update');
          return servicioActual.id;
        }
        throw new Error("No se pudo actualizar el servicio");
      } else {
        // Crear nuevo
        const nuevoServicio = await interfaz.createServicio({
          ...servicioActual as Omit<Servicio, "id">,
        });
        
        if (!nuevoServicio || !nuevoServicio.id) {
          throw new Error("No se pudo crear el servicio");
        }
        
        // Actualizar estado local
        setServicios(prev => [...prev, nuevoServicio]);
        setServicioActual(nuevoServicio);
        
        dispatchServicioUpdateEvent(nuevoServicio.tarifaId, 'create');
        
        return nuevoServicio.id;
      }
    } catch (error) {
      console.error("Error al guardar servicio:", error);
      return "";
    }
  };

  // Validar campos obligatorios
  const validarCamposObligatorios = () => {
    if (!servicioActual) {
      return { valido: false, camposFaltantes: ["Servicio no inicializado"] };
    }

    const camposObligatorios = [
      "nombre",
      "codigo",
      "tarifaId",
      "familiaId",
      "precioConIVA",
      "ivaId"
    ];

    const camposFaltantes = camposObligatorios.filter(
      (campo) => !servicioActual[campo as keyof Servicio]
    );

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
      const imagenes = await interfaz.getEntityImages('servicio', servicioId);
      return imagenes || [];
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
      const resultado = await interfaz.saveEntityImages('servicio', servicioId, images);
      
      // Disparar evento de actualización si fue exitoso
      if (resultado) {
        const servicio = servicios.find(s => s.id === servicioId);
        if (servicio) {
          dispatchServicioUpdateEvent(servicio.tarifaId, 'update-images');
        }
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
      const resultado = await interfaz.deleteEntityImages('servicio', servicioId);
      
      if (resultado) {
        const servicio = servicios.find(s => s.id === servicioId);
        if (servicio) {
          dispatchServicioUpdateEvent(servicio.tarifaId, 'delete-images');
        }
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
      const documentos = await interfaz.getEntityDocuments('servicio', servicioId, category);
      return documentos || [];
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
      const resultado = await interfaz.saveEntityDocuments('servicio', servicioId, documents, category);
      
      // Disparar evento de actualización si fue exitoso
      if (resultado) {
        const servicio = servicios.find(s => s.id === servicioId);
        if (servicio) {
          dispatchServicioUpdateEvent(servicio.tarifaId, 'update-documents');
        }
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
      const resultado = await interfaz.deleteEntityDocuments('servicio', servicioId, category);
      
      if (resultado) {
        const servicio = servicios.find(s => s.id === servicioId);
        if (servicio) {
          dispatchServicioUpdateEvent(servicio.tarifaId, 'delete-documents');
        }
      }
      
      return resultado;
    } catch (error) {
      console.error("Error al eliminar documentos de servicio:", error);
      return false;
    }
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
        getServiciosByTarifaId,
        guardarServicio,
        setServicioActual,
        validarCamposObligatorios,
        getServiceImages,
        saveServiceImages,
        deleteServiceImages,
        getServiceDocuments,
        saveServiceDocuments,
        deleteServiceDocuments
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