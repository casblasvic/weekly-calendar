import React, { useState } from 'react';
import { Power, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDeviceColors } from '@/lib/utils/device-colors';

interface SimplePowerButtonProps {
  device: {
    id: string;
    name: string;
    online: boolean;
    relayOn: boolean | null;
    powerThreshold?: number;
    currentPower?: number;
  };
  onToggle: (deviceId: string, turnOn: boolean) => Promise<void>;
  disabled?: boolean;
  size?: 'sm' | 'default' | 'lg';
}

export function SimplePowerButton({ 
  device, 
  onToggle, 
  disabled = false,
  size = 'sm'
}: SimplePowerButtonProps) {
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

  // 🎨 USAR FUNCIÓN CENTRALIZADA DE COLORES
  const getButtonState = () => {
    const colors = getDeviceColors({
      online: device.online,
      relayOn: device.relayOn,
      currentPower: device.currentPower,
      powerThreshold: device.powerThreshold,
      status: device.online ? 'available' : 'offline'
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