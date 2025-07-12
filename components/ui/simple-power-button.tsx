/**
 * 🎯 COMPONENTE SIMPLE POWER BUTTON - CONTEXTO ESPECÍFICO PARA AGENDA/CITAS
 * 
 * ⚠️ IMPORTANTE: Este componente está diseñado ESPECÍFICAMENTE para uso en:
 * - Agenda/calendario de citas
 * - Menús rápidos de appointment-item.tsx
 * - Contextos donde se requiere lógica de powerThreshold
 * 
 * 🚫 NO USAR PARA:
 * - Tabla de enchufes inteligentes (usar SmartPlugPowerButton)
 * - Control maestro de dispositivos por administrador
 * - Contextos simples de encendido/apagado
 * 
 * 🔧 FUNCIONALIDAD:
 * - Maneja lógica compleja de colores basada en powerThreshold
 * - Integra con getDeviceColors() para estados avanzados
 * - Fallback a lógica simple cuando powerThreshold es undefined
 * - Diseñado para contextos de citas con equipamiento asignado
 * 
 * 🔗 RELACIONES:
 * - device.powerThreshold: Viene del equipamiento configurado en la BD
 * - device.currentPower: Datos en tiempo real del dispositivo
 * - getDeviceColors(): Función centralizada de lógica de colores
 * - onToggle(): Callback para control del dispositivo
 * 
 * 📋 VARIABLES CRÍTICAS:
 * - powerThreshold: Umbral de consumo para determinar si está "realmente encendido"
 * - currentPower: Consumo actual en vatios del dispositivo
 * - relayOn: Estado del relay (encendido/apagado)
 * - online: Estado de conexión del dispositivo
 * 
 * 🎨 ESTADOS DE COLOR:
 * - Con powerThreshold: Usa getDeviceColors() (complejo)
 * - Sin powerThreshold: Lógica simple (azul OFF, verde ON, gris offline)
 * 
 * @see components/ui/smart-plug-power-button.tsx - Para tabla de enchufes
 * @see lib/utils/device-colors.ts - Lógica centralizada de colores
 * @see docs/DEVICE_COLOR_LOGIC.md - Documentación completa
 */
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
    powerThreshold?: number; // ⚠️ CRÍTICO: Umbral de consumo del equipamiento
    currentPower?: number;   // 📊 Consumo actual en vatios
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

  /**
   * 🎯 MANEJO DE CLICK - Control del dispositivo
   * 
   * Valida estado antes de ejecutar:
   * - No ejecutar si está cargando, deshabilitado u offline
   * - Invierte el estado actual del relay (ON → OFF, OFF → ON)
   * - Maneja loading state para UX
   */
  const handleClick = async () => {
    if (isLoading || disabled || !device.online) return;
    
    setIsLoading(true);
    try {
      await onToggle(device.id, !device.relayOn);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 🎨 LÓGICA DE COLORES - Dual: Simple vs Compleja
   * 
   * CASO 1: Sin powerThreshold (contextos simples)
   * - Lógica básica: offline=gris, ON=verde, OFF=azul
   * - Usado cuando no hay equipamiento configurado
   * 
   * CASO 2: Con powerThreshold (contextos de citas)
   * - Usa getDeviceColors() para lógica compleja
   * - Considera consumo real vs umbral configurado
   * - Estados avanzados: ocupado, completado, etc.
   * 
   * @returns {Object} Estado visual del botón (colores, disabled, title)
   */
  const getButtonState = () => {
    // 🔄 RAMA 1: LÓGICA SIMPLE (sin powerThreshold)
    if (device.powerThreshold === undefined) {
      if (!device.online) {
        return {
          bgColor: 'bg-gray-400',
          borderColor: 'border-gray-500',
          iconColor: 'text-white',
          hoverColor: 'hover:bg-gray-400',
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
    }

    // 🔄 RAMA 2: LÓGICA COMPLEJA (con powerThreshold)
    // Delega a función centralizada que maneja todos los casos avanzados
    const colors = getDeviceColors({
      online: device.online,
      relayOn: device.relayOn,
      currentPower: device.currentPower,
      powerThreshold: device.powerThreshold, // ⚠️ CRÍTICO: Del equipamiento en BD
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
  
  /**
   * 📏 CONFIGURACIÓN DE TAMAÑOS
   * - sm: Para menús compactos y dropdowns
   * - default: Tamaño estándar
   * - lg: Para interfaces principales
   */
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

  /**
   * 🎨 RENDER DEL BOTÓN
   * 
   * Estructura:
   * - Botón circular con border
   * - Colores dinámicos según buttonState
   * - Icono Power o Loader2 según estado
   * - Disabled state con opacity reducida
   * - Hover effects y transitions
   * 
   * Estados visuales:
   * - Normal: Colores según lógica de getButtonState()
   * - Loading: Spinner animado
   * - Disabled: Opacity 60% + cursor not-allowed
   * - Hover: Shadow elevation + scale effect
   */
  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading || buttonState.disabled}
      className={cn(
        "relative flex items-center justify-center rounded-full border-2 transition-all duration-200",
        "active:scale-95 shadow-sm hover:shadow-md", // 🎭 Efectos de interacción
        sizeClasses[size], // 📏 Tamaño dinámico
        buttonState.bgColor, // 🎨 Color de fondo
        buttonState.borderColor, // 🎨 Color de borde
        buttonState.hoverColor, // 🎨 Color hover
        buttonState.disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      )}
      title={buttonState.title} // 💬 Tooltip explicativo
    >
      {isLoading ? (
        <Loader2 className={cn("animate-spin text-white", iconSizes[size])} />
      ) : (
        <Power className={cn(buttonState.iconColor, iconSizes[size])} />
      )}
    </button>
  );
}

/**
 * 📚 DOCUMENTACIÓN ADICIONAL Y CASOS DE USO
 * 
 * 🎯 CUÁNDO USAR SimplePowerButton:
 * ✅ Menús rápidos en appointment-item.tsx
 * ✅ Controles de dispositivos en contexto de citas
 * ✅ Cuando necesites lógica de powerThreshold
 * ✅ Estados avanzados (ocupado, completado, etc.)
 * 
 * 🚫 CUÁNDO NO USAR:
 * ❌ Tabla de enchufes inteligentes → usar SmartPlugPowerButton
 * ❌ Control maestro por administrador → usar SmartPlugPowerButton
 * ❌ Contextos simples sin equipamiento → usar SmartPlugPowerButton
 * 
 * 🔗 COMPONENTES RELACIONADOS:
 * - SmartPlugPowerButton: Para tabla de enchufes (lógica simple)
 * - DeviceControlButton: Para contextos de citas con métricas
 * - device-colors.ts: Lógica centralizada de colores
 * 
 * 🛠️ MANTENIMIENTO:
 * - Si cambias la lógica de colores, actualiza device-colors.ts
 * - Si añades nuevos estados, documenta en DEVICE_COLOR_LOGIC.md
 * - Mantén sincronizada la documentación con los cambios
 * 
 * 🔄 FLUJO DE DATOS:
 * 1. device props → getButtonState()
 * 2. powerThreshold check → simple vs complex logic
 * 3. getDeviceColors() o lógica simple → visual state
 * 4. render() → botón con colores y estados
 * 5. onClick → onToggle callback → actualización estado
 */ 