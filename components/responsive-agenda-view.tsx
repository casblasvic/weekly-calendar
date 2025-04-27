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

// Importaciones dinámicas para las vistas de escritorio (igual que en AgendaContainer)
const WeeklyAgenda = dynamic(
  () => import("@/components/weekly-agenda"),
  { 
    ssr: false, 
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }
);

const DayView = dynamic(
  () => import("@/components/day-view"),
  { 
    ssr: false, 
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }
);

interface ResponsiveAgendaViewProps {
  date: string
  initialView: "day" | "week"
}

export default function ResponsiveAgendaView({ date: initialDateProp, initialView }: ResponsiveAgendaViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { activeClinic, isLoading: isLoadingClinic } = useClinic();
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

  const isLoading = isLoadingClinic || cabins === undefined;

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