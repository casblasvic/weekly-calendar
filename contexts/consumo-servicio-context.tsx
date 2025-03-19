"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useServicio } from "./servicios-context"

// Interfaz para representar un Consumo
export interface Consumo {
  id: string
  servicioId: string
  productoId: string
  productoNombre: string
  cantidad: number
  orden: number
  alternativas?: Array<{
    productoId: string
    productoNombre: string
    cantidad: number
  }>
}

interface ConsumoServicioContextType {
  consumos: Consumo[]
  agregarConsumo: (consumo: Omit<Consumo, "servicioId">) => string
  actualizarConsumo: (consumo: Consumo) => void
  eliminarConsumo: (id: string) => void
  getConsumosByServicioId: (servicioId: string) => Consumo[]
  reordenarConsumos: (id: string, direccion: 'arriba' | 'abajo') => void
}

const ConsumoServicioContext = createContext<ConsumoServicioContextType | undefined>(undefined);

export const ConsumoServicioProvider = ({ children }: { children: ReactNode }) => {
  const [consumos, setConsumos] = useState<Consumo[]>([]);
  const { servicioActual } = useServicio();

  // Cargar desde localStorage si existe
  useEffect(() => {
    const storedConsumos = localStorage.getItem("consumos");
    
    if (storedConsumos) {
      setConsumos(JSON.parse(storedConsumos));
    }
  }, []);

  // Guardar en localStorage cuando cambien
  useEffect(() => {
    localStorage.setItem("consumos", JSON.stringify(consumos));
  }, [consumos]);

  // Agregar nuevo consumo
  const agregarConsumo = (consumo: Omit<Consumo, "servicioId">): string => {
    if (!servicioActual) {
      throw new Error("No hay un servicio activo para asociar el consumo");
    }
    
    const nuevoConsumo = { ...consumo, servicioId: servicioActual.id };
    setConsumos([...consumos, nuevoConsumo as Consumo]);
    return consumo.id;
  };

  // Actualizar consumo existente
  const actualizarConsumo = (consumoActualizado: Consumo) => {
    setConsumos(prevConsumos => 
      prevConsumos.map(consumo => 
        consumo.id === consumoActualizado.id ? consumoActualizado : consumo
      )
    );
  };

  // Eliminar consumo
  const eliminarConsumo = (id: string) => {
    setConsumos(prevConsumos => prevConsumos.filter(consumo => consumo.id !== id));
  };

  // Obtener consumos por servicio ID
  const getConsumosByServicioId = (servicioId: string) => {
    return consumos.filter(consumo => consumo.servicioId === servicioId);
  };

  // Reordenar consumos (mover arriba o abajo)
  const reordenarConsumos = (id: string, direccion: 'arriba' | 'abajo') => {
    const consumosServicio = servicioActual 
      ? getConsumosByServicioId(servicioActual.id) 
      : [];
    
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
  };

  const value = {
    consumos: servicioActual ? getConsumosByServicioId(servicioActual.id) : [],
    agregarConsumo,
    actualizarConsumo,
    eliminarConsumo,
    getConsumosByServicioId,
    reordenarConsumos
  };

  return (
    <ConsumoServicioContext.Provider value={value}>
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