import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';

interface AppointmentDurationControlsProps {
  appointmentId: string;
  duration: number;
  startTime: string;
  onDurationChange: (appointmentId: string, newDuration: number) => void;
  isVisible: boolean;
  setIsDraggingDuration: (isDragging: boolean) => void;
  onPreviewDurationChange?: (duration: number) => void;
}

export function AppointmentDurationControls({
  appointmentId,
  duration,
  startTime,
  onDurationChange,
  isVisible,
  setIsDraggingDuration,
  onPreviewDurationChange
}: AppointmentDurationControlsProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [initialDuration, setInitialDuration] = useState(duration);
  const [previewDuration, setPreviewDuration] = useState(duration);
  const [initialMouseOffset, setInitialMouseOffset] = useState(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setIsDraggingDuration(true);
    
    const startY = e.clientY;
    const startDuration = duration;
    
    // Calcular el offset inicial del mouse respecto al control
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseOffsetFromControl = e.clientY - rect.top;
    
    setDragStartY(startY);
    setInitialDuration(startDuration);
    setPreviewDuration(startDuration);
    setInitialMouseOffset(mouseOffsetFromControl);

    // Agregar clase al body para cambiar el cursor globalmente y evitar selección de texto
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    
    // Opcionalmente, podemos bloquear el scroll durante el drag
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleMouseMove = (e: MouseEvent) => {
      // Calcular el cambio real desde el punto de inicio
      const currentY = e.clientY;
      const deltaY = currentY - startY;
      
      // Convertir píxeles a minutos con mayor precisión
      const slotHeightInPixels = 40; // Altura de cada slot
      const minutesPerPixel = 15 / slotHeightInPixels;
      const deltaMinutes = Math.round(deltaY * minutesPerPixel);
      
      // Calcular nueva duración con precisión de 1 minuto
      const newDuration = Math.max(15, Math.min(240, startDuration + deltaMinutes));
      
      // Solo actualizar si cambió la duración
      if (newDuration !== previewDuration) {
        // Solo actualizamos la preview, NO la cita real
        setPreviewDuration(newDuration);
        if (onPreviewDurationChange) {
          onPreviewDurationChange(newDuration);
        }
      }
    };

    const handleKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === 'Escape') {
        // Cancelar sin guardar cambios
        setPreviewDuration(duration);
        setIsDragging(false);
        setIsDraggingDuration(false);
        
        // Restaurar estilos del body
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.body.style.overflow = originalOverflow;
        
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('keydown', handleKeyDown);
      }
    };

    const handleMouseUp = () => {
      console.log('[DurationControls] Mouse up - checking if should save:', {
        previewDuration,
        originalDuration: duration,
        shouldSave: previewDuration !== duration,
        appointmentId
      });
      
      // Aquí SÍ actualizamos la cita real, solo al soltar
      if (previewDuration !== duration) {
        console.log('[DurationControls] Calling onDurationChange with:', appointmentId, previewDuration);
        onDurationChange(appointmentId, previewDuration);
      }
      
      setIsDragging(false);
      setIsDraggingDuration(false);
      
      // Restaurar estilos del body
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.style.overflow = originalOverflow;
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);
  }, [appointmentId, duration, onDurationChange, setIsDraggingDuration, onPreviewDurationChange]);

  if (!isVisible) return null;

  // Calcular hora de fin real basada en hora de inicio
  const getEndTime = (startTime: string, durationMinutes: number) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + durationMinutes;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  };

  const slotDuration = 15;

  return (
    <>
      {/* Control de estiramiento en la parte inferior */}
      <div
        className={cn(
          "absolute -bottom-2 left-1/2 -translate-x-1/2",
          "w-8 h-4 rounded-full",
          "bg-white/80 hover:bg-white",
          "border border-gray-300 hover:border-purple-500",
          "shadow-sm hover:shadow-md",
          "cursor-ns-resize",
          "transition-all duration-150",
          "flex items-center justify-center",
          "opacity-0 hover:opacity-100",
          isVisible && "opacity-100",
          isDragging && [
            "opacity-100 bg-purple-500 border-purple-600",
            "shadow-lg scale-110"
          ],
          "z-50" // Z-index alto para estar encima
        )}
        onMouseDown={handleMouseDown}
        style={{ 
          pointerEvents: 'auto',
          // Durante el drag, mantener el control visualmente "pegado" al cursor
          transform: isDragging 
            ? `translateX(-50%) translateY(${(previewDuration - duration) / slotDuration * 40}px)` 
            : 'translateX(-50%)'
        }}
      >
        {/* Icono de grip sutil */}
        <GripVertical className={cn(
          "h-3 w-3",
          isDragging ? "text-white" : "text-gray-400"
        )} />
      </div>

      {/* Indicador de duración durante el arrastre - bien posicionado */}
      {isDragging && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
            Hasta {getEndTime(startTime, previewDuration)}
          </div>
        </div>
      )}
    </>
  );
}
