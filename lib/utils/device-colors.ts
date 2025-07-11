/**
 * 🎨 LÓGICA CENTRALIZADA DE COLORES PARA DISPOSITIVOS
 * 
 * Esta función contiene la lógica de colores documentada múltiples veces:
 * - 🔵 AZUL: Relay OFF (stand-by) - SIN MARCO
 * - 🟠 NARANJA: Relay ON pero sin consumo real (power ≤ threshold)
 * - 🟢 VERDE: Relay ON y consumiendo (power > threshold)
 * - 🔴 ROJO: Ocupado por otra cita
 * - ⚫ GRIS: Offline o completado
 * - 🔵 AZUL CLARO: Sobre-tiempo (online + on + consumiendo + actualMinutes > estimatedMinutes)
 * 
 * ⚠️ CRÍTICO: powerThreshold DEBE venir del equipamiento configurado, NO hardcodeado
 * 
 * @see docs/DEVICE_COLOR_LOGIC.md
 */

export interface DeviceColorInput {
  online: boolean;
  relayOn: boolean;
  currentPower?: number;
  powerThreshold: number | string; // ⚠️ Puede venir como string desde Prisma Decimal
  status?: 'available' | 'in_use_this_appointment' | 'occupied' | 'completed' | 'offline';
  // 🆕 NUEVO: Para detectar sobre-tiempo
  actualMinutes?: number;
  estimatedMinutes?: number;
  // 🔒 NUEVO: Para bloqueo por tiempo solo si autoShutdown está activo
  autoShutdownEnabled?: boolean;
}

export interface DeviceColorResult {
  bgColor: string;
  borderColor: string;
  iconColor: string;
  hoverColor: string;
  disabled: boolean;
  title: string;
  className?: string; // Para appointment-equipment-selector
  text?: string; // Para appointment-equipment-selector
}

/**
 * 🎨 FUNCIÓN PARA BOTONES DE DISPOSITIVOS
 * ⚠️ CRÍTICO: powerThreshold DEBE venir del equipamiento configurado
 */
export function getDeviceColors(device: DeviceColorInput): DeviceColorResult {
  // 🔍 DEBUG CRÍTICO: Log de todos los datos de entrada
  console.log('🔍 [DEVICE_COLORS_INPUT]:', {
    online: device.online,
    relayOn: device.relayOn,
    currentPower: device.currentPower,
    powerThreshold: device.powerThreshold,
    status: device.status,
    actualMinutes: device.actualMinutes,
    estimatedMinutes: device.estimatedMinutes,
    autoShutdownEnabled: device.autoShutdownEnabled,
    autoShutdownType: typeof device.autoShutdownEnabled
  });

  // ⚠️ VALIDACIÓN CRÍTICA: powerThreshold es obligatorio
  const threshold = typeof device.powerThreshold === 'string' ? 
    parseFloat(device.powerThreshold as string) : device.powerThreshold;
    
  if (typeof threshold !== 'number' || threshold < 0 || isNaN(threshold)) {
    console.error('🚨 [DEVICE_COLORS] powerThreshold inválido:', {
      original: device.powerThreshold,
      converted: threshold,
      type: typeof device.powerThreshold
    });
    return {
      bgColor: 'bg-gray-400',
      borderColor: 'border-gray-300',
      iconColor: 'text-gray-600',
      hoverColor: 'hover:bg-gray-400',
      disabled: true,
      title: 'Configuración inválida',
      className: 'bg-gray-400 hover:bg-gray-500 cursor-not-allowed text-white',
      text: 'Configuración inválida'
    };
  }

  // ⚫ GRIS: Dispositivo offline
  if (!device.online) {
    return {
      bgColor: 'bg-gray-400',
      borderColor: 'border-gray-300',
      iconColor: 'text-gray-600',
      hoverColor: 'hover:bg-gray-400',
      disabled: true,
      title: 'Dispositivo offline',
      className: 'bg-gray-400 hover:bg-gray-500 cursor-not-allowed text-white',
      text: 'Offline'
    };
  }

  // 🔴 ROJO: Ocupado por otra cita
  if (device.status === 'occupied') {
    return {
      bgColor: 'bg-red-500',
      borderColor: 'border-red-400',
      iconColor: 'text-white',
      hoverColor: 'hover:bg-red-500',
      disabled: true,
      title: 'En uso por otra cita',
      className: 'bg-red-500 hover:bg-red-600 cursor-not-allowed text-white',
      text: 'En Uso (Otra Cita)'
    };
  }

  // 🟣 ÍNDIGO: Completado
  if (device.status === 'completed') {
    console.log('🟣 [COMPLETED] Dispositivo con uso completado - BLOQUEADO');
    return {
      bgColor: 'bg-indigo-500',
      borderColor: 'border-indigo-400',
      iconColor: 'text-white',
      hoverColor: 'hover:bg-indigo-500',
      disabled: true,
      title: 'Uso completado',
      className: 'bg-indigo-500 hover:bg-indigo-600 cursor-not-allowed text-white',
      text: 'Servicio Completado'
    };
  }

  // 🔒 VERIFICAR SI SE AGOTÓ EL TIEMPO ESTIMADO PARA BOTONES (SOLO CON AUTO-SHUTDOWN ACTIVO)
  const isTimeUp = device.autoShutdownEnabled === true && 
    device.actualMinutes && device.estimatedMinutes && 
    device.actualMinutes >= device.estimatedMinutes;
  
  console.log('🕒 [BUTTON_TIME_CHECK]:', {
    actualMinutes: device.actualMinutes,
    estimatedMinutes: device.estimatedMinutes,
    autoShutdownEnabled: device.autoShutdownEnabled,
    autoShutdownType: typeof device.autoShutdownEnabled,
    isTimeUp,
    canStillOperate: !isTimeUp
  });

  // 🔒 BLOQUEAR BOTÓN SI SE AGOTÓ EL TIEMPO Y TIENE AUTO-SHUTDOWN ACTIVO
  // ✅ NUEVO: Bloquear SIEMPRE que el tiempo se agote, independientemente del status
  if (isTimeUp) {
    console.log('🔒 [TIME_BLOCKED] Dispositivo bloqueado por tiempo agotado con auto-shutdown activo');
    return {
      bgColor: 'bg-indigo-500',
      borderColor: 'border-indigo-400',
      iconColor: 'text-white',
      hoverColor: 'hover:bg-indigo-500',
      disabled: true,
      title: 'Tiempo agotado - No se puede encender (Auto-shutdown activo)',
      className: 'bg-indigo-500 hover:bg-indigo-600 cursor-not-allowed text-white',
      text: 'Servicio Completado'
    };
  }

  // 🎯 LÓGICA PRINCIPAL: RELAY + CONSUMO + ASIGNACIÓN
  const isConsuming = (device.currentPower ?? 0) > threshold;
  
  if (device.relayOn) {
    // 🔴 ROJO: Relay ON + consumiendo + SIN asignación (uso no autorizado)
    if (isConsuming && device.status !== 'in_use_this_appointment') {
      return {
        bgColor: 'bg-red-500',
        borderColor: 'border-red-400',
        iconColor: 'text-white',
        hoverColor: 'hover:bg-red-500',
        disabled: true,
        title: 'Consumiendo sin asignación autorizada',
        className: 'bg-red-500 hover:bg-red-600 cursor-not-allowed text-white',
        text: 'Uso No Autorizado'
      };
    }
    
    // ⚠️ CASO NUEVO: Encendido SIN consumo Y SIN asignación = AZUL (stand-by)
    if (!isConsuming && device.status !== 'in_use_this_appointment') {
      return {
        bgColor: 'bg-blue-500',
        borderColor: 'border-blue-400',
        iconColor: 'text-white',
        hoverColor: 'hover:bg-blue-600',
        disabled: false,
        title: 'Apagado (stand-by)',
        className: 'bg-blue-500 hover:bg-blue-600 text-white',
        text: 'Apagado'
      };
    }
    
    // 🟢 VERDE: Relay ON + consumiendo + asignado a esta cita
    if (isConsuming) {
      return {
        bgColor: 'bg-green-500',
        borderColor: 'border-green-400',
        iconColor: 'text-white',
        hoverColor: 'hover:bg-green-600',
        disabled: false,
        title: `Consumiendo ${device.currentPower?.toFixed(1)}W`,
        className: 'bg-green-500 hover:bg-green-600 text-white',
        text: 'Encendido'
      };
    } else {
      // 🟠 NARANJA: Relay ON + sin consumo + asignado a esta cita
      return {
        bgColor: 'bg-orange-500',
        borderColor: 'border-orange-400',
        iconColor: 'text-white',
        hoverColor: 'hover:bg-orange-600',
        disabled: false,
        title: `Encendido sin consumo (${device.currentPower?.toFixed(1) ?? 0}W ≤ ${threshold}W)`,
        className: 'bg-orange-500 hover:bg-orange-600 text-white',
        text: 'Sin Consumo'
      };
    }
  } else {
    // 🔵 AZUL: Relay OFF (stand-by)
    return {
      bgColor: 'bg-blue-500',
      borderColor: 'border-blue-400',
      iconColor: 'text-white',
      hoverColor: 'hover:bg-blue-600',
      disabled: false,
      title: 'Apagado (stand-by)',
      className: 'bg-blue-500 hover:bg-blue-600 text-white',
      text: 'Apagado'
    };
  }
}

/**
 * 🎨 FUNCIÓN PARA MARCOS DE CITAS (appointment borders)
 * ⚠️ CRÍTICO: powerThreshold DEBE venir del equipamiento configurado
 */
export function getAppointmentBorderClass(device: DeviceColorInput): string {
  // ⚠️ VALIDACIÓN CRÍTICA: powerThreshold es obligatorio
  const threshold = typeof device.powerThreshold === 'string' ? 
    parseFloat(device.powerThreshold as string) : device.powerThreshold;
    
  if (typeof threshold !== 'number' || threshold < 0 || isNaN(threshold)) {
    console.error('🚨 [APPOINTMENT_BORDER] powerThreshold inválido:', {
      original: device.powerThreshold,
      converted: threshold,
      type: typeof device.powerThreshold
    });
    return ''; // Sin marco si no hay threshold válido
  }

  // ⚫ Sin marco: Dispositivo offline
  if (!device.online) {
    return '';
  }

  // 🔴 Sin marco: Ocupado por otra cita (se maneja en otra lógica)
  if (device.status === 'occupied') {
    return '';
  }

  // ⚫ Sin marco: Completado
  if (device.status === 'completed') {
    return '';
  }

  // 🎯 LÓGICA SIMPLE: RELAY + CONSUMO + ASIGNACIÓN + TIEMPO
  const isConsuming = (device.currentPower ?? 0) > threshold;
  
  // 🔒 VERIFICAR SI SE AGOTÓ EL TIEMPO ESTIMADO (SOLO CON AUTO-SHUTDOWN ACTIVO)
  const isTimeUp = device.autoShutdownEnabled === true && 
    device.actualMinutes && device.estimatedMinutes && 
    device.actualMinutes >= device.estimatedMinutes;
  
  console.log('🕒 [TIME_CHECK]:', {
    actualMinutes: device.actualMinutes,
    estimatedMinutes: device.estimatedMinutes,
    autoShutdownEnabled: device.autoShutdownEnabled,
    autoShutdownType: typeof device.autoShutdownEnabled,
    isTimeUp,
    canStillOperate: !isTimeUp
  });

  if (device.relayOn) {
    // 🔍 DEBUG CRÍTICO: Log de decisión de color
    console.log('🔍 [COLOR_DECISION]:', {
      relayOn: device.relayOn,
      currentPower: device.currentPower,
      threshold,
      isConsuming,
      status: device.status,
      decision: isConsuming && device.status !== 'in_use_this_appointment' ? 'ROJO (no autorizado)' :
                !isConsuming && device.status !== 'in_use_this_appointment' ? 'SIN MARCO (stand-by)' :
                isConsuming ? 'VERDE (consumiendo asignado)' : 'NARANJA (sin consumo asignado)'
    });
    
    // 🔴 ROJO: Relay ON + consumiendo + SIN asignación (uso no autorizado)
    if (isConsuming && device.status !== 'in_use_this_appointment') {
      console.log('🔴 [ROJO] Uso no autorizado detectado');
      return '!ring-2 !ring-red-400';
    }
    
    // ⚠️ CASO NUEVO: Encendido SIN consumo Y SIN asignación = SIN MARCO (stand-by)
    if (!isConsuming && device.status !== 'in_use_this_appointment') {
      console.log('⚪ [SIN MARCO] Stand-by no asignado');
      return ''; // Sin marco - dispositivo en stand-by no asignado
    }
    
    if (isConsuming) {
      if (isTimeUp) {
        // 🟣 PÚRPURA: Relay ON + consumiendo + tiempo agotado
        console.log('🟣 [PÚRPURA] Consumiendo pero tiempo agotado');
        return '!ring-2 !ring-purple-400';
      } else {
        // 🟢 VERDE: Relay ON + consumiendo + dentro del tiempo + asignado a esta cita
        console.log('🟢 [VERDE] Consumiendo asignado a esta cita');
        return '!ring-2 !ring-green-400';
      }
    } else {
      if (isTimeUp) {
        // ⚫ GRIS: Relay ON + sin consumo + tiempo agotado = BLOQUEADO
        console.log('⚫ [GRIS] Tiempo agotado - dispositivo bloqueado');
        return ''; // Sin marco porque está bloqueado
      } else {
        // 🟠 NARANJA: Relay ON + sin consumo + asignado a esta cita + tiempo disponible
        console.log('🟠 [NARANJA] Sin consumo asignado a esta cita', {
          relayOn: device.relayOn,
          currentPower: device.currentPower,
          threshold,
          isConsuming,
          status: device.status,
          timeRemaining: device.estimatedMinutes ? device.estimatedMinutes - (device.actualMinutes || 0) : 'N/A'
        });
        return '!ring-2 !ring-orange-400';
      }
    }
  } else {
    // 🔵 AZUL: Stand-by (sin datos de tiempo) - SIN MARCO
    return '';
  }
} 