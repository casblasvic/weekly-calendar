import { useState, useCallback, useRef, useEffect } from 'react';
import { DragState, DragItem, DropResult, DragPreview } from './types';
import { 
  calculateMinuteOffset, 
  getTimeWithOffset, 
  hasAppointmentChanged,
  getChangedFields,
  findClosestTimeSlot
} from './utils';

export function useDragAndDrop(
  onDrop: (appointmentId: string, changes: any) => void,
  slotHeight: number = 60,
  slotDuration: number = 15
) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedItem: null,
    preview: null,
    originalPosition: null
  });

  const dragRef = useRef<{ startY: number; lastY: number }>({ startY: 0, lastY: 0 });
  const containerRef = useRef<HTMLElement | null>(null);

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
    
    // Set initial state
    setDragState({
      isDragging: true,
      draggedItem: item,
      preview: null,
      originalPosition: {
        date: item.currentDate,
        time: item.startTime,
        roomId: item.roomId
      }
    });
    
    dragRef.current = { startY: e.clientY, lastY: e.clientY };
  }, []);

  const handleDragOver = useCallback((
    e: React.DragEvent,
    date: Date,
    roomId: string,
    containerElement?: HTMLElement
  ) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (!dragState.isDragging || !containerElement) return;
    
    const container = containerElement || containerRef.current;
    if (!container) return;
    
    // Find closest time slot
    const closestSlot = findClosestTimeSlot(container, e.clientY);
    if (!closestSlot) return;
    
    const slotTime = closestSlot.element.getAttribute('data-time') || '00:00';
    const minuteOffset = calculateMinuteOffset(
      closestSlot.offset,
      slotHeight,
      slotDuration,
      1 // moveGranularity: siempre 1 minuto para máxima precisión al mover
    );
    
    const adjustedTime = getTimeWithOffset(slotTime, minuteOffset);
    
    setDragState(prev => ({
      ...prev,
      preview: {
        x: e.clientX,
        y: e.clientY,
        date,
        time: adjustedTime,
        roomId
      }
    }));
  }, [dragState.isDragging, slotHeight, slotDuration]);

  const handleDrop = useCallback((
    e: React.DragEvent,
    date: Date,
    roomId: string
  ) => {
    e.preventDefault();
    
    if (!dragState.draggedItem || !dragState.originalPosition) return;
    
    const dropResult: DropResult = {
      date,
      time: dragState.preview?.time || dragState.draggedItem.startTime,
      roomId
    };
    
    // Check if anything changed
    if (hasAppointmentChanged(dragState.originalPosition, dropResult)) {
      const changes = getChangedFields(dragState.originalPosition, dropResult);
      onDrop(dragState.draggedItem.id, changes);
    }
    
    // Reset state
    setDragState({
      isDragging: false,
      draggedItem: null,
      preview: null,
      originalPosition: null
    });
  }, [dragState, onDrop]);

  const handleDragEnd = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedItem: null,
      preview: null,
      originalPosition: null
    });
  }, []);

  return {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    setContainerRef: (ref: HTMLElement | null) => { containerRef.current = ref; }
  };
}
