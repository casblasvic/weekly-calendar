'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import type { AppointmentUsageStatus } from '@/types/appointments';

interface AppointmentProgressBarProps {
  status: AppointmentUsageStatus;
  progressPercentage: number; // 0-100
  isExceeded: boolean;
  estimatedMinutes: number;
  actualMinutes: number;
  className?: string;
  showLabel?: boolean;
  height?: 'sm' | 'md' | 'lg';
}

export const AppointmentProgressBar = memo(function AppointmentProgressBar({
  status,
  progressPercentage,
  isExceeded,
  estimatedMinutes,
  actualMinutes,
  className,
  showLabel = true,
  height = 'md'
}: AppointmentProgressBarProps) {
  
  // Calcular el progreso real limitado a 100% para la barra visual
  const visualProgress = Math.min(100, progressPercentage);
  
  // Determinar colores y estilos según el estado
  const getProgressConfig = () => {
    if (status === 'COMPLETED') {
      return {
        barColor: 'bg-green-500',
        backgroundColor: 'bg-green-100',
        glowColor: 'shadow-green-500/20',
        textColor: 'text-green-700',
        pulseColor: 'bg-green-400'
      };
    }
    
    if (status === 'PAUSED') {
      return {
        barColor: 'bg-orange-500',
        backgroundColor: 'bg-orange-100', 
        glowColor: 'shadow-orange-500/20',
        textColor: 'text-orange-700',
        pulseColor: 'bg-orange-400'
      };
    }
    
    if (status === 'ACTIVE') {
      if (isExceeded) {
        return {
          barColor: 'bg-red-500',
          backgroundColor: 'bg-red-100',
          glowColor: 'shadow-red-500/20',
          textColor: 'text-red-700',
          pulseColor: 'bg-red-400'
        };
      }
      
      return {
        barColor: 'bg-green-500',
        backgroundColor: 'bg-green-100',
        glowColor: 'shadow-green-500/20', 
        textColor: 'text-green-700',
        pulseColor: 'bg-green-400'
      };
    }
    
    // Default/fallback
    return {
      barColor: 'bg-gray-400',
      backgroundColor: 'bg-gray-100',
      glowColor: 'shadow-gray-500/20',
      textColor: 'text-gray-700',
      pulseColor: 'bg-gray-300'
    };
  };

  const config = getProgressConfig();
  
  // Determinar altura de la barra
  const getBarHeight = () => {
    switch (height) {
      case 'sm': return 'h-1.5';
      case 'lg': return 'h-4';
      default: return 'h-2.5';
    }
  };

  // Formatear tiempo para etiqueta
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className={cn("space-y-1", className)}>
      {/* Barra de progreso principal */}
      <div className="relative">
        {/* Contenedor de la barra */}
        <div className={cn(
          "relative overflow-hidden rounded-full border transition-all duration-300",
          config.backgroundColor,
          config.glowColor,
          getBarHeight()
        )}>
          {/* Barra de progreso activa */}
          <div
            className={cn(
              "transition-all duration-1000 ease-out rounded-full relative",
              config.barColor,
              getBarHeight(),
              // Animación de pulso cuando está activo
              status === 'ACTIVE' && !isExceeded && "animate-pulse"
            )}
            style={{
              width: `${visualProgress}%`,
              transition: status === 'ACTIVE' ? 'width 1s ease-out' : 'width 0.3s ease-out'
            }}
          >
            {/* Efecto de brillo en la barra activa */}
            {status === 'ACTIVE' && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            )}
          </div>
          
          {/* Indicador de exceso de tiempo (cuando pasa del 100%) */}
          {isExceeded && progressPercentage > 100 && (
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-red-600 animate-pulse" />
          )}
        </div>
        
        {/* Marcador de tiempo estimado (línea vertical) */}
        <div className="absolute top-0 bottom-0 w-0.5 bg-gray-400/60 right-0 rounded-full" />
      </div>
      
      {/* Etiqueta de información */}
      {showLabel && (
        <div className={cn(
          "flex items-center justify-between text-xs font-medium",
          config.textColor
        )}>
          <span>
            {formatTime(actualMinutes)} / {formatTime(estimatedMinutes)}
          </span>
          
          <div className="flex items-center gap-2">
            {/* Porcentaje */}
            <span className="tabular-nums">
              {Math.round(progressPercentage)}%
            </span>
            
            {/* Indicador de estado */}
            <div className={cn(
              "w-2 h-2 rounded-full",
              config.pulseColor,
              status === 'ACTIVE' && "animate-pulse"
            )} />
          </div>
        </div>
      )}
      
      {/* Mensaje de exceso de tiempo */}
      {isExceeded && showLabel && (
        <div className="text-xs text-red-600 font-medium">
          ⚠️ Tiempo excedido por {formatTime(actualMinutes - estimatedMinutes)}
        </div>
      )}
    </div>
  );
});

// Variante compacta para espacios reducidos
export const CompactProgressBar = memo(function CompactProgressBar({
  status,
  progressPercentage,
  isExceeded,
  className
}: Pick<AppointmentProgressBarProps, 'status' | 'progressPercentage' | 'isExceeded' | 'className'>) {
  return (
    <AppointmentProgressBar
      status={status}
      progressPercentage={progressPercentage}
      isExceeded={isExceeded}
      estimatedMinutes={0}
      actualMinutes={0}
      showLabel={false}
      height="sm"
      className={className}
    />
  );
});

// Variante que se superpone en la cita (overlay)
export const OverlayProgressBar = memo(function OverlayProgressBar({
  status,
  progressPercentage,
  isExceeded,
  className
}: Pick<AppointmentProgressBarProps, 'status' | 'progressPercentage' | 'isExceeded' | 'className'>) {
  const config = status === 'PAUSED' ? 'bg-orange-500/80' : 
                 isExceeded ? 'bg-red-500/80' : 'bg-green-500/80';
  
  return (
    <div className={cn(
      "absolute bottom-0 left-0 right-0 h-1 bg-black/10 overflow-hidden",
      className
    )}>
      <div
        className={cn(
          "h-full transition-all duration-1000 ease-out",
          config,
          status === 'ACTIVE' && !isExceeded && "animate-pulse"
        )}
        style={{
          width: `${Math.min(100, progressPercentage)}%`
        }}
      />
      
      {/* Efecto de brillo */}
      {status === 'ACTIVE' && (
        <div 
          className="absolute top-0 bottom-0 w-8 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer"
          style={{
            left: `${Math.max(0, Math.min(92, progressPercentage - 8))}%`
          }}
        />
      )}
    </div>
  );
}); 