"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useRouter } from "next/navigation"

// Interfaz para representar un Consumo
interface Consumo {
  id: string
  cantidad: number
  tipoConsumo: string
}

// Interfaz para representar un Servicio
export interface Servicio {
  id: string
  nombre: string
  codigo: string
  tarifaId: string
  tarifaBase: string
  familiaId: string
  precioConIVA: string
  ivaId: string
  colorAgenda: string
  duracion: number
  equipoId: string
  tipoComision: string
  comision: string
  requiereParametros: boolean
  visitaValoracion: boolean
  apareceEnApp: boolean
  descuentosAutomaticos: boolean
  descuentosManuales: boolean
  aceptaPromociones: boolean
  aceptaEdicionPVP: boolean
  afectaEstadisticas: boolean
  deshabilitado: boolean
  precioCoste: string
  tarifaPlanaId: string
  archivoAyuda: string | null
  consumos: Consumo[]
}

interface ServicioContextType {
  servicios: Servicio[]
  servicioActual: Servicio | null
  crearServicio: (servicio: Omit<Servicio, "id">) => string
  actualizarServicio: (id: string, servicio: Partial<Servicio>) => void
  eliminarServicio: (id: string) => void
  getServicioById: (id: string) => Servicio | undefined
  getServiciosByTarifaId: (tarifaId: string) => Servicio[]
  guardarServicio: () => string
  setServicioActual: (servicio: Servicio | null) => void
  validarCamposObligatorios: () => { valido: boolean; camposFaltantes: string[] }
}

// Función para generar un ID secuencial
const generateSequentialId = (existingIds: string[]): string => {
  const numericIds = existingIds
    .map(id => parseInt(id.replace(/[^0-9]/g, '')))
    .filter(id => !isNaN(id));
  
  const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
  return `srv-${maxId + 1}`;
};

const ServicioContext = createContext<ServicioContextType | undefined>(undefined);

export const ServicioProvider = ({ children }: { children: ReactNode }) => {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [servicioActual, setServicioActual] = useState<Servicio | null>(null);
  const router = useRouter();

  // Cargar desde localStorage si existe
  useEffect(() => {
    const storedServicios = localStorage.getItem("servicios");
    const currentServicio = localStorage.getItem("servicioActual");
    
    if (storedServicios) {
      setServicios(JSON.parse(storedServicios));
    }
    
    if (currentServicio) {
      setServicioActual(JSON.parse(currentServicio));
    }
  }, []);

  // Guardar en localStorage cuando cambien
  useEffect(() => {
    localStorage.setItem("servicios", JSON.stringify(servicios));
  }, [servicios]);

  useEffect(() => {
    if (servicioActual) {
      localStorage.setItem("servicioActual", JSON.stringify(servicioActual));
    } else {
      localStorage.removeItem("servicioActual");
    }
  }, [servicioActual]);

  // Crear nuevo servicio
  const crearServicio = (servicio: Omit<Servicio, "id">): string => {
    const id = generateSequentialId(servicios.map(s => s.id));
    const nuevoServicio = { ...servicio, id };
    
    // Actualizar el estado
    setServicios(prev => [...prev, nuevoServicio as Servicio]);
    setServicioActual(nuevoServicio as Servicio);
    
    // Guardar en localStorage inmediatamente
    localStorage.setItem("servicios", JSON.stringify([...servicios, nuevoServicio]));
    
    return id;
  };

  // Actualizar servicio existente
  const actualizarServicio = (id: string, servicioActualizado: Partial<Servicio>) => {
    // Actualizar el estado
    setServicios(prevServicios => 
      prevServicios.map(servicio => 
        servicio.id === id ? { ...servicio, ...servicioActualizado } : servicio
      )
    );
    
    if (servicioActual && servicioActual.id === id) {
      setServicioActual({...servicioActual, ...servicioActualizado});
    }
    
    // Guardar en localStorage inmediatamente
    const updatedServicios = servicios.map(s => 
      s.id === id ? { ...s, ...servicioActualizado } : s
    );
    localStorage.setItem("servicios", JSON.stringify(updatedServicios));
  };

  // Eliminar servicio
  const eliminarServicio = (id: string) => {
    setServicios(prevServicios => prevServicios.filter(servicio => servicio.id !== id));
    
    if (servicioActual && servicioActual.id === id) {
      setServicioActual(null);
    }
  };

  // Obtener servicio por ID
  const getServicioById = (id: string) => {
    return servicios.find(servicio => servicio.id === id);
  };

  // Obtener servicios por tarifa ID
  const getServiciosByTarifaId = (tarifaId: string) => {
    return servicios.filter(servicio => servicio.tarifaId === tarifaId);
  };

  // Guardar el servicio actual (crear si es nuevo o actualizar si existe)
  const guardarServicio = () => {
    if (!servicioActual) return "";

    if (servicioActual.id) {
      setServicios(servicios.map(s => 
        s.id === servicioActual.id ? servicioActual : s
      ));
      return servicioActual.id;
    } else {
      const id = generateSequentialId(servicios.map(s => s.id));
      const nuevoServicio = { ...servicioActual, id };
      
      setServicios(prev => [...prev, nuevoServicio]);
      
      setServicioActual(nuevoServicio);
      
      console.log("Servicio guardado:", nuevoServicio);
      console.log("Total servicios:", [...servicios, nuevoServicio].length);
      
      return id;
    }
  };

  // Validar campos obligatorios
  const validarCamposObligatorios = () => {
    const camposFaltantes: string[] = [];
    
    if (!servicioActual) {
      return { valido: false, camposFaltantes: ["Todos los campos"] };
    }
    
    if (!servicioActual.nombre || servicioActual.nombre.trim() === "") {
      camposFaltantes.push("Nombre");
    }
    
    if (!servicioActual.codigo || servicioActual.codigo.trim() === "") {
      camposFaltantes.push("Código");
    }
    
    if (!servicioActual.familiaId || servicioActual.familiaId.trim() === "") {
      camposFaltantes.push("Familia");
    }
    
    return {
      valido: camposFaltantes.length === 0,
      camposFaltantes
    };
  };

  const value = {
    servicios,
    servicioActual,
    crearServicio,
    actualizarServicio,
    eliminarServicio,
    getServicioById,
    getServiciosByTarifaId,
    guardarServicio,
    setServicioActual,
    validarCamposObligatorios
  };

  return (
    <ServicioContext.Provider value={value}>
      {children}
    </ServicioContext.Provider>
  );
};

export const useServicio = () => {
  const context = useContext(ServicioContext);
  if (context === undefined) {
    throw new Error("useServicio debe ser usado dentro de un ServicioProvider");
  }
  return context;
}; 