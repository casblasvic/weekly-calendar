/**
 * ========================================
 * PLUGIN SHELLY - MODAL DE EDICIÓN DE DISPOSITIVOS
 * ========================================
 * 
 * 🔌 INTEGRACIÓN SHELLY CLOUD
 * Este componente permite editar dispositivos Shelly a través de Shelly Cloud API.
 * NO utiliza conexiones directas a las IPs locales de los dispositivos.
 * 
 * 📡 CONFIGURACIÓN DE CONEXIÓN:
 * - Host API: Se obtiene del campo `apiHost` en la tabla `ShellyCredential`
 * - URL Base: Almacenada en `ShellyCredential.apiHost` (ej: "shelly-103-eu.shelly.cloud")
 * - Autenticación: Tokens OAuth2 almacenados en `ShellyCredential.accessToken`
 * 
 * 🆔 MAPEO AUTOMÁTICO DE DISPOSITIVOS:
 * - deviceId (BD): ID interno almacenado en `SmartPlugDevice.deviceId`
 * - cloudId: ID numérico de Shelly Cloud (NO almacenado en BD)
 * - El mapeo se construye automáticamente desde eventos WebSocket
 * - Ejemplo: deviceId "b0b21c12dd94" → cloudId "194279021665684"
 * 
 * 🏗️ FUNCIONALIDADES DEL MODAL:
 * 1. Control básico: Encender/Apagar con actualización optimista
 * 2. Configuración: Nombre, zona horaria, WiFi
 * 3. Timers: Auto-encendido, auto-apagado
 * 4. Estado: Información en tiempo real del dispositivo
 * 5. Sincronización: Botón para refrescar datos
 * 
 * 📊 TABLAS UTILIZADAS:
 * - `SmartPlugDevice`: Dispositivos vinculados (deviceId, credentialId, datos)
 * - `ShellyCredential`: Credenciales OAuth2 y apiHost
 * 
 * ⚡ ENDPOINTS UTILIZADOS:
 * - /api/shelly/device/{deviceId}/control - Control encender/apagar
 * - /api/shelly/device/{deviceId}/status - Estado actual
 * - /api/shelly/device/{deviceId}/config - Configuración
 * - /api/shelly/device/{deviceId}/sync - Resincronización
 * 
 * 🎯 CARACTERÍSTICAS:
 * - Actualización optimista para respuesta rápida
 * - Detección automática de generación del dispositivo
 * - Configuración específica por generación (Gen1, Gen2, Gen3)
 * - Manejo robusto de errores con fallbacks
 * 
 * 🔄 FLUJO DE CONTROL:
 * 1. Usuario hace clic en encender/apagar
 * 2. UI se actualiza inmediatamente (optimista)
 * 3. Se envía comando via WebSocket a Shelly Cloud
 * 4. Si falla, se revierte el cambio optimista
 * 5. Si éxito, se mantiene el nuevo estado
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Wifi, Zap, Shield, Power, Palette, Activity, RefreshCw } from 'lucide-react';
import { SmartPlugDevice, ShellyCredential } from '@prisma/client';
import { UnifiedDeviceStatus } from '@/lib/shelly';
import { useToast } from '@/components/ui/use-toast';

interface DeviceEditModalProps {
  device: SmartPlugDevice & { credential: ShellyCredential | null };
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedDevice: Partial<SmartPlugDevice>) => Promise<void>;
}

// Interfaces para tipos de status del dispositivo
interface ShellyPowerStatus {
  current: number;
  voltage: number;
  total: number;
  temperature?: number;
  current_amps?: number;
}

interface ShellyWifiStatus {
  ssid: string;
  rssi: number;
  connected: boolean;
  ip?: string;
}

interface ShellyRelayStatus {
  isOn: boolean;
}

interface ShellyDeviceStatus {
  power: ShellyPowerStatus;
  wifi: ShellyWifiStatus;
  relay: ShellyRelayStatus;
}

export function DeviceEditModal({ device, isOpen, onClose, onSave }: DeviceEditModalProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const { toast } = useToast();
  
  const [statusLoading, setStatusLoading] = useState(false);
  const [updatingFirmware, setUpdatingFirmware] = useState(false);
  const [status, setStatus] = useState<ShellyDeviceStatus | null>(null);
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [timezones, setTimezones] = useState<{ value: string; label: string }[]>([]);

  const [formData, setFormData] = useState({
    name: device.name,
    // WiFi
    wifiSsid: device.wifiSsid || '',
    wifiPassword: '',
    wifiBackupSsid: device.wifiBackupSsid || '',
    wifiBackupPassword: '',
    wifiBackupEnabled: device.wifiBackupEnabled || false,
    apModeEnabled: device.apModeEnabled || false,
    // Protección
    autoOffEnabled: device.autoOffEnabled || false,
    autoOffDelay: device.autoOffDelay || 900, // 15 minutos por defecto
    autoOnEnabled: false,
    autoOnDelay: 0,
    powerLimit: device.powerLimit || 0,
    // Arranque
    initialState: 'off' as 'off' | 'on' | 'restore_last',
    // LED (Gen 3)
    ledMode: (device.ledColorMode || 'switch') as 'off' | 'power' | 'switch' | 'color',
    ledOnColor: { 
      r: device.ledColorR || 0, 
      g: device.ledColorG || 100, 
      b: device.ledColorB || 0 
    },
    ledOffColor: { r: 100, g: 0, b: 0 },
    ledBrightness: device.ledBrightness || 50,
    nightModeEnabled: device.ledNightMode || false,
    nightModeStart: '22:00',
    nightModeEnd: '07:00',
    // Zona horaria y actualizaciones
    timezone: device.timezone || 'Europe/Madrid',
    autoUpdateEnabled: device.autoUpdate !== false, // Default true si no está definido
  });

  const fetchAvailableTimezones = useCallback(async () => {
    try {
      const response = await fetch('/api/countries');
      if (response.ok) {
        const countries = await response.json();
        // Crear un set único de zonas horarias
        const uniqueTimezones = new Set<string>();
        countries.forEach((country: any) => {
          if (country.timezone) {
            uniqueTimezones.add(country.timezone);
          }
        });
        
        // Convertir a array y ordenar
        const timezoneList = Array.from(uniqueTimezones)
          .sort()
          .map(tz => ({
            value: tz,
            label: tz
          }));
        
        setTimezones(timezoneList);
      }
    } catch (error) {
      console.error('Error obteniendo zonas horarias:', error);
      // Fallback mínimo si falla
      setTimezones([
        { value: 'UTC', label: 'UTC' },
        { value: 'Europe/Madrid', label: 'Europe/Madrid' }
      ]);
    }
  }, []);

  const loadTimezones = useCallback(async () => {
    // Lista básica de zonas horarias comunes
    const commonTimezones = [
      { value: 'Europe/Madrid', label: 'Madrid (GMT+1)' },
      { value: 'Europe/London', label: 'Londres (GMT+0)' },
      { value: 'Europe/Paris', label: 'París (GMT+1)' },
      { value: 'Europe/Berlin', label: 'Berlín (GMT+1)' },
      { value: 'Europe/Rome', label: 'Roma (GMT+1)' },
      { value: 'America/New_York', label: 'Nueva York (GMT-5)' },
      { value: 'America/Los_Angeles', label: 'Los Ángeles (GMT-8)' },
      { value: 'Asia/Tokyo', label: 'Tokio (GMT+9)' },
      { value: 'UTC', label: 'UTC (GMT+0)' }
    ];
    setTimezones(commonTimezones);
  }, []);

  const loadDeviceStatus = useCallback(async () => {
    if (!device.credential) return;
    
    setStatusLoading(true);
    try {
      // 🎯 CARGAR ESTADO REAL DEL DISPOSITIVO
      const response = await fetch(`/api/shelly/device/${device.deviceId}/status`);
      if (response.ok) {
        const deviceStatus = await response.json();
        setStatus(deviceStatus);
        
        // 🎯 CARGAR CONFIGURACIÓN ACTUAL DEL DISPOSITIVO
        const configResponse = await fetch(`/api/shelly/device/${device.deviceId}/config`);
        if (configResponse.ok) {
          const config = await configResponse.json();
          
          // Actualizar formData con la configuración real del dispositivo
          setFormData(prev => ({
            ...prev,
            timezone: config.timezone || device.timezone || 'Europe/Madrid',
            autoUpdateEnabled: config.autoUpdate !== false,
            wifiSsid: config.wifi?.sta?.ssid || device.wifiSsid || '',
            wifiBackupEnabled: config.wifi?.sta1?.enable || device.wifiBackupEnabled || false,
            wifiBackupSsid: config.wifi?.sta1?.ssid || device.wifiBackupSsid || '',
            apModeEnabled: config.wifi?.ap?.enable || device.apModeEnabled || false,
            autoOffEnabled: config.switch?.auto_off || device.autoOffEnabled || false,
            autoOffDelay: config.switch?.auto_off_delay || device.autoOffDelay || 900,
            powerLimit: config.switch?.power_limit || device.powerLimit || 0,
            initialState: config.switch?.initial_state || 'off',
            // LED para Gen 3
            ...(device.generation === '3' && {
              ledMode: config.plugs_ui?.led?.mode || device.ledColorMode || 'switch',
              ledBrightness: config.plugs_ui?.led?.brightness || device.ledBrightness || 50,
              ledOnColor: {
                r: config.plugs_ui?.led?.colors?.on?.rgb?.[0] || device.ledColorR || 0,
                g: config.plugs_ui?.led?.colors?.on?.rgb?.[1] || device.ledColorG || 100,
                b: config.plugs_ui?.led?.colors?.on?.rgb?.[2] || device.ledColorB || 0
              },
              nightModeEnabled: config.plugs_ui?.led?.night_mode?.enable || device.ledNightMode || false
            })
          }));
        }
      }
    } catch (error) {
      console.error('Error cargando estado del dispositivo:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el estado del dispositivo",
        variant: "destructive"
      });
    } finally {
      setStatusLoading(false);
    }
  }, [device.credential, device.deviceId, device.timezone, device.wifiSsid, device.wifiBackupEnabled, device.wifiBackupSsid, device.apModeEnabled, device.autoOffEnabled, device.autoOffDelay, device.powerLimit, device.generation, device.ledColorMode, device.ledBrightness, device.ledColorR, device.ledColorG, device.ledColorB, device.ledNightMode, toast]);

  const loadUpdateInfo = useCallback(async () => {
    if (!device.credential) return;
    
    try {
      const response = await fetch(`/api/shelly/device/${device.deviceId}/update-info`);
      if (response.ok) {
        const info = await response.json();
        setUpdateInfo(info);
      }
    } catch (error) {
      console.log('Info: No se pudo obtener información de actualización:', error);
    }
  }, [device.credential, device.deviceId]);

  // 🎯 CARGAR DATOS INICIALES AL ABRIR EL MODAL
  useEffect(() => {
    if (isOpen && device) {
      fetchAvailableTimezones();
      loadTimezones();
      loadDeviceStatus();
      loadUpdateInfo();
    }
  }, [isOpen, device, fetchAvailableTimezones, loadTimezones, loadDeviceStatus, loadUpdateInfo]);

  const handleSave = async () => {
    setLoading(true);
    try {
      // 1. Actualizar en la BD local
      const updateResponse = await fetch(`/api/internal/smart-plug-devices/${device.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          timezone: formData.timezone,
          autoUpdate: formData.autoUpdateEnabled,
          wifiBackupEnabled: formData.wifiBackupEnabled,
          wifiBackupSsid: formData.wifiBackupSsid,
          apModeEnabled: formData.apModeEnabled,
          autoOffEnabled: formData.autoOffEnabled,
          autoOffDelay: formData.autoOffDelay,
          powerLimit: formData.powerLimit,
          ledBrightness: formData.ledBrightness,
          ledColorMode: formData.ledMode,
          ledColorR: formData.ledOnColor.r,
          ledColorG: formData.ledOnColor.g,
          ledColorB: formData.ledOnColor.b,
          ledNightMode: formData.nightModeEnabled
        })
      });

      if (!updateResponse.ok) {
        throw new Error('Error actualizando dispositivo en BD');
      }

      // 2. Aplicar configuraciones al dispositivo físico
      const configPromises = [];

      // Cambiar nombre en el dispositivo
      if (formData.name !== device.name) {
        configPromises.push(
          fetch(`/api/shelly/device/${device.deviceId}/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              endpoint: 'device/set/name',
              params: { name: formData.name }
            })
          })
        );
      }

      // Configurar zona horaria
      if (formData.timezone) {
        configPromises.push(
          fetch(`/api/shelly/device/${device.deviceId}/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              endpoint: 'Sys.SetConfig',
              params: {
                config: {
                  location: { tz: formData.timezone }
                }
              }
            })
          })
        );
      }

      // Configurar WiFi principal
      if (formData.wifiSsid && formData.wifiPassword) {
        configPromises.push(
          fetch(`/api/shelly/device/${device.deviceId}/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              endpoint: 'WiFi.SetConfig',
              params: {
                config: {
                  sta: {
                    ssid: formData.wifiSsid,
                    pass: formData.wifiPassword,
                    enable: true
                  }
                }
              }
            })
          })
        );
      }

      // Configurar WiFi de respaldo
      if (formData.wifiBackupEnabled && formData.wifiBackupSsid && formData.wifiBackupPassword) {
        configPromises.push(
          fetch(`/api/shelly/device/${device.deviceId}/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              endpoint: 'WiFi.SetConfig',
              params: {
                config: {
                  sta1: {
                    ssid: formData.wifiBackupSsid,
                    pass: formData.wifiBackupPassword,
                    enable: true
                  }
                }
              }
            })
          })
        );
      }

      // Configurar modo AP
      if (formData.apModeEnabled !== (device as any).apModeEnabled) {
        configPromises.push(
          fetch(`/api/shelly/device/${device.deviceId}/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              endpoint: 'WiFi.SetConfig',
              params: {
                config: {
                  ap: { enable: formData.apModeEnabled }
                }
              }
            })
          })
        );
      }

      // Configurar auto-apagado
      if (formData.autoOffEnabled) {
        configPromises.push(
          fetch(`/api/shelly/device/${device.deviceId}/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              endpoint: device.generation === 'G1' ? 'settings/relay/0' : 'Switch.SetConfig',
              params: device.generation === 'G1' 
                ? { auto_off: true, auto_off_delay: formData.autoOffDelay }
                : {
                    id: 0,
                    config: {
                      auto_off: true,
                      auto_off_delay: formData.autoOffDelay
                    }
                  }
            })
          })
        );
      }

      // Configurar límite de potencia
      if (formData.powerLimit && device.generation !== 'G1') {
        configPromises.push(
          fetch(`/api/shelly/device/${device.deviceId}/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              endpoint: 'Switch.SetConfig',
              params: {
                id: 0,
                config: {
                  power_limit: formData.powerLimit
                }
              }
            })
          })
        );
      }

      // Configurar LED (solo Gen3)
      if (device.generation === 'G3' || device.modelCode?.includes('S3PL')) {
        const ledConfig: any = {
          brightness: formData.ledBrightness
        };

        if (formData.ledMode === 'color') {
          ledConfig.colors = {
            'switch:0': {
              on: {
                rgb: [formData.ledOnColor.r, formData.ledOnColor.g, formData.ledOnColor.b],
                brightness: formData.ledBrightness
              },
              off: {
                rgb: [0, 0, 0],
                brightness: 0
              }
            }
          };
        }

        if (formData.nightModeEnabled) {
          ledConfig.night_mode = {
            enable: true,
            brightness: 10
          };
        }

        configPromises.push(
          fetch(`/api/shelly/device/${device.deviceId}/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              endpoint: 'PLUGS_UI.SetConfig',
              params: { config: ledConfig }
            })
          })
        );
      }

      // Ejecutar todas las configuraciones
      const results = await Promise.allSettled(configPromises);
      
      // Verificar si hubo errores
      const errors = results.filter(r => r.status === 'rejected');
      if (errors.length > 0) {
        console.error('Algunos cambios no se aplicaron:', errors);
        toast({
          title: "Advertencia",
          description: "Algunos cambios no se pudieron aplicar al dispositivo",
          variant: "default"
        });
      }

      toast({
        title: "Cambios guardados",
        description: "La configuración se ha actualizado correctamente"
      });
      
      onClose();
    } catch (error) {
      console.error('Error guardando cambios:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDevice = async () => {
    if (!device.credential) return;
    
    setStatusLoading(true);
    
    // 🚀 ACTUALIZACIÓN OPTIMISTA - Cambiar estado inmediatamente
    const newRelayState = !status?.relay.isOn;
    setStatus(prev => prev ? {
      ...prev,
      relay: { ...prev.relay, isOn: newRelayState }
    } : null);
    
    try {
      // 🎯 USAR WEBSOCKET COMMAND EN LUGAR DE DEVICE CLIENT
      const action = newRelayState ? 'on' : 'off';
      
      const response = await fetch(`/api/shelly/device/${device.deviceId}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (!response.ok) {
        // 🔄 REVERTIR CAMBIO OPTIMISTA EN CASO DE ERROR
        setStatus(prev => prev ? {
          ...prev,
          relay: { ...prev.relay, isOn: !newRelayState }
        } : null);
        
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al controlar dispositivo');
      }

      toast({
        title: "Comando enviado",
        description: `Dispositivo ${action === 'on' ? 'encendido' : 'apagado'} correctamente`,
      });

      // Recargar estado después de un momento para confirmar
      setTimeout(() => {
        loadDeviceStatus();
      }, 2000);

    } catch (error) {
      console.error('Error al controlar dispositivo:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al controlar dispositivo",
        variant: "destructive",
      });
    } finally {
      setStatusLoading(false);
    }
  };

  const handleResetEnergy = async () => {
    if (!device.credential) return;
    
    setLoading(true);
    try {
      // 🎯 USAR ENDPOINT API EN LUGAR DE DEVICE CLIENT
      const response = await fetch(`/api/shelly/device/${device.deviceId}/reset-energy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al resetear contadores');
      }

      await loadDeviceStatus();
      toast({
        title: 'Contadores reseteados',
        description: 'Los contadores de energía se han reiniciado',
      });
    } catch (error) {
      console.error('Error al resetear contadores:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo resetear los contadores',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFirmware = async () => {
    if (!device.credential || !updateInfo?.available) return;
    
    setUpdatingFirmware(true);
    try {
      // 🎯 USAR ENDPOINT API EN LUGAR DE DEVICE CLIENT
      const response = await fetch(`/api/shelly/device/${device.deviceId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar firmware');
      }

      toast({
        title: 'Actualización iniciada',
        description: 'El dispositivo se reiniciará al completar la actualización',
      });
    } catch (error) {
      console.error('Error al actualizar firmware:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo iniciar la actualización',
        variant: 'destructive',
      });
    } finally {
      setUpdatingFirmware(false);
    }
  };

  const handleSyncDevice = async () => {
    if (!device.credential) return;
    
    setSyncLoading(true);
    try {
      const response = await fetch(`/api/shelly/device/${device.deviceId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al resincronizar dispositivo');
      }

      if (result.success) {
        toast({
          title: "Dispositivo resincronizado",
          description: `Se actualizaron ${result.updatedFields?.length || 0} campos correctamente`,
        });

        // Recargar el estado del dispositivo
        await loadDeviceStatus();
      } else {
        toast({
          title: "Advertencia",
          description: result.message || "El dispositivo se marcó como offline",
          variant: "default"
        });
      }
      
    } catch (error) {
      console.error('Error al resincronizar dispositivo:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Error al resincronizar dispositivo',
        variant: "destructive"
      });
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configuración del Enchufe</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="basic">Básico</TabsTrigger>
            <TabsTrigger value="energy">Energía</TabsTrigger>
            <TabsTrigger value="network">Red</TabsTrigger>
            <TabsTrigger value="protection">Protección</TabsTrigger>
            <TabsTrigger value="startup">Arranque</TabsTrigger>
            {device.generation === '3' && (
              <TabsTrigger value="led">LED</TabsTrigger>
            )}
          </TabsList>

          {/* Sección Básico */}
          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Información Básica</CardTitle>
                <CardDescription>
                  Nombre y control del dispositivo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del dispositivo</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Zona horaria</Label>
                  <Select
                    value={formData.timezone}
                    onValueChange={(value) => setFormData({ ...formData, timezone: value })}
                  >
                    <SelectTrigger id="timezone">
                      <SelectValue placeholder="Selecciona zona horaria..." />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map(tz => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Zona horaria configurada en el dispositivo
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">Estado del enchufe</p>
                    <div className="flex items-center gap-2">
                      {statusLoading ? (
                        <Badge variant="secondary">
                          <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                          Cargando...
                        </Badge>
                      ) : status?.relay.isOn ? (
                        <Badge variant="default" className="bg-green-500">
                          <Power className="w-3 h-3 mr-1" />
                          Encendido
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Power className="w-3 h-3 mr-1" />
                          Apagado
                        </Badge>
                      )}
                      {device.online ? (
                        <Badge variant="outline" className="text-green-600">
                          Online
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600">
                          Offline
                        </Badge>
                      )}
                    </div>
                    {status && (
                      <div className="text-sm text-muted-foreground">
                        {status.power?.current > 0 && (
                          <span>💡 {status.power.current}W • </span>
                        )}
                        {status.power?.voltage && (
                          <span>⚡ {status.power.voltage}V • </span>
                        )}
                        {status.power?.temperature && (
                          <span>🌡️ {status.power.temperature}°C</span>
                        )}
                      </div>
                    )}
                  </div>
                  {device.online && (
                    <div className="flex gap-2">
                      <Button
                        variant={status?.relay.isOn ? "destructive" : "default"}
                        size="sm"
                        onClick={handleToggleDevice}
                        disabled={statusLoading}
                      >
                        {statusLoading ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : status?.relay.isOn ? (
                          <>
                            <Power className="w-4 h-4 mr-1" />
                            Apagar
                          </>
                        ) : (
                          <>
                            <Power className="w-4 h-4 mr-1" />
                            Encender
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSyncDevice}
                        disabled={syncLoading}
                        title="Resincronizar datos del dispositivo"
                      >
                        {syncLoading ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Modelo</p>
                    <p className="font-medium">{device.modelCode || 'Desconocido'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Generación</p>
                    <p className="font-medium">Gen {device.generation}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Firmware</p>
                    <p className="font-medium">{device.firmwareVersion || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">MAC</p>
                    <p className="font-medium font-mono text-xs">{device.macAddress || 'N/A'}</p>
                  </div>
                </div>

                {/* Sección de actualización de firmware */}
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="auto-update">Actualizaciones automáticas</Label>
                      <p className="text-sm text-muted-foreground">
                        Instalar actualizaciones de firmware automáticamente
                      </p>
                    </div>
                    <Switch
                      id="auto-update"
                      checked={formData.autoUpdateEnabled}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, autoUpdateEnabled: checked })
                      }
                    />
                  </div>

                  {updateInfo && (
                    <div className="p-4 border rounded-lg bg-muted/50">
                      {updateInfo.available ? (
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                            <div className="flex-1">
                              <p className="font-medium">Nueva actualización disponible</p>
                              <p className="text-sm text-muted-foreground">
                                Versión {updateInfo.version} está lista para instalar
                              </p>
                            </div>
                          </div>
                          <Button
                            onClick={handleUpdateFirmware}
                            disabled={updatingFirmware}
                            className="w-full"
                          >
                            {updatingFirmware ? (
                              <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                Actualizando...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Actualizar ahora
                              </>
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <Activity className="w-5 h-5 text-green-500" />
                          <div>
                            <p className="font-medium">Firmware actualizado</p>
                            <p className="text-sm text-muted-foreground">
                              No hay actualizaciones disponibles
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sección Energía */}
          <TabsContent value="energy" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Consumo Energético</CardTitle>
                <CardDescription>
                  Monitoreo de potencia y energía
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Potencia actual</p>
                          <p className="text-2xl font-bold">
                            {status?.power.current.toFixed(1)} W
                          </p>
                        </div>
                        <Zap className="h-8 w-8 text-yellow-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Energía total</p>
                          <p className="text-2xl font-bold">
                            {status?.power.total.toFixed(2)} kWh
                          </p>
                        </div>
                        <Activity className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {status?.power.voltage && (
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Voltaje</p>
                      <p className="font-medium">{status.power.voltage.toFixed(1)} V</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Corriente</p>
                      <p className="font-medium">{status.power.current_amps?.toFixed(2) || 0} A</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Temperatura</p>
                      <p className="font-medium">{status.power.temperature?.toFixed(1) || 'N/A'} °C</p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={handleResetEnergy}
                    disabled={loading}
                  >
                    Resetear contadores
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sección Red */}
          <TabsContent value="network" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuración de Red</CardTitle>
                <CardDescription>
                  WiFi principal y de respaldo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <h4 className="font-medium">WiFi Principal</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="wifi-ssid">SSID</Label>
                      <Input
                        id="wifi-ssid"
                        placeholder="Nombre de la red WiFi"
                        value={formData.wifiSsid}
                        onChange={(e) => setFormData({ ...formData, wifiSsid: e.target.value })}
                        autoComplete="off"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wifi-pass">Contraseña</Label>
                      <Input
                        id="wifi-pass"
                        type="password"
                        placeholder="Contraseña WiFi"
                        value={formData.wifiPassword}
                        onChange={(e) => setFormData({ ...formData, wifiPassword: e.target.value })}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">WiFi de Respaldo</h4>
                    <Switch
                      checked={formData.wifiBackupEnabled}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, wifiBackupEnabled: checked })
                      }
                    />
                  </div>
                  {formData.wifiBackupEnabled && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="wifi-backup-ssid">SSID</Label>
                        <Input
                          id="wifi-backup-ssid"
                          placeholder="Red de respaldo"
                          value={formData.wifiBackupSsid}
                          onChange={(e) => setFormData({ ...formData, wifiBackupSsid: e.target.value })}
                          autoComplete="off"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="wifi-backup-pass">Contraseña</Label>
                        <Input
                          id="wifi-backup-pass"
                          type="password"
                          placeholder="Contraseña respaldo"
                          value={formData.wifiBackupPassword}
                          onChange={(e) => setFormData({ ...formData, wifiBackupPassword: e.target.value })}
                          autoComplete="new-password"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="ap-mode">Modo punto de acceso (AP)</Label>
                      <p className="text-sm text-muted-foreground">
                        El dispositivo actúa como router WiFi
                      </p>
                    </div>
                    <Switch
                      id="ap-mode"
                      checked={formData.apModeEnabled}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, apModeEnabled: checked })
                      }
                    />
                  </div>
                  {formData.apModeEnabled && (
                    <p className="text-sm text-yellow-600">
                      <AlertCircle className="inline w-4 h-4 mr-1" />
                      En modo AP, el dispositivo no se conectará a internet
                    </p>
                  )}
                </div>

                {status?.wifi && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Estado actual</p>
                          <p className="font-medium">{status.wifi.ssid || 'No conectado'}</p>
                          <p className="text-sm text-muted-foreground">
                            IP: {status.wifi.ip || 'N/A'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Señal</p>
                          <p className="font-medium">{status.wifi.rssi || 0} dBm</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sección Protección */}
          <TabsContent value="protection" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Protección y Temporizadores</CardTitle>
                <CardDescription>
                  Configuración de seguridad y automatización
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="auto-off">Auto-apagado</Label>
                      <p className="text-sm text-muted-foreground">
                        Apagar automáticamente después de un tiempo
                      </p>
                    </div>
                    <Switch
                      id="auto-off"
                      checked={formData.autoOffEnabled}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, autoOffEnabled: checked })
                      }
                    />
                  </div>
                  {formData.autoOffEnabled && (
                    <div className="space-y-2 pl-4">
                      <Label>Tiempo de auto-apagado (segundos)</Label>
                      <div className="flex items-center gap-4">
                        <Slider
                          value={[formData.autoOffDelay]}
                          onValueChange={([value]) => 
                            setFormData({ ...formData, autoOffDelay: value })
                          }
                          min={60}
                          max={3600}
                          step={60}
                          className="flex-1"
                        />
                        <span className="w-20 text-right">
                          {Math.floor(formData.autoOffDelay / 60)} min
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="auto-on">Auto-encendido</Label>
                      <p className="text-sm text-muted-foreground">
                        Encender automáticamente después de apagarse
                      </p>
                    </div>
                    <Switch
                      id="auto-on"
                      checked={formData.autoOnEnabled}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, autoOnEnabled: checked })
                      }
                    />
                  </div>
                  {formData.autoOnEnabled && (
                    <div className="space-y-2 pl-4">
                      <Label>Tiempo de auto-encendido (segundos)</Label>
                      <div className="flex items-center gap-4">
                        <Slider
                          value={[formData.autoOnDelay]}
                          onValueChange={([value]) => 
                            setFormData({ ...formData, autoOnDelay: value })
                          }
                          min={60}
                          max={3600}
                          step={60}
                          className="flex-1"
                        />
                        <span className="w-20 text-right">
                          {Math.floor(formData.autoOnDelay / 60)} min
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="power-limit">Límite de potencia (W)</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="power-limit"
                      type="number"
                      value={formData.powerLimit}
                      onChange={(e) => 
                        setFormData({ ...formData, powerLimit: parseInt(e.target.value) || 0 })
                      }
                      min={0}
                      max={3680}
                      step={10}
                    />
                    <p className="text-sm text-muted-foreground">
                      0 = sin límite
                    </p>
                  </div>
                  {formData.powerLimit > 0 && (
                    <p className="text-sm text-yellow-600">
                      <AlertCircle className="inline w-4 h-4 mr-1" />
                      El dispositivo se apagará si supera {formData.powerLimit}W
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sección Arranque */}
          <TabsContent value="startup" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Comportamiento al Arranque</CardTitle>
                <CardDescription>
                  Qué hacer cuando vuelve la energía
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="initial-state">Estado inicial</Label>
                  <Select
                    value={formData.initialState}
                    onValueChange={(value: any) => 
                      setFormData({ ...formData, initialState: value })
                    }
                  >
                    <SelectTrigger id="initial-state">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="off">Siempre apagado</SelectItem>
                      <SelectItem value="on">Siempre encendido</SelectItem>
                      <SelectItem value="restore_last">Restaurar último estado</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Define el estado del enchufe cuando se restablece la alimentación
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sección LED (solo Gen 3) */}
          {device.generation === '3' && (
            <TabsContent value="led" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Configuración del LED</CardTitle>
                  <CardDescription>
                    Control del anillo LED multicolor
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="led-mode">Modo del LED</Label>
                    <Select
                      value={formData.ledMode}
                      onValueChange={(value: any) => 
                        setFormData({ ...formData, ledMode: value })
                      }
                    >
                      <SelectTrigger id="led-mode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="off">Apagado</SelectItem>
                        <SelectItem value="switch">Indicador de estado</SelectItem>
                        <SelectItem value="power">Indicador de potencia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.ledMode === 'switch' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Color encendido</Label>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              placeholder="R"
                              min={0}
                              max={100}
                              value={formData.ledOnColor.r}
                              onChange={(e) => setFormData({
                                ...formData,
                                ledOnColor: { ...formData.ledOnColor, r: parseInt(e.target.value) || 0 }
                              })}
                              className="w-20"
                            />
                            <Input
                              type="number"
                              placeholder="G"
                              min={0}
                              max={100}
                              value={formData.ledOnColor.g}
                              onChange={(e) => setFormData({
                                ...formData,
                                ledOnColor: { ...formData.ledOnColor, g: parseInt(e.target.value) || 0 }
                              })}
                              className="w-20"
                            />
                            <Input
                              type="number"
                              placeholder="B"
                              min={0}
                              max={100}
                              value={formData.ledOnColor.b}
                              onChange={(e) => setFormData({
                                ...formData,
                                ledOnColor: { ...formData.ledOnColor, b: parseInt(e.target.value) || 0 }
                              })}
                              className="w-20"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Color apagado</Label>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              placeholder="R"
                              min={0}
                              max={100}
                              value={formData.ledOffColor.r}
                              onChange={(e) => setFormData({
                                ...formData,
                                ledOffColor: { ...formData.ledOffColor, r: parseInt(e.target.value) || 0 }
                              })}
                              className="w-20"
                            />
                            <Input
                              type="number"
                              placeholder="G"
                              min={0}
                              max={100}
                              value={formData.ledOffColor.g}
                              onChange={(e) => setFormData({
                                ...formData,
                                ledOffColor: { ...formData.ledOffColor, g: parseInt(e.target.value) || 0 }
                              })}
                              className="w-20"
                            />
                            <Input
                              type="number"
                              placeholder="B"
                              min={0}
                              max={100}
                              value={formData.ledOffColor.b}
                              onChange={(e) => setFormData({
                                ...formData,
                                ledOffColor: { ...formData.ledOffColor, b: parseInt(e.target.value) || 0 }
                              })}
                              className="w-20"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Brillo del LED</Label>
                        <div className="flex items-center gap-4">
                          <Slider
                            value={[formData.ledBrightness]}
                            onValueChange={([value]) => 
                              setFormData({ ...formData, ledBrightness: value })
                            }
                            min={0}
                            max={100}
                            step={5}
                            className="flex-1"
                          />
                          <span className="w-12 text-right">{formData.ledBrightness}%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor="night-mode">Modo nocturno</Label>
                        <p className="text-sm text-muted-foreground">
                          Reducir brillo en horario nocturno
                        </p>
                      </div>
                      <Switch
                        id="night-mode"
                        checked={formData.nightModeEnabled}
                        onCheckedChange={(checked) => 
                          setFormData({ ...formData, nightModeEnabled: checked })
                        }
                      />
                    </div>
                    {formData.nightModeEnabled && (
                      <div className="grid grid-cols-2 gap-4 pl-4">
                        <div className="space-y-2">
                          <Label htmlFor="night-start">Hora inicio</Label>
                          <Input
                            id="night-start"
                            type="time"
                            value={formData.nightModeStart}
                            onChange={(e) => 
                              setFormData({ ...formData, nightModeStart: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="night-end">Hora fin</Label>
                          <Input
                            id="night-end"
                            type="time"
                            value={formData.nightModeEnd}
                            onChange={(e) => 
                              setFormData({ ...formData, nightModeEnd: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 