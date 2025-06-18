import { useState, useCallback, useRef, useMemo } from 'react';
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
}

// Hook para el estado global del drag (solo lo esencial)
export function useGlobalDragState() {
  const [globalDragState, setGlobalDragState] = useState<GlobalDragState>({
    isActive: false,
    draggedItem: null,
    originalPosition: null,
    currentPosition: null,
    mouseX: 0,
    mouseY: 0
  });

  const startDrag = useCallback((item: DragItem, e?: React.DragEvent) => {
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
      mouseY
    });
  }, []);

  const endDrag = useCallback(() => {
    setGlobalDragState({
      isActive: false,
      draggedItem: null,
      originalPosition: null,
      currentPosition: null,
      mouseX: 0,
      mouseY: 0
    });
  }, []);

  const updateMousePosition = useCallback((x: number, y: number) => {
    setGlobalDragState(prev => ({
      ...prev,
      mouseX: x,
      mouseY: y
    }));
  }, []);

  const updateCurrentPosition = useCallback((date: Date, time: string, roomId: string) => {
    setGlobalDragState(prev => ({
      ...prev,
      currentPosition: {
        date,
        time,
        roomId
      }
    }));
  }, []);

  return {
    globalDragState,
    startDrag,
    endDrag,
    updateMousePosition,
    updateCurrentPosition
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
  cellRef: React.RefObject<HTMLDivElement>
) {
  const [localPreview, setLocalPreview] = useState<{
    offsetY: number;
    exactTime: string;
  } | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (!globalDragState.isActive || !cellRef.current) {
      setLocalPreview(null);
      return;
    }

    const rect = cellRef.current.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const percentage = Math.max(0, Math.min(1, relativeY / rect.height));
    
    // Calcular el minuto exacto (granularidad de 1 minuto para máxima precisión)
    const minuteOffset = Math.floor(percentage * slotDuration);
    const cappedOffset = Math.min(minuteOffset, slotDuration - 1);
    
    const [hours, minutes] = cellTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + cappedOffset;
    const displayHours = Math.floor(totalMinutes / 60);
    const displayMinutes = totalMinutes % 60;
    const exactTime = `${displayHours.toString().padStart(2, '0')}:${displayMinutes.toString().padStart(2, '0')}`;
    
    setLocalPreview({
      offsetY: (cappedOffset / slotDuration) * cellHeight,
      exactTime
    });
    
    // Actualizar la posición global para que el DragPreview muestre la hora correcta
    updateCurrentPosition(cellDay, exactTime, cellRoomId);
  }, [globalDragState.isActive, cellTime, slotDuration, cellHeight, cellDay, cellRoomId, updateCurrentPosition, cellRef]);

  const handleDragLeave = useCallback(() => {
    setLocalPreview(null);
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
  }, [globalDragState, localPreview, cellDay, cellRoomId]);

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
  slotDuration: number = 15
) {
  const { globalDragState, startDrag, endDrag, updateMousePosition, updateCurrentPosition } = useGlobalDragState();

  const handleDragStart = useCallback((
    e: React.DragEvent,
    item: DragItem
  ) => {
    // Set drag data
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    
    // Create custom drag image
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
    dragImage.style.width = `${e.currentTarget.clientWidth}px`;
    dragImage.style.opacity = '0.8';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    setTimeout(() => document.body.removeChild(dragImage), 0);
    
    // Start drag
    startDrag(item, e);
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
    
    // Check if anything changed
    if (hasAppointmentChanged(globalDragState.originalPosition, dropResult)) {
      const changes = getChangedFields(globalDragState.originalPosition, dropResult);
      onDrop(globalDragState.draggedItem.id, changes);
    }
    
    // End drag
    endDrag();
  }, [globalDragState, onDrop, endDrag]);

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
    updateCurrentPosition
  };
}
