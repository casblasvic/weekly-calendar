"use client"

import { createContext, useContext, useState, type ReactNode, useEffect } from "react"
import { useInterfaz } from "@/contexts/interfaz-Context"
import { useClinic } from "@/contexts/clinic-context"
import { HorarioClinica, ExcepcionHoraria } from "@/services/data/models/interfaces"
import {
  findActiveExceptions,
  isBusinessDay,
  isTimeSlotAvailable,
  getBusinessHours,
  getDayOfWeek
} from "@/services/clinic-schedule-service"
import { format } from "date-fns"

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
  getActiveException: (clinicId: string, date: Date) => ExcepcionHoraria | null;
  isExceptionDayActive: (clinicId: string, date: Date) => boolean;
  getAvailableHours: (clinicId: string, date: Date) => { open: string, close: string } | null;
}

const ClinicScheduleContext = createContext<ClinicScheduleContextType | undefined>(undefined)

export function ClinicScheduleProvider({ children }: { children: ReactNode }) {
  const interfaz = useInterfaz()
  const { clinics } = useClinic()

  // Obtener el horario de una clínica
  const getClinicSchedule = async (clinicId: string): Promise<HorarioClinica | null> => {
    try {
      // En producción, esto sería una llamada a la API
      // return await interfaz.getClinicSchedule(clinicId);
      
      // Por ahora usamos datos mock
      return HORARIOS_CLINICA_MOCK[clinicId] || null;
    } catch (error) {
      console.error("Error al obtener el horario de la clínica:", error);
      return null;
    }
  };

  // Obtener todos los horarios de clínicas
  const getAllClinicSchedules = async (): Promise<HorarioClinica[]> => {
    try {
      // En producción, esto sería una llamada a la API
      // return await interfaz.getAllClinicSchedules();
      
      // Por ahora retornamos los datos mock
      return Object.values(HORARIOS_CLINICA_MOCK);
    } catch (error) {
      console.error("Error al obtener todos los horarios de clínicas:", error);
      return [];
    }
  };

  // Actualizar el horario de una clínica
  const updateClinicSchedule = async (clinicId: string, horario: Partial<HorarioClinica>): Promise<boolean> => {
    try {
      // En producción, esto sería una llamada a la API
      // return await interfaz.updateClinicSchedule(clinicId, horario);
      
      // Simulamos una actualización exitosa
      return true;
    } catch (error) {
      console.error("Error al actualizar el horario de la clínica:", error);
      return false;
    }
  };

  // Verificar si un horario está dentro de las horas de la clínica
  const isWithinClinicHours = (clinicId: string, dia: string, inicio: string, fin: string): boolean => {
    try {
      const horarioClinica = HORARIOS_CLINICA_MOCK[clinicId];
      if (!horarioClinica) return false;
      
      // Buscar si hay excepción para este día
      const excepcion = horarioClinica.excepciones.find(exc => 
        exc.dia.toLowerCase() === dia.toLowerCase()
      );
      
      // Si el día está cerrado según la excepción, retornar false
      if (excepcion && (!excepcion.apertura || !excepcion.cierre)) {
        return false;
      }
      
      // Determinar apertura y cierre para este día
      const horaApertura = excepcion && excepcion.apertura 
        ? excepcion.apertura 
        : horarioClinica.horarioGeneral.apertura;
      
      const horaCierre = excepcion && excepcion.cierre 
        ? excepcion.cierre 
        : horarioClinica.horarioGeneral.cierre;
      
      // Verificar que la franja esté dentro del horario de apertura y cierre
      return inicio >= horaApertura && fin <= horaCierre;
    } catch (error) {
      console.error("Error al validar horario:", error);
      return false;
    }
  };
  
  // Obtener excepción activa para una clínica y fecha
  const getActiveException = (clinicId: string, date: Date): ExcepcionHoraria | null => {
    const clinic = clinics.find(c => String(c.id) === clinicId);
    if (!clinic) return null;
    
    return findActiveExceptions(date, clinic);
  };
  
  // Verificar si un día está activo según las excepciones
  const isExceptionDayActive = (clinicId: string, date: Date): boolean => {
    const clinic = clinics.find(c => String(c.id) === clinicId);
    if (!clinic) return false;
    
    // Verificar primero si hay una excepción activa para esta fecha
    const activeException = findActiveExceptions(date, clinic);
    if (activeException) {
      // Obtener el día de la semana en español
      const dayOfWeek = getDayOfWeek(date);
      
      // Buscar la configuración para este día en la excepción
      const diaExcepcion = activeException.dias.find(d => d.dia === dayOfWeek);
      
      // Si el día está configurado en la excepción, usar esa configuración
      if (diaExcepcion) {
        return diaExcepcion.activo;
      }
    }
    
    // Si no hay excepción activa o el día no está configurado en la excepción,
    // verificar con el horario general del schedule
    return isBusinessDay(date, clinic);
  };
  
  // Obtener horarios disponibles para una fecha
  const getAvailableHours = (clinicId: string, date: Date): { open: string, close: string } | null => {
    const clinic = clinics.find(c => String(c.id) === clinicId);
    if (!clinic) return null;
    
    // Usar la función de utilidad que ya maneja excepciones
    const businessHours = getBusinessHours(date, clinic);
    
    // Si se encontraron horas disponibles, retornarlas
    if (businessHours) {
      console.log(`Horario para ${format(date, 'yyyy-MM-dd')} (clínica ${clinicId}):`, businessHours);
      return businessHours;
    }
    
    // Si no hay horas disponibles, retornar null
    return null;
  };

  return (
    <ClinicScheduleContext.Provider value={{
      getClinicSchedule,
      getAllClinicSchedules,
      updateClinicSchedule,
      isWithinClinicHours,
      getActiveException,
      isExceptionDayActive,
      getAvailableHours
    }}>
      {children}
    </ClinicScheduleContext.Provider>
  )
}

export function useClinicSchedule() {
  const context = useContext(ClinicScheduleContext)
  
  if (!context) {
    throw new Error("useClinicSchedule debe usarse dentro de un ClinicScheduleProvider")
  }
  
  return context
} 