"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useServicio } from "./servicios-context"
import { useInterfaz } from "./interfaz-Context"
import type { ServiceConsumption } from "@prisma/client";

// Use Prisma type
export type Consumo = ServiceConsumption;

// Ensure fields match Prisma ServiceConsumption
export interface ConsumoExtendido extends Consumo {
  productoNombre: string; // Added field
  // order: number; // Already in ServiceConsumption
  alternativas?: Array<{ // Added field
    productoId: string
    productoNombre: string
    cantidad: number // This is likely a UI/local concept, Prisma uses `quantity` (Float)
  }>;
  // Ensure all fields from ServiceConsumption are potentially present or correctly omitted/mapped
}

// Define input type for adding a new consumption item
interface AddConsumoInput {
  productId: string; // Ensure string type
  quantity: number; // Matches Prisma Float
  order?: number | null;
  notes?: string | null;
  // Extended fields required for local state
  productoNombre: string;
  alternativas?: Array<{ 
    productoId: string;
    productoNombre: string
    cantidad: number 
  }> | null;
}

interface ConsumoServicioContextType {
  consumos: ConsumoExtendido[];
  loading: boolean;
  // Use specific input type for agregarConsumo
  agregarConsumo: (consumoData: AddConsumoInput) => Promise<string>; 
  actualizarConsumo: (consumo: ConsumoExtendido) => Promise<void>;
  eliminarConsumo: (id: string) => Promise<void>;
  getConsumosByServicioId: (serviceId: string) => Promise<ConsumoExtendido[]>;
  reordenarConsumos: (id: string, direccion: 'arriba' | 'abajo') => Promise<void>;
  refreshConsumos: () => Promise<void>;
}

const ConsumoServicioContext = createContext<ConsumoServicioContextType | undefined>(undefined);

export const ConsumoServicioProvider = ({ children }: { children: ReactNode }) => {
  const [consumos, setConsumos] = useState<ConsumoExtendido[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataFetched, setDataFetched] = useState(false);
  const { servicioActual } = useServicio(); 
  const interfaz = useInterfaz();

  // Cargar datos iniciales utilizando la interfaz
  useEffect(() => {
    if (interfaz.initialized && !dataFetched) {
      loadConsumos();
    }
  }, [interfaz.initialized, dataFetched, servicioActual?.id]);

  // Función para cargar consumos
  const loadConsumos = async () => {
    try {
      setLoading(true);
      
      // Cargar desde la interfaz centralizada cuando esté implementada
      // En el futuro: const data = await interfaz.getAllConsumos();
      
      // Mientras tanto, cargar desde localStorage como fallback
      const storedConsumos = localStorage.getItem("consumos");
      if (storedConsumos) {
        setConsumos(JSON.parse(storedConsumos));
      }
      
      setDataFetched(true);
    } catch (error) {
      console.error("Error al cargar consumos:", error);
    } finally {
      setLoading(false);
    }
  };

  // Guardar en localStorage cuando cambien
  useEffect(() => {
    try {
      localStorage.setItem("consumos", JSON.stringify(consumos));
    } catch (error) {
      console.error("Error al guardar consumos en localStorage:", error);
    }
  }, [consumos]);

  // Agregar nuevo consumo using specific input type
  const agregarConsumo = async (consumoData: AddConsumoInput): Promise<string> => {
    try {
      if (!servicioActual) {
        throw new Error("No hay un servicio activo para asociar el consumo");
      }
      
      // Prepare data for Prisma ServiceConsumption using AddConsumoInput
      const consumoParaInterfaz: Omit<Consumo, 'id' | 'createdAt' | 'updatedAt' | 'serviceId'> = {
        // serviceId is added by the backend or wrapper usually, but needed if interfaz expects it
        // serviceId: servicioActual.id, // Assuming servicioActual.id provides the correct serviceId
        productId: consumoData.productId, // Directly use string from AddConsumoInput
        quantity: consumoData.quantity, 
        order: consumoData.order ?? null, // Handle optional
        notes: consumoData.notes ?? null // Handle optional
      };

      console.warn("ConsumoServicioContext: interfaz.createConsumo needs implementation for Prisma.");
      // En el futuro: const nuevoConsumoDB = await interfaz.createConsumo({ ...consumoParaInterfaz, serviceId: servicioActual.id });
      
      // Mock creation
      const generatedId = `cons-${Date.now()}`;
      const now = new Date();
      // Construct the full ConsumoExtendido for local state
      const nuevoConsumoExtendido: ConsumoExtendido = {
        id: generatedId,
        serviceId: servicioActual.id, // Use correct field name
        productId: consumoData.productId, 
        quantity: consumoData.quantity,
        order: consumoData.order ?? 0, // Use a default order if needed for local state
        notes: consumoData.notes ?? null,
        createdAt: now,
        updatedAt: now,
        productoNombre: consumoData.productoNombre, 
        alternativas: consumoData.alternativas ?? undefined,
      };
      setConsumos(prev => [...prev, nuevoConsumoExtendido]);
      return generatedId;
    } catch (error) {
      console.error("Error al agregar consumo:", error);
      throw error;
    }
  };

  // Actualizar consumo existente
  const actualizarConsumo = async (consumoActualizado: ConsumoExtendido) => {
    try {
       console.warn("ConsumoServicioContext: interfaz.updateConsumo needs implementation for Prisma.");
       // Prepare payload for potential DB update, omitting extended fields
       const updatePayload: Partial<Omit<ServiceConsumption, 'id' | 'createdAt' | 'updatedAt' | 'serviceId'>> = {};
       // Only include fields that might change and are part of ServiceConsumption
       if (consumoActualizado.productId !== undefined) updatePayload.productId = String(consumoActualizado.productId); // Ensure string
       if (consumoActualizado.quantity !== undefined) updatePayload.quantity = consumoActualizado.quantity;
       if (consumoActualizado.order !== undefined) updatePayload.order = consumoActualizado.order;
       if (consumoActualizado.notes !== undefined) updatePayload.notes = consumoActualizado.notes;
       
      // En el futuro: await interfaz.updateConsumo(consumoActualizado.id, updatePayload);
      
      // Update local state optimistically
      setConsumos(prevConsumos => 
        prevConsumos.map(consumo => 
          consumo.id === consumoActualizado.id ? consumoActualizado : consumo
        )
      );
    } catch (error) {
      console.error("Error al actualizar consumo:", error);
      throw error;
    }
  };

  // Eliminar consumo
  const eliminarConsumo = async (id: string) => {
    try {
      console.warn("ConsumoServicioContext: interfaz.deleteConsumo needs implementation for Prisma.");
      // En el futuro: await interfaz.deleteConsumo(id);
      
      setConsumos(prevConsumos => prevConsumos.filter(consumo => consumo.id !== id));
    } catch (error) {
      console.error("Error al eliminar consumo:", error);
      throw error;
    }
  };

  // Obtener consumos por servicio ID
  const getConsumosByServicioId = async (serviceId: string): Promise<ConsumoExtendido[]> => { // Use serviceId
    try {
       console.warn("ConsumoServicioContext: interfaz.getConsumosByServicioId needs implementation for Prisma.");
       // Filter local state using serviceId
       return consumos.filter(consumo => consumo.serviceId === serviceId);
    } catch (error) {
       console.error("Error al obtener consumos por servicio:", error);
       return [];
    }
  };

  // Reordenar consumos
  const reordenarConsumos = async (id: string, direccion: 'arriba' | 'abajo') => {
    try {
      if (!servicioActual) return;
      // Filter using serviceId
      const consumosServicio = consumos.filter(c => c.serviceId === servicioActual.id);
      const index = consumosServicio.findIndex(c => c.id === id);
      if (index < 0) return;
      
      const consumosOrdenados = [...consumosServicio]; 
      
      let swapIndex = -1;
      if (direccion === 'arriba' && index > 0) {
         swapIndex = index - 1;
      } else if (direccion === 'abajo' && index < consumosOrdenados.length - 1) {
         swapIndex = index + 1;
      }

      if (swapIndex !== -1) {
          // Swap the 'order' property (handle nullish values)
          const orderA = consumosOrdenados[index].order ?? 0;
          const orderB = consumosOrdenados[swapIndex].order ?? 0;
          consumosOrdenados[index].order = orderB;
          consumosOrdenados[swapIndex].order = orderA;
          
          // Update the main state array preserving identity and order
          setConsumos(prevConsumos => 
              prevConsumos.map(c => consumosOrdenados.find(co => co.id === c.id) || c)
                          .sort((a,b) => (a.order ?? 0) - (b.order ?? 0)) // Ensure sorted after update
          );

          console.warn("ConsumoServicioContext: Need to persist reordered consumptions via interfaz.updateConsumo.");
          // En el futuro: await Promise.all(consumosOrdenados.map(c => interfaz.updateConsumo(c.id, { order: c.order })));
      } 

    } catch (error) {
      console.error("Error al reordenar consumos:", error);
      throw error;
    }
  };
  
  const refreshConsumos = async () => {
    setDataFetched(false); // Esto forzará la recarga en el useEffect
  };

  // Filter consumos for the current service using serviceId
  const consumosServicioActual = servicioActual 
    ? consumos.filter(c => c.serviceId === servicioActual.id)
    : [];

  // Provide sorted consumos in context value
  return (
    <ConsumoServicioContext.Provider value={{
      consumos: consumosServicioActual.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), 
      loading,
      agregarConsumo,
      actualizarConsumo,
      eliminarConsumo,
      getConsumosByServicioId,
      reordenarConsumos,
      refreshConsumos
    }}>
      {children}
    </ConsumoServicioContext.Provider>
  );
};

export const useConsumoServicio = () => {
  const context = useContext(ConsumoServicioContext);
  if (context === undefined) {
    throw new Error("useConsumoServicio debe ser usado dentro de un ConsumoServicioProvider");
  }
  return context;
}; 