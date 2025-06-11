"use client"

import type React from "react"
import { useEffect, useState, useCallback, useRef, useLayoutEffect } from "react"
import { format, parse, isWithinInterval, addMinutes, startOfDay, differenceInMinutes } from "date-fns"
import { cn } from "@/lib/utils"

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
  const [position, setPosition] = useState<number | null>(null)
  const [nearestSlotTime, setNearestSlotTime] = useState<string | null>(null)
  const [isWithinTimeRange, setIsWithinTimeRange] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [indicatorWidth, setIndicatorWidth] = useState<number | null>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Mover los useRef aquí al inicio para evitar errores de orden de hooks
  const prevPositionRef = useRef<number | null>(null);
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

  // Función para calcular la posición del indicador - optimizada para prevenir renders múltiples
  const updatePosition = useCallback(() => {
    if (!timeSlots.length || !agendaRef.current) {
      return;
    }

    // Crear un ID único para esta actualización y guardarlo en la ref existente
    const updateId = Symbol('update');
    currentUpdateIdRef.current = updateId;

    const getCurrentTimePosition = () => {
      const currentTimeString = format(currentTime, "HH:mm");

      // <<< VOLVER A USAR data-time >>>
      const slots = agendaRef.current?.querySelectorAll("div[data-time]") || [];

      if (slots.length === 0) {
          return { position: null, slotTime: null, isWithinRange: false };
      }

      // Determinar el rango de tiempo
      const firstSlotTime = timeSlots[0];
      const lastSlotTime = timeSlots[timeSlots.length - 1];

      // Añadir 15 minutos al último slot para incluir la última franja completa
      const startTime = parse(firstSlotTime, "HH:mm", new Date());
      const endTime = parse(lastSlotTime, "HH:mm", new Date());
      const extendedEndTime = addMinutes(endTime, config?.slotDuration || 15);

      // Verificar si el tiempo actual está dentro del rango extendido
      const isWithinRange = isWithinInterval(currentTime, {
        start: startTime,
        end: extendedEndTime,
      });

      // Convertir el tiempo actual a minutos desde medianoche
      const currentTimeMinutes = differenceInMinutes(currentTime, startOfDay(currentTime));

      // Encontrar el slot más cercano
      let nearestSlotElement: HTMLElement | null = null;
      let nearestSlotTime: string | null = null;
      let minTimeDifference = Number.POSITIVE_INFINITY;

      // <<< BUSCAR ELEMENTO CON data-time MÁS CERCANO >>>
      slots.forEach((slot) => {
          const slotTime = slot.getAttribute("data-time");
          if (slotTime) {
              const slotMinutes = parseTime(slotTime);
              const timeDifference = Math.abs(slotMinutes - currentTimeMinutes);
              if (timeDifference < minTimeDifference) {
                  minTimeDifference = timeDifference;
                  nearestSlotElement = slot as HTMLElement; // Guardar el elemento
                  nearestSlotTime = slotTime;
              }
          }
      });

      // Calcular la posición usando offsetTop del slot más cercano
      if (nearestSlotElement && nearestSlotTime) {
          // <<< USAR offsetTop DEL ELEMENTO ENCONTRADO >>>
          let position = nearestSlotElement.offsetTop;

          // Ajustar la posición basada en la diferencia exacta de minutos dentro del slot
          const nearestSlotMinutes = parseTime(nearestSlotTime);
          const minutesDifference = currentTimeMinutes - nearestSlotMinutes;
          const slotDuration = config?.slotDuration || 15;
          const percentageOfSlot = slotDuration > 0 ? minutesDifference / slotDuration : 0;
          const offsetPixels = percentageOfSlot * rowHeight;

          position += offsetPixels;

          return {
              position,
              slotTime: nearestSlotTime,
              isWithinRange,
          };
      }

      // Si no se encontró un slot DOM, devolver null
      return { position: null, slotTime: null, isWithinRange: false };
    };

    // Usar una única invocación de requestAnimationFrame
    const rafId = requestAnimationFrame(() => {
      // Verificar si esta actualización sigue siendo relevante
      if (currentUpdateIdRef.current !== updateId) {
        return; // Ignorar actualizaciones obsoletas
      }

      const { position: newPosition, slotTime, isWithinRange } = getCurrentTimePosition();

      // Realizar actualizaciones de estado en un único batch para evitar rerenders múltiples
      // usando funciones actualizadoras que no dependen del estado actual
      const needsPositionUpdate = position !== newPosition;
      const needsSlotUpdate = nearestSlotTime !== slotTime;
      const needsRangeUpdate = isWithinTimeRange !== isWithinRange;

      // Solo actualizar si realmente hay cambios
      if (needsPositionUpdate) {
        setPosition(newPosition);
      }
      
      if (needsSlotUpdate) {
        setNearestSlotTime(slotTime);
      }
      
      if (needsRangeUpdate) {
        setIsWithinTimeRange(isWithinRange);
      }

      // Realizar scroll solo si es necesario y no está en progreso otro scroll
      if (newPosition !== null && isWithinRange && agendaRef.current && isWithinClinicHours()) {
        const agendaHeight = agendaRef.current.clientHeight;
        const centerOffset = Math.max(0, newPosition - (agendaHeight / 2));
              
        // Usar scroll con behavior auto para evitar animaciones que puedan causar parpadeos
        agendaRef.current.scrollTo({
          top: centerOffset,
          behavior: "auto"
        });
      }
    });

    // Limpieza apropiada
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [currentTime, timeSlots, agendaRef, rowHeight, isWithinClinicHours, config]);

  // Efecto para scroll inicial sin causar parpadeos
  useEffect(() => {
    // No ejecutar si no hay elementos esenciales
    if (!position || !agendaRef.current || !isWithinTimeRange || !isWithinClinicHours()) return;
    
    // Crear un ID único para este scroll y guardarlo en la ref existente
    const scrollId = Symbol('initialScroll');
    scrollIdRef.current = scrollId;
    
    // Usar requestAnimationFrame en lugar de setTimeout para sincronizar con el ciclo de pintado
    requestAnimationFrame(() => {
      // Verificar que este scroll sigue siendo relevante
      if (scrollIdRef.current !== scrollId || !agendaRef.current) return;
      
      // Calcular posición para centrar
      const agendaHeight = agendaRef.current.clientHeight;
      const centerOffset = Math.max(0, position - (agendaHeight / 2));
      
      // Hacer scroll sin animación
      agendaRef.current.scrollTo({
        top: centerOffset,
        behavior: "auto"
      });
    });
    
    // No es necesario limpiar este efecto, ya que el requestAnimationFrame se ejecuta solo una vez
  }, [position, isWithinTimeRange, agendaRef, isWithinClinicHours, rowHeight]);

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
      indicatorRef.current.style.borderTop = '2px solid red';
      indicatorRef.current.style.setProperty('--current-time-indicator-border-color', 'red');

      indicatorRef.current.style.transform = `translateY(${Math.max(position ?? 0, 0)}px)`;
      indicatorRef.current.style.display = 'block';
      indicatorRef.current.style.visibility = 'visible';
      indicatorRef.current.style.opacity = '1';

      const span = indicatorRef.current.querySelector('span');
      if (span) {
        (span as HTMLElement).style.backgroundColor = 'red';
        (span as HTMLElement).style.color = 'white';
        (span as HTMLElement).style.padding = '2px 6px';
        (span as HTMLElement).style.borderRadius = '4px';
        
        (span as HTMLElement).style.position = 'absolute';
        (span as HTMLElement).style.left = '40px';
        (span as HTMLElement).style.top = '50%';
        (span as HTMLElement).style.transform = 'translate(-50%, -50%)';
        (span as HTMLElement).style.visibility = 'visible';
      }
    } else if (indicatorRef.current) {
      indicatorRef.current.style.display = 'none';
      indicatorRef.current.style.opacity = '0';
      indicatorRef.current.style.visibility = 'hidden';
      indicatorRef.current.style.borderTop = 'none';
      const span = indicatorRef.current.querySelector('span');
      if(span) {
          (span as HTMLElement).style.backgroundColor = 'transparent';
          (span as HTMLElement).style.visibility = 'hidden';
      }
      indicatorRef.current.style.transform = 'translateY(-100px)'; 
    }
  }, [position, isVisible]);

  // --- useEffect para escuchar window.resize con lógica scroll/client Width y rAF ---
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
          // Leer ambos anchos actualizados DENTRO del rAF
          const currentScrollWidth = agendaRef.current.scrollWidth;
          const currentClientWidth = agendaRef.current.clientWidth;
          
          // Decidir qué ancho aplicar basado en si hay scroll
          let widthToApply = 0;
          if (currentScrollWidth > currentClientWidth) {
            // Hay scroll horizontal: usar el ancho total del contenido
            widthToApply = currentScrollWidth;
          } else {
            // No hay scroll horizontal (o cabe justo): usar el ancho visible
            widthToApply = currentClientWidth;
          }

          // Aplicar el ancho decidido solo si es válido
          if (widthToApply > 0) { 
            indicatorElement.style.width = `${widthToApply}px`;
          }
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

  console.log('[CurrentTimeIndicator] debug:', { position, isVisible });

  // Logging detallado para debugging
  console.log('[CurrentTimeIndicator] horario debug:', {
    currentTime: format(currentTime, "HH:mm"),
    clinicOpenTime,
    clinicCloseTime,
    timeSlots: timeSlots.length > 0 ? `${timeSlots[0]} - ${timeSlots[timeSlots.length - 1]}` : 'none',
    effectiveEndTime: timeSlots.length > 0 ? 
      (() => {
        const lastSlot = timeSlots[timeSlots.length - 1]
        const slotDuration = timeSlots.length > 1 ? parseTime(timeSlots[1]) - parseTime(timeSlots[0]) : 30
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
  const effectivePosition = (position !== null ? Math.max(position, 0) : 0);

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
        "z-50", // Mantener por encima de otros elementos relevantes
        "absolute h-0.5 bg-red-500",
        className
      )}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        height: '2px',
        width: indicatorWidth !== null ? `${indicatorWidth}px` : '100%',
        display: 'none',
        opacity: 0,
        visibility: 'hidden'
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
