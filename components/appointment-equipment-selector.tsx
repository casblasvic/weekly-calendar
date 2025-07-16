'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Power, 
  Zap, 
  ZapOff, 
  Clock, 
  MapPin, 
  Users, 
  AlertTriangle,
  Play,
  Wifi,
  WifiOff,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useServiceEquipmentRequirements } from '@/hooks/use-service-equipment-requirements';
import { getDeviceColors } from '@/lib/utils/device-colors';
// ✅ ELIMINADO: import { useAppointmentTimer } from '@/hooks/use-appointment-timer';

interface AppointmentEquipmentSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  appointmentClientName?: string;
  onStartWithoutEquipment?: () => void;
  // 🆕 NUEVOS PARAMS: Datos pre-cargados del appointment
  appointmentData?: any;
}

export function AppointmentEquipmentSelector({
  open,
  onOpenChange,
  appointmentId,
  appointmentClientName,
  onStartWithoutEquipment,
  appointmentData
}: AppointmentEquipmentSelectorProps) {
  
  // 🔍 LOG BÁSICO: Verificar si este componente se ejecuta
  console.log('🔍 [APPOINTMENT EQUIPMENT SELECTOR] Componente montado/actualizado');
  const [controllingDevices, setControllingDevices] = useState<Set<string>>(new Set());

  // 🔥 OPTIMIZADO: USAR DATOS PRE-CARGADOS + FALLBACK API
  // Ahora usa appointmentData cuando está disponible, fallback a API cuando no
  const equipmentData = useServiceEquipmentRequirements({
    appointmentId,
    enabled: true, // Siempre activo para recibir tiempo real
    appointmentData: appointmentData // ⚡ Datos pre-cargados del appointment
  });

  // ✅ ELIMINADO: useAppointmentTimer 
  // Los datos de tiempo se obtienen directamente desde los datos pre-cargados cuando sea necesario

  if (!equipmentData) {
    return null; // Hook no disponible o cargando
  }

  const { availableDevices, deviceStats, isConnected, onDeviceToggle } = equipmentData;

  // 🎮 FUNCIÓN DE CONTROL INDIVIDUAL
  const handleDeviceControl = async (deviceId: string, turnOn: boolean) => {
    if (controllingDevices.has(deviceId)) return; // Ya está en proceso

    setControllingDevices(prev => new Set(prev).add(deviceId));

    try {
      await onDeviceToggle(deviceId, turnOn);
      
      toast.success(`Enchufe ${turnOn ? 'encendido' : 'apagado'}`, {
        description: availableDevices.find(d => d.deviceId === deviceId)?.name || 'Dispositivo',
        duration: 2000
      });
      
    } catch (error) {
      console.error('❌ Error controlando dispositivo:', error);
      toast.error('Error controlando enchufe', {
        description: error instanceof Error ? error.message : 'Error desconocido',
        duration: 4000
      });
    } finally {
      setControllingDevices(prev => {
        const newSet = new Set(prev);
        newSet.delete(deviceId);
        return newSet;
      });
    }
  };

  // 🎨 USAR FUNCIÓN CENTRALIZADA DE COLORES
  const getPowerButtonStyle = (device: any) => {
    // ✅ SIMPLIFICADO: Tiempo se obtiene de appointmentData cuando sea necesario
    const actualMinutes = undefined;
    const estimatedMinutes = appointmentData?.estimatedDuration;
    
    const colors = getDeviceColors({
      online: device.online,
      relayOn: device.relayOn,
      currentPower: device.currentPower,
      powerThreshold: device.powerThreshold,
      status: device.status,
      // 🆕 PASAR DATOS DE TIEMPO PARA DETECTAR BLOQUEO POR TIEMPO
      actualMinutes: actualMinutes,
      estimatedMinutes: estimatedMinutes,
      autoShutdownEnabled: device.autoShutdownEnabled // ✅ NUEVO CAMPO
    });
    
    return {
      className: colors.className!,
      disabled: colors.disabled,
      text: colors.text!
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex gap-2 items-center text-xl">
            <Power className="w-5 h-5 text-blue-600" />
            Control de Equipamiento
            {appointmentClientName && (
              <span className="text-base font-normal text-muted-foreground">
                - {appointmentClientName}
              </span>
            )}
          </DialogTitle>
          
          {/* Estado de conexión */}
          <div className="flex gap-2 items-center text-sm">
            {isConnected ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-600">Conectado en tiempo real</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-red-600">Desconectado</span>
              </>
            )}
          </div>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 space-y-6">
          {/* Resumen de Estado */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{deviceStats.available}</div>
              <div className="text-sm text-muted-foreground">Disponibles</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{deviceStats.inUseThisAppointment}</div>
              <div className="text-sm text-muted-foreground">Esta Cita</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{deviceStats.occupied}</div>
              <div className="text-sm text-muted-foreground">Ocupados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-400">{deviceStats.offline}</div>
              <div className="text-sm text-muted-foreground">Sin Conexión</div>
            </div>
          </div>

          {/* Lista de Equipos */}
          {availableDevices.length > 0 ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-800">Enchufes Inteligentes para esta Cita</h3>
              <div className="grid gap-3">
                {availableDevices.map((device) => {
                  const powerButtonStyle = getPowerButtonStyle(device);
                  const isControlling = controllingDevices.has(device.deviceId);
                  const isDeviceBlocked = powerButtonStyle.disabled; // ✅ Determinar si todo el dispositivo está bloqueado
                  
                  return (
                    <div
                      key={device.id}
                      className={cn(
                        "relative p-4 bg-white rounded-lg border transition-all", // ✅ Agregar 'relative' para el overlay
                        isDeviceBlocked 
                          ? "opacity-60 cursor-not-allowed" // 🔒 Bloqueado: sin hover, cursor not-allowed
                          : "hover:shadow-md cursor-default" // ✅ Normal: con hover
                      )}
                      style={{
                        pointerEvents: isDeviceBlocked ? 'none' : 'auto' // 🔒 Bloquear TODOS los clics
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex gap-3 items-center">
                          <div className="flex gap-2 items-center">
                            {device.online ? (
                                <Wifi className="w-4 h-4 text-green-600" />
                            ) : (
                              <WifiOff className="w-4 h-4 text-gray-400" />
                            )}
                            <span className="font-medium">{device.name}</span>
                          </div>
                          
                          <div className="flex gap-2 items-center">
                            {device.cabinName && (
                            <Badge variant="outline" className="text-xs">
                              <MapPin className="mr-1 w-3 h-3" />
                                {device.cabinName}
                            </Badge>
                          )}
                            
                            <Badge variant="outline" className="text-xs">
                              {device.equipmentName}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex gap-3 items-center">
                          {/* Información de consumo */}
                          {device.online && device.currentPower && device.currentPower > 0.1 && device.status !== 'available' && (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">{device.currentPower.toFixed(1)}W</span>
                          </div>
                          )}
                          
                          {/* BOTÓN POWER - Como en la tabla de enchufes */}
                          <Button
                            size="sm"
                            onClick={() => handleDeviceControl(device.deviceId, !device.relayOn)}
                            disabled={isDeviceBlocked || isControlling} // ✅ Usar la misma lógica de bloqueo
                            className={cn(powerButtonStyle.className, "min-w-[120px]")}
                          >
                            {isControlling ? (
                              <div className="flex gap-2 items-center">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Procesando
                              </div>
                            ) : (
                              <div className="flex gap-2 items-center">
                                <Power className="w-3 h-3" />
                                {device.relayOn ? 'Apagar' : 'Encender'}
                        </div>
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      {/* Status visual */}
                      <div className="mt-2 text-xs text-gray-500">
                        Estado: <span className={cn(
                          "font-medium",
                          device.status === 'available' && "text-blue-600",
                          device.status === 'occupied' && "text-red-600",
                          device.status === 'offline' && "text-gray-500",
                          device.status === 'in_use_this_appointment' && "text-green-600",
                          device.status === 'completed' && "text-indigo-600"
                        )}>
                          {powerButtonStyle.text}
                        </span>
                      </div>
                      
                      {/* Mensaje de servicio completado */}
                      {isDeviceBlocked && (
                        <div className="mt-1 text-xs font-medium text-indigo-600">
                          ✓ Servicio Completado
                        </div>
                      )}
                      
                      {/* Overlay visual para dispositivos bloqueados */}
                      {isDeviceBlocked && (
                        <div className="absolute inset-0 bg-indigo-50 bg-opacity-30 rounded-lg pointer-events-none" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center">
              <AlertTriangle className="mx-auto mb-4 w-16 h-16 text-gray-400" />
              <h3 className="mb-2 text-lg font-medium text-gray-700">
                No hay equipos para esta cita
              </h3>
              <p className="mb-4 text-sm text-gray-500">
                Los servicios de esta cita no requieren equipamiento específico o no hay equipos configurados.
              </p>
            </div>
          )}
        </div>

        {/* Botones de Acción */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cerrar
          </Button>
          
          {onStartWithoutEquipment && (
          <Button
            variant="outline"
            onClick={onStartWithoutEquipment}
            className="flex-1"
          >
            Iniciar Sin Equipamiento
          </Button>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 