"use client"

import { createContext, useContext, useState, type ReactNode, useEffect } from "react"
import { useClinic } from "@/contexts/clinic-context"
// Importar tipos directamente desde la fuente original
// import type { Clinica } from "@/services/data/models/interfaces" // Eliminado
import {
  isBusinessDay,
  isTimeSlotAvailable,
  getBusinessHours,
} from "@/services/clinic-schedule-service"
import { format } from "date-fns"

interface ClinicScheduleContextType {
  isWithinClinicHours: (date: Date, time: string, clinicId?: string) => boolean;
  getAvailableHours: (date: Date, clinicId?: string) => { open: string, close: string } | null;
}

const ClinicScheduleContext = createContext<ClinicScheduleContextType | undefined>(undefined)

export function ClinicScheduleProvider({ children }: { children: ReactNode }) {
  const { clinics, activeClinic } = useClinic()

  // Verificar si un horario está dentro de las horas BASE de la clínica ACTIVA
  const isWithinClinicHours = (date: Date, time: string, clinicId?: string): boolean => {
    try {
      // Si se especificó un ID, debe coincidir con la clínica activa
      if (clinicId && clinicId !== activeClinic?.id) {
        console.warn(`[ClinicScheduleContext] Solicitud para clinicId (${clinicId}) diferente al activo (${activeClinic?.id}). No se puede determinar el horario.`);
        return false; 
      }
      // Si no hay clínica activa, no se puede determinar
      if (!activeClinic) return false;

      // Usar la clínica activa (que sí tiene los detalles del horario)
      return isTimeSlotAvailable(date, time, activeClinic);
      
    } catch (error) {
      console.error("Error al validar horario con isTimeSlotAvailable:", error);
      return false;
    }
  };
  
  // Obtener horarios disponibles BASE para una fecha de la clínica ACTIVA
  const getAvailableHours = (date: Date, clinicId?: string): { open: string, close: string } | null => {
    // Si se especificó un ID, debe coincidir con la clínica activa
    if (clinicId && clinicId !== activeClinic?.id) {
      console.warn(`[ClinicScheduleContext] Solicitud para clinicId (${clinicId}) diferente al activo (${activeClinic?.id}). No se pueden obtener horas.`);
      return null; 
    }
    // Si no hay clínica activa, no se puede determinar
    if (!activeClinic) return null;
    
    // Usar la clínica activa
    const businessHours = getBusinessHours(date, activeClinic);
    
    if (businessHours) {
      return businessHours;
    }
    
    return null;
  };

  return (
    <ClinicScheduleContext.Provider value={{
      isWithinClinicHours,
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

export { ClinicScheduleContext }; 