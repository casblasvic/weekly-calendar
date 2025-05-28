import React from 'react';
import { cn } from '../lib/utils';

interface CurrentTimeIndicatorProps {
  leftOffset?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export const CurrentTimeIndicator: React.FC<CurrentTimeIndicatorProps> = ({
  leftOffset = 0,
  className,
  style = {},
}) => {
  // ... (lógica existente para calcular top, visibilidad, etc.)

  // Combinar estilos
  const combinedStyle: React.CSSProperties = {
    ...style,
    top: `${topPosition}%`,
    left: leftOffset,
    right: 0,
  };

  // No incluir display en el style si se controla con clases
  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={cn("current-time-indicator absolute h-0.5 bg-red-500 z-30 pointer-events-none", className)}
      style={combinedStyle}
      aria-hidden="true"
    />
  );
}; 