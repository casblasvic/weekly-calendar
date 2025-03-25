"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useServicio } from "./servicios-context"
import { useInterfaz } from "./interfaz-Context"
import { Consumo as ConsumoModel } from "@/services/data/models/interfaces"

// Utilizamos el tipo del modelo central
export type Consumo = ConsumoModel;

// Añadimos propiedades adicionales necesarias para nuestra aplicación
export interface ConsumoExtendido extends Consumo {
  productoNombre: string;
  orden: number;
  alternativas?: Array<{
    productoId: string
    productoNombre: string
    cantidad: number
  }>;
}

interface ConsumoServicioContextType {
  consumos: ConsumoExtendido[];
  loading: boolean;
  agregarConsumo: (consumo: Omit<ConsumoExtendido, "servicioId">) => Promise<string>;
  actualizarConsumo: (consumo: ConsumoExtendido) => Promise<void>;
  eliminarConsumo: (id: string) => Promise<void>;
  getConsumosByServicioId: (servicioId: string) => Promise<ConsumoExtendido[]>;
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

  // Agregar nuevo consumo
  const agregarConsumo = async (consumo: Omit<ConsumoExtendido, "servicioId">): Promise<string> => {
    try {
      if (!servicioActual) {
        throw new Error("No hay un servicio activo para asociar el consumo");
      }
      
      // En el futuro: const nuevoConsumo = await interfaz.createConsumo({...consumo, servicioId: servicioActual.id});
      
      // Mientras tanto, crear consumo localmente
      const nuevoConsumo = { ...consumo, servicioId: servicioActual.id } as ConsumoExtendido;
      setConsumos([...consumos, nuevoConsumo]);
      return consumo.id;
    } catch (error) {
      console.error("Error al agregar consumo:", error);
      throw error;
    }
  };

  // Actualizar consumo existente
  const actualizarConsumo = async (consumoActualizado: ConsumoExtendido) => {
    try {
      // En el futuro: await interfaz.updateConsumo(consumoActualizado.id, consumoActualizado);
      
      // Mientras tanto, actualizar localmente
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
      // En el futuro: await interfaz.deleteConsumo(id);
      
      // Mientras tanto, eliminar localmente
      setConsumos(prevConsumos => prevConsumos.filter(consumo => consumo.id !== id));
    } catch (error) {
      console.error("Error al eliminar consumo:", error);
      throw error;
    }
  };

  // Obtener consumos por servicio ID
  const getConsumosByServicioId = async (servicioId: string) => {
    try {
      // En el futuro: return await interfaz.getConsumosByServicioId(servicioId);
      
      // Mientras tanto, filtrar localmente
      return consumos.filter(consumo => consumo.servicioId === servicioId);
    } catch (error) {
      console.error("Error al obtener consumos por servicio:", error);
      return [];
    }
  };

  // Reordenar consumos (mover arriba o abajo)
  const reordenarConsumos = async (id: string, direccion: 'arriba' | 'abajo') => {
    try {
      if (!servicioActual) return;
      
      // Obtener consumos del servicio actual
      const consumosServicio = consumos.filter(c => c.servicioId === servicioActual.id);
      
      const index = consumosServicio.findIndex(c => c.id === id);
      if (index < 0) return;
      
      const nuevosConsumos = [...consumos];
      const consumosOrdenados = [...consumosServicio];
      
      if (direccion === 'arriba' && index > 0) {
        // Intercambiar con el elemento anterior
        const temp = consumosOrdenados[index - 1].orden;
        consumosOrdenados[index - 1].orden = consumosOrdenados[index].orden;
        consumosOrdenados[index].orden = temp;
      } else if (direccion === 'abajo' && index < consumosOrdenados.length - 1) {
        // Intercambiar con el elemento siguiente
        const temp = consumosOrdenados[index + 1].orden;
        consumosOrdenados[index + 1].orden = consumosOrdenados[index].orden;
        consumosOrdenados[index].orden = temp;
      } else {
        return; // No hay nada que hacer
      }
      
      // Ordenar por orden
      consumosOrdenados.sort((a, b) => a.orden - b.orden);
      
      // Actualizar los consumos globales con los reordenados
      setConsumos(
        nuevosConsumos.map(c => {
          const consumoActualizado = consumosOrdenados.find(co => co.id === c.id);
          return consumoActualizado || c;
        })
      );
      
      // En el futuro, podríamos sincronizar este orden con la interfaz:
      // await Promise.all(consumosOrdenados.map(c => interfaz.updateConsumo(c.id, { orden: c.orden })));
    } catch (error) {
      console.error("Error al reordenar consumos:", error);
      throw error;
    }
  };
  
  const refreshConsumos = async () => {
    setDataFetched(false); // Esto forzará la recarga en el useEffect
  };

  // Solo devolvemos los consumos del servicio actual en el value
  const consumosServicioActual = servicioActual 
    ? consumos.filter(c => c.servicioId === servicioActual.id)
    : [];

  return (
    <ConsumoServicioContext.Provider value={{
      consumos: consumosServicioActual,
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