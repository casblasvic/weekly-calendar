// Declaraciones globales para corregir problemas de tipado

import { RefObject } from 'react';

// Extender módulos existentes
declare module '@/components/current-time-indicator' {
  export interface CurrentTimeIndicatorProps {
    timeSlots: string[];
    rowHeight: number;
    isMobile: boolean;
    className?: string;
    agendaRef: RefObject<HTMLDivElement>;
    clinicOpenTime?: string;
    clinicCloseTime?: string;
  }
}

// Extender interfaces para la compatibilidad Cabin/Room
interface Room {
  id: string;
  name: string;
  color?: string;
}

interface Cabin {
  id: number;
  code: string;
  name: string;
  color: string;
  isActive: boolean;
  order: number;
}

// Permitir la conversión implícita entre tipos relacionados
declare global {
  interface Array<T> {
    map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[];
  }
} 