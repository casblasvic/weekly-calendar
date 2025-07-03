'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { AppointmentProgressBar, OverlayProgressBar } from '@/components/appointment-progress-bar';
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  AlertTriangle,
  Zap
} from 'lucide-react';
import type { AppointmentUsageStatus } from '@/types/appointments';

interface AppointmentTimerDisplayProps {
  status: AppointmentUsageStatus;
  displayTime: string;
  isExceeded: boolean;
  remainingTime: number;
  progressPercentage: number;
  estimatedMinutes: number;
  actualMinutes: number;
  hasEquipment?: boolean;
  width?: 'narrow' | 'medium' | 'wide';
  showProgressBar?: boolean;
  className?: string;
}

export const AppointmentTimerDisplay = memo(function AppointmentTimerDisplay({
  status,
  displayTime,
  isExceeded,
  remainingTime,
  progressPercentage,
  estimatedMinutes,
  actualMinutes,
  hasEquipment = false,
  width = 'medium',
  showProgressBar = true,
  className
}: AppointmentTimerDisplayProps) {
  
  const getStatusConfig = () => {
    switch (status) {
      case 'ACTIVE':
        return {
          icon: Play,
          color: isExceeded ? 'text-red-600' : 'text-green-600',
          bgColor: isExceeded ? 'bg-red-50' : 'bg-green-50',
          borderColor: isExceeded ? 'border-red-200' : 'border-green-200',
          pulseColor: isExceeded ? 'bg-red-500' : 'bg-green-500'
        };
      case 'PAUSED':
        return {
          icon: Pause,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          pulseColor: 'bg-orange-500'
        };
      case 'COMPLETED':
        return {
          icon: Square,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          pulseColor: 'bg-blue-500'
        };
      default:
        return {
          icon: Clock,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          pulseColor: 'bg-gray-500'
        };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;
  const [minutes, seconds] = displayTime.split(':').map(Number);

  // Renderizado para citas muy estrechas (< 60px) - Solo barra overlay
  if (width === 'narrow') {
    return (
      <div className={cn("relative", className)}>
        {/* Solo indicador pulsante en la esquina */}
        <div className="absolute top-1 right-1 z-10">
          <div className={cn(
            "w-2 h-2 rounded-full",
            config.pulseColor,
            status === 'ACTIVE' ? 'animate-pulse' : ''
          )} />
        </div>
        
        {/* 🆕 Barra de progreso overlay (se superpone en la parte inferior de la cita) */}
        {showProgressBar && (
          <OverlayProgressBar
            status={status}
            progressPercentage={progressPercentage}
            isExceeded={isExceeded}
          />
        )}
      </div>
    );
  }

  // Renderizado para citas medianas (60-120px) - Badge + overlay
  if (width === 'medium') {
    return (
      <div className={cn("relative", className)}>
        {/* Badge flotante compacto */}
        <div className="absolute top-1 right-1 z-10">
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs px-1.5 py-0.5 font-mono border",
              config.bgColor,
              config.borderColor,
              config.color
            )}
          >
            <div className="flex items-center gap-1">
              <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                config.pulseColor,
                status === 'ACTIVE' ? 'animate-pulse' : ''
              )} />
              <span className="text-[10px]">
                {minutes}:{seconds.toString().padStart(2, '0')}
              </span>
            </div>
          </Badge>
        </div>
        
        {/* 🆕 Barra de progreso overlay */}
        {showProgressBar && (
          <OverlayProgressBar
            status={status}
            progressPercentage={progressPercentage}
            isExceeded={isExceeded}
          />
        )}
      </div>
    );
  }

  // Renderizado para citas anchas (> 120px) - Cronómetro completo + barra independiente
  return (
    <div className={cn("space-y-2", className)}>
      {/* Cronómetro principal */}
      <div className={cn(
        "flex items-center gap-2 px-2 py-1 rounded-md border transition-all",
        config.bgColor,
        config.borderColor
      )}>
        <div className="flex items-center gap-1.5">
          {/* Indicador pulsante */}
          <div className={cn(
            "w-2 h-2 rounded-full",
            config.pulseColor,
            status === 'ACTIVE' ? 'animate-pulse' : ''
          )} />
          
          {/* Ícono de estado */}
          <StatusIcon className={cn("h-3 w-3", config.color)} />
          
          {/* Indicador de equipamiento */}
          {hasEquipment && (
            <Zap className="h-3 w-3 text-blue-500" />
          )}
        </div>

        {/* Display del tiempo */}
        <div className={cn("text-sm font-bold font-mono", config.color)}>
          {displayTime}
        </div>

        {/* Indicador de exceso */}
        {isExceeded && status === 'ACTIVE' && (
          <AlertTriangle className="h-3 w-3 text-red-500" />
        )}
      </div>

      {/* 🆕 Barra de progreso independiente para citas anchas */}
      {showProgressBar && (
        <AppointmentProgressBar
          status={status}
          progressPercentage={progressPercentage}
          isExceeded={isExceeded}
          estimatedMinutes={estimatedMinutes}
          actualMinutes={actualMinutes}
          height="sm"
          showLabel={false}
        />
      )}

      {/* Estado con texto animado */}
      {status === 'ACTIVE' && !isExceeded && (
        <div className="text-xs text-green-600 font-medium animate-pulse">
          En progreso
        </div>
      )}

      {status === 'ACTIVE' && isExceeded && (
        <div className="text-xs text-red-600 font-medium animate-pulse">
          Tiempo excedido
        </div>
      )}

      {status === 'PAUSED' && (
        <div className="text-xs text-orange-600 font-medium">
          Pausado
        </div>
      )}

      {status === 'COMPLETED' && (
        <div className="text-xs text-blue-600 font-medium">
          Completado
        </div>
      )}
    </div>
  );
}); 