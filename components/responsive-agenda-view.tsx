/**
 * ✅ COMPONENTE RESPONSIVO DE AGENDA - ORQUESTADOR PRINCIPAL DE VISTAS
 * 
 * ARQUITECTURA COMPLETA DEL SISTEMA:
 * ==================================
 * 
 * 🎯 **PROPÓSITO**: Componente principal que maneja la lógica de vistas responsivas y navegación
 * 
 * 📱 **RESPONSIVIDAD INTELIGENTE**:
 * - Móvil (< lg): MobileAgendaView con navegación táctil optimizada
 * - Escritorio (>= lg): WeeklyAgenda o DayView según vista activa
 * - Detección automática de viewport y adaptación
 * 
 * 🔧 **INTEGRACIÓN CON PRISMA**:
 * - SIEMPRE usar: import { prisma } from '@/lib/db';
 * - Datos de citas procesados desde hooks de cache
 * - Cabinas activas filtradas automáticamente
 * 
 * 🚀 **SISTEMA DE NAVEGACIÓN**:
 * - Sincronización bidireccional con URL (router)
 * - Manejo de botones atrás/adelante del navegador
 * - Actualización de estado desde props (navegación directa)
 * - Prevención de bucles infinitos de navegación
 * 
 * 💾 **HOOKS UTILIZADOS**:
 * - useClinic(): Clínica activa y estado de carga
 * - useCabins(): Cabinas disponibles y filtrado
 * - useRouter/usePathname(): Navegación y sincronización URL
 * 
 * 🔄 **FLUJO DE DATOS**:
 * 1. Props recibidas desde páginas: date, initialView
 * 2. Sincronización con estado interno: currentDate, view
 * 3. Detección de cambios en URL (popstate)
 * 4. Renderizado condicional por viewport
 * 5. Paso de props procesadas a componentes hijos
 * 
 * 📊 **COMPONENTES HIJOS MANEJADOS**:
 * - MobileAgendaView: Vista móvil completa con navegación
 * - WeeklyAgenda: Vista semanal de escritorio con cache optimizado
 * - DayView: Vista diaria de escritorio con datos filtrados
 * 
 * 🎛️ **ESTADO INTERNO**:
 * - view: 'week' | 'day' - Vista actual activa
 * - currentDate: Date - Fecha actual siendo mostrada
 * - isUpdatingPath: Ref - Prevención de bucles de navegación
 * - previousView/previousDateStr: Refs - Tracking de cambios
 * 
 * ⚡ **OPTIMIZACIONES**:
 * - Importaciones dinámicas para code splitting
 * - Memoización de cabinas activas
 * - Loading states específicos por contexto
 * - Prevención de re-renders innecesarios
 * 
 * 🔗 **SINCRONIZACIÓN URL**:
 * - /agenda/semana/YYYY-MM-DD → view: 'week', date: YYYY-MM-DD
 * - /agenda/dia/YYYY-MM-DD → view: 'day', date: YYYY-MM-DD
 * - Cambios en props → actualización de estado interno
 * - Eventos popstate → re-sincronización con URL actual
 * 
 * ⚠️ **REGLAS CRÍTICAS PARA MODIFICACIONES**:
 * 1. MANTENER sincronización bidireccional con URL
 * 2. NO romper la detección de viewport responsivo
 * 3. PRESERVAR el sistema de prevención de bucles
 * 4. MANTENER la memoización de cabinas activas
 * 5. NO afectar el code splitting de componentes dinámicos
 * 6. PRESERVAR el manejo de estados de carga
 * 7. MANTENER compatibilidad con sistema de cache
 * 
 * 🏗️ **ESTRUCTURA DE PROPS**:
 * ```typescript
 * interface ResponsiveAgendaViewProps {
 *   date: string;              // Fecha en formato YYYY-MM-DD
 *   initialView: 'day' | 'week'; // Vista inicial a mostrar
 * }
 * ```
 * 
 * 📱 **FLUJO DE RESPONSIVIDAD**:
 * 1. Detección de viewport en tiempo real
 * 2. Móvil → MobileAgendaView (componente específico)
 * 3. Escritorio → WeeklyAgenda | DayView según vista
 * 4. Cambio de viewport → re-renderizado automático
 * 
 * 🎯 **CASOS DE USO PRINCIPALES**:
 * - Usuario navega entre fechas → actualización fluida
 * - Usuario cambia vista día/semana → transición inmediata
 * - Usuario usa botones navegador → sincronización URL
 * - Usuario cambia viewport → adaptación responsiva
 * - Sistema prefetch → datos disponibles inmediatamente
 */

"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import dynamic from "next/dynamic"
import { useRouter, usePathname } from "next/navigation"
import { format, parse } from "date-fns"
import { useClinic } from "@/contexts/clinic-context"
import { useCabins } from "@/contexts/CabinContext"
import { Loader2 } from "lucide-react"
import { convertCabinToRoom } from "@/types/fix-types"

// Importar MobileAgendaView de manera dinámica para evitar errores de SSR
const MobileAgendaView = dynamic(
  () => import("@/components/mobile/agenda/agenda-view").then((mod) => mod.MobileAgendaView),
  { ssr: false }
)

// ✅ OPTIMIZACIÓN CRÍTICA: Importaciones estáticas para evitar delay de 6+ segundos
import WeeklyAgenda from "@/components/weekly-agenda"
import DayView from "@/components/day-view"

interface ResponsiveAgendaViewProps {
  date: string
  initialView: "day" | "week"
}

export default function ResponsiveAgendaView({ date: initialDateProp, initialView }: ResponsiveAgendaViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { activeClinic, isLoading: isLoadingClinic, isInitialized } = useClinic();
  const { cabins } = useCabins();

  // --- Lógica de estado movida desde AgendaContainer ---
  const [view, setView] = useState<"week" | "day">(initialView)
  const [currentDate, setCurrentDate] = useState(() => {
    try {
      return parse(initialDateProp, "yyyy-MM-dd", new Date())
    } catch (error) {
      console.error("Error parsing initial date in ResponsiveAgendaView:", error)
      return new Date()
    }
  })
  const isUpdatingPath = useRef(false)
  const previousView = useRef<string | null>(initialView)
  const previousDateStr = useRef<string | null>(initialDateProp)
  // --------------------------------------------------

  // --- Lógica de sincronización con URL movida desde AgendaContainer ---
  // Actualizar estado basado en cambio de props (navegación directa)
  useEffect(() => {
    if (isUpdatingPath.current) return; // Evitar bucles si la actualización viene de popstate
    
    let needsUpdate = false;
    let newView = view;
    let newDate = currentDate;

    if (initialView !== previousView.current) {
        newView = initialView;
        previousView.current = initialView;
        needsUpdate = true;
    }
    
    if (initialDateProp !== previousDateStr.current) {
        try {
            const parsedDate = parse(initialDateProp, "yyyy-MM-dd", new Date());
            if (!isNaN(parsedDate.getTime())) {
                newDate = parsedDate;
                previousDateStr.current = initialDateProp;
                needsUpdate = true;
            }
        } catch (error) {
             console.error("Error parsing date prop:", error);
        }
    }

    if (needsUpdate) {
      setView(newView);
      setCurrentDate(newDate);
    }

  }, [initialDateProp, initialView, view, currentDate]);

  // Escuchar cambios en la URL (botones atrás/adelante)
  useEffect(() => {
    const handlePopState = () => {
      if (isUpdatingPath.current) return;
      isUpdatingPath.current = true; // Bloquear temporalmente
      
      const currentPath = window.location.pathname;
      let newPopView: "week" | "day" = previousView.current as ("week" | "day") || initialView;
      let newPopDate = previousDateStr.current || initialDateProp;

      if (currentPath.includes("/agenda/semana")) {
        newPopView = "week";
      } else if (currentPath.includes("/agenda/dia")) {
        newPopView = "day";
      }

      const dateMatch = currentPath.match(/\d{4}-\d{2}-\d{2}/);
      if (dateMatch) {
        newPopDate = dateMatch[0];
      }

      // Forzar re-renderizado navegando a la misma URL (Next.js maneja esto eficientemente)
      // Esto asegura que las props 'date' e 'initialView' se actualicen desde page.tsx
      router.replace(currentPath);
      
      // Actualizar refs para la siguiente comparación en el primer useEffect
      previousView.current = newPopView;
      previousDateStr.current = newPopDate;

      // Desbloquear después de un delay
      setTimeout(() => { isUpdatingPath.current = false; }, 100); 
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]); // Dependencia de router es importante
  // ------------------------------------------------------------

  // Formato de fecha para pasar a los componentes hijos
  const formattedDate = useMemo(() => format(currentDate, "yyyy-MM-dd"), [currentDate]);

  const activeCabinsForAgenda = useMemo(() => {
    const filtered = cabins?.filter(cabin => cabin.isActive) ?? [];
    return filtered;
  }, [cabins]);

  const isLoading = !isInitialized || isLoadingClinic || cabins === undefined;

  const roomsProp = activeCabinsForAgenda.map(convertCabinToRoom);

  // Renderizado condicional principal
  return (
    <>
      {/* Vista para móvil (sin cambios) */}
      <div className="lg:hidden">
        <MobileAgendaView showMainSidebar={false} />
      </div>
      
      {/* Vista para escritorio - Renderiza WeeklyAgenda o DayView directamente */}
      <div className="hidden lg:block h-full"> {/* Asegurar altura completa */} 
        {isLoading ? (
             <div className="flex items-center justify-center h-full">
               <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
               <span className="ml-2">Cargando datos de agenda...</span>
             </div>
        ) : !activeClinic ? (
             <div className="flex items-center justify-center h-full text-red-600">
                Error: No se pudo cargar la clínica activa.
             </div>
        ) : view === 'week' ? (
          <WeeklyAgenda 
            key={`desktop-week-${formattedDate}`}
            initialDate={formattedDate} 
          />
        ) : (
          <DayView 
            key={`desktop-day-${formattedDate}`}
            date={formattedDate} 
            rooms={roomsProp}
            containerMode={false}
          />
        )}
      </div>
    </>
  )
} 