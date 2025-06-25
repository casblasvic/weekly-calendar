import { useState, useCallback, useRef, useMemo, useEffect } from 'react';

// Tipos locales para evitar dependencias externas problematicas
interface DragItem {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  duration: number; // in minutes
  roomId: string;
  color: string;
  personId: string;
  currentDate: Date;
  services?: Array<{ name: string }>;
}

interface DropResult {
  date: Date;
  time: string;
  roomId: string;
  minuteOffset?: number;
}

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
  initialOffsetMinutes?: number;
}

// Funciones opcionales del contexto para fusionar sistemas
interface DragContextHooks {
  startDragContext?: (appointment: any) => void;
  endDragContext?: () => void;
  updateDragPositionContext?: (date: Date, time: string, roomId: string) => void;
}

// Funciones utilitarias locales
function hasAppointmentChanged(
  original: { date: Date; time: string; roomId: string },
  updated: { date: Date; time: string; roomId: string }
): boolean {
  return (
    original.date.toDateString() !== updated.date.toDateString() ||
    original.time !== updated.time ||
    original.roomId !== updated.roomId
  );
}

function getChangedFields(
  original: { date: Date; time: string; roomId: string },
  updated: { date: Date; time: string; roomId: string }
): Partial<{ startTime: Date; roomId: string }> {
  const changes: Partial<{ startTime: Date; roomId: string }> = {};
  
  if (original.date.toDateString() !== updated.date.toDateString() || original.time !== updated.time) {
    const [hours, minutes] = updated.time.split(':').map(Number);
    const newStartTime = new Date(updated.date);
    newStartTime.setHours(hours, minutes, 0, 0);
    changes.startTime = newStartTime;
  }
  
  if (original.roomId !== updated.roomId) {
    changes.roomId = updated.roomId;
  }
  
  return changes;
}

// Hook para el estado global del drag
export function useGlobalDragState(contextHooks?: DragContextHooks) {
  const [globalDragState, setGlobalDragState] = useState<GlobalDragState>({
    isActive: false,
    draggedItem: null,
    originalPosition: null,
    currentPosition: null,
    mouseX: 0,
    mouseY: 0,
    dragDirection: 'neutral'
  });

  const convertToContextFormat = useCallback((item: DragItem, initialOffsetMinutes?: number) => {
    return {
      id: item.id,
      startTime: item.startTime,
      endTime: item.endTime || item.startTime,
      duration: item.duration,
      roomId: item.roomId,
      currentDate: item.currentDate,
      originalDate: item.currentDate,
      originalTime: item.startTime,
      originalRoomId: item.roomId,
      initialOffsetMinutes: initialOffsetMinutes || 0
    };
  }, []);

  const startDrag = useCallback((item: DragItem, e?: React.DragEvent, initialOffsetMinutes?: number) => {
    console.log('[OptimizedHooks] 🚀 Iniciando drag - Sistema FUSIONADO:', {
      systemOptimized: true,
      systemContext: !!contextHooks?.startDragContext,
      itemId: item.id,
      initialOffset: initialOffsetMinutes
    });

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

    if (contextHooks?.startDragContext) {
      try {
        const contextAppointment = convertToContextFormat(item, initialOffsetMinutes);
        contextHooks.startDragContext(contextAppointment);
        console.log('[OptimizedHooks] ✅ Contexto DragTime activado exitosamente');
      } catch (error) {
        console.warn('[OptimizedHooks] ⚠️ Error al activar contexto DragTime:', error);
      }
    } else {
      console.log('[OptimizedHooks] ℹ️ Contexto DragTime no disponible (modo standalone)');
    }
  }, [convertToContextFormat, contextHooks]);

  const endDrag = useCallback(() => {
    console.log('[OptimizedHooks] 🏁 Terminando drag - Sistema FUSIONADO');

    setGlobalDragState({
      isActive: false,
      draggedItem: null,
      originalPosition: null,
      currentPosition: null,
      mouseX: 0,
      mouseY: 0,
      dragDirection: 'neutral'
    });

    if (contextHooks?.endDragContext) {
      try {
        contextHooks.endDragContext();
        console.log('[OptimizedHooks] ✅ Contexto DragTime desactivado exitosamente');
      } catch (error) {
        console.warn('[OptimizedHooks] ⚠️ Error al desactivar contexto DragTime:', error);
      }
    }
  }, [contextHooks]);

  const mouseUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastMouseUpdateRef = useRef<string>('')

  const updateMousePosition = useCallback((x: number, y: number) => {
    const mouseKey = `${x}-${y}`
    
    if (lastMouseUpdateRef.current === mouseKey) {
      return
    }
    
    if (mouseUpdateTimeoutRef.current) {
      clearTimeout(mouseUpdateTimeoutRef.current)
    }
    
    mouseUpdateTimeoutRef.current = setTimeout(() => {
      setGlobalDragState(prev => {
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
    }, 16)
  }, []);

  const lastUpdateRef = useRef<string>('')
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
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
    const updateKey = `${date.toISOString()}-${time}-${roomId}`
    
    if (lastUpdateRef.current === updateKey) {
      return
    }
    
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current)
    }
    
    updateTimeoutRef.current = setTimeout(() => {
      setGlobalDragState(prev => {
        const currentDateStr = prev.currentPosition?.date.toISOString()
        
        if (prev.currentPosition && 
            currentDateStr === date.toISOString() &&
            prev.currentPosition.time === time &&
            prev.currentPosition.roomId === roomId) {
          return prev;
        }
        
        const newPosition = {
          date: new Date(date),
          time,
          roomId
        }
        
        return {
          ...prev,
          currentPosition: newPosition
        };
      });

      if (contextHooks?.updateDragPositionContext) {
        try {
          contextHooks.updateDragPositionContext(date, time, roomId);
        } catch (error) {
          console.warn('[OptimizedHooks] ⚠️ Error al actualizar posición en contexto:', error);
        }
      }
      
      lastUpdateRef.current = updateKey
    }, 5)
  }, [contextHooks]);

  const updateDragDirection = useCallback((direction: 'up' | 'down' | 'neutral') => {
    setGlobalDragState(prev => {
      if (prev.dragDirection === direction) {
        return prev;
      }
      return {
        ...prev,
        dragDirection: direction
      };
    });
  }, []);

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
    const relativeY = mouseY - rect.top;
    
    let adjustedY = relativeY;
    if (globalDragState.initialOffsetMinutes !== undefined && globalDragState.draggedItem) {
      const minuteHeight = cellHeight / slotDuration;
      const offsetPixels = globalDragState.initialOffsetMinutes * minuteHeight;
      adjustedY = relativeY - offsetPixels;
    }
    
    const percentage = adjustedY / cellHeight;
    const minutesIntoSlot = Math.round(percentage * slotDuration);
    
    let finalCellTime = cellTime;
    
    if (minutesIntoSlot < 0) {
      const [hours, minutes] = cellTime.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes + minutesIntoSlot;
      if (totalMinutes >= 0) {
        const displayHours = Math.floor(totalMinutes / 60);
        const displayMinutes = totalMinutes % 60;
        finalCellTime = `${displayHours.toString().padStart(2, '0')}:${displayMinutes.toString().padStart(2, '0')}`;
      }
    } else if (minutesIntoSlot >= slotDuration) {
      const [hours, minutes] = cellTime.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes + minutesIntoSlot;
      const displayHours = Math.floor(totalMinutes / 60);
      const displayMinutes = totalMinutes % 60;
      finalCellTime = `${displayHours.toString().padStart(2, '0')}:${displayMinutes.toString().padStart(2, '0')}`;
    } else {
      const [hours, minutes] = cellTime.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes + minutesIntoSlot;
      const displayHours = Math.floor(totalMinutes / 60);
      const displayMinutes = totalMinutes % 60;
      finalCellTime = `${displayHours.toString().padStart(2, '0')}:${displayMinutes.toString().padStart(2, '0')}`;
    }
    
    if (lastExactTimeRef.current !== finalCellTime) {
      lastExactTimeRef.current = finalCellTime;
    }
    
    if (!globalDragState.currentPosition || 
        globalDragState.currentPosition.time !== finalCellTime ||
        globalDragState.currentPosition.date.toDateString() !== cellDay.toDateString() ||
        globalDragState.currentPosition.roomId !== cellRoomId) {
      updateCurrentPosition(cellDay, finalCellTime, cellRoomId);
    }
  }, [
    globalDragState.isActive, 
    globalDragState.initialOffsetMinutes,
    cellTime, 
    slotDuration, 
    cellHeight, 
    cellRoomId, 
    updateCurrentPosition, 
    updateDragDirection
  ]);

  const handleDragLeave = useCallback(() => {
    setLocalPreview(null);
    lastExactTimeRef.current = null;
  }, []);

  const shouldShowPreview = useMemo(() => {
    if (!globalDragState.isActive || !globalDragState.draggedItem || !localPreview) {
      return false;
    }
    
    if (globalDragState.currentPosition) {
      return cellDay.toDateString() === globalDragState.currentPosition.date.toDateString() && 
             cellRoomId === globalDragState.currentPosition.roomId;
    }
    
    return false;
  }, [
    globalDragState.isActive,
    localPreview?.exactTime,
    localPreview?.offsetY,
    cellRoomId
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
  validateDrop?: (dropResult: DropResult, draggedItem: DragItem) => boolean,
  contextHooks?: DragContextHooks
) {
  const { globalDragState, startDrag, endDrag, updateMousePosition, updateCurrentPosition, updateDragDirection } = useGlobalDragState(contextHooks);

  const handleDragStart = useCallback((
    e: React.DragEvent,
    item: DragItem,
    initialOffsetMinutes?: number
  ) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    
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
    
    const isOriginalPosition = 
      globalDragState.originalPosition.date.toDateString() === date.toDateString() &&
      globalDragState.originalPosition.time === exactTime &&
      globalDragState.originalPosition.roomId === roomId;
    
    if (!isOriginalPosition && validateDrop) {
      const isValid = validateDrop(dropResult, globalDragState.draggedItem);
      if (!isValid) {
        console.log('[DragDrop] Drop cancelado: posición no válida');
        endDrag();
        return;
      }
    }
    
    if (hasAppointmentChanged(globalDragState.originalPosition, dropResult)) {
      const changes = getChangedFields(globalDragState.originalPosition, dropResult);
      onDrop(globalDragState.draggedItem.id, changes);
    }
    
    endDrag();
  }, [globalDragState, onDrop, endDrag, validateDrop]);

  const handleDragEnd = useCallback(() => {
    endDrag();
  }, [endDrag]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const setContainerRef = useCallback(() => {
    // No-op
  }, []);

  return {
    dragState: globalDragState,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    setContainerRef,
    updateMousePosition,
    updateCurrentPosition,
    updateDragDirection
  };
}

// Exportar tipos para compatibilidad
export type { DragItem, DropResult, GlobalDragState, DragContextHooks };
