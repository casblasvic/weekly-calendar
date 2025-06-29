import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Power, Loader2, Zap, Plug, Thermometer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeviceControlButtonProps {
  device: {
    id: string;
    name: string;
    online: boolean;
    relayOn: boolean | null;
    currentPower?: number | null;
    voltage?: number | null;
    temperature?: number | null;
  };
  onToggle: (deviceId: string, turnOn: boolean) => Promise<void>;
  disabled?: boolean;
  size?: 'sm' | 'default' | 'lg';
  showMetrics?: boolean;
}

export function DeviceControlButton({ 
  device, 
  onToggle, 
  disabled = false,
  size = 'sm',
  showMetrics = true
}: DeviceControlButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (isLoading || disabled || !device.online) return;
    
    setIsLoading(true);
    try {
      await onToggle(device.id, !device.relayOn);
    } finally {
      setIsLoading(false);
    }
  };

  // Formatear valores con formato específico
  const formatPower = (power: number | null) => {
    if (!power || power === 0) return '000.0 W';
    if (power < 1) {
      // Para milivatios, convertir a vatios con 3 cifras
      const watts = power;
      return `${watts.toFixed(1).padStart(5, '0')} W`;
    }
    // Para vatios normales, formato XXX.X
    return `${power.toFixed(1).padStart(5, '0')} W`;
  };

  const formatVoltage = (voltage: number | null) => {
    if (!voltage) return null;
    return `${voltage.toFixed(1)} V`;
  };

  const formatTemperature = (temp: number | null) => {
    if (!temp) return null;
    return `${temp.toFixed(1)}°C`;
  };

  // Determinar color y estado del botón
  const getButtonState = () => {
    if (!device.online) {
      return {
        bgColor: 'bg-gray-400',
        borderColor: 'border-gray-300',
        iconColor: 'text-gray-600',
        hoverColor: 'hover:bg-gray-400',
        disabled: true,
        title: 'Dispositivo offline'
      };
    }
    
    if (device.relayOn) {
      return {
        bgColor: 'bg-green-500',
        borderColor: 'border-green-400',
        iconColor: 'text-white',
        hoverColor: 'hover:bg-green-600',
        disabled: false,
        title: 'Apagar dispositivo'
      };
    }
    
    return {
      bgColor: 'bg-blue-500',
      borderColor: 'border-blue-400',
      iconColor: 'text-white',
      hoverColor: 'hover:bg-blue-600',
      disabled: false,
      title: 'Encender dispositivo'
    };
  };

  const buttonState = getButtonState();

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Botón de control */}
      <button
        onClick={handleClick}
        disabled={disabled || isLoading || buttonState.disabled}
        className={cn(
          "relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-200",
          "active:scale-95 shadow-sm hover:shadow-md",
          buttonState.bgColor,
          buttonState.borderColor,
          buttonState.hoverColor,
          buttonState.disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        )}
        title={buttonState.title}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-white" />
        ) : (
          <Power className={cn("h-4 w-4", buttonState.iconColor)} />
        )}
        
        {/* Indicador de actividad cuando está encendido */}
        {device.online && device.relayOn && !isLoading && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-300 rounded-full animate-pulse border border-white" />
        )}
      </button>

      {/* Métricas en tiempo real - Solo mostrar cuando está encendido */}
      {showMetrics && device.online && device.relayOn && (
        <div className="flex flex-col items-center gap-1 text-center">
          {/* Potencia */}
          {device.currentPower !== null && device.currentPower !== undefined && (
            <div className="flex items-center gap-1 text-xs">
              <Zap className="h-3 w-3 text-yellow-600 flex-shrink-0" />
              <span className="font-medium text-yellow-700 font-mono">
                {formatPower(device.currentPower)}
              </span>
            </div>
          )}
          
          {/* Voltaje */}
          {device.voltage && (
            <div className="flex items-center gap-1 text-xs">
              <Plug className="h-3 w-3 text-blue-600 flex-shrink-0" />
              <span className="text-blue-700 font-medium">
                {formatVoltage(device.voltage)}
              </span>
            </div>
          )}
          
          {/* Temperatura */}
          {device.temperature && (
            <div className="flex items-center gap-1 text-xs">
              <Thermometer className="h-3 w-3 text-red-600 flex-shrink-0" />
              <span className="text-red-700 font-medium">
                {formatTemperature(device.temperature)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Texto de estado cuando está apagado */}
      {showMetrics && device.online && !device.relayOn && (
        <div className="text-xs text-gray-500">
          Apagado
        </div>
      )}

      {/* Texto de estado cuando está offline */}
      {showMetrics && !device.online && (
        <div className="text-xs text-gray-400">
          Offline
        </div>
      )}
    </div>
  );
} 