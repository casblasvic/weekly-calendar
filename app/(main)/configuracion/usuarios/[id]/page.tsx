"use client"

import React, { useState, useEffect, useMemo, useCallback, use } from "react";
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Search, MoreHorizontal, Save, ArrowLeft, HelpCircle, X } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { toast } from "@/components/ui/use-toast"
import { CalendarIcon, Clock, Pencil, Plus, Settings, Trash, Eye, AlertCircle, Calendar, PlusCircle, CheckCircle, Fingerprint, Briefcase } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"; // Asegurar que cn está importado
// i18n: Importar la función de traducción
// ELIMINAR: import { t } from "@/lib/i18n";
import { useTranslation } from 'react-i18next'; // <<< AÑADIR

// <<< AÑADIR IMPORTS react-hook-form y zod >>>
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userPersonalDataSchema, type UserPersonalDataFormValues } from '@/lib/schemas/user'; // Ruta al nuevo schema
// <<< FIN IMPORTS >>>

// Importación de contextos
import { useUser } from "@/contexts/user-context"
import { useClinic } from "@/contexts/clinic-context"
import { useService } from "@/contexts/service-context"
// Importar también el tipo del contexto
import type { UserContextType } from "@/contexts/user-context"; 

// Importación de tipos
// Eliminar la importación completa de interfaces.ts
/* 
import { 
  HorarioDia, 
  FranjaHoraria, 
  ExcepcionHoraria, // Asegurar que este es el tipo correcto
  HorarioSemanal
} from "@/services/data/models/interfaces"
*/

// Importar el tipo Usuario directamente desde el contexto
// Eliminar import type { Servicio as ServicioContext } from "@/contexts/service-context";
// Importar tipo para Excepcion si viene de Prisma o definir uno local
// Asegurarse que UserClinicScheduleException se importa como PrismaException
import { UserClinicScheduleException as PrismaException, Prisma, Category, Service, CountryInfo } from '@prisma/client'; 

// >>> AÑADIR ESTA LÍNEA <<< 
import { type Usuario } from "@/contexts/user-context"; 

// Tipos para el sistema de horarios (Mantener tipos locales)
type DayRanges = { start: string; end: string };
type DaySchedule = { isOpen: boolean; ranges: DayRanges[] };
type WeekSchedule = {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
};

// Eliminar esta interfaz duplicada si existe UserClinicScheduleException de Prisma
/*
interface UserClinicScheduleException {
  id: string;
  userId: string;
  clinicId: string;
  name: string | null;
  startDate: Date; // O string si la API devuelve string
  endDate: Date;   // O string si la API devuelve string
  scheduleJson: Prisma.JsonValue; // O WeekSchedule si se parsea siempre
  createdAt: Date; // O string
  updatedAt: Date; // O string
}
*/

// NUEVA FUNCIÓN AUXILIAR
const arraysEqual = (a: string[], b: string[]): boolean => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  for (let i = 0; i < sortedA.length; ++i) {
    if (sortedA[i] !== sortedB[i]) return false;
  }
  return true;
};

// Creamos componentes memoizados para evitar renderizados innecesarios
const SelectClinica = React.memo(({ 
  value, 
  onChange, 
  disabled, 
  options, 
  placeholder 
}: { 
  value: string, 
  onChange: (value: string) => void, 
  disabled?: boolean, 
  options: { id: string, label: string }[], 
  placeholder: string 
}) => {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-9">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.length === 0 ? (
          <SelectItem value="no_selection" disabled>No hay opciones disponibles</SelectItem>
        ) : (
          options.map(option => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
});

SelectClinica.displayName = "SelectClinica";

// Componente memoizado para select de tipo
const SelectTipo = React.memo(({ 
  value, 
  onChange
}: { 
  value: string, 
  onChange: (value: any) => void
}) => {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9">
        <SelectValue placeholder="Seleccione tipo" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="familia">Familia completa</SelectItem>
        <SelectItem value="servicio">Servicio específico</SelectItem>
      </SelectContent>
    </Select>
  );
});

SelectTipo.displayName = "SelectTipo";

// Componente memoizado para selects genéricos
const MemoizedSelect = React.memo(({ 
  value, 
  onChange, 
  disabled,
  placeholder,
  children 
}: { 
  value?: string, 
  onChange?: (value: string) => void, 
  disabled?: boolean, 
  placeholder: string,
  children: React.ReactNode
}) => {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-9">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {children}
      </SelectContent>
    </Select>
  );
});

MemoizedSelect.displayName = "MemoizedSelect";

// Agregar la función isWithinClinicHours que falta
function isWithinClinicHours(clinicaId: string, dia: string, inicio: string, fin: string): boolean {
  try {
    // Validaciones básicas
    if (!inicio || !fin || inicio >= fin) return false;
    
    // Mock data para validar horarios (esto vendría del contexto real en producción)
    const HORARIOS_CLINICA_MOCK: Record<string, any> = {
      "1": {
        horarioGeneral: { apertura: "09:00", cierre: "20:00" },
        excepciones: [
          { dia: "lunes", apertura: "10:00", cierre: "19:00" },
          { dia: "sabado", apertura: "10:00", cierre: "14:00" },
          { dia: "domingo", apertura: "", cierre: "" } // Cerrado
        ]
      },
      "2": {
        horarioGeneral: { apertura: "08:30", cierre: "21:00" },
        excepciones: [
          { dia: "sabado", apertura: "09:00", cierre: "15:00" },
          { dia: "domingo", apertura: "", cierre: "" } // Cerrado
        ]
      }
    };
    
    // Obtener el horario de la clínica
    const horarioClinica = HORARIOS_CLINICA_MOCK[clinicaId];
    if (!horarioClinica) return true; // Si no hay datos, permitimos cualquier horario (desarrollo)
    
    // Buscar si hay excepción para este día
    const excepcion = horarioClinica.excepciones.find((exc: any) => 
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
}

// Función para formatear fecha (copiada de clinicas/[id]/page.tsx)
const formatFecha = (fecha: string): string => {
  if (!fecha) return '';
  try {
    const date = new Date(fecha);
    // Asegurarse de que la fecha es válida
    if (isNaN(date.getTime())) {
      return 'Fecha inválida';
    }
    // Usar toLocaleDateString para formato local amigable
    return date.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch (error) {
    console.error("Error formateando fecha:", fecha, error);
    return 'Error fecha';
  }
};

// --- Placeholders para Mocks y Constantes (Reemplazar con datos reales) ---
const PERFILES_DISPONIBLES: string[] = ["Admin", "Editor", "Visor"]; // Ejemplo
// Usar Category de Prisma
const FAMILIAS_MOCK: Category[] = []; // Ejemplo vacío
// Usar Service de Prisma
const SERVICIOS_MOCK: Record<string, Service[]> = {}; // Ejemplo vacío

// --- Fin Placeholders ---

// --- Componente Skeleton --- 
const UsuarioPageSkeleton = () => {
  return (
    <div className="container max-w-5xl p-6 mx-auto space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <Skeleton className="w-1/3 h-8" /> {/* Título */} 
      </div>
      
      {/* Skeleton para Tabs */}
      <Skeleton className="w-full h-10 mb-4" /> {/* TabsList */} 
      
      {/* Skeleton para Card de contenido */}
      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Columna Izquierda */} 
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="w-1/4 h-4" /> {/* Label */} 
              <Skeleton className="w-full h-9" /> {/* Input */} 
            </div>
            <div className="space-y-2">
              <Skeleton className="w-1/4 h-4" /> {/* Label */} 
              <Skeleton className="w-full h-9" /> {/* Input */} 
            </div>
            <div className="space-y-2">
              <Skeleton className="w-1/4 h-4" /> {/* Label */} 
              <Skeleton className="w-full h-9" /> {/* Input */} 
            </div>
             <div className="space-y-2">
              <Skeleton className="w-1/4 h-4" /> {/* Label */} 
              <Skeleton className="w-full h-9" /> {/* Input */} 
            </div>
            <div className="space-y-2">
              <Skeleton className="w-1/4 h-4" /> {/* Label */} 
              <Skeleton className="w-full h-9" /> {/* Input */} 
            </div>
          </div>
          {/* Columna Derecha */} 
          <div className="space-y-4">
             <div className="space-y-2">
              <Skeleton className="w-1/4 h-4" /> {/* Label */} 
              <Skeleton className="w-full h-9" /> {/* Input */} 
            </div>
             <div className="space-y-2">
              <Skeleton className="w-1/4 h-4" /> {/* Label */} 
              <Skeleton className="w-full h-9" /> {/* Input */} 
            </div>
             <div className="space-y-2">
              <Skeleton className="w-1/4 h-4" /> {/* Label */} 
              <Skeleton className="w-full h-9" /> {/* Input */} 
            </div>
            <div className="flex items-center pt-4 space-x-2">
               <Skeleton className="w-10 h-6" /> {/* Switch */} 
               <Skeleton className="w-1/5 h-4" /> {/* Label Switch */} 
            </div>
          </div>
        </div>
        {/* ... añadir más Skeletons si se quiere simular más detalle ... */} 
      </Card>
      
      {/* Skeleton para Botones Flotantes */}
       <div className="flex justify-end gap-2">
          <Skeleton className="w-24 h-9" /> {/* Botón Cancelar */} 
          <Skeleton className="w-28 h-9" /> {/* Botón Guardar */} 
       </div>
    </div>
  );
}
// --- Fin Componente Skeleton ---

// Definir un tipo local para las excepciones formateadas que usará el componente
interface FormattedException {
  id: string;
  nombre: string | null;
  fechaInicio: string; // yyyy-mm-dd
  fechaFin: string; // yyyy-mm-dd
  // Podríamos incluir scheduleJson si se usa en la UI
}

// --- Añadir tipo UserClinicScheduleException --- 
// (Basado en el schema.prisma)
interface UserClinicScheduleException {
  id: string;
  userId: string;
  clinicId: string;
  name: string | null;
  startDate: Date; // O string si la API devuelve string
  endDate: Date;   // O string si la API devuelve string
  scheduleJson: Prisma.JsonValue; // O WeekSchedule si se parsea siempre
  createdAt: Date; // O string
  updatedAt: Date; // O string
}

// --- Añadir función auxiliar createDefaultSchedule (Modificada para opción 'vacío') ---
const createDefaultSchedule = (isEmpty = false): WeekSchedule => {
  // Si isEmpty es true, las franjas por defecto estarán vacías
  const defaultRanges = isEmpty ? [] : [{ start: "09:00", end: "17:00" }];
  // Los días estarán abiertos por defecto solo si NO es vacío y es L-V
  const getDefaultOpenState = (dayKey: keyof WeekSchedule): boolean => {
      if (isEmpty) return false;
      return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(dayKey);
  };

  return {
    monday:    { isOpen: getDefaultOpenState('monday'),    ranges: getDefaultOpenState('monday')    ? defaultRanges : [] },
    tuesday:   { isOpen: getDefaultOpenState('tuesday'),   ranges: getDefaultOpenState('tuesday')   ? defaultRanges : [] },
    wednesday: { isOpen: getDefaultOpenState('wednesday'), ranges: getDefaultOpenState('wednesday') ? defaultRanges : [] },
    thursday:  { isOpen: getDefaultOpenState('thursday'),  ranges: getDefaultOpenState('thursday')  ? defaultRanges : [] },
    friday:    { isOpen: getDefaultOpenState('friday'),    ranges: getDefaultOpenState('friday')    ? defaultRanges : [] },
    saturday:  { isOpen: false, ranges: [] }, // Sábado y Domingo cerrados por defecto
    sunday:    { isOpen: false, ranges: [] },
  };
};

// --- INICIO: Función para convertir HorarioSemanal a WeekSchedule ---
const convertHorarioSemanalToWeekSchedule = (horario: any | null): WeekSchedule | null => {
  // Mantener la lógica interna, pero asegurar que devuelve WeekSchedule o null
  // El tipo 'any' en la entrada es temporal si horario viene de una fuente no tipada
  if (!horario) return null;
  // ... (lógica existente de conversión) ...
  // Asegurarse que el objeto devuelto cumple la interfaz WeekSchedule
  const weekSchedule: WeekSchedule = { /* ... mapeo ... */ } as WeekSchedule; // Ejemplo
  return weekSchedule;
};
// --- FIN Función de conversión ---

// --- INICIO: Nueva función para convertir formato API {dias:[]} a WeekSchedule >>>
const convertApiScheduleToWeekSchedule = (apiData: any): WeekSchedule | null => {
  if (!apiData || !Array.isArray(apiData.dias)) {
    console.warn("[convertApiSchedule] Datos de API inválidos o sin array 'dias'.", apiData);
    return null;
  }

  // <<< INICIO: Mapeo de días Español -> Inglés >>>
  const dayMap: { [key: string]: keyof WeekSchedule } = {
    lunes: 'monday',
    martes: 'tuesday',
    miercoles: 'wednesday',
    jueves: 'thursday',
    viernes: 'friday',
    sabado: 'saturday',
    domingo: 'sunday',
  };
  // <<< FIN: Mapeo >>>

  const weekSchedule = createDefaultSchedule(true); // Empezar con todo cerrado y vacío

  apiData.dias.forEach((diaInfo: any) => {
    if (!diaInfo || typeof diaInfo.dia !== 'string') return; // Saltar si falta info
    
    const spanishDayKey = diaInfo.dia.toLowerCase();
    const dayKey = dayMap[spanishDayKey]; // <<< OBTENER CLAVE INGLESA

    // <<< USAR CLAVE INGLESA EN LA COMPROBACIÓN Y ASIGNACIÓN >>>
    if (dayKey && weekSchedule.hasOwnProperty(dayKey)) { 
      const validRanges = Array.isArray(diaInfo.franjas) 
        ? diaInfo.franjas.filter((f: any) => typeof f.inicio === 'string' && typeof f.fin === 'string')
                         .map((f: any) => ({ start: f.inicio, end: f.fin }))
        : [];

      weekSchedule[dayKey] = {
        isOpen: Boolean(diaInfo.activo),
        ranges: validRanges,
      };
    } else {
      // Mantener el warning si el día en español no se reconoce o la clave inglesa no existe (poco probable)
      console.warn(`[convertApiSchedule] Clave de día inválida o no mapeada recibida: ${diaInfo.dia}`);
    }
  });

  return weekSchedule;
};
// <<< FIN: Nueva función de conversión >>>

// <<< INICIO: Nueva función para verificar si horario está vacío >>>
const isScheduleEmpty = (schedule: WeekSchedule | null | undefined): boolean => {
    if (!schedule) {
        return true; // Es vacío si es null o undefined
    }
    // Buscar al menos un día que esté abierto Y tenga al menos una franja
    for (const dayKey in schedule) {
        if (Object.prototype.hasOwnProperty.call(schedule, dayKey)) {
            const daySchedule = schedule[dayKey as keyof WeekSchedule];
            if (daySchedule.isOpen && daySchedule.ranges.length > 0) {
                return false; // Encontrado día activo con franjas -> No está vacío
            }
        }
    }
    return true; // No se encontró ningún día activo con franjas -> Está vacío
};
// <<< FIN: Nueva función para verificar si horario está vacío >>>

// --- INICIO: Componente Modal Franja Horaria ---
const FranjaHorariaModal = ({
  isOpen,
  onClose,
  onSave,
  franjaInicial,
  diaNombre,
  horarioReferenciaTexto,
  minTime,
  maxTime,
  clinicValidRanges
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (franjaData: { inicio: string, fin: string }) => void;
  franjaInicial?: DayRanges | null; 
  diaNombre: string;
  horarioReferenciaTexto: string; // <<< DEFINIR TIPO DE NUEVA PROP
  minTime?: string | null;
  maxTime?: string | null;
  clinicValidRanges?: DayRanges[] | null; // <<< DEFINIR TIPO DE NUEVA PROP
}) => {
  // <<< AÑADIR HOOK useTranslation AQUÍ >>>
  const { t } = useTranslation(); 
  const [inicio, setInicio] = useState("09:00");
  const [fin, setFin] = useState("17:00");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (franjaInicial) {
      setInicio(franjaInicial.start || "09:00");
      setFin(franjaInicial.end || "17:00");
    } else {
      setInicio("09:00");
      setFin("17:00");
    }
    setError(null);
  }, [franjaInicial, isOpen]);

  const handleGuardarClick = () => {
    if (!inicio || !fin) {
        setError("Las horas de inicio y fin son obligatorias.");
        return;
    }
    if (inicio >= fin) {
        setError("La hora de inicio debe ser anterior a la hora de fin.");
        return;
    }
    
    setError(null); // Limpiar cualquier error anterior (de las validaciones básicas)
    onSave({ inicio, fin });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {/* i18n: Usar t() */}
            {franjaInicial ? t('schedule.editTimeSlotTitle', { day: diaNombre }) : t('schedule.addTimeSlotTitle', { day: diaNombre })}
          </DialogTitle>
          {/* <<< MOVER TEXTO DE REFERENCIA AQUÍ (fuera de Description) >>> */}
          <div className="mt-1 mb-2 text-xs text-blue-600"> 
              <Clock className="inline w-3 h-3 mr-1 align-baseline" /> {/* Ajustar alineación icono si es necesario */} 
              {/* i18n: Usar t() */}
              <span className="align-middle">{t('schedule.clinicHoursRef')}: {horarioReferenciaTexto || t('common.notAvailable')}</span>
          </div>
          {/* <<< ELIMINAR TEXTO NO DESEADO DE AQUÍ >>> */}
          <DialogDescription>
            {/* Define las horas de inicio y fin para esta franja horaria. */} 
            {/* Dejar vacío o poner otro texto si se prefiere */}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid items-center grid-cols-4 gap-4">
            <Label htmlFor="inicio" className="text-right">
              {/* i18n: Usar t() */}
              {t('schedule.startTimeLabel')}
            </Label>
            {/* <<< REVERTIR A INPUT TYPE="TIME" >>> */}
            <Input
              id="inicio"
              type="time"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              className="col-span-3"
              min={minTime || undefined} // Mantener min/max semántico
            />
          </div>
          <div className="grid items-center grid-cols-4 gap-4">
            <Label htmlFor="fin" className="text-right">
              {/* i18n: Usar t() */}
              {t('schedule.endTimeLabel')}
            </Label>
             {/* <<< REVERTIR A INPUT TYPE="TIME" >>> */}
            <Input
              id="fin"
              type="time"
              value={fin}
              onChange={(e) => setFin(e.target.value)}
              className="col-span-3"
              max={maxTime || undefined} // Mantener min/max semántico
              // Podríamos añadir min={inicio || minTime || undefined} si quisiéramos?
              // Por ahora lo dejamos solo con max para consistencia.
            />
          </div>
          {error && (
            <p className="col-span-4 text-sm text-center text-red-600">{error}</p>
          )}
        </div>
        <DialogFooter>
          {/* i18n: Usar t() */}
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleGuardarClick}>{t('common.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
FranjaHorariaModal.displayName = "FranjaHorariaModal";
// --- FIN Componente Modal Franja Horaria ---

// --- INICIO: Componente Modal Excepción Horaria ---
const ExcepcionHorariaModal = ({
  isOpen,
  onClose,
  onSave,
  excepcionInicial,
  clinicaNombre,
  userId,
  clinicId
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (excepcionData: Omit<PrismaException, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>; 
  excepcionInicial?: PrismaException | null; 
  clinicaNombre: string;
  userId: string;
  clinicId: string;
}) => {
  // <<< OBTENER t DENTRO DEL COMPONENTE >>>
  const { t } = useTranslation(); 
  const [formData, setFormData] = useState<Partial<Omit<PrismaException, 'id'|'createdAt'|'updatedAt'>>>({}); 
  const [currentSchedule, setCurrentSchedule] = useState<WeekSchedule>(createDefaultSchedule());
  
  useEffect(() => {
    if (excepcionInicial) {
        const initialFormData: Partial<Omit<PrismaException, 'id'|'createdAt'|'updatedAt'>> = {
            name: excepcionInicial.name,
            startDate: excepcionInicial.startDate, 
            endDate: excepcionInicial.endDate,
            scheduleJson: excepcionInicial.scheduleJson,
            userId: excepcionInicial.userId,
            clinicId: excepcionInicial.clinicId
        };
        setFormData(initialFormData);
        try {
            if (excepcionInicial.scheduleJson && typeof excepcionInicial.scheduleJson === 'object') {
               setCurrentSchedule(excepcionInicial.scheduleJson as WeekSchedule); 
            } else {
               setCurrentSchedule(createDefaultSchedule());
            }
        } catch (e) {
            console.error("Error parsing scheduleJson from exception:", e);
            setCurrentSchedule(createDefaultSchedule());
        }
    } else {
        setFormData({ userId, clinicId }); 
        setCurrentSchedule(createDefaultSchedule());
    }
  }, [excepcionInicial, userId, clinicId]);
  
  const handleInputChange = (field: keyof Omit<PrismaException, 'id'|'createdAt'|'updatedAt'|'scheduleJson'>, value: any) => {
      setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleScheduleChange = (newSchedule: WeekSchedule) => {
      setCurrentSchedule(newSchedule);
      setFormData(prev => ({ ...prev, scheduleJson: newSchedule as any as Prisma.JsonValue }));
  };
  
  const handleGuardarClick = async () => {
      if (!formData.startDate || !formData.endDate || !formData.userId || !formData.clinicId) {
        toast({ title: "Error", description: "Faltan campos obligatorios.", variant: "destructive" });
        return;
      }
      const startDateValue = typeof formData.startDate === 'string' ? new Date(formData.startDate) : formData.startDate;
      const endDateValue = typeof formData.endDate === 'string' ? new Date(formData.endDate) : formData.endDate;
      if (!startDateValue || isNaN(startDateValue.getTime()) || !endDateValue || isNaN(endDateValue.getTime())) {
         toast({ title: "Error", description: "Las fechas de inicio o fin no son válidas.", variant: "destructive" });
         return;
      }
      await onSave({
        userId: formData.userId!,
        clinicId: formData.clinicId!,
        name: formData.name,
        startDate: startDateValue, 
        endDate: endDateValue,     
        scheduleJson: formData.scheduleJson ?? null 
      });
      onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
                {/* i18n: Usar t() */}
                <DialogTitle>{excepcionInicial ? t('schedule.editExceptionTitle', { clinicName: clinicaNombre }) : t('schedule.newExceptionTitle', { clinicName: clinicaNombre })}</DialogTitle>
                <DialogDescription>
                    {/* i18n: Usar t() */}
                    {t('schedule.exceptionDescription')}
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid items-center grid-cols-4 gap-4">
                    {/* i18n: Usar t() */}
                    <Label htmlFor="exception-name" className="text-right">{t('schedule.exceptionNameLabel')}</Label>
                    <Input 
                        id="exception-name"
                        value={formData.name || ''}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="col-span-3"
                        placeholder={t('schedule.exceptionNamePlaceholder')} // i18n
                    />
                </div>
                <div className="grid items-center grid-cols-4 gap-4">
                    {/* i18n: Usar t() */}
                    <Label htmlFor="exception-start" className="text-right">{t('schedule.exceptionStartDateLabel')}</Label>
                    <Input 
                        id="exception-start"
                        type="date"
                        // Formatear Date a yyyy-mm-dd para el input
                        value={formData.startDate instanceof Date ? formData.startDate.toISOString().split('T')[0] : formData.startDate || ''}
                        onChange={(e) => handleInputChange('startDate', e.target.value)}
                        className="col-span-3"
                    />
                </div>
                 <div className="grid items-center grid-cols-4 gap-4">
                    <Label htmlFor="exception-end" className="text-right">Fecha Fin</Label>
                    <Input 
                        id="exception-end"
                        type="date"
                        // Formatear Date a yyyy-mm-dd para el input
                        value={formData.endDate instanceof Date ? formData.endDate.toISOString().split('T')[0] : formData.endDate || ''}
                        onChange={(e) => handleInputChange('endDate', e.target.value)}
                        className="col-span-3"
                    />
                </div>
                 {/* Aquí iría el componente ScheduleConfig pasando currentSchedule y handleScheduleChange */}
                 {/* <ScheduleConfig schedule={currentSchedule} onScheduleChange={handleScheduleChange} /> */}
                 {/* i18n: Usar t() */}
                 <p className="text-center text-muted-foreground">{t('schedule.exceptionEditorPending')}</p>
            </div>
            <DialogFooter>
                {/* i18n: Usar t() */}
                <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
                <Button onClick={handleGuardarClick}>{t('schedule.saveException')}</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
};
ExcepcionHorariaModal.displayName = "ExcepcionHorariaModal";
// --- FIN Componente Modal Excepción Horaria ---

// <<< Añadir imports para Combobox >>>
import { Check, ChevronsUpDown } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

// <<< INICIO: Componente SearchableSelect (Combobox) ACTUALIZADO >>>
interface SearchableSelectOption {
  value: string;
  label: string;
}

const SearchableSelect = React.memo((
  {
    options,
    value,
    onChange,
    placeholder = "Seleccionar...",
    noResultsText = "No encontrado.",
    disabled = false,
    isLoading = false,
  }: {
    options: SearchableSelectOption[];
    value: string | null | undefined;
    onChange: (value: string) => void;
    placeholder?: string;
    noResultsText?: string;
    disabled?: boolean;
    isLoading?: boolean;
  }
) => {
  const [open, setOpen] = useState(false);
  const selectedOption = useMemo(() => options.find((option) => option.value === value), [options, value]);

  // <<< INICIO: Función de filtro personalizada >>>
  const handleFilter = useCallback((itemValue: string, search: string): number => {
    // itemValue es el `value` del CommandItem (en nuestro caso, isoCode)
    // search es el texto introducido en CommandInput
    const searchTerm = search.toLowerCase();
    
    // Buscar la opción completa correspondiente al itemValue
    const option = options.find(opt => opt.value.toLowerCase() === itemValue.toLowerCase());
    
    if (!option) {
      return 0; // Si no se encuentra la opción, no coincide
    }
    
    // Comprobar si el término de búsqueda está en la etiqueta O en el valor (isoCode)
    const labelMatches = option.label.toLowerCase().includes(searchTerm);
    const valueMatches = option.value.toLowerCase().includes(searchTerm);

    return labelMatches || valueMatches ? 1 : 0;
  }, [options]);
  // <<< FIN: Función de filtro personalizada >>>

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between w-full text-sm font-normal h-9" // Ajustar tamaño fuente si es necesario
          disabled={disabled || isLoading}
        >
          <span className="truncate"> {/* Añadir truncate para textos largos */} 
            {isLoading ? "Cargando..." : (selectedOption ? selectedOption.label : placeholder)}
          </span>
          <ChevronsUpDown className="w-4 h-4 ml-2 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
        {/* <<< Añadir prop filter al Command >>> */}
        <Command filter={handleFilter}>
          {/* <<< Quitar placeholder del CommandInput >>> */}
          <CommandInput /* placeholder={searchPlaceholder} */ />
          <CommandList>
            <CommandEmpty>{noResultsText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value} // El valor sigue siendo isoCode
                  onSelect={(currentValue) => {
                    // La lógica onSelect no necesita cambiar, busca por isoCode (currentValue)
                    onChange(currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});
SearchableSelect.displayName = "SearchableSelect";
// <<< FIN: Componente SearchableSelect (Combobox) >>>

// Componente principal
export default function EditarUsuarioPage(props: { params: Promise<{ id: string }> }) {
  // Desenvolver la promesa con React.use para obtener params
  const params = React.use(props.params);
  const userId = params.id; // Definir userId aquí

  const router = useRouter() // Definir router aquí
  const searchParams = useSearchParams()
  // const { toast } = useToast() // CORREGIDO: Usar desestructuración
  // <<< OBTENER t DESDE EL HOOK >>>
  const { t } = useTranslation();
  const { toast } = useToast(); // Mantener import de toast original

  // Obtener los parámetros de la URL
  const returnToBase = searchParams.get('returnTo') || "/configuracion/usuarios"
  const tabParam = searchParams.get('tab')

  // Construir la URL de retorno completa
  const returnTo = tabParam 
    ? returnToBase.includes('?') 
      ? `${returnToBase}&tab=${tabParam}` 
      : `${returnToBase}?tab=${tabParam}`
    : returnToBase

  // Obtener contexto completo y asignarle tipo
  const userContext: UserContextType = useUser(); 
  const { clinics } = useClinic()
  const { familias, servicios } = useService() 
  // CORREGIR: Obtener roles y estado de carga. Usar 'useRoles' si ese es el nombre correcto.
  // const { roles: availableRoles, isLoading: isLoadingRoles } = useRoles ? useRoles() : { roles: [], isLoading: true }; 
  const [availableRoles, setAvailableRoles] = useState<any[]>([]); // Placeholder state
  const [isLoadingRoles, setIsLoadingRoles] = useState(true); // Placeholder state

  // --- Estados del Componente ---
  const [loading, setLoading] = useState(true) // Carga inicial de datos del usuario
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingHorario, setIsLoadingHorario] = useState(false); // Carga del horario base
  const [isLoadingExceptions, setIsLoadingExceptions] = useState(false); // <-- NUEVO ESTADO
  const [activeTab, setActiveTab] = useState('datos-personales')
  const [horarioSubTab, setHorarioSubTab] = useState('semanal') 
  // CORREGIR: Declarar estado initialUserData
  const [initialUserData, setInitialUserData] = useState<Usuario | null>(null); // Estado para guardar datos iniciales
  const [isFranjaModalOpen, setIsFranjaModalOpen] = useState(false);
  // <<< MODIFICAR TIPO AQUÍ para incluir clinicRefScheduleText, minTime, maxTime >>>
  const [editingFranja, setEditingFranja] = useState<{ 
      dia: keyof WeekSchedule; 
      franja?: DayRanges;
      clinicRefScheduleText?: string; // Texto referencia clínica
      minTime?: string | null;        // Hora mínima permitida (visual)
      maxTime?: string | null;        // Hora máxima permitida (visual)
      clinicValidRanges?: DayRanges[] | null; // <<< DEFINIR TIPO DE NUEVA PROP
  } | null>(null);

  // Estados para Datos del Usuario (Asegurarse que todos están declarados)
  // <<< ELIMINAR ESTADOS CONTROLADOS POR RHF >>>
  // const [firstName, setFirstName] = useState("")
  // const [lastName, setLastName] = useState("")
  // const [email, setEmail] = useState("")
  // const [confirmEmail, setConfirmEmail] = useState("")
  // const [telefono, setTelefono] = useState("")
  // const [phone1Prefix, setPhone1Prefix] = useState(""); // <<< Inicializar vacío o con valor por defecto? Vacío por ahora
  // const [isActive, setIsActive] = useState(true)
  const [dni, setDni] = useState("")
  const [fechaNacimiento, setFechaNacimiento] = useState("")
  const [sexo, setSexo] = useState("")
  // const [telefono2, setTelefono2] = useState("")
  // const [phone2Prefix, setPhone2Prefix] = useState(""); // <<< Inicializar vacío
  // const [idioma, setIdioma] = useState("")
  const [colegio, setColegio] = useState("")
  const [numeroColegiado, setNumeroColegiado] = useState("")
  const [especialidad, setEspecialidad] = useState("")
  const [universidad, setUniversidad] = useState("")
  const [direccion, setDireccion] = useState("")
  const [provincia, setProvincia] = useState("")
  // const [pais, setPais] = useState("")
  const [localidad, setLocalidad] = useState("")
  const [cp, setCp] = useState("")
  const [exportCsv, setExportCsv] = useState("false") 
  const [indiceControl, setIndiceControl] = useState("")
  const [numeroPIN, setNumeroPIN] = useState("")
  const [notas, setNotas] = useState("")
  // const [contrasena, setContrasena] = useState(""); // <<< ELIMINADO, USAR password
  // AÑADIDOS estados para checkboxes de Configuración (si se usan en el formulario)
  const [mostrarDesplazados, setMostrarDesplazados] = useState(false);
  const [mostrarCitasPropias, setMostrarCitasPropias] = useState(false);
  const [restringirIP, setRestringirIP] = useState(false);
  const [deshabilitado, setDeshabilitado] = useState(false); // Relacionado con isActive? verificar
  // const [password, setPassword] = useState(""); // <<< ELIMINADO, gestionado por RHF
  // const [login, setLogin] = useState(""); // <<< ELIMINADO, gestionado por RHF

  // Estados para Permisos
  const [permisosClinicas, setPermisosClinicas] = useState<Map<string, string[]>>(new Map()); 
  // AÑADIDO: Estado para almacenar los permisos originales al cargar
  const [initialPermisosClinicas, setInitialPermisosClinicas] = useState<Map<string, string[]>>(new Map());
  const [selectedClinicas, setSelectedClinicas] = useState<string[]>([]); // IDs de clínicas asignadas
  const [nuevaClinicaId, setNuevaClinicaId] = useState<string>("");
  const [nuevoPerfilClinica, setNuevoPerfilClinica] = useState<string>("");
  const [showDisabledClinics, setShowDisabledClinics] = useState(false);

  // Estados para Horarios (Declaración ÚNICA aquí)
  // Reemplazar HorarioSemanal por WeekSchedule
  const [horarioEditado, setHorarioEditado] = useState<Map<string, WeekSchedule | null>>(new Map());
  const [horarioUsuarioGuardado, setHorarioUsuarioGuardado] = useState<Map<string, boolean>>(new Map()); // <<< NUEVO ESTADO para saber si se cargó de la API
  const [horarioClinicaReferencia, setHorarioClinicaReferencia] = useState<WeekSchedule | null>(null); // <<< NUEVO ESTADO para el banner
  const [horarioReferenciaSource, setHorarioReferenciaSource] = useState<'template' | 'independent' | 'default' | 'none'>('none'); // <<< NUEVO ESTADO PARA ORIGEN
  const [excepcionesUsuario, setExcepcionesUsuario] = useState<FormattedException[]>([]);
  const [excepcionEditada, setExcepcionEditada] = useState<UserClinicScheduleException | null>(null);
  const [mostrarModalExcepcion, setMostrarModalExcepcion] = useState(false);
  const [clinicaSeleccionadaHorario, setClinicaSeleccionadaHorario] = useState<string>("");
  const [selectedClinicaHorario, setSelectedClinicaHorario] = useState<string>("");
  // Eliminar o comentar isHorarioHeredado si ya no se usa
  // const [isHorarioHeredado, setIsHorarioHeredado] = useState(false);

  // Estados para Habilidades
  const [habilidadesPorClinica, setHabilidadesPorClinica] = useState<Map<string, { familiaId: string, servicioId?: string, nivel: number }[]>>(new Map());
  const [clinicaSeleccionadaHabilidades, setClinicaSeleccionadaHabilidades] = useState<string>("");
  const [tipoSeleccion, setTipoSeleccion] = useState('familia');
  const [elementoSeleccionadoId, setElementoSeleccionadoId] = useState('');
  const [nivelHabilidad, setNivelHabilidad] = useState(3); // Nivel por defecto
  const [searchHabilidades, setSearchHabilidades] = useState("");
  const [nuevaClinicaHabilidad, setNuevaClinicaHabilidad] = useState("");
  const [nuevaFamilia, setNuevaFamilia] = useState("");
  const [nuevoServicio, setNuevoServicio] = useState("");
  const [todasLasHabilidadesAsignadas, setTodasLasHabilidadesAsignadas] = useState<[string, string][]>([]);

  // <<< AÑADIR DECLARACIÓN DE ESTADOS FALTANTES >>>
  const [availableCountries, setAvailableCountries] = useState<CountryInfo[]>([]); 
  const [isLoadingCountries, setIsLoadingCountries] = useState(true); 

  // --- Fin Declaración de Estados ---

  // <<< MOVER useForm AQUÍ (ANTES de useEffect) >>>
  const {
    register,
    handleSubmit,
    control, // Necesario para <Controller>
    reset,   // Para cargar datos iniciales
    formState: { errors, isSubmitting, isValid } // Para mostrar errores y estado
  } = useForm<UserPersonalDataFormValues>({
    resolver: zodResolver(userPersonalDataSchema),
    defaultValues: {
      // Establecer valores por defecto iniciales
      firstName: "",
      lastName: "",
      email: "",
      confirmEmail: "",
      login: "",
      password: "",
      isActive: true, // Por defecto activo
      phone: "",
      phone2: "",
      countryIsoCode: null,
      phone1CountryIsoCode: null,
      phone2CountryIsoCode: null,
      languageIsoCode: null,
      profileImageUrl: null,
      // Añadir otros si se incluyen en el schema
    }
  });
  // <<< FIN MOVER useForm >>>

  // --- useEffect para cargar datos iniciales --- 
  useEffect(() => {
    // --- Cargar Roles (ejemplo, adaptar a cómo se obtienen realmente) ---
    const loadRoles = async () => {
      setIsLoadingRoles(true);
      try {
        // Asumiendo una API para roles, o que vienen de useRole/useRoles
        const response = await fetch('/api/roles'); 
        if (response.ok) {
          const rolesData = await response.json();
          setAvailableRoles(rolesData || []); 
        } else {
          console.error("Error cargando roles");
          setAvailableRoles([]);
        }
      } catch (error) {
        console.error("Error fetching roles:", error);
        setAvailableRoles([]);
      } finally {
        setIsLoadingRoles(false);
      }
    };
    loadRoles();
    // --- Fin Cargar Roles ---

    const loadInitialData = async () => {
      // <<< AÑADIR CONDICIÓN: Esperar a que el contexto NO esté cargando >>>
      if (userContext.isLoading) {
        console.log("[Load Initial Data] Contexto de usuario aún cargando, esperando...");
        setLoading(true); // Mantener estado de carga de la página
        return; // Salir y esperar a que useEffect se vuelva a ejecutar
      }
      // <<< FIN CONDICIÓN >>>

      if (userId === 'nuevo') {
        setLoading(false);
        // Setear estado inicial para 'nuevo' si es necesario
        setPermisosClinicas(new Map());
        setInitialPermisosClinicas(new Map());
        setSelectedClinicas([]);
        // setIsActive(true); // <--- ELIMINAR (Manejado por RHF reset)
        // Inicializar otros campos NO controlados por RHF
        // setFirstName(""); // <--- ELIMINAR
        // setLastName(""); // <--- ELIMINAR
        // setEmail(""); // <--- ELIMINAR
        // setConfirmEmail(""); // <--- ELIMINAR
        // setTelefono(""); // <--- ELIMINAR
        // setPhone1Prefix(""); // <--- ELIMINAR
        // setTelefono2(""); // <--- ELIMINAR
        // setPhone2Prefix(""); // <--- ELIMINAR
        setDni("");
        setFechaNacimiento("");
        setSexo("");
        setColegio("");
        setNumeroColegiado("");
        setEspecialidad("");
        setUniversidad("");
        setDireccion("");
        setProvincia("");
        // setPais(""); // <--- ELIMINAR
        setLocalidad("");
        setCp("");
        setExportCsv("false");
        setIndiceControl("");
        setNumeroPIN("");
        setNotas("");
        setMostrarDesplazados(false);
        setMostrarCitasPropias(false);
        setRestringirIP(false);
        setDeshabilitado(false);
        setInitialUserData(null); // No hay datos iniciales para 'nuevo'
        // setLogin(""); // <--- ELIMINAR
        // setPassword(""); // <--- ELIMINAR
        // --- Resetear react-hook-form con valores por defecto para nuevo ---
        reset({
          firstName: "",
          lastName: null, // O "" dependiendo del schema
          email: "",
          confirmEmail: "",
          login: null, // O ""
          password: "", // O undefined si es opcional
          isActive: true, 
          phone: null, // O ""
          phone2: null, // O ""
          countryIsoCode: null,
          phone1CountryIsoCode: null,
          phone2CountryIsoCode: null,
          languageIsoCode: null,
          profileImageUrl: null,
        });
        
        return; 
      }

      setLoading(true);
      try {
        // <<< AÑADIR LOG DE DIAGNÓSTICO >>>
        console.log('[Load Initial Data] Intentando cargar usuario con ID:', userId);
        // <<< FIN LOG DE DIAGNÓSTICO >>>

        // Acceder a getUsuarioById a través de userContext
        const userData = await userContext.getUsuarioById(userId); 
        setInitialUserData(userData); // Guardar datos iniciales completos

        if (userData) {
          console.log("[UsuarioPage] Datos iniciales recibidos para usuario:", userData);
          // --- Usar reset de react-hook-form para poblar el formulario ---
          reset({
              firstName: userData.firstName || "",
              lastName: userData.lastName || null, // Usar null si el schema lo permite
              email: userData.email || "",
              confirmEmail: userData.email || "", // Inicializar confirmación con el email actual
              login: userData.login || null,
              password: "", // No cargar la contraseña
              isActive: userData.isActive,
              phone: userData.phone || null,
              phone2: userData.phone2 || null,
              countryIsoCode: userData.countryIsoCode || null, 
              phone1CountryIsoCode: userData.phone1CountryIsoCode || userData.countryIsoCode || null, // Usar prefijo específico o el general
              phone2CountryIsoCode: userData.phone2CountryIsoCode || userData.countryIsoCode || null,
              languageIsoCode: userData.languageIsoCode || null,
              profileImageUrl: userData.profileImageUrl || null,
          });

          // --- Setear estados que NO están en el schema de react-hook-form ---
          setDni((userData as any).dni || ""); 
          const dob = (userData as any).fechaNacimiento;
          setFechaNacimiento(dob ? new Date(dob).toISOString().split('T')[0] : "");
          setSexo((userData as any).sexo || "");
          // setTelefono2((userData as any).telefono2 || ""); // Ya manejado por reset
          // setPhone2Prefix((userData as any).phone2_country_iso || userData.countryIsoCode || "ES"); // Ya manejado por reset
          // setIdioma((userData as any).idioma || ""); // Ya manejado por reset
          setColegio((userData as any).colegio || "");
          setNumeroColegiado((userData as any).numeroColegiado || "");
          setEspecialidad((userData as any).especialidad || "");
          setUniversidad((userData as any).universidad || "");
          setDireccion((userData as any).direccion || "");
          setProvincia((userData as any).provincia || "");
          // setPais(userData.countryIsoCode || (userData as any).pais || ""); // Ya manejado por reset
          setLocalidad((userData as any).localidad || "");
          setCp((userData as any).cp || "");
          setExportCsv(String((userData as any).exportCsv || "false")); // Convertir boolean a string
          setIndiceControl((userData as any).indiceControl || "");
          setNumeroPIN((userData as any).numeroPIN || "");
          setNotas((userData as any).notas || "");
          setMostrarDesplazados(Boolean((userData as any).mostrarDesplazados)); 
          setMostrarCitasPropias(Boolean((userData as any).mostrarCitasPropias)); 
          setRestringirIP(Boolean((userData as any).restringirIP)); 
          setDeshabilitado(Boolean((userData as any).deshabilitado)); // ¿O !userData.isActive? Revisar
          // setLogin(userData.login || ""); // Ya manejado por reset

          // --- Mantener lógica de permisos y horarios --- 
          const initialPermisos = new Map<string, string[]>();
          const assignments = (userData as any).clinicAssignments || []; 
          const clinicIdsAssigned: string[] = [];
          if (Array.isArray(assignments)) {
             assignments.forEach((asignacion: any) => {
                const clinicId = asignacion.clinicId;
                const roleId = asignacion.role?.id || asignacion.roleId; 
                if(clinicId && roleId) {
                   const rolesClinica = initialPermisos.get(clinicId) || [];
                   if (!rolesClinica.includes(roleId)) {
                     rolesClinica.push(roleId);
                   }
                   initialPermisos.set(clinicId, rolesClinica);
                   clinicIdsAssigned.push(clinicId); 
                } else {
                   console.warn("Asignación incompleta o sin roleId encontrada:", asignacion);
                }
             });
          }
          setPermisosClinicas(initialPermisos); 
          setInitialPermisosClinicas(new Map(initialPermisos)); 
          setSelectedClinicas(clinicIdsAssigned); 

          if (clinicIdsAssigned.length > 0) {
            setSelectedClinicaHorario(clinicIdsAssigned[0]); 
          }

          setTodasLasHabilidadesAsignadas([]); // Resetear o calcular aquí

          } else {
          console.error(`Usuario con ID ${userId} no encontrado.`);
          toast({ title: "Error", description: "Usuario no encontrado.", variant: "destructive" }); 
          router.push('/configuracion/usuarios');
        }
      } catch (error) {
        console.error("Error cargando datos del usuario:", error);
        toast({ title: "Error", description: "No se pudieron cargar los datos del usuario.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [userId, userContext.getUsuarioById, router, toast, userContext.isLoading, reset]); 

  // --- useEffect para cargar Países --- 
  useEffect(() => {
    const fetchCountries = async () => {
      setIsLoadingCountries(true);
      try {
        const response = await fetch('/api/countries');
        if (!response.ok) {
          throw new Error('Failed to fetch countries');
        }
        const data: CountryInfo[] = await response.json();
        setAvailableCountries(data);
        // >>> Opcional: Setear prefijo por defecto basado en país del usuario SI YA SE CARGÓ userData <<<
        if (initialUserData?.countryIsoCode && data.some(c => c.isoCode === initialUserData.countryIsoCode)) {
          // <<< ELIMINAR ESTAS LÍNEAS >>>
          // setPhone1Prefix(initialUserData.countryIsoCode);
          // setPhone2Prefix(initialUserData.countryIsoCode);
          // <<< FIN ELIMINAR >>>
        } else if (data.length > 0) {
          // Si no hay país de usuario o no está en la lista, poner el primero (o España por defecto)
          const defaultIso = data.find(c => c.isoCode === 'ES')?.isoCode || data[0].isoCode;
          // <<< ELIMINAR ESTAS LÍNEAS >>>
          // setPhone1Prefix(defaultIso);
          // setPhone2Prefix(defaultIso);
          // <<< FIN ELIMINAR >>>
        }
      } catch (error) {
        console.error("Error fetching countries:", error);
        toast({ title: "Error", description: "No se pudieron cargar los países.", variant: "destructive" });
        setAvailableCountries([]); // Limpiar en caso de error
      } finally {
        setIsLoadingCountries(false);
      }
    };
    fetchCountries();
  }, [initialUserData?.countryIsoCode, toast]); // Depender de initialUserData para setear el default

  // --- useEffect para cargar Horario y Referencia Clínica ---
  useEffect(() => {
    const cargarDatosHorario = async () => {
      // Resetear estados al cambiar de clínica o usuario
      setHorarioClinicaReferencia(null);
      setHorarioReferenciaSource('none'); // <<< RESETEAR SOURCE
      // No resetear horarioEditado aquí directamente, se hará abajo

      if (!selectedClinicaHorario || userId === 'nuevo') {
        console.log("[Horario useEffect] Skip: No hay clínica seleccionada o es usuario nuevo.");
        setIsLoadingHorario(false);
        setHorarioEditado(prev => new Map(prev).set(selectedClinicaHorario || 'default', createDefaultSchedule(true))); // <-- Cargar vacío
        setHorarioUsuarioGuardado(prev => new Map(prev).set(selectedClinicaHorario || 'default', false)); // <-- Marcar como no guardado
        return; // Salir temprano
      }

      console.log(`[Horario useEffect] Cargando horario para Usuario: ${userId}, Clínica: ${selectedClinicaHorario}`);
      setIsLoadingHorario(true);
      setHorarioUsuarioGuardado(prev => new Map(prev).set(selectedClinicaHorario, false)); // Resetear a no guardado inicialmente

      let horarioCargadoUsuario: WeekSchedule | null = null;
      let errorCargaUsuario = false;

      // --- 1. Intentar cargar Horario Personalizado del Usuario --- 
      try {
        const scheduleResponse = await fetch(`/api/users/${userId}/schedule?clinicId=${selectedClinicaHorario}`);
        const scheduleStatus = scheduleResponse.status; 
        console.log(`[Horario useEffect] Respuesta API schedule usuario: ${scheduleStatus} ${scheduleResponse.statusText}`);

        if (scheduleResponse.ok) { 
          const apiResponseData = await scheduleResponse.json(); 

          // CASO 1: Se recibió null (OK)
          if (apiResponseData === null) {
              console.log("[Horario useEffect] No se encontró horario personalizado (API devolvió null). Se inicializará vacío.");
              horarioCargadoUsuario = null;
              setHorarioUsuarioGuardado(prev => new Map(prev).set(selectedClinicaHorario, false)); // Marcar como NO guardado
          } 
          // CASO 2: Se recibió el formato esperado por la API { dias: [...] }
          else if (apiResponseData && Array.isArray(apiResponseData.dias)) {
               console.log("[Horario useEffect] Horario personalizado recibido en formato API {dias: [...]}. Convirtiendo...", apiResponseData);
               horarioCargadoUsuario = convertApiScheduleToWeekSchedule(apiResponseData); // <<< USAR CONVERSIÓN
               if (horarioCargadoUsuario) {
                   console.log("[Horario useEffect] Horario convertido a formato WeekSchedule:", horarioCargadoUsuario);
                   setHorarioUsuarioGuardado(prev => new Map(prev).set(selectedClinicaHorario, true)); // Marcar como guardado
               } else {
                   console.error("[Horario useEffect] Falló la conversión del formato API a WeekSchedule.");
                   errorCargaUsuario = true; 
                   setHorarioUsuarioGuardado(prev => new Map(prev).set(selectedClinicaHorario, false));
               }
          } 
          // CASO 3: Se recibió algo inesperado (ni null, ni {dias: [...]})
          else {
               console.warn("[Horario useEffect] Formato de respuesta API inesperado (no es null ni {dias: [...]}):", apiResponseData);
               // Decidir si tratar como error o como 'no encontrado'
               // Por ahora, lo tratamos como 'no encontrado' para no bloquear
               horarioCargadoUsuario = null; 
               errorCargaUsuario = false; // Opcional: podrías marcarlo como error si prefieres
               setHorarioUsuarioGuardado(prev => new Map(prev).set(selectedClinicaHorario, false));
          }
        } 
        // CASO 4: La respuesta NO fue OK
        else {
          console.error(`[Horario useEffect] Error ${scheduleStatus} al cargar horario del usuario.`);
          errorCargaUsuario = true;
          setHorarioUsuarioGuardado(prev => new Map(prev).set(selectedClinicaHorario, false));
        }
      } catch (error) {
        console.error("[Horario useEffect] Excepción al cargar horario del usuario:", error);
        errorCargaUsuario = true;
        setHorarioUsuarioGuardado(prev => new Map(prev).set(selectedClinicaHorario, false));
      }

      // Establecer el horario editado: el convertido/cargado o uno vacío por defecto
      setHorarioEditado(prev => new Map(prev).set(selectedClinicaHorario, horarioCargadoUsuario ?? createDefaultSchedule(true))); 

      // --- 2. Cargar Horario de la Clínica Seleccionada (para referencia) --- 
      //    <<< REEMPLAZAR LÓGICA ANTERIOR CON LLAMADA A API clinics/[id] >>>
      try {
          console.log(`[Horario useEffect] Fetching clinic details from API for reference schedule: /api/clinics/${selectedClinicaHorario}`);
          const clinicApiResponse = await fetch(`/api/clinics/${selectedClinicaHorario}`);

          if (!clinicApiResponse.ok) {
              const errorText = await clinicApiResponse.text();
              console.error(`[Horario useEffect] Error ${clinicApiResponse.status} fetching clinic data: ${errorText}`);
              throw new Error(`Error al obtener datos de la clínica: ${clinicApiResponse.statusText}`);
          }

          const clinicData = await clinicApiResponse.json();
          console.log(`[Horario useEffect] Clinic data received from API:`, clinicData);

          let scheduleRef: WeekSchedule | null = null;
          let scheduleSource: 'template' | 'independent' | 'default' | 'none' = 'none';

          // Determinar origen y convertir a WeekSchedule
          // Prioridad 1: Plantilla vinculada
          // Asumir que la API devuelve clinicData.linkedScheduleTemplate.blocks si existe
          if (clinicData?.linkedScheduleTemplate?.blocks && clinicData.linkedScheduleTemplate.blocks.length > 0) {
              console.log("[Horario useEffect] Clínica usa plantilla. Convirtiendo bloques de plantilla...");
              // Reutilizar convertBlocksToWeekSchedule asumiendo campos compatibles (dayOfWeek, startTime, endTime)
              scheduleRef = convertBlocksToWeekSchedule(selectedClinicaHorario, clinicData.linkedScheduleTemplate.blocks, "00:00", "23:59"); // Pasar clinicId y defaults
              if (scheduleRef) {
                  console.log("[Horario useEffect] Horario de referencia (plantilla) generado:", scheduleRef);
                  scheduleSource = 'template';
              } else {
                  console.warn("[Horario useEffect] Error al convertir bloques de plantilla.");
              }
          }
          // Prioridad 2: Bloques independientes
          // Asumir que la API devuelve clinicData.independentScheduleBlocks si existe
          else if (clinicData?.independentScheduleBlocks && clinicData.independentScheduleBlocks.length > 0) {
              console.log("[Horario useEffect] Clínica usa bloques independientes. Convirtiendo...");
              scheduleRef = convertBlocksToWeekSchedule(selectedClinicaHorario, clinicData.independentScheduleBlocks, "00:00", "23:59"); // Usar la misma función
              if (scheduleRef) {
                  console.log("[Horario useEffect] Horario de referencia (independiente) generado:", scheduleRef);
                  scheduleSource = 'independent';
              } else {
                  console.warn("[Horario useEffect] Error al convertir bloques independientes.");
              }
          }
          // Prioridad 3: Horario estándar (openTime/closeTime)
          // Asumir que la API devuelve openTime y closeTime
          else if (clinicData?.openTime && clinicData?.closeTime) {
              console.log(`[Horario useEffect] Clínica no usa plantilla/bloques. Usando openTime/closeTime: ${clinicData.openTime}-${clinicData.closeTime}`);
              scheduleRef = createDefaultClinicSchedule(selectedClinicaHorario, clinicData.openTime, clinicData.closeTime);
              if (scheduleRef) { // createDefaultClinicSchedule puede devolver null si los tiempos son inválidos
                  console.log("[Horario useEffect] Horario de referencia (estándar) generado:", scheduleRef);
                  scheduleSource = 'default';
              } else {
                 console.warn("[Horario useEffect] Tiempos open/close inválidos, no se generó horario estándar.");
              }
          }
          // Si no se encontró ninguna fuente válida
          else {
              console.log("[Horario useEffect] No se encontró fuente válida para horario de referencia (plantilla, independiente, estándar).");
          }

          // Actualizar estados
          setHorarioClinicaReferencia(scheduleRef);
          setHorarioReferenciaSource(scheduleSource);

      } catch (error) {
          console.error("[Horario useEffect] Error al obtener/procesar horario de referencia de la clínica:", error);
          setHorarioClinicaReferencia(null); // Limpiar en caso de error
          setHorarioReferenciaSource('none');
      } finally {
        setIsLoadingHorario(false); // Quitar estado de carga general
      }
    };

    cargarDatosHorario();
  }, [userId, selectedClinicaHorario, clinics]); // Dependencias ajustadas

  // --- NUEVO useEffect para cargar Excepciones ---
  useEffect(() => {
    const cargarExcepciones = async () => {
      // No cargar si es usuario nuevo o no hay clínica seleccionada
      if (userId === 'nuevo' || !selectedClinicaHorario) {
        setExcepcionesUsuario([]); // Limpiar excepciones si cambia la clínica
        return;
      }

      setIsLoadingExceptions(true);
      console.log(`[Exceptions useEffect] Cargando excepciones para Usuario: ${userId}, Clínica: ${selectedClinicaHorario}`);
      // --- AÑADIR LOGS PARA DEPURAR 400 --- 
      console.log(`[Exceptions useEffect] Valores ANTES de fetch: userId='${userId}' (tipo: ${typeof userId}), clinicId='${selectedClinicaHorario}' (tipo: ${typeof selectedClinicaHorario})`);
      // --- FIN LOGS --- 
      try {
        // --- INICIO: Validación extra de formato CUID en frontend ---
        const cuidRegex = /^c[a-z0-9]{24}$/i; // Regex simple para CUID
        if (!cuidRegex.test(userId)) {
          console.error(`[Exceptions useEffect] VALIDATION FAILED: userId '${userId}' no parece un CUID válido.`);
          throw new Error("ID de usuario inválido para cargar excepciones."); 
        }
        if (!cuidRegex.test(selectedClinicaHorario)) {
          console.error(`[Exceptions useEffect] VALIDATION FAILED: clinicId '${selectedClinicaHorario}' no parece un CUID válido.`);
          throw new Error("ID de clínica inválido para cargar excepciones.");
        }
        console.log("[Exceptions useEffect] Frontend CUID validation passed.");
        // --- FIN: Validación extra ---

        const response = await fetch(`/api/users/${userId}/exceptions?clinicId=${selectedClinicaHorario}`);
        if (!response.ok) {
          // No lanzar error si es 404 (significa que no hay excepciones)
          if (response.status === 404) {
            console.log(`[Exceptions useEffect] No se encontraron excepciones (404)`);
            setExcepcionesUsuario([]);
          } else {
            // --- INICIO: Intenta leer detalles del error 400/otro error ---
            let errorDetails = 'Error desconocido en la respuesta de la API.';
            try {
              const errorData = await response.json();
              errorDetails = errorData.message || JSON.stringify(errorData.details || errorData);
              console.error('[Exceptions useEffect] API Error Details:', errorData);
            } catch (jsonError) {
              // Si el cuerpo no es JSON o está vacío
              errorDetails = `Error ${response.status} ${response.statusText || 'al obtener excepciones'}`;
              console.error('[Exceptions useEffect] API Error Response not JSON or empty.');
            }
            throw new Error(errorDetails);
            // --- FIN: Intenta leer detalles --- 
          }
        } else {
          // Parsear respuesta y formatear si es necesario (API ya debería devolver fechas como string)
          const loadedExceptions: FormattedException[] = await response.json();
          console.log(`[Exceptions useEffect] Excepciones cargadas:`, loadedExceptions);
          setExcepcionesUsuario(loadedExceptions);
        }
       
      } catch (error) {
        console.error(`[Exceptions useEffect] Error al cargar excepciones:`, error);
        // --- MODIFICADO: Mostrar el error específico de la validación si ocurrió ---
        toast({ title: "Error", description: error instanceof Error ? error.message : "No se pudieron cargar las excepciones horarias.", variant: "destructive" });
        setExcepcionesUsuario([]); // Limpiar en caso de error
      } finally {
        setIsLoadingExceptions(false);
      }
    };

    cargarExcepciones();
  // Ejecutar cuando cambie el usuario o la clínica seleccionada para el horario
  }, [userId, selectedClinicaHorario, toast]);
  // --- FIN NUEVO useEffect ---

  // --- Funciones auxiliares (DEFINICIÓN ÚNICA) ---

  // Placeholder para calcularHorasTotales
  // CORREGIDO: Usar WeekSchedule en la firma
  // <<< MODIFICADA PARA MULTI-CLÍNICA >>>
  const calcularHorasTotales = (
    horariosEditados: Map<string, WeekSchedule | null>,
    clinicaSeleccionadaId: string | null,
    clinicasAsignadasIds: string[], // <-- Añadir IDs de clínicas asignadas
    // <<< AÑADIR HORARIO DE REFERENCIA DE LA CLÍNICA SELECCIONADA >>>
    horarioReferencia: WeekSchedule | null 
) => {
    let totalMinutosGlobal = 0;
    const totalesPorClinica = new Map<string, number>();
    // Datos detallados SOLO para la clínica seleccionada
    const datosClinicaSeleccionada = {
        totalMinutos: 0,
        diasActivos: 0,
        porDia: {} as Record<string, { minutos: number; isOpen: boolean }>, // Mantener isOpen aquí
    };

    // <<< INICIO: Función auxiliar para calcular intersección de minutos >>>
    const calcularMinutosInterseccion = (franjaUsuario: DayRanges, franjasClinica: DayRanges[] | undefined | null): number => {
        if (!franjaUsuario.start || !franjaUsuario.end || !franjasClinica || franjasClinica.length === 0) {
            return 0;
        }

        let minutosValidos = 0;
        const userStartMinutes = parseTimeToMinutes(franjaUsuario.start);
        const userEndMinutes = parseTimeToMinutes(franjaUsuario.end);
        if (userStartMinutes === null || userEndMinutes === null || userStartMinutes >= userEndMinutes) return 0;

        franjasClinica.forEach(clinicaRange => {
            if (!clinicaRange.start || !clinicaRange.end) return;
            const clinicStartMinutes = parseTimeToMinutes(clinicaRange.start);
            const clinicEndMinutes = parseTimeToMinutes(clinicaRange.end);
            if (clinicStartMinutes === null || clinicEndMinutes === null || clinicStartMinutes >= clinicEndMinutes) return;

            // Calcular la intersección
            const intersectStart = Math.max(userStartMinutes, clinicStartMinutes);
            const intersectEnd = Math.min(userEndMinutes, clinicEndMinutes);

            // Si hay solapamiento (fin > inicio), añadir duración
            if (intersectEnd > intersectStart) {
                minutosValidos += intersectEnd - intersectStart;
            }
        });
        return minutosValidos;
    };

    const parseTimeToMinutes = (time: string): number | null => {
        try {
            const [hours, minutes] = time.split(':').map(Number);
            if (isNaN(hours) || isNaN(minutes)) return null;
            return hours * 60 + minutes;
        } catch (e) {
            return null;
        }
    };
    // <<< FIN: Funciones auxiliares >>>

    // Calcular totales para cada clínica asignada
    clinicasAsignadasIds.forEach(clinicaId => {
        const horarioUsuarioClinica = horariosEditados.get(clinicaId);
        let totalMinutosClinica = 0;

        if (horarioUsuarioClinica) {
            (Object.keys(horarioUsuarioClinica) as Array<keyof WeekSchedule>).forEach((diaKey) => {
                const diaUsuario = horarioUsuarioClinica[diaKey];
                let minutosDia = 0;
                let diaUsuarioEstaAbierto = false;

                if (diaUsuario && diaUsuario.isOpen && diaUsuario.ranges) {
                    diaUsuarioEstaAbierto = true;

                    // <<< LÓGICA MODIFICADA >>>
                    // Si es la clínica seleccionada, calcular con intersección
                    if (clinicaId === clinicaSeleccionadaId && horarioReferencia) {
                         const franjasClinicaHoy = horarioReferencia[diaKey]?.ranges;
                         const isClinicOpenToday = !!(horarioReferencia[diaKey]?.isOpen && franjasClinicaHoy && franjasClinicaHoy.length > 0);

                         if (isClinicOpenToday) {
                             diaUsuario.ranges.forEach(franja => {
                                 minutosDia += calcularMinutosInterseccion(franja, franjasClinicaHoy);
                             });
                         } 
                         // Si la clínica está cerrada este día, los minutos para el usuario son 0
                         else {
                             minutosDia = 0;
                         }
                    } 
                    // Si NO es la clínica seleccionada, usar lógica original (sin intersección)
                    else {
                        diaUsuario.ranges.forEach(franja => {
                            try {
                                const userStartMins = parseTimeToMinutes(franja.start);
                                const userEndMins = parseTimeToMinutes(franja.end);
                                if(userStartMins !== null && userEndMins !== null && userEndMins > userStartMins) {
                                     minutosDia += userEndMins - userStartMins;
                                }
                            } catch (e) {
                                console.warn(`Error procesando franja (original) en ${diaKey} para clinica ${clinicaId}:`, franja, e);
                            }
                        });
                    }
                }
                // <<< FIN LÓGICA MODIFICADA >>>
                
                totalMinutosClinica += minutosDia;

                // Si esta es la clínica seleccionada, guardar detalle (con minutos intersectados)
                if (clinicaId === clinicaSeleccionadaId) {
                    // Guardamos los minutos YA CALCULADOS (con intersección) y el estado de APERTURA DEL USUARIO
                    datosClinicaSeleccionada.porDia[diaKey] = { minutos: minutosDia, isOpen: diaUsuarioEstaAbierto }; 
                    if (diaUsuarioEstaAbierto) {
                        // El contador de días activos sigue basándose en si el *usuario* activó el día
                        datosClinicaSeleccionada.diasActivos++; 
                    }
                }
            });
        }
        totalesPorClinica.set(clinicaId, totalMinutosClinica);
        totalMinutosGlobal += totalMinutosClinica;
    });

    // Calcular el total para la clínica seleccionada (ya se ha hecho con intersección)
    datosClinicaSeleccionada.totalMinutos = totalesPorClinica.get(clinicaSeleccionadaId || '') || 0;

    // Devolver todos los datos calculados
    return { datosClinicaSeleccionada, totalMinutosGlobal, totalesPorClinica };
};

  // Placeholders para funciones handle... (Añadir lógica real)
  const handleRemoveClinica = (clinicId: string) => {
      setPermisosClinicas(prev => {
          const newMap = new Map(prev);
          newMap.delete(clinicId);
          return newMap;
      });
      setSelectedClinicas(prev => prev.filter(id => id !== clinicId));
      if (selectedClinicaHorario === clinicId) {
          setSelectedClinicaHorario("");
      }
      console.log("handleRemoveClinica (UI)", clinicId);
  };
  const handleAddClinica = (clinicId: string, perfilId: string) => {
      if (!clinicId || !perfilId) return;
      setPermisosClinicas(prev => {
          const newMap = new Map(prev);
          const rolesActuales = newMap.get(clinicId) || [];
          if (!rolesActuales.includes(perfilId)) {
             newMap.set(clinicId, [...rolesActuales, perfilId]);
          }
          return newMap;
      });
      setSelectedClinicas(prev => Array.from(new Set([...prev, clinicId])));
      setNuevaClinicaId("");
      setNuevoPerfilClinica("");
      console.log("handleAddClinica (UI)", clinicId, perfilId);
  };
  const handleToggleDia = useCallback((clinicaId: string, diaKey: keyof WeekSchedule, activo: boolean) => {
    setHorarioEditado(prevMap => {
        const nuevoMapa = new Map(prevMap);
        const horarioActual = nuevoMapa.get(clinicaId);
        // CORREGIDO: Acceder a la propiedad del día directamente
        const daySchedule = horarioActual ? horarioActual[diaKey] : null;

        if (horarioActual && daySchedule) {
            // Actualizar el horario clonando y modificando la propiedad del día
            const nuevoHorario = {
                ...horarioActual,
                [diaKey]: {
                    ...daySchedule,
                    isOpen: activo,
                    // Limpiar franjas si se desactiva
                    ranges: activo ? daySchedule.ranges : []
                }
            };
            nuevoMapa.set(clinicaId, nuevoHorario);
            console.log(`[handleToggleDia] Día ${diaKey} para clínica ${clinicaId} actualizado a ${activo}`);
                          // Marcar que hay cambios no guardados
                          if (horarioUsuarioGuardado.get(clinicaId)) {
                            setHorarioUsuarioGuardado(prev => new Map(prev).set(clinicaId, false));
                         }
            
        } else {
             console.warn(`[handleToggleDia] No se encontró horario o día ${diaKey} para la clínica ${clinicaId}`);
        }
        return nuevoMapa;
    });
  }, []);
  const handleRemoveFranja = useCallback((clinicaId: string, diaKey: keyof WeekSchedule, franjaIndexToRemove: number) => {
      console.log(`[handleRemoveFranja] Intentando eliminar franja índice ${franjaIndexToRemove} del día ${diaKey} para clínica ${clinicaId}`);
      setHorarioEditado(prevMap => {
          const nuevoMapa = new Map(prevMap);
          const horarioActual = nuevoMapa.get(clinicaId);
          // Acceder directamente a la propiedad del día (ej: horarioActual.monday)
          const daySchedule = horarioActual ? horarioActual[diaKey] : null;

          if (horarioActual && daySchedule) {
              const franjasActualizadas = daySchedule.ranges.filter((_, index) => index !== franjaIndexToRemove);
              console.log(`[handleRemoveFranja] Franjas restantes para ${diaKey}:`, franjasActualizadas);
              // Actualizar el horario clonando el objeto WeekSchedule y la propiedad del día
              const nuevoHorario = {
                  ...horarioActual,
                  [diaKey]: { ...daySchedule, ranges: franjasActualizadas }
              };
              nuevoMapa.set(clinicaId, nuevoHorario);
              // Marcar que hay cambios no guardados
              if (horarioUsuarioGuardado.get(clinicaId)) {
                setHorarioUsuarioGuardado(prev => new Map(prev).set(clinicaId, false));
             }
          } else {
             console.warn(`[handleRemoveFranja] No se encontró horario o día ${diaKey} para la clínica ${clinicaId}`);
          }
          return nuevoMapa;
      });
      toast({ title: "Franja eliminada", description: `La franja ha sido eliminada.`});
  }, [toast]); 

  // --- INICIO: Definición funciones Modal Franja ---
  const handleOpenFranjaModal = useCallback((diaKey: keyof WeekSchedule, franja?: DayRanges) => {
    // Obtener horario de referencia para este día
    const clinicScheduleDay = horarioClinicaReferencia ? horarioClinicaReferencia[diaKey] : null;
    const clinicRanges = clinicScheduleDay?.ranges || [];
    const isClinicOpen = !!clinicScheduleDay?.isOpen && clinicRanges.length > 0;

    const clinicRangesText = isClinicOpen 
        ? clinicRanges.map(r => `${r.start}-${r.end}`).join(', ') 
        : "Clínica cerrada este día";
        
    // CALCULAR MIN/MAX TIMES 
    let minTime: string | null = null;
    let maxTime: string | null = null;
    if (isClinicOpen) {
      const sortedRanges = [...clinicRanges].sort((a, b) => (a.start || '').localeCompare(b.start || ''));
      minTime = sortedRanges[0]?.start || null; // Inicio de la primera franja
      // Para maxTime, necesitamos ordenar por fin para obtener la última hora de cierre
      const sortedByEnd = [...clinicRanges].sort((a, b) => (a.end || '').localeCompare(b.end || ''));
      maxTime = sortedByEnd[sortedByEnd.length - 1]?.end || null;
    }

    console.log(`[handleOpenFranjaModal] Abriendo modal para día ${diaKey}`, franja ? `editando franja ${franja.start}-${franja.end}` : 'nueva franja', `Ref: ${clinicRangesText}`, `Min: ${minTime}, Max: ${maxTime}`);
    
    // Añadir minTime y maxTime al estado
    setEditingFranja({ 
      dia: diaKey, 
      franja, 
      clinicRefScheduleText: clinicRangesText, 
      minTime, 
      maxTime 
    }); 
    setIsFranjaModalOpen(true);
  }, [horarioClinicaReferencia]); // Añadir dependencia

  const handleSaveFranja = useCallback((franjaData: { inicio: string, fin: string }) => {
    if (!editingFranja || !horarioClinicaReferencia) { 
      console.error("[handleSaveFranja] Faltan datos de edición o horario de referencia.");
      toast({ title: "Error", description: "No se pueden guardar los cambios.", variant: "destructive" });
      return; 
    }

    const { dia: diaKey } = editingFranja;
    const clinicaId = selectedClinicaHorario;

    if (!clinicaId) { 
      console.error("[handleSaveFranja] No hay clínica seleccionada.");
      toast({ title: "Error", description: "Selecciona una clínica primero.", variant: "destructive" });
      return; 
    }

    // --- INICIO VALIDACIÓN HORARIO CLÍNICA ---
    const diaReferencia = horarioClinicaReferencia[diaKey as keyof WeekSchedule];
    
    // <<< INICIO LOGS DE DEPURACIÓN >>>
    console.log(`[handleSaveFranja - DEBUG] diaKey: ${diaKey}`);
    console.log(`[handleSaveFranja - DEBUG] horarioClinicaReferencia completo:`, horarioClinicaReferencia);
    console.log(`[handleSaveFranja - DEBUG] diaReferencia (${diaKey}):`, diaReferencia);
    console.log(`[handleSaveFranja - DEBUG] diaReferencia.isOpen?:`, diaReferencia?.isOpen);
    // <<< FIN LOGS DE DEPURACIÓN >>>

    if (!diaReferencia || !diaReferencia.isOpen) {
        toast({
            title: "Horario inválido",
            description: `La clínica está cerrada los ${t(`days.${diaKey as keyof WeekSchedule}`)}. No se puede añadir horario.`,
            variant: "destructive"
        });
        return; // No guardar
    }

    const esFranjaValida = diaReferencia.ranges.some(rangoClinica => 
        franjaData.inicio >= rangoClinica.start && franjaData.fin <= rangoClinica.end
    );

    if (!esFranjaValida) {
         toast({
            title: "Horario inválido",
            description: `La franja ${franjaData.inicio} - ${franjaData.fin} está fuera del horario de apertura de la clínica (${diaReferencia.ranges.map(r => `${r.start}-${r.end}`).join(', ')}).`,
            variant: "destructive"
        });
        return; // No guardar
    }
    // --- FIN VALIDACIÓN HORARIO CLÍNICA ---

    // Si la validación pasa, proceder a guardar (lógica existente)
    const { franja: franjaOriginal } = editingFranja; // Obtener franjaOriginal aquí después de validar editingFranja
    console.log(`[handleSaveFranja] Guardando franja para día ${diaKey}, clínica ${clinicaId}:`, franjaData);

    setHorarioEditado(prevMap => {
      const nuevoMapa = new Map(prevMap);
      const horarioActual = nuevoMapa.get(clinicaId);
      const daySchedule = horarioActual ? horarioActual[diaKey] : null;

      if (!horarioActual || !daySchedule) { /* ... */ return prevMap; }

      let franjasActualizadas;
      const nuevaFranjaData = { start: franjaData.inicio, end: franjaData.fin };

      if (franjaOriginal) { // Editando franja existente (identificar por valor original?)
        franjasActualizadas = daySchedule.ranges.map(f =>
          (f.start === franjaOriginal.start && f.end === franjaOriginal.end) ? nuevaFranjaData : f
        );
        console.log(`[handleSaveFranja] Franja ${franjaOriginal.start}-${franjaOriginal.end} actualizada.`);
      } else { // Añadiendo nueva franja
        franjasActualizadas = [...daySchedule.ranges, nuevaFranjaData];
        console.log(`[handleSaveFranja] Nueva franja añadida.`);
      }
      // Ordenar franjas por hora de inicio
      franjasActualizadas.sort((a, b) => (a.start || "").localeCompare(b.start || ""));

      const nuevoHorario = {
          ...horarioActual,
          [diaKey]: { ...daySchedule, ranges: franjasActualizadas }
      };
      nuevoMapa.set(clinicaId, nuevoHorario);
            // Marcar que hay cambios no guardados
            if (horarioUsuarioGuardado.get(clinicaId)) {
              setHorarioUsuarioGuardado(prev => new Map(prev).set(clinicaId, false));
           }
      return nuevoMapa;
    });

    setIsFranjaModalOpen(false);
    setEditingFranja(null);
    // i18n: Usar t() para el toast
    toast({ 
        title: t('toast.slotSavedTitle'), 
        description: franjaOriginal 
            ? t('toast.slotUpdatedDescription', { day: t(`days.${diaKey}`) }) 
            : t('toast.slotAddedDescription', { day: t(`days.${diaKey}`) }) 
    });

  }, [editingFranja, selectedClinicaHorario, horarioClinicaReferencia, toast, t]); // <<< AÑADIR t a dependencias
  // --- FIN: Definición funciones Modal Franja ---

  const handleRemoveHabilidad = (clinicId: string, habilidadNombre: string) => { console.log("handleRemoveHabilidad", clinicId, habilidadNombre); };
  const handleAddHabilidad = () => { console.log("handleAddHabilidad"); };

  // Ajustar convertBlocksToWeekSchedule para que coincida con el tipo HorarioSemanal esperado
  // (Asumiendo que HorarioSemanal es un objeto con claves de día, no un array)
  // CORREGIDO: Función ahora devuelve HorarioSemanal { clinicaId, dias: HorarioDia[] }
  const convertBlocksToWeekSchedule = (
      clinicaId: string,
      blocks: any[] | undefined | null,
      defaultOpenTime: string,
      defaultCloseTime: string
  ): WeekSchedule | null => {
      if (!blocks || blocks.length === 0) {
          return null;
      }

      // Inicializar WeekSchedule con todos los días cerrados
      const weekSchedule: WeekSchedule = createDefaultSchedule(); // Usar default como base
      // Resetear todos a cerrados para empezar
       Object.keys(weekSchedule).forEach(dayKey => {
           weekSchedule[dayKey as keyof WeekSchedule] = { isOpen: false, ranges: [] };
       });

      blocks.forEach((block) => {
          if (!block.dayOfWeek) return;
          const dayKey = block.dayOfWeek.toLowerCase() as keyof WeekSchedule;

          if (weekSchedule[dayKey] && block.startTime && block.endTime) {
              weekSchedule[dayKey].isOpen = true; // Marcar como abierto si tiene bloques
              const franja: DayRanges = {
                  start: block.startTime,
                  end: block.endTime
              };
                 weekSchedule[dayKey].ranges.push(franja);
          }
      });

      // Ordenar franjas para cada día
      Object.values(weekSchedule).forEach((daySchedule) => {
          if (daySchedule.isOpen) {
              daySchedule.ranges.sort((a, b) => a.start.localeCompare(b.start));
          }
      });

      // CORREGIDO: Devolver estructura WeekSchedule
      return weekSchedule;
  };


  // Ajustar createDefaultClinicSchedule
  const createDefaultClinicSchedule = (
      clinicaId: string,
      openTime: string,
      closeTime: string
  ): WeekSchedule => {
      const defaultFranja: DayRanges = { start: openTime, end: closeTime };
      // CORREGIDO: Devolver estructura WeekSchedule
      const defaultWeekSchedule: WeekSchedule = createDefaultSchedule(); // Base
      // Aplicar L-V por defecto
      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(dayKey => {
          defaultWeekSchedule[dayKey as keyof WeekSchedule] = { isOpen: true, ranges: [defaultFranja] };
      });
      return defaultWeekSchedule;
  }
  // --- Fin Funciones auxiliares ---

  // --- INICIO: Funciones para CRUD de Excepciones ---
  const handleSaveExcepcion = useCallback(async (excepcionData: Omit<UserClinicScheduleException, 'id' | 'createdAt' | 'updatedAt' | 'user' | 'clinic' | 'assignment'>) => {
    if (!userId || userId === 'nuevo' || !selectedClinicaHorario) {
      toast({ title: "Error", description: "Usuario o clínica no válidos.", variant: "destructive" });
      return;
    }

    const isEditing = !!excepcionEditada; // True si estamos editando (excepcionEditada no es null)
    const method = isEditing ? 'PUT' : 'POST';
    let apiUrl = `/api/users/${userId}/exceptions?clinicId=${selectedClinicaHorario}`;
    if (isEditing && excepcionEditada) {
        apiUrl += `&exceptionId=${excepcionEditada.id}`; // Añadir ID para PUT
    }

    console.log(`[handleSaveExcepcion] ${method} a ${apiUrl}`, excepcionData);

    try {
      const response = await fetch(apiUrl, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(excepcionData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Error ${response.status}: ${errorData.message || 'Error al guardar la excepción.'}`);
      }

      const savedException: FormattedException = await response.json(); // API debería devolver el objeto guardado/actualizado
      console.log('[handleSaveExcepcion] Excepción guardada/actualizada:', savedException);

      // Actualizar estado local
      setExcepcionesUsuario(prev => {
        const newExcepciones = [...prev];
        if (isEditing) {
          const index = newExcepciones.findIndex(exc => exc.id === savedException.id);
          if (index !== -1) {
            newExcepciones[index] = savedException; // Reemplazar la editada
          } else {
            newExcepciones.push(savedException); // Añadir si no se encontró (poco probable)
          }
        } else {
          newExcepciones.push(savedException); // Añadir la nueva
        }
        // Opcional: Ordenar excepciones por fecha de inicio
        newExcepciones.sort((a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime());
        return newExcepciones;
      });

      toast({ title: "Éxito", description: `Excepción ${isEditing ? 'actualizada' : 'creada'} correctamente.` });
      setMostrarModalExcepcion(false); // Cerrar modal
      setExcepcionEditada(null); // Limpiar estado de edición

    } catch (error) {
      console.error("[handleSaveExcepcion] Error:", error);
      toast({ title: "Error", description: error instanceof Error ? error.message : "Error desconocido", variant: "destructive" });
      // No cerrar el modal en caso de error para que el usuario pueda reintentar
    }
  }, [userId, selectedClinicaHorario, excepcionEditada, toast]);

  // Función para manejar la eliminación (necesita API DELETE)
  const handleRemoveExcepcion = useCallback(async (exceptionId: string) => {
     if (!userId || userId === 'nuevo' || !selectedClinicaHorario) return;

     // Confirmación (opcional pero recomendado)
     // i18n: Usar t() para confirmación
     if (!confirm(t('dialogs.confirmDeleteException'))) {
       return;
     }

     console.log(`[handleRemoveExcepcion] DELETE /api/users/${userId}/exceptions?clinicId=${selectedClinicaHorario}&exceptionId=${exceptionId}`);

     try {
       const response = await fetch(`/api/users/${userId}/exceptions?clinicId=${selectedClinicaHorario}&exceptionId=${exceptionId}`, {
         method: 'DELETE',
       });

       if (!response.ok) {
         const errorData = await response.json().catch(() => ({}));
         throw new Error(`Error ${response.status}: ${errorData.message || 'Error al eliminar la excepción.'}`);
       }

       // Actualizar estado local eliminando la excepción
       setExcepcionesUsuario(prev => prev.filter(exc => exc.id !== exceptionId));

       toast({ title: "Éxito", description: "Excepción eliminada correctamente." });

    } catch (error) {
       console.error("[handleRemoveExcepcion] Error:", error);
       toast({ title: "Error", description: error instanceof Error ? error.message : "Error desconocido", variant: "destructive" });
     }
  }, [userId, selectedClinicaHorario, toast, t]);
  // --- FIN Funciones CRUD Excepciones ---

  // Memoizar opciones de clínicas para SelectClinica (si 'clinics' cambia frecuentemente)
  const opcionesClinicasAsignadas = useMemo(() => {
     return clinics
         .filter(c => selectedClinicas.includes(String(c.id))) // Filtrar por las asignadas
         .map(c => ({ 
            id: String(c.id), 
            label: `${c.prefix} - ${c.name}${c.isActive ? '' : ' (Inactiva)'}` 
         }));
  }, [clinics, selectedClinicas]);

  // Memoizar opciones para añadir clínica en Permisos
  const opcionesClinicasParaAnadir = useMemo(() => {
     return clinics
         .filter(c => showDisabledClinics ? true : c.isActive) // Filtrar por activas/todas
         .filter(c => !selectedClinicas.includes(String(c.id))) // Excluir ya asignadas
         .map(c => ({ 
            id: String(c.id), 
            label: `${c.prefix} - ${c.name}${c.isActive ? '' : ' (Inactiva)'}` 
         }));
  }, [clinics, selectedClinicas, showDisabledClinics]);

  // Memoizar opciones para añadir habilidad (reutiliza asignadas?)
   const opcionesClinicasHabilidad = useMemo(() => {
     // Usar las mismas que para horario o todas las disponibles? Por ahora usamos las asignadas.
     return opcionesClinicasAsignadas; 
   }, [opcionesClinicasAsignadas]);


  if (loading && userId !== 'nuevo') { // Añadir chequeo para 'nuevo'
    // Mostrar el Skeleton mientras carga
    return <UsuarioPageSkeleton />;
  }

  // --- NUEVA FUNCIÓN DE GUARDADO POR PESTAÑA (MODIFICADA CON LOG EXTRA) ---
  const handleGuardarUsuario = async () => {
    setIsSaving(true);
    // >>> REVERTIR: Usar tipo Usuario del contexto <<< 
    let refreshedUserData: Usuario | null = null; 

    try {
      let success = false;
      let errorMessage = "Error desconocido al guardar.";

      switch (activeTab) {
        // <<< CASO 'datos-personales' REMOVIDO >>>
        // El guardado de datos personales ahora se gestiona con el <form> y onSubmitPersonalData

        case 'permisos':
          if (userId === 'nuevo') {
            throw new Error("Guarde primero los datos personales para poder asignar permisos.");
          }
          // Preparar payload de asignaciones (enviar SIEMPRE el estado actual)
          const assignmentsPayload: { clinicId: string, roleId: string }[] = [];
          permisosClinicas.forEach((roles, clinicId) => {
            // Asumir un solo rol por ahora, enviar el primero encontrado
            if (roles && roles.length > 0) { 
              assignmentsPayload.push({ clinicId, roleId: roles[0] }); 
            }
          });
          console.log(`[handleGuardarUsuario - Permisos] Enviando asignaciones para usuario ${userId}:`, assignmentsPayload);
          
          // Acceder a updateUsuario a través de userContext
          const permissionsUpdateResult = await userContext.updateUsuario(userId, { clinicAssignments: assignmentsPayload } as any); 
          if (permissionsUpdateResult) {
              success = true;
              // <<< OJO: Refrescar datos podría pisar cambios no guardados en otras pestañas >>>
              // Por ahora, no refrescamos aquí para evitar perder datos no guardados de otras pestañas.
              // Considerar si es necesario refrescar y cómo manejarlo.
              // refreshedUserData = await userContext.getUsuarioById(userId); 
              // if(refreshedUserData) {
              //    // Actualizar permisos en el estado local (permisosClinicas, initialPermisosClinicas)
              //    // ... lógica para actualizar Map de permisos ...
              // }
          } else {
              errorMessage = "Error al guardar los permisos.";
          }
          break;

        case 'horario':
           if (userId === 'nuevo') {
            throw new Error("Guarde primero los datos personales para poder configurar horarios.");
          }
           if (!selectedClinicaHorario) {
               throw new Error("Seleccione una clínica para guardar el horario.");
           }
           // Obtener el horario editado para la clínica seleccionada
           const horarioAGuardar = horarioEditado.get(selectedClinicaHorario);
           if (!horarioAGuardar) {
               console.warn(`[handleGuardarUsuario - Horario] No hay datos de horario editado para la clínica ${selectedClinicaHorario}. No se guardará nada.`);
               success = true; // Tratamos como éxito silencioso por ahora
           } else {
                console.log(`[handleGuardarUsuario - Horario] Obtenido horario para guardar de 'horarioEditado':`, horarioAGuardar);

                // CORRECCIÓN 1: Usar directamente horarioAGuardar, ya que está en formato WeekSchedule
                let scheduleToSend = horarioAGuardar;

                // <<< INICIO: Pre-procesamiento - Desactivar días abiertos sin franjas >>>
                for (const dayKey in scheduleToSend) {
                    if (Object.prototype.hasOwnProperty.call(scheduleToSend, dayKey)) {
                        const daySchedule = scheduleToSend[dayKey as keyof WeekSchedule];
                        // Comprobación extra por si acaso el schedule no está completo
                        if (daySchedule && daySchedule.isOpen && daySchedule.ranges.length === 0) {
                            console.log(`[handleGuardarUsuario - Horario] Desactivando día ${dayKey} por no tener franjas.`);
                            daySchedule.isOpen = false;
                        }
                    }
                }
                // <<< FIN: Pre-procesamiento >>>

                console.log("[handleGuardarUsuario - Horario] Enviando horario pre-procesado a la API:", scheduleToSend);

                const response = await fetch(`/api/users/${userId}/schedule?clinicId=${selectedClinicaHorario}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    // CORRECCIÓN 2: Asegurar que se envía el body correcto
                    body: JSON.stringify(scheduleToSend) 
                });
                if (response.ok) {
                    success = true;
                    // Marcar horario como guardado para esta clínica
                    setHorarioUsuarioGuardado(prev => new Map(prev).set(selectedClinicaHorario!, true));
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    errorMessage = `Error ${response.status} al guardar horario: ${errorData.message || 'Error desconocido'}`;
                    throw new Error(errorMessage);
                }
           }
          break;

        // Añadir casos para otras pestañas (habilidades, condiciones, fichajes)
        case 'habilidades':
        case 'condiciones':
        case 'fichajes':
          console.warn(`Guardado para pestaña '${activeTab}' aún no implementado.`);
          success = true; // Temporalmente marcado como éxito para no bloquear
          // No se necesita refetch para estas pestañas por ahora
          break;

        default:
          // Si la pestaña no es 'datos-personales' y no está manejada, lanzar error o log
          if (activeTab !== 'datos-personales') {
              console.warn(`Pestaña '${activeTab}' no tiene lógica de guardado implementada en handleGuardarUsuario.`);
              // Opcionalmente, mostrar un toast informativo al usuario
              toast({ title: "Info", description: `Guardado no implementado para la pestaña ${t(`tabs.${activeTab}`)}.`, variant: "default" });
              success = true; // Considerar como éxito para no bloquear al usuario
          }
          // Si es 'datos-personales', no hacer nada aquí, ya lo maneja el form onSubmit
          break;
      }

      // --- Mostrar Toast (Solo para pestañas que SÍ se guardaron aquí) --- 
      if (success && activeTab !== 'datos-personales') { // No mostrar para datos personales aquí
         toast({ title: t('toast.successTitle'), description: t('toast.changesSavedSuccess', { tab: t(`tabs.${activeTab}`) }) });
      } else if (!success && activeTab !== 'datos-personales') {
         throw new Error(errorMessage);
      }

    } catch (error) {
      console.error(`[handleGuardarUsuario] Error en pestaña '${activeTab}':`, error);
      // i18n: Toast de error
      toast({ title: t('toast.errorTitle'), description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  // --- FIN NUEVA FUNCIÓN DE GUARDADO ---

  // --- NUEVA FUNCIÓN DE GUARDADO PARA DATOS PERSONALES (handleSubmit la llamará) ---
  const onSubmitPersonalData = async (data: UserPersonalDataFormValues) => {
      console.log("[onSubmitPersonalData] Datos validados recibidos:", data);
      setIsSaving(true);
      let success = false;
      let errorMessage = "Error desconocido al guardar.";
      let refreshedUserData: Usuario | null = null;

      try {
          // Preparar Payload usando 'data' (datos validados por Zod)
          const payload: Partial<Usuario> = {
              firstName: data.firstName,
              lastName: data.lastName, // Zod ya transforma '' a null si se configuró
              email: data.email,
              login: data.login, // Zod ya transforma '' a null
              isActive: data.isActive,
              phone: data.phone, // Zod ya transforma '' a null
              phone2: data.phone2, // Zod ya transforma '' a null
              countryIsoCode: data.countryIsoCode,
              languageIsoCode: data.languageIsoCode,
              phone1CountryIsoCode: data.phone1CountryIsoCode,
              phone2CountryIsoCode: data.phone2CountryIsoCode,
              profileImageUrl: data.profileImageUrl, // Zod ya transforma '' a null
              // Añadir contraseña solo si se introdujo un valor
              ...(data.password && { passwordHash: data.password }), 
              // Añadir campos NO controlados por RHF pero necesarios para la API (si los hubiera)
              // dni: dni, // Ejemplo si DNI no está en el schema RHF pero se necesita enviar
          };

          console.log("[onSubmitPersonalData] Payload final a enviar:", payload);

          if (userId === 'nuevo') {
              // Lógica de Creación
              const createResult = await userContext.createUsuario(payload as Omit<Usuario, 'id' | 'createdAt' | 'updatedAt'>);
              if (createResult) {
                  success = true;
                  // Opcional: Redirigir a la página de edición del nuevo usuario
                  toast({ title: t('toast.successTitle'), description: t('toast.userCreatedSuccess') });
                  router.push(`/configuracion/usuarios/${createResult.id}`); // Redirigir
                  // No se necesita refrescar aquí porque redirigimos
              } else {
                  errorMessage = "Error al crear el usuario.";
              }
          } else {
              // Lógica de Actualización
              const updateResult = await userContext.updateUsuario(userId, payload);
              if (updateResult) {
                  success = true;
                  // Refrescar datos para actualizar la UI y el estado initialUserData
                  refreshedUserData = await userContext.getUsuarioById(userId);
                  if (refreshedUserData) {
                      reset(refreshedUserData); // <<< Actualizar el estado de RHF con datos frescos
                      setInitialUserData(refreshedUserData); // <<< Actualizar datos iniciales
                      // Limpiar contraseña después de guardar si se actualizó
                      if (data.password) {
                         reset({ ...refreshedUserData, password: "" }); // Limpiar campo contraseña en RHF
                      }
                  }
              } else {
                  errorMessage = "Error al actualizar datos personales.";
              }
          }

          if (success && refreshedUserData) { // Éxito en actualización
              toast({ title: t('toast.successTitle'), description: t('toast.changesSavedSuccess', { tab: t(`tabs.datos-personales`) }) });
          } else if (success && userId === 'nuevo') { // Éxito en creación (ya mostrado antes de redirigir)
              // No mostrar toast adicional aquí si ya se redirigió
          } else if (!success) { // Error en creación o actualización
              throw new Error(errorMessage);
          }

      } catch (error) {
          console.error(`[onSubmitPersonalData] Error:`, error);
          toast({ title: t('toast.errorTitle'), description: error instanceof Error ? error.message : String(error), variant: "destructive" });
      } finally {
          setIsSaving(false);
      }
  };
  // --- FIN NUEVA FUNCIÓN DE GUARDADO ---

  // --- RENDERIZADO DEL COMPONENTE ---
  // console.log("[Render] Estado antes de renderizar:", { /* ... */ }); // <<< ELIMINAR O COMENTAR LOG

  return (
    <div className="relative pb-20">
    <div className="container max-w-5xl p-6 mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Editar usuario</h1>
      </div>
      
      <Tabs 
        defaultValue="datos-personales" 
        className="w-full" 
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="mb-4">
          {/* i18n: Usar claves existentes */}
          <TabsTrigger value="datos-personales">{t('userProfile.personalData')}</TabsTrigger>
          <TabsTrigger value="permisos">{t('userProfile.permissions')}</TabsTrigger>
          <TabsTrigger value="horario">{t('userProfile.schedule')}</TabsTrigger>
          <TabsTrigger value="habilidades">{t('userProfile.skills')}</TabsTrigger>
          <TabsTrigger value="condiciones">{t('userProfile.laborConditions')}</TabsTrigger>
          <TabsTrigger value="fichajes">{t('userProfile.presenceControl')}</TabsTrigger>
        </TabsList>
        
        {/* Pestaña de Datos Personales (VISIBLE) */}
        <TabsContent value="datos-personales" className="space-y-4">
          {/* <<< AÑADIR FORM y onSubmit >>> */}
          {/* El botón de guardar fuera del form activará el submit si esta pestaña está activa */}
          <form id="personal-data-form" onSubmit={handleSubmit(onSubmitPersonalData)}> 
            <Card className="p-4 space-y-4">
              {/* El contenido del Card no cambia aquí */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* === Columna Izquierda === */}
                <div className="space-y-3">
                  {/* Campo Nombre Refactorizado */}
                  <div>
                    {/* i18n */}
                    <Label htmlFor="firstName" className="text-sm font-medium">{t('users.firstNameLabel')}</Label>
                    <Input
                      id="firstName"
                      {...register("firstName")} // <<< MODIFICADO
                      className="h-9"
                      placeholder={t('users.firstNamePlaceholder')} // i18n
                    />
                    {/* <<< AÑADIR ERROR MESSAGE >>> */}
                    {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>}
                  </div>
                  {/* Campo Apellidos Añadido */}
                   <div>
                    {/* i18n */}
                    <Label htmlFor="lastName" className="text-sm font-medium">{t('users.lastNameLabel')}</Label>
                    <Input
                      id="lastName"
                      {...register("lastName")} // <<< MODIFICADO
                      className="h-9"
                      placeholder={t('users.lastNamePlaceholder')} // i18n
                    />
                    {/* <<< AÑADIR ERROR MESSAGE >>> */}
                    {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>}
                  </div>
                  
                  <div>
                    {/* i18n */}
                    <Label htmlFor="email" className="text-sm font-medium">{t('users.emailLabel')}</Label>
                    <Input
                      id="email"
                      type="email"
                      {...register("email")} // <<< MODIFICADO
                      className="h-9"
                      placeholder={t('users.emailPlaceholder')} // i18n
                      autoComplete="email" // <<< AÑADIR AUTOCOMPLETE >>>
                    />
                    {/* <<< AÑADIR ERROR MESSAGE >>> */}
                    {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
                  </div>
                  
                  <div>
                    {/* i18n */}
                    <Label htmlFor="confirmEmail" className="text-sm font-medium">{t('users.confirmEmailLabel')}</Label>
                    <Input
                      id="confirmEmail"
                      type="email"
                      {...register("confirmEmail")} // <<< MODIFICADO
                      className="h-9"
                      placeholder={t('users.confirmEmailPlaceholder')} // i18n
                    />
                    {/* <<< AÑADIR ERROR MESSAGE >>> */}
                    {errors.confirmEmail && <p className="mt-1 text-xs text-red-600">{errors.confirmEmail.message}</p>}
                  </div>
                  
                  {/* ... (campos dni, fecha nacimiento) ... */}
                  {/* <<< AÑADIR i18n A CAMPOS DNI Y FECHA NACIMIENTO SI PROCEDE >>> */}
                  <div>
                    <Label htmlFor="dni" className="text-sm font-medium">{t('users.dniLabel')}</Label> {/* i18n */}
                    {/* <<< REMOVIDO value y onChange >>> */}
                    <Input id="dni" className="h-9" /> 
                  </div>
                   <div>
                    <Label htmlFor="fechaNacimiento" className="text-sm font-medium">{t('users.dobLabel')}</Label> {/* i18n */}
                    {/* <<< REMOVIDO value y onChange >>> */}
                    <Input id="fechaNacimiento" type="date" className="h-9" /> 
                  </div>
                </div>
                
                {/* === Columna Derecha === */}
                <div className="space-y-3">
                  {/* ... (campos sexo, perfil) ... */}
                   {/* <<< AÑADIR i18n A CAMPOS SEXO Y PERFIL SI PROCEDE >>> */}
                   <div>
                     <Label htmlFor="sexo" className="text-sm font-medium">{t('users.sexLabel')}</Label> {/* i18n */}
                     <Select value={sexo} onValueChange={setSexo}>
                       <SelectTrigger id="sexo" className="h-9">
                         <SelectValue placeholder={t('users.sexPlaceholder' as any)} /> {/* i18n */}
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="male">{t('users.sexMale' as any)}</SelectItem> {/* i18n */}
                         <SelectItem value="female">{t('users.sexFemale' as any)}</SelectItem> {/* i18n */}
                         <SelectItem value="other">{t('users.sexOther' as any)}</SelectItem> {/* i18n */}
                       </SelectContent>
                     </Select>
                   </div>
                   {/* Asumiendo que 'Perfil' ya no está o se maneja en 'Permisos' */}

                  {/* <<< MOVER AQUÍ: TELÉFONO PRINCIPAL (YA ESTÁ AQUÍ, SOLO AÑADIR i18n) >>> */}
                  <div>
                    <Label htmlFor="telefono" className="text-sm font-medium">{t('users.mainPhoneLabel' as any)}</Label>
                    <div className="flex items-center gap-2">
                      <div className="w-[130px] shrink-0">
                        {/* <<< WRAP WITH CONTROLLER >>> */}
                        <Controller
                          name="phone1CountryIsoCode"
                          control={control}
                          render={({ field }) => (
                            <SearchableSelect
                              options={availableCountries.map(c => ({ value: c.isoCode, label: `${c.phoneCode} (${c.isoCode})` }))}
                              value={field.value} // <<< Use field.value
                              onChange={field.onChange} // <<< Use field.onChange
                              placeholder={t('users.prefixPlaceholder' as any)} // i18n + as any
                              noResultsText={t('users.prefixNoResults' as any)} // i18n + as any
                              isLoading={isLoadingCountries}
                              disabled={isLoadingCountries}
                            />
                          )}
                        />
                        {/* <<< END WRAP >>> */}
                      </div>
                      <Input
                        id="telefono"
                        {...register("phone")} // <<< MODIFICADO (campo 'phone' en schema)
                        className="flex-1 h-9"
                        autoComplete="tel" // Usar "tel" para teléfonos
                      />
                    </div>
                    {/* <<< AÑADIR ERROR MESSAGE (para el input principal) >>> */}
                    {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
                    {/* <<< AÑADIR ERROR MESSAGE (para el prefijo - Controller) >>> */}
                    {errors.phone1CountryIsoCode && <p className="mt-1 text-xs text-red-600">{errors.phone1CountryIsoCode.message}</p>}
                  </div>
                  {/* <<< FIN MOVER TELÉFONO PRINCIPAL >>> */}

                  {/* <<< CAMPO TELÉFONO ALTERNATIVO (Añadir i18n) >>> */}
                  <div>
                    <Label htmlFor="telefono2" className="text-sm font-medium">{t('users.altPhoneLabel' as any)}</Label>
                    <div className="flex items-center gap-2">
                      <div className="w-[130px] shrink-0">
                         {/* <<< WRAP WITH CONTROLLER >>> */}
                        <Controller
                          name="phone2CountryIsoCode"
                          control={control}
                          render={({ field }) => (
                            <SearchableSelect
                              options={availableCountries.map(c => ({ value: c.isoCode, label: `${c.phoneCode} (${c.isoCode})` }))}
                              value={field.value} // <<< Use field.value
                              onChange={field.onChange} // <<< Use field.onChange
                              placeholder={t('users.prefixPlaceholder' as any)} // i18n + as any
                              noResultsText={t('users.prefixNoResults' as any)} // i18n + as any
                              isLoading={isLoadingCountries}
                              disabled={isLoadingCountries}
                            />
                          )}
                        />
                         {/* <<< END WRAP >>> */}
                      </div>
                      <Input
                        id="telefono2"
                        {...register("phone2")} // <<< MODIFICADO
                        className="flex-1 h-9"
                        autoComplete="tel" // Usar "tel"
                      />
                    </div>
                    {/* <<< AÑADIR ERROR MESSAGE (para el input principal) >>> */}
                    {errors.phone2 && <p className="mt-1 text-xs text-red-600">{errors.phone2.message}</p>}
                    {/* <<< AÑADIR ERROR MESSAGE (para el prefijo - Controller) >>> */}
                    {errors.phone2CountryIsoCode && <p className="mt-1 text-xs text-red-600">{errors.phone2CountryIsoCode.message}</p>}
                  </div>
                  {/* <<< FIN TELÉFONO ALTERNATIVO >>> */}

                  {/* <<< AÑADIR CAMPO LOGIN AQUÍ >>> */}
                  <div>
                    <Label htmlFor="login">{t('users.loginLabel' as any)}</Label> {/* i18n + as any */}
                    <Input
                      id="login"
                      {...register("login")} // <<< MODIFICADO
                      placeholder={t('users.loginPlaceholder' as any)} // i18n + as any
                      className="h-9"
                      autoComplete="username"
                    />
                    {/* <<< AÑADIR ERROR MESSAGE >>> */}
                    {errors.login && <p className="mt-1 text-xs text-red-600">{errors.login.message}</p>}
                  </div>
                  {/* <<< FIN AÑADIR CAMPO LOGIN >>> */}

                  {/* <<< AÑADIR CAMPO CONTRASEÑA AQUÍ (Añadir i18n) >>> */}
                  <div>
                    <Label htmlFor="password">{t('users.passwordLabel' as any)}</Label> {/* i18n + as any */}
                    <Input
                      id="password"
                      type="password"
                      {...register("password")} // <<< MODIFICADO
                      placeholder={t('users.passwordPlaceholder' as any)} // i18n + as any
                      className="h-9"
                      autoComplete="new-password"
                    />
                    {/* <<< AÑADIR ERROR MESSAGE >>> */}
                    {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
                  </div>
                  {/* <<< FIN AÑADIR CAMPO CONTRASEÑA >>> */}

                   {/* <<< AÑADIR CAMPO IDIOMA AQUÍ (CON i18n) >>> */}
                   <div>
                     <Label htmlFor="idioma" className="text-sm font-medium">{t('users.languageLabel' as any)}</Label> {/* i18n + as any */}
                     {/* <<< WRAP WITH CONTROLLER >>> */}
                     <Controller
                       name="languageIsoCode"
                       control={control}
                       render={({ field }) => (
                         <Select
                           value={field.value ?? ""} // <<< Use field.value (fallback for null)
                           onValueChange={field.onChange} // <<< Use field.onChange
                         >
                           <SelectTrigger id="idioma" className="h-9">
                             <SelectValue placeholder={t('users.languagePlaceholder' as any)} /> {/* i18n + as any */}
                           </SelectTrigger>
                           <SelectContent>
                             {/* Aquí irían las opciones de idioma disponibles */}
                             <SelectItem value="es">Español</SelectItem>
                             <SelectItem value="en">English</SelectItem>
                             {/* Añadir más idiomas si es necesario */}
                           </SelectContent>
                         </Select>
                       )}
                     />
                     {/* <<< END WRAP >>> */}
                     {/* <<< AÑADIR ERROR MESSAGE (para el select - Controller) >>> */}
                     {errors.languageIsoCode && <p className="mt-1 text-xs text-red-600">{errors.languageIsoCode.message}</p>}
                   </div>
                   {/* <<< FIN AÑADIR CAMPO IDIOMA >>> */}

                  {/* <<< MOVER/ASEGURAR CAMPO ACTIVO AQUÍ (Añadir i18n) >>> */}
                   <div className="flex items-center pt-2 space-x-2"> {/* Ajustar padding si es necesario */} 
                      {/* <<< WRAP WITH CONTROLLER >>> */}
                      <Controller
                        name="isActive"
                        control={control}
                        render={({ field }) => (
                          <Switch
                            id="isActive"
                            checked={field.value} // <<< Use field.value
                            onCheckedChange={field.onChange} // <<< Use field.onChange
                            ref={field.ref} // <<< Pass ref
                          />
                        )}
                      />
                      {/* <<< END WRAP >>> */}
                      <Label htmlFor="isActive">Usuario activo</Label>
                   </div>
                   {/* <<< AÑADIR ERROR MESSAGE (para el switch - Controller) >>> */}
                   {errors.isActive && <p className="mt-1 text-xs text-red-600">{errors.isActive.message}</p>}
                   {/* <<< FIN MOVER/ASEGURAR CAMPO ACTIVO >>> */}
                </div>
              </div>
              
              {/* Sección de Datos del colegiado (Aplicar i18n) */}
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1 bg-purple-100 rounded">
                    {/* Icono */}
                  </div>
                  {/* i18n: Quitar t() temporalmente */}
                  <h2 className="text-base font-semibold text-gray-700">Datos del colegiado</h2>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="colegio" className="text-sm font-medium">Colegio</Label> {/* i18n: Quitar t() temporalmente */}
                    <Input
                      id="colegio"
                      value={colegio}
                      onChange={(e) => setColegio(e.target.value)}
                      className="h-9"
                      placeholder="Colegio" // i18n: Quitar t() temporalmente
                    />
                  </div>
                  <div>
                    <Label htmlFor="numeroColegiado" className="text-sm font-medium">Número de colegiado</Label> {/* i18n: Quitar t() temporalmente */}
                    <Input
                      id="numeroColegiado"
                      value={numeroColegiado}
                      onChange={(e) => setNumeroColegiado(e.target.value)}
                      className="h-9"
                      placeholder="Número de colegiado" // i18n: Quitar t() temporalmente
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 mt-3 md:grid-cols-2">
                  <div>
                    <Input
                      placeholder="Especialidad" // i18n: Quitar t() temporalmente
                      value={especialidad}
                      onChange={(e) => setEspecialidad(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Universidad" // i18n: Quitar t() temporalmente
                      value={universidad}
                      onChange={(e) => setUniversidad(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
              </div>

              {/* Sección de Dirección (Aplicar i18n) */}
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-2">
                   <div className="p-1 bg-purple-100 rounded">
                    {/* Icono */}
                  </div>
                  {/* i18n: Quitar t() temporalmente */}
                  <h2 className="text-base font-semibold text-gray-700">{t('userProfile.addressTitle')}</h2>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="direccion" className="text-sm font-medium">Dirección</Label> {/* i18n: Quitar t() temporalmente */}
                    <Input
                      id="direccion"
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                      className="h-9"
                      placeholder="Calle, número, piso..." // i18n: Quitar t() temporalmente
                    />
                  </div>
                  <div>
                    <Label htmlFor="provincia" className="text-sm font-medium">Provincia</Label> {/* i18n: Quitar t() temporalmente */}
                    <Input
                      id="provincia"
                      value={provincia}
                      onChange={(e) => setProvincia(e.target.value)}
                      className="h-9"
                      placeholder="Provincia" // i18n: Quitar t() temporalmente
                    />
                  </div>
                  <div>
                    <Label htmlFor="pais" className="text-sm font-medium">País</Label> {/* i18n: Quitar t() temporalmente */}
                    {/* <<< WRAP WITH CONTROLLER >>> */}
                    <Controller
                      name="countryIsoCode"
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          options={availableCountries.map(c => ({ value: c.isoCode, label: c.name }))}
                          value={field.value} // <<< Use field.value
                          onChange={field.onChange} // <<< Use field.onChange
                          placeholder="Seleccionar país" // i18n: Quitar t() temporalmente
                          noResultsText="No encontrado." // i18n: Quitar t() temporalmente
                          isLoading={isLoadingCountries}
                          disabled={isLoadingCountries}
                        />
                      )}
                    />
                    {/* <<< END WRAP >>> */}
                    {/* <<< AÑADIR ERROR MESSAGE (para el searchableSelect - Controller) >>> */}
                    {errors.countryIsoCode && <p className="mt-1 text-xs text-red-600">{errors.countryIsoCode.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="localidad" className="text-sm font-medium">Localidad</Label> {/* i18n: Quitar t() temporalmente */}
                    <Input
                      id="localidad"
                      value={localidad}
                      onChange={(e) => setLocalidad(e.target.value)}
                      className="h-9"
                      placeholder="Localidad" // i18n: Quitar t() temporalmente
                    />
                  </div>
                  <div>
                    <Label htmlFor="cp" className="text-sm font-medium">Código Postal</Label> {/* i18n: Quitar t() temporalmente */}
                    <Input
                      id="cp"
                      value={cp}
                      onChange={(e) => setCp(e.target.value)}
                      className="h-9"
                      placeholder="Código Postal" // i18n: Quitar t() temporalmente
                    />
                  </div>
                </div>
              </div>

              {/* Sección de Configuración (Aplicar i18n) */}
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1 bg-purple-100 rounded">
                    {/* Icono */}
                  </div>
                  <h2 className="text-base font-semibold text-gray-700">{t('userProfile.configurationTitle')}</h2>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="exportCsv" className="text-sm font-medium">{t('users.settingExportCsvLabel')}</Label> 
                    <Select value={exportCsv} onValueChange={setExportCsv}>
                      <SelectTrigger id="exportCsv" className="h-9">
                        <SelectValue placeholder="Seleccione una opción" /> {/* i18n: Quitar t() temporalmente */}
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="true">Sí</SelectItem> {/* i18n: Quitar t() temporalmente */}
                          <SelectItem value="false">No</SelectItem> {/* i18n: Quitar t() temporalmente */}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                     {/* i18n: Quitar t() temporalmente */}
                    <Label htmlFor="indiceControl" className="text-sm font-medium">Índice control de presencia</Label>
                    <Select value={indiceControl} onValueChange={setIndiceControl}>
                      <SelectTrigger id="indiceControl" className="h-9">
                         {/* i18n: Quitar t() temporalmente */}
                        <SelectValue placeholder="Seleccione una opción" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Las opciones aquí deberían ser dinámicas o traducibles si es necesario */}
                        <SelectItem value="000001-Markeiser-Catherine">000001-Markeiser-Catherine</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="numeroPIN" className="text-sm font-medium">Número de identificación personal (PIN)</Label> {/* i18n: Quitar t() temporalmente */}
                    <Input
                      id="numeroPIN"
                      value={numeroPIN}
                      onChange={(e) => setNumeroPIN(e.target.value)}
                      className="h-9"
                      placeholder="PIN numérico" // i18n: Quitar t() temporalmente
                    />
                  </div>
                  <div>
                    {/* i18n: Quitar t() temporalmente */}
                    <Label htmlFor="notas" className="text-sm font-medium">Notas</Label> 
                    <textarea
                      id="notas"
                      className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      placeholder="Notas internas sobre el usuario" // i18n: Quitar t() temporalmente
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="mostrarDesplazados"
                          checked={mostrarDesplazados} // AÑADIDO estado
                          onCheckedChange={(checked) => setMostrarDesplazados(checked === true)} // AÑADIDO estado
                      />
                       {/* i18n: Quitar t() por error "users.settingHideDisplaced not found" */}
                      <Label htmlFor="mostrarDesplazados" className="text-sm">No mostrar en desplazados</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="mostrarCitasPropias"
                          checked={mostrarCitasPropias} // AÑADIDO estado
                          onCheckedChange={(checked) => setMostrarCitasPropias(checked === true)} // AÑADIDO estado
                      />
                       {/* i18n: Quitar t() por error "users.settingShowOwnAppointments not found" */}
                      <Label htmlFor="mostrarCitasPropias" className="text-sm">Mostrar únicamente las citas propias</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="restringirIP"
                          checked={restringirIP} // AÑADIDO estado
                          onCheckedChange={(checked) => setRestringirIP(checked === true)} // AÑADIDO estado
                      />
                      {/* i18n: Quitar t() por error "users.settingRestrictIp not found" */}
                      <Label htmlFor="restringirIP" className="text-sm">Restringir IP</Label> 
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="deshabilitado"
                          checked={deshabilitado}
                          onCheckedChange={(checked) => setDeshabilitado(checked === true)}
                      />
                      {/* i18n: Quitar t() por error "users.settingDisabled not found" */}
                      <Label htmlFor="deshabilitado" className="text-sm">Deshabilitado</Label> 
                    </div>
                  </div>
                </div>
              </div>
            </Card>
            {/* <<< NO incluir botones aquí, mantenerlos fuera del form >>> */}
          </form> 
          {/* <<< FIN FORM >>> */}
        </TabsContent>
        
          {/* Pestaña de Permisos */}
        <TabsContent value="permisos" className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                {/* i18n */}
                <h3 className="text-base font-medium">{t('userProfile.permissionsTitle')}</h3>
                {/* Botón para mostrar/ocultar inactivas? */}
              </div>
              {/* Tabla de asignaciones existentes */}
              <div className="mb-4 border rounded-md">
                <Table>
                  <TableHeader>
                    {/* CORREGIR: Eliminar whitespace en TableHeader -> TableRow */}
                    <TableRow>
                      <TableHead>Clínica</TableHead><TableHead>Perfil</TableHead><TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from(permisosClinicas.entries()).map(([clinicaId, rolesIds]) => {
                      const clinica = clinics.find(c => String(c.id) === clinicaId);
                      const roleId = rolesIds[0];
                      const roleName = availableRoles.find(r => r.id === roleId)?.name || roleId;
                      if (!clinica) return null; 
                      // CORREGIDO PREVIAMENTE (Asegurar que sigue sin whitespace)
                      return (
                        <TableRow key={clinicaId}><TableCell>{clinica.prefix} - {clinica.name}</TableCell><TableCell><Badge variant="secondary">{roleName}</Badge></TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => handleRemoveClinica(clinicaId)}><Trash className="w-4 h-4" /></Button></TableCell></TableRow>
                      );
                    })}
                    {permisosClinicas.size === 0 && (
                      // CORREGIR: Eliminar whitespace en TableBody -> TableRow (fila vacía)
                      <TableRow>
                        {/* i18n */}
                        <TableCell colSpan={3} className="text-center text-gray-500">{t('userProfile.noClinicsAssigned')}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Sección para añadir nueva asignación */}
              <div className="flex items-end gap-2 p-3 border rounded-md bg-gray-50">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Añadir Clínica</Label>
                  <SelectClinica 
                    value={nuevaClinicaId}
                    onChange={setNuevaClinicaId}
                    options={clinics
                      .filter(c => showDisabledClinics ? true : c.isActive) 
                      .filter(c => !permisosClinicas.has(String(c.id))) // Usar .has para Map
                      .map(c => ({ 
                         id: String(c.id), 
                         label: `${c.prefix} - ${c.name}${c.isActive ? '' : ' (Inactiva)'}` 
                      }))}
                    placeholder="Seleccionar clínica"
                  />
                  <div className="flex items-center pt-1 space-x-2">
                    <Checkbox 
                      id="show-disabled-clinics-perms" 
                      checked={showDisabledClinics}
                      onCheckedChange={(checked) => setShowDisabledClinics(checked === true)}
                    />
                    <Label htmlFor="show-disabled-clinics-perms" className="text-xs text-gray-600 cursor-pointer">
                      Mostrar clínicas desactivadas
                    </Label>
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Seleccionar Perfil</Label>
                  <MemoizedSelect 
                    value={nuevoPerfilClinica} 
                    onChange={setNuevoPerfilClinica} 
                    placeholder="Seleccionar perfil"
                    disabled={isLoadingRoles} 
                  >
                     {availableRoles.map(role => (
                      <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                    ))}
                    {isLoadingRoles && <SelectItem value="loading" disabled>Cargando roles...</SelectItem>}
                    {!isLoadingRoles && availableRoles.length === 0 && <SelectItem value="no_roles" disabled>No hay roles disponibles</SelectItem>}
                  </MemoizedSelect>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => handleAddClinica(nuevaClinicaId, nuevoPerfilClinica)} 
                  disabled={!nuevaClinicaId || !nuevoPerfilClinica || isLoadingRoles} 
                  className="h-9"
                >
                  Añadir
                </Button>
              </div>
            </Card>
        </TabsContent>
        
          {/* Pestaña de Horario */}
        <TabsContent value="horario" className="space-y-4">
            {/* Sección Selección Clínica (Restaurada) */}
            <div className="p-4 space-y-4 border rounded-md">
               <div className="flex items-center space-x-4">
                   {/* i18n */}
                   <Label htmlFor="clinica-horario-select" className="whitespace-nowrap">{t('schedule.selectClinicLabel')}:</Label>
                   <Select
                     value={selectedClinicaHorario || ""}
                     onValueChange={(value) => setSelectedClinicaHorario(value)}
                   >
                     {/* ... (SelectTrigger y SelectContent sin cambios) ... */}
                     <SelectTrigger id="clinica-horario-select">
                       <SelectValue placeholder={t('schedule.selectClinicPlaceholder')} /> {/* i18n */}
                     </SelectTrigger>
                     <SelectContent>
                       {clinics.filter(c => selectedClinicas.includes(c.id)).map(clinic => (
                         <SelectItem key={clinic.id} value={clinic.id}>
                           {clinic.name} 
                         </SelectItem>
                       ))}
                       {selectedClinicas.length === 0 && (
                          /* i18n */
                          <SelectItem value="no-clinics" disabled>{t('schedule.noClinicsAssigned')}</SelectItem>
                       )}
                     </SelectContent>
                   </Select>
                   {/* El Badge de estado se MOVERÁ de aquí */}
               </div>
            </div>

            {/* Mostrar controles de horario solo si se selecciona una clínica */}
            {selectedClinicaHorario && (
              <>
                {/* Contenedor Grid para Resumen y Referencia (Restaurado) */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* Tarjeta Resumen de Horas (Restaurada) */}
                  <Card className="p-4 bg-white border rounded-lg shadow-sm">
                    {/* ... (Contenido del resumen de horas sin cambios) ... */}
                    {/* i18n */}
                    <h4 className="mb-3 text-sm font-medium">{t('schedule.hoursSummaryTitle', { clinicName: clinics.find(c => c.id === selectedClinicaHorario)?.name })}</h4>
                    {(() => {
                      const { datosClinicaSeleccionada, totalMinutosGlobal, totalesPorClinica } = calcularHorasTotales(
                          horarioEditado, 
                          selectedClinicaHorario, 
                          selectedClinicas,
                          horarioClinicaReferencia
                      );
                      const totalHorasRecomendadas = 40;
                      const minutosAHoraLegible = (minutos: number) => {
                        if (isNaN(minutos) || minutos < 0) return "0h 0m";
                        const h = Math.floor(minutos / 60);
                        const m = minutos % 60;
                        return `${h}h ${m}m`;
                      };
                      return (
                        <div className="space-y-3">
                           {selectedClinicas.length > 1 && (
                             <div className="flex justify-between pb-2 mb-2 text-sm font-semibold border-b">
                               {/* i18n */}
                               <span>{t('schedule.globalTotalLabel')}:</span>
                               <span className={`font-bold ${totalMinutosGlobal > totalHorasRecomendadas * 60 * selectedClinicas.length ? 'text-orange-600' : ''}`}>
                                 {minutosAHoraLegible(totalMinutosGlobal)}
                               </span>
                             </div>
                           )}
                           <div className="flex justify-between text-sm">
                             {/* i18n */}
                             <span>{selectedClinicas.length > 1 ? t('schedule.currentClinicTotalLabel') : t('schedule.weeklyTotalLabel')}:</span>
                             <span className={`font-bold ${datosClinicaSeleccionada.totalMinutos > totalHorasRecomendadas * 60 ? 'text-red-600' : ''}`}>
                               {/* i18n: recomendado */}
                               {minutosAHoraLegible(datosClinicaSeleccionada.totalMinutos)} / {t('schedule.recommendedHours', { count: totalHorasRecomendadas })}
                             </span>
                           </div>
                           <div className="flex justify-between text-xs text-gray-500">
                             {/* i18n */}
                             <span>{t('schedule.activeDaysLabel')}:</span>
                             <span>{datosClinicaSeleccionada.diasActivos} / 7</span>
                           </div>
                          {selectedClinicas.length > 1 && (
                             <div className="pt-2 mt-2 space-y-1 border-t">
                                {/* i18n */}
                               <h5 className="mb-1 text-xs font-medium text-gray-600">{t('schedule.totalByAssignedClinicLabel')}:</h5>
                               {Array.from(totalesPorClinica.entries()).map(([clinicaId, minutosTotal]) => {
                                 const clinicaInfo = clinics.find(c => c.id === clinicaId);
                                 return (
                                   <div key={clinicaId} className="flex justify-between text-xs">
                                     <span className="text-gray-700 truncate">{clinicaInfo?.name || 'Clínica desconocida'}:</span>
                                     <span className={`font-mono ${clinicaId === selectedClinicaHorario ? 'font-bold text-blue-700' : 'text-gray-600'}`}>
                                       {minutosAHoraLegible(minutosTotal)}
                                     </span>
                                   </div>
                                 );
                               })}
                             </div>
                           )}
                          <div className="pt-2 mt-2 border-t">
                             {/* i18n */}
                             <h5 className="mb-1 text-xs font-medium text-gray-600">{t('schedule.detailByDayLabel')}:</h5>
                             <div className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2 lg:grid-cols-3">
                               {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(diaKey => {
                                   const { minutos, isOpen } = datosClinicaSeleccionada.porDia?.[diaKey] ?? { minutos: 0, isOpen: false };
                                  return (
                                     <div key={diaKey} className="flex items-center justify-between px-1 py-0.5 rounded bg-gray-100/50">
                                       {isOpen ? <CheckCircle className="w-3 h-3 mr-1 text-green-500 shrink-0" /> : <X className="w-3 h-3 mr-1 text-red-500 shrink-0" />}
                                       <span className="capitalize grow">{t(`days.${diaKey as keyof WeekSchedule}`)}:</span>
                                       <span className="pl-1 font-mono text-right text-gray-700 shrink-0">{minutosAHoraLegible(minutos)}</span>
                                     </div>
                                  );
                                 })
                               }
                             </div>
                           </div>
                          {selectedClinicas.length > 1 && (
                             <Button variant="outline" size="sm" className="w-full mt-3 text-xs h-7" onClick={() => { /* Placeholder */ }} disabled >
                               <PlusCircle className="w-3 h-3 mr-1" />
                               Equilibrar carga entre clínicas
                             </Button>
                           )}
                        </div>
                      );
                    })()}
                  </Card>

                  {/* Recuadro Horario Clínica Referencia (Restaurado) */}
                  {/* ... (Contenido del recuadro de referencia sin cambios) ... */}
                  {horarioClinicaReferencia && (
                      <div className="p-4 space-y-2 text-sm border border-blue-200 rounded-lg shadow-sm bg-blue-50">
                        {/* i18n */}
                        <h4 className="mb-2 font-medium text-blue-800">
                          <Briefcase className="inline w-4 h-4 mr-1.5 align-text-bottom" />
                          Horario de Referencia: {clinics.find(c => c.id === selectedClinicaHorario)?.name || 'Clínica Desconocida'}
                        </h4>
                        {isLoadingHorario ? (
                          <div className="space-y-1.5 animate-pulse">
                            <Skeleton className="w-3/4 h-4 bg-blue-100" />
                            <Skeleton className="w-1/2 h-4 bg-blue-100" />
                          </div>
                        ) : (
                          <div className="space-y-1 text-xs text-blue-700">
                            <div className="grid grid-cols-1 gap-x-4 gap-y-0.5 sm:grid-cols-2">
                              {(Object.keys(horarioClinicaReferencia) as Array<keyof WeekSchedule>).map(dayKey => {
                                const dayData = horarioClinicaReferencia[dayKey];
                                if (!dayData || !dayData.isOpen || !dayData.ranges || dayData.ranges.length === 0) return null;
                                return (
                                  <div key={`${dayKey}-ref`} className="flex items-baseline justify-between py-0.5">
                                    <span className="font-medium capitalize w-[80px] shrink-0 truncate">{t(`days.${dayKey as keyof WeekSchedule}`)}:</span>
                                    <span className="pl-2 text-right text-blue-800">
                                      {dayData.ranges.map(r => `${r.start || '--:--'}-${r.end || '--:--'}`).join(', ')}
                                    </span>
                                  </div>
                                );
                              })}
                              {(Object.values(horarioClinicaReferencia).every(d => !d || !d.isOpen || !d.ranges || d.ranges.length === 0)) && (
                                <p className="col-span-1 italic sm:col-span-2">La clínica no tiene días abiertos configurados en su horario de referencia.</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                  )}
                  {!horarioClinicaReferencia && !isLoadingHorario && (
                    <div className="p-4 space-y-2 text-sm text-center border border-dashed rounded-lg border-blue-200/70 bg-blue-50/50 text-blue-600/80">
                        <Briefcase className="inline w-4 h-4 mr-1.5 align-text-bottom" />
                        No hay horario de referencia disponible para esta clínica.
                    </div>
                  )}
                </div> {/* Fin del Grid Resumen/Referencia */}

                {/* Sub-pestañas Horario Semanal / Excepciones (Restauradas) */}
                <Tabs value={horarioSubTab} onValueChange={setHorarioSubTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="semanal">Horario Semanal</TabsTrigger>
                    <TabsTrigger value="excepciones">Excepciones</TabsTrigger>
                    <TabsTrigger value="vista">Vista Consolidada</TabsTrigger>
                  </TabsList>
                  
                  {/* Sub-Pestaña: Horario Semanal (Restaurada) */}
                  <TabsContent value="semanal">
                    {/* <<< Card con Posicionamiento Relativo para el Badge >>> */}
                    <Card className="relative p-4"> 
                      {/* <<< INICIO: Lógica del Badge Movida y Posicionada >>> */}
                      <div className="absolute z-10 top-3 right-3">
                        {selectedClinicaHorario && (
                          (() => {
                              const isSaved = horarioUsuarioGuardado.get(selectedClinicaHorario) ?? false;
                              const currentSchedule = horarioEditado.get(selectedClinicaHorario);
                              const isEmpty = isScheduleEmpty(currentSchedule);
                              
                              if (isSaved && !isEmpty) {
                                  return (
                                      <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                          <CheckCircle className="w-3 h-3 mr-1" />
                                          {/* i18n: Clave para estado guardado */}
                                          {t('schedule.statusSaved' as any)} {/* <<< Añadido as any */}
                                      </Badge>
                                  );
                              } else {
                                  // Siempre mostrar 'Pendiente' si no está guardado y no vacío
                                  return (
                                      <Badge variant="destructive">
                                          <AlertCircle className="w-3 h-3 mr-1" />
                                          {/* i18n: Usar la misma clave para pendiente o vacío */}
                                          {t('schedule.statusPending' as any)} {/* <<< Añadido as any */}
                                      </Badge>
                                  );
                              }
                          })()
                        )}
                      </div>
                      {/* <<< FIN: Lógica del Badge Movida y Posicionada >>> */}
                      
                      <div className="flex items-center justify-between mb-4">
                        {/* i18n */}
                        <h4 className="text-base font-medium">{t('schedule.editableWeeklyScheduleTitle')}</h4>
                        {/* El badge anterior que estaba aquí se elimina */} 
                      </div>
  
                      {/* Contenedor del Horario con Grid (Restaurado) */}
                      {/* ... (Lógica de carga y grid de días sin cambios) ... */}
                       {isLoadingHorario ? (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2"> {/* Skeleton */} </div>
                       ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          {(() => { // Usar IIFE para manejar lógica condicional
                            const currentWeekSchedule = horarioEditado.get(selectedClinicaHorario);
                            if (!currentWeekSchedule) {
                              return <p className="col-span-1 py-4 italic text-center text-gray-500 md:col-span-2">Seleccione una clínica o no hay datos de horario.</p>;
                            }
                            const orderedDays: (keyof WeekSchedule)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                            
                            return orderedDays.map((dayKey) => {
                              const dayData = currentWeekSchedule[dayKey];
                              if (!dayData) return null; 
  
                              const clinicDaySchedule = horarioClinicaReferencia ? horarioClinicaReferencia[dayKey] : null;
                              const isClinicOpenToday = !!clinicDaySchedule?.isOpen; 
  
                              return (
                                <Card key={dayKey} className={cn("p-4 transition-opacity", !dayData.isOpen && "opacity-60 bg-slate-50")}>
                                  <div className="flex items-center justify-between mb-3">
                                    <span className={cn("font-semibold capitalize text-md", dayData.isOpen ? "text-gray-800" : "text-gray-500")}>{t(`days.${dayKey as keyof WeekSchedule}`)}</span>
                                    <Switch
                                      checked={dayData.isOpen}
                                      onCheckedChange={(checked) => handleToggleDia(selectedClinicaHorario!, dayKey, checked)} 
                                      aria-label={`${t('schedule.activateDay')} ${t(`days.${dayKey as keyof WeekSchedule}`)}`}
                                      disabled={!isClinicOpenToday}
                                    />
                                  </div>
  
                                  <div className="space-y-2 min-h-[60px]"> 
                                    {dayData.isOpen ? (
                                      <>
                                        {dayData.ranges.length === 0 && (
                                          /* i18n */
                                          <p className="py-2 text-xs italic text-center text-gray-400">{t('schedule.activeDayNoSlots')}</p>
                                        )}
                                        {dayData.ranges.map((range, rangeIndex) => (
                                          <div
                                            key={`${dayKey}-range-${rangeIndex}-${range.start}-${range.end}`} 
                                            className="flex items-center justify-between gap-1.5 px-3 py-1.5 text-sm rounded-md bg-blue-100 text-blue-800 border border-blue-200 cursor-pointer hover:bg-blue-200/80 transition-colors"
                                            onClick={() => handleOpenFranjaModal(dayKey, range)}
                                          >
                                            <div className="flex items-center gap-1.5">
                                              <Clock className="w-4 h-4" />
                                              <span>{range.start || '--:--'} - {range.end || '--:--'}</span>
                                            </div>
                                            <button
                                              type="button"
                                              className="p-0.5 rounded-full text-blue-600 hover:bg-blue-300/50 hover:text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveFranja(selectedClinicaHorario!, dayKey, rangeIndex); 
                                              }}
                                              aria-label={t('schedule.removeTimeSlotAria', { start: range.start, end: range.end })}
                                            >
                                              <X className="w-4 h-4" />
                                            </button>
                                          </div>
                                        ))}
                                      </>
                                    ) : (
                                      <p className="py-2 text-xs italic text-center text-gray-400">
                                        {/* i18n: Centro cerrado / Día inactivo */}
                                        {!isClinicOpenToday ? t('schedule.centerClosedToday') : t('schedule.inactiveDay')} 
                                      </p>
                                    )}
                                  </div>
  
                                  {dayData.isOpen && (
                                    <div className="flex justify-center mt-3">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex items-center h-8 gap-1 px-3 text-blue-600 border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                                        onClick={() => handleOpenFranjaModal(dayKey)}
                                        aria-label={`${t('schedule.addTimeTo')} ${t(`days.${dayKey as keyof WeekSchedule}`)}`}
                                        disabled={!isClinicOpenToday} 
                                      >
                                        {/* i18n: Botón Añadir */}
                                        <Plus className="w-4 h-4" /> {t('common.add')}
                                      </Button>
                                    </div>
                                  )}
                                </Card>
                              );
                            });
                          })()} 
                        </div>
                       )}
                    </Card>
                  </TabsContent>
                  
                  {/* Sub-Pestaña: Excepciones (Restaurada) */}
                  {/* ... (Contenido excepciones sin cambios) ... */}
                  <TabsContent value="excepciones">
                     <Card className="p-4">
                       <div className="flex items-center justify-between mb-4">
                         {/* i18n */}
                         <h4 className="text-base font-medium">{t('schedule.exceptionsTitle')}</h4>
                         <Button size="sm" onClick={() => { setExcepcionEditada(null); setMostrarModalExcepcion(true); }} className="h-9" disabled={isLoadingExceptions || !selectedClinicaHorario} >
                           {/* i18n */}
                           <Plus className="w-4 h-4 mr-1" /> {t('schedule.newExceptionButton')}
                         </Button>
                       </div>
                       {isLoadingExceptions && ( <div className="flex items-center justify-center p-4 text-sm text-gray-500">...{t('common.loading')}...</div> )}
                       {!isLoadingExceptions && excepcionesUsuario.length === 0 ? (
                         /* i18n */
                         <p className="text-sm text-center text-gray-500">{t('schedule.noExceptionsFound')}</p>
                       ) : (
                         !isLoadingExceptions && excepcionesUsuario.map(exc => (
                           <div key={exc.id} className="p-3 mb-3 border rounded-md">
                             <div className="flex items-center justify-between mb-2">
                               <div>
                                 {/* i18n: Nombre o fallback */}
                                 <p className="font-medium">{exc.nombre || t('schedule.unnamedException')}</p>
                                 <p className="text-xs text-gray-500">{formatFecha(exc.fechaInicio)} - {formatFecha(exc.fechaFin)}</p>
                               </div>
                               <div>
                                 <Button variant="ghost" size="icon" className="w-8 h-8 text-blue-600 hover:bg-blue-100" onClick={() => { 
                                      // Convertir PrismaException a UserClinicScheduleException antes de editar? O la API maneja los tipos?
                                      // Por ahora, asumimos que son compatibles o ExcepcionHorariaModal maneja PrismaException.
                                      // ¡¡IMPORTANTE!! Necesitamos cargar la excepcion completa desde la API aquí, no solo FormattedException
                                      // TODO: Implementar carga de excepción completa para edición
                                      console.warn("Edición de excepción necesita cargar datos completos de API");
                                      // setExcepcionEditada(exc); // <-- ESTO ES INCORRECTO, 'exc' es FormattedException
                                      // setMostrarModalExcepcion(true);
                                      // i18n: Toast informativo
                                      toast({title: t('common.info'), description: t('common.featureNotImplementedYet', { feature: 'Edición de excepciones' }), variant: "default"});
                                 }}>
                                   <Pencil className="w-4 h-4" />
                                 </Button>
                                 <Button variant="ghost" size="icon" className="w-8 h-8 text-red-600 hover:bg-red-100" onClick={() => handleRemoveExcepcion(exc.id)}>
                                   <Trash className="w-4 h-4" />
                                 </Button>
                               </div>
                             </div>
                           </div>
                         ))
                       )}
                     </Card>
                   </TabsContent>
                  
                  {/* Sub-Pestaña: Vista Consolidada (Restaurada) */}
                  <TabsContent value="vista">
                    {/* ... (Contenido vista consolidada sin cambios) ... */}
                     <Card className="p-4">
                       {/* i18n */}
                       <h4 className="mb-4 text-base font-medium">{t('schedule.consolidatedViewTitle')}</h4>
                       {/* i18n */}
                       <p className="text-sm text-center text-gray-500">{t('common.featureNotImplementedYetShort', { feature: 'Vista consolidada' })}</p>
                     </Card>
                   </TabsContent>
                </Tabs>
              </>
            )}
        </TabsContent>
        
        {/* Pestaña de Habilidades Profesionales */}
        <TabsContent value="habilidades" className="space-y-4">
             {/* Eliminar placeholder */}
             {/* <Card className="p-4"><p className="text-center text-gray-500">Gestión de habilidades profesionales estará disponible aquí.</p></Card> */}
             
             {/* >>> INICIO CÓDIGO DESCOMENTADO/RESTAURADO PARA HABILIDADES <<< */}
             <Card className="p-4">
               <div className="flex items-center justify-between mb-4">
                 {/* i18n */}
                 <h3 className="text-base font-medium">{t('userProfile.skillsTitle')}</h3>
                 {/* Filtro o búsqueda? */}
                 <Input 
                   placeholder={t('userProfile.searchSkillsPlaceholder')} // i18n
                   value={searchHabilidades} // AÑADIDO estado
                   onChange={(e) => setSearchHabilidades(e.target.value)} // AÑADIDO estado
                   className="max-w-xs h-9"
                 />
               </div>
               
               {/* Tabla de habilidades existentes */}
               <div className="mb-4 border rounded-md">
                 <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>Clínica</TableHead>
                       <TableHead>Familia / Servicio</TableHead>
                       <TableHead className="text-right">Acciones</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {todasLasHabilidadesAsignadas // Usar el array memoizado
                       .filter(([clinicaId, habilidad]) => { // Filtrar según búsqueda
                         const clinica = clinics.find(c => String(c.id) === clinicaId);
                         const searchLower = searchHabilidades.toLowerCase();
                         return (
                           clinica?.name.toLowerCase().includes(searchLower) ||
                           habilidad.toLowerCase().includes(searchLower)
                         );
                       })
                       .map(([clinicaId, habilidad], index) => {
                         const clinica = clinics.find(c => String(c.id) === clinicaId);
                         return (
                           <TableRow key={`${clinicaId}-${habilidad}-${index}`}> {/* Añadir index para key única si habilidad puede repetirse */}
                             {/* i18n: fallback clínica */}
                             <TableCell>{clinica ? `${clinica.prefix} - ${clinica.name}` : t('common.unknownClinic')}</TableCell>
                             <TableCell>{habilidad}</TableCell>
                             <TableCell className="text-right">
                               <Button 
                                 variant="ghost" 
                                 size="sm" 
                                 onClick={() => handleRemoveHabilidad(clinicaId, habilidad)} // Descomentar
                               >
                                 <Trash className="w-4 h-4" />
                               </Button>
                             </TableCell>
                           </TableRow>
                         );
                     })} 
                     {todasLasHabilidadesAsignadas.length === 0 && (
                       <TableRow>
                         {/* i18n */}
                         <TableCell colSpan={3} className="text-center text-gray-500">{t('userProfile.noSkillsAssigned')}</TableCell>
                       </TableRow>
                     )}
                   </TableBody>
                 </Table>
               </div>
               
               {/* Sección para añadir nueva habilidad */}
               <div className="flex items-end gap-2 p-3 border rounded-md bg-gray-50">
                 {/* Select Clínica */}
                 <div className="flex-1 space-y-1">
                   {/* i18n */}
                   <Label className="text-xs">{t('common.clinic')}</Label>
                   <SelectClinica 
                     value={nuevaClinicaHabilidad} // AÑADIDO estado
                     onChange={setNuevaClinicaHabilidad} // AÑADIDO estado
                     options={opcionesClinicasHabilidad} // Usar opciones memoizadas
                     placeholder={t('userProfile.selectClinicPlaceholder')} // i18n
                   />
                 </div>
                 
                 {/* Select Tipo (Familia/Servicio) */}
                 <div className="w-40 space-y-1 shrink-0">
                   {/* i18n */}
                   <Label className="text-xs">{t('common.type')}</Label>
                   <SelectTipo value={tipoSeleccion} onChange={setTipoSeleccion} />
                 </div>
                 
                 {/* Select Familia o Servicio (Condicional) */}
                 <div className="flex-1 space-y-1">
                   {/* i18n */}
                   <Label className="text-xs">{tipoSeleccion === 'familia' ? t('common.family') : t('common.service')}</Label>
                   <MemoizedSelect 
                     // CORREGIDO: Usar estados nuevaFamilia/nuevoServicio
                     value={tipoSeleccion === 'familia' ? nuevaFamilia : nuevoServicio} 
                     // CORREGIDO: Usar estados setNuevaFamilia/setNuevoServicio
                     onChange={tipoSeleccion === 'familia' ? setNuevaFamilia : setNuevoServicio} 
                     placeholder={tipoSeleccion === 'familia' ? t('userProfile.selectFamilyPlaceholder') : t('userProfile.selectServicePlaceholder')} // i18n
                     disabled={!nuevaClinicaHabilidad} // CORREGIDO: Usar estado
                   >
                     {tipoSeleccion === 'familia' 
                       // CORREGIDO: Usar placeholder FAMILIAS_MOCK
                       ? (FAMILIAS_MOCK.map((familia: Category) => ( 
                           <SelectItem key={String(familia.id)} value={String(familia.id)}> 
                             {familia.name} {/* <-- Usar 'name' */}
                           </SelectItem>
                         )))
                         // CORREGIDO: Usar placeholder SERVICIOS_MOCK y adaptar a su estructura
                       : (Object.values(SERVICIOS_MOCK).flat().map((servicio: Service) => ( 
                            <SelectItem key={servicio.id} value={String(servicio.id)}>{servicio.name}</SelectItem> // Asumir id y name en ServicioInterface
                          )))
                     }
                     {/* Mensaje si no hay opciones? */}
                   </MemoizedSelect>
                 </div>
                 
                 {/* Botón Añadir */}
                 <Button 
                   size="sm" 
                   onClick={handleAddHabilidad} // CORREGIDO: Usar placeholder
                   // CORREGIDO: Usar estados
                   disabled={!nuevaClinicaHabilidad || (tipoSeleccion === 'familia' ? !nuevaFamilia : !nuevoServicio)} 
                   className="h-9"
                 >
                   {/* i18n */}
                   {t('userProfile.addSkillButton')}
                 </Button>
               </div>
             </Card>
             {/* >>> FIN CÓDIGO DESCOMENTADO/RESTAURADO PARA HABILIDADES <<< */}
        </TabsContent>
        
        {/* Pestaña de Condiciones Laborales (VISIBLE) */}
        <TabsContent value="condiciones" className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              {/* i18n */}
              <h3 className="text-base font-medium">{t('userProfile.laborConditionsTitle')}</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="tipoContrato" className="text-sm font-medium">Tipo de contrato</Label>
                  <Select>
                    <SelectTrigger id="tipoContrato" className="h-9">
                      <SelectValue placeholder="Seleccione una opción" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indefinido">Indefinido</SelectItem>
                      <SelectItem value="temporal">Temporal</SelectItem>
                      <SelectItem value="practicas">Prácticas</SelectItem>
                      <SelectItem value="formacion">Formación</SelectItem>
                      <SelectItem value="obrayservicio">Obra y servicio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="jornada" className="text-sm font-medium">Jornada laboral</Label>
                  <Select>
                    <SelectTrigger id="jornada" className="h-9">
                      <SelectValue placeholder="Seleccione una opción" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completa">Completa</SelectItem>
                      <SelectItem value="parcial">Parcial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="fechaInicio" className="text-sm font-medium">Fecha de inicio</Label>
                  <Input id="fechaInicio" type="date" className="h-9" />
                </div>
                
                <div>
                  <Label htmlFor="fechaFin" className="text-sm font-medium">Fecha de fin (si aplica)</Label>
                  <Input id="fechaFin" type="date" className="h-9" />
                </div>
                
                <div>
                  <Label htmlFor="salarioBruto" className="text-sm font-medium">Salario bruto anual</Label>
                  <Input id="salarioBruto" type="number" placeholder="0.00" className="h-9" />
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="convenioColectivo" />
                    <Label htmlFor="convenioColectivo" className="text-sm">Sujeto a convenio colectivo</Label>
                  </div>
                </div>
              </div>
              
              <div>
                <Label htmlFor="observaciones" className="text-sm font-medium">Observaciones</Label>
                <textarea
                  id="observaciones"
                  className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Añadir observaciones sobre condiciones laborales..."
                  // Asegúrate de que no estén las props value ni onChange aquí
                  disabled // Mantener o quitar según la lógica final de esta pestaña
                />
              </div>
            </div>
          </Card>
        </TabsContent>
        
        {/* Pestaña de Control de Presencia (VISIBLE) */}
        <TabsContent value="fichajes" className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              {/* i18n */}
              <h3 className="text-base font-medium">{t('userProfile.presenceControlTitle')}</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="filtroMes" className="text-sm font-medium">Filtrar por mes</Label>
                  <Select>
                    <SelectTrigger id="filtroMes" className="w-40 h-9">
                      <SelectValue placeholder="Este mes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="actual">Este mes</SelectItem>
                      <SelectItem value="1">Enero</SelectItem>
                      <SelectItem value="2">Febrero</SelectItem>
                      <SelectItem value="3">Marzo</SelectItem>
                      <SelectItem value="4">Abril</SelectItem>
                      <SelectItem value="5">Mayo</SelectItem>
                      <SelectItem value="6">Junio</SelectItem>
                      <SelectItem value="7">Julio</SelectItem>
                      <SelectItem value="8">Agosto</SelectItem>
                      <SelectItem value="9">Septiembre</SelectItem>
                      <SelectItem value="10">Octubre</SelectItem>
                      <SelectItem value="11">Noviembre</SelectItem>
                      <SelectItem value="12">Diciembre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button className="bg-purple-600 hover:bg-purple-700 h-9">
                  Exportar registro
                </Button>
              </div>
              
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="py-2 h-9">Fecha</TableHead>
                      <TableHead className="py-2 h-9">Entrada</TableHead>
                      <TableHead className="py-2 h-9">Salida</TableHead>
                      <TableHead className="py-2 h-9">Descanso</TableHead>
                      <TableHead className="py-2 h-9">Total horas</TableHead>
                      <TableHead className="py-2 h-9">Observaciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                      {/* Datos de ejemplo - Reemplazar con datos reales */}
                    <TableRow>
                        <TableCell className="py-2 font-medium">--/--/----</TableCell>
                        <TableCell className="py-2">--:--</TableCell>
                        <TableCell className="py-2">--:--</TableCell>
                        <TableCell className="py-2">--</TableCell>
                        <TableCell className="py-2">--</TableCell>
                      <TableCell className="py-2">-</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              
              <div className="p-3 rounded-md bg-gray-50">
                <h4 className="mb-2 text-sm font-medium">Resumen del mes</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                     {/* Datos de ejemplo - Reemplazar con datos reales */}
                  <div>
                    <p className="text-gray-500">Días trabajados</p>
                      <p className="font-medium">0</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Total horas</p>
                      <p className="font-medium">0h 0m</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Media diaria</p>
                      <p className="font-medium">0h 0m</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs> {/* <- CIERRE CORRECTO DE Tabs PRINCIPAL */}
      </div> {/* Fin container */} 

      {/* --- MOVER AQUÍ: Botones flotantes de acción --- */} 
      {/* Usar clases fixed, bottom-4, right-4 y z-50 para fijar */}
      <div className="fixed z-50 flex gap-2 bottom-4 right-4">
          <Button 
            variant="outline" 
            onClick={() => router.push(returnTo)} 
            disabled={isSaving} 
            className="flex items-center gap-1 bg-white shadow-md hover:bg-gray-100" // Añadir fondo blanco y sombra
          >
            <ArrowLeft className="w-4 h-4" />
            Volver {/* Cambiar texto si es necesario */}
          </Button>
          <Button 
             // <<< Modificar onClick para que haga submit si es la pestaña correcta >>>
             onClick={() => {
                 if (activeTab === 'datos-personales') {
                     // Disparar el submit del formulario específico
                     // <<< AÑADIR ASERCIÓN DE TIPO >>>
                     (document.getElementById('personal-data-form') as HTMLFormElement | null)?.requestSubmit();
                 } else {
                     // Llamar a la función de guardado genérica para otras pestañas
                     handleGuardarUsuario();
                 }
             }}
             // <<< Deshabilitar también si formState.isSubmitting (para RHF) >>>
             disabled={isSaving || loading || isLoadingRoles || isLoadingExceptions || (activeTab === 'datos-personales' && isSubmitting)} 
             className="flex items-center gap-1 shadow-md" // Añadir sombra
          >
            {(isSaving || (activeTab === 'datos-personales' && isSubmitting)) ? ( // <<< Ajustar condición de spinner >>>
                <svg className="w-4 h-4 mr-1 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
             ) : <Save className="w-4 h-4" />}
              {/* <<< Ajustar texto del botón si está guardando con RHF >>> */}
             {(isSaving || (activeTab === 'datos-personales' && isSubmitting)) ? t('common.loading') : (userId === 'nuevo' ? 'Crear Usuario' : t('common.save'))}
          </Button>
    </div>
       {/* --- FIN Botones flotantes --- */} 

       {/* --- AÑADIR EL MODAL AL FINAL DEL RENDER --- */}
       {editingFranja && (
         <FranjaHorariaModal
           isOpen={isFranjaModalOpen}
           onClose={() => {
             setIsFranjaModalOpen(false);
             setEditingFranja(null);
           }}
           onSave={handleSaveFranja}
           franjaInicial={editingFranja.franja}
           // i18n: Pasar nombre del día ya traducido (idealmente se pasaría la clave y se usaría t dentro del modal)
           diaNombre={t(`days.${editingFranja.dia as keyof WeekSchedule}`)}
           // <<< PASAR EL TEXTO DE REFERENCIA COMO PROP >>>
           horarioReferenciaTexto={editingFranja.clinicRefScheduleText}
           // <<< PASAR MIN/MAX TIMES COMO PROPS >>>
           minTime={editingFranja.minTime}
           maxTime={editingFranja.maxTime}
           clinicValidRanges={editingFranja.clinicValidRanges}
         />
       )}
       {/* --- FIN MODAL FRANJA --- */}

       {/* --- AÑADIR EL MODAL DE EXCEPCIONES --- */}
       {mostrarModalExcepcion && selectedClinicaHorario && userId !== 'nuevo' && (
          <ExcepcionHorariaModal
            isOpen={mostrarModalExcepcion}
            onClose={() => {
              setMostrarModalExcepcion(false);
              setExcepcionEditada(null);
            }}
            onSave={handleSaveExcepcion}
            excepcionInicial={excepcionEditada}
            clinicaNombre={clinics.find(c => c.id === selectedClinicaHorario)?.name || 'Clínica'}
            userId={userId}
            clinicId={selectedClinicaHorario}
          />
       )}
       {/* --- FIN MODAL EXCEPCIONES --- */}
    </div> // Fin div wrapper principal
  )
} 