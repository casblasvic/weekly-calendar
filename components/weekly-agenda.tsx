/**
 * ✅ COMPONENTE PRINCIPAL DE AGENDA SEMANAL CON RENDERIZACIÓN OPTIMISTA
 * 
 * ARQUITECTURA COMPLETA DEL SISTEMA:
 * ==================================
 * 
 * 🎯 **PROPÓSITO**: Vista semanal de citas con navegación fluida y cambios instantáneos
 * 
 * 🔄 **RENDERIZACIÓN OPTIMISTA AVANZADA**:
 * - Cambios visibles INMEDIATAMENTE sin esperar API
 * - Cache de React Query actualizado con setQueryData()
 * - Operaciones CRUD sin spinners ni delays
 * - Reversión automática solo en caso de error API
 * 
 * 🚀 **PRE-FETCHING Y CACHE INTELIGENTE**:
 * - Sliding window de 3 semanas (anterior, actual, siguiente)
 * - Datos pre-cargados al cambiar clínica activa
 * - Navegación entre fechas sin loading states
 * - Cache persistente durante sesión del usuario
 * 
 * 🔧 **INTEGRACIÓN CON PRISMA**:
 * - SIEMPRE usar: import { prisma } from '@/lib/db';
 * - Datos de citas con includes optimizados:
 *   * person (cliente), services, equipment (cabina)
 *   * tags, payments, status, notes
 * - Transformación automática de zona horaria
 * 
 * 💾 **HOOKS UTILIZADOS**:
 * - useWeeklyAgendaData(): Cache inteligente + funciones optimistas
 * - useWeeklyAgendaPrefetch(): Pre-carga de semanas adyacentes
 * - useClinic(): Clínica activa + cabinas disponibles
 * - useScheduleBlocks(): Horarios y bloques de la clínica
 * 
 * 🎨 **FUNCIONES OPTIMISTAS DISPONIBLES**:
 * - addOptimisticAppointment(): Crear cita visible al instante
 * - updateOptimisticAppointment(): Editar sin delay
 * - updateOptimisticTags(): Cambiar etiquetas inmediatamente
 * - deleteOptimisticAppointment(): Eliminar sin confirmación
 * - replaceOptimisticAppointment(): Reemplazar temporal con real
 * - removeAllOptimisticAppointments(): Limpiar temporales
 * 
 * 📊 **ESTADOS DE DATOS**:
 * - appointmentsList: Citas procesadas listas para renderizado
 * - loadingAppointments: Solo true en carga inicial
 * - isDataStable: Datos válidos sin "flash" visual
 * - hasData: Indica si hay datos disponibles
 * - prefetchComplete: Sliding window completamente cargado
 * 
 * 🎛️ **OPERACIONES DE CITAS**:
 * - Crear: handleSaveAppointment() → optimista + API
 * - Editar: handleSaveAppointment() → optimista + API  
 * - Eliminar: handleDeleteAppointment() → optimista + API
 * - Cambiar etiquetas: handleTagsUpdate() → optimista + API
 * - Bloquear horarios: handleBlockSchedule() → API directa
 * 
 * ⚠️ REGLAS CRÍTICAS PARA MODIFICACIONES:
 * 1. NUNCA usar setState local para appointments (usar cache hooks)
 * 2. APLICAR cambios optimistas ANTES de llamar API
 * 3. SOLO invalidar cache en caso de error
 * 4. MANTENER keys de cache consistentes
 * 5. MEMOIZAR dependencias para evitar re-renders
 * 6. NO romper el sliding window cache
 * 7. PRESERVAR funcionalidad de navegación fluida
 * 
 * 🔗 **COMPONENTES RELACIONADOS**:
 * - AppointmentDialog: Creación/edición con operaciones optimistas
 * - AppointmentItem: Renderizado individual de citas
 * - BlockScheduleModal: Bloqueo de horarios
 * - ClinicConfigAlert: Alertas de configuración
 * - CurrentTimeIndicator: Línea de tiempo actual
 * 
 * 📱 **FLUJO DE USUARIO COMPLETO**:
 * 1. Usuario accede a agenda → ClinicGuard valida
 * 2. useWeeklyAgendaData carga datos del cache
 * 3. Si no hay cache → useWeeklyAgendaPrefetch carga
 * 4. Usuario ve datos inmediatamente
 * 5. Navegación entre fechas usa cache (instantáneo)
 * 6. Operaciones CRUD aplican cambios optimistas
 * 7. API sincroniza en background
 * 8. Solo revierte en caso de error
 * 
 * 🏗️ **ESTRUCTURA DE DATOS DE CITA**:
 * ```typescript
 * interface Appointment {
 *   id: string;                    // ID único (temp- para optimistas)
 *   name: string;                  // Nombre del cliente
 *   service: string;               // Servicios concatenados
 *   date: Date;                    // Fecha/hora de inicio
 *   startTime: string;             // Hora inicio (HH:mm)
 *   endTime: string;               // Hora fin (HH:mm)
 *   duration: number;              // Duración en minutos
 *   roomId: string;                // ID de cabina/sala
 *   personId: string;              // ID del cliente
 *   services: ServiceRelation[];   // Servicios detallados
 *   tags: string[];                // Etiquetas aplicadas
 *   color: string;                 // Color para UI
 *   phone?: string;                // Teléfono del cliente
 * }
 * ```
 */

"use client"

import React, { useMemo, useEffect, useState, useCallback, useRef } from "react"

import { format, parse, addDays, startOfWeek, isSameDay, differenceInDays, isToday, addWeeks, subWeeks, isSameMonth, parseISO, isBefore, isAfter, startOfDay, endOfDay, getDay, isWithinInterval } from "date-fns"
import { toZonedTime } from "date-fns-tz"
import { es } from "date-fns/locale"
import { useClinic } from "@/contexts/clinic-context"
import { HydrationWrapper } from "@/components/hydration-wrapper"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { AGENDA_CONFIG } from "@/config/agenda-config"
import { CurrentTimeIndicator } from "@/components/current-time-indicator"
import { PersonSearchDialog } from "@/components/client-search-dialog"
import { AppointmentDialog, type Person } from "@/components/appointment-dialog"
import { NewClientDialog } from "@/components/new-client-dialog"
import { ClientQuickViewDialog } from "@/components/client-quick-view-dialog"
import { AppointmentItem } from "./appointment-item"
import { useScheduleBlocks } from "@/contexts/schedule-blocks-context"
import { Lock, AlertTriangle, Calendar as CalendarIcon, Loader2 } from "lucide-react"
import { getDate } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { BlockScheduleModal } from "./block-schedule-modal"
import { WeekSchedule, DaySchedule, TimeRange } from "@/types/schedule"
import { Appointment } from "@/types/appointments"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { ClinicConfigAlert } from "@/components/clinic-config-alert"
import { 
  isBusinessDay as isBusinessDayBase, 
  getBusinessHours as getBusinessHoursBase,
} from "@/services/clinic-schedule-service"
import { Clinic, Cabin, ScheduleTemplateBlock, ClinicScheduleBlock } from '@prisma/client'
import type { CabinScheduleOverride } from '@prisma/client'
// Añadir hooks de precarga para servicios, bonos y paquetes
import { useServicesQuery, useBonosQuery, usePackagesQuery } from "@/lib/hooks/use-api-query"
import { useWeeklyAgendaData, useWeeklyAgendaPrefetch, type WeeklyAgendaAppointment } from "@/lib/hooks/use-weekly-agenda-data"

// Importar nuevos módulos de drag & drop
import { useOptimizedDragAndDrop } from "@/lib/drag-drop/optimized-hooks"
import OptimizedHoverableCell from "@/components/agenda/optimized-hoverable-cell"
import { DragItem, DropResult } from "@/lib/drag-drop/types"
import { getAppointmentDuration } from "@/lib/drag-drop/utils"
import { useGranularity } from "@/lib/drag-drop/granularity-context"
import { DragTimeProvider, useDragTime } from "@/lib/drag-drop/drag-time-context"
import { useMoveAppointment } from "@/contexts/move-appointment-context"
import { MoveAppointmentProvider } from "@/contexts/move-appointment-context"
import { useSmartPlugsFloatingMenu } from "@/hooks/use-smart-plugs-floating-menu"

// Función para generar slots de tiempo
function getTimeSlots(startTime: string, endTime: string, interval = 15): string[] {
  const slots: string[] = []

  // Convertir startTime y endTime a minutos desde medianoche
  const [startHour, startMinute] = startTime.split(":").map(Number)
  const [endHour, endMinute] = endTime.split(":").map(Number)

  const startMinutes = startHour * 60 + startMinute
  const endMinutes = endHour * 60 + endMinute

  // Generar slots de tiempo INCLUYENDO la hora de cierre
  for (let minutes = startMinutes; minutes <= endMinutes; minutes += interval) {
    const hour = Math.floor(minutes / 60)
    const minute = minutes % 60
    const timeSlot = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
    slots.push(timeSlot)
  }

  return slots
}

// Constantes para el estilo cebrado profesional por COLUMNAS
const ZEBRA_LIGHT = "bg-purple-50/20"
const ZEBRA_DARK = "bg-white"

interface WeeklyAgendaProps {
  initialDate?: string
  containerMode?: boolean
  onAppointmentsChange?: (appointments: Appointment[]) => void
  appointments?: Appointment[]
  onAppointmentClick?: (appointmentId: string) => void
}

export default function WeeklyAgenda({
  initialDate = format(new Date(), "yyyy-MM-dd"),
  containerMode = false,
  onAppointmentsChange,
  appointments: initialAppointments = [],
  onAppointmentClick,
}: WeeklyAgendaProps) {
  // ✅ ENVOLVER TODO EN DragTimeProvider DESDE EL PRINCIPIO
  return (
    <DragTimeProvider>
      <WeeklyAgendaContent
        initialDate={initialDate}
        containerMode={containerMode}
        onAppointmentsChange={onAppointmentsChange}
        appointments={initialAppointments}
        onAppointmentClick={onAppointmentClick}
      />
    </DragTimeProvider>
  );
}

// ✅ COMPONENTE INTERNO QUE TIENE ACCESO AL CONTEXTO DragTime
function WeeklyAgendaContent({
  initialDate = format(new Date(), "yyyy-MM-dd"),
  containerMode = false,
  onAppointmentsChange,
  appointments: initialAppointments = [],
  onAppointmentClick,
}: WeeklyAgendaProps) {
  // TEMP: Comentado para eliminar bucle infinito
  // console.log(`[WeeklyAgenda] Component Mounted/Rendered. Initial Date: ${initialDate}`);
  const router = useRouter()
  const { t } = useTranslation()
  const { activeClinic, activeClinicCabins, isLoading: isLoadingClinic, isLoadingCabinsContext, isInitialized } = useClinic()
  const { cabinOverrides, loadingOverrides, fetchOverridesByDateRange } = useScheduleBlocks()
  
  // 🔌 DATOS EN TIEMPO REAL DE ENCHUFES INTELIGENTES
  const smartPlugsData = useSmartPlugsFloatingMenu()
  
  // Precarga de datos para el modal de citas - ejecutar siempre para tenerlos en caché
  const { data: allServicesData = [] } = useServicesQuery({ enabled: true })
  useBonosQuery({ enabled: true })
  usePackagesQuery({ enabled: true })
  
  // TEMP: Comentado para eliminar bucle infinito  
  // console.log("[WeeklyAgenda] activeClinic from context:", activeClinic);
  
  // Añadir state para controlar transiciones
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<'left' | 'right' | null>(null);
  
  // Estado global para controlar cuando se está arrastrando la duración
  const [isDraggingDuration, setIsDraggingDuration] = useState(false);
  
  // Resto de estados existentes
  const [currentDate, setCurrentDate] = useState(() => {
    try {
      return parse(initialDate, "yyyy-MM-dd", new Date())
    } catch (error) {
      return new Date()
    }
  })

  // Usar initialClinic si se proporciona, de lo contrario usar activeClinic del contexto
  // Esto es crucial para evitar ciclos de renderizado cuando cambia activeClinic,
  // ya que podemos recibir una versión estable a través de props
  const effectiveClinic = activeClinic;

  // Añadir una nueva optimización para reducir renderizados innecesarios
  // Cerca del inicio del componente, justo después de las referencias al useClinic
  const prevDateRef = useRef<string | null>(null);
  const needsFullRerenderRef = useRef(false);

  // ✅ NUEVO SISTEMA DE CACHE: Reemplazar estado manual con hooks inteligentes
  const {
    appointments: cachedAppointments,
    isLoading: loadingAppointments,
    isDataStable,
    fetchAppointments: refetchFromCache,
    invalidateCache,
    weekKey,
    hasData,
    // ✅ FUNCIONES OPTIMISTAS GLOBALES
    addOptimisticAppointment,
    updateOptimisticAppointment,
    updateOptimisticTags,
    deleteOptimisticAppointment,
    replaceOptimisticAppointment,
    removeAllOptimisticAppointments
  } = useWeeklyAgendaData(currentDate);
  

  
  // ✅ PREFETCH SLIDING WINDOW automático para navegación fluida
  const { allLoaded: prefetchComplete } = useWeeklyAgendaPrefetch(currentDate);
  
  // ✅ MEMORIZAR DEPENDENCIAS ESPECÍFICAS para evitar re-cálculos innecesarios
  const activeClinicId = activeClinic?.id;
  const templateBlocks = activeClinic?.linkedScheduleTemplate?.blocks;
  const independentBlocks = activeClinic?.independentScheduleBlocks;
  const formattedCurrentDate = format(currentDate, 'yyyy-MM-dd');
  const cabinsCount = activeClinicCabins?.length ?? 0;
  const cabinsIds = activeClinicCabins?.map(c => c.id).join(',') ?? '';
  
  // ✅ SIMPLIFICADO: Usar directamente cachedAppointments del hook con cache estable
  const appointmentsList = useMemo(() => {
    const appointments = (cachedAppointments as any) || [];
    // ✅ DEBUG temporal comentado para reducir spam
    // console.log('[WeeklyAgenda] 🔍 appointmentsList recalculado:', appointments.length, 'citas');
    
    return appointments;
  }, [cachedAppointments]);
  

  
  // Flag para evitar recargas innecesarias después de actualizaciones optimistas
  // ✅ skipNextFetch eliminado - ya no necesario con sistema optimista global
  
  // ✅ FUNCIÓN DE COMPATIBILIDAD: Usar refetch del cache
  const fetchAppointments = useCallback(async () => {
    // console.log('[WeeklyAgenda] 🔄 fetchAppointments called - usando cache hook'); // Log optimizado
    if (!activeClinic?.id) {
      console.log('[WeeklyAgenda] No activeClinic ID, skipping fetch');
      return;
    }
    
    // ✅ USAR REFETCH DEL HOOK en lugar de fetch manual
    try {
      await refetchFromCache();
      // console.log('[WeeklyAgenda] ✅ Refetch desde cache completado'); // Log optimizado
    } catch (error) {
      console.error('[WeeklyAgenda] ❌ Error en refetch desde cache:', error);
    }
    return; // ✅ SALIR TEMPRANO - el resto de la función se puede eliminar gradualmente
    
    // 🗑️ CÓDIGO LEGACY - mantener temporalmente para compatibilidad
    try {
      const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
      const endDate = addDays(startDate, 6);
      
      const url = `/api/appointments?clinicId=${activeClinic.id}&startDate=${format(startDate, 'yyyy-MM-dd')}&endDate=${format(endDate, 'yyyy-MM-dd')}`;
      console.log('[WeeklyAgenda] Fetching appointments from:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) throw new Error('Error fetching appointments');
      
      const data = await response.json();
      console.log('[WeeklyAgenda] Received appointments:', data);
      
      // Procesar las citas para el formato esperado por la agenda
      const processedAppointments = data.map((apt: any) => {
        const clinicTz = (activeClinic as any)?.countryInfo?.timezone || (activeClinic as any)?.country?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
        const startUtc = parseISO(apt.startTime);
        const endUtc = parseISO(apt.endTime);
        const startTime = toZonedTime(startUtc, clinicTz);
        const endTime = toZonedTime(endUtc, clinicTz);
        
        // Determinar el color basado en los servicios
        let appointmentColor = '#9CA3AF'; // Color por defecto (gris)
        
        console.log('[WeeklyAgenda] 🎨 fetchAppointments - Servicios para', apt.id, ':', apt.services);
        console.log('[WeeklyAgenda] 🎨 fetchAppointments - Equipment para', apt.id, ':', apt.equipment);
        
        if (apt.services && apt.services.length > 0) {
          // Si todos los servicios son del mismo tipo, usar ese color
          const serviceTypes = new Set(apt.services.map((s: any) => s.service?.categoryId));
          const uniqueColors = new Set(apt.services.map((s: any) => s.service?.colorCode).filter(Boolean));
          
          console.log('[WeeklyAgenda] 🎨 fetchAppointments - Service types para', apt.id, ':', Array.from(serviceTypes));
          console.log('[WeeklyAgenda] 🎨 fetchAppointments - Unique colors para', apt.id, ':', Array.from(uniqueColors));
          
          if (serviceTypes.size === 1 && uniqueColors.size === 1) {
            // Todos los servicios del mismo tipo - usar el color del servicio
            const firstColor = Array.from(uniqueColors)[0];
            appointmentColor = (typeof firstColor === 'string' ? firstColor : null) || appointmentColor;
            console.log('[WeeklyAgenda] 🎨 fetchAppointments - Color de servicio único para', apt.id, ':', appointmentColor);
          } else if (apt.equipment?.color) {
            // Múltiples tipos de servicios - usar el color de la cabina
            appointmentColor = apt.equipment.color;
            console.log('[WeeklyAgenda] 🎨 fetchAppointments - Color de cabina para', apt.id, ':', appointmentColor);
          } else {
            console.log('[WeeklyAgenda] 🎨 fetchAppointments - Sin color específico para', apt.id, ', usando gris por defecto');
          }
        } else {
          console.log('[WeeklyAgenda] 🎨 fetchAppointments - Sin servicios para', apt.id, ', usando gris por defecto');
        }
        
        return {
          id: apt.id,
          name: `${apt.person.firstName} ${apt.person.lastName}`,
          service: apt.services?.map((s: any) => s.service?.name).filter(Boolean).join(", ") || 'Sin servicio',
          date: startTime,
          roomId: apt.roomId, // SIEMPRE usar roomId para cabinas
          startTime: format(startTime, 'HH:mm'),
          endTime: format(endTime, 'HH:mm'), // Agregar hora de fin en formato HH:mm
          duration: Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60)),
          color: appointmentColor,
          phone: apt.person.phone,
          services: apt.services || [],
          tags: apt.tags?.map((tagRelation: any) => tagRelation.tagId || tagRelation) || [], // Corregir formato de etiquetas
          // Información adicional para la vista detallada
          notes: apt.notes,
        };
      }) as Appointment[];
      
      const dedupedAppointments = Array.from(new Map(processedAppointments.map((a: Appointment) => [a.id, a])).values());
      
      // ✅ COMENTADO: Usar sistema de cache del hook, no setState local
      // setAppointments(dedupedAppointments);
      console.log('[WeeklyAgenda] ⚠️ LEGACY: fetchAppointments procesado pero no usado (hook maneja cache):', dedupedAppointments.length);
    } catch (error) {
      console.error('[WeeklyAgenda] Error fetching appointments:', error);
      // Podríamos mostrar un toast de error aquí
    } finally {
      // ✅ loadingAppointments ahora se maneja automáticamente por el hook
    }
  }, [activeClinic?.id, format(currentDate, 'yyyy-MM-dd')]);
  
  // Fetch appointments cuando cambia la clínica o la semana
  useEffect(() => {
    // console.log('[WeeklyAgenda] useEffect triggered - activeClinic:', activeClinicId, 'currentDate:', formattedCurrentDate); // Log optimizado
    if (activeClinicId) {
      fetchAppointments();
    }
  }, [activeClinicId, formattedCurrentDate, fetchAppointments]); // ✅ Usar variables memorizadas
  
  // Estados para diálogos y selección
  const [selectedSlot, setSelectedSlot] = useState<{
    date: Date
    time: string
    roomId: string
  } | null>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showClientDetailsOnOpen, setShowClientDetailsOnOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Person | null>(null)
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false)
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false)
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false)
  const [isClientQuickViewOpen, setIsClientQuickViewOpen] = useState(false)
  const [selectedClientForQuickView, setSelectedClientForQuickView] = useState<Person | null>(null)

  // Nueva función para manejar el click de nuevo cliente
  const handleNewClientClick = useCallback(() => {
    setIsNewClientDialogOpen(true);
  }, []);

  // NUEVO: Estado para CabinScheduleOverride seleccionado
  const [selectedOverride, setSelectedOverride] = useState<CabinScheduleOverride | null>(null);
  // NUEVO: Estado para controlar la visibilidad del modal de bloqueo/override
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);

  // Obtener configuración de granularidad desde el contexto
  const { minuteGranularity, slotDuration, moveGranularity } = useGranularity();
  
  // ✅ Hook para mover citas - LLAMADA ÚNICA para evitar instancias múltiples del contexto
  const { startMovingAppointment, appointmentInMovement, isMovingAppointment, registerOptimisticFunctions, unregisterOptimisticFunctions } = useMoveAppointment();

  // ✅ REGISTRAR FUNCIONES OPTIMISTAS CON EL CONTEXTO
  useEffect(() => {
    registerOptimisticFunctions({
      updateOptimisticAppointment,
      invalidateCache
    });

    // Cleanup: desregistrar al desmontar
    return () => {
      unregisterOptimisticFunctions();
    };
  }, [registerOptimisticFunctions, unregisterOptimisticFunctions, updateOptimisticAppointment, invalidateCache]);

  // ✅ CALLBACK PARA MOVIMIENTO OPTIMISTA DE CITAS
  const handleMoveComplete = useCallback(async (
    originalAppointment: any,
    newDate: Date,
    newTime: string,
    newRoomId: string
  ): Promise<boolean> => {
    console.log('[WeeklyAgenda] 🚀 Movimiento de cita confirmado:', {
      appointmentId: originalAppointment.id,
      from: { date: originalAppointment.date, time: originalAppointment.startTime, roomId: originalAppointment.roomId },
      to: { date: newDate, time: newTime, roomId: newRoomId }
    });

    try {
      // ✅ RENDERIZADO OPTIMISTA INMEDIATO
      const [hours, minutes] = newTime.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + originalAppointment.duration;
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      const newEndTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

      updateOptimisticAppointment(originalAppointment.id, {
        date: newDate,
        startTime: newTime,
        endTime: newEndTime,
        roomId: newRoomId
      });

      console.log('[WeeklyAgenda] ✅ Cita movida optimísticamente');
      return true;

    } catch (error) {
      console.error('[WeeklyAgenda] ❌ Error en movimiento optimista:', error);
      return false;
    }
  }, [updateOptimisticAppointment]);

  // Efecto para notificar al componente padre sobre el cambio en las citas
  useEffect(() => {
    if (onAppointmentsChange) {
      onAppointmentsChange(appointmentsList)
    }
  }, [appointmentsList, onAppointmentsChange])

  // --- Derive CORRECT schedule and related config --- 
  const correctSchedule = useMemo(() => {
      if (!activeClinicId) return null;
      
      // console.log("[WeeklyAgenda useMemo] Deriving correct schedule from activeClinic:", activeClinicId);
      
      let blocksToUse: (ScheduleTemplateBlock | ClinicScheduleBlock)[] | undefined | null = null;
      
      if (templateBlocks && templateBlocks.length > 0) {
          // console.log("[WeeklyAgenda useMemo] Using template blocks.");
          blocksToUse = templateBlocks;
      } else if (independentBlocks && independentBlocks.length > 0) {
          // console.log("[WeeklyAgenda useMemo] Using independent blocks.");
          blocksToUse = independentBlocks;
      } else {
          // console.log("[WeeklyAgenda useMemo] No blocks found, returning empty schedule.");
          // No need for defaultOpen/Close here, converter handles null blocks
          return convertBlocksToWeekSchedule(null); // Pass only blocks
      }
      
      return convertBlocksToWeekSchedule(blocksToUse); // Pass only blocks
      
  }, [activeClinicId, templateBlocks, independentBlocks]); // ✅ Dependencias específicas

  // REMOVE const schedule = useMemo(() => activeClinic?.scheduleJson as unknown as WeekSchedule | null, [activeClinic?.scheduleJson]);
  
  // --- Time Slot Generation using useMemo (adjust loop) --- 
  const timeSlots = useMemo(() => {
      if (!activeClinicId || !correctSchedule) {
          console.log("[WeeklyAgenda timeSlots] No active clinic or no derived schedule, returning empty slots.");
          return []; 
      }

      // Inicializar con valores extremos para asegurar que el primer rango válido los reemplace
      let overallEarliestStart = "23:59"; 
      let overallLatestEnd = "00:00";
      let hasAnyRange = false;
      // console.log(`[WeeklyAgenda timeSlots] Initial extreme times: ${overallEarliestStart} - ${overallLatestEnd}`);

      // Usar el horario derivado (puede ser de plantilla o independiente)
      const scheduleToUse = correctSchedule; // Ya calculado en useMemo anterior
      
      // console.log("[WeeklyAgenda timeSlots] Checking ranges in schedule:", JSON.stringify(scheduleToUse, null, 2));
      Object.values(scheduleToUse).forEach(day => {
          const daySchedule = day as DaySchedule; 
          if (daySchedule.isOpen && daySchedule.ranges.length > 0) {
              daySchedule.ranges.forEach(range => {
                  // Solo procesar rangos válidos
                  if (range.start && range.end && range.start < range.end) {
                      hasAnyRange = true; // Marcar que encontramos al menos un rango válido
                      // Comparar con los encontrados hasta ahora
                      if (range.start < overallEarliestStart) {
                          // console.log(`[WeeklyAgenda timeSlots] Found earlier start range: ${range.start} < ${overallEarliestStart}`);
                          overallEarliestStart = range.start;
                      }
                      if (range.end > overallLatestEnd) {
                          // console.log(`[WeeklyAgenda timeSlots] Found later end range: ${range.end} > ${overallLatestEnd}`);
                          overallLatestEnd = range.end;
                      }
                  }
              });
          }
      });
      
      // Si NO se encontraron rangos VÁLIDOS después de revisar el schedule, retornar vacío
      if (!hasAnyRange) {
           console.warn("[WeeklyAgenda timeSlots] No valid time ranges found in the schedule. Returning empty slots.");
           return [];
      }

      // console.log(`[WeeklyAgenda timeSlots] Final calculated range for slots: ${overallEarliestStart} to ${overallLatestEnd}`);
      
      // Obtener slotDuration del contexto useGranularity
      const currentSlotDuration = slotDuration;

      // Generar slots con el rango calculado final y la duración correcta
      return getTimeSlots(overallEarliestStart, overallLatestEnd, currentSlotDuration);

  }, [activeClinicId, correctSchedule, slotDuration]); // ✅ Incluir activeClinicId para más estabilidad
  // --- End Time Slot Generation Adjustment ---

  // Obtener cabinas activas directamente de activeClinicCabins del contexto useClinic
  const activeCabins = useMemo(() => {
    // Asegurar que activeClinicCabins no sea null/undefined
    // console.log("[WeeklyAgenda] useMemo - Recalculando activeCabins. Cantidad:", cabinsCount);
    return activeClinicCabins?.filter(cabin => cabin.isActive).sort((a, b) => a.order - b.order) ?? []; 
  }, [activeClinicCabins, cabinsCount, cabinsIds]); // ✅ Dependencias más específicas

  // ✅ ESPERAR A QUE LA INICIALIZACIÓN ESTÉ COMPLETA
  if (!isInitialized) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 text-purple-600 animate-spin" /> Inicializando clínicas...</div>;
  }

  // Considerar el estado de carga de la clínica Y de las cabinas del contexto
  if (isLoadingClinic || isLoadingCabinsContext) { 
      console.log(`[WeeklyAgenda] Mostrando carga: isLoadingClinic=${isLoadingClinic}, isLoadingCabinsContext=${isLoadingCabinsContext}`);
      return <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 text-purple-600 animate-spin" /> Cargando datos de clínica/cabinas...</div>;
  }
  
  // Añadir una comprobación explícita por si activeClinicCabins es null/undefined después de la carga (error inesperado)
  if (!activeClinicCabins) {
      console.error("[WeeklyAgenda] Error: activeClinicCabins es null/undefined después de la carga.");
      return <div className="flex justify-center items-center h-full text-red-600">Error al cargar la configuración de cabinas.</div>;
  }
  
  // Verificar si no hay clínica activa
  if (!activeClinic) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="p-8 text-center">
          <h3 className="mb-2 text-lg font-medium text-gray-700">
            {t('agenda.noActiveClinic')}
          </h3>
        </div>
      </div>
    );
  }
  
  // Verificar si no hay horario configurado
  if (timeSlots.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="p-8 text-center">
          <h3 className="mb-2 text-lg font-medium text-gray-700">
            {t('agenda.noScheduleConfigured.title')}
          </h3>
          <p className="mb-4 text-gray-500">
            {t('agenda.noScheduleConfigured.description')}
          </p>
          <Button
            onClick={() => router.push(`/configuracion/clinicas/${activeClinic.id}?tab=horarios`)}
            className="text-white bg-purple-600 hover:bg-purple-700"
          >
            {t('agenda.noScheduleConfigured.action')}
          </Button>
        </div>
      </div>
    );
  }
  
  // Verificar si no hay cabinas configuradas
  if (activeCabins.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="p-8 text-center">
          <h3 className="mb-2 text-lg font-medium text-gray-700">
            {t('agenda.noCabinsConfigured.title')}
          </h3>
          <p className="mb-4 text-gray-500">
            {t('agenda.noCabinsConfigured.description')}
          </p>
          <Button
            onClick={() => router.push(`/configuracion/clinicas/${activeClinic.id}?tab=cabinas`)}
            className="text-white bg-purple-600 hover:bg-purple-700"
          >
            {t('agenda.noCabinsConfigured.action')}
          </Button>
        </div>
      </div>
    );
  }

  // Función para verificar si un día está activo en la configuración
  const getDayKey = useCallback((date: Date) => {
    const day = format(date, "EEEE", { locale: es }).toLowerCase();
    const dayMap = {
      lunes: "monday",
      martes: "tuesday",
      miércoles: "wednesday",
      jueves: "thursday",
      viernes: "friday",
      sábado: "saturday",
      domingo: "sunday",
    } as const;
    return dayMap[day as keyof typeof dayMap] || day;
  }, []);

  const isDayActive = useCallback((date: Date) => {
    const dayKey = getDayKey(date);
    let isActive = false;
    try {
      const daySchedule = correctSchedule?.[dayKey as keyof WeekSchedule];
      
      // Si no hay configuración para ese día, no está activo
      if (!daySchedule) return false;
      
      // Si está explícitamente marcado como isOpen: true, está activo
      if (daySchedule.isOpen === true) return true;
      
      // Si tiene rangos configurados y al menos uno válido, está activo
      if (daySchedule.ranges && daySchedule.ranges.length > 0) {
        // Comprobar que al menos un rango tenga horas válidas
        return daySchedule.ranges.some(range => range.start && range.end);
      }
      
      // En cualquier otro caso, no está activo
      return false;
    } catch (error) {
      console.error("[WeeklyAgenda] Error in isDayActive:", error);
      return false;
    }
  }, [correctSchedule, getDayKey]);

  // Función para verificar si un horario está disponible
  const isTimeSlotAvailable = useCallback((date: Date, time: string) => {
    const dayKey = getDayKey(date);
    let isAvailable = false;
    try {
      const daySchedule = correctSchedule?.[dayKey as keyof WeekSchedule];
      if (!daySchedule || !daySchedule.isOpen || !daySchedule.ranges) {
        isAvailable = false;
      } else {
        isAvailable = daySchedule.ranges.some((range) => time >= range.start && time < range.end);
      }
      // console.log(`[WeeklyAgenda] isTimeSlotAvailable check for ${format(date, 'yyyy-MM-dd')} ${time} (key: ${dayKey}): ${isAvailable}`);
    } catch (error) {
      console.error("[WeeklyAgenda] Error in isTimeSlotAvailable:", error);
    }
    return isAvailable;
  }, [correctSchedule, getDayKey]);

  // Referencia para el contenedor de la agenda
  const agendaRef = useRef<HTMLDivElement>(null)
  const gridContainerRef = useRef<HTMLDivElement>(null)

  // Calcular los días de la semana
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const monday = startOfWeek(currentDate, { weekStartsOn: 1 })
    return addDays(monday, i)
  })

  const { toast } = useToast()

  // Añadir este estado cerca de los otros estados al inicio del componente
  const [updateKey, setUpdateKey] = useState(0)

  // Efecto para realizar limpieza cuando el componente se desmonta o cambia de clínica
  useEffect(() => {
    // console.log("[WeeklyAgenda] Inicializado con clínica:", effectiveClinic?.id); // Log optimizado
    
    // ✅ RESETEAR AUTO-SCROLL cuando cambia la clínica para permitir scroll en nueva clínica
    hasAutoScrolledRef.current = false;
    
    // Esta función se ejecutará al desmontar el componente o cuando cambie effectiveClinic
    return () => {
      // console.log("[WeeklyAgenda] Limpiando recursos para clínica:", effectiveClinic?.id); // Log optimizado
      
      // Limpiar todos los estados con datos específicos de la clínica
      setSelectedOverride(null);
      setIsOverrideModalOpen(false);
      setSelectedSlot(null);
      setSelectedClient(null);
      setIsSearchDialogOpen(false);
      setIsAppointmentDialogOpen(false);
      setIsNewClientDialogOpen(false);
      setIsClientQuickViewOpen(false);
      setSelectedClientForQuickView(null);
      
      // Reiniciar otros estados sensibles a la clínica
      
      // Forzar limpieza de memory heap
      if (typeof window !== 'undefined') {
        try {
          // Sugerir al garbage collector que se ejecute (solo es una sugerencia)
          if (window.gc) {
            window.gc();
          }
        } catch (e) {
          // Ignorar errores - gc() no está disponible en todos los navegadores
        }
      }
    };
  }, [effectiveClinic?.id]);

  // --- NUEVO useEffect para cargar overrides --- 
  useEffect(() => {
    if (effectiveClinic?.id) {
      // console.log("[WeeklyAgenda] useEffect - Fetching overrides for week starting:", format(startOfWeek(currentDate, { weekStartsOn: 1 }), "yyyy-MM-dd")); // Log optimizado
      const monday = startOfWeek(currentDate, { weekStartsOn: 1 });
      const sunday = addDays(monday, 6);
      const startDate = format(monday, "yyyy-MM-dd");
      const endDate = format(sunday, "yyyy-MM-dd");
      fetchOverridesByDateRange(String(effectiveClinic.id), startDate, endDate);
    } else {
      console.log("[WeeklyAgenda] useEffect - Cannot fetch overrides, no effectiveClinic.id");
    }
    // Depender de currentDate y effectiveClinic.id para recargar al cambiar semana o clínica
  }, [currentDate, effectiveClinic?.id, fetchOverridesByDateRange]);
  // --- FIN NUEVO useEffect ---

  // ✅ AUTO-SCROLL SIMPLE Y DIRECTO - SIN COMPLEJIDAD INNECESARIA
  const hasAutoScrolledRef = useRef(false);
  const autoScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // ✅ CÁLCULO DE POSICIÓN INICIAL PARA RENDERIZADO DIRECTO
  const calculateInitialScrollPosition = useCallback(() => {
    if (timeSlots.length === 0) return 0;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    
    const clinicOpenTime = timeSlots[0];
    const clinicCloseTime = timeSlots[timeSlots.length - 1];
    
    // Si está fuera de horario, posicionar al inicio
    if (currentTimeString < clinicOpenTime || currentTimeString > clinicCloseTime) {
      return 0;
    }

    // Calcular posición basada en la hora actual
    const roundedMinute = Math.floor(currentMinute / 15) * 15;
    const targetTime = `${currentHour.toString().padStart(2, '0')}:${roundedMinute.toString().padStart(2, '0')}`;
    
    // Encontrar el índice del slot de tiempo objetivo
    const targetIndex = timeSlots.findIndex(slot => slot === targetTime);
    
    if (targetIndex !== -1) {
      // Calcular posición aproximada (altura de fila * índice) - centrar en viewport
      const rowHeight = 40; // Altura estándar de fila
      const targetPosition = targetIndex * rowHeight;
      const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 600;
      
      // Centrar la posición objetivo en el viewport
      return Math.max(0, targetPosition - (viewportHeight / 2));
    }
    
    return 0;
  }, [timeSlots]);

  const positionToCurrentTime = useCallback(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    
    // Verificar si estamos en horario de clínica
    if (timeSlots.length === 0) {
      console.log('[WeeklyAgenda] No hay timeSlots configurados, no posicionar');
      hasAutoScrolledRef.current = true;
      return;
    }
    
    const clinicOpenTime = timeSlots[0];
    const clinicCloseTime = timeSlots[timeSlots.length - 1];
    
    if (currentTimeString < clinicOpenTime || currentTimeString > clinicCloseTime) {
      console.log('[WeeklyAgenda] Fuera de horario de clínica, no posicionar');
      hasAutoScrolledRef.current = true;
      return;
    }

    if (!agendaRef.current) {
      hasAutoScrolledRef.current = true;
      return;
    }

    // ✅ BUSCAR HORA ACTUAL CON PRECISIÓN DE 15 MINUTOS
    const roundedMinute = Math.floor(currentMinute / 15) * 15;
    const targetTime = `${currentHour.toString().padStart(2, '0')}:${roundedMinute.toString().padStart(2, '0')}`;
    const targetElement = agendaRef.current.querySelector(`[data-time="${targetTime}"]`);
    
    if (targetElement) {
      // ✅ POSICIONAMIENTO DIRECTO SIN ANIMACIÓN para máxima estabilidad
      targetElement.scrollIntoView({ 
        behavior: 'auto',    // ✅ Sin animación - posicionamiento inmediato
        block: 'center',     // ✅ Centrar verticalmente para mejor UX
        inline: 'nearest'    // ✅ Sin scroll horizontal
      });
      
      console.log('[WeeklyAgenda] 📍 AUTO-SCROLL DIRECTO en:', targetTime);
    } else {
      // ✅ FALLBACK: Buscar la hora más cercana
      const hourElements = Array.from(agendaRef.current.querySelectorAll('[data-time]'));
      const currentTotalMinutes = currentHour * 60 + currentMinute;
      
      let closestElement: Element | null = null;
      let closestDiff = Infinity;
      
      for (const element of hourElements) {
        const timeAttribute = element.getAttribute('data-time');
        if (!timeAttribute) continue;
        
        const [elementHour, elementMinute] = timeAttribute.split(':').map(Number);
        const elementTotalMinutes = elementHour * 60 + elementMinute;
        const diff = Math.abs(elementTotalMinutes - currentTotalMinutes);
        
        if (diff < closestDiff) {
          closestDiff = diff;
          closestElement = element;
        }
      }
      
      if (closestElement) {
        closestElement.scrollIntoView({ 
          behavior: 'auto', 
          block: 'center', 
          inline: 'nearest' 
        });
        console.log('[WeeklyAgenda] 📍 AUTO-SCROLL DIRECTO en hora más cercana');
      }
    }
    
    // ✅ MARCAR COMO COMPLETADO
    hasAutoScrolledRef.current = true;
  }, [timeSlots]);
  
  // ✅ POSICIONAMIENTO INICIAL DIRECTO - SIN DELAY NI AUTO-SCROLL POSTERIOR
  useEffect(() => {
    if (!timeSlots.length || hasAutoScrolledRef.current) return;
    
    // ✅ POSICIONAMIENTO INMEDIATO EN EL PRIMER RENDERIZADO
    const initialPosition = calculateInitialScrollPosition();
    
    if (agendaRef.current && initialPosition > 0) {
      // ✅ ESTABLECER POSICIÓN INICIAL INMEDIATAMENTE SIN ANIMACIÓN
      agendaRef.current.scrollTop = initialPosition;
      console.log('[WeeklyAgenda] 📍 POSICIONAMIENTO INICIAL DIRECTO en posición:', initialPosition);
    }
    
    // ✅ SI NECESITAMOS PRECISIÓN PERFECTA, USAMOS requestAnimationFrame PARA EL SIGUIENTE FRAME
    requestAnimationFrame(() => {
      if (agendaRef.current && !hasAutoScrolledRef.current) {
        positionToCurrentTime();
      }
    });
    
    hasAutoScrolledRef.current = true;
  }, [activeClinicId, timeSlots, calculateInitialScrollPosition, positionToCurrentTime]);
  
  // ✅ RESETEAR auto-scroll cuando cambie la clínica
  useEffect(() => {
    hasAutoScrolledRef.current = false;
  }, [activeClinicId]);

  // Funciones para manejar citas
  const handleCellClick = (day: Date, time: string, roomId: string) => {
    // Usar la hora exacta del hover si está disponible, sino usar la hora del slot
    // const exactTime = hoveredCell && 
    //                   hoveredCell.day.getTime() === day.getTime() && 
    //                   hoveredCell.cabinId === roomId 
    //                   ? hoveredCell.exactTime 
    //                   : time;
    
    console.log("[WeeklyAgenda] handleCellClick called with:", { day, time, roomId });
    
    // ✅ BLOQUEAR CREACIÓN DE NUEVAS CITAS SI HAY UNA CITA EN MOVIMIENTO
    if (appointmentInMovement) {
      console.log('[WeeklyAgenda] 🚫 Bloqueando creación de nueva cita - hay una cita en movimiento');
      return;
    }
    
    // Verificar si la celda está bloqueada por un override
    const dayString = format(day, "yyyy-MM-dd")
    const overrideForCell = findOverrideForCell(day, time, roomId); // Usar la nueva función

    if (overrideForCell) { // Check if the clicked cell itself is blocked
      // Si está bloqueada, abrimos el modal de bloqueo con los datos
      setSelectedOverride(overrideForCell); // Pass the actual override data
      setIsOverrideModalOpen(true); // Open the correct modal for overrides
      return // No continuar con la lógica de creación de cita
    }

    // Código original para abrir el modal de cita (solo si no está bloqueada y es disponible)
    if (!isTimeSlotAvailable(day, time)) return

    const cabin = activeCabins.find((c) => {
      const cabinId = String(c.id)
      const targetId = String(roomId)
      return cabinId === targetId
    })

    if (cabin && cabin.isActive) {
      console.log("[WeeklyAgenda] Setting selectedSlot and opening search dialog");
      setSelectedSlot({ date: day, time, roomId })
      setIsSearchDialogOpen(true)
    }
  }

  // --- Modificar handleClientSelect para aceptar tipo Person --- 
  const handleClientSelect = (person: any) => { 
    console.log("[WeeklyAgenda] Person selected:", person);
    console.log("[WeeklyAgenda] Current selectedSlot:", selectedSlot);
    
    // Convertir Person a formato Person esperado por AppointmentDialog
    const client: Person = {
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      phone: person.phone || '',
      email: person.email,
      address: person.address || '',
      city: person.city,
      postalCode: person.postalCode,
      countryIsoCode: person.countryIsoCode
    };
    
    console.log("[WeeklyAgenda] Setting selectedClient and opening appointment dialog");
    setSelectedClient(client);
    setIsSearchDialogOpen(false);
    setIsAppointmentDialogOpen(true); // Abrir el modal de citas después de seleccionar el cliente
  };

  // ✅ ELIMINACIÓN OPTIMISTA COMPLETA
  const handleDeleteAppointment = useCallback(async (appointmentId: string, showConfirm: boolean = true) => {
    console.log('[WeeklyAgenda] 🗑️ Iniciando eliminación optimista:', appointmentId);
    
    // ✅ MOSTRAR CONFIRMACIÓN SI SE REQUIERE
    if (showConfirm && !confirm('¿Estás seguro de que deseas eliminar esta cita?')) {
      return;
    }

    try {
      // ✅ BUSCAR CITA A ELIMINAR
      const appointmentToDelete = appointmentsList.find(app => app.id === appointmentId);
      if (!appointmentToDelete) {
        console.error('[WeeklyAgenda] 🗑️ Cita no encontrada:', appointmentId);
        return;
      }

      console.log('[WeeklyAgenda] 🗑️ Cita encontrada para eliminar:', appointmentToDelete.name);

      // ✅ ELIMINACIÓN OPTIMISTA GLOBAL - Visible inmediatamente en AMBAS vistas
      console.log('[WeeklyAgenda] 🗑️ Aplicando eliminación optimista global...');
      deleteOptimisticAppointment(appointmentId);

      // ✅ LLAMAR API EN BACKGROUND
      console.log('[WeeklyAgenda] 🗑️ Llamando API DELETE en background...');
      const response = await fetch(`/api/appointments?id=${appointmentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar la cita');
      }

      console.log('[WeeklyAgenda] 🗑️ Cita eliminada exitosamente de la API');
      
    } catch (error) {
      console.error('[WeeklyAgenda] 🗑️ Error en eliminación:', error);
      
      // ✅ REVERTIR ELIMINACIÓN OPTIMISTA GLOBAL
      console.log('[WeeklyAgenda] 🗑️ Revirtiendo eliminación optimista...');
      await invalidateCache(); // Recargar desde API para restaurar estado correcto
      
      // ✅ MOSTRAR ERROR AL USUARIO
      const errorMessage = error instanceof Error ? error.message : 'Error al eliminar la cita';
      alert(errorMessage);
    }
  }, [appointmentsList, deleteOptimisticAppointment, invalidateCache])

  const handleSaveAppointment = useCallback(
     async (appointmentData: { 
       id?: string; // ID opcional para cuando es edición
       client: { name: string; phone: string };
       services: any[]; // Ajustar tipo según sea necesario
       time: string;
       comment?: string;
       tags?: string[]; // Añadir etiquetas al tipo
     }) => {
      if (selectedSlot) {
        const isUpdate = !!appointmentData.id;
        
        try {
          const method = isUpdate ? 'PUT' : 'POST';
          
          // Los datos ya vienen en el formato correcto del modal
          const response = await fetch('/api/appointments', {
            method: method,
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(appointmentData),
          });

          if (!response.ok) {
            throw new Error(isUpdate ? 'Error updating appointment' : 'Error creating appointment');
          }

          const savedAppointment = await response.json();
          
          // Convertir las fechas string a objetos Date
          const startTime = new Date(savedAppointment.startTime);
          const endTime = new Date(savedAppointment.endTime);
          
          // Determinar el color basado en los servicios creados
          let appointmentColor = '#9CA3AF'; // Color por defecto
          if (savedAppointment.services && savedAppointment.services.length > 0) {
            const serviceTypes = new Set(savedAppointment.services.map((s: any) => s.service?.categoryId));
            const uniqueColors = new Set(savedAppointment.services.map((s: any) => s.service?.colorCode).filter(Boolean));
            
            if (serviceTypes.size === 1 && uniqueColors.size === 1) {
              const firstColor = Array.from(uniqueColors)[0];
              appointmentColor = (typeof firstColor === 'string' ? firstColor : null) || appointmentColor;
            } else if (savedAppointment.equipment?.color) {
              appointmentColor = savedAppointment.equipment.color;
            }
          }
          
          // Obtener los IDs de las etiquetas de la respuesta
          const tagIds = savedAppointment.tags?.map((tagRelation: any) => tagRelation.tagId) || [];
          
          // Convertir la cita creada al formato esperado por la agenda
          const newAppointment: Appointment = {
            id: savedAppointment.id,
            name: `${savedAppointment.person.firstName} ${savedAppointment.person.lastName}`,
            service: savedAppointment.services.map((s: any) => s.service.name).join(", "),
            date: startTime, // Date object
            roomId: savedAppointment.roomId, // SIEMPRE usar roomId para cabinas
            clinicId: savedAppointment.clinicId || activeClinic?.id || '', // 🆕 AÑADIR clinicId
            startTime: format(startTime, 'HH:mm'), // Formato HH:mm esperado por la agenda
            duration: Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60)), // Convertir string ISO a Date antes de calcular
            color: appointmentColor,
            phone: savedAppointment.person.phone,
            services: savedAppointment.services || [],
            tags: tagIds, // Añadir las etiquetas
          };
          
          // ✅ RENDERIZADO OPTIMISTA GLOBAL - Unificado con DayView
          console.log('[WeeklyAgenda] 🚀 Aplicando cambio optimista global...');
          
          if (isUpdate) {
            // Actualizar cita existente de forma optimista
            updateOptimisticAppointment(newAppointment.id, {
              name: newAppointment.name,
              service: newAppointment.service,
              startTime: newAppointment.startTime,
              duration: newAppointment.duration,
              tags: newAppointment.tags || [],
              color: newAppointment.color
            });
          } else {
            // ✅ CREAR NUEVA CITA CON DATOS REALES DIRECTAMENTE
            console.log('[WeeklyAgenda] ✅ Creando cita con datos reales de API');
            
            const realAppointment = {
              id: newAppointment.id, // ✅ ID REAL de la API
              name: newAppointment.name,
              service: newAppointment.service || 'Nuevo servicio',
              startTime: newAppointment.startTime,
              endTime: newAppointment.endTime || newAppointment.startTime,
              date: newAppointment.date,
              duration: newAppointment.duration,
              roomId: newAppointment.roomId,
              clinicId: newAppointment.clinicId || activeClinic?.id || '', // 🆕 AÑADIR clinicId
              color: newAppointment.color || (activeCabins.find(c => c.id === newAppointment.roomId)?.color) || '#8B5CF6',
              phone: newAppointment.phone || '',
              services: newAppointment.services || [],
              tags: newAppointment.tags || [],
              personId: newAppointment.personId || ''
            };
            
            // ✅ AGREGAR DIRECTAMENTE CON DATOS REALES (no temporal)
            addOptimisticAppointment(realAppointment);
          }
          
          // ✅ NO HAY invalidateCache() que conflictúe con el sistema optimista
          console.log('[WeeklyAgenda] ✅ Cita guardada y visible inmediatamente');
          
          // Cerrar modal
          setIsAppointmentDialogOpen(false);
          
          // Limpiar selección
          setSelectedClient(null);
        } catch (error) {
          console.error(`Error ${isUpdate ? 'updating' : 'creating'} appointment:`, error);
          // ✅ Solo en caso de error, invalidar para restaurar estado correcto
          await invalidateCache();
          // Mostrar mensaje de error contextual
          alert(`Error al ${isUpdate ? 'actualizar' : 'crear'} la cita. Por favor, inténtalo de nuevo.`);
        }
      }
    },
    [selectedSlot, addOptimisticAppointment, updateOptimisticAppointment, invalidateCache] // ✅ Dependencias del sistema optimista
  );

  const handleAppointmentResize = (id: string, newDuration: number) => {
    // Esta función ya no es necesaria con el nuevo componente sin redimensionamiento
    console.log("La funcionalidad de redimensionamiento visual ha sido desactivada");
  }

  // Helper para convertir Date a timestamp en zona horaria de la clínica
  const formatDateForAPI = useCallback((date: Date, clinicTimezone?: string) => {
    const timezone = clinicTimezone || 
                    (activeClinic as any)?.countryInfo?.timezone || 
                    (activeClinic as any)?.country?.timezone || 
                    Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Crear formatter con zona horaria de la clínica
    const formatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    // Formatear fecha en zona horaria local
    const parts = formatter.formatToParts(date);
    const formattedDate = `${parts.find(p => p.type === 'year')?.value}-${parts.find(p => p.type === 'month')?.value}-${parts.find(p => p.type === 'day')?.value}`;
    const formattedTime = `${parts.find(p => p.type === 'hour')?.value}:${parts.find(p => p.type === 'minute')?.value}:${parts.find(p => p.type === 'second')?.value}`;
    
    // Construir timestamp en zona horaria local de clínica
    const localDateTime = new Date(`${formattedDate}T${formattedTime}`);
    return localDateTime.toISOString(); // Ahora sí representa la hora local de la clínica
  }, [activeClinic]);

  const handleDurationChange = useCallback(async (appointmentId: string, newDuration: number) => {
    console.log('[handleDurationChange] Cambiando duración:', { appointmentId, newDuration });
    
    // ✅ BLOQUEO: No cambiar duración en citas optimistas
    const isOptimistic = appointmentId?.toString().startsWith('temp-');
    if (isOptimistic) {
      console.log('[handleDurationChange] 🚫 Cambio de duración cancelado - cita optimista:', appointmentId);
      
      // ✅ FEEDBACK SUTIL: Toast igual que otras acciones bloqueadas
      toast({
        title: "Procesando...",
        duration: 1500
      });
      
      return; // ❌ No procesar cambio de duración
    }
    
    try {
      // Buscar la cita en el estado local
      const appointmentToUpdate = appointmentsList.find(app => app.id === appointmentId);
      if (!appointmentToUpdate) {
        console.error('[handleDurationChange] No se encontró la cita:', appointmentId);
        return;
      }

      // Calcular la nueva hora de fin basándose en la nueva duración
      const [hours, minutes] = appointmentToUpdate.startTime.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + newDuration;
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      const newEndTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

      // ✅ RENDERIZADO OPTIMISTA GLOBAL - Unificado
      console.log('[WeeklyAgenda handleDurationChange] 🚀 Aplicando cambio optimista global...');
      updateOptimisticAppointment(appointmentId, {
        durationMinutes: newDuration, // ✅ CORREGIDO: durationMinutes para useWeeklyAgendaData
        duration: newDuration,
        endTime: newEndTime
      });

      // Preparar datos para la API
      const apiData = {
        id: appointmentId,
        roomId: appointmentToUpdate.roomId,
        date: format(appointmentToUpdate.date, 'yyyy-MM-dd'), // Solo fecha YYYY-MM-DD  
        startTime: formatDateForAPI(appointmentToUpdate.date), // Usar zona horaria de clínica
        endTime: formatDateForAPI(new Date(appointmentToUpdate.date.getTime() + (newDuration * 60 * 1000))), // Usar zona horaria de clínica
        durationMinutes: newDuration
      };
      
      console.log('[handleDurationChange] Enviando a API:', apiData);

      // Actualizar en la base de datos
      const response = await fetch(
        `/api/appointments`,
        {
          method: 'PUT', 
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(apiData),
        }
      );

      if (!response.ok) {
        throw new Error('Error al actualizar la duración de la cita');
      }

      console.log('[handleDurationChange] Duración actualizada correctamente');
      
    } catch (error) {
      console.error('[handleDurationChange] Error:', error);
      // ✅ Solo en caso de error, invalidar para restaurar estado correcto
      await invalidateCache();
    }
  }, [appointmentsList, updateOptimisticAppointment, formatDateForAPI, invalidateCache]);

  const handleRevertExtension = useCallback(async (appointmentId: string) => {
    // ✅ BLOQUEO ELEGANTE: Solo mostrar feedback sutil para revert extension  
    const isOptimistic = appointmentId.toString().startsWith('temp-');
    if (isOptimistic) {
      toast({
        title: "Procesando...",
        duration: 1500
      });
      return; // ❌ NO ejecutar revert
    }
    
    try {
      console.log('[handleRevertExtension] Revirtiendo extensión:', appointmentId);
      
      // Encontrar la cita
      const appointmentToRevert = appointmentsList.find(apt => apt.id === appointmentId);
      if (!appointmentToRevert) {
        console.error('No se puede revertir: cita no encontrada');
        return;
      }

      // ✅ CALCULAR DURACIÓN CORRECTA DE SERVICIOS (misma lógica que appointment-item)
      let targetDuration: number;
      
      // Intentar calcular desde services array si está disponible
      if (appointmentToRevert.services && Array.isArray(appointmentToRevert.services) && appointmentToRevert.services.length > 0) {
        targetDuration = appointmentToRevert.services.reduce((sum, service) => {
          return sum + (service.durationMinutes || service.duration || 0);
        }, 0);
      } else if (appointmentToRevert.estimatedDurationMinutes) {
        // Fallback: usar estimatedDurationMinutes si está disponible
        targetDuration = appointmentToRevert.estimatedDurationMinutes;
      } else {
        console.error('No se puede calcular duración de servicios para restablecer');
        return;
      }

      // Verificar que hay algo que revertir
      if (targetDuration === appointmentToRevert.duration) {
        console.log('La cita ya tiene la duración correcta, no hay nada que revertir');
        toast({
          title: "Sin cambios",
          description: "La cita ya tiene la duración correcta",
          duration: 2000
        });
        return;
      }

      // Calcular nueva hora de fin con duración corregida
      const [hours, minutes] = appointmentToRevert.startTime.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + targetDuration;
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      const newEndTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

      // ✅ RENDERIZADO OPTIMISTA GLOBAL - Unificado
      console.log('[WeeklyAgenda handleRevertExtension] 🚀 Aplicando cambio optimista global...');
      updateOptimisticAppointment(appointmentId, {
        durationMinutes: targetDuration, // ✅ CORREGIDO: durationMinutes para useWeeklyAgendaData
        duration: targetDuration,
        endTime: newEndTime
      });

      // Llamar a la API para revertir la extensión con la duración correcta
      const response = await fetch(
        `/api/appointments/${appointmentId}/revert-extension`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ targetDuration }) // ✅ Enviar duración calculada
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        console.error('[handleRevertExtension] Error del API:', errorData);
        
        // Verificar si es el error de "duración correcta" - no lanzar excepción
        if (response.status === 400 && errorData.error?.includes('duración correcta')) {
          console.log('[handleRevertExtension] La cita ya tiene la duración correcta - no es un error');
          toast({
            title: "Sin cambios",
            description: "La cita ya tiene la duración correcta",
            duration: 2000
          });
          return; // ✅ SALIR NORMALMENTE, no como error
        } else {
          // Solo lanzar excepción para errores reales
          throw new Error(`Error del API: ${errorData.error || 'Error desconocido'}`);
        }
      }

      console.log('[handleRevertExtension] Extensión revertida correctamente a:', targetDuration, 'minutos');
      
      toast({
        title: "Duración restablecida",
        description: `Cita restablecida a ${targetDuration} minutos`,
        duration: 2000
      });
    } catch (error) {
      console.error('[handleRevertExtension] Error:', error);
      // ✅ Solo en caso de error, invalidar para restaurar estado correcto
      await invalidateCache();
    }
  }, [appointmentsList, updateOptimisticAppointment, invalidateCache]);

  const handleAppointmentDrop = useCallback(async (appointmentId: string, changes: any) => {
    console.log('[handleAppointmentDrop] Iniciando drop:', { appointmentId, changes });
    console.log('[handleAppointmentDrop] Tipo de changes:', typeof changes);
    console.log('[handleAppointmentDrop] Keys de changes:', Object.keys(changes));
    
    // ✅ BLOQUEO: No procesar drop en citas optimistas
    const isOptimistic = appointmentId?.toString().startsWith('temp-');
    if (isOptimistic) {
      console.log('[handleAppointmentDrop] 🚫 Drop cancelado - cita optimista:', appointmentId);
      
      // ✅ FEEDBACK SUTIL: Toast para indicar que se está procesando
      toast({
        title: "Procesando...",
        description: "La cita se está guardando en segundo plano",
        duration: 1500
      });
      
      return; // ❌ No procesar drop
    }
    
    try {
      // Buscar la cita actual
      const appointmentToUpdate = appointmentsList.find(app => app.id === appointmentId);
      if (!appointmentToUpdate) {
        console.error('[handleAppointmentDrop] No se encontró la cita:', appointmentId);
        return;
      }
      
      console.log('[handleAppointmentDrop] Cita encontrada:', appointmentToUpdate);
      
      // Validar si hay conflictos en la nueva posición
      console.log('[handleAppointmentDrop] Verificando condiciones:', {
        hasStartTime: !!changes.startTime,
        hasRoomId: !!changes.roomId,
        startTime: changes.startTime,
        roomId: changes.roomId
      });
            // SIMPLIFICACIÓN: Usar SIEMPRE la duración REAL de la cita (incluyendo extensiones)
      const finalDuration = appointmentToUpdate.duration;

      if (changes.startTime) {
        console.log('[handleAppointmentDrop] Entrando a validación de conflictos');
        const targetTime = `${changes.startTime.getHours().toString().padStart(2, '0')}:${changes.startTime.getMinutes().toString().padStart(2, '0')}`;
        console.log('[handleAppointmentDrop] Tiempo objetivo:', targetTime);
        
        // Usar el roomId de los cambios o el actual de la cita
        const targetRoomId = changes.roomId || appointmentToUpdate.roomId;
        console.log('[handleAppointmentDrop] RoomId objetivo:', targetRoomId);
        
        const conflictCheck = findAvailableSlot(
          changes.startTime,
          targetTime,
          finalDuration, // ✅ CORREGIDO: Usar duración teórica
          targetRoomId,
          appointmentId
        );
        
        console.log('[handleAppointmentDrop] Verificación de conflictos:', conflictCheck);
        
        // Si hay conflicto y no se puede ajustar, cancelar el drop
        if (conflictCheck.hasConflict) {
          console.log('[handleAppointmentDrop] CONFLICTO DETECTADO - procesando...');
          // Verificar si el tiempo sugerido es válido dentro del horario
          const [suggestedHours, suggestedMinutes] = conflictCheck.suggestedTime.split(':').map(Number);
          const suggestedTotalMinutes = suggestedHours * 60 + suggestedMinutes;
          const endTotalMinutes = suggestedTotalMinutes + finalDuration;
          
          // Si el tiempo sugerido excede el horario laboral (asumiendo 20:00 como límite)
          if (endTotalMinutes > 20 * 60) {
            console.log('[handleAppointmentDrop] Tiempo sugerido excede horario laboral, cancelando');
            toast({
              title: "No se puede mover la cita",
              description: "No hay espacio disponible en esa cabina para esta cita",
              variant: "destructive",
            });
            
            // ✅ No hacer nada - el drag se cancela automáticamente al hacer return
            return;
          }
          
          // Si hay un tiempo sugerido válido, usarlo
          console.log('[handleAppointmentDrop] Aplicando tiempo sugerido:', conflictCheck.suggestedTime);
          const suggestedDate = new Date(changes.startTime);
          suggestedDate.setHours(suggestedHours);
          suggestedDate.setMinutes(suggestedMinutes);
          changes.startTime = suggestedDate;
          
          toast({
            title: "Posición ajustada",
            description: `La cita se ha movido a las ${conflictCheck.suggestedTime} para evitar conflictos`,
          });
        } else {
          console.log('[handleAppointmentDrop] No hay conflictos');
        }
      } else {
        console.log('[handleAppointmentDrop] NO se puede validar - falta startTime');
      }
      

      
      // Transformar los cambios al formato esperado por Appointment
      const transformedChanges: Partial<Appointment> = {};
      
      if (changes.startTime) {
        // Calcular nueva hora de inicio
        const newStartTime = `${changes.startTime.getHours().toString().padStart(2, '0')}:${changes.startTime.getMinutes().toString().padStart(2, '0')}`;
        transformedChanges.startTime = newStartTime;
        transformedChanges.date = changes.startTime;
        
        // IMPORTANTE: Calcular y actualizar endTime basándose en la nueva startTime + duración
        const newEndDate = new Date(changes.startTime.getTime() + (finalDuration * 60 * 1000));
        const newEndTime = `${newEndDate.getHours().toString().padStart(2, '0')}:${newEndDate.getMinutes().toString().padStart(2, '0')}`;
        transformedChanges.endTime = newEndTime;
        
        console.log('[handleAppointmentDrop] Calculando nuevo endTime:', {
          newStartTime,
          finalDuration,
          newEndTime
        });
      }
      
      if (changes.roomId) {
        // Enviar roomId, no equipmentId
        transformedChanges.roomId = changes.roomId;
      }
      
      console.log('[handleAppointmentDrop] Cambios transformados:', transformedChanges);
      
      // Crear una copia actualizada de la cita con los cambios transformados
      const updatedAppointment = {
        ...appointmentToUpdate,
        ...transformedChanges
      };
      
      console.log('[handleAppointmentDrop] Cita actualizada:', updatedAppointment);
      
      // ✅ RENDERIZADO OPTIMISTA GLOBAL - Visible inmediatamente en AMBAS vistas
      console.log('[handleAppointmentDrop] 🚀 APLICANDO CAMBIO OPTIMISTA GLOBAL...', {
        appointmentId,
        transformedChanges,
        updateOptimisticAppointmentExists: !!updateOptimisticAppointment,
        appointmentCompleto: updatedAppointment
      });
      
      // ✅ PASAR LA CITA COMPLETA CON CAMBIOS en lugar de solo los cambios
      updateOptimisticAppointment(appointmentId, updatedAppointment);
      console.log('[handleAppointmentDrop] ✅ updateOptimisticAppointment EJECUTADO con cita completa');
      
      // Preparar datos para la API
      const targetDate = transformedChanges.date || appointmentToUpdate.date;
      
      const apiData = {
        id: appointmentId,
        roomId: transformedChanges.roomId || appointmentToUpdate.roomId,
        date: format(targetDate, 'yyyy-MM-dd'), // Usar la nueva fecha
        startTime: formatDateForAPI(targetDate), // Usar zona horaria de clínica
        endTime: formatDateForAPI(new Date(targetDate.getTime() + (finalDuration * 60 * 1000))), // Usar zona horaria de clínica
        durationMinutes: finalDuration
      };
      
      console.log('[handleAppointmentDrop] Enviando a API:', apiData);
      
      // Hacer la llamada a la API en segundo plano
      const response = await fetch(`/api/appointments`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        throw new Error('Error al mover la cita');
      }

      console.log('[handleAppointmentDrop] Cita guardada en BD correctamente');
      
      // ✅ NO INVALIDAR: Sistema optimista se actualiza automáticamente con datos reales
      console.log('[WeeklyAgenda] ✅ Drag & drop completado - datos optimistas se sincronizarán automáticamente');
      
      toast({
        title: "Cita actualizada",
        description: "La cita se ha movido correctamente",
      });
    } catch (error) {
      console.error('Error moving appointment:', error);
      
      // Si hay error, invalidar cache para refrescar estado
      await invalidateCache();
      
      toast({
        title: "Error",
        description: "No se pudo mover la cita",
        variant: "destructive",
      });
    }
  }, [appointmentsList, invalidateCache]);

  const findAvailableSlot = useCallback((
    targetDate: Date,
    targetTime: string,
    duration: number,
    roomId: string,
    excludeAppointmentId?: string
  ) => {
    console.log('[findAvailableSlot] Iniciando búsqueda:', {
      targetDate,
      targetTime,
      duration,
      roomId,
      excludeAppointmentId
    });
    
    // Filtrar citas del mismo día y sala
    const roomAppointments = appointmentsList.filter(apt => 
      apt.id !== excludeAppointmentId &&
      String(apt.roomId) === String(roomId) &&
      isSameDay(apt.date, targetDate)
    ).sort((a, b) => {
      const timeA = a.startTime.split(':').map(Number);
      const timeB = b.startTime.split(':').map(Number);
      return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
    });

    console.log('[findAvailableSlot] Citas en la misma sala:', roomAppointments);

    // Convertir tiempo objetivo a minutos
    const [targetHours, targetMinutes] = targetTime.split(':').map(Number);
    let targetStartMinutes = targetHours * 60 + targetMinutes;
    let targetEndMinutes = targetStartMinutes + duration;

    console.log('[findAvailableSlot] Rango objetivo:', {
      targetStartMinutes,
      targetEndMinutes,
      targetTime
    });

    // Buscar conflictos
    let hasConflict = false;
    let suggestedTime = targetTime;
    
    for (const apt of roomAppointments) {
      const [aptHours, aptMinutes] = apt.startTime.split(':').map(Number);
      const aptStartMinutes = aptHours * 60 + aptMinutes;
      const aptEndMinutes = aptStartMinutes + apt.duration;

      console.log('[findAvailableSlot] Verificando contra cita:', {
        appointment: apt,
        aptStartMinutes,
        aptEndMinutes,
        overlap: targetStartMinutes < aptEndMinutes && targetEndMinutes > aptStartMinutes
      });

      // Verificar si hay solapamiento
      if (targetStartMinutes < aptEndMinutes && targetEndMinutes > aptStartMinutes) {
        hasConflict = true;
        console.log('[findAvailableSlot] ¡CONFLICTO DETECTADO!');
        
        // Sugerir el final de la cita conflictiva
        const newStartMinutes = aptEndMinutes;
        const endTotalMinutes = newStartMinutes + duration;
        const endHours = Math.floor(endTotalMinutes / 60);
        const endMins = endTotalMinutes % 60;
        
        // No forzar ajuste a granularidad si ya está alineado
        suggestedTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
        
        console.log('[findAvailableSlot] Tiempo sugerido:', suggestedTime);
        
        // Actualizar el tiempo objetivo para la siguiente iteración
        const [newTargetHours, newTargetMinutes] = suggestedTime.split(':').map(Number);
        targetStartMinutes = newTargetHours * 60 + newTargetMinutes;
        targetEndMinutes = targetStartMinutes + duration;
      }
    }

    const result = {
      hasConflict,
      suggestedTime,
      originalTime: targetTime
    };
    
    console.log('[findAvailableSlot] Resultado final:', result);
    return result;
  }, [appointmentsList]);

  const handleTagsUpdate = useCallback(async (appointmentId: string, tagIds: string[]) => {
    console.log('[WeeklyAgenda handleTagsUpdate] 🏷️ Actualizando etiquetas:', { appointmentId, tagIds });
    
    // ✅ VERIFICAR ESTADO DEL CACHE ANTES DEL OPTIMISTA
    console.log('[WeeklyAgenda handleTagsUpdate] 🔍 Appointments actuales en vista:', appointmentsList.length, 'citas');
    console.log('[WeeklyAgenda handleTagsUpdate] 🔍 Cache key a usar:', weekKey);
    
    try {
      // ✅ RENDERIZADO OPTIMISTA GLOBAL - Visible inmediatamente en AMBAS vistas
      console.log('[WeeklyAgenda handleTagsUpdate] 🚀 Aplicando cambio optimista global...');
      updateOptimisticTags(appointmentId, tagIds);

      // Llamar a la API para actualizar las etiquetas
      const response = await fetch(`/api/appointments/${appointmentId}/tags`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tagIds })
      });

      if (!response.ok) {
        throw new Error('Error al actualizar etiquetas');
      }

      console.log('[WeeklyAgenda handleTagsUpdate] ✅ Etiquetas actualizadas en API - datos optimistas se actualizarán automáticamente');
      
      // ✅ NO INVALIDAR: Permitir que sistema optimista maneje la transición
      // await invalidateCache(); // ❌ COMENTADO: Esto destruía el efecto optimista inmediato
      
    } catch (error) {
      console.error('[WeeklyAgenda handleTagsUpdate] ❌ Error:', error);
      // ✅ SOLO REVERTIR EN CASO DE ERROR
      await invalidateCache();
    }
  }, [updateOptimisticTags, invalidateCache]);

  const handleMoveAppointment = useCallback((appointmentId: string) => {
    console.log('[WeeklyAgenda] 🚀 Iniciando movimiento de cita:', appointmentId);
    
    // Buscar la cita en el estado local
    const appointmentToMove = appointmentsList.find(app => app.id === appointmentId);
    if (!appointmentToMove) {
      console.error('[WeeklyAgenda] ❌ Cita no encontrada para mover:', appointmentId);
      return;
    }

    console.log('[WeeklyAgenda] ✅ Cita encontrada para mover:', appointmentToMove.name);
    
    // ✅ USAR CONTEXTO DE MOVIMIENTO REAL  
    startMovingAppointment(appointmentToMove);
    
    console.log('[WeeklyAgenda] 📋 Cita puesta en modo movimiento:', {
      id: appointmentToMove.id,
      name: appointmentToMove.name,
      date: appointmentToMove.date,
      time: appointmentToMove.startTime,
      room: appointmentToMove.roomId,
      duration: appointmentToMove.duration,
      service: appointmentToMove.service
    });
    
    // TODO: Integrar con MoveAppointmentProvider
    // startMovingAppointment(appointmentToMove);
  }, [appointmentsList, startMovingAppointment]);

  const validateDropPosition = useCallback((dropResult: DropResult, draggedItem: DragItem): boolean => {
    const { date, time, roomId } = dropResult;
    
    // Obtener hora de inicio y fin
    const [startHour, startMinute] = time.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = startMinutes + draggedItem.duration;
    
    // Buscar conflictos con otras citas
    const hasConflict = appointmentsList.some(apt => {
      // Ignorar la cita que estamos arrastrando
      if (apt.id === draggedItem.id) return false;
      
      // Solo verificar citas en la misma fecha y cabina
      const aptDate = new Date(apt.date);
      if (aptDate.toDateString() !== date.toDateString() || apt.roomId !== roomId) {
        return false;
      }
      
      // Calcular minutos de inicio y fin de la cita existente
      const [aptStartHour, aptStartMinute] = apt.startTime.split(':').map(Number);
      const aptStartMinutes = aptStartHour * 60 + aptStartMinute;
      const aptEndMinutes = aptStartMinutes + apt.duration;
      
      // Verificar solapamiento
      return startMinutes < aptEndMinutes && endMinutes > aptStartMinutes;
    });
    
    if (hasConflict) {
      console.log('[WeeklyAgenda] Conflicto detectado en posición de drop');
    }
    
    return !hasConflict;
  }, [appointmentsList]);

  // ✅ CONEXIÓN AL CONTEXTO DRAGTIME para fusionar sistemas de drag & drop - SEGURA
  let startDragContext, endDragContext, updateDragPositionContext;
  try {
    const dragTimeHooks = useDragTime();
    startDragContext = dragTimeHooks.startDrag;
    endDragContext = dragTimeHooks.endDrag;
    updateDragPositionContext = dragTimeHooks.updateDragPosition;
  } catch (error) {
    // Si no estamos dentro del DragTimeProvider, usar funciones dummy
    console.log('[WeeklyAgenda] DragTimeProvider no disponible, usando modo standalone');
    startDragContext = () => {};
    endDragContext = () => {};
    updateDragPositionContext = () => {};
  }

  // ✅ CREAR HOOKS DEL CONTEXTO para pasar al sistema optimizado
  const contextHooks = useMemo(() => ({
    startDragContext,
    endDragContext,
    updateDragPositionContext
  }), [startDragContext, endDragContext, updateDragPositionContext]);

  const {
    dragState: localDragState,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    updateMousePosition,
    updateCurrentPosition,
    updateDragDirection
  } = useOptimizedDragAndDrop(handleAppointmentDrop, 60, 15, validateDropPosition, contextHooks);
  
  // Usar ref para evitar re-renders en el useEffect del drag
  const isDraggingRef = useRef(false);
  
  React.useEffect(() => {
    isDraggingRef.current = localDragState.isActive;
  }, [localDragState.isActive]);
  
  // Rastrear el movimiento del mouse durante el drag CON AUTO-SCROLL SUAVE Y CONTINUO
  React.useEffect(() => {
    let autoScrollFrame: number | null = null;
    let scrollDirection: 'up' | 'down' | 'left' | 'right' | null = null;
    let lastScrollTime = 0;

    const performSmoothAutoScroll = () => {
      if (!isDraggingRef.current || !gridContainerRef.current || !scrollDirection) {
        autoScrollFrame = null;
        return;
      }

      const container = gridContainerRef.current;
      const currentTime = Date.now();
      const deltaTime = currentTime - lastScrollTime;
      
      // ✅ SCROLL MÁS SUAVE: 30fps en lugar de 60fps
      if (deltaTime >= 33) { // ~30fps (1000ms / 30fps = 33ms)
        const scrollSpeed = 15; // ✅ VELOCIDAD AUMENTADA: 15px por step
        const currentScrollTop = container.scrollTop;
        const currentScrollLeft = container.scrollLeft;
        
        // ✅ AUTO-SCROLL VERTICAL
        if (scrollDirection === 'up' && currentScrollTop > 0) {
          container.scrollTop = Math.max(0, currentScrollTop - scrollSpeed);
        } else if (scrollDirection === 'down') {
          const maxScrollTop = container.scrollHeight - container.clientHeight;
          if (currentScrollTop < maxScrollTop) {
            container.scrollTop = Math.min(maxScrollTop, currentScrollTop + scrollSpeed);
          }
        }
        // ✅ AUTO-SCROLL HORIZONTAL
        if (scrollDirection === 'left' && currentScrollLeft > 0) {
          container.scrollLeft = Math.max(0, currentScrollLeft - scrollSpeed);
        } else if (scrollDirection === 'right') {
          const maxScrollLeft = container.scrollWidth - container.clientWidth;
          if (currentScrollLeft < maxScrollLeft) {
            container.scrollLeft = Math.min(maxScrollLeft, currentScrollLeft + scrollSpeed);
          }
        }
        
        lastScrollTime = currentTime;
      }
      
      // ✅ CONTINUAR AUTO-SCROLL usando requestAnimationFrame
      autoScrollFrame = requestAnimationFrame(performSmoothAutoScroll);
    };

    const startAutoScroll = (direction: 'up' | 'down' | 'left' | 'right') => {
      if (scrollDirection === direction && autoScrollFrame !== null) {
        return; // Ya está ejecutándose en esa dirección
      }
      
      stopAutoScroll(); // Detener cualquier scroll anterior
      scrollDirection = direction;
      lastScrollTime = Date.now();
      autoScrollFrame = requestAnimationFrame(performSmoothAutoScroll);
    };

    const stopAutoScroll = () => {
      if (autoScrollFrame !== null) {
        cancelAnimationFrame(autoScrollFrame);
        autoScrollFrame = null;
      }
      scrollDirection = null;
    };

    const handleAutoScroll = (e: MouseEvent | DragEvent) => {
      if (!isDraggingRef.current || !gridContainerRef.current) {
        stopAutoScroll();
        return;
      }

      const container = gridContainerRef.current;
      const containerRect = container.getBoundingClientRect();
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      
      // ✅ ZONAS VERTICALES: Más generosas y mejor posicionadas
      const headerHeight = 100; // Reducido para activación más temprana
      const scrollTriggerTop = containerRect.top + headerHeight;
      const scrollTriggerBottom = containerRect.bottom - 80; // Más margen inferior
      
      // ✅ ZONAS HORIZONTALES: Para scroll izquierda/derecha
      const scrollTriggerLeft = containerRect.left + 80; // 80px desde izquierda
      const scrollTriggerRight = containerRect.right - 80; // 80px desde derecha
      
      // ✅ ZONA MÁS GENEROSA: 60px de zona de activación
      const triggerZoneSize = 60;
      
      // Detectar zonas de scroll
      const nearTop = mouseY >= scrollTriggerTop && mouseY <= scrollTriggerTop + triggerZoneSize;
      const nearBottom = mouseY >= scrollTriggerBottom - triggerZoneSize && mouseY <= scrollTriggerBottom;
      const nearLeft = mouseX >= scrollTriggerLeft - triggerZoneSize && mouseX <= scrollTriggerLeft;
      const nearRight = mouseX >= scrollTriggerRight && mouseX <= scrollTriggerRight + triggerZoneSize;
      
      // ✅ LÓGICA MEJORADA: Prioridad vertical > horizontal
      if (nearTop) {
        startAutoScroll('up');
      } else if (nearBottom) {
        startAutoScroll('down');
      } else if (nearLeft) {
        startAutoScroll('left');
      } else if (nearRight) {
        startAutoScroll('right');
      } else {
        stopAutoScroll();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        updateMousePosition(e.clientX, e.clientY);
        handleAutoScroll(e);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      if (isDraggingRef.current) {
        e.preventDefault(); // Importante para permitir el drop
        updateMousePosition(e.clientX, e.clientY);
        handleAutoScroll(e);
      }
    };

    const handleDragLeave = () => {
      // Detener auto-scroll cuando sale del área
      stopAutoScroll();
    };

    const handleDragEnd = () => {
      // Detener auto-scroll al terminar drag
      stopAutoScroll();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('dragend', handleDragEnd);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('dragend', handleDragEnd);
      
      // Cleanup auto-scroll
      stopAutoScroll();
    };
  }, [updateMousePosition]); // Solo depende de updateMousePosition
  
  // Ref para el contenedor de la agenda


  const handleAppointmentDragStart = useCallback((appointment: any, e?: React.DragEvent, initialOffsetMinutes?: number) => {
    console.log('[WeeklyAgenda] Appointment drag start:', appointment);
    
    if (!e) return;
    
    // ✅ BLOQUEO: No permitir drag en citas optimistas
    const isOptimistic = appointment.id?.toString().startsWith('temp-');
    if (isOptimistic) {
      e.preventDefault(); // ❌ Cancelar drag inmediatamente
      e.stopPropagation();
      
      // ✅ FEEDBACK SUTIL: Toast rápido como con otras acciones bloqueadas
      toast({
        title: "Procesando...",
        duration: 1500
      });
      
      console.log('[WeeklyAgenda] 🚫 Drag bloqueado en cita optimista:', appointment.id);
      return;
    }
    
    // Convertir el appointment al formato DragItem esperado por el hook optimizado
    const dragItem = {
      id: appointment.id,
      title: appointment.title || appointment.name,
      startTime: appointment.startTime,
      endTime: '', // Se calculará en el hook si es necesario
      duration: appointment.duration,
      roomId: appointment.roomId,
      currentDate: appointment.date,
      color: appointment.color || '#9CA3AF',
      personId: appointment.personId || ''
    };
    
    handleDragStart(e, dragItem, initialOffsetMinutes); // Corregido: Primero el evento, luego el dragItem
  }, [handleDragStart]);

  const handleCellDragOver = useCallback((e: React.DragEvent, date: Date, time: string, roomId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    handleDragOver(e);
  }, [handleDragOver]);

  const handleCellDrop = useCallback((e: React.DragEvent, date: Date, time: string, roomId: string) => {
    e.preventDefault();
    handleDrop(e, date, time, roomId);
  }, [handleDrop]);

  const onDragEnd = () => {
    handleDragEnd();
  }

  const handleDayClick = (date: Date) => {
    // Solo permitir clic en días activos
    if (isDayActive(date)) {
      router.push(`/agenda/dia/${format(date, "yyyy-MM-dd")}`)
    }
  }

  // Función auxiliar para filtrar citas de una celda específica
  const findNextAppointmentInRoom = useCallback((currentAppointment: Appointment, roomId: string, day: Date) => {
    const [currentHour, currentMinute] = currentAppointment.startTime.split(':').map(Number);
    const currentStartMinutes = currentHour * 60 + currentMinute;
    
    // Filtrar citas de la misma sala y día que empiecen después de la actual
    const laterAppointments = appointmentsList.filter(apt => 
      apt.id !== currentAppointment.id &&
      String(apt.roomId) === String(roomId) &&
      isSameDay(apt.date, day)
    ).map(apt => {
      const [aptHour, aptMinute] = apt.startTime.split(':').map(Number);
      const aptStartMinutes = aptHour * 60 + aptMinute;
      return { ...apt, startMinutes: aptStartMinutes };
    }).filter(apt => apt.startMinutes > currentStartMinutes);
    
    // Ordenar por hora de inicio y devolver la primera (más cercana)
    if (laterAppointments.length > 0) {
      laterAppointments.sort((a, b) => a.startMinutes - b.startMinutes);
      return {
        startTime: laterAppointments[0].startTime,
        startMinutes: laterAppointments[0].startMinutes
      };
    }
    
    return null;
  }, [appointmentsList]);

  const getAppointmentsForCell = useCallback((day: Date, time: string, cabinId: string) => {
    // ✅ NUEVO: Solo mostrar citas cuando los datos estén estables para evitar "flash" de citas incorrectas
    if (!isDataStable) {
      return []; // Devolver array vacío hasta que los datos estén completamente estables
    }
    
    const cellAppointments: Array<Appointment & { offsetMinutes: number; nextAppointmentInRoom?: { startTime: string; startMinutes: number } | null }> = [];
    
    const dayString = format(day, 'yyyy-MM-dd');
    
    // Verificar appointments disponibles para esta celda
    
    appointmentsList.forEach((appointment, index) => {

      
      // Filtrado de citas por fecha y cabina
      // Verificar que la fecha coincida - CORREGIDO: manejar fechas string
      const appointmentDate = typeof appointment.date === 'string' 
        ? new Date(appointment.date) 
        : appointment.date;
      if (!isSameDay(appointmentDate, day)) return;
      
      // Verificar que la cabina coincida
      if (appointment.roomId !== cabinId) return;
      
      // Parsear hora de inicio de la cita - asegurar que sea string
      const startTimeStr = typeof appointment.startTime === 'string' 
        ? appointment.startTime 
        : '00:00'; // Valor por defecto si no es string
      
      const [appointmentHours, appointmentMinutes] = startTimeStr.split(':').map(Number);
      const appointmentStartMinutes = appointmentHours * 60 + appointmentMinutes;
      
      // Parsear hora del slot
      const [slotHours, slotMinutes] = time.split(':').map(Number);
      const slotStartMinutes = slotHours * 60 + slotMinutes;
      const slotEndMinutes = slotStartMinutes + slotDuration;
      
      const timeInSlot = appointmentStartMinutes >= slotStartMinutes && appointmentStartMinutes < slotEndMinutes;
      
      // Verificar si la cita empieza dentro de este slot
      if (timeInSlot) {
        
        // Calcular el offset en minutos dentro del slot
        const offsetMinutes = appointmentStartMinutes - slotStartMinutes;
        
        // Encontrar la siguiente cita en la misma sala
        const nextAppointment = findNextAppointmentInRoom(appointment, cabinId, day);
        
        cellAppointments.push({
          ...appointment,
          offsetMinutes,
          nextAppointmentInRoom: nextAppointment
        });
      }
    });



    return cellAppointments;
  }, [appointmentsList, slotDuration, findNextAppointmentInRoom, isDataStable]);

  // Estructura corregida para el renderWeeklyGrid
  const renderWeeklyGrid = () => {
    // TEMP: Comentado para eliminar bucle infinito
    // console.log("[WeeklyAgenda] renderWeeklyGrid - valor de activeCabins:", JSON.stringify(activeCabins));
    return (
      <div className="relative z-0" style={{ scrollBehavior: "smooth" }}>
        <div className="min-w-[1200px] relative">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `auto repeat(7, 1fr)`,
              width: "100%",
            }}
            ref={agendaRef}
          >
            {/* Columna de tiempo - Fija en ambas direcciones - z-40 para estar sobre granularidades */}
            <div
              className="sticky top-0 left-0 z-40 p-4 w-20 bg-white border-r border-b border-gray-300 hour-header"
            >
              <div className="text-sm text-gray-500">Hora</div>
            </div>

            {/* Cabeceras de días - Fijas - z-40 para estar sobre granularidades */}
            {weekDays.map((day, index) => {
              const today = isToday(day);
              const active = isDayActive(day);
              return (
                <div key={index} className={cn(
                  "sticky top-0 bg-white border-b border-gray-300 day-header z-40",
                  today ? "border-l-2 border-r-2 border-purple-300" : "border-l border-r border-gray-300",
                  !active && "bg-gray-100"
                )}>
                  <div
                    className={cn(
                      "p-4 border-b border-gray-300",
                      active ? "cursor-pointer hover:bg-gray-50" : "cursor-not-allowed opacity-70",
                      today && "bg-purple-50/10",
                    )}
                    onClick={() => active && handleDayClick(day)}
                    title={active ? "Ir a vista diaria" : "Día no activo"}
                  >
                    <div className="flex gap-2 justify-start items-center">
                      <div>
                        <div className="text-base font-medium capitalize">{format(day, "EEEE", { locale: es })}</div>
                        <div className={cn("text-sm", today ? "font-bold text-purple-600" : "text-gray-500")}>
                          {format(day, "d/M/yyyy")}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    className="grid"
                    style={{ gridTemplateColumns: `repeat(${activeCabins.length || 1}, 1fr)` }}
                  >
                    {activeCabins.map((cabin) => (
                      <div
                        key={cabin.id}
                        className={cn(
                          "text-white text-xs py-1 px-1 text-center font-medium border-r border-gray-300 last:border-r-0",
                          !active && "opacity-70"
                        )}
                        style={{ backgroundColor: cabin.color }}
                        title={cabin.name}
                      >
                        {cabin.code || cabin.name}
                      </div>
                    ))}
                    {activeCabins.length === 0 && (
                      <div className="px-1 py-1 text-xs italic text-center text-gray-400">
                        Sin cabinas
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Filas de Slots de Tiempo */}
            {timeSlots.map((time) => (
              <React.Fragment key={time}>
                {/* Celda de Hora - CORREGIDO: Añadido z-index */}
                <div
                  className="sticky left-0 z-20 p-2 w-20 text-sm font-medium text-purple-600 bg-white border-r border-b border-gray-300 hour-column"
                  data-time={time}
                >
                  {time}
                </div>
                {/* Celdas de Día/Cabina */}
                {weekDays.map((day, dayIndex) => {
                  const today = isToday(day);
                  const active = isDayActive(day);
                  return (
                    <div
                      key={`${dayIndex}-${time}`}
                      className={cn(
                        "border-b border-gray-200 relative",
                        today ? "border-l-2 border-r-2 border-purple-300" : "border-l border-r border-gray-300",
                        today && "bg-purple-50/10",
                        !active && !today && "bg-gray-100"
                      )}
                      style={{ minWidth: `${activeCabins.length * 80}px` }}
                    >
                      <div
                        className="grid h-full"
                        style={{ gridTemplateColumns: `repeat(${activeCabins.length || 1}, 1fr)` }}
                      >
                        {activeCabins.length > 0 ? activeCabins.map((cabin, cabinIndex) => {
                          // ***** INTEGRACIÓN EN REND *****
                          const isAvailable = isTimeSlotAvailable(day, time);
                          const dayString = format(day, "yyyy-MM-dd");
                          // Usar la nueva función para encontrar override
                          const overrideForCell = findOverrideForCell(day, time, cabin.id.toString());
                          // blockForCell ya no es necesario, usamos overrideForCell

                          // La celda es interactiva si está activa, disponible Y *NO* está bloqueada
                          const isCellInteractive = active && isAvailable && !overrideForCell;
                          // La celda es clickeable si es interactiva O si está bloqueada (para abrir modal de bloqueo)
                          const isCellClickable = isCellInteractive || (overrideForCell && active);

                          const timeIndex = timeSlots.indexOf(time);
                          const prevTime = timeIndex > 0 ? timeSlots[timeIndex - 1] : null;
                          // Encontrar override para la celda anterior
                          const overrideForPrevCell = prevTime ? findOverrideForCell(day, prevTime, cabin.id.toString()) : null;
                          // blockForPrevCell ya no es necesario

                          // Determinar si esta celda es el inicio de un bloque visual
                          const isStartOfBlock = overrideForCell && (!overrideForPrevCell || overrideForPrevCell.id !== overrideForCell.id);

                          // Calcular cuántos slots ocupa el bloque visualmente
                          let blockDurationSlots = 0;
                          if (isStartOfBlock && overrideForCell) {
                            blockDurationSlots = 1; // Empieza con 1 (la celda actual)
                            // Buscar hacia adelante en los timeSlots del mismo día/cabina
                            for (let i = timeIndex + 1; i < timeSlots.length; i++) {
                              const nextTime = timeSlots[i];
                              const overrideForNextCell = findOverrideForCell(day, nextTime, cabin.id.toString());
                              // Si la siguiente celda pertenece al *mismo* override, incrementar duración
                              if (overrideForNextCell && overrideForNextCell.id === overrideForCell.id) {
                                blockDurationSlots++;
                              } else {
                                break; // Termina el bloque (o no hay más slots)
                              }
                            }
                          }
                          // ***** FIN CÁLCULO DURACIÓN BLOQUE *****

                          return (
                            <OptimizedHoverableCell
                              key={`${cabin.id}-${time}`}
                              day={day}
                              time={time}
                              cabinId={cabin.id.toString()}
                              isAvailable={isAvailable}
                              isInteractive={isCellInteractive}
                              isClickable={isCellClickable}
                              isStartOfBlock={isStartOfBlock}
                              blockDurationSlots={blockDurationSlots}
                              overrideForCell={overrideForCell}
                              onCellClick={handleCellClick}
                              onDragOver={handleCellDragOver}
                              onDrop={handleCellDrop}
                              appointments={getAppointmentsForCell(day, time, cabin.id.toString())}
                              slotDuration={slotDuration}
                              minuteGranularity={minuteGranularity}
                              moveGranularity={moveGranularity}
                              active={active}
                              today={today}
                              cabinIndex={cabinIndex}
                              setSelectedOverride={setSelectedOverride}
                              setIsOverrideModalOpen={setIsOverrideModalOpen}
                              hasAppointmentAtPosition={hasAppointmentAtPosition}
                              handleAppointmentClick={handleAppointmentClick}
                              handleAppointmentDragStart={handleAppointmentDragStart}
                              handleDragEnd={handleDragEnd}
                              dragState={localDragState}
                              cellHeight={AGENDA_CONFIG.ROW_HEIGHT}
                              isDaily={false}
                              globalDragState={localDragState}
                              updateCurrentPosition={updateCurrentPosition}
                              handleAppointmentDrop={handleAppointmentDrop}
                              onDurationChange={handleDurationChange}
                              isDraggingDuration={isDraggingDuration}
                              onDraggingDurationChange={setIsDraggingDuration}
                              onRevertExtension={handleRevertExtension}
                              onTagsUpdate={handleTagsUpdate}
                              onMoveAppointment={handleMoveAppointment}
                              onDeleteAppointment={handleDeleteAppointment}
                              onTimeAdjust={handleTimeAdjust}
                              onStartAppointment={(appointmentId: string) => {
                                console.log('[WeeklyAgenda] 🚀 onStartAppointment llamado:', appointmentId);
                                // TODO: Implementar lógica de inicio de cita si es necesario
                              }}
                              onClientNameClick={handleClientNameClick}
                              updateDragDirection={updateDragDirection}
                              smartPlugsData={smartPlugsData}
                            />
                          );
                          // ***** FIN INTEGRACIÓN EN REND *****
                        }) : (
                          <div className="flex justify-center items-center p-1 h-full text-xs italic text-center text-gray-400 border-t border-r border-gray-200 last:border-r-0" style={{ height: `${AGENDA_CONFIG.ROW_HEIGHT}px` }}>
                            Sin cabinas activas
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          {/* ✅ INDICADOR DE HORA ACTUAL - CORRECTAMENTE POSICIONADO */}
          <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 30 }}>
            <CurrentTimeIndicator
              key="desktop-week-indicator"
              timeSlots={timeSlots}
              isMobile={false}
              className="current-time-indicator"
              agendaRef={agendaRef}
              clinicOpenTime={timeSlots[0]} 
              clinicCloseTime={timeSlots[timeSlots.length - 1]}
            />
          </div>
        </div>
      </div>
    )
  }

  // Función para verificar si hay una cita en una posición específica  
  const hasAppointmentAtPosition = useCallback((day: Date, time: string, cabinId: string, offsetMinutes: number): boolean => {
    const [hours, minutes] = time.split(':').map(Number);
    const hoverTimeInMinutes = hours * 60 + minutes + offsetMinutes;
    
    // Buscar TODAS las citas del día y cabina, no solo las del slot actual
    return appointmentsList.some(apt => {
      // ✅ EXCLUIR la cita que está siendo arrastrada actualmente usando el sistema local
      const isDraggedInLocalState = localDragState.draggedItem && apt.id === localDragState.draggedItem.id;
      
      if (isDraggedInLocalState) {
        return false; // No contar la cita que se está arrastrando
      }
      
      // Verificar que sea el mismo día
      if (!isSameDay(apt.date, day)) return false;
      
      // Verificar que sea la misma cabina
      if (apt.roomId !== cabinId) return false;
      
      // Obtener hora de inicio y fin de la cita
      const aptStartTime = typeof apt.startTime === 'string' ? apt.startTime : '00:00';
      const [aptHours, aptMinutes] = aptStartTime.split(':').map(Number);
      const aptStartMinutes = aptHours * 60 + aptMinutes;
      const aptEndMinutes = aptStartMinutes + apt.duration;

      // Verificar si el punto del hover está dentro del rango de la cita
      return hoverTimeInMinutes >= aptStartMinutes && hoverTimeInMinutes < aptEndMinutes;
    });
  }, [appointmentsList, localDragState.draggedItem]);

  // Manejar clic sobre una cita existente para abrir el modal de edición
  const handleAppointmentClick = useCallback((appointment: Appointment) => {
    console.log('[WeeklyAgenda] 🔍 handleAppointmentClick - Cita clickeada:', {
      id: appointment.id,
      name: appointment.name,
      services: appointment.services,
      personId: appointment.personId,
      isOptimistic: appointment.id.toString().startsWith('temp-'),
    });

    // ✅ PERMITIR EDICIÓN: Abrir modal incluso con citas optimistas
    // Si es optimista pero tiene datos básicos, permitir edición
    const isOptimistic = appointment.id.toString().startsWith('temp-');
    if (isOptimistic) {
      console.log('[WeeklyAgenda] ✅ Abriendo modal con cita optimista para edición inmediata');
    }

    // Guardar la cita seleccionada
    setSelectedAppointment(appointment);

    // Construir objeto Person a partir del nombre telefóno, etc.
    const [firstName, ...rest] = appointment.name.split(' ');
    const personForModal: Person = {
      id: appointment.personId || '',
      firstName: firstName || appointment.name,
      lastName: rest.join(' ') || '',
      phone: appointment.phone || '',
    };

    console.log('[WeeklyAgenda] 🔍 handleAppointmentClick - Person para modal:', personForModal);

    // Actualizar estados necesarios para AppointmentDialog
    setSelectedClient(personForModal);
    setSelectedSlot({
      date: appointment.date,
      time: appointment.startTime,
      roomId: appointment.roomId,
    });

    setIsAppointmentDialogOpen(true);
  }, []);

  // Handler para cuando se hace click en el nombre del cliente
  const handleClientNameClick = useCallback((appointment: Appointment) => {
    console.log("Click en nombre del cliente, abriendo resumen:", appointment);
    
    // Construir objeto Person a partir del nombre telefóno, etc.
    const [firstName, ...rest] = appointment.name.split(' ');
    const personForQuickView: Person = {
      id: appointment.personId || '',
      firstName: firstName || appointment.name,
      lastName: rest.join(' ') || '',
      phone: appointment.phone || '',
      email: null,
      address: null,
      city: null,
      postalCode: null
    };

    // Configurar el cliente para el quick view
    setSelectedClientForQuickView(personForQuickView);
    
    // Abrir solo el ClientQuickViewDialog
    setIsClientQuickViewOpen(true);
  }, []);

  const handleAppointmentAdd = useCallback((appointment: Appointment) => {
    // ✅ USAR SISTEMA OPTIMISTA DEL HOOK en lugar de setState local
    const exists = appointmentsList.some(apt => apt.id === appointment.id);
    
    // ✅ CONVERTIR Appointment a WeeklyAgendaAppointment si es necesario
    const weeklyAppointment = {
      ...appointment,
      endTime: appointment.endTime || appointment.startTime // ✅ Asegurar endTime obligatorio
    } as WeeklyAgendaAppointment;
    
    if (exists) {
      // Si la cita ya existe, actualizarla
      updateOptimisticAppointment(appointment.id, weeklyAppointment);
    } else {
      // Si no existe, añadirla
      addOptimisticAppointment(weeklyAppointment);
    }
  }, [appointmentsList, updateOptimisticAppointment, addOptimisticAppointment]);

  const setCurrentDateWithTransition = useCallback((newDate: Date) => {
    // Si ya estamos en transición, actualizar directamente sin efectos
    if (isTransitioning) {
      setCurrentDate(newDate);
      return;
    }
    
    // Determinar dirección de la transición
    const direction = newDate > currentDate ? 'left' : 'right';
    
    // Aplicar un enfoque más directo para minimizar parpadeos
    setIsTransitioning(true);
    setTransitionDirection(direction);
    
    // Actualizar la fecha inmediatamente
    setCurrentDate(newDate);
    
    // Terminar transición después de un tiempo breve
    // Sin usar requestAnimationFrame adicionales para evitar un ciclo extra de renderizado
    setTimeout(() => {
      setIsTransitioning(false);
      setTransitionDirection(null);
    }, 100);
  }, [currentDate, isTransitioning]);

  const transitionStyles = useMemo(() => ({
    transition: isTransitioning ? 'opacity 100ms ease-out' : 'none',
    opacity: isTransitioning ? 0.98 : 1, // Casi imperceptible para evitar parpadeo
    // No usar transform para evitar forzar repintados innecesarios
    willChange: isTransitioning ? 'opacity' : 'auto'
  }), [isTransitioning]);

  const handleTimeAdjust = useCallback(async (appointmentId: string, direction: 'up' | 'down') => {
    console.log('[WeeklyAgenda handleTimeAdjust] Ajustando hora:', { appointmentId, direction, minuteGranularity });
    
    // ✅ BLOQUEO ELEGANTE: Solo mostrar feedback sutil para time adjust
    const isOptimistic = appointmentId.toString().startsWith('temp-');
    if (isOptimistic) {
      // ✅ FEEDBACK SUTIL: Solo un toast rápido, sin bloquear UX
      toast({
        title: "Procesando...",
        duration: 1500
      });
      return; // ❌ NO ejecutar ajuste
    }
    
    try {
      // Buscar la cita en el estado local
      const appointmentToUpdate = appointmentsList.find(app => app.id === appointmentId);
      if (!appointmentToUpdate) {
        console.error('[WeeklyAgenda handleTimeAdjust] No se encontró la cita:', appointmentId);
        return;
      }

      // Calcular el nuevo horario basándose en la granularidad
      const [hours, minutes] = appointmentToUpdate.startTime.split(':').map(Number);
      const startDate = new Date(appointmentToUpdate.date);
      startDate.setHours(hours, minutes, 0, 0);
      
      // Ajustar según la dirección y granularidad
      const adjustMinutes = direction === 'up' ? -minuteGranularity : minuteGranularity;
      let newStartDate = new Date(startDate.getTime() + adjustMinutes * 60 * 1000);
      
      // Validar límites del horario de la clínica
      const newHours = newStartDate.getHours();
      const newMinutes = newStartDate.getMinutes();
      
      // Control de colisiones: buscar citas en la misma cabina
      const sameCabinAppointments = appointmentsList
        .filter(app => app.roomId === appointmentToUpdate.roomId && app.id !== appointmentId)
        .sort((a, b) => {
          const [aH, aM] = a.startTime.split(':').map(Number);
          const [bH, bM] = b.startTime.split(':').map(Number);
          return (aH * 60 + aM) - (bH * 60 + bM);
        });
      
      // Verificar colisiones y ajustar
      const newStartMinutes = newHours * 60 + newMinutes;
      const newEndMinutes = newStartMinutes + appointmentToUpdate.duration;
      
      for (const otherApp of sameCabinAppointments) {
        const [otherH, otherM] = otherApp.startTime.split(':').map(Number);
        const otherStartMinutes = otherH * 60 + otherM;
        const otherEndMinutes = otherStartMinutes + otherApp.duration;
        
        // Si moviendo hacia arriba y colisiona con el final de otra cita
        if (direction === 'up' && newStartMinutes < otherEndMinutes && newEndMinutes > otherStartMinutes) {
          // Ajustar al final de la cita anterior
          const adjustedMinutes = otherEndMinutes;
          const adjustedHours = Math.floor(adjustedMinutes / 60);
          const adjustedMins = adjustedMinutes % 60;
          newStartDate.setHours(adjustedHours, adjustedMins, 0, 0);
          console.log('[WeeklyAgenda handleTimeAdjust] Ajustado al final de cita anterior:', otherApp.name);
          break;
        }
        
        // Si moviendo hacia abajo y colisiona con el inicio de otra cita
        if (direction === 'down' && newStartMinutes < otherEndMinutes && newEndMinutes > otherStartMinutes) {
          // Ajustar para que termine justo antes del inicio de la siguiente cita
          const adjustedEndMinutes = otherStartMinutes;
          const adjustedStartMinutes = adjustedEndMinutes - appointmentToUpdate.duration;
          if (adjustedStartMinutes >= 0) {
            const adjustedHours = Math.floor(adjustedStartMinutes / 60);
            const adjustedMins = adjustedStartMinutes % 60;
            newStartDate.setHours(adjustedHours, adjustedMins, 0, 0);
            console.log('[WeeklyAgenda handleTimeAdjust] Ajustado antes del inicio de cita siguiente:', otherApp.name);
          }
          break;
        }
      }
      
      // Calcular nueva hora de inicio y fin
      const finalHours = newStartDate.getHours();
      const finalMinutes = newStartDate.getMinutes();
      const newStartTime = `${finalHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;

      // Calcular nueva hora de fin manteniendo la duración
      const newEndDate = new Date(newStartDate.getTime() + appointmentToUpdate.duration * 60 * 1000);
      const newEndTime = `${newEndDate.getHours().toString().padStart(2, '0')}:${newEndDate.getMinutes().toString().padStart(2, '0')}`;

      // Actualizar el estado local inmediatamente (optimistic update)
      const updatedAppointment = {
        ...appointmentToUpdate,
        startTime: newStartTime,
        endTime: newEndTime,
        date: newStartDate
      };

      // ✅ USAR SISTEMA OPTIMISTA DEL HOOK en lugar de setState local
      updateOptimisticAppointment(appointmentId, {
        ...updatedAppointment,
        endTime: updatedAppointment.endTime || updatedAppointment.startTime // ✅ Asegurar endTime
      });

      // Preparar datos para la API
      const targetDate = newStartDate;
      
      const apiData = {
        date: format(targetDate, 'yyyy-MM-dd'),
        startTime: formatDateForAPI(targetDate), // Usar zona horaria de clínica
        endTime: formatDateForAPI(newEndDate), // Usar zona horaria de clínica
        roomId: appointmentToUpdate.roomId,
        durationMinutes: appointmentToUpdate.duration
      };

      console.log('[WeeklyAgenda handleTimeAdjust] Enviando a API:', apiData);

      // Actualizar en la base de datos
      const response = await fetch(
        `/api/appointments`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: appointmentId,
            ...apiData
          })
        }
      );

      if (!response.ok) {
        throw new Error('Error al ajustar la hora de la cita');
      }

      console.log('[WeeklyAgenda handleTimeAdjust] Hora ajustada correctamente');
      
      toast({
        title: "Hora ajustada",
        description: `La cita se movió ${direction === 'up' ? 'hacia arriba' : 'hacia abajo'} ${minuteGranularity} minutos`,
      });
      
    } catch (error) {
      console.error('[WeeklyAgenda handleTimeAdjust] Error:', error);
      
      // Revertir el cambio en caso de error
      fetchAppointments();
      
      toast({
        title: "Error",
        description: "No se pudo ajustar la hora de la cita",
        variant: "destructive",
      });
    }
  }, [appointmentsList, fetchAppointments, toast, formatDateForAPI, minuteGranularity, findAvailableSlot]);

  if (containerMode) {
    return (
      <div className="h-full" style={transitionStyles}>
        <HydrationWrapper fallback={<div>Cargando agenda semanal...</div>}>
          <div className="flex flex-col h-full bg-white">
            {/* En modo contenedor, no mostramos el encabezado ni la barra de navegación
               ya que estos serán proporcionados por el AgendaContainer padre */}
            {renderWeeklyGrid()}
            {/* Asegurarse de que CurrentTimeIndicator esté relacionado con este div si usa refs */}
          </div>
        </HydrationWrapper>
      </div>
    )
  }

  // NUEVA FUNCIÓN HELPER
  const findOverrideForCell = useCallback(
    (day: Date, timeSlot: string, roomId: string): CabinScheduleOverride | null => {
      if (!cabinOverrides || cabinOverrides.length === 0) {
        return null;
      }

      // Iterar sobre cada override para ver si aplica a la celda actual
      for (const override of cabinOverrides) {
        // Comprobación de cabina (ya corregida)
        const appliesToAllCabins = !override.cabinIds || override.cabinIds.length === 0;
        if (!appliesToAllCabins && !override.cabinIds.includes(roomId)) {
          continue;
        }

        try {
            // Parsear fechas y horas necesarias del override y la celda
            // CORREGIDO: Manejar tanto string como Date para las fechas
            const overrideStartDate = typeof override.startDate === 'string' 
                ? parseISO(override.startDate) 
                : override.startDate;
            const overrideEndDate = typeof override.endDate === 'string' 
                ? parseISO(override.endDate) 
                : override.endDate;

            const overrideStartTime = override.startTime; // HH:mm
            const overrideEndTime = override.endTime;     // HH:mm
            const isRecurring = override.isRecurring;
            const daysOfWeek = override.daysOfWeek; // number[] [0-6]
            
            // Parsear recurrenceEndDate opcional, manejando string/Date
            let recurrenceEndDate: Date | null = null;
            if (override.recurrenceEndDate) {
                recurrenceEndDate = typeof override.recurrenceEndDate === 'string'
                    ? parseISO(override.recurrenceEndDate)
                    : override.recurrenceEndDate;
            }

             // Verificar si las fechas son válidas después del parseo/asignación
             /* OLD CHECK:
             if (isNaN(overrideStartDate?.getTime()) || isNaN(overrideEndDate?.getTime()) || (recurrenceEndDate && isNaN(recurrenceEndDate.getTime()))) {
                 console.warn("Skipping override due to invalid date objects:", override);
                 continue; 
             }
             */

             // --- Date Validation --- 
             let isValid = !isNaN(overrideStartDate?.getTime()); // Start date MUST be valid

             if (isRecurring) {
                 // --- Lógica Recurrente ---
                 const effectiveEndDate = recurrenceEndDate ? endOfDay(recurrenceEndDate) : endOfDay(overrideEndDate);
                 const overrideStartDateStart = startOfDay(overrideStartDate);

                 // ¿Está la fecha de la celda DENTRO del rango de fechas de la recurrencia?
                 const isWithinDateRange = isWithinInterval(startOfDay(day), { start: overrideStartDateStart, end: effectiveEndDate });

                 // ¿Coincide el DÍA DE LA SEMANA?
                 const isDayOfWeekMatch = daysOfWeek && daysOfWeek.includes(getDay(day));

                 if (isWithinDateRange && isDayOfWeekMatch) {
                    return override; // ¡Coincidencia de bloqueo recurrente!
                 }
                 // --- Fin Lógica Recurrente ---

             } else {
                 // --- Lógica No Recurrente (Un solo día) ---
                 const overrideStartDateStart = startOfDay(overrideStartDate);

                 // ¿Es la fecha de la celda EXACTAMENTE la fecha de inicio del bloqueo?
                 if (isSameDay(startOfDay(day), overrideStartDateStart)) {
                    return override; // ¡Coincidencia de bloqueo de un solo día!
                 }
                 // --- Fin Lógica No Recurrente ---
             }

        } catch (error) {
            console.error("Error processing override:", override, error);
            continue; // Saltar este override si hay un error inesperado
        }
      }

      // Si el bucle termina sin encontrar coincidencia
      return null;
    },
    [cabinOverrides, loadingOverrides] // Añadir loadingOverrides a las dependencias
  );

  // Return original para cuando se usa de forma independiente
  return (
    <DragTimeProvider>
      <HydrationWrapper>
          {/* Asegurar que el contenedor principal sea flex y ocupe toda la altura */}
          <div className="flex flex-col h-full" style={transitionStyles}>
            {/* El bloque de AgendaNavBar eliminado completamente */}
            
            {/* Contenedor de la rejilla que debe tener scroll */}
            <div ref={gridContainerRef} className="overflow-auto relative flex-1">
                {renderWeeklyGrid()}
                {/* Asegurarse de que CurrentTimeIndicator esté relacionado con este div si usa refs */}
            </div>
            
          </div>
        

          {/* MODAL DE BLOQUEO/OVERRIDE (fuera del contenedor flex principal) */} 
          <BlockScheduleModal
            open={isOverrideModalOpen}
            onOpenChange={(isOpen) => setIsOverrideModalOpen(isOpen)}
            clinicRooms={activeCabins.map(cabin => ({
              ...cabin,
              id: cabin.id.toString()
            }))}
            blockToEdit={selectedOverride}
            clinicId={String(activeClinic?.id)}
            clinicConfig={{
              openTime: timeSlots[0], 
              closeTime: timeSlots[timeSlots.length - 1],
            }}
          />
            
          {/* MODAL DE BÚSQUEDA DE PERSONAS */}
          {isSearchDialogOpen && (
            <PersonSearchDialog
              isOpen={isSearchDialogOpen}
              onClose={() => setIsSearchDialogOpen(false)}
              onPersonSelect={handleClientSelect}
            />
          )}
            
          {/* MODAL DE NUEVO CLIENTE */}
          {isNewClientDialogOpen && (
            <NewClientDialog 
              isOpen={isNewClientDialogOpen} 
              onClose={() => setIsNewClientDialogOpen(false)} 
            />
          )}
            
          {/* MODAL DE VISIÓN RÁPIDA DEL CLIENTE */}
          {isClientQuickViewOpen && (
            <ClientQuickViewDialog
              isOpen={isClientQuickViewOpen}
              onOpenChange={setIsClientQuickViewOpen}
              client={selectedClientForQuickView}
            />
          )}
            
          {/* MODAL DE CITAS */}
          {selectedSlot && selectedClient && (
            <AppointmentDialog 
              isOpen={isAppointmentDialogOpen}
              onClose={() => {
                console.log('[WeeklyAgenda] AppointmentDialog onClose called')
                console.log('[WeeklyAgenda] Current selectedSlot:', selectedSlot)
                console.log('[WeeklyAgenda] Current selectedClient:', selectedClient)
                setIsAppointmentDialogOpen(false);
                setSelectedClient(null); // Limpiar cliente al cerrar
                setSelectedSlot(null);
                setSelectedAppointment(null); // Limpiar cita seleccionada
                setShowClientDetailsOnOpen(false); // Resetear el estado
              }}
              date={selectedSlot.date}
              initialClient={selectedClient}
              selectedTime={selectedAppointment ? selectedAppointment.startTime : selectedSlot.time}  // Usar hora actual de la cita si está editando
              roomId={selectedSlot.roomId}
              isEditing={!!selectedAppointment}
              existingAppointment={selectedAppointment}
              clinic={{ id: activeClinic?.id?.toString() || '', name: activeClinic?.name || '' }}
              professional={{ id: '', name: '' }} // TODO: implementar selección de profesional
              onSearchClick={() => { 
                setIsAppointmentDialogOpen(false); 
                setIsSearchDialogOpen(true); 
              }}
              onNewClientClick={handleNewClientClick}
              onMoveAppointment={async () => {
                // Usar la función de mover en lugar de eliminar
                if (selectedAppointment?.id) {
                  handleMoveAppointment(selectedAppointment.id);
                } else {
                  console.error('[WeeklyAgenda] No hay cita seleccionada para mover');
                }
              }}
              onDeleteAppointment={handleDeleteAppointment}
              onSaveAppointment={async (appointmentData) => {
                const isUpdate = !!appointmentData.id;
                
                // ✅ CREAR FUNCIÓN HELPER PARA GENERAR CITA OPTIMISTA
                const createOptimisticAppointment = (data: any, selectedClientData: Person | null = null) => {
                  // Generar ID temporal para nuevas citas
                  const tempId = `temp-${Date.now()}`;
                  
                  // ✅ OBTENER NOMBRE DEL CLIENTE CORRECTAMENTE
                  let clientName = 'Cliente'; // Fallback por defecto
                  
                  // ✅ PRIORIDAD 1: Cliente pasado como parámetro
                  if (selectedClientData) {
                    clientName = `${selectedClientData.firstName} ${selectedClientData.lastName}`;
                    console.log('[WeeklyAgenda] 👤 Cliente desde parámetro:', clientName);
                  }
                  // ✅ PRIORIDAD 2: Cliente del estado global
                  else if (selectedClient) {
                    clientName = `${selectedClient.firstName} ${selectedClient.lastName}`;
                    console.log('[WeeklyAgenda] 👤 Cliente desde estado global:', clientName);
                  }
                  // ✅ PRIORIDAD 3: Cliente desde datos del modal
                  else if (data.person?.name) {
                    clientName = data.person.name;
                    console.log('[WeeklyAgenda] 👤 Cliente desde datos del modal:', clientName);
                  }
                  
                  console.log('[WeeklyAgenda] 👤 NOMBRE CLIENTE FINAL para optimista:', clientName);
                  
                  // Simular fecha en timezone de clínica (igual que fetchAppointments)
                  const clinicTz = (activeClinic as any)?.countryInfo?.timezone || (activeClinic as any)?.country?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
                  
                  // Crear fechas desde los datos del modal
                  const appointmentDate = new Date(data.date);
                  const [startHours, startMinutes] = data.startTime.split(':').map(Number);
                  const [endHours, endMinutes] = data.endTime.split(':').map(Number);
                  
                  const startDateTime = new Date(appointmentDate);
                  startDateTime.setHours(startHours, startMinutes, 0, 0);
                  
                  const endDateTime = new Date(appointmentDate);
                  endDateTime.setHours(endHours, endMinutes, 0, 0);
                  
                  // ✅ USAR EXACTAMENTE LA MISMA LÓGICA DE COLOR QUE fetchAppointments
                  let appointmentColor = '#9CA3AF'; // Color por defecto (gris)
                  
                  // ✅ USAR SERVICIOS REALES del modal en lugar de mock data
                  const realServicesData = data.selectedServicesData || [];
                  console.log('[WeeklyAgenda] 🎨 Servicios para color optimista:', realServicesData);
                  
                  // ✅ CONVERTIR SERVICIOS CON ESTRUCTURA IDÉNTICA A LA API FINAL
                  const optimisticServices = realServicesData.map((service: any) => ({
                    id: `temp-service-${Date.now()}-${service.id}`, // ID temporal único
                    appointmentId: tempId, // Appointment temporal
                    serviceId: service.id, // ID real del servicio
                    quantity: 1,
                    status: 'SCHEDULED',
                    service: {
                      id: service.id,
                      name: service.name,
                      colorCode: service.color || '#8B5CF6', // ✅ Usar color real del servicio
                      categoryId: service.category || 'default',
                      durationMinutes: service.duration || 15,
                      price: service.price || 0
                    }
                  }));
                  
                  console.log('[WeeklyAgenda] 🎨 Servicios optimistas procesados:', optimisticServices);
                  
                  if (optimisticServices && optimisticServices.length > 0) {
                    // ✅ USAR EXACTAMENTE LA MISMA LÓGICA QUE fetchAppointments y API response
                    const serviceTypes = new Set(optimisticServices.map((s: any) => s.service?.categoryId));
                    const uniqueColors = new Set(optimisticServices.map((s: any) => s.service?.colorCode).filter(Boolean));
                    
                    console.log('[WeeklyAgenda] 🎨 Optimista - Service types:', Array.from(serviceTypes));
                    console.log('[WeeklyAgenda] 🎨 Optimista - Unique colors:', Array.from(uniqueColors));
                    
                    if (serviceTypes.size === 1 && uniqueColors.size === 1) {
                                         // Todos los servicios del mismo tipo - usar el color del servicio real
                       const firstColor = Array.from(uniqueColors)[0] as string;
                       appointmentColor = firstColor || appointmentColor;
                      console.log('[WeeklyAgenda] 🎨 Optimista - Color de servicio único:', appointmentColor);
                    } else {
                      // Múltiples tipos de servicios - usar el color de la cabina
                      const cabin = activeCabins.find(c => c.id === data.roomId);
                      if (cabin?.color) {
                        appointmentColor = cabin.color;
                        console.log('[WeeklyAgenda] 🎨 Optimista - Color de cabina:', appointmentColor);
                      } else {
                                         // Fallback al primer color disponible
                         const firstColor = Array.from(uniqueColors)[0] as string;
                         appointmentColor = firstColor || '#8B5CF6';
                        console.log('[WeeklyAgenda] 🎨 Optimista - Color fallback:', appointmentColor);
                      }
                    }
                  } else {
                    // Sin servicios - usar color de cabina
                    const cabin = activeCabins.find(c => c.id === data.roomId);
                    if (cabin?.color) {
                      appointmentColor = cabin.color;
                      console.log('[WeeklyAgenda] 🎨 Optimista - Color de cabina (sin servicios):', appointmentColor);
                    }
                  }
                  
                  // ✅ CREAR CITA CON ESTRUCTURA BÁSICA PERO SERVICIOS COMPLETOS
                  
                  // ✅ DEBUG EXPLÍCITO: Verificar qué duración se está usando
                  console.log('[WeeklyAgenda] 🔍 DEBUG DURACIÓN OPTIMISTA:', {
                    'data.durationMinutes': data.durationMinutes,
                    'startDateTime': startDateTime.toISOString(),
                    'endDateTime': endDateTime.toISOString(),
                    'calculatedFromDates': Math.ceil((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60)),
                    'willUse': data.durationMinutes || Math.ceil((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60))
                  });
                  
                  const optimisticAppointment: WeeklyAgendaAppointment = {
                    id: tempId,
                    name: clientName,
                    service: optimisticServices.map((s: any) => s.service?.name).filter(Boolean).join(", ") || realServicesData.map((s: any) => s.name).join(", ") || 'Servicios seleccionados',
                    date: startDateTime,
                    roomId: data.roomId,
                    clinicId: activeClinic?.id || '', // 🆕 AÑADIR clinicId
                    startTime: format(startDateTime, 'HH:mm'),
                    endTime: format(endDateTime, 'HH:mm'), // ✅ OBLIGATORIA para WeeklyAgendaAppointment
                    duration: data.durationMinutes || Math.ceil((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60)), // ✅ USAR DURACIÓN DEL MODAL DIRECTAMENTE
                    color: appointmentColor,
                    phone: selectedClientData?.phone || selectedClient?.phone || '',
                    services: optimisticServices, // ✅ SERVICIOS CON ESTRUCTURA COMPLETA
                    tags: data.tags || [],
                    notes: data.notes || '',
                    personId: data.personId || selectedClientData?.id || selectedClient?.id || '', // ✅ PersonId válido
                    // ✅ CRÍTICO: Añadir estimatedDurationMinutes para evitar botón restablecer incorrecto
                    estimatedDurationMinutes: data.estimatedDurationMinutes || optimisticServices.reduce((sum: number, s: any) => sum + (s.service?.durationMinutes || 0), 0)
                  };
                  
                  console.log('[WeeklyAgenda] 🎨 Cita optimista completa creada:', {
                    id: optimisticAppointment.id,
                    name: optimisticAppointment.name,
                    service: optimisticAppointment.service,
                    color: optimisticAppointment.color,
                    services: optimisticAppointment.services,
                    duration: optimisticAppointment.duration, // ✅ VERIFICAR ESTE VALOR ESPECÍFICAMENTE
                    personId: optimisticAppointment.personId,
                    servicesCount: optimisticAppointment.services?.length || 0,
                    firstServiceStructure: optimisticAppointment.services?.[0] || 'N/A',
                    // ✅ DEBUG: Información de duración
                    durationFromModal: data.durationMinutes,
                    durationCalculated: Math.ceil((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60)),
                    endTimeFromModal: data.endTime,
                    startTimeFromModal: data.startTime,
                    whichDurationUsed: data.durationMinutes ? 'modal' : 'calculated',
                    // ✅ NUEVO DEBUG CRÍTICO
                    finalObjectDuration: optimisticAppointment.duration,
                    startTime: optimisticAppointment.startTime,
                    endTime: optimisticAppointment.endTime
                  });
                  
                  return optimisticAppointment;
                };
                
                                  // ✅ RENDERIZADO OPTIMISTA GLOBAL INMEDIATO - ANTES de llamar API  
                let tempAppointmentId: string | null = null;
                if (!isUpdate) {
                  console.log('[WeeklyAgenda] 🚀 RENDERIZADO OPTIMISTA GLOBAL - Creando cita inmediatamente');
                  
                  // ✅ CREAR CITA OPTIMISTA CON DATOS REALES DEL MODAL
                  const optimisticAppointment = createOptimisticAppointment(appointmentData, selectedClient);
                  tempAppointmentId = optimisticAppointment.id; // ✅ GUARDAR ID TEMPORAL ESPECÍFICO
                  
                  // ✅ USAR SISTEMA OPTIMISTA GLOBAL - VISIBLE EN AMBAS VISTAS
                  addOptimisticAppointment(optimisticAppointment);
                  console.log('[WeeklyAgenda] ✅ Cita optimista añadida al CACHE GLOBAL con ID:', tempAppointmentId);
                } else {
                  // ✅ RENDERIZADO OPTIMISTA INMEDIATO PARA EDICIONES - ANTES de API
                  console.log('[WeeklyAgenda] 🚀 RENDERIZADO OPTIMISTA INMEDIATO - Actualizando cita antes de API');
                  
                  if (appointmentData.id) {
                    // Buscar la cita actual en appointmentsList para preservar datos
                    const currentAppointment = appointmentsList.find(apt => apt.id === appointmentData.id);
                    if (currentAppointment) {
                      // ✅ DETERMINAR QUÉ CAMPOS ACTUALIZAR SEGÚN LO QUE CAMBIÓ
                      const updateFields: any = {};
                      
                      // ✅ SIEMPRE actualizar tags si están presentes
                      if (appointmentData.tags !== undefined) {
                        updateFields.tags = appointmentData.tags;
                      }
                      
                      // ✅ ACTUALIZAR SERVICIOS si están presentes - CON DATOS REALES 100%
                      const servicesChanged = appointmentData.services && appointmentData.services.length > 0;
                      if (servicesChanged) {
                        console.log('[WeeklyAgenda] 🔧 Servicios cambiaron, detectados IDs:', appointmentData.services);
                        
                        // ✅ OBTENER DATOS REALES de servicios desde allServicesData
                        const realServices = appointmentData.services.map((serviceId: string) => {
                          return allServicesData.find((s: any) => s.id === serviceId);
                        }).filter(Boolean); // Eliminar servicios no encontrados
                        
                        console.log('[WeeklyAgenda] 🔧 Servicios reales encontrados:', realServices.length, 'de', appointmentData.services.length);
                        
                        // ✅ CREAR ESTRUCTURA COMPLETA con datos reales (100% igual que API)
                        const optimisticServices = realServices.map((service: any) => ({
                          id: `temp-service-${Date.now()}-${service.id}`,
                          appointmentId: appointmentData.id,
                          serviceId: service.id,
                          quantity: 1,
                          status: 'SCHEDULED',
                          service: {
                            id: service.id,
                            name: service.name,                           // ✅ NOMBRE REAL
                            colorCode: service.colorCode || '#8B5CF6',   // ✅ COLOR REAL
                            categoryId: service.categoryId || 'default', // ✅ CATEGORÍA REAL
                            durationMinutes: service.durationMinutes || 15, // ✅ DURACIÓN REAL
                            price: service.price || 0                    // ✅ PRECIO REAL
                          }
                        }));
                        
                        // ✅ CALCULAR COLOR REAL basado en servicios reales (misma lógica que API)
                        let newColor = '#9CA3AF'; // Color por defecto
                        
                        if (optimisticServices.length > 0) {
                          const serviceTypes = new Set(optimisticServices.map((s: any) => s.service?.categoryId));
                          const uniqueColors = new Set(optimisticServices.map((s: any) => s.service?.colorCode).filter(Boolean));
                          
                          if (serviceTypes.size === 1 && uniqueColors.size === 1) {
                            // Todos los servicios del mismo tipo - usar color del servicio
                            const firstColor = Array.from(uniqueColors)[0] as string;
                            newColor = firstColor || newColor;
                            console.log('[WeeklyAgenda] 🎨 Color optimista de servicio único:', newColor);
                          } else {
                            // Múltiples tipos - usar color de cabina
                            const cabin = activeCabins.find(c => c.id === currentAppointment.roomId);
                            newColor = cabin?.color || newColor;
                            console.log('[WeeklyAgenda] 🎨 Color optimista de cabina (múltiples tipos):', newColor);
                          }
                        }
                        
                        // ✅ TEXTO REAL con nombres de servicios (100% igual que API)
                        const newServiceText = optimisticServices.map((s: any) => s.service?.name).filter(Boolean).join(", ") || 'Sin servicio';
                        
                        // ✅ CALCULAR NUEVA DURACIÓN TOTAL basándose en servicios reales (igual que DayView)
                        const newTotalDuration = optimisticServices.reduce((total: number, service: any) => {
                          const serviceDuration = service.service?.durationMinutes || 15;
                          console.log('[WeeklyAgenda] 🔍 Sumando duración de servicio:', {
                            serviceName: service.service?.name,
                            serviceDuration,
                            totalAcumulado: total + serviceDuration
                          });
                          return total + serviceDuration;
                        }, 0);
                        
                        console.log('[WeeklyAgenda] 🔍 DURACIÓN TOTAL CALCULADA:', {
                          optimisticServicesCount: optimisticServices.length,
                          newTotalDuration,
                          oldDuration: currentAppointment.duration
                        });
                        
                        // ✅ SEGURIDAD: Solo recalcular duración si hay servicios válidos
                        if (newTotalDuration > 0) {
                          // ✅ RECALCULAR ENDTIME basándose en nueva duración (igual que DayView)
                          const currentStartTime = currentAppointment.startTime;
                          const [startHours, startMinutes] = currentStartTime.split(':').map(Number);
                          const startTotalMinutes = startHours * 60 + startMinutes;
                          const endTotalMinutes = startTotalMinutes + newTotalDuration;
                          const endHours = Math.floor(endTotalMinutes / 60);
                          const endMins = endTotalMinutes % 60;
                          const newEndTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
                          
                          updateFields.services = optimisticServices;
                          updateFields.service = newServiceText;
                          updateFields.color = newColor;
                          updateFields.durationMinutes = newTotalDuration; // ✅ CORREGIDO: durationMinutes en lugar de duration
                          updateFields.duration = newTotalDuration; // ✅ Mantener ambos para compatibilidad
                          updateFields.endTime = newEndTime; // ✅ Nuevo endTime
                        } else {
                          console.log('[WeeklyAgenda] ⚠️ Nueva duración calculada es 0, solo actualizando servicios y color');
                          // Solo actualizar servicios, color y texto, no duración ni endTime
                          updateFields.services = optimisticServices;
                          updateFields.service = newServiceText;
                          updateFields.color = newColor;
                        }
                      }
                      
                      // ✅ ACTUALIZAR DURACIÓN/TIEMPOS - Pero NO sobrescribir si ya se calculó desde servicios
                      const modalEndTimeChanged = appointmentData.endTime && appointmentData.endTime !== currentAppointment.endTime;
                      const baseDurationChanged = appointmentData.durationMinutes && appointmentData.durationMinutes !== currentAppointment.duration;
                      const extensionsChanged = appointmentData.hasExtension !== undefined || appointmentData.extensionMinutes !== undefined;
                      
                      // ✅ SOLO procesar cambios de duración/tiempo si NO hubo cambios de servicios (evitar sobrescribir)
                      if ((modalEndTimeChanged || baseDurationChanged || extensionsChanged) && !servicesChanged) {
                        // ✅ PRIORIDAD 1: Usar endTime directamente del modal (servicios/módulos ya calculados)
                        if (modalEndTimeChanged && appointmentData.endTime) {
                          console.log('[WeeklyAgenda] 🕐 EndTime cambió en modal (servicios/módulos):', {
                            oldEndTime: currentAppointment.endTime,
                            newEndTime: appointmentData.endTime,
                            durationMinutes: appointmentData.durationMinutes
                          });
                          
                          updateFields.endTime = appointmentData.endTime; // ✅ USAR ENDTIME DEL MODAL directamente
                          
                          // ✅ SIEMPRE actualizar duración - CRÍTICO PARA RENDERIZADO OPTIMISTA
                          if (appointmentData.durationMinutes) {
                            updateFields.durationMinutes = appointmentData.durationMinutes; // ✅ CORREGIDO: durationMinutes
                            updateFields.duration = appointmentData.durationMinutes; // ✅ Mantener ambos para compatibilidad
                            console.log('[WeeklyAgenda] 🕐 Duración actualizada desde modal:', appointmentData.durationMinutes);
                          } else {
                            // ✅ FALLBACK: Calcular duración desde startTime/endTime
                            const currentStartTime = currentAppointment.startTime;
                            const [startHours, startMinutes] = currentStartTime.split(':').map(Number);
                            const [endHours, endMinutes] = appointmentData.endTime.split(':').map(Number);
                            const startTotalMinutes = startHours * 60 + startMinutes;
                            const endTotalMinutes = endHours * 60 + endMinutes;
                            const calculatedDuration = endTotalMinutes - startTotalMinutes;
                            updateFields.durationMinutes = calculatedDuration > 0 ? calculatedDuration : currentAppointment.duration; // ✅ CORREGIDO: durationMinutes
                            updateFields.duration = calculatedDuration > 0 ? calculatedDuration : currentAppointment.duration; // ✅ Mantener ambos para compatibilidad
                            console.log('[WeeklyAgenda] 🕐 Duración calculada desde startTime/endTime:', updateFields.duration);
                          }
                        } 
                        // ✅ PRIORIDAD 2: Recalcular solo si no hay endTime del modal
                        else if (baseDurationChanged || extensionsChanged) {
                          // ✅ CALCULAR DURACIÓN TOTAL incluyendo extensiones/módulos (granularidad)
                          const baseDuration = appointmentData.durationMinutes || currentAppointment.duration;
                          const extensionMinutes = appointmentData.hasExtension ? (appointmentData.extensionMinutes || 0) : 0;
                          const totalDuration = baseDuration + extensionMinutes;
                          
                          console.log('[WeeklyAgenda] 🕐 Duración/extensiones cambiaron (recalculando):', {
                            baseDuration: baseDuration,
                            extensionMinutes: extensionMinutes,
                            totalDuration: totalDuration,
                            hasExtension: appointmentData.hasExtension,
                            vs: currentAppointment.duration
                          });
                          
                          const currentStartTime = currentAppointment.startTime;
                          
                          // Recalcular endTime con duración total (base + extensiones)
                          const [startHours, startMinutes] = currentStartTime.split(':').map(Number);
                          const startTotalMinutes = startHours * 60 + startMinutes;
                          const endTotalMinutes = startTotalMinutes + totalDuration;
                          const endHours = Math.floor(endTotalMinutes / 60);
                          const endMins = endTotalMinutes % 60;
                          const newEndTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
                          
                          updateFields.durationMinutes = totalDuration; // ✅ CORREGIDO: durationMinutes para módulos/granularidad
                          updateFields.duration = totalDuration; // ✅ Mantener ambos para compatibilidad
                          updateFields.endTime = newEndTime;     // ✅ HORA FIN calculada con extensiones
                        }
                        // ✅ NO actualizar startTime - mantener original para preservar fecha
                      }
                      
                      // ✅ APLICAR SOLO LOS CAMPOS QUE REALMENTE CAMBIARON
                      console.log('[WeeklyAgenda] 🚀 ENVIANDO A updateOptimisticAppointment:', {
                        appointmentId: appointmentData.id,
                        updateFields: updateFields,
                        durationInUpdateFields: updateFields.duration,
                        durationMinutesInUpdateFields: updateFields.durationMinutes, // ✅ AÑADIR NUEVO CAMPO
                        hasValidDuration: typeof updateFields.duration === 'number'
                      });
                      
                      updateOptimisticAppointment(appointmentData.id, updateFields);
                      
                      console.log('[WeeklyAgenda] ✅ Servicios y duración actualizados inmediatamente:', {
                        fieldsUpdated: Object.keys(updateFields),
                        tags: appointmentData.tags,
                        tagsChanged: JSON.stringify(appointmentData.tags) !== JSON.stringify(currentAppointment.tags),
                        durationChanged: baseDurationChanged || extensionsChanged,
                        oldDuration: currentAppointment.duration,
                        newDuration: updateFields.duration || 'sin cambio',
                        oldEndTime: currentAppointment.endTime,
                        newEndTime: updateFields.endTime || 'sin cambio',
                        updateFields: updateFields
                      });
                    }
                  }
                }
                
                try {
                  const method = isUpdate ? 'PUT' : 'POST';
                  
                  // ✅ LLAMAR API EN BACKGROUND
                  console.log('[WeeklyAgenda] 🔄 Llamando API en background...');
                  const response = await fetch('/api/appointments', {
                    method: method,
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(appointmentData),
                  });
      
                  if (!response.ok) {
                    throw new Error(isUpdate ? 'Error updating appointment' : 'Error creating appointment');
                  }
      
                  const savedAppointment = await response.json();
                  console.log('[WeeklyAgenda] ✅ API Response recibida:', savedAppointment);
                    
                  // ✅ ACTUALIZAR CON DATOS REALES DE LA API - MISMA LÓGICA QUE fetchAppointments
                  const clinicTz = (activeClinic as any)?.countryInfo?.timezone || (activeClinic as any)?.country?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
                  const startTime = new Date(savedAppointment.startTime);
                  const endTime = new Date(savedAppointment.endTime);
                    
                  // Determinar el color basado en los servicios creados - EXACTA LÓGICA DE fetchAppointments
                  let appointmentColor = '#9CA3AF'; // Color por defecto (gris)
                  
                  console.log('[WeeklyAgenda] 🎨 API Response - Servicios recibidos:', savedAppointment.services);
                  console.log('[WeeklyAgenda] 🎨 API Response - Equipment:', savedAppointment.equipment);
                  
                  if (savedAppointment.services && savedAppointment.services.length > 0) {
                    const serviceTypes = new Set(savedAppointment.services.map((s: any) => s.service?.categoryId));
                    const uniqueColors = new Set(savedAppointment.services.map((s: any) => s.service?.colorCode).filter(Boolean));
                    
                    console.log('[WeeklyAgenda] 🎨 API Response - Service types:', Array.from(serviceTypes));
                    console.log('[WeeklyAgenda] 🎨 API Response - Unique colors:', Array.from(uniqueColors));
                    
                    if (serviceTypes.size === 1 && uniqueColors.size === 1) {
                      // Todos los servicios del mismo tipo - usar el color del servicio
                      const firstColor = Array.from(uniqueColors)[0];
                      appointmentColor = (typeof firstColor === 'string' ? firstColor : null) || appointmentColor;
                      console.log('[WeeklyAgenda] 🎨 API Response - Color de servicio único:', appointmentColor);
                    } else if (savedAppointment.equipment?.color) {
                      // Múltiples tipos de servicios - usar el color de la cabina
                      appointmentColor = savedAppointment.equipment.color;
                      console.log('[WeeklyAgenda] 🎨 API Response - Color de cabina:', appointmentColor);
                    } else {
                      // ✅ FALLBACK: Si no hay colores, usar violeta como backup
                      appointmentColor = '#8B5CF6';
                      console.log('[WeeklyAgenda] 🎨 API Response - Usando fallback violeta:', appointmentColor);
                    }
                  }
                    
                  // Obtener los IDs de las etiquetas de la respuesta - EXACTA LÓGICA DE fetchAppointments
                  const tagIds = savedAppointment.tags?.map((tagRelation: any) => tagRelation.tagId || tagRelation) || [];
                    
                  // ✅ CREAR CITA FINAL CON EXACTAMENTE EL MISMO FORMATO QUE fetchAppointments
                  const finalAppointment: WeeklyAgendaAppointment = {
                    id: savedAppointment.id,
                    name: `${savedAppointment.person.firstName} ${savedAppointment.person.lastName}`,
                    service: savedAppointment.services?.map((s: any) => s.service?.name).filter(Boolean).join(", ") || 'Sin servicio',
                    date: startTime,
                    roomId: savedAppointment.roomId,
                    clinicId: savedAppointment.clinicId || activeClinic?.id || '', // 🆕 AÑADIR clinicId
                    startTime: format(startTime, 'HH:mm'),
                    endTime: format(endTime, 'HH:mm'), // ✅ OBLIGATORIA para WeeklyAgendaAppointment
                    duration: savedAppointment.durationMinutes || Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60)), // ✅ USAR DIRECTAMENTE LA DURACIÓN DE LA API
                    color: appointmentColor,
                    phone: savedAppointment.person.phone,
                    services: savedAppointment.services || [],
                    tags: tagIds,
                    notes: savedAppointment.notes,
                    personId: savedAppointment.person.id, // ✅ Añadir personId para transición transparente
                  };
                  
                  console.log('[WeeklyAgenda] 🎨 Cita final creada para reemplazo:', {
                    id: finalAppointment.id,
                    name: finalAppointment.name,
                    service: finalAppointment.service,
                    color: finalAppointment.color,
                    services: finalAppointment.services,
                    duration: finalAppointment.duration
                  });
                    
                  // ✅ EVITAR DOBLE ACTUALIZACIÓN OPTIMISTA - Solo para creaciones, no para ediciones
                  if (isUpdate) {
                    console.log('[WeeklyAgenda] ✅ Edición completada - NO hacer segunda actualización optimista');
                    // ✅ PARA EDICIONES: No hacer segunda actualización - ya está renderizada optimísticamente
                  } else {
                    console.log('[WeeklyAgenda] 🔄 Reemplazando cita optimista con datos reales:', finalAppointment);
                    // ✅ BUSCAR Y REEMPLAZAR CITA TEMPORAL ESPECÍFICA EN CACHE GLOBAL
                    const currentAppointments = appointmentsList;
                    
                    // ✅ PRIORIDAD 1: Buscar por ID específico si existe
                    let tempAppointment = null;
                    if (tempAppointmentId) {
                      tempAppointment = currentAppointments.find(app => app.id === tempAppointmentId);
                      console.log('[WeeklyAgenda] 🔍 Búsqueda por ID específico:', tempAppointmentId, tempAppointment ? 'ENCONTRADA' : 'NO ENCONTRADA');
                    }
                    
                    // ✅ FALLBACK: Buscar cualquier cita temporal si no encontramos la específica
                    if (!tempAppointment) {
                      tempAppointment = currentAppointments.find(app => app.id.toString().startsWith('temp-'));
                      console.log('[WeeklyAgenda] 🔍 Búsqueda genérica de citas temporales:', tempAppointment ? 'ENCONTRADA' : 'NO ENCONTRADA');
                    }
                    
                    if (tempAppointment) {
                      console.log('[WeeklyAgenda] 🔄 Intentando reemplazar cita temporal en cache global:', tempAppointment.id, '→', finalAppointment.id);
                      const replaced = replaceOptimisticAppointment(tempAppointment.id, finalAppointment);
                      
                      if (!replaced) {
                        console.log('[WeeklyAgenda] ❌ FALLO REEMPLAZO - Limpiando citas temporales y añadiendo real');
                        // ✅ LIMPIAR TODAS LAS CITAS TEMPORALES ANTES DE AÑADIR LA REAL
                        const removedCount = removeAllOptimisticAppointments();
                        console.log('[WeeklyAgenda] 🧹 Eliminadas', removedCount, 'citas temporales');
                        
                        // ✅ AHORA SÍ AÑADIR LA CITA REAL
                        addOptimisticAppointment(finalAppointment);
                        console.log('[WeeklyAgenda] ✅ Cita real añadida después de limpiar temporales');
                      } else {
                        console.log('[WeeklyAgenda] ✅ Reemplazo exitoso');
                      }
                    } else {
                      console.log('[WeeklyAgenda] ⚠️ NO ENCONTRADA CITA TEMPORAL - Limpiando y añadiendo real');
                      // ✅ LIMPIAR CUALQUIER CITA TEMPORAL QUE PUEDA EXISTIR
                      const removedCount = removeAllOptimisticAppointments();
                      if (removedCount > 0) {
                        console.log('[WeeklyAgenda] 🧹 Eliminadas', removedCount, 'citas temporales huérfanas');
                      }
                      
                      // ✅ AÑADIR LA CITA REAL
                      addOptimisticAppointment(finalAppointment);
                      console.log('[WeeklyAgenda] ✅ Cita real añadida (no había temporal que reemplazar)');
                    }
                  }
                    
                  console.log('[WeeklyAgenda] ✅ Renderizado optimista completado exitosamente');
                  
                } catch (error) {
                  console.error(`Error ${isUpdate ? 'updating' : 'creating'} appointment:`, error);
                  
                  // ✅ REVERTIR RENDERIZADO OPTIMISTA EN CASO DE ERROR
                  if (isUpdate && appointmentData.id) {
                    console.log('[WeeklyAgenda] ❌ Error API - Revirtiendo cambios optimistas de edición');
                    await invalidateCache(); // Restaurar estado real
                  } else if (!isUpdate) {
                    console.log('[WeeklyAgenda] ❌ Error en API - Revirtiendo cita optimista');
                    // ✅ BUSCAR Y ELIMINAR CITA TEMPORAL DEL CACHE GLOBAL
                    const currentAppointments = appointmentsList;
                    const tempAppointment = currentAppointments.find(app => app.id.toString().startsWith('temp-'));
                    
                    if (tempAppointment) {
                      console.log('[WeeklyAgenda] ❌ Eliminando cita temporal del cache global:', tempAppointment.id);
                      deleteOptimisticAppointment(tempAppointment.id);
                    }
                  }
                  
                  // Mostrar mensaje de error contextual
                  alert(`Error al ${isUpdate ? 'actualizar' : 'crear'} la cita. Por favor, inténtalo de nuevo.`);
                }
              }}
              showClientDetailsOnOpen={showClientDetailsOnOpen}
            />
          )}
        </HydrationWrapper>
    </DragTimeProvider>
  )
}

// <<< RESTAURAR FUNCIÓN HELPER >>>
const convertBlocksToWeekSchedule = (
    blocks: (ScheduleTemplateBlock | ClinicScheduleBlock)[] | undefined | null
): WeekSchedule => {
    const initialSchedule: WeekSchedule = {
        monday: { isOpen: false, ranges: [] }, tuesday: { isOpen: false, ranges: [] },
        wednesday: { isOpen: false, ranges: [] }, thursday: { isOpen: false, ranges: [] },
        friday: { isOpen: false, ranges: [] }, saturday: { isOpen: false, ranges: [] },
        sunday: { isOpen: false, ranges: [] },
    };
    if (!blocks || blocks.length === 0) { 
        return initialSchedule; 
    }
    const weekSchedule = blocks.reduce((acc, block) => {
        const dayKey = block.dayOfWeek.toLowerCase() as keyof WeekSchedule;
        if (acc[dayKey]) { 
            acc[dayKey].isOpen = true;
            acc[dayKey].ranges.push({ start: block.startTime, end: block.endTime });
            acc[dayKey].ranges.sort((a, b) => a.start.localeCompare(b.start));
        }
        return acc;
    }, initialSchedule);
    return weekSchedule;
};
// -------------------------------------

