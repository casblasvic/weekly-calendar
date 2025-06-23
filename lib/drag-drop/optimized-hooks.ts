import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { DragItem, DropResult } from './types';
import { 
  hasAppointmentChanged,
  getChangedFields
} from './utils';

// Estado global mínimo para el drag & drop
interface GlobalDragState {
  isActive: boolean;
  draggedItem: DragItem | null;
  originalPosition: {
    date: Date;
    time: string;
    roomId: string;
  } | null;
  currentPosition: {
    date: Date;
    time: string;
    roomId: string;
  } | null;
  mouseX: number;
  mouseY: number;
  dragDirection?: 'up' | 'down' | 'neutral';
  initialOffsetMinutes?: number; // Offset inicial en minutos desde el inicio de la cita hasta donde se hizo clic
}

// Hook para el estado global del drag (solo lo esencial)
export function useGlobalDragState() {
  const [globalDragState, setGlobalDragState] = useState<GlobalDragState>({
    isActive: false,
    draggedItem: null,
    originalPosition: null,
    currentPosition: null,
    mouseX: 0,
    mouseY: 0,
    dragDirection: 'neutral'
  });

  const startDrag = useCallback((item: DragItem, e?: React.DragEvent, initialOffsetMinutes?: number) => {
    // Capturar las coordenadas iniciales del mouse
    const mouseX = e ? e.clientX : 0;
    const mouseY = e ? e.clientY : 0;
    
    setGlobalDragState({
      isActive: true,
      draggedItem: item,
      originalPosition: {
        date: item.currentDate,
        time: item.startTime,
        roomId: item.roomId
      },
      currentPosition: {
        date: item.currentDate,
        time: item.startTime,
        roomId: item.roomId
      },
      mouseX,
      mouseY,
      dragDirection: 'neutral',
      initialOffsetMinutes: initialOffsetMinutes || 0
    });
  }, []);

  const endDrag = useCallback(() => {
    setGlobalDragState({
      isActive: false,
      draggedItem: null,
      originalPosition: null,
      currentPosition: null,
      mouseX: 0,
      mouseY: 0,
      dragDirection: 'neutral'
    });
  }, []);

  // Ref para throttling de mouse position
  const mouseUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastMouseUpdateRef = useRef<string>('')

  const updateMousePosition = useCallback((x: number, y: number) => {
    // PROTECCIÓN ANTI-BUCLE: throttling de mouse updates
    const mouseKey = `${x}-${y}`
    
    // Si es exactamente la misma posición del mouse, no hacer nada
    if (lastMouseUpdateRef.current === mouseKey) {
      return
    }
    
    // Cancelar timeout anterior si existe
    if (mouseUpdateTimeoutRef.current) {
      clearTimeout(mouseUpdateTimeoutRef.current)
    }
    
    // Throttling de mouse updates
    mouseUpdateTimeoutRef.current = setTimeout(() => {
      setGlobalDragState(prev => {
        // Verificación adicional para evitar updates innecesarios
        if (prev.mouseX === x && prev.mouseY === y) {
          return prev;
        }
        
        return {
          ...prev,
          mouseX: x,
          mouseY: y
        };
      });
      
      lastMouseUpdateRef.current = mouseKey
    }, 16) // ~60fps para suavidad sin causar bucles
  }, []);

  // Ref para controlar la frecuencia de updates y evitar bucles infinitos
  const lastUpdateRef = useRef<string>('')
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Cleanup de timeouts en unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
      if (mouseUpdateTimeoutRef.current) {
        clearTimeout(mouseUpdateTimeoutRef.current)
      }
    }
  }, [])

  const updateCurrentPosition = useCallback((date: Date, time: string, roomId: string) => {
    // PROTECCIÓN DEFINITIVA ANTI-BUCLE: throttling con ref y timeout
    const updateKey = `${date.toISOString()}-${time}-${roomId}`
    
    // Si es exactamente la misma actualización, no hacer nada
    if (lastUpdateRef.current === updateKey) {
      return
    }
    
    // Cancelar timeout anterior si existe
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current)
    }
    
    // Usar timeout para throttling
    updateTimeoutRef.current = setTimeout(() => {
      setGlobalDragState(prev => {
        // Verificación de seguridad adicional
        const currentDateStr = prev.currentPosition?.date.toISOString()
        
        if (prev.currentPosition && 
            currentDateStr === date.toISOString() &&
            prev.currentPosition.time === time &&
            prev.currentPosition.roomId === roomId) {
          return prev; // No cambiar nada si es exactamente la misma posición
        }
        
        const newPosition = {
          date: new Date(date), // Crear nueva instancia
          time,
          roomId
        }
        
        return {
          ...prev,
          currentPosition: newPosition
        };
      });
      
      // Actualizar ref después del setState exitoso
      lastUpdateRef.current = updateKey
    }, 5) // Throttling de 5ms para evitar spam
  }, []);

  const updateDragDirection = useCallback((direction: 'up' | 'down' | 'neutral') => {
    setGlobalDragState(prev => {
      // Evitar bucle infinito: solo actualizar si la dirección realmente cambió
      if (prev.dragDirection === direction) {
        return prev; // No cambiar nada si es la misma dirección
      }
      return {
        ...prev,
        dragDirection: direction
      };
    });
  }, []);

  // Efecto para manejar ESC
  useEffect(() => {
    if (!globalDragState.isActive) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        console.log('[DragDrop] Cancelando drag con ESC');
        endDrag();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [globalDragState.isActive, endDrag]);

  return {
    globalDragState,
    startDrag,
    endDrag,
    updateMousePosition,
    updateCurrentPosition,
    updateDragDirection
  };
}

// Hook para el preview local (usado en cada celda)
export function useLocalDragPreview(
  globalDragState: GlobalDragState,
  cellDay: Date,
  cellTime: string,
  cellRoomId: string,
  slotDuration: number,
  cellHeight: number,
  updateCurrentPosition: (date: Date, time: string, roomId: string) => void,
  updateDragDirection: (direction: 'up' | 'down' | 'neutral') => void,
  cellRef: React.RefObject<HTMLDivElement>
) {
  const [localPreview, setLocalPreview] = useState<{
    offsetY: number;
    exactTime: string;
  } | null>(null);
  
  // Usar ref para trackear el último tiempo y evitar actualizaciones innecesarias
  const lastExactTimeRef = useRef<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!globalDragState.isActive || !cellRef.current) {
      setLocalPreview(null);
      lastExactTimeRef.current = null;
      return;
    }

    const rect = cellRef.current.getBoundingClientRect();
    const mouseY = e.clientY;
    
    // Calcular la posición del cursor relativa a la celda
    const relativeY = mouseY - rect.top;
    
    // Usar el offset inicial para mantener la posición consistente
    let adjustedY = relativeY;
    if (globalDragState.initialOffsetMinutes !== undefined && globalDragState.draggedItem) {
      // Convertir minutos de offset a píxeles
      const minuteHeight = cellHeight / slotDuration;
      const offsetPixels = globalDragState.initialOffsetMinutes * minuteHeight;
      adjustedY = relativeY - offsetPixels;
    }
    
    // Calcular minutos permitiendo valores negativos y superiores al slot
    // Esto permite un movimiento continuo entre celdas
    const percentage = adjustedY / cellHeight;
    const minutesIntoSlot = Math.round(percentage * slotDuration);
    
    // NO limitar los minutos aquí - permitir valores fuera del rango
    // para mantener continuidad entre celdas
    let finalMinutes = minutesIntoSlot;
    let finalCellTime = cellTime;
    
    // Si los minutos son negativos, estamos en la celda anterior
    if (minutesIntoSlot < 0) {
      const [hours, minutes] = cellTime.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes + minutesIntoSlot;
      if (totalMinutes >= 0) {
        const displayHours = Math.floor(totalMinutes / 60);
        const displayMinutes = totalMinutes % 60;
        finalCellTime = `${displayHours.toString().padStart(2, '0')}:${displayMinutes.toString().padStart(2, '0')}`;
        finalMinutes = 0; // Para el offsetY visual
      }
    } 
    // Si los minutos exceden el slot, estamos en la siguiente celda
    else if (minutesIntoSlot >= slotDuration) {
      const [hours, minutes] = cellTime.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes + minutesIntoSlot;
      const displayHours = Math.floor(totalMinutes / 60);
      const displayMinutes = totalMinutes % 60;
      finalCellTime = `${displayHours.toString().padStart(2, '0')}:${displayMinutes.toString().padStart(2, '0')}`;
      finalMinutes = slotDuration - 1; // Para el offsetY visual
    }
    // Si estamos dentro del rango normal
    else {
      const [hours, minutes] = cellTime.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes + minutesIntoSlot;
      const displayHours = Math.floor(totalMinutes / 60);
      const displayMinutes = totalMinutes % 60;
      finalCellTime = `${displayHours.toString().padStart(2, '0')}:${displayMinutes.toString().padStart(2, '0')}`;
      finalMinutes = minutesIntoSlot;
    }
    
    // PROTECCIÓN ANTI-BUCLE MÁXIMA: Deshabilitar updateDragDirection durante el drag
    // Esta función causaba bucles infinitos durante stress tests y no es crítica para la funcionalidad
    // Se puede rehabilitar en el futuro si es necesaria para otras funcionalidades
    
    // if (globalDragState.originalPosition) {
    //   // Código de updateDragDirection deshabilitado temporalmente para evitar bucles
    // }
    
    // PROTECCIÓN DEFINITIVA: Completamente deshabilitar localPreview durante drag para evitar bucles
    // El preview se maneja en drag-time-context y granularidades, no necesitamos este preview local
    if (lastExactTimeRef.current !== finalCellTime) {
      lastExactTimeRef.current = finalCellTime;
      // NO actualizar localPreview durante drag activo - causa bucles infinitos
      // El feedback visual se maneja por otros medios (granularidades + drag-time-context)
    }
    
    // Solo actualizar la posición global si cambió
    if (!globalDragState.currentPosition || 
        globalDragState.currentPosition.time !== finalCellTime ||
        globalDragState.currentPosition.date.toDateString() !== cellDay.toDateString() ||
        globalDragState.currentPosition.roomId !== cellRoomId) {
      updateCurrentPosition(cellDay, finalCellTime, cellRoomId);
    }
  }, [
    // Solo incluir primitivos estables para evitar bucle infinito
    globalDragState.isActive, 
    globalDragState.initialOffsetMinutes,
    cellTime, 
    slotDuration, 
    cellHeight, 
    cellRoomId, 
    updateCurrentPosition, 
    updateDragDirection
    // REMOVIDO: globalDragState.currentPosition, globalDragState.originalPosition, globalDragState.draggedItem, cellDay, cellRef
    // Estos objetos se recrean constantemente y causan bucle infinito
  ]);

  const handleDragLeave = useCallback(() => {
    setLocalPreview(null);
    lastExactTimeRef.current = null;
  }, []);

  const shouldShowPreview = useMemo(() => {
    if (!globalDragState.isActive || !globalDragState.draggedItem || !localPreview) {
      return false;
    }
    
    // Verificar si esta celda es donde se debe mostrar el preview
    if (globalDragState.currentPosition) {
      return cellDay.toDateString() === globalDragState.currentPosition.date.toDateString() && 
             cellRoomId === globalDragState.currentPosition.roomId;
    }
    
    return false;
  }, [
    // Solo incluir primitivos estables para evitar bucle infinito
    globalDragState.isActive,
    localPreview?.exactTime,
    localPreview?.offsetY,
    cellRoomId
    // REMOVIDO: globalDragState completo y cellDay
    // Estos objetos se recrean constantemente y causan invalidaciones innecesarias
  ]);

  return {
    localPreview,
    handleDragOver,
    handleDragLeave,
    shouldShowPreview
  };
}

// Hook principal optimizado para drag & drop
export function useOptimizedDragAndDrop(
  onDrop: (appointmentId: string, changes: any) => void,
  slotHeight: number = 60,
  slotDuration: number = 15,
  validateDrop?: (dropResult: DropResult, draggedItem: DragItem) => boolean // Nueva función de validación
) {
  const { globalDragState, startDrag, endDrag, updateMousePosition, updateCurrentPosition, updateDragDirection } = useGlobalDragState();

  const handleDragStart = useCallback((
    e: React.DragEvent,
    item: DragItem,
    initialOffsetMinutes?: number
  ) => {
    // Set drag data
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    
    // Create custom drag image
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    dragImage.style.width = `${(e.currentTarget as HTMLElement).offsetWidth}px`;
    dragImage.style.height = `${(e.currentTarget as HTMLElement).offsetHeight}px`;
    dragImage.style.pointerEvents = 'none';
    document.body.appendChild(dragImage);
    
    e.dataTransfer.setDragImage(dragImage, e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);
    
    startDrag(item, e, initialOffsetMinutes);
  }, [startDrag]);

  const handleDrop = useCallback((
    e: React.DragEvent,
    date: Date,
    exactTime: string,
    roomId: string
  ) => {
    e.preventDefault();
    
    if (!globalDragState.draggedItem || !globalDragState.originalPosition) return;
    
    const dropResult: DropResult = {
      date,
      time: exactTime,
      roomId
    };
    
    // Permitir soltar en la posición original
    const isOriginalPosition = 
      globalDragState.originalPosition.date.toDateString() === date.toDateString() &&
      globalDragState.originalPosition.time === exactTime &&
      globalDragState.originalPosition.roomId === roomId;
    
    // Si no es la posición original, validar si es una posición válida
    if (!isOriginalPosition && validateDrop) {
      const isValid = validateDrop(dropResult, globalDragState.draggedItem);
      if (!isValid) {
        console.log('[DragDrop] Drop cancelado: posición no válida');
        endDrag(); // Cancelar y volver a la posición original
        return;
      }
    }
    
    // Check if anything changed
    if (hasAppointmentChanged(globalDragState.originalPosition, dropResult)) {
      const changes = getChangedFields(globalDragState.originalPosition, dropResult);
      onDrop(globalDragState.draggedItem.id, changes);
    }
    
    // End drag
    endDrag();
  }, [globalDragState, onDrop, endDrag, validateDrop]);

  const handleDragEnd = useCallback(() => {
    endDrag();
  }, [endDrag]);

  // Función dummy para handleDragOver (se maneja localmente en cada celda)
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Función dummy para setContainerRef (ya no es necesaria)
  const setContainerRef = useCallback(() => {
    // No-op
  }, []);

  return {
    dragState: globalDragState, // Mantener compatibilidad con el nombre anterior
    handleDragStart,
    handleDragOver, // Función dummy para compatibilidad
    handleDrop,
    handleDragEnd,
    setContainerRef, // Función dummy para compatibilidad
    updateMousePosition,
    updateCurrentPosition,
    updateDragDirection
  };
}
