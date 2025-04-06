"use client"

import { createContext, useContext, useState, type ReactNode, useEffect } from "react"
import { useClinic } from "@/contexts/clinic-context"
// Importar tipos directamente desde la fuente original
import type { Clinica, ExcepcionHoraria } from "@/services/data/models/interfaces"
import {
  findActiveExceptions,
  isBusinessDay,
  isTimeSlotAvailable,
  getBusinessHours,
  getDayOfWeek
} from "@/services/clinic-schedule-service"
import { format } from "date-fns"

interface ClinicScheduleContextType {
  isWithinClinicHours: (date: Date, time: string, clinicId?: string) => boolean;
  getActiveException: (date: Date, clinicId?: string) => ExcepcionHoraria | null;
  isExceptionDayActive: (date: Date, clinicId?: string) => boolean;
  getAvailableHours: (date: Date, clinicId?: string) => { open: string, close: string } | null;
}

const ClinicScheduleContext = createContext<ClinicScheduleContextType | undefined>(undefined)

export function ClinicScheduleProvider({ children }: { children: ReactNode }) {
  const { clinics, activeClinic } = useClinic()

  // Verificar si un horario está dentro de las horas de la clínica
  const isWithinClinicHours = (date: Date, time: string, clinicId?: string): boolean => {
    try {
      // Usar la clínica activa por defecto o buscar por ID
      const targetClinic = clinicId ? clinics.find(c => String(c.id) === clinicId) : activeClinic;
      if (!targetClinic) return false; // Clínica no encontrada

      // Usar la función del servicio que ya considera excepciones
      return isTimeSlotAvailable(date, time, targetClinic);
      
    } catch (error) {
      console.error("Error al validar horario con isTimeSlotAvailable:", error);
      return false;
    }
  };
  
  // Obtener excepción activa para una clínica y fecha
  const getActiveException = (date: Date, clinicId?: string): ExcepcionHoraria | null => {
    const targetClinic = clinicId ? clinics.find(c => String(c.id) === clinicId) : activeClinic;
    if (!targetClinic) return null;
    
    // La función findActiveExceptions ya existe en el servicio
    return findActiveExceptions(date, targetClinic);
  };
  
  // Verificar si un día está activo según las excepciones
  const isExceptionDayActive = (date: Date, clinicId?: string): boolean => {
    const targetClinic = clinicId ? clinics.find(c => String(c.id) === clinicId) : activeClinic;
    if (!targetClinic) return false;
    
    // Usar la función isBusinessDay del servicio que ya maneja excepciones
    return isBusinessDay(date, targetClinic);
  };
  
  // Obtener horarios disponibles para una fecha
  const getAvailableHours = (date: Date, clinicId?: string): { open: string, close: string } | null => {
    const targetClinic = clinicId ? clinics.find(c => String(c.id) === clinicId) : activeClinic;
    if (!targetClinic) return null;
    
    // Usar la función de utilidad que ya maneja excepciones
    const businessHours = getBusinessHours(date, targetClinic);
    
    if (businessHours) {
      // Log opcional para depuración
      // console.log(`Horario para ${format(date, 'yyyy-MM-dd')} (clínica ${targetClinic.id}):`, businessHours);
      return businessHours;
    }
    
    return null;
  };

  return (
    <ClinicScheduleContext.Provider value={{
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