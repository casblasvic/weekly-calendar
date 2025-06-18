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
  
  // Ajustar la posición para que el contenido siempre esté visible
  const [adjustedPosition, setAdjustedPosition] = React.useState({ x: preview.x, y: preview.y });
  
  React.useEffect(() => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const previewWidth = 240; // Actualizado al ancho del AppointmentTooltip
    const previewHeight = height;
    
    let x = preview.x + 20; // Offset horizontal mayor para mejor visibilidad
    let y = preview.y + 10; // Offset vertical para que no esté centrado en el cursor
    
    // Ajustar horizontalmente si se sale de la pantalla
    if (x + previewWidth > viewportWidth - 20) {
      // Si no cabe a la derecha, ponerlo a la izquierda del cursor
      x = preview.x - previewWidth - 20;
    }
    
    // Asegurar que no se salga por la izquierda
    if (x < 20) {
      x = 20;
    }
    
    // Ajustar verticalmente si se sale de la pantalla
    if (y + previewHeight > viewportHeight - 20) {
      // Si no cabe abajo, ajustar hacia arriba
      y = viewportHeight - previewHeight - 20;
    }
    
    // Asegurar que no se salga por arriba
    if (y < 20) {
      y = 20;
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
        clientName={clientName}
        clientPhone={clientPhone}
        services={services}
        height={height}
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
