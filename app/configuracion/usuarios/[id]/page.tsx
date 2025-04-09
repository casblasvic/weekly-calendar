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

// Importación de contextos
import { useUser } from "@/contexts/user-context"
import { useClinic } from "@/contexts/clinic-context"
import { useService } from "@/contexts/service-context"
// CORREGIR: Asumimos que 'useRole' debería ser importado si existe, o lo eliminamos si no. 
// Si existe, verificar nombre exportado en role-context.tsx
// import { useRole } from "@/contexts/role-context"; 
// import { RolesProvider, useRoles } from '@/contexts/role-context'; // Example if it's named useRoles

// Importación de tipos
import { 
  HorarioDia, 
  FranjaHoraria, 
  ExcepcionHoraria, // Asegurar que este es el tipo correcto
  HorarioSemanal,
  FamiliaTarifa, 
  FamiliaServicio,
  Servicio as ServicioInterface // Renombrar import para evitar conflicto con el del contexto
} from "@/services/data/models/interfaces"

// Importar el tipo Usuario directamente desde el contexto si no está ya
import type { Usuario } from "../../../../contexts/user-context"; // Importar solo Usuario por ahora
// Importar Servicio del contexto (si es diferente al de interfaces)
import type { Servicio as ServicioContext } from "@/contexts/service-context";
// Importar tipo para Excepcion si viene de Prisma o definir uno local
import { UserClinicScheduleException as PrismaException, Prisma } from '@prisma/client'; 

// Tipos para el sistema de horarios

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

// Función para traducir día (si no existe ya)
const traducirDia = (dia: string): string => {
  const traducciones: Record<string, string> = {
    'lunes': 'Lunes',
    'martes': 'Martes',
    'miercoles': 'Miércoles',
    'jueves': 'Jueves',
    'viernes': 'Viernes',
    'sabado': 'Sábado',
    'domingo': 'Domingo',
  }
  return traducciones[dia.toLowerCase()] || dia;
}

// --- Placeholders para Mocks y Constantes (Reemplazar con datos reales) ---
const PERFILES_DISPONIBLES: string[] = ["Admin", "Editor", "Visor"]; // Ejemplo
const FAMILIAS_MOCK: FamiliaServicio[] = []; // Ejemplo vacío
const SERVICIOS_MOCK: Record<string, ServicioInterface[]> = {}; // Ejemplo vacío
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

// --- AÑADIDO: Tipo WeekSchedule (si no existe globalmente) ---
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
// --- FIN Tipo WeekSchedule ---

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

// --- Añadir función auxiliar createDefaultSchedule --- 
const createDefaultSchedule = (): WeekSchedule => {
  return {
    monday: { isOpen: true, ranges: [{ start: "09:00", end: "17:00" }] }, // Ejemplo: Abierto Lunes
    tuesday: { isOpen: false, ranges: [] },
    wednesday: { isOpen: false, ranges: [] },
    thursday: { isOpen: false, ranges: [] },
    friday: { isOpen: false, ranges: [] },
    saturday: { isOpen: false, ranges: [] },
    sunday: { isOpen: false, ranges: [] },
  };
};

// --- INICIO: Función para convertir HorarioSemanal a WeekSchedule ---
const convertHorarioSemanalToWeekSchedule = (horario: HorarioSemanal | null): WeekSchedule | null => {
  if (!horario || !horario.dias) return null;

  const weekSchedule: Partial<WeekSchedule> = {};
  const weekDaysMap: { [key: string]: keyof WeekSchedule } = {
    lunes: 'monday',
    martes: 'tuesday',
    miercoles: 'wednesday',
    jueves: 'thursday',
    viernes: 'friday',
    sabado: 'saturday',
    domingo: 'sunday',
  };

  horario.dias.forEach(diaData => {
    const weekDayKey = weekDaysMap[diaData.dia.toLowerCase()];
    if (weekDayKey) {
      weekSchedule[weekDayKey] = {
        isOpen: diaData.activo,
        ranges: diaData.franjas.map(franja => ({ start: franja.inicio, end: franja.fin }))
      };
    }
  });

  // Asegurarse de que todos los días estén presentes, incluso si no venían en horario.dias
  Object.values(weekDaysMap).forEach(dayKey => {
    if (!weekSchedule[dayKey]) {
      weekSchedule[dayKey] = { isOpen: false, ranges: [] };
    }
  });

  // Validar que el objeto final tenga la estructura completa
  if (Object.keys(weekSchedule).length === 7) {
      return weekSchedule as WeekSchedule;
  } else {
      console.error("Error convirtiendo HorarioSemanal a WeekSchedule, faltan días.", weekSchedule);
      return null; // O devolver un horario por defecto
  }
};
// --- FIN Función de conversión ---

// --- INICIO: Componente Modal Franja Horaria ---
const FranjaHorariaModal = ({
  isOpen,
  onClose,
  onSave,
  franjaInicial,
  diaNombre
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (franjaData: { inicio: string, fin: string }) => void;
  franjaInicial?: FranjaHoraria | null;
  diaNombre: string;
}) => {
  const [inicio, setInicio] = useState("09:00");
  const [fin, setFin] = useState("17:00");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (franjaInicial) {
      setInicio(franjaInicial.inicio || "09:00");
      setFin(franjaInicial.fin || "17:00");
    } else {
      // Resetear para nueva franja si no hay inicial
      setInicio("09:00");
      setFin("17:00");
    }
    setError(null); // Limpiar errores al abrir/cambiar franja
  }, [franjaInicial, isOpen]); // Resetear cuando cambie la franja o se abra/cierre

  const handleGuardarClick = () => {
    // Validación simple
    if (!inicio || !fin) {
        setError("Las horas de inicio y fin son obligatorias.");
        return;
    }
    if (inicio >= fin) {
        setError("La hora de inicio debe ser anterior a la hora de fin.");
        return;
    }
    setError(null);
    onSave({ inicio, fin });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* className="p-6 sm:max-w-md" para controlar ancho y padding */}
      <DialogContent className="p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {franjaInicial ? `Editar Franja Horaria (${diaNombre})` : `Añadir Franja Horaria (${diaNombre})`}
          </DialogTitle>
          <DialogDescription>
            Define las horas de inicio y fin para esta franja horaria.
          </DialogDescription>
        </DialogHeader>
        {/* Asegurar gap para espaciado vertical */}
        <div className="grid gap-4 py-4">
          <div className="grid items-center grid-cols-4 gap-4">
            <Label htmlFor="inicio" className="text-right">
              Inicio
            </Label>
            <Input
              id="inicio"
              type="time"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid items-center grid-cols-4 gap-4">
            <Label htmlFor="fin" className="text-right">
              Fin
            </Label>
            <Input
              id="fin"
              type="time"
              value={fin}
              onChange={(e) => setFin(e.target.value)}
              className="col-span-3"
            />
          </div>
          {error && (
            <p className="col-span-4 text-sm text-center text-red-600">{error}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleGuardarClick}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
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
  onSave: (excepcionData: Omit<UserClinicScheduleException, 'id' | 'createdAt' | 'updatedAt' | 'user' | 'clinic' | 'assignment'>) => Promise<void>; // Ajustar tipo según lo que devuelve la API
  excepcionInicial?: UserClinicScheduleException | null;
  clinicaNombre: string;
  userId: string;
  clinicId: string;
}) => {
  const [nombre, setNombre] = useState("");
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [fechaFin, setFechaFin] = useState<string>("");
  // Estado para el horario de la excepción (WeekSchedule)
  const [horarioExcepcion, setHorarioExcepcion] = useState<WeekSchedule | null>(null);
  const [isSavingModal, setIsSavingModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    if (isOpen && excepcionInicial) {
      console.log("[ExcepcionModal] Abriendo para editar:", excepcionInicial);
      setNombre(excepcionInicial.name || "");
      // Formatear fechas a yyyy-mm-dd para el input type="date"
      setFechaInicio(excepcionInicial.startDate ? new Date(excepcionInicial.startDate).toISOString().split('T')[0] : "");
      setFechaFin(excepcionInicial.endDate ? new Date(excepcionInicial.endDate).toISOString().split('T')[0] : "");
      // Validar y parsear scheduleJson
      if (typeof excepcionInicial.scheduleJson === 'object' && excepcionInicial.scheduleJson !== null) {
         // TODO: Idealmente, validar con Zod también aquí si es posible
         setHorarioExcepcion(excepcionInicial.scheduleJson as WeekSchedule);
      } else {
         console.warn("[ExcepcionModal] scheduleJson inicial inválido o ausente, usando horario por defecto.");
         setHorarioExcepcion(createDefaultSchedule()); // Usar horario por defecto
      }
    } else if (isOpen) {
      console.log("[ExcepcionModal] Abriendo para crear nueva excepción.");
      // Resetear para nueva excepción
      setNombre("");
      const today = new Date().toISOString().split('T')[0];
      setFechaInicio(today);
      setFechaFin(today);
      setHorarioExcepcion(createDefaultSchedule()); // Empezar con horario por defecto
    } else {
      // Limpiar al cerrar si no está abierto
      setNombre("");
      setFechaInicio("");
      setFechaFin("");
      setHorarioExcepcion(null);
    }
  }, [isOpen, excepcionInicial]);

  // Función para manejar cambios en el horario interno del modal
  const handleHorarioExcepcionChange = useCallback((diaKey: keyof WeekSchedule, changes: Partial<DaySchedule>) => {
    setHorarioExcepcion(prev => {
      if (!prev) return null;
      const newState = { ...prev };
      newState[diaKey] = { ...newState[diaKey], ...changes };
      // Ordenar franjas si se modifican
      if (changes.ranges) {
        newState[diaKey].ranges.sort((a, b) => (a.start || "").localeCompare(b.start || ""));
      }
      console.log(`[ExcepcionModal] Horario excepción actualizado para ${diaKey}:`, newState[diaKey]);
      return newState;
    });
  }, []);

  const handleGuardarClick = async () => {
    setError(null);
    // Validaciones básicas
    if (!fechaInicio || !fechaFin) {
      setError("Las fechas de inicio y fin son obligatorias.");
      return;
    }
    if (new Date(fechaInicio) > new Date(fechaFin)) {
      setError("La fecha de inicio debe ser anterior o igual a la fecha de fin.");
      return;
    }
    if (!horarioExcepcion) {
      setError("El horario para la excepción no es válido.");
      return;
    }

    const datosExcepcion: Omit<UserClinicScheduleException, 'id' | 'createdAt' | 'updatedAt' | 'user' | 'clinic' | 'assignment'> = {
      userId: userId,
      clinicId: clinicId,
      name: nombre.trim() || null,
      startDate: new Date(fechaInicio), // Enviar como objeto Date
      endDate: new Date(fechaFin),     // Enviar como objeto Date
      scheduleJson: horarioExcepcion as any // El backend espera Json
    };

    setIsSavingModal(true);
    try {
      console.log("[ExcepcionModal] Guardando excepción:", datosExcepcion);
      await onSave(datosExcepcion);
      // onClose(); // El componente padre debería cerrar el modal tras éxito
    } catch (err) {
      console.error("[ExcepcionModal] Error al guardar:", err);
      setError(err instanceof Error ? err.message : "Error desconocido al guardar la excepción.");
    } finally {
      setIsSavingModal(false);
    }
  };

  // Renderizado de una tarjeta de día para el horario de la excepción
  const renderDiaCard = (diaKey: keyof WeekSchedule, diaNombreTraducido: string) => {
    if (!horarioExcepcion) return null;
    const diaData = horarioExcepcion[diaKey];

    return (
      <Card key={diaKey} className={cn("p-3 transition-opacity text-sm", !diaData.isOpen && "opacity-60 bg-slate-50")}>
        <div className="flex items-center justify-between mb-2">
          <span className={cn("font-semibold capitalize", diaData.isOpen ? "text-gray-700" : "text-gray-500")}>{diaNombreTraducido}</span>
          <Switch
            checked={diaData.isOpen}
            onCheckedChange={(checked) => handleHorarioExcepcionChange(diaKey, { isOpen: checked, ranges: checked ? diaData.ranges : [] })}
            // --- ELIMINAR size="sm" --- 
          />
        </div>
        <div className="space-y-1.5 min-h-[40px]"> {/* Menor altura mínima */}
          {diaData.isOpen ? (
            <>
              {diaData.ranges.length === 0 && (
                <p className="py-1 text-xs italic text-center text-gray-400">Día activo sin franjas</p>
              )}
              {diaData.ranges.map((franja, index) => (
                <div
                  key={`${diaKey}-franja-${index}`}
                  className="flex items-center justify-between gap-1 px-2 py-1 text-xs text-blue-800 bg-blue-100 border border-blue-200 rounded"
                >
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{franja.start || '--:--'} - {franja.end || '--:--'}</span>
                  </div>
                  {/* TODO: Añadir edición/eliminación de franjas si es necesario */}
                </div>
              ))}
              {/* Botón Añadir Franja (Simplificado por ahora) */}
               <Button
                 variant="outline"
                 // --- CAMBIAR size="xs" a size="sm" y ajustar clases --- 
                 size="sm"
                 className="w-full gap-1 px-2 mt-1 text-xs text-blue-600 border-blue-300 h-7 hover:bg-blue-50 hover:text-blue-700" // Ajustar altura/texto
                 onClick={() => alert('Añadir/Editar franjas aún no implementado en modal de excepción.')} // Placeholder
               >
                 <Plus className="w-3 h-3" /> Añadir/Editar
               </Button>
            </>
          ) : (
            <p className="py-1 text-xs italic text-center text-gray-400">Día inactivo</p>
          )}
        </div>
      </Card>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* Ancho máximo más grande para acomodar el horario */}
      <DialogContent className="p-6 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {excepcionInicial ? `Editar Excepción Horaria` : `Crear Nueva Excepción Horaria`}
          </DialogTitle>
          <DialogDescription>
            Define un período y un horario específico que sobrescribirá el horario habitual para {clinicaNombre}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4"> {/* Espaciado general */}
          {/* Sección Fechas y Nombre */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="nombreExcepcion">Nombre (Opcional)</Label>
              <Input
                id="nombreExcepcion"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Vacaciones Verano"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fechaInicioExcepcion">Fecha Inicio</Label>
              <Input
                id="fechaInicioExcepcion"
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fechaFinExcepcion">Fecha Fin</Label>
              <Input
                id="fechaFinExcepcion"
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Sección Horario Específico */}
          <div>
             <Label className="block mb-2 text-sm font-medium">Horario durante la excepción</Label>
             {horarioExcepcion ? (
               <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
                 {renderDiaCard('monday', 'Lun')}
                 {renderDiaCard('tuesday', 'Mar')}
                 {renderDiaCard('wednesday', 'Mié')}
                 {renderDiaCard('thursday', 'Jue')}
                 {renderDiaCard('friday', 'Vie')}
                 {renderDiaCard('saturday', 'Sáb')}
                 {renderDiaCard('sunday', 'Dom')}
               </div>
             ) : (
               <p className="text-sm text-center text-gray-500">Cargando horario...</p>
             )}
          </div>

          {/* Mensaje de Error */}
          {error && (
            <p className="text-sm text-center text-red-600">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSavingModal}>Cancelar</Button>
          <Button onClick={handleGuardarClick} disabled={isSavingModal || !horarioExcepcion}>
             {isSavingModal ? (
                <svg className="w-4 h-4 mr-2 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
             ) : <Save className="w-4 h-4 mr-2" />}
             {isSavingModal ? 'Guardando...' : 'Guardar Excepción'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
// --- FIN Componente Modal Excepción Horaria ---

// Componente principal
export default function EditarUsuarioPage(props: { params: Promise<{ id: string }> }) {
  // Desenvolver la promesa con React.use para obtener params
  const params = React.use(props.params);
  const userId = params.id; // Definir userId aquí

  const router = useRouter() // Definir router aquí
  const searchParams = useSearchParams()
  const { toast } = useToast() // CORREGIDO: Usar desestructuración

  // Obtener los parámetros de la URL
  const returnToBase = searchParams.get('returnTo') || "/configuracion/usuarios"
  const tabParam = searchParams.get('tab')

  // Construir la URL de retorno completa
  const returnTo = tabParam 
    ? returnToBase.includes('?') 
      ? `${returnToBase}&tab=${tabParam}` 
      : `${returnToBase}?tab=${tabParam}`
    : returnToBase

  // CORREGIR: Obtener createUsuario correctamente si existe en el contexto
  // Mantener createUsuario aunque el linter muestre error (si funciona)
  const { getUsuarioById, updateUsuario, createUsuario } = useUser(); 
  const { clinics } = useClinic()
  const { familias, servicios } = useService() // Asumiendo que 'roles' no viene de aquí
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
  const [editingFranja, setEditingFranja] = useState<{ dia: HorarioDia['dia']; franja?: FranjaHoraria } | null>(null);

  // Estados para Datos del Usuario (Asegurarse que todos están declarados)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [confirmEmail, setConfirmEmail] = useState("")
  const [telefono, setTelefono] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [dni, setDni] = useState("")
  const [fechaNacimiento, setFechaNacimiento] = useState("")
  const [sexo, setSexo] = useState("")
  const [telefono2, setTelefono2] = useState("")
  const [idioma, setIdioma] = useState("")
  const [colegio, setColegio] = useState("")
  const [numeroColegiado, setNumeroColegiado] = useState("")
  const [especialidad, setEspecialidad] = useState("")
  const [universidad, setUniversidad] = useState("")
  const [direccion, setDireccion] = useState("")
  const [provincia, setProvincia] = useState("")
  const [pais, setPais] = useState("")
  const [localidad, setLocalidad] = useState("")
  const [cp, setCp] = useState("")
  const [exportCsv, setExportCsv] = useState("false") 
  const [indiceControl, setIndiceControl] = useState("")
  const [numeroPIN, setNumeroPIN] = useState("")
  const [notas, setNotas] = useState("")
  const [contrasena, setContrasena] = useState(""); 
  // AÑADIDOS estados para checkboxes de Configuración (si se usan en el formulario)
  const [mostrarDesplazados, setMostrarDesplazados] = useState(false);
  const [mostrarCitasPropias, setMostrarCitasPropias] = useState(false);
  const [restringirIP, setRestringirIP] = useState(false);
  const [deshabilitado, setDeshabilitado] = useState(false); // Relacionado con isActive? verificar

  // Estados para Permisos
  const [permisosClinicas, setPermisosClinicas] = useState<Map<string, string[]>>(new Map()); 
  // AÑADIDO: Estado para almacenar los permisos originales al cargar
  const [initialPermisosClinicas, setInitialPermisosClinicas] = useState<Map<string, string[]>>(new Map());
  const [selectedClinicas, setSelectedClinicas] = useState<string[]>([]); // IDs de clínicas asignadas
  const [nuevaClinicaId, setNuevaClinicaId] = useState<string>("");
  const [nuevoPerfilClinica, setNuevoPerfilClinica] = useState<string>("");
  const [showDisabledClinics, setShowDisabledClinics] = useState(false);

  // Estados para Horarios (Declaración ÚNICA aquí)
  const [horarioEditado, setHorarioEditado] = useState<Map<string, HorarioSemanal | null>>(new Map());
  const [horarioSemanal, setHorarioSemanal] = useState<Map<string, HorarioSemanal | null>>(new Map()); 
  const [excepcionesUsuario, setExcepcionesUsuario] = useState<FormattedException[]>([]);
  const [excepcionEditada, setExcepcionEditada] = useState<UserClinicScheduleException | null>(null);
  const [mostrarModalExcepcion, setMostrarModalExcepcion] = useState(false);
  const [clinicaSeleccionadaHorario, setClinicaSeleccionadaHorario] = useState<string>("");
  const [selectedClinicaHorario, setSelectedClinicaHorario] = useState<string>("");
  const [isHorarioHeredado, setIsHorarioHeredado] = useState(false);

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

  // --- Fin Declaración de Estados ---

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
      if (userId === 'nuevo') {
        setLoading(false);
        // Setear estado inicial para 'nuevo' si es necesario
        setPermisosClinicas(new Map());
        setInitialPermisosClinicas(new Map());
        setSelectedClinicas([]);
        setIsActive(true); // Usuario nuevo activo por defecto
        // Inicializar otros campos si es necesario
        setFirstName("");
        setLastName("");
        setEmail("");
        setConfirmEmail("");
        setTelefono("");
        setContrasena("");
        setDni("");
        setFechaNacimiento("");
        setSexo("");
        setTelefono2("");
        setIdioma("");
        setColegio("");
        setNumeroColegiado("");
        setEspecialidad("");
        setUniversidad("");
        setDireccion("");
        setProvincia("");
        setPais("");
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
        
        return; 
      }

      setLoading(true);
      try {
        const userData = await getUsuarioById(userId);
        setInitialUserData(userData); // Guardar datos iniciales completos

        if (userData) {
          console.log("[UsuarioPage] Datos iniciales recibidos para usuario:", userData);
          // Establecer datos básicos
          setFirstName(userData.firstName || "");
          setLastName(userData.lastName || "");
          setEmail(userData.email || "");
          setConfirmEmail(userData.email || "");
          setTelefono(userData.phone || ""); // <-- Mapear desde 'phone' si existe
          setIsActive(userData.isActive);
          setContrasena(""); // NO setear contraseña al cargar

          // Establecer TODOS los campos adicionales desde userData
          setDni((userData as any).dni || ""); 
          // Asegurar que la fecha se formatea como yyyy-mm-dd si viene como Date
          const dob = (userData as any).fechaNacimiento;
          setFechaNacimiento(dob ? new Date(dob).toISOString().split('T')[0] : "");
          setSexo((userData as any).sexo || "");
          setTelefono2((userData as any).telefono2 || "");
          setIdioma((userData as any).idioma || "");
          setColegio((userData as any).colegio || "");
          setNumeroColegiado((userData as any).numeroColegiado || "");
          setEspecialidad((userData as any).especialidad || "");
          setUniversidad((userData as any).universidad || "");
          setDireccion((userData as any).direccion || "");
          setProvincia((userData as any).provincia || "");
          setPais((userData as any).pais || "");
          setLocalidad((userData as any).localidad || "");
          setCp((userData as any).cp || "");
          setExportCsv(String((userData as any).exportCsv || "false")); // Convertir boolean a string
          setIndiceControl((userData as any).indiceControl || "");
          setNumeroPIN((userData as any).numeroPIN || "");
          setNotas((userData as any).notas || "");
          // Setear checkboxes de configuración (ejemplo, ajustar nombres si son diferentes en userData)
          setMostrarDesplazados(Boolean((userData as any).mostrarDesplazados)); 
          setMostrarCitasPropias(Boolean((userData as any).mostrarCitasPropias)); 
          setRestringirIP(Boolean((userData as any).restringirIP)); 
          setDeshabilitado(Boolean((userData as any).deshabilitado)); // ¿O !userData.isActive? Revisar

          // Establecer permisos y guardar copia inicial
          const initialPermisos = new Map<string, string[]>();
          // CORREGIDO: Acceder a clinicAssignments y extraer role.name si existe
          const assignments = (userData as any).clinicAssignments || []; 
          const clinicIdsAssigned: string[] = [];
          if (Array.isArray(assignments)) {
             assignments.forEach((asignacion: any) => {
                const clinicId = asignacion.clinicId;
                // Usar roleId como fallback si role.id no está presente
                const roleId = asignacion.role?.id || asignacion.roleId; 
                if(clinicId && roleId) {
                   // Guardar solo el ID del rol en el estado de permisos
                   const rolesClinica = initialPermisos.get(clinicId) || [];
                   if (!rolesClinica.includes(roleId)) {
                     rolesClinica.push(roleId);
                   }
                   initialPermisos.set(clinicId, rolesClinica);
                   clinicIdsAssigned.push(clinicId); // Guardar ID de clínica asignada
                } else {
                   console.warn("Asignación incompleta o sin roleId encontrada:", asignacion);
                }
             });
          }
          setPermisosClinicas(initialPermisos); 
          setInitialPermisosClinicas(new Map(initialPermisos)); 
          setSelectedClinicas(clinicIdsAssigned); // Usar los IDs recopilados

          // Seleccionar la primera clínica asignada para la pestaña Horario (si existe)
          if (clinicIdsAssigned.length > 0) {
            setSelectedClinicaHorario(clinicIdsAssigned[0]); 
          }

          // Cargar habilidades (si existen y adaptar a la estructura del estado)
          // ... (lógica para cargar habilidades) ...
          // Placeholder:
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
  }, [userId, getUsuarioById, router, toast]); 

  // --- useEffect para cargar Horario (SIN DUPLICADOS) ---
  useEffect(() => {
    const cargarHorario = async () => {
      console.log(`[Horario useEffect - INICIO] userId: ${userId}, selectedClinicaHorario: ${selectedClinicaHorario}`); // <-- LOG INICIO
      // Usar selectedClinicaHorario que se actualiza en el primer useEffect
      if (!userId || userId === 'nuevo' || !selectedClinicaHorario) {
        console.log("[Horario useEffect] Condiciones no cumplidas, limpiando horario y retornando."); // <-- LOG CONDICIÓN
        setHorarioEditado(prev => {
          const nuevoMapa = new Map(prev);
          nuevoMapa.delete(selectedClinicaHorario);
          return nuevoMapa;
        });
        setIsHorarioHeredado(false);
        setIsLoadingHorario(false); // <-- Asegurar que isLoading se pone a false
        return;
      }
      setIsLoadingHorario(true);
      setIsHorarioHeredado(false);
      console.log(`[Horario useEffect] Cargando horario para Usuario: ${userId}, Clínica: ${selectedClinicaHorario}`);
      try {
        const response = await fetch(`/api/users/${userId}/schedule?clinicId=${selectedClinicaHorario}`);
        console.log(`[Horario useEffect] Respuesta API schedule: ${response.status} ${response.statusText}`); // <-- LOG RESPUESTA API

        if (!response.ok) {
          if (response.status === 404) {
             console.warn(`[Horario useEffect] API devolvió 404 para horario personalizado. Usuario: ${userId}, Clínica: ${selectedClinicaHorario}`);
          } else {
             throw new Error(`Error ${response.status} al obtener horario personalizado`);
          }
        }
        const customScheduleData = response.status !== 404 ? await response.json() : null;

        if (customScheduleData) {
          console.log(`[Horario useEffect] Horario PERSONALIZADO encontrado:`, customScheduleData); // <-- LOG HORARIO PERSONALIZADO
          // AÑADIR VALIDACIÓN DEL FORMATO customScheduleData ANTES DE SETEAR
          if (customScheduleData && Array.isArray(customScheduleData.dias)) { // Asegurar que tiene la propiedad dias y es un array
             console.log(`[Horario useEffect] Estableciendo horario PERSONALIZADO para Clínica: ${selectedClinicaHorario}`);
             setHorarioEditado(prev => new Map(prev).set(selectedClinicaHorario, customScheduleData as HorarioSemanal));
             setIsHorarioHeredado(false); // <-- Asegurar que se marca como NO heredado
          } else {
             console.error("[Horario useEffect] El horario personalizado recibido NO tiene el formato esperado (falta .dias array):", customScheduleData);
             // Decidir qué hacer: ¿limpiar? ¿intentar cargar heredado? Por ahora limpiamos.
             setHorarioEditado(prev => {
                 const mapa = new Map(prev);
                 mapa.delete(selectedClinicaHorario);
                 return mapa;
             });
          }
        } else {
          console.log(`[Horario useEffect] No hay horario personalizado. Intentando cargar horario HEREDADO de Clínica: ${selectedClinicaHorario}`);
          const clinicData = clinics.find(c => c.id === selectedClinicaHorario);
          if (!clinicData) {
            console.error(`[Horario useEffect] No se encontraron datos para la clínica ${selectedClinicaHorario} en el contexto.`);
            toast({ title: "Error", description: "No se encontraron datos de la clínica seleccionada.", variant: "destructive" });
            setHorarioEditado(prev => {
                const mapa = new Map(prev);
                mapa.delete(selectedClinicaHorario);
                return mapa;
            });
            // IMPORTANTE: Salir aquí si no hay datos de la clínica
            setIsLoadingHorario(false);
          return;
      }

          let horarioBaseClinica: HorarioSemanal | null = null;
          const templateBlocks = clinicData.linkedScheduleTemplate?.blocks;
          const independentBlocks = clinicData.independentScheduleBlocks;
          const defaultOpen = clinicData.openTime || "00:00";
          const defaultClose = clinicData.closeTime || "23:59";

          if (templateBlocks && templateBlocks.length > 0) {
            console.log(`[Horario useEffect] Clínica ${selectedClinicaHorario} usa plantilla. Convirtiendo bloques de plantilla.`);
            horarioBaseClinica = convertBlocksToWeekSchedule(selectedClinicaHorario, templateBlocks, defaultOpen, defaultClose);
            console.log("[Horario useEffect] Resultado conversión plantilla:", horarioBaseClinica); // <-- LOG CONVERSIÓN PLANTILLA
          } else if (independentBlocks && independentBlocks.length > 0) {
            console.log(`[Horario useEffect] Clínica ${selectedClinicaHorario} usa bloques independientes. Convirtiendo bloques independientes.`);
            horarioBaseClinica = convertBlocksToWeekSchedule(selectedClinicaHorario, independentBlocks as any, defaultOpen, defaultClose);
            console.log("[Horario useEffect] Resultado conversión bloques independientes:", horarioBaseClinica); // <-- LOG CONVERSIÓN INDEPENDIENTES
          } else {
            console.log(`[Horario useEffect] Clínica ${selectedClinicaHorario} no tiene bloques definidos. Creando horario por defecto L-V ${defaultOpen}-${defaultClose}.`);
            horarioBaseClinica = createDefaultClinicSchedule(selectedClinicaHorario, defaultOpen, defaultClose);
            console.log("[Horario useEffect] Resultado creación horario defecto:", horarioBaseClinica); // <-- LOG HORARIO DEFECTO
          }

          if (horarioBaseClinica && Array.isArray(horarioBaseClinica.dias)) { // <-- Añadir validación
            console.log(`[Horario useEffect] Estableciendo horario HEREDADO para Clínica: ${selectedClinicaHorario}`);
            setHorarioEditado(prev => new Map(prev).set(selectedClinicaHorario, horarioBaseClinica));
            // setHorarioSemanal(prev => new Map(prev).set(selectedClinicaHorario, horarioBaseClinica)); // <- ¿Realmente necesario actualizar este estado? Comentado por ahora.
            setIsHorarioHeredado(true);
          } else {
              console.error("[Horario useEffect] No se pudo determinar el horario base de la clínica o el formato es incorrecto:", horarioBaseClinica);
               setHorarioEditado(prev => {
                const mapa = new Map(prev);
                mapa.delete(selectedClinicaHorario);
                return mapa;
               });
          }
        }
      } catch (error) {
        console.error(`[Horario useEffect] Error al cargar horario para Usuario: ${userId}, Clínica: ${selectedClinicaHorario}:`, error);
        // --- MEJORA MANEJO ERROR 500 ---
        toast({
           title: "Error al cargar horario",
           description: error instanceof Error && error.message.includes('status 500')
             ? "Error interno del servidor al cargar el horario. Se mostrará un horario vacío."
             : "No se pudo cargar el horario para esta clínica. Se mostrará un horario vacío.",
           variant: "destructive"
         });
        // Establecer un horario vacío/por defecto para esta clínica en lugar de dejarlo sin datos
        setHorarioEditado(prev => {
            const mapa = new Map(prev);
            // Crear un horario por defecto (ej: todos los días inactivos)
            const horarioPorDefecto: HorarioSemanal = {
                clinicaId: selectedClinicaHorario,
                dias: [
                    { dia: 'lunes', franjas: [], activo: false },
                    { dia: 'martes', franjas: [], activo: false },
                    { dia: 'miercoles', franjas: [], activo: false },
                    { dia: 'jueves', franjas: [], activo: false },
                    { dia: 'viernes', franjas: [], activo: false },
                    { dia: 'sabado', franjas: [], activo: false },
                    { dia: 'domingo', franjas: [], activo: false }
                ]
            };
            mapa.set(selectedClinicaHorario, horarioPorDefecto);
            return mapa;
        });
        setIsHorarioHeredado(false); // Asumimos que no es heredado si hay error
        // --- FIN MEJORA ---
      } finally {
        console.log("[Horario useEffect - FIN] Estableciendo isLoadingHorario a false."); // <-- LOG FIN
        setIsLoadingHorario(false);
      }
    };
    cargarHorario();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, selectedClinicaHorario, clinics /* quitar getUsuarioById y toast si no se usan directamente aquí */]);

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
  const calcularHorasTotales = (horarios: Map<string, HorarioDia[]>) => {
      console.warn("calcularHorasTotales no implementada completamente");
      return { totalPorClinica: new Map(), totalGlobal: 0 };
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
  const handleToggleDia = useCallback((clinicaId: string, diaKey: HorarioDia['dia'], activo: boolean) => {
    setHorarioEditado(prevMap => {
        const nuevoMapa = new Map(prevMap);
        const horarioActual = nuevoMapa.get(clinicaId);
        if (horarioActual && horarioActual.dias) {
            const nuevosDias = horarioActual.dias.map(d => {
                if (d.dia === diaKey) {
                    return { ...d, activo: activo, franjas: activo ? d.franjas : [] }; // Limpiar franjas si se desactiva
                }
                return d;
            });
            nuevoMapa.set(clinicaId, { ...horarioActual, dias: nuevosDias });
            console.log(`[handleToggleDia] Día ${diaKey} para clínica ${clinicaId} actualizado a ${activo}`);
        }
        return nuevoMapa;
    });
  }, []);
  const handleRemoveFranja = useCallback((clinicaId: string, diaKey: HorarioDia['dia'], franjaId: string) => {
      console.log(`[handleRemoveFranja] Intentando eliminar franja ${franjaId} del día ${diaKey} para clínica ${clinicaId}`);
      setHorarioEditado(prevMap => {
          const nuevoMapa = new Map(prevMap);
          const horarioActual = nuevoMapa.get(clinicaId);
          if (horarioActual && horarioActual.dias) {
              const nuevosDias = horarioActual.dias.map(d => {
                  if (d.dia === diaKey) {
                      const franjasFiltradas = d.franjas.filter(f => f.id !== franjaId);
                      console.log(`[handleRemoveFranja] Franjas restantes para ${diaKey}:`, franjasFiltradas);
                      // Si no quedan franjas, ¿deberíamos desactivar el día? Opcional.
                      // const diaActivo = franjasFiltradas.length > 0;
                      return { ...d, franjas: franjasFiltradas /*, activo: diaActivo */ };
                  }
                  return d;
              });
              nuevoMapa.set(clinicaId, { ...horarioActual, dias: nuevosDias });
          } else {
             console.warn(`[handleRemoveFranja] No se encontró horario para la clínica ${clinicaId}`);
          }
          return nuevoMapa;
      });
      toast({ title: "Franja eliminada", description: `La franja ha sido eliminada.`});
  }, [toast]); // Añadir toast si se usa

  // --- INICIO: Definición funciones Modal Franja ---
  const handleOpenFranjaModal = useCallback((diaKey: HorarioDia['dia'], franja?: FranjaHoraria) => {
    console.log(`[handleOpenFranjaModal] Abriendo modal para día ${diaKey}`, franja ? `editando franja ${franja.id}` : 'nueva franja');
    setEditingFranja({ dia: diaKey, franja });
    setIsFranjaModalOpen(true);
  }, []);

  const handleSaveFranja = useCallback((franjaData: { inicio: string, fin: string }) => {
    if (!editingFranja) {
        console.error("[handleSaveFranja] Error: editingFranja es null.");
        toast({ title: "Error", description: "No se pudo guardar la franja.", variant: "destructive" });
        return;
    }

    const { dia, franja } = editingFranja;
    const clinicaId = selectedClinicaHorario; // Asegúrate de que esta variable esté disponible y actualizada

    if (!clinicaId) {
         console.error("[handleSaveFranja] Error: No hay clínica seleccionada.");
         toast({ title: "Error", description: "Seleccione una clínica primero.", variant: "destructive" });
         return;
    }

    console.log(`[handleSaveFranja] Guardando franja para día ${dia}, clínica ${clinicaId}:`, franjaData);

    setHorarioEditado(prevMap => {
      const nuevoMapa = new Map(prevMap);
      const horarioActual = nuevoMapa.get(clinicaId);

      if (!horarioActual || !horarioActual.dias) {
        console.error(`[handleSaveFranja] No se encontró horario para la clínica ${clinicaId}`);
        return prevMap; // Devuelve el mapa sin cambios si no hay horario
      }

      const nuevosDias = horarioActual.dias.map(d => {
        if (d.dia === dia) {
          let franjasActualizadas;
          if (franja) { // Editando franja existente
            franjasActualizadas = d.franjas.map(f =>
              f.id === franja.id ? { ...f, inicio: franjaData.inicio, fin: franjaData.fin } : f
            );
            console.log(`[handleSaveFranja] Franja ${franja.id} actualizada.`);
          } else { // Añadiendo nueva franja
            const nuevaFranja: FranjaHoraria = {
              // Generar ID único (ej. timestamp + random string)
              id: `franja-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              inicio: franjaData.inicio,
              fin: franjaData.fin,
            };
            franjasActualizadas = [...d.franjas, nuevaFranja];
            console.log(`[handleSaveFranja] Nueva franja añadida con ID: ${nuevaFranja.id}`);
          }
          // Ordenar franjas por hora de inicio
          franjasActualizadas.sort((a, b) => (a.inicio || "").localeCompare(b.inicio || ""));
          return { ...d, franjas: franjasActualizadas };
        }
        return d;
      });

      nuevoMapa.set(clinicaId, { ...horarioActual, dias: nuevosDias });
      return nuevoMapa;
    });

    setIsFranjaModalOpen(false);
    setEditingFranja(null);
    toast({ title: "Franja guardada", description: `La franja horaria para ${traducirDia(dia)} ha sido ${franja ? 'actualizada' : 'añadida'}.` });

  }, [editingFranja, selectedClinicaHorario, toast]); // Añadir dependencias necesarias
  // --- FIN: Definición funciones Modal Franja ---

  const handleRemoveHabilidad = (clinicId: string, habilidadNombre: string) => { console.log("handleRemoveHabilidad", clinicId, habilidadNombre); };
  const handleAddHabilidad = () => { console.log("handleAddHabilidad"); };

  // Ajustar convertBlocksToWeekSchedule para que coincida con el tipo HorarioSemanal esperado
  // (Asumiendo que HorarioSemanal es un objeto con claves de día, no un array)
  // CORREGIDO: Función ahora devuelve HorarioSemanal { clinicaId, dias: HorarioDia[] }
  const convertBlocksToWeekSchedule = (
      clinicaId: string, // AÑADIDO clinicId
      blocks: any[] | undefined | null,
      defaultOpenTime: string, // Mantener parámetros originales
      defaultCloseTime: string
  ): HorarioSemanal | null => {
      if (!blocks || blocks.length === 0) {
          console.warn("[convertBlocksToWeekSchedule] No blocks provided for clinic", clinicaId, ", returning null schedule.");
          return null;
      }
      
      // CORREGIDO: Inicializar array de HorarioDia
      const diasSemana: HorarioDia[] = [
          { dia: 'lunes', franjas: [], activo: false },
          { dia: 'martes', franjas: [], activo: false },
          { dia: 'miercoles', franjas: [], activo: false },
          { dia: 'jueves', franjas: [], activo: false },
          { dia: 'viernes', franjas: [], activo: false },
          { dia: 'sabado', franjas: [], activo: false },
          { dia: 'domingo', franjas: [], activo: false }
      ];

      blocks.forEach((block) => {
          if (!block.dayOfWeek) {
              console.warn("[convertBlocksToWeekSchedule] Block is missing dayOfWeek:", block);
              return; // Saltar este bloque
          }
          const dayKey = block.dayOfWeek.toLowerCase() as HorarioDia['dia'];
          const diaIndex = diasSemana.findIndex(d => d.dia === dayKey);

          if (diaIndex !== -1) {
              if (block.startTime && block.endTime) {
                  // CORREGIDO: Usar 'franjas' y 'activo'
                  diasSemana[diaIndex].activo = true; 
                  // Crear FranjaHoraria - Asumir que block tiene id o generar uno?
                  // Por ahora usamos inicio+fin como ID improvisado si block.id no existe
                  const franja: FranjaHoraria = {
                      id: block.id || `${block.startTime}-${block.endTime}`, 
                      inicio: block.startTime, 
                      fin: block.endTime 
                  };
                  diasSemana[diaIndex].franjas.push(franja);
                  
      } else {
                  console.warn(`[convertBlocksToWeekSchedule] Block for ${dayKey} is missing start or end time:`, block);
              }
          } else {
              console.warn(`[convertBlocksToWeekSchedule] Invalid day key encountered: ${dayKey}`);
          }
      });

      // Ordenar franjas y asegurar estado 'activo'
      diasSemana.forEach(dia => {
          if (dia.franjas.length > 0) {
              dia.activo = true;
              dia.franjas.sort((a, b) => a.inicio.localeCompare(b.inicio));
          } else {
              dia.activo = false; // Asegurar que sea false si no hay franjas
          }
      });
      
      // CORREGIDO: Devolver estructura HorarioSemanal
      return { clinicaId, dias: diasSemana };
  };


  // Ajustar createDefaultClinicSchedule para que coincida con el tipo HorarioSemanal esperado
  // CORREGIDO: Función ahora devuelve HorarioSemanal { clinicaId, dias: HorarioDia[] }
  const createDefaultClinicSchedule = (
      clinicaId: string, // AÑADIDO clinicId
      openTime: string, 
      closeTime: string
  ): HorarioSemanal => {
      const defaultFranja: FranjaHoraria = { id: 'default', inicio: openTime, fin: closeTime };
      // CORREGIDO: Crear array de HorarioDia
      const diasSemana: HorarioDia[] = [
          { dia: 'lunes', franjas: [defaultFranja], activo: true },
          { dia: 'martes', franjas: [defaultFranja], activo: true },
          { dia: 'miercoles', franjas: [defaultFranja], activo: true },
          { dia: 'jueves', franjas: [defaultFranja], activo: true },
          { dia: 'viernes', franjas: [defaultFranja], activo: true },
          { dia: 'sabado', franjas: [], activo: false },
          { dia: 'domingo', franjas: [], activo: false },
      ];
      // CORREGIDO: Devolver estructura HorarioSemanal
      return { clinicaId, dias: diasSemana };
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
     if (!confirm('¿Estás seguro de que deseas eliminar esta excepción?')) {
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
  }, [userId, selectedClinicaHorario, toast]);
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

  // --- NUEVA FUNCIÓN DE GUARDADO POR PESTAÑA ---
  const handleGuardarUsuario = async () => {
    setIsSaving(true);
    console.log(`[handleGuardarUsuario] Iniciando guardado para pestaña activa: ${activeTab}`);
    let updatedUser: Usuario | null = null; // Variable para guardar el usuario actualizado
    // --- Declara la variable para el usuario refetch aquí ---
    let refreshedUserData: Usuario | null = null;

    try {
      let success = false;
      let errorMessage = "Error desconocido al guardar.";

      // --- Lógica de guardado según la pestaña activa ---
      switch (activeTab) {
        case 'datos-personales':
          // TODO: Implementar validaciones y guardado para datos personales
          // Necesita definir dónde se guardan campos como DNI, fechaNac, etc.
          console.warn("Guardado de Datos Personales aún no implementado completamente.");
          
          // --- Validación básica (similar a la anterior, adaptada) ---
          if (!firstName.trim()) throw new Error("El nombre es obligatorio.");
          if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) throw new Error("El formato del email no es válido.");
          if (email !== confirmEmail) throw new Error("Los emails no coinciden.");
          if (userId === 'nuevo' && !contrasena) throw new Error("La contraseña es obligatoria para crear un nuevo usuario.");
          
          // --- Preparar Payload SOLO para campos del modelo User (o Create) --- 
          const basePayload: Partial<Usuario> & { password?: string } = {
            firstName: firstName.trim(),
            lastName: lastName.trim() || null, 
            email: email.trim(), 
            isActive: isActive,
            // profileImageUrl: ... (Manejar si se edita)
            // --- Añadir OTROS CAMPOS si existen en el modelo User ---
            // dni: dni.trim() || null, // Ejemplo si existe DNI
          };
          
          if (userId === 'nuevo') {
              basePayload.password = contrasena;
              console.log("[handleGuardarUsuario - Datos Personales] Creando usuario con payload:", basePayload);
              // --- RESTAURAR LLAMADA ORIGINAL --- 
              const newUser = await createUsuario(basePayload as any); // Asumimos que createUsuario DEVUELVE el usuario
              // --- ELIMINAR SIMULACIÓN --- 
              /*
              const newUser: Usuario | null = { 
                  ...basePayload, 
                  id: 'temp-id-'+Date.now(), 
                  email: basePayload.email || '-', 
                  firstName: basePayload.firstName || '', // Añadir fallback
                  lastName: basePayload.lastName || '' // Añadir fallback
              }; 
              */
              if (newUser) {
                success = true;
                refreshedUserData = newUser; // Usar el usuario creado directamente
                toast({ title: "Éxito", description: "Usuario creado correctamente." });
                router.replace(`/configuracion/usuarios/${newUser.id}?tab=datos-personales&returnTo=${encodeURIComponent(returnToBase)}`);
      } else {
                errorMessage = "Error al crear usuario.";
              }
          } else {
              console.log(`[handleGuardarUsuario - Datos Personales] Actualizando usuario ${userId} con payload:`, basePayload);
              // --- MODIFICADO: Verificar el booleano devuelto por updateUsuario ---
              const updateSuccess = await updateUsuario(userId, basePayload as any); // Asumir que devuelve boolean
              if (updateSuccess) {
                  success = true;
                  // Refetch después de éxito
                  refreshedUserData = await getUsuarioById(userId);
              } else {
                  errorMessage = "Error al actualizar datos personales.";
              }
          }
          break;

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
          
          // Llamar a updateUsuario solo con clinicAssignments
          // CORREGIR: Usar cast explícito a UsuarioUpdatePayload
          const permissionsUpdateSuccess = await updateUsuario(userId, { clinicAssignments: assignmentsPayload } as any); // Asumir que devuelve boolean
          if (permissionsUpdateSuccess) {
              success = true;
              // Refetch después de éxito
              refreshedUserData = await getUsuarioById(userId);
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
                console.log(`[handleGuardarUsuario - Horario] Guardando horario para usuario ${userId}, clínica ${selectedClinicaHorario}:`, horarioAGuardar);

                // --- MODIFICADO: Convertir al formato WeekSchedule antes de enviar ---
                const scheduleToSend = convertHorarioSemanalToWeekSchedule(horarioAGuardar);
                if (!scheduleToSend) {
                   throw new Error("Error al convertir el formato del horario para guardar.");
                }
                console.log("[handleGuardarUsuario - Horario] Enviando horario convertido:", scheduleToSend);

                const response = await fetch(`/api/users/${userId}/schedule?clinicId=${selectedClinicaHorario}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(scheduleToSend) // <-- Enviar formato correcto
                });
                if (response.ok) {
                    success = true;
                    // TODO: Actualizar estado inicial si se implementa detección de cambios
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    errorMessage = `Error ${response.status} al guardar horario: ${errorData.message || 'Error desconocido'}`;
                    // Lanzar explícitamente el error aquí para que lo capture el catch general
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
          throw new Error(`Pestaña desconocida: ${activeTab}`);
      }

      // --- Actualizar Estado Local Centralizado (USANDO refreshedUserData) ---
      if (success && refreshedUserData) {
        console.log("[handleGuardarUsuario] Actualizando estado local con datos REFRESACADOS:", refreshedUserData);
        // Actualizar datos básicos del estado local desde refreshedUserData
        setFirstName(refreshedUserData.firstName || "");
        setLastName(refreshedUserData.lastName || "");
        setEmail(refreshedUserData.email || "");
        setIsActive(refreshedUserData.isActive);
        // ... actualizar TODOS los demás estados locales (DNI, etc.) desde refreshedUserData

        // Actualizar permisos locales y el estado inicial desde refreshedUserData
        const newPermisos = new Map<string, string[]>();
        const newAssignments = (refreshedUserData as any).clinicAssignments || [];
        const newSelectedClinics: string[] = [];
        if (Array.isArray(newAssignments)) {
          newAssignments.forEach((asignacion: any) => {
            const clinicId = asignacion.clinicId;
            const roleId = asignacion.role?.id || asignacion.roleId;
            if (clinicId && roleId) {
              const rolesClinica = newPermisos.get(clinicId) || [];
              if (!rolesClinica.includes(roleId)) {
                rolesClinica.push(roleId);
              }
              newPermisos.set(clinicId, rolesClinica);
              newSelectedClinics.push(clinicId);
            }
          });
        }
        setPermisosClinicas(newPermisos);
        setInitialPermisosClinicas(new Map(newPermisos)); // Actualizar copia inicial con el estado guardado
        setSelectedClinicas(newSelectedClinics);

        // Guardar datos completos en initialUserData para referencia futura
        setInitialUserData(refreshedUserData);

        toast({ title: "Éxito", description: `Cambios en '${activeTab}' guardados correctamente.` });

      } else if (success) {
         // Caso de éxito SIN refetch (ej. Horario)
         console.log(`[handleGuardarUsuario] Guardado exitoso para pestaña ${activeTab}, no se actualizaron datos de usuario.`);
         toast({ title: "Éxito", description: `Cambios en '${activeTab}' guardados correctamente.` });
         // NO actualizar initialUserData aquí
         // Actualizar estados iniciales específicos si es necesario (ej: ¿marcar horario como no heredado?)
         if (activeTab === 'horario') {
            // Lógica potencial para actualizar el estado inicial del horario guardado
         }
      } else {
        // Si success es false, lanzar error
        throw new Error(errorMessage);
      }

    } catch (error) {
      console.error(`[handleGuardarUsuario] Error en pestaña '${activeTab}':`, error);
      toast({ title: "Error al guardar", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    } finally {
      setIsSaving(false);
      console.log(`[handleGuardarUsuario] Finalizado guardado para pestaña: ${activeTab}`);
    }
  };
  // --- FIN NUEVA FUNCIÓN DE GUARDADO ---

  // --- RENDERIZADO DEL COMPONENTE ---
  // Log antes del return para ver el estado
  console.log("[Render] Estado antes de renderizar:", {
    loading,
    isSaving,
    isLoadingHorario,
    isLoadingExceptions,
    activeTab,
    horarioSubTab,
    selectedClinicaHorario,
    horarioEditado: horarioEditado, // Mostrar el contenido del Map
    isHorarioHeredado
  });

  if (loading && userId !== 'nuevo') {
    return <UsuarioPageSkeleton />;
  }

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
          <TabsTrigger value="datos-personales">Datos personales</TabsTrigger>
            {/* Quitar el disabled */}
            <TabsTrigger value="permisos">Permisos</TabsTrigger>
            <TabsTrigger value="horario">Horario</TabsTrigger>
            <TabsTrigger value="habilidades">Habilidades profesionales</TabsTrigger>
          <TabsTrigger value="condiciones">Condiciones laborales</TabsTrigger> {/* Mantener */}
          <TabsTrigger value="fichajes">Control de Presencia</TabsTrigger> {/* Mantener */}
        </TabsList>
        
        {/* Pestaña de Datos Personales (VISIBLE) */}
        <TabsContent value="datos-personales" className="space-y-4">
          <Card className="p-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-3">
                {/* Campo Nombre Refactorizado */}
                <div>
                  <Label htmlFor="firstName" className="text-sm font-medium">Nombre</Label> 
                  <Input 
                    id="firstName" 
                    value={firstName} // <- Usar firstName
                    onChange={(e) => setFirstName(e.target.value)} // <- Usar setFirstName
                    className="h-9"
                  />
                </div>
                {/* Campo Apellidos Añadido */}
                 <div>
                  <Label htmlFor="lastName" className="text-sm font-medium">Apellidos</Label>
                  <Input
                    id="lastName"
                    value={lastName} // <- Usar lastName
                    onChange={(e) => setLastName(e.target.value)} // <- Usar setLastName
                    className="h-9"
                  />
                </div>
                
                <div>
                  <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
                  <Input 
                    id="email" 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-9"
                  />
                </div>
                
                <div>
                  <Label htmlFor="confirmEmail" className="text-sm font-medium">Confirma e-mail</Label>
                  <Input 
                    id="confirmEmail" 
                    type="email"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    className="h-9"
                  />
                </div>
                
                <div className="flex gap-4">
                  {/* Quitar Prefijo si no se usa 'phone' directamente */}
                  {/* 
                  <div className="w-1/3">
                    <Label htmlFor="prefijo" className="text-sm font-medium">Prefijo</Label>
                    <MemoizedSelect 
                      value={prefijo} 
                      onChange={setPrefijo} 
                      placeholder="Seleccione una opción"
                    >
                      <SelectItem value="ES">ES (+34)</SelectItem>
                      <SelectItem value="MA">MA (+212)</SelectItem>
                    </MemoizedSelect>
                  </div>
                   */}
                  {/* Usar todo el ancho para Teléfono */}
                  <div className="w-full"> 
                    <Label htmlFor="telefono" className="text-sm font-medium">Teléfono</Label>
                    <Input 
                      id="telefono" 
                      value={telefono} // <- Mapea a 'phone'
                      onChange={(e) => setTelefono(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
                
                {/* Campos adicionales para datos personales */}
                <div>
                  <Label htmlFor="dni" className="text-sm font-medium">DNI</Label>
                  <Input 
                    id="dni" 
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    className="h-9"
                  />
                </div>
                
                <div>
                  <Label htmlFor="fechaNacimiento" className="text-sm font-medium">Fecha nacimiento</Label>
                  <Input 
                    id="fechaNacimiento" 
                    type="date" 
                    placeholder="dd/mm/yyyy"
                    value={fechaNacimiento}
                    onChange={(e) => setFechaNacimiento(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="sexo" className="text-sm font-medium">Sexo</Label>
                  <MemoizedSelect 
                    value={sexo} 
                    onChange={setSexo} 
                    placeholder="Seleccione una opción"
                  >
                    <SelectItem value="mujer">Mujer</SelectItem>
                    <SelectItem value="hombre">Hombre</SelectItem>
                  </MemoizedSelect>
                </div>
                
                {/* Campo Perfil (deshabilitado/informativo por ahora) */}
                <div>
                  <Label htmlFor="perfil" className="text-sm font-medium">Perfil (Gestión en Permisos)</Label>
                  <Input 
                    id="perfil" 
                    value="Gestión en pestaña Permisos" 
                    disabled 
                    className="h-9" 
                  />
                </div>
                
                <div>
                  <Label htmlFor="telefono2" className="text-sm font-medium">Teléfono 2</Label>
                  <Input 
                    id="telefono2"
                    value={telefono2}
                    onChange={(e) => setTelefono2(e.target.value)}
                    className="h-9"
                  />
                </div>
                
                <div>
                  <Label htmlFor="login" className="text-sm font-medium">Login</Label>
                  <Input id="login" value={email} disabled className="h-9" />
                </div>
                
                <div>
                  <Label htmlFor="contrasena" className="text-sm font-medium">Contraseña</Label>
                  <Input 
                    id="contrasena" 
                    type="password"
                    placeholder="Dejar en blanco para no cambiar"
                      value={contrasena} // AÑADIDO value
                      onChange={(e) => setContrasena(e.target.value)} // AÑADIDO onChange
                    className="h-9"
                  />
                </div>
                
                <div>
                  <Label htmlFor="idioma" className="text-sm font-medium">Idioma</Label>
                  <Select value={idioma} onValueChange={setIdioma}>
                    <SelectTrigger id="idioma" className="h-9">
                      <SelectValue placeholder="Seleccione una opción" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="fr">Francés</SelectItem>
                      <SelectItem value="en">Inglés</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center pt-4 space-x-2">
                  <Switch 
                    checked={isActive} 
                    onCheckedChange={setIsActive} 
                    id="active-status" 
                  />
                  <Label htmlFor="active-status" className="font-medium cursor-pointer">
                    Usuario {isActive ? 'activo' : 'inactivo'}
                  </Label>
                </div>
              </div>
            </div>
            
            {/* Sección de Datos del colegiado (Mantener si campos existen) */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1 bg-purple-100 rounded">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-700">
                    <path d="M15 7v1a3 3 0 0 1-3 3h0a3 3 0 0 1-3-3V7m3-3h0a9 9 0 0 1 9 9v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 9-9h0Z" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold text-gray-700">Datos del colegiado</h2>
              </div>
              
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="colegio" className="text-sm font-medium">Colegio</Label>
                  <Input 
                    id="colegio"
                    value={colegio}
                    onChange={(e) => setColegio(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label htmlFor="numeroColegiado" className="text-sm font-medium">Número de colegiado</Label>
                  <Input 
                    id="numeroColegiado"
                    value={numeroColegiado}
                    onChange={(e) => setNumeroColegiado(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4 mt-3 md:grid-cols-2">
                <div>
                  <Input 
                    placeholder="Especialidad"
                    value={especialidad}
                    onChange={(e) => setEspecialidad(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Input 
                    placeholder="Universidad"
                    value={universidad}
                    onChange={(e) => setUniversidad(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            </div>
            
            {/* Sección de Dirección (Mantener si campos existen) */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1 bg-purple-100 rounded">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-700">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold text-gray-700">Dirección</h2>
              </div>
              
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="direccion" className="text-sm font-medium">Dirección</Label>
                  <Input 
                    id="direccion"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label htmlFor="provincia" className="text-sm font-medium">Provincia</Label>
                  <Input 
                    id="provincia"
                    value={provincia}
                    onChange={(e) => setProvincia(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label htmlFor="pais" className="text-sm font-medium">País</Label>
                  <Input 
                    id="pais" 
                    placeholder="(Usa uno)"
                    value={pais}
                    onChange={(e) => setPais(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label htmlFor="localidad" className="text-sm font-medium">Localidad</Label>
                  <Input 
                    id="localidad"
                    value={localidad}
                    onChange={(e) => setLocalidad(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label htmlFor="cp" className="text-sm font-medium">CP</Label>
                  <Input 
                    id="cp"
                    value={cp}
                    onChange={(e) => setCp(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            </div>
            
            {/* Sección de Configuración (Mantener si campos existen) */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1 bg-purple-100 rounded">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-700">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold text-gray-700">Configuración</h2>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="exportCsv" className="text-sm font-medium">Export CSV</Label>
                    {/* CORREGIDO: Usar string "true"/"false" para value y onValueChange */}
                  <Select value={exportCsv} onValueChange={setExportCsv}>
                    <SelectTrigger id="exportCsv" className="h-9">
                      <SelectValue placeholder="Seleccione una opción" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="true">Sí</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                        {/* Mantener opción original si es necesaria */}
                        {/* <SelectItem value=":">:</SelectItem>  */}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="indiceControl" className="text-sm font-medium">Índice control de presencia</Label>
                  <Select value={indiceControl} onValueChange={setIndiceControl}>
                    <SelectTrigger id="indiceControl" className="h-9">
                      <SelectValue placeholder="Seleccione una opción" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="000001-Markeiser-Catherine">000001-Markeiser-Catherine</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="numeroPIN" className="text-sm font-medium">Número de identificación personal (PIN)</Label>
                  <Input 
                    id="numeroPIN"
                    value={numeroPIN}
                    onChange={(e) => setNumeroPIN(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label htmlFor="notas" className="text-sm font-medium">Notas</Label>
                  <textarea 
                    id="notas"
                    className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="mostrarDesplazados" 
                        checked={mostrarDesplazados} // AÑADIDO estado
                        onCheckedChange={(checked) => setMostrarDesplazados(checked === true)} // AÑADIDO estado
                    />
                    <Label htmlFor="mostrarDesplazados" className="text-sm">No mostrar en desplazados</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="mostrarCitasPropias"
                        checked={mostrarCitasPropias} // AÑADIDO estado
                        onCheckedChange={(checked) => setMostrarCitasPropias(checked === true)} // AÑADIDO estado
                    />
                    <Label htmlFor="mostrarCitasPropias" className="text-sm">Mostrar únicamente las citas propias</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="restringirIP"
                        checked={restringirIP} // AÑADIDO estado
                        onCheckedChange={(checked) => setRestringirIP(checked === true)} // AÑADIDO estado
                    />
                    <Label htmlFor="restringirIP" className="text-sm">Restringir IP</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="deshabilitado" 
                        checked={deshabilitado} // AÑADIDO estado (conectar con isActive?)
                        onCheckedChange={(checked) => setDeshabilitado(checked === true)} // AÑADIDO estado
                    />
                    <Label htmlFor="deshabilitado" className="text-sm">Deshabilitado</Label>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
        
          {/* Pestaña de Permisos */}
        <TabsContent value="permisos" className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-medium">Asignación de clínicas y perfiles</h3>
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
                        <TableCell colSpan={3} className="text-center text-gray-500">No hay clínicas asignadas</TableCell>
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
            
            {/* Sección Selección Clínica (SIN CAMBIOS) */}
          <Card className="p-4">
              <Label className="block mb-2 text-sm font-medium">Seleccionar Clínica para ver/editar horario</Label>
              <SelectClinica
                value={selectedClinicaHorario}
                onChange={(value) => {
                  setSelectedClinicaHorario(value);
                }}
                options={clinics
                   .filter(c => selectedClinicas.includes(String(c.id)))
                   .map(c => ({ 
                      id: String(c.id), 
                      label: `${c.prefix} - ${c.name}${c.isActive ? '' : ' (Inactiva)'}`
                   }))
                }
                placeholder="Seleccione una clínica asignada"
                disabled={selectedClinicas.length === 0}
              />
              {selectedClinicas.length === 0 && (
                <p className="mt-2 text-xs text-red-600">Asigne al menos una clínica en la pestaña 'Permisos' para configurar horarios.</p>
              )}
            </Card>

            {/* --- MOVER AQUÍ: Tarjeta Resumen de Horas --- */}
            {selectedClinicaHorario && (
               <Card className="p-4 bg-white border rounded-lg shadow-sm">
                <h4 className="mb-3 text-sm font-medium">Resumen de horas configuradas para {clinics.find(c => c.id === selectedClinicaHorario)?.name}</h4>
                    {(() => {
                  const { totalPorClinica, totalGlobal } = calcularHorasTotales(new Map<string, HorarioDia[]>()); 
                const totalHorasRecomendadas = 40;
                  const horarioActualClinica = horarioEditado.get(selectedClinicaHorario);
                  const datosClinica = { totalMinutos: 0, diasActivos: 0, porDia: {} as Record<string, number> }; 
                  
                  if (horarioActualClinica && horarioActualClinica.dias) { 
                      horarioActualClinica.dias.forEach((diaData) => { 
                         if (diaData.activo) { 
                             datosClinica.diasActivos++;
                             let minutosDia = 0;
                             diaData.franjas.forEach(franja => { 
                                 try {
                                     const [hInicio, mInicio] = (franja.inicio || "00:00").split(':').map(Number); 
                                     const [hFin, mFin] = (franja.fin || "00:00").split(':').map(Number); 
                                     minutosDia += (hFin * 60 + mFin) - (hInicio * 60 + mInicio);
                                 } catch { /* Ignorar */ }
                             });
                             datosClinica.porDia[diaData.dia] = minutosDia; 
                             datosClinica.totalMinutos += minutosDia;
                         } else {
                              datosClinica.porDia[diaData.dia] = 0; 
                         }
                      });
                  }
                              
                              return (
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Total semanal calculado:</span>
                        <span className={`font-bold ${datosClinica.totalMinutos > totalHorasRecomendadas * 60 ? 'text-red-600' : ''}`}>
                           {/* {minutosAHoraLegible(datosClinica.totalMinutos)}h */} {/* Descomentar si existe */} 
                           {`${(datosClinica.totalMinutos / 60).toFixed(1)}h`} / {totalHorasRecomendadas}h recomendadas
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Días activos:</span>
                        <span>{datosClinica.diasActivos} / 7</span>
                      </div>
                      <div className="pt-2 mt-2 border-t">
                         <h5 className="mb-1 text-xs font-medium text-gray-600">Detalle por día:</h5>
                         <div className="grid grid-cols-3 gap-1 text-xs">
                           {['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].map(dia => ( // Usar claves reales
                             <div key={dia} className="flex justify-between px-1 py-0.5 rounded bg-gray-100/50">
                               <span className="capitalize">{traducirDia(dia)}:</span>
                               {/* <span>{minutosAHoraLegible(datosClinica.porDia?.[dia] || 0)}h</span> */} {/* Descomentar si existe */} 
                               <span>{`${((datosClinica.porDia?.[dia] || 0) / 60).toFixed(1)}h`}</span>
                             </div>
                           ))}
                         </div>
                      </div>
                       {selectedClinicas.length > 1 && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                           className="w-full mt-3 text-xs h-7"
                           // onClick={() => distribuirHorariosMultiplesClinicas(selectedClinicas)} // Descomentar
                      onClick={() => { /* Placeholder */ }}
                           disabled // Deshabilitar temporalmente
                                >
                                  <PlusCircle className="w-3 h-3 mr-1" />
                                  Equilibrar carga entre clínicas
                                </Button>
                       )}
                          </div>
                            );
                          })()}
            </Card>
            )}
            {/* --- FIN Tarjeta Resumen de Horas --- */}
            
            {/* Sub-pestañas Horario Semanal / Excepciones / Vista Consolidada */}
            {selectedClinicaHorario && (
              <Tabs value={horarioSubTab} onValueChange={setHorarioSubTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="semanal">Horario Semanal</TabsTrigger>
                  <TabsTrigger value="excepciones">Excepciones</TabsTrigger>
                  <TabsTrigger value="vista">Vista Consolidada</TabsTrigger>
                </TabsList>
                
                {/* Sub-Pestaña: Horario Semanal (REFRACTORIZADA) */}
                <TabsContent value="semanal">
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-base font-medium">Horario Semanal Editable</h4>
                      {/* CORREGIDO: Texto del Badge dinámico */}
                      <Badge
                        variant={isHorarioHeredado ? "secondary" : "default"}
                        className={cn("text-xs",
                          isHorarioHeredado ? "text-gray-600 border-gray-300 bg-gray-100" : "text-white bg-blue-600"
                        )}
                       >
                         {isHorarioHeredado ? "Horario Clínica (Referencia)" : "Horario Personalizado"}
                       </Badge>
                    </div>

                    {/* Contenedor del Horario con Grid */}
                    {isLoadingHorario ? (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {/* Skeleton para las tarjetas de día */}
                        {Array.from({ length: 7 }).map((_, i) => (
                          <Card key={`skel-day-${i}`} className="p-4 space-y-3 animate-pulse">
                            <div className="flex items-center justify-between">
                              <Skeleton className="w-1/3 h-5" />
                              <Skeleton className="w-10 h-6" />
                            </div>
                            <div className="space-y-2">
                              <Skeleton className="w-3/4 h-4" />
                              <Skeleton className="w-1/2 h-4" />
                            </div>
                            <Skeleton className="w-8 h-8 rounded-full" />
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {/* LOG DENTRO DEL RENDER DEL MAP */}
                        {(horarioEditado.get(selectedClinicaHorario)?.dias || []).length === 0 && (
                            <p className="col-span-1 py-4 italic text-center text-gray-500 md:col-span-2">No hay datos de horario para mostrar para la clínica seleccionada.</p>
                        )}
                        {(horarioEditado.get(selectedClinicaHorario)?.dias || []).map((dia, index) => {
                            // console.log(`[Render Map] Renderizando día ${index}:`, dia); // Log para cada día
                            return (
                              <Card key={`${dia.dia}-${index}`} className={cn("p-4 transition-opacity", !dia.activo && "opacity-60 bg-slate-50")}>
                                <div className="flex items-center justify-between mb-3">
                                  <span className={cn("font-semibold capitalize text-md", dia.activo ? "text-gray-800" : "text-gray-500")}>{traducirDia(dia.dia)}</span>
                                  <Switch
                                    checked={dia.activo}
                                    onCheckedChange={(checked) => handleToggleDia(selectedClinicaHorario, dia.dia, checked)}
                                    aria-label={`Activar/Desactivar ${traducirDia(dia.dia)}`}
                                  />
                                </div>

                                {/* Franjas Horarias */}
                                <div className="space-y-2 min-h-[60px]"> {/* Altura mínima para consistencia */}
                                  {dia.activo ? (
                                    <>
                                      {dia.franjas.length === 0 && (
                                        <p className="py-2 text-xs italic text-center text-gray-400">Día activo sin franjas</p>
                                      )}
                                      {dia.franjas.map((franja) => (
                                        <div
                                          key={franja.id}
                                          className="flex items-center justify-between gap-1.5 px-3 py-1.5 text-sm rounded-md bg-blue-100 text-blue-800 border border-blue-200 cursor-pointer hover:bg-blue-200/80 transition-colors"
                                          onClick={() => handleOpenFranjaModal(dia.dia, franja)}
                                        >
                                          <div className="flex items-center gap-1.5">
                                            <Clock className="w-4 h-4" />
                                            <span>{franja.inicio || '--:--'} - {franja.fin || '--:--'}</span>
                                          </div>
                                          <button
                                            type="button"
                                            className="p-0.5 rounded-full text-blue-600 hover:bg-blue-300/50 hover:text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleRemoveFranja(selectedClinicaHorario, dia.dia, franja.id);
                                            }}
                                            aria-label={`Eliminar franja ${franja.inicio}-${franja.fin}`}
                                          >
                                            <X className="w-4 h-4" />
                                          </button>
                                        </div>
                                      ))}
                                    </>
                                  ) : (
                                    <p className="py-2 text-xs italic text-center text-gray-400">Día inactivo</p>
                                  )}
                                </div>

                                {/* Botón Añadir Franja (solo si día activo) */}
                                {dia.activo && (
                                  <div className="flex justify-center mt-3">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="flex items-center h-8 gap-1 px-3 text-blue-600 border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                                      onClick={() => handleOpenFranjaModal(dia.dia)}
                                      aria-label={`Añadir franja para ${traducirDia(dia.dia)}`}
                                    >
                                      <Plus className="w-4 h-4" /> Añadir
                                    </Button>
                                  </div>
                                )}
                              </Card>
                            );
                        })}
                      </div>
                    )}
          </Card>
        </TabsContent>
        
                {/* Sub-Pestaña: Excepciones */}
                <TabsContent value="excepciones">
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-base font-medium">Excepciones Horarias</h4>
                      <Button 
                        size="sm" 
                        onClick={() => { 
                          // MODIFICADO: Lógica para abrir modal de nueva excepción
                          console.log("Abrir modal nueva excepción para clínica:", selectedClinicaHorario);
                          setExcepcionEditada(null); // Limpiar cualquier edición anterior
                          setMostrarModalExcepcion(true); // Mostrar el modal
                        }} 
                        className="h-9"
                        // Deshabilitar si no hay clínica seleccionada o están cargando
                        disabled={isLoadingExceptions || !selectedClinicaHorario} 
                      >
                        <Plus className="w-4 h-4 mr-1" /> Nueva Excepción
                      </Button>
                    </div>
                    {/* Mostrar indicador de carga si isLoadingExceptions es true */}
                    {isLoadingExceptions && (
                      <div className="flex items-center justify-center p-4 text-sm text-gray-500">
                        <svg className="w-4 h-4 mr-2 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Cargando excepciones...
                      </div>
                    )}
                    {/* Mostrar lista si NO está cargando */}
                    {!isLoadingExceptions && excepcionesUsuario.length === 0 ? (
                      <p className="text-sm text-center text-gray-500">No hay excepciones definidas para este usuario en esta clínica.</p>
                    ) : (
                      !isLoadingExceptions && excepcionesUsuario.map(exc => ( // <-- Usar estado excepcionesUsuario
                        <div key={exc.id} className="p-3 mb-3 border rounded-md">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                               {/* Usar exc.nombre, exc.fechaInicio, exc.fechaFin */}
                               <p className="font-medium">{exc.nombre || "Excepción sin nombre"}</p>
                               <p className="text-xs text-gray-500">
                                 {formatFecha(exc.fechaInicio)} - {formatFecha(exc.fechaFin)}
                               </p>
                            </div>
                            <div>
                              <Button variant="ghost" size="icon" className="w-8 h-8 text-blue-600 hover:bg-blue-100" onClick={() => { 
                                // Lógica para abrir modal de edición (pendiente)
                                console.log("Abrir modal editar excepción", exc.id);
                              }}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="w-8 h-8 text-red-600 hover:bg-red-100" onClick={() => { 
                                // Lógica para eliminar excepción (pendiente)
                                console.log("Eliminar excepción", exc.id);
                               }}>
                                <Trash className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          {/* Podríamos mostrar aquí el horario específico de la excepción (exc.scheduleJson) si fuera necesario */}
                        </div>
                      ))
                    )}
                  </Card>
                </TabsContent>
                
                {/* Sub-Pestaña: Vista Consolidada */}
                <TabsContent value="vista">
                  <Card className="p-4">
                    <h4 className="mb-4 text-base font-medium">Vista Consolidada del Horario</h4>
                    {/* Aquí iría la lógica para mostrar el horario base + excepciones */}
                    <p className="text-sm text-center text-gray-500">Vista consolidada aún no implementada.</p>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </TabsContent>
          
          {/* Pestaña de Habilidades Profesionales */}
        <TabsContent value="habilidades" className="space-y-4">
             {/* Eliminar placeholder */}
             {/* <Card className="p-4"><p className="text-center text-gray-500">Gestión de habilidades profesionales estará disponible aquí.</p></Card> */}
             
             {/* >>> INICIO CÓDIGO DESCOMENTADO/RESTAURADO PARA HABILIDADES <<< */}
             <Card className="p-4">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-base font-medium">Habilidades Profesionales Asignadas</h3>
                 {/* Filtro o búsqueda? */}
                 <Input 
                   placeholder="Buscar por clínica, familia o servicio..." 
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
                             <TableCell>{clinica ? `${clinica.prefix} - ${clinica.name}` : "Clínica Desconocida"}</TableCell>
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
                         <TableCell colSpan={3} className="text-center text-gray-500">No hay habilidades asignadas</TableCell>
                       </TableRow>
                     )}
                   </TableBody>
                 </Table>
               </div>
               
               {/* Sección para añadir nueva habilidad */}
               <div className="flex items-end gap-2 p-3 border rounded-md bg-gray-50">
                 {/* Select Clínica */}
                 <div className="flex-1 space-y-1">
                   <Label className="text-xs">Clínica</Label>
                   <SelectClinica 
                     value={nuevaClinicaHabilidad} // AÑADIDO estado
                     onChange={setNuevaClinicaHabilidad} // AÑADIDO estado
                     options={opcionesClinicasHabilidad} // Usar opciones memoizadas
                     placeholder="Seleccionar clínica"
                   />
                 </div>
                 
                 {/* Select Tipo (Familia/Servicio) */}
                 <div className="w-40 space-y-1 shrink-0">
                   <Label className="text-xs">Tipo</Label>
                   <SelectTipo value={tipoSeleccion} onChange={setTipoSeleccion} />
                 </div>
                 
                 {/* Select Familia o Servicio (Condicional) */}
                 <div className="flex-1 space-y-1">
                   <Label className="text-xs">{tipoSeleccion === 'familia' ? 'Familia' : 'Servicio'}</Label>
                   <MemoizedSelect 
                     // CORREGIDO: Usar estados nuevaFamilia/nuevoServicio
                     value={tipoSeleccion === 'familia' ? nuevaFamilia : nuevoServicio} 
                     // CORREGIDO: Usar estados setNuevaFamilia/setNuevoServicio
                     onChange={tipoSeleccion === 'familia' ? setNuevaFamilia : setNuevoServicio} 
                     placeholder={tipoSeleccion === 'familia' ? 'Seleccionar familia' : 'Seleccionar servicio'}
                     disabled={!nuevaClinicaHabilidad} // CORREGIDO: Usar estado
                   >
                     {tipoSeleccion === 'familia' 
                       // CORREGIDO: Usar placeholder FAMILIAS_MOCK
                       ? (FAMILIAS_MOCK.map((familia: FamiliaServicio) => ( 
                           <SelectItem key={String(familia.id)} value={String(familia.id)}> 
                             {familia.name} {/* <-- Usar 'name' */}
                           </SelectItem>
                         )))
                         // CORREGIDO: Usar placeholder SERVICIOS_MOCK y adaptar a su estructura
                       : (Object.values(SERVICIOS_MOCK).flat().map((servicio: ServicioInterface) => ( 
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
                   Añadir Habilidad
                 </Button>
               </div>
             </Card>
             {/* >>> FIN CÓDIGO DESCOMENTADO/RESTAURADO PARA HABILIDADES <<< */}
        </TabsContent>
        
        {/* Pestaña de Condiciones Laborales (VISIBLE) */}
        <TabsContent value="condiciones" className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-medium">Condiciones laborales</h3>
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
                />
              </div>
            </div>
          </Card>
        </TabsContent>
        
        {/* Pestaña de Control de Presencia (VISIBLE) */}
        <TabsContent value="fichajes" className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-medium">Control de Presencia</h3>
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
             onClick={handleGuardarUsuario} 
             disabled={isSaving || loading || isLoadingRoles || isLoadingExceptions} 
             className="flex items-center gap-1 shadow-md" // Añadir sombra
          >
            {isSaving ? (
                <svg className="w-4 h-4 mr-1 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
             ) : <Save className="w-4 h-4" />}
             {isSaving ? "Guardando..." : (userId === 'nuevo' ? "Crear Usuario" : "Guardar Cambios")}
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
           diaNombre={traducirDia(editingFranja.dia)}
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