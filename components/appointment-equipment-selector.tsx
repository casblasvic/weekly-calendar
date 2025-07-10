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

interface AppointmentEquipmentSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  appointmentClientName?: string;
  onStartWithoutEquipment?: () => void;
}

export function AppointmentEquipmentSelector({
  open,
  onOpenChange,
  appointmentId,
  appointmentClientName,
  onStartWithoutEquipment
}: AppointmentEquipmentSelectorProps) {
  
  // 🔍 LOG BÁSICO: Verificar si este componente se ejecuta
  console.log('🔍 [APPOINTMENT EQUIPMENT SELECTOR] Componente montado/actualizado');
  const [controllingDevices, setControllingDevices] = useState<Set<string>>(new Set());

  // 🔥 USAR HOOK EN TIEMPO REAL - igual que el menú flotante
  const equipmentData = useServiceEquipmentRequirements({
    appointmentId,
    enabled: true // Siempre activo para recibir tiempo real
  });

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

  // 🎨 FUNCIÓN PARA OBTENER ESTILOS DE BOTÓN POWER
  const getPowerButtonStyle = (device: any) => {
    if (!device.online) {
      return {
        className: "bg-gray-400 hover:bg-gray-500 cursor-not-allowed",
        disabled: true,
        text: "Offline"
      };
    }
    
    if (device.status === 'in_use_this_appointment') {
      return {
        className: "bg-green-600 hover:bg-green-700 text-white",
        disabled: false,
        text: device.relayOn ? "Encendido (Esta Cita)" : "Apagado (Esta Cita)"
      };
    }
    
    if (device.status === 'occupied') {
      return {
        className: "bg-red-500 hover:bg-red-600 cursor-not-allowed text-white",
        disabled: true,
        text: "En Uso"
      };
    }
    
    // available
    return {
      className: device.relayOn 
        ? "bg-green-600 hover:bg-green-700 text-white" 
        : "bg-blue-600 hover:bg-blue-700 text-white",
      disabled: false,
      text: device.relayOn ? "Encendido" : "Disponible"
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
                  
                  return (
                    <div
                      key={device.id}
                      className="p-4 bg-white rounded-lg border transition-all hover:shadow-md"
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
                            disabled={powerButtonStyle.disabled || isControlling}
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
                          device.status === 'in_use_this_appointment' && "text-green-600"
                        )}>
                          {powerButtonStyle.text}
                        </span>
                      </div>
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