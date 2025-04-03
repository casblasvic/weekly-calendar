"use client"

import { createContext, useContext, useState, type ReactNode, useEffect } from "react"
import { useInterfaz } from "@/contexts/interfaz-Context"
import { useClinic } from "@/contexts/clinic-context"
import { HorarioClinica, ExcepcionHoraria } from "@/services/data/models/interfaces"

// Mock data - esto se reemplazará por llamadas a la API en producción
const HORARIOS_CLINICA_MOCK: Record<string, HorarioClinica> = {
  "1": {
    clinicaId: "1",
    horarioGeneral: { apertura: "09:00", cierre: "20:00" },
    excepciones: [
      { dia: "lunes", apertura: "10:00", cierre: "19:00" },
      { dia: "sabado", apertura: "10:00", cierre: "14:00" },
      { dia: "domingo", apertura: "", cierre: "" } // Cerrado
    ]
  },
  "2": {
    clinicaId: "2",
    horarioGeneral: { apertura: "08:30", cierre: "21:00" },
    excepciones: [
      { dia: "sabado", apertura: "09:00", cierre: "15:00" },
      { dia: "domingo", apertura: "", cierre: "" } // Cerrado
    ]
  }
};

interface ClinicScheduleContextType {
  getClinicSchedule: (clinicId: string) => Promise<HorarioClinica | null>;
  getAllClinicSchedules: () => Promise<HorarioClinica[]>;
  updateClinicSchedule: (clinicId: string, horario: Partial<HorarioClinica>) => Promise<boolean>;
  isWithinClinicHours: (clinicId: string, dia: string, inicio: string, fin: string) => boolean;
}

const ClinicScheduleContext = createContext<ClinicScheduleContextType | undefined>(undefined);

export function ClinicScheduleProvider({ children }: { children: ReactNode }) {
  const [horarios, setHorarios] = useState<Map<string, HorarioClinica>>(new Map());
  const [initialized, setInitialized] = useState(false);
  const interfaz = useInterfaz();
  const { clinics } = useClinic();

  // Inicializar horarios
  useEffect(() => {
    const loadSchedules = async () => {
      if (interfaz.initialized && !initialized && clinics.length > 0) {
        try {
          // En producción, esto vendría de la API
          const horariosMock = new Map<string, HorarioClinica>();
          
          // Cargar horarios para cada clínica
          clinics.forEach(clinic => {
            const horarioClinica = HORARIOS_CLINICA_MOCK[String(clinic.id)] || {
              clinicaId: String(clinic.id),
              horarioGeneral: { apertura: "09:00", cierre: "20:00" },
              excepciones: []
            };
            
            horariosMock.set(String(clinic.id), horarioClinica);
          });
          
          setHorarios(horariosMock);
          setInitialized(true);
        } catch (error) {
          console.error("Error al cargar horarios de clínicas:", error);
        }
      }
    };
    
    loadSchedules();
  }, [interfaz.initialized, clinics, initialized]);

  // Obtener el horario de una clínica
  const getClinicSchedule = async (clinicId: string): Promise<HorarioClinica | null> => {
    try {
      // En producción, esto sería una llamada a la API
      const horarioClinica = horarios.get(clinicId) || HORARIOS_CLINICA_MOCK[clinicId];
      
      if (horarioClinica) {
        // Asegurar que el horario esté en el estado
        if (!horarios.has(clinicId)) {
          setHorarios(prev => {
            const newHorarios = new Map(prev);
            newHorarios.set(clinicId, horarioClinica);
            return newHorarios;
          });
        }
        
        return horarioClinica;
      }
      
      return null;
    } catch (error) {
      console.error(`Error al obtener horario para clínica ${clinicId}:`, error);
      return null;
    }
  };

  // Obtener todos los horarios de clínicas
  const getAllClinicSchedules = async (): Promise<HorarioClinica[]> => {
    try {
      // En producción, esto sería una llamada a la API
      return Array.from(horarios.values());
    } catch (error) {
      console.error("Error al obtener todos los horarios de clínicas:", error);
      return [];
    }
  };

  // Actualizar el horario de una clínica
  const updateClinicSchedule = async (clinicId: string, horario: Partial<HorarioClinica>): Promise<boolean> => {
    try {
      // En producción, esto sería una llamada a la API
      const horarioActual = await getClinicSchedule(clinicId);
      
      if (!horarioActual) return false;
      
      const horarioActualizado: HorarioClinica = {
        ...horarioActual,
        ...horario,
        clinicaId: clinicId // Asegurar que el ID de clínica no cambie
      };
      
      setHorarios(prev => {
        const newHorarios = new Map(prev);
        newHorarios.set(clinicId, horarioActualizado);
        return newHorarios;
      });
      
      return true;
    } catch (error) {
      console.error(`Error al actualizar horario para clínica ${clinicId}:`, error);
      return false;
    }
  };

  // Verificar si un horario está dentro del horario de la clínica
  const isWithinClinicHours = (clinicId: string, dia: string, inicio: string, fin: string): boolean => {
    try {
      // Validaciones básicas
      if (!inicio || !fin || inicio >= fin) return false;
      
      // Obtener el horario de la clínica
      const horarioClinica = horarios.get(clinicId) || HORARIOS_CLINICA_MOCK[clinicId];
      if (!horarioClinica) return true; // Si no hay datos, permitimos cualquier horario (desarrollo)
      
      // Buscar si hay excepción para este día
      const excepcion = horarioClinica.excepciones.find(exc => 
        exc.dia.toLowerCase() === dia.toLowerCase()
      );
      
      // Si el día está cerrado, ninguna franja es válida
      if (excepcion && (!excepcion.apertura || !excepcion.cierre)) {
        return false;
      }
      
      // Validar contra el horario específico del día o el general
      const horaApertura = excepcion ? excepcion.apertura : horarioClinica.horarioGeneral.apertura;
      const horaCierre = excepcion ? excepcion.cierre : horarioClinica.horarioGeneral.cierre;
      
      // Validar que la franja esté dentro del horario de apertura y cierre
      return inicio >= horaApertura && fin <= horaCierre;
    } catch (error) {
      console.error("Error al validar horario:", error);
      return false;
    }
  };

  const value = {
    getClinicSchedule,
    getAllClinicSchedules,
    updateClinicSchedule,
    isWithinClinicHours
  };

  return <ClinicScheduleContext.Provider value={value}>{children}</ClinicScheduleContext.Provider>;
}

export function useClinicSchedule() {
  const context = useContext(ClinicScheduleContext);
  if (context === undefined) {
    throw new Error("useClinicSchedule debe ser usado dentro de un ClinicScheduleProvider");
  }
  return context;
} 