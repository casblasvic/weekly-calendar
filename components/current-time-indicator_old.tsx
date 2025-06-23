"use client"

import type React from "react"
import { useEffect, useState, useCallback, useRef, useLayoutEffect } from "react"
import { format, parse, isWithinInterval, addMinutes, startOfDay, differenceInMinutes } from "date-fns"
import { cn } from "@/lib/utils"

// Variable para controlar los logs de debug del CurrentTimeIndicator
const debugCurrentTimeIndicator = false;

interface CurrentTimeIndicatorProps {
  timeSlots: string[]
  rowHeight: number
  isMobile: boolean
  className?: string
  agendaRef: React.RefObject<HTMLDivElement | null> | React.RefObject<HTMLDivElement>
  clinicOpenTime?: string
  clinicCloseTime?: string
  config: any
}

export const CurrentTimeIndicator: React.FC<CurrentTimeIndicatorProps> = ({
  timeSlots,
  rowHeight,
  isMobile,
  className,
  agendaRef,
  clinicOpenTime,
  clinicCloseTime,
  config,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [position, setPosition] = useState<{ top: number; display: string } | null>(null)
  const [nearestSlotTime, setNearestSlotTime] = useState<string | null>(null)
  const [isWithinTimeRange, setIsWithinTimeRange] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [indicatorWidth, setIndicatorWidth] = useState<number | null>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Mover los useRef aquí al inicio para evitar errores de orden de hooks
  const prevPositionRef = useRef<{ top: number; display: string } | null>(null);
  const prevVisibilityRef = useRef<boolean>(false);
  const skipRenderRef = useRef<boolean>(false);
  // Añadir esta ref a nivel de componente, no dentro de updatePosition
  const currentUpdateIdRef = useRef<Symbol | null>(null);
  // Añadir una ref para el id del scroll inicial
  const scrollIdRef = useRef<Symbol | null>(null);

  // Verificar si la hora actual está dentro del horario de la clínica
  const isWithinClinicHours = useCallback(() => {
    if (!clinicOpenTime || !clinicCloseTime) return true // Si no hay horario configurado, mostrar siempre

    const currentTimeString = format(currentTime, "HH:mm")
    const currentMinutes = parseTime(currentTimeString)
    const openMinutes = parseTime(clinicOpenTime)
    const closeMinutes = parseTime(clinicCloseTime)

    return currentMinutes >= openMinutes && currentMinutes <= closeMinutes
  }, [currentTime, clinicOpenTime, clinicCloseTime])

  // Nueva función para verificar si está dentro del rango de timeSlots renderizados
  const isWithinRenderedTimeRange = useCallback(() => {
    if (!timeSlots.length) return false
    
    const currentTimeString = format(currentTime, "HH:mm")
    const currentMinutes = parseTime(currentTimeString)
    
    // Obtener el primer y último slot renderizado
    const firstSlot = timeSlots[0]
    const lastSlot = timeSlots[timeSlots.length - 1]
    
    const firstSlotMinutes = parseTime(firstSlot)
    const lastSlotMinutes = parseTime(lastSlot)
    
    // IMPORTANTE: El indicador debe mostrarse hasta el último slot + duración del slot
    // Si el último slot es 20:00 y los slots son de 30 min, debe mostrarse hasta 20:30
    const slotDurationMinutes = timeSlots.length > 1 ? 
      parseTime(timeSlots[1]) - parseTime(timeSlots[0]) : 30 // Default 30 min si no se puede calcular
    
    const effectiveEndMinutes = lastSlotMinutes + slotDurationMinutes
    
    // Solo mostrar si está entre el primer slot y el último slot + duración (inclusive)
    return currentMinutes >= firstSlotMinutes && currentMinutes <= effectiveEndMinutes
  }, [currentTime, timeSlots])

  // Verificar si mostrar - ahora incluye ambas validaciones
  const shouldShow = isWithinTimeRange && isVisible && isWithinClinicHours() && isWithinRenderedTimeRange() && position !== null

  // Asegurar que el indicador sea visible si hay slots de tiempo
  useEffect(() => {
    setIsVisible(timeSlots.length > 0)
  }, [timeSlots.length])

  // Actualizar el tiempo actual cada minuto con memoización para prevenir doble renderizado
  const updateCurrentTime = useCallback(() => {
    setCurrentTime(new Date())
  }, []);

  // Actualizar el tiempo actual cada minuto con memoización para prevenir doble renderizado
  useEffect(() => {
    // Limpiar cualquier timer anterior para evitar actualizaciones duplicadas
    if (updateTimerRef.current) {
      clearInterval(updateTimerRef.current);
      updateTimerRef.current = null;
    }

    // Actualizar inmediatamente
    updateCurrentTime();

    // Configurar intervalo para actualizar cada minuto
    // Usamos 60500ms en lugar de 60000ms para evitar posibles solapamientos
    const timer = setInterval(updateCurrentTime, 60500);
    updateTimerRef.current = timer;

    return () => {
      if (updateTimerRef.current) {
        clearInterval(updateTimerRef.current);
        updateTimerRef.current = null;
      }
    };
  }, [updateCurrentTime]);

  const updatePosition = useCallback(() => {
    if (!agendaRef.current || timeSlots.length === 0) return;

    const currentTime = new Date();
    const currentTimeString = format(currentTime, "HH:mm");
    const currentTimeMinutes = parseTime(currentTimeString);

    if (debugCurrentTimeIndicator) console.log(`[CurrentTimeIndicator] Hora actual: ${currentTime} (${currentTimeMinutes} min)`);

    // Verificar si la hora actual está después del effectiveEndTime
    const effectiveEndTime = clinicCloseTime || timeSlots[timeSlots.length - 1];
    const effectiveEndMinutes = parseTime(effectiveEndTime);
    
    if (currentTimeMinutes > effectiveEndMinutes) {
      if (debugCurrentTimeIndicator) console.log(`[CurrentTimeIndicator] Hora actual (${currentTimeString}) está después del cierre (${effectiveEndTime}). No renderizar.`);
      setPosition(null);
      return;
    }

    // Buscar TODOS los slots con hour-column
    const container = agendaRef.current;
    const slots = Array.from(container.querySelectorAll('.hour-column[data-time]'));
    if (debugCurrentTimeIndicator) console.log(`[CurrentTimeIndicator] Slots encontrados: ${slots.length}`);
    if (debugCurrentTimeIndicator) console.log(`[CurrentTimeIndicator] Container: ${container.className}`);
    if (debugCurrentTimeIndicator) console.log(`[CurrentTimeIndicator] Primer slot: ${slots[0]?.getAttribute('data-time')}, Último slot: ${slots[slots.length-1]?.getAttribute('data-time')}`);

    if (slots.length === 0) {
      if (debugCurrentTimeIndicator) console.log('[CurrentTimeIndicator] No se encontraron slots en el contenedor');
      return null;
    }
    
    // Obtener el contenedor de referencia para posiciones relativas
    const containerRect = container.getBoundingClientRect();
    
    // Función simple: buscar el slot anterior o igual a la hora actual
    function findCorrectSlot() {
      let bestSlot: Element | null = null;
      let nextSlot: Element | null = null;
      let bestSlotTime: number | null = null;

      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        const slotTime = slot.getAttribute('data-time');
        const slotMinutes = parseTime(slotTime || '');

        if (slotMinutes > currentTimeMinutes) {
          // El slot actual es futuro: usar el anterior como base y este como siguiente
          bestSlot = i > 0 ? slots[i - 1] : slot;
          bestSlotTime = parseTime(bestSlot.getAttribute('data-time') || '');
          nextSlot = slot;
          break;
        }

        // Si estamos en la última iteración y no se ha roto el bucle, usar el último slot
        if (i === slots.length - 1) {
          bestSlot = slot;
          bestSlotTime = slotMinutes;
          nextSlot = null;
        }
      }
      
      if (!bestSlot || bestSlotTime === null) {
        if (debugCurrentTimeIndicator) console.log('[CurrentTimeIndicator] No se encontró un slot adecuado');
        return null;
      }
      
      if (debugCurrentTimeIndicator) console.log(`[CurrentTimeIndicator] Slot seleccionado: ${bestSlot.getAttribute('data-time')} (${bestSlotTime} min)`);
      if (debugCurrentTimeIndicator) console.log(`[CurrentTimeIndicator] Siguiente slot: ${nextSlot?.getAttribute('data-time') || 'ninguno'}`);
      if (debugCurrentTimeIndicator) console.log(`[CurrentTimeIndicator] Vista: ${isMobile ? 'móvil' : 'desktop'}`);
      if (debugCurrentTimeIndicator) console.log(`[CurrentTimeIndicator] Verificación DOM - slot actual offsetTop:`, (bestSlot as HTMLElement).offsetTop);
      if (debugCurrentTimeIndicator) console.log(`[CurrentTimeIndicator] Verificación DOM - container offsetTop:`, container.offsetTop);
      
      return { bestSlot, bestSlotTime, nextSlot };
    }

    const { bestSlot, bestSlotTime, nextSlot } = findCorrectSlot();
    
    if (!bestSlot) {
      if (debugCurrentTimeIndicator) console.log('[CurrentTimeIndicator] No se encontró slot válido');
      setPosition(null);
      return;
    }

    // Calcular posición relativa tomando como referencia el primer slot (para compensar headers)
    const baseOffset = (slots[0] as HTMLElement).offsetTop;
    const relativeTop = (bestSlot as HTMLElement).offsetTop - baseOffset;
    
    if (debugCurrentTimeIndicator) console.log(`[CurrentTimeIndicator] Slot base: ${bestSlot.getAttribute('data-time')} en posición ${relativeTop}px`);
    if (debugCurrentTimeIndicator) console.log(`[CurrentTimeIndicator] Hora actual completa: ${format(currentTime, "HH:mm:ss")}`);
    if (debugCurrentTimeIndicator) console.log(`[CurrentTimeIndicator] currentTimeMinutes: ${currentTimeMinutes}, slotMinutes: ${bestSlotTime}`);
    if (debugCurrentTimeIndicator) console.log(`[CurrentTimeIndicator] DEBUG - offsetTop directo: ${(bestSlot as HTMLElement).offsetTop}px`);
    if (debugCurrentTimeIndicator) console.log(`[CurrentTimeIndicator] DEBUG - Altura del slot: ${(bestSlot as HTMLElement).offsetHeight}px`);
    
    // Verificar si el problema es con la vista semanal
    const totalSlots = slots.length;
    const slotIndex = slots.indexOf(bestSlot);
    if (debugCurrentTimeIndicator) console.log(`[CurrentTimeIndicator] Slot ${slotIndex + 1} de ${totalSlots}`);
    
    // Si la posición calculada es mayor que la altura del contenedor, hay un problema
    const containerHeight = container.scrollHeight || container.offsetHeight;
    if (debugCurrentTimeIndicator) console.log(`[CurrentTimeIndicator] Altura total del contenedor: ${containerHeight}px`);
    
    // Si necesitamos interpolar hasta el siguiente slot
    if (nextSlot) {
      
      const nextRelativeTop = (nextSlot as HTMLElement).offsetTop - baseOffset;
      const slotHeight = nextRelativeTop - relativeTop;
      
      // Calcular minutos desde el slot actual
      const minutesIntoSlot = currentTimeMinutes - bestSlotTime;
      const slotDurationMinutes = parseTime(nextSlot.getAttribute('data-time') || '') - bestSlotTime;
      
      // Interpolar la posición
      const interpolation = (minutesIntoSlot / slotDurationMinutes) * slotHeight;
      const position = relativeTop + interpolation;
      
      if (debugCurrentTimeIndicator) console.log(`[CurrentTimeIndicator] Interpolación: ${minutesIntoSlot}/${slotDurationMinutes} * ${slotHeight}px = +${interpolation}px`);
      if (debugCurrentTimeIndicator) console.log(`[CurrentTimeIndicator] Posición final: ${position}px`);
      
      setPosition({
        top: position,
        display: 'flex'
      });
    } else {
      // Último slot del día o no hay siguiente slot visible
      const slotDurationMinutes = (config?.slotDuration ?? 30);
      const minutesIntoSlot = currentTimeMinutes - (bestSlotTime as number);
      const slotHeightDynamic = (bestSlot as HTMLElement).offsetHeight;
      const interpolation = (minutesIntoSlot / slotDurationMinutes) * slotHeightDynamic;
      const clampedInterpolation = Math.max(0, Math.min(interpolation, rowHeight));
      const position = relativeTop + clampedInterpolation;
      if (debugCurrentTimeIndicator) console.log(`[CurrentTimeIndicator] Interpolación último slot: ${minutesIntoSlot}/${slotDurationMinutes} * ${slotHeightDynamic}px = +${clampedInterpolation}px`);
      if (debugCurrentTimeIndicator) console.log(`[CurrentTimeIndicator] Posición final: ${position}px`);
      if (debugCurrentTimeIndicator) console.log(`[CurrentTimeIndicator] Timezone offset: ${new Date().getTimezoneOffset()} minutos`);
      
      setPosition({
        top: position,
        display: 'flex'
      });
    }
  }, [timeSlots]);

  // Efecto para scroll inicial sin causar parpadeos
  useEffect(() => {
    // No ejecutar si no hay elementos esenciales
    if (!position || !agendaRef.current || !isWithinTimeRange || !isWithinClinicHours()) return;
    
    // Pequeño delay para asegurar que el DOM esté completamente renderizado
    const timeoutId = setTimeout(() => {
      if (!agendaRef.current) return;
      
      // Calcular posición para centrar la línea de tiempo actual
      const agendaHeight = agendaRef.current.clientHeight;
      const centerOffset = Math.max(0, position.top - (agendaHeight / 2));
      
      // Hacer scroll suave al centro
      agendaRef.current.scrollTo({
        top: centerOffset,
        behavior: "smooth"
      });
      
      if (debugCurrentTimeIndicator) console.log('[CurrentTimeIndicator] Centrado automático:', {
        position: position.top,
        agendaHeight,
        centerOffset
      });
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, []); // Solo ejecutar una vez al montar el componente

  // Actualizar la posición cuando cambie el tiempo o los slots, de manera optimizada
  useEffect(() => {
    if (timeSlots.length === 0) return;
    
    // Evitar múltiples actualizaciones superpuestas
    let updateScheduled = false;
    
    const scheduleUpdate = () => {
      if (updateScheduled) return;
      updateScheduled = true;
      requestAnimationFrame(() => {
        updatePosition();
        updateScheduled = false;
      });
    };
    
    // Ejecución inmediata
    scheduleUpdate();

    // Ejecución tardía para asegurar montaje completo del DOM tras navegación/cambio de fecha
    const lateTimeout = setTimeout(scheduleUpdate, 150);

    // Repetir cada minuto para seguir la hora actual
    const intervalId = setInterval(scheduleUpdate, 60000);

    // Limpieza
    return () => {
      clearInterval(intervalId);
      clearTimeout(lateTimeout);
    };
  }, [timeSlots, updatePosition, rowHeight]);

  // Recalcular posición cuando el DOM del contenedor cambie (navegación entre días)
  useLayoutEffect(() => {
    const container = agendaRef.current;
    if (!container) return;

    const observer = new MutationObserver(() => {
      // Recalcular posición tras cambios en el DOM (añadir filas, etc.)
      updatePosition();
    });

    observer.observe(container, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [agendaRef, updatePosition]);

  // Actualizar las referencias solo después de un renderizado completo
  useEffect(() => {
    prevPositionRef.current = position;
    prevVisibilityRef.current = shouldShow;
    skipRenderRef.current = false;
  }, [position, shouldShow]);

  // Efecto para aplicar estilos basados en la posición calculada
  useEffect(() => {
    if (indicatorRef.current && position !== null && isVisible) {
      if (debugCurrentTimeIndicator) console.log(`[CurrentTimeIndicator] APLICANDO POSICIÓN: ${position.top}px al DOM`);
      
      indicatorRef.current.style.borderTop = '2px solid red';
      indicatorRef.current.style.setProperty('--current-time-indicator-border-color', 'red');
      
      // Usar directamente la propiedad top en lugar de transform para evitar offsets adicionales
      indicatorRef.current.style.top = `${Math.max(position?.top ?? 0, 0)}px`;
      indicatorRef.current.style.transform = 'none'; // Eliminar cualquier transform anterior
      indicatorRef.current.style.display = 'block';
      indicatorRef.current.style.visibility = 'visible';
      indicatorRef.current.style.opacity = '1';
      
      if (debugCurrentTimeIndicator) console.log(`[CurrentTimeIndicator] DOM actualizado - top: ${indicatorRef.current.style.top}`);
      
      const span = indicatorRef.current.querySelector('span');
      if (span) {
        // Estilo sin fondo rojo - solo borde y texto rojo
        (span as HTMLElement).style.backgroundColor = 'white';
        (span as HTMLElement).style.color = 'red';
        (span as HTMLElement).style.border = '1px solid red';
        (span as HTMLElement).style.padding = '2px 6px';
        (span as HTMLElement).style.borderRadius = '4px';
        (span as HTMLElement).style.fontWeight = '600';
        (span as HTMLElement).style.fontSize = '12px';
        
        // Posición sticky horizontal real
        (span as HTMLElement).style.position = 'absolute';
        (span as HTMLElement).style.left = '0px';
        (span as HTMLElement).style.top = '-1px';
        (span as HTMLElement).style.transform = 'translateY(-50%)';
        (span as HTMLElement).style.visibility = 'visible';
        (span as HTMLElement).style.zIndex = '44'; // ✅ Por encima del contenedor pero por debajo de modales
        (span as HTMLElement).style.minWidth = '50px';
        (span as HTMLElement).style.textAlign = 'center';
        
        // Crear un contenedor sticky si no existe
        let stickyContainer = indicatorRef.current.querySelector('.time-label-sticky');
        if (!stickyContainer) {
          stickyContainer = document.createElement('div');
          stickyContainer.className = 'time-label-sticky';
          indicatorRef.current.appendChild(stickyContainer);
        }
        
        // Estilos del contenedor sticky
        (stickyContainer as HTMLElement).style.position = 'sticky';
        (stickyContainer as HTMLElement).style.left = '20px';
        (stickyContainer as HTMLElement).style.width = '50px';
        (stickyContainer as HTMLElement).style.height = '2px';
        (stickyContainer as HTMLElement).style.zIndex = '42'; // ✅ Por encima del indicador pero por debajo de modales
        
        // Mover la etiqueta al contenedor sticky
        if (span.parentElement !== stickyContainer) {
          stickyContainer.appendChild(span);
        }
      }
    } else if (indicatorRef.current) {
      indicatorRef.current.style.display = 'none';
      indicatorRef.current.style.opacity = '0';
      indicatorRef.current.style.visibility = 'hidden';
      indicatorRef.current.style.borderTop = 'none';
      // Resetear la posición top en lugar de transform
      indicatorRef.current.style.top = '0';
      indicatorRef.current.style.transform = 'none';
      const labelElement = indicatorRef.current.querySelector('.current-time-label');
      if (labelElement) {
        (labelElement as HTMLElement).style.visibility = 'hidden';
      }
    }
  }, [position, isVisible]);

  // --- useEffect para escuchar window.resize con lógica específica para columnas de cabinas ---
  useEffect(() => {
    const indicatorElement = indicatorRef.current; // Cache ref value
    let rafId: number | null = null; // Variable para guardar el ID del rAF

    const handleWindowResize = () => {
      // Cancelar cualquier rAF pendiente para evitar ejecuciones múltiples
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }

      // Solicitar un nuevo frame para leer y aplicar dimensiones
      rafId = requestAnimationFrame(() => {
        if (agendaRef.current && indicatorElement) {
          let calculatedWidth = 0;
          
          // ✅ VISTA DIARIA: Buscar columnas de cabinas específicamente
          const dayViewColumns = agendaRef.current.querySelectorAll('[style*="gridTemplateColumns"][style*="60px repeat"]');
          if (dayViewColumns.length > 0) {
            // En vista diaria, calcular ancho basándose en las columnas reales
            const firstRow = dayViewColumns[0] as HTMLElement;
            const cabinCells = firstRow.querySelectorAll('div:not(.hour-column):not([data-time])');
            
            if (cabinCells.length > 0) {
              // Calcular el ancho sumando todas las columnas de cabinas
              cabinCells.forEach(cell => {
                calculatedWidth += (cell as HTMLElement).offsetWidth;
              });
              // Añadir el ancho de la columna de hora (60px)
              calculatedWidth += 60;
            }
          } else {
            // ✅ VISTA SEMANAL: Buscar grid principal
            const weeklyGrid = agendaRef.current.querySelector('[style*="gridTemplateColumns"]');
            if (weeklyGrid) {
              const gridContainer = weeklyGrid as HTMLElement;
          
              // En vista semanal, usar el ancho del contenedor del grid menos scroll
              calculatedWidth = gridContainer.offsetWidth;
              
              // Si hay scroll horizontal, ajustar para no sobrepasar
              const parent = gridContainer.parentElement;
              if (parent && parent.scrollWidth > parent.clientWidth) {
                calculatedWidth = Math.min(calculatedWidth, parent.clientWidth);
              }
            }
          }
          
          // ✅ FALLBACK: Si no se pudo calcular, usar clientWidth del contenedor
          if (calculatedWidth <= 0) {
            calculatedWidth = agendaRef.current.clientWidth;
          }
          
          // Aplicar el ancho calculado
          if (calculatedWidth > 0) { 
            indicatorElement.style.width = `${calculatedWidth}px`;
            setIndicatorWidth(calculatedWidth);
          }
          
          if (debugCurrentTimeIndicator) console.log('[CurrentTimeIndicator] Ancho calculado:', calculatedWidth);
        }
        rafId = null; // Resetear el ID después de ejecutar
      }); // Fin requestAnimationFrame
    };

    // Llamada inicial para establecer el ancho correcto al montar
    const initialTimeout = setTimeout(handleWindowResize, 50); 

    // Añadir listener
    window.addEventListener('resize', handleWindowResize);

    // Limpieza al desmontar
    return () => {
      clearTimeout(initialTimeout);
      // Cancelar rAF si está pendiente al desmontar
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [agendaRef]); 
  // --- FIN: useEffect con window.resize --- 

  if (debugCurrentTimeIndicator) console.log('[CurrentTimeIndicator] debug:', { position, isVisible });

  // Logging detallado para debugging
  if (debugCurrentTimeIndicator) console.log('[CurrentTimeIndicator] horario debug:', {
    currentTime: format(currentTime, "HH:mm"),
    clinicOpenTime,
    clinicCloseTime,
    timeSlots: timeSlots.length > 0 ? `${timeSlots[0]} - ${timeSlots[timeSlots.length - 1]}` : 'none',
    effectiveEndTime: timeSlots.length > 0 ? 
      (() => {
        const lastSlot = timeSlots[timeSlots.length - 1]
        const slotDuration = timeSlots.length > 1 ? 
          parseTime(timeSlots[1]) - parseTime(timeSlots[0]) : 30 // Default 30 min si no se puede calcular
        const endMinutes = parseTime(lastSlot) + slotDuration
        const hours = Math.floor(endMinutes / 60)
        const minutes = endMinutes % 60
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
      })() : 'none',
    isWithinClinicHours: isWithinClinicHours(),
    isWithinRenderedTimeRange: isWithinRenderedTimeRange(),
    shouldShow
  })

  // Forzar el indicador a mostrarse si isVisible es true, usando effectivePosition
  const effectivePosition = position !== null ? Math.max(position.top, 0) : 0;

  if (!isVisible) {
    return null;
  }

  // Usar una mezcla de estilos CSS y estilos inline para mayor control
  return (
    <div
      ref={indicatorRef}
      className={cn(
        "current-time-indicator", // Clase principal de CSS
        "pointer-events-none", // Evitar que intercepte eventos del ratón
        "z-[40]", // ✅ Por encima de citas (30) pero por debajo de modales (50)
        "absolute h-0.5 bg-red-500",
        className
      )}
      style={{
        position: 'absolute',
        left: 0,
        height: '2px',
        width: indicatorWidth !== null ? `${indicatorWidth}px` : '100%',
        display: 'none',
        opacity: 0,
        visibility: 'hidden',
        zIndex: 40 // ✅ Por encima de citas (30) pero por debajo de modales (50)
      }}
      aria-hidden="true"
    >
      {/* La etiqueta se gestiona en el useEffect */}
      <span className="current-time-label" style={{ position: 'absolute', visibility: 'hidden' }}>
         {format(currentTime || new Date(), "HH:mm")}
      </span>
    </div>
  );
}

// Función auxiliar para convertir tiempo a minutos
const parseTime = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}
