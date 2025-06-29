"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
    Wifi, 
    Clock, 
    Zap, 
    Activity,
    Building2,
    Settings,
    Info,
    X,
    Save
} from "lucide-react";

interface DeviceConfigModalSimplifiedProps {
    device: {
        id: string;
        name: string;
        deviceId: string;
        cloudId?: string;
        deviceIp?: string;
        online: boolean;
        relayOn: boolean;
        currentPower?: number;
        voltage?: number;
        temperature?: number;
        generation?: string;
        modelCode?: string;
        firmwareVersion?: string;
        wifiSsid?: string;
        wifiRssi?: number;
        timezone?: string;
        equipmentId?: string;
        equipment?: {
            id: string;
            name: string;
            clinic?: {
                id: string;
                name: string;
            };
        };
        credential?: {
            name: string;
        };
        lastSeenAt?: string;
    };
    isOpen: boolean;
    onClose: () => void;
    onDeviceUpdate: () => void;
}

interface Clinic {
    id: string;
    name: string;
}

interface Equipment {
    id: string;
    name: string;
}

export function DeviceConfigModalSimplified({ device, isOpen, onClose, onDeviceUpdate }: DeviceConfigModalSimplifiedProps) {
    // Estados para edición local
    const [deviceName, setDeviceName] = useState(device.name);
    const [selectedClinicId, setSelectedClinicId] = useState(device.equipment?.clinic?.id || '');
    const [selectedEquipmentId, setSelectedEquipmentId] = useState(device.equipmentId || '');
    const [isLoading, setIsLoading] = useState(false);
    
    // Estados para datos de clínicas y equipos
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [availableEquipment, setAvailableEquipment] = useState<Equipment[]>([]);

    // Cargar clínicas al abrir modal
    useEffect(() => {
        if (isOpen) {
            fetchClinics();
        }
    }, [isOpen]);

    // Cargar equipos cuando se selecciona una clínica
    useEffect(() => {
        if (selectedClinicId) {
            fetchEquipment(selectedClinicId);
        } else {
            setAvailableEquipment([]);
        }
    }, [selectedClinicId]);

    // Resetear estados cuando cambia el dispositivo
    useEffect(() => {
        setDeviceName(device.name);
        setSelectedClinicId(device.equipment?.clinic?.id || '');
        setSelectedEquipmentId(device.equipmentId || '');
    }, [device]);

    const fetchClinics = async () => {
        try {
            const response = await fetch('/api/internal/clinics/list');
            if (response.ok) {
                const data = await response.json();
                setClinics(data);
            }
        } catch (error) {
            console.error('Error cargando clínicas:', error);
        }
    };

    const fetchEquipment = async (clinicId: string) => {
        try {
            const response = await fetch(`/api/internal/equipment/available-for-plug?clinicId=${clinicId}`);
            if (response.ok) {
                const data = await response.json();
                setAvailableEquipment(data);
            }
        } catch (error) {
            console.error('Error cargando equipos:', error);
        }
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/internal/smart-plug-devices/${device.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: deviceName,
                    equipmentId: selectedEquipmentId || null,
                }),
            });

            if (response.ok) {
                toast.success('Dispositivo actualizado correctamente');
                onDeviceUpdate();
                onClose();
            } else {
                const errorData = await response.json();
                toast.error(errorData.error || 'Error al actualizar dispositivo');
            }
        } catch (error) {
            console.error('Error actualizando dispositivo:', error);
            toast.error('Error de conexión al actualizar dispositivo');
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusColor = () => {
        if (!device.online) return 'bg-red-500';
        if (device.relayOn) return 'bg-green-500';
        return 'bg-yellow-500';
    };

    const getStatusText = () => {
        if (!device.online) return 'Desconectado';
        if (device.relayOn) return 'Encendido';
        return 'Conectado (Apagado)';
    };

    const formatTimezone = (tz?: string) => {
        if (!tz) return 'No configurada';
        return tz.replace('_', ' ');
    };

    const formatWifiSignal = (rssi?: number) => {
        if (!rssi) return 'N/A';
        if (rssi > -50) return 'Excelente';
        if (rssi > -60) return 'Buena';
        if (rssi > -70) return 'Regular';
        return 'Débil';
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="flex flex-row items-center justify-between">
                    <DialogTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Configuración del Dispositivo
                    </DialogTitle>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </DialogHeader>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Panel Izquierdo: Información del Dispositivo */}
                    <div className="space-y-4">
                        {/* Estado Actual */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Activity className="w-4 h-4" />
                                    Estado Actual
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Estado:</span>
                                    <Badge variant="outline" className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
                                        {getStatusText()}
                                    </Badge>
                                </div>
                                
                                {device.currentPower !== undefined && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Consumo:</span>
                                        <span className="text-sm font-mono">{device.currentPower?.toFixed(1)} W</span>
                                    </div>
                                )}
                                
                                {device.voltage && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Voltaje:</span>
                                        <span className="text-sm font-mono">{device.voltage?.toFixed(1)} V</span>
                                    </div>
                                )}
                                
                                {device.temperature && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Temperatura:</span>
                                        <span className="text-sm font-mono">{device.temperature?.toFixed(1)} °C</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Información Técnica */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Info className="w-4 h-4" />
                                    Información Técnica
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <span className="font-medium text-muted-foreground">Device ID:</span>
                                        <p className="font-mono text-xs mt-1 break-all">{device.deviceId}</p>
                                    </div>
                                    <div>
                                        <span className="font-medium text-muted-foreground">Cloud ID:</span>
                                        <p className="font-mono text-xs mt-1 break-all">{device.cloudId || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <span className="font-medium text-muted-foreground">Modelo:</span>
                                        <p className="text-xs mt-1">{device.modelCode || 'No disponible'}</p>
                                    </div>
                                    <div>
                                        <span className="font-medium text-muted-foreground">Generación:</span>
                                        <p className="text-xs mt-1">Gen {device.generation || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <span className="font-medium text-muted-foreground">Firmware:</span>
                                        <p className="text-xs mt-1">{device.firmwareVersion || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <span className="font-medium text-muted-foreground">IP Local:</span>
                                        <p className="font-mono text-xs mt-1">{device.deviceIp || 'N/A'}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Configuración WiFi */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Wifi className="w-4 h-4" />
                                    Conexión WiFi
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Red:</span>
                                    <span className="text-sm font-mono">{device.wifiSsid || 'No disponible'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Señal:</span>
                                    <Badge variant="outline">
                                        {formatWifiSignal(device.wifiRssi)} ({device.wifiRssi || 0} dBm)
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Zona Horaria */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Clock className="w-4 h-4" />
                                    Configuración Temporal
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Zona Horaria:</span>
                                    <span className="text-sm font-mono">{formatTimezone(device.timezone)}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    Esta configuración es crítica para sincronizar las lecturas con la zona horaria de la clínica.
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Panel Derecho: Configuración Editable */}
                    <div className="space-y-4">
                        {/* Configuración General */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Settings className="w-4 h-4" />
                                    Configuración Local
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Nombre del Dispositivo */}
                                <div className="space-y-2">
                                    <Label htmlFor="deviceName">Nombre del Dispositivo (Alias)</Label>
                                    <Input
                                        id="deviceName"
                                        value={deviceName}
                                        onChange={(e) => setDeviceName(e.target.value)}
                                        placeholder="Ingrese un nombre descriptivo"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Este nombre es solo local y no modifica la configuración en Shelly Cloud.
                                    </p>
                                </div>

                                <Separator />

                                {/* Asociación con Clínica */}
                                <div className="space-y-2">
                                    <Label htmlFor="clinic">Clínica</Label>
                                    <Select value={selectedClinicId} onValueChange={setSelectedClinicId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar clínica" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">Sin asociar</SelectItem>
                                            {clinics.map(clinic => (
                                                <SelectItem key={clinic.id} value={clinic.id}>
                                                    {clinic.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Asociación con Equipo */}
                                <div className="space-y-2">
                                    <Label htmlFor="equipment">Equipo</Label>
                                    <Select 
                                        value={selectedEquipmentId} 
                                        onValueChange={setSelectedEquipmentId}
                                        disabled={!selectedClinicId}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={
                                                !selectedClinicId 
                                                    ? "Primero seleccione una clínica" 
                                                    : "Seleccionar equipo"
                                            } />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">Sin asociar</SelectItem>
                                            {availableEquipment.map(equipment => (
                                                <SelectItem key={equipment.id} value={equipment.id}>
                                                    {equipment.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        La asociación con un equipo es fundamental para el registro de uso en citas.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Información de la Cuenta */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Building2 className="w-4 h-4" />
                                    Cuenta Shelly
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Cuenta:</span>
                                    <span className="text-sm">{device.credential?.name || 'No disponible'}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    Este dispositivo está sincronizado desde esta cuenta de Shelly Cloud.
                                </p>
                            </CardContent>
                        </Card>

                        {/* Última Actividad */}
                        {device.lastSeenAt && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Clock className="w-4 h-4" />
                                        Última Actividad
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Última conexión:</span>
                                        <span className="text-sm font-mono">
                                            {new Date(device.lastSeenAt).toLocaleString()}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Botones de Acción */}
                        <div className="flex gap-2 pt-4">
                            <Button variant="outline" onClick={onClose} className="flex-1">
                                Cancelar
                            </Button>
                            <Button 
                                onClick={handleSave} 
                                disabled={isLoading}
                                className="flex-1"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
} 