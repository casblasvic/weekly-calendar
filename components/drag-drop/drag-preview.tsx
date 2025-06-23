import React from 'react';
import { DragPreview as DragPreviewType } from '@/lib/drag-drop/types';
import { AppointmentTooltip } from '@/components/appointment-tooltip';

interface DragPreviewProps {
  preview: DragPreviewType;
  duration: number; // in minutes
  color: string;
  title: string;
  slotDuration: number; // duración del slot en minutos
  slotHeight: number; // altura del slot en píxeles
  roomName?: string;
  clientName?: string;
  clientPhone?: string;
  services?: string[];
}

export const DragPreview: React.FC<DragPreviewProps> = ({
  preview,
  duration,
  color,
  title,
  slotDuration,
  slotHeight,
  roomName,
  clientName,
  clientPhone,
  services
}) => {
  // Calcular altura dinámica basada en la configuración del slot
  const minuteHeight = slotHeight / slotDuration; // píxeles por minuto
  const height = Math.max(duration * minuteHeight, 40); // Mínimo 40px para que quepa el contenido
  
  // El tooltip debe seguir al cursor pero manteniéndose visible
  const [adjustedPosition, setAdjustedPosition] = React.useState({ x: preview.x, y: preview.y });
  
  React.useEffect(() => {
    const tooltipWidth = 280; // Ancho estimado del tooltip
    const tooltipHeight = height + 40; // Altura estimada del tooltip
    
    // Posición base: seguir al cursor con un pequeño offset
    let x = preview.x + 10;
    let y = preview.y - 40; // Arriba del cursor
    
    // Obtener dimensiones del viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Si el tooltip se sale por la derecha, ajustar
    if (x + tooltipWidth > viewportWidth - 10) {
      x = preview.x - tooltipWidth - 10; // A la izquierda del cursor
    }
    
    // Si el tooltip se sale por arriba, mostrarlo abajo
    if (y < 10) {
      y = preview.y + 10;
    }
    
    // Si el tooltip se sale por abajo, ajustar
    if (y + tooltipHeight > viewportHeight - 10) {
      y = viewportHeight - tooltipHeight - 10;
    }
    
    setAdjustedPosition({ x, y });
  }, [preview.x, preview.y, height]);
  
  return (
    <div
      className="fixed pointer-events-none z-[9999] transition-none"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
    >
      <AppointmentTooltip
        title={title}
        date={preview.date}
        time={preview.time}
        duration={duration}
        color={color}
        roomName={roomName}
        clientName={clientName || ''}
        clientPhone={clientPhone || ''}
        services={services || []}
      />
      
      {/* Tooltip arrow - solo si no está muy a la derecha */}
      {adjustedPosition.x > preview.x && (
        <div 
          className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-0 h-0"
          style={{
            borderTop: '8px solid transparent',
            borderBottom: '8px solid transparent',
            borderRight: `8px solid ${color}`,
            filter: 'drop-shadow(-2px 0 2px rgba(0, 0, 0, 0.1))'
          }}
        />
      )}
    </div>
  );
};
