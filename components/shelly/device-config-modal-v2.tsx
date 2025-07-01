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
    MapPin, 
    Clock, 
    Cpu, 
    Zap, 
    Activity,
    Building2,
    Settings,
    Info,
    X,
    Save
} from "lucide-react";

interface DeviceConfigModalV2Props {
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
        equipmentClinicAssignmentId?: string;
        equipmentClinicAssignment?: {
            id: string;
            clinicId: string;
            deviceName?: string;
            serialNumber?: string; // ✅ INCLUIR serialNumber para consistencia
            equipment: {
                id: string;
                name: string;
            };
            clinic: {
                id: string;
                name: string;
            };
        };
        equipment?: { // Para compatibilidad hacia atrás
            name: string;
            clinicId: string;
            clinic: {
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

export function DeviceConfigModalV2({ device, isOpen, onClose, onDeviceUpdate }: DeviceConfigModalV2Props) {
    // Debug: Log de los datos recibidos
    useEffect(() => {
        if (isOpen) {
            console.log('🔍 [DEBUG MODAL] Device data received:', {
                id: device.id,
                name: device.name,
                equipmentClinicAssignmentId: device.equipmentClinicAssignmentId,
                equipmentClinicAssignment: device.equipmentClinicAssignment,
                equipment: device.equipment // Para compatibilidad
            });
            
            // Log más detallado de la estructura de equipmentClinicAssignment
            if (device.equipmentClinicAssignment) {
                console.log('🔍 [DEBUG MODAL] Estructura detallada de equipmentClinicAssignment:', JSON.stringify(device.equipmentClinicAssignment, null, 2));
            }
        }
    }, [isOpen, device]);

    // Estados para edición local
    const [deviceName, setDeviceName] = useState(device.name);
    const [selectedClinicId, setSelectedClinicId] = useState(device.equipmentClinicAssignment?.clinicId || 'none');
    const [selectedEquipmentId, setSelectedEquipmentId] = useState(device.equipmentClinicAssignmentId || 'none');
    const [isLoading, setIsLoading] = useState(false);

    // Debug: Log de los estados iniciales
    useEffect(() => {
        if (isOpen) {
            console.log('🔍 [DEBUG MODAL] Estados iniciales:', {
                selectedClinicId: device.equipmentClinicAssignment?.clinicId || 'none',
                selectedEquipmentId: device.equipmentClinicAssignmentId || 'none',
                clinicName: device.equipmentClinicAssignment?.clinic?.name,
                equipmentName: device.equipmentClinicAssignment?.equipment?.name,
                deviceName: device.equipmentClinicAssignment?.deviceName
            });
        }
    }, [isOpen, device]);
    
    // Estados para datos de clínicas y equipos
    const [clinics, setClinics] = useState<Clinic[]>(() => {
        // ✅ RENDERIZACIÓN OPTIMISTA: Inicializar con la clínica actual si existe
        if (device.equipmentClinicAssignment?.clinic) {
            return [{
                id: device.equipmentClinicAssignment.clinic.id,
                name: device.equipmentClinicAssignment.clinic.name
            }];
        }
        return [];
    });
    
    const [availableEquipment, setAvailableEquipment] = useState<Equipment[]>(() => {
        // ✅ RENDERIZACIÓN OPTIMISTA: Inicializar con el equipo actual si existe
        if (device.equipmentClinicAssignment?.equipment) {
            // ✅ FORMATO DROPDOWN: "Alias (Serial)" para dropdowns
            const alias = device.equipmentClinicAssignment.deviceName || device.equipmentClinicAssignment.equipment.name;
            const serial = device.equipmentClinicAssignment.serialNumber;
            const displayName = serial ? `${alias} (${serial})` : alias;
            
            return [{
                id: device.equipmentClinicAssignmentId!,
                name: displayName
            }];
        }
        return [];
    });

    // Cargar clínicas al abrir modal (en background, actualiza las opciones)
    useEffect(() => {
        if (isOpen) {
            fetchClinics();
        }
    }, [isOpen]);

    // Cargar equipos cuando se selecciona una clínica (en background, actualiza las opciones)
    useEffect(() => {
        if (selectedClinicId && selectedClinicId !== 'none') {
            fetchEquipment(selectedClinicId);
        } else {
            // Si no hay clínica seleccionada, limpiar pero mantener el actual si existe
            if (!device.equipmentClinicAssignment?.equipment) {
                setAvailableEquipment([]);
            }
        }
    }, [selectedClinicId]);

    // Resetear estados cuando cambia el dispositivo
    useEffect(() => {
        setDeviceName(device.name);
        setSelectedClinicId(device.equipmentClinicAssignment?.clinicId || 'none');
        setSelectedEquipmentId(device.equipmentClinicAssignmentId || 'none');
    }, [device]);

    const fetchClinics = async () => {
        try {
            const response = await fetch('/api/internal/clinics/list');
            if (response.ok) {
                const data = await response.json();
                // ✅ RENDERIZACIÓN OPTIMISTA: Actualizar con todas las clínicas disponibles
                setClinics(data);
            }
        } catch (error) {
            console.error('Error cargando clínicas:', error);
            // En caso de error, mantener al menos la clínica actual si existe
            if (!device.equipmentClinicAssignment?.clinic) {
                setClinics([]);
            }
        }
    };

    const fetchEquipment = async (clinicId: string) => {
        try {
            console.log('🔍 [DEBUG MODAL AVANZADO] Cargando asignaciones para clínica:', clinicId);
            
            // Si estamos editando un dispositivo que ya tiene asignación, incluirla en los resultados
            let url = `/api/equipment/clinic-assignments?clinicId=${clinicId}&available=true`;
            if (device.equipmentClinicAssignmentId) {
                url += `&includeAssignmentId=${device.equipmentClinicAssignmentId}`;
                console.log('🔍 [DEBUG MODAL AVANZADO] Incluyendo asignación actual:', device.equipmentClinicAssignmentId);
            }
            
            const response = await fetch(url);
            if (response.ok) {
                const assignments = await response.json();
                console.log('🔍 [DEBUG MODAL AVANZADO] Asignaciones recibidas:', assignments);
                
                // Transformar las asignaciones para mostrar: Alias (Serial)
                const equipmentList = assignments.map((assignment: any) => ({
                    id: assignment.id, // ID de la asignación, no del equipo
                    name: `${assignment.deviceName || assignment.equipment.name} (${assignment.serialNumber})`,
                }));
                console.log('🔍 [DEBUG MODAL AVANZADO] Lista transformada:', equipmentList);
                
                // ✅ RENDERIZACIÓN OPTIMISTA: Actualizar con todas las opciones disponibles
                setAvailableEquipment(equipmentList);
            } else {
                console.error('Error en respuesta:', response.status);
                // En caso de error, mantener al menos la opción actual si existe
                if (!device.equipmentClinicAssignment?.equipment) {
                    setAvailableEquipment([]);
                }
            }
        } catch (error) {
            console.error('Error cargando equipos:', error);
            // En caso de error, mantener al menos la opción actual si existe
            if (!device.equipmentClinicAssignment?.equipment) {
                setAvailableEquipment([]);
            }
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
                    equipmentClinicAssignmentId: selectedEquipmentId === 'none' ? null : selectedEquipmentId,
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
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
                <DialogHeader className="flex flex-row justify-between items-center p-6 pb-4">
                    <DialogTitle className="flex gap-2 items-center">
                        <Settings className="w-5 h-5" />
                        Configuración del Dispositivo
                    </DialogTitle>
                </DialogHeader>
                
                {/* Contenido con scroll */}
                <div className="flex-1 overflow-y-auto px-6">

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Panel Izquierdo: Información del Dispositivo */}
                    <div className="space-y-4">
                        {/* Estado Actual */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex gap-2 items-center text-lg">
                                    <Activity className="w-4 h-4" />
                                    Estado Actual
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium">Estado:</span>
                                    <Badge variant="outline" className="flex gap-2 items-center">
                                        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
                                        {getStatusText()}
                                    </Badge>
                                </div>
                                
                                {device.currentPower !== undefined && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium">Consumo:</span>
                                        <span className="font-mono text-sm">{device.currentPower?.toFixed(1)} W</span>
                                    </div>
                                )}
                                
                                {device.voltage && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium">Voltaje:</span>
                                        <span className="font-mono text-sm">{device.voltage?.toFixed(1)} V</span>
                                    </div>
                                )}
                                
                                {device.temperature && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium">Temperatura:</span>
                                        <span className="font-mono text-sm">{device.temperature?.toFixed(1)} °C</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Información Técnica */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex gap-2 items-center text-lg">
                                    <Info className="w-4 h-4" />
                                    Información Técnica
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <span className="font-medium text-muted-foreground">Device ID:</span>
                                        <p className="mt-1 font-mono text-xs break-all">{device.deviceId}</p>
                                    </div>
                                    <div>
                                        <span className="font-medium text-muted-foreground">Cloud ID:</span>
                                        <p className="mt-1 font-mono text-xs break-all">{device.cloudId || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <span className="font-medium text-muted-foreground">Modelo:</span>
                                        <p className="mt-1 text-xs">{device.modelCode || 'No disponible'}</p>
                                    </div>
                                    <div>
                                        <span className="font-medium text-muted-foreground">Generación:</span>
                                        <p className="mt-1 text-xs">Gen {device.generation || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <span className="font-medium text-muted-foreground">Firmware:</span>
                                        <p className="mt-1 text-xs">{device.firmwareVersion || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <span className="font-medium text-muted-foreground">IP Local:</span>
                                        <p className="mt-1 font-mono text-xs">{device.deviceIp || 'N/A'}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Configuración WiFi */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex gap-2 items-center text-lg">
                                    <Wifi className="w-4 h-4" />
                                    Conexión WiFi
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium">Red:</span>
                                    <span className="font-mono text-sm">{device.wifiSsid || 'No disponible'}</span>
                                </div>
                                <div className="flex justify-between items-center">
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
                                <CardTitle className="flex gap-2 items-center text-lg">
                                    <Clock className="w-4 h-4" />
                                    Configuración Temporal
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium">Zona Horaria:</span>
                                    <span className="font-mono text-sm">{formatTimezone(device.timezone)}</span>
                                </div>
                                <p className="mt-2 text-xs text-muted-foreground">
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
                                <CardTitle className="flex gap-2 items-center text-lg">
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
                                            <SelectItem value="none">Sin asociar</SelectItem>
                                            {clinics.map(clinic => (
                                                <SelectItem key={clinic.id} value={clinic.id}>
                                                    <div className="truncate max-w-[250px]" title={clinic.name}>
                                                        {clinic.name}
                                                    </div>
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
                                        disabled={selectedClinicId === 'none'}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={
                                                selectedClinicId === 'none'
                                                    ? "Primero seleccione una clínica" 
                                                    : "Seleccionar equipo"
                                            } />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Sin asociar</SelectItem>
                                            {availableEquipment.map(equipment => (
                                                <SelectItem key={equipment.id} value={equipment.id}>
                                                    <div className="truncate max-w-[250px]" title={equipment.name}>
                                                        {equipment.name}
                                                    </div>
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
                                <CardTitle className="flex gap-2 items-center text-lg">
                                    <Building2 className="w-4 h-4" />
                                    Cuenta Shelly
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium">Cuenta:</span>
                                    <span className="text-sm">{device.credential?.name || 'No disponible'}</span>
                                </div>
                                <p className="mt-2 text-xs text-muted-foreground">
                                    Este dispositivo está sincronizado desde esta cuenta de Shelly Cloud.
                                </p>
                            </CardContent>
                        </Card>

                        {/* Última Actividad */}
                        {device.lastSeenAt && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex gap-2 items-center text-lg">
                                        <Clock className="w-4 h-4" />
                                        Última Actividad
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium">Última conexión:</span>
                                        <span className="font-mono text-sm">
                                            {new Date(device.lastSeenAt).toLocaleString()}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                    </div>
                </div>
                </div>
                
                {/* Botones fijos en la parte inferior */}
                <div className="border-t bg-background p-6 flex gap-2">
                    <Button variant="outline" onClick={onClose} className="flex-1">
                        Cancelar
                    </Button>
                    <Button 
                        onClick={handleSave} 
                        disabled={isLoading}
                        className="flex-1"
                    >
                        <Save className="mr-2 w-4 h-4" />
                        {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
} 