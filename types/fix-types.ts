// Archivo de arreglos temporales de tipos
import { RefObject } from 'react';

// Declaración para corregir el problema de CurrentTimeIndicator
declare module '@/components/current-time-indicator' {
  export interface CurrentTimeIndicatorProps {
    timeSlots: string[];
    rowHeight: number;
    isMobile: boolean;
    className?: string;
    agendaRef: RefObject<HTMLDivElement> | RefObject<HTMLDivElement | null>;
    clinicOpenTime?: string;
    clinicCloseTime?: string;
  }
}

// Declaración para convertir Cabin a Room
export interface Room {
  id: string;
  name: string;
  color?: string;
}

export function convertCabinToRoom(cabin: {
  id: number;
  name: string;
  color?: string;
  [key: string]: any;
}): Room {
  return {
    id: cabin.id.toString(),
    name: cabin.name,
    color: cabin.color
  };
} 