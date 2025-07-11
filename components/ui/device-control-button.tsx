import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Power, Loader2, Zap, Plug, Thermometer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDeviceColors } from '@/lib/utils/device-colors';

interface DeviceControlButtonProps {
  device: {
    id: string;
    name: string;
    online: boolean;
    relayOn: boolean | null;
    currentPower?: number | null;
    voltage?: number | null;
    temperature?: number | null;
    powerThreshold?: number;
    // 🕒 CAMPOS DE TIEMPO PARA BLOQUEO
    actualMinutes?: number;
    estimatedMinutes?: number;
    // 🔒 AUTO-SHUTDOWN PARA CONDICIONAR BLOQUEO
    autoShutdownEnabled?: boolean;
  };
  onToggle: (deviceId: string, turnOn: boolean) => Promise<void>;
  disabled?: boolean;
  size?: 'sm' | 'default' | 'lg';
  showMetrics?: boolean;
  deviceStatus?: 'available' | 'occupied' | 'offline' | 'in_use_this_appointment' | 'over_used' | 'auto_shutdown' | 'paused' | 'completed';
}

export function DeviceControlButton({ 
  device, 
  onToggle, 
  disabled = false,
  size = 'sm',
  showMetrics = true,
  deviceStatus = 'available'
}: DeviceControlButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (isLoading || disabled) return;
    
    setIsLoading(true);
    try {
      await onToggle((device as any).deviceId ?? device.id, !device.relayOn);
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

  // 🎨 USAR FUNCIÓN CENTRALIZADA DE COLORES
  const getButtonState = () => {
    const colors = getDeviceColors({
      online: device.online,
      relayOn: device.relayOn,
      currentPower: device.currentPower,
      powerThreshold: device.powerThreshold,
      status: deviceStatus as any,
      // 🕒 CAMPOS DE TIEMPO PARA BLOQUEO POR AUTO-SHUTDOWN
      actualMinutes: device.actualMinutes,
      estimatedMinutes: device.estimatedMinutes,
      autoShutdownEnabled: device.autoShutdownEnabled
    });
    
    return {
      bgColor: colors.bgColor,
      borderColor: colors.borderColor,
      iconColor: colors.iconColor,
      hoverColor: colors.hoverColor,
      disabled: colors.disabled,
      title: colors.title
    };
  };

  const buttonState = getButtonState();

  return (
    <div className="flex flex-col gap-2 items-center">
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
          <Loader2 className="w-4 h-4 text-white animate-spin" />
        ) : (
          <Power className={cn("h-4 w-4", buttonState.iconColor)} />
        )}
        
        {/* Indicador de actividad cuando está encendido */}
        {device.online && device.relayOn && !isLoading && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-300 rounded-full border border-white animate-pulse" />
        )}
      </button>

      {/* Métricas en tiempo real - Solo mostrar cuando está encendido */}
      {showMetrics && device.online && device.relayOn && (
        <div className="flex flex-col gap-1 items-center text-center">
          {/* Potencia */}
          {device.currentPower !== null && device.currentPower !== undefined && (
            <div className="flex gap-1 items-center text-xs">
              <Zap className="flex-shrink-0 w-3 h-3 text-yellow-600" />
              <span className="font-mono font-medium text-yellow-700">
                {formatPower(device.currentPower)}
              </span>
            </div>
          )}
          
          {/* Voltaje */}
          {device.voltage && (
            <div className="flex gap-1 items-center text-xs">
              <Plug className="flex-shrink-0 w-3 h-3 text-blue-600" />
              <span className="font-medium text-blue-700">
                {formatVoltage(device.voltage)}
              </span>
            </div>
          )}
          
          {/* Temperatura */}
          {device.temperature && (
            <div className="flex gap-1 items-center text-xs">
              <Thermometer className="flex-shrink-0 w-3 h-3 text-red-600" />
              <span className="font-medium text-red-700">
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