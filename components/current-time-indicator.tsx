"use client"

import type React from "react"
import { useEffect, useState, useCallback, useRef } from "react"
import { format, parse, isWithinInterval, addMinutes } from "date-fns"
import { cn } from "@/lib/utils"

interface CurrentTimeIndicatorProps {
  timeSlots: string[]
  rowHeight: number
  isMobile: boolean
  className?: string
  agendaRef: React.RefObject<HTMLDivElement | null> | React.RefObject<HTMLDivElement>
  clinicOpenTime?: string
  clinicCloseTime?: string
}

export const CurrentTimeIndicator: React.FC<CurrentTimeIndicatorProps> = ({
  timeSlots,
  rowHeight,
  isMobile,
  className,
  agendaRef,
  clinicOpenTime,
  clinicCloseTime,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [position, setPosition] = useState<number | null>(null)
  const [nearestSlotTime, setNearestSlotTime] = useState<string | null>(null)
  const [isWithinTimeRange, setIsWithinTimeRange] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
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

    const now = currentTime
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTimeMinutes = currentHour * 60 + currentMinute

    const [openHour, openMinute] = clinicOpenTime.split(":").map(Number)
    const [closeHour, closeMinute] = clinicCloseTime.split(":").map(Number)

    const openTimeMinutes = openHour * 60 + openMinute
    const closeTimeMinutes = closeHour * 60 + closeMinute

    return currentTimeMinutes >= openTimeMinutes && currentTimeMinutes <= closeTimeMinutes
  }, [currentTime, clinicOpenTime, clinicCloseTime])

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

      // Obtener todos los elementos con data-time
      const slots = agendaRef.current?.querySelectorAll("[data-time]") || [];

      if (slots.length === 0) {
        return { position: null, slotTime: null, isWithinRange: false };
      }

      // Determinar el rango de tiempo
      const firstSlotTime = timeSlots[0];
      const lastSlotTime = timeSlots[timeSlots.length - 1];

      // Añadir 15 minutos al último slot para incluir la última franja completa
      const startTime = parse(firstSlotTime, "HH:mm", new Date());
      const endTime = parse(lastSlotTime, "HH:mm", new Date());
      const extendedEndTime = addMinutes(endTime, 15);

      // Verificar si el tiempo actual está dentro del rango extendido
      const isWithinRange = isWithinInterval(currentTime, {
        start: startTime,
        end: extendedEndTime,
      });

      // Convertir el tiempo actual a minutos desde medianoche
      const currentTimeMinutes = parseTime(currentTimeString);

      // Encontrar el slot más cercano
      let nearestSlot: Element | null = null;
      let nearestSlotTime: string | null = null;
      let minTimeDifference = Number.POSITIVE_INFINITY;

      slots.forEach((slot) => {
        const slotTime = slot.getAttribute("data-time");
        if (slotTime) {
          const slotTimeMinutes = parseTime(slotTime);
          const timeDifference = Math.abs(slotTimeMinutes - currentTimeMinutes);

          if (timeDifference < minTimeDifference) {
            minTimeDifference = timeDifference;
            nearestSlot = slot;
            nearestSlotTime = slotTime;
          }
        }
      });

      if (nearestSlot && nearestSlotTime) {
        // Intentar obtener la posición del atributo data-position
        let position = Number.parseInt(nearestSlot.getAttribute("data-position") || "0", 10);

        // Si la posición es 0 o parece incorrecta, calcularla manualmente
        if (position === 0 || isNaN(position)) {
          position = (nearestSlot as HTMLElement).offsetTop;
        }

        // Ajustar la posición basada en la diferencia de tiempo
        if (nearestSlotTime && currentTimeString !== nearestSlotTime) {
          const nearestSlotMinutes = parseTime(nearestSlotTime);
          const minutesDifference = currentTimeMinutes - nearestSlotMinutes;
          const slotDuration = 15; // Asumimos slots de 15 minutos
          const percentageOfSlot = minutesDifference / slotDuration;
          const offsetPixels = percentageOfSlot * rowHeight;

          position += offsetPixels;
        }

        return {
          position,
          slotTime: nearestSlotTime,
          isWithinRange,
        };
      }

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
  }, [currentTime, timeSlots, agendaRef, rowHeight, isWithinClinicHours, position, nearestSlotTime, isWithinTimeRange]);

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
  }, [position, isWithinTimeRange, agendaRef, isWithinClinicHours]);

  // Actualizar la posición cuando cambie el tiempo o los slots, de manera optimizada
  useEffect(() => {
    if (timeSlots.length === 0) return;
    
    // Evitar múltiples actualizaciones superpuestas
    let updateScheduled = false;
    
    // Actualizar posición inmediatamente, pero no más de una vez por cada 16ms (60fps)
    const scheduleUpdate = () => {
      if (updateScheduled) return;
      updateScheduled = true;
      
      requestAnimationFrame(() => {
        updatePosition();
        updateScheduled = false;
      });
    };
    
    // Actualización inicial
    scheduleUpdate();
    
    // Actualización periódica
    const intervalId = setInterval(scheduleUpdate, 60000);
    
    // Limpieza
    return () => {
      clearInterval(intervalId);
    };
  }, [timeSlots, updatePosition]);

  // Aplicar los cambios de estado y estilo
  useEffect(() => {
    // Skip si no tenemos posición o no somos visibles
    if (position === null || !isVisible || !indicatorRef.current) {
      return;
    }

    // Aplicar estilo de posición
    indicatorRef.current.style.top = `${position}px`;
    
    // Asegurar que la línea se extienda por todo el contenido, incluso al hacer scroll
    if (agendaRef.current) {
      // Calculamos el ancho total del contenido, incluyendo la parte no visible
      const totalWidth = agendaRef.current.scrollWidth;
      indicatorRef.current.style.width = `${totalWidth}px`;
      
      // Asegurar que la posición izquierda sea 0 relativa al contenedor, no al viewport
      indicatorRef.current.style.left = '0px';
      
      // Configurar la posición en relación con el contenedor, no con el viewport
      indicatorRef.current.style.position = 'absolute';
    }
    
  }, [position, isVisible, isWithinTimeRange]);

  // Mantener el indicador actualizado cuando cambie el tamaño o scroll del contenedor
  useEffect(() => {
    if (!agendaRef.current || !indicatorRef.current) return;
    
    const handleResize = () => {
      if (indicatorRef.current && agendaRef.current) {
        indicatorRef.current.style.width = `${agendaRef.current.scrollWidth}px`;
      }
    };
    
    // Actualizar cuando cambie el tamaño de la ventana
    window.addEventListener('resize', handleResize);
    
    // Actualizar cuando cambie el contenido (scroll)
    const observer = new ResizeObserver(handleResize);
    observer.observe(agendaRef.current);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, [agendaRef]);

  // Verificar si mostrar
  const shouldShow = isWithinTimeRange && isVisible && isWithinClinicHours() && position !== null;

  // Actualizar las referencias solo después de un renderizado completo
  useEffect(() => {
    prevPositionRef.current = position;
    prevVisibilityRef.current = shouldShow;
    skipRenderRef.current = false;
  }, [position, shouldShow]);

  // Solo renderizar si es visible y está dentro del rango
  if (!shouldShow) {
    return null;
  }

  return (
    <div
      ref={indicatorRef}
      className={cn(
        className,
        "absolute left-0 h-[2px] bg-red-500",
        "pointer-events-none"
      )}
      style={{
        position: 'absolute',
        zIndex: 15,
        left: 0,
        width: '100%',
        minWidth: '100%',
        boxShadow: '0 0 4px rgba(239, 68, 68, 0.4)'
      }}
    >
      <span
        className="absolute bg-red-500 text-white text-xs px-1 py-0.5 rounded shadow-sm"
        style={{
          zIndex: 110,
          whiteSpace: 'nowrap',
          fontSize: '10px',
          position: 'sticky',
          left: '80px',
          top: '0',
          transform: 'translate(-50%, -50%)'
        }}
      >
        {format(currentTime, "HH:mm")}
      </span>
    </div>
  );
}

// Función auxiliar para convertir tiempo a minutos
const parseTime = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

