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
  deviceStatus?: 'available' | 'occupied' | 'offline' | 'in_use_this_appointment';
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

  // 🎨 NUEVA LÓGICA DE COLORES CORREGIDA
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
    
    // 🔴 ROJO: Ocupado por OTRA CITA (no disponible para esta cita)
    if (deviceStatus === 'occupied') {
      return {
        bgColor: 'bg-red-500',
        borderColor: 'border-red-400',
        iconColor: 'text-white',
        hoverColor: 'hover:bg-red-500',
        disabled: true,
        title: 'En uso por otra cita'
      };
    }
    
    // 🟢 VERDE: En uso en ESTA CITA + consumo real
    if (deviceStatus === 'in_use_this_appointment' && device.relayOn && device.currentPower && device.currentPower > 0.1) {
      return {
        bgColor: 'bg-green-500',
        borderColor: 'border-green-400',
        iconColor: 'text-white',
        hoverColor: 'hover:bg-green-600',
        disabled: false,
        title: 'En uso - apagar dispositivo'
      };
    }
    
    // 🟠 NARANJA: Asignado a ESTA CITA pero sin consumo real
    if (deviceStatus === 'in_use_this_appointment' && device.relayOn) {
      return {
        bgColor: 'bg-orange-500',
        borderColor: 'border-orange-400',
        iconColor: 'text-white',
        hoverColor: 'hover:bg-orange-600',
        disabled: false,
        title: 'Asignado sin consumo - apagar dispositivo'
      };
    }
    
    // 🔵 AZUL: Disponible para asignar
    if (deviceStatus === 'available') {
      return {
        bgColor: device.relayOn ? 'bg-blue-600' : 'bg-blue-500',
        borderColor: device.relayOn ? 'border-blue-500' : 'border-blue-400',
        iconColor: 'text-white',
        hoverColor: device.relayOn ? 'hover:bg-blue-700' : 'hover:bg-blue-600',
        disabled: false,
        title: device.relayOn ? 'Disponible (encendido) - apagar' : 'Disponible - encender'
      };
    }
    
    // ⚫ GRIS: Estado por defecto (offline)
    return {
      bgColor: 'bg-gray-500',
      borderColor: 'border-gray-400',
      iconColor: 'text-white',
      hoverColor: 'hover:bg-gray-600',
      disabled: false,
      title: device.relayOn ? 'Apagar dispositivo' : 'Encender dispositivo'
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