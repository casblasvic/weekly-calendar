/**
 * 🔌 COMPONENTE ESPECÍFICO PARA TABLA DE ENCHUFES INTELIGENTES
 * 
 * Este botón es SIMPLE y DIRECTO:
 * - Azul si está online y OFF
 * - Verde si está online y ON  
 * - Gris si está offline (bloqueado)
 * 
 * NO usa powerThreshold ni lógica compleja de citas.
 * Es el control maestro de administrador para enchufes.
 * 
 * @see docs/SMART_PLUGS_MODULE_ISOLATION.md
 */
import React, { useState } from 'react';
import { Power, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmartPlugPowerButtonProps {
  device: {
    id: string;
    name: string;
    online: boolean;
    relayOn: boolean | null;
  };
  onToggle: (deviceId: string, turnOn: boolean) => Promise<void>;
  disabled?: boolean;
  size?: 'sm' | 'default' | 'lg';
}

export function SmartPlugPowerButton({ 
  device, 
  onToggle, 
  disabled = false,
  size = 'sm'
}: SmartPlugPowerButtonProps) {
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

  // 🎨 LÓGICA SIMPLE DE COLORES - Solo para tabla de enchufes
  const getButtonState = () => {
    if (!device.online) {
      return {
        bgColor: 'bg-gray-400',
        borderColor: 'border-gray-500',
        iconColor: 'text-white',
        hoverColor: 'hover:bg-gray-400', // Sin hover si está offline
        disabled: true,
        title: `${device.name} - Dispositivo offline`
      };
    }

    if (device.relayOn) {
      return {
        bgColor: 'bg-green-500',
        borderColor: 'border-green-600',
        iconColor: 'text-white',
        hoverColor: 'hover:bg-green-600',
        disabled: false,
        title: `${device.name} - Encendido (clic para apagar)`
      };
    } else {
      return {
        bgColor: 'bg-blue-500',
        borderColor: 'border-blue-600',
        iconColor: 'text-white',
        hoverColor: 'hover:bg-blue-600',
        disabled: false,
        title: `${device.name} - Apagado (clic para encender)`
      };
    }
  };

  const buttonState = getButtonState();
  
  // Tamaños
  const sizeClasses = {
    sm: 'w-8 h-8',
    default: 'w-10 h-10',
    lg: 'w-12 h-12'
  };
  
  const iconSizes = {
    sm: 'h-4 w-4',
    default: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading || buttonState.disabled}
      className={cn(
        "relative flex items-center justify-center rounded-full border-2 transition-all duration-200",
        "active:scale-95 shadow-sm hover:shadow-md",
        sizeClasses[size],
        buttonState.bgColor,
        buttonState.borderColor,
        buttonState.hoverColor,
        buttonState.disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      )}
      title={buttonState.title}
    >
      {isLoading ? (
        <Loader2 className={cn("animate-spin text-white", iconSizes[size])} />
      ) : (
        <Power className={cn(buttonState.iconColor, iconSizes[size])} />
      )}
    </button>
  );
} 