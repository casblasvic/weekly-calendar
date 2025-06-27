"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaginationControls } from '@/components/pagination-controls';
import { toast } from "sonner";
import { PlusCircle, Edit, Trash2, Play, StopCircle, Wifi, WifiOff, ArrowLeft, ArrowUpDown, ChevronUp, ChevronDown, Power, Settings, Activity, Thermometer, Zap, AlertTriangle, RefreshCw, Smartphone, Search, Building2, X } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { ColumnDef, flexRender, getCoreRowModel, getSortedRowModel, SortingState, useReactTable } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useShellyRealtime } from "@/hooks/use-shelly-realtime";
import { useSession } from "next-auth/react";

interface SmartPlug {
    id: string;
    name: string;
    type: string;
    deviceId: string;
    deviceIp: string;
    equipment: { 
        name: string; 
        clinicId: string;
        clinic: {
            name: string;
        };
    };
    equipmentId: string;
    excludeFromSync: boolean;
    online: boolean;
    relayOn: boolean;
    clinicId?: string;
    credentialId?: string;
    credential?: {
        id: string;
        name: string;
        email: string;
        status: string;
    };
}

interface Equipment {
    id: string;
    name: string;
    clinicId: string;
}

interface Clinic { id: string; name: string; }

const SIDEBAR_WIDTH = "16rem"; // 256px

const SmartPlugsPage = () => {
    const { t } = useTranslation();
    const router = useRouter();
    const { data: session } = useSession();
    
    // Estados existentes
    const [plugs, setPlugs] = useState<SmartPlug[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPlug, setCurrentPlug] = useState<Partial<SmartPlug> | null>(null);
    const [activePlugs, setActivePlugs] = useState<Record<string, boolean>>({});
    const [sorting, setSorting] = useState<SortingState>([]);
    
    // Estados para paginación
    const [pagination, setPagination] = useState({ page: 1, pageSize: 10, totalPages: 1, totalCount: 0 });
    
    // Estados para el modal
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [selectedClinic, setSelectedClinic] = useState<string | null>(null);
    const [availableEquipment, setAvailableEquipment] = useState<Equipment[]>([]);
    
    // Estados para filtros
    const [availableCredentials, setAvailableCredentials] = useState<{id: string; name: string}[]>([]);
    const [selectedCredentialFilter, setSelectedCredentialFilter] = useState<string>('all');
    const [onlineFilter, setOnlineFilter] = useState<string>('all'); // all, online, offline
    const [relayStatusFilter, setRelayStatusFilter] = useState<string>('all'); // all, on, off
    const [clinicFilter, setClinicFilter] = useState<string>('all'); // all, clinic ids, 'unassigned'
    const [searchText, setSearchText] = useState<string>('');
    const [equipmentFilter, setEquipmentFilter] = useState<string>('all');
    const [equipmentSearchText, setEquipmentSearchText] = useState<string>('');
    
    // Estados para credenciales en tiempo real
    const [credentialsStatus, setCredentialsStatus] = useState<{
        id: string; 
        name: string; 
        status: 'connected' | 'error' | 'expired';
    }[]>([]);
    
    // Estados para equipos disponibles en filtros
    const [allEquipment, setAllEquipment] = useState<{id: string; name: string; clinicName: string}[]>([]);

    // 🔄 TIEMPO REAL - Escuchar cambios en dispositivos Shelly
    const systemId = session?.user?.systemId || '';
    const { updates, isConnected, lastUpdate, clearUpdates } = useShellyRealtime(systemId);

    const fetchPlugs = useCallback(async (page = 1, pageSize = 10, credentialFilter = 'all') => {
        setIsLoading(true);
        try {
            let url = `/api/internal/smart-plug-devices?page=${page}&pageSize=${pageSize}`;
            if (credentialFilter !== 'all') {
                url += `&credentialId=${credentialFilter}`;
            }
            const response = await fetch(url);
            if (response.ok) {
                const { data, totalPages, totalCount } = await response.json();
                setPlugs(data);
                setPagination({ page, pageSize, totalPages, totalCount });
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const fetchInitialData = async () => {
            const [clinicsResponse, credentialsResponse, equipmentResponse] = await Promise.all([
                fetch('/api/internal/clinics/list'),
                fetch('/api/shelly/credentials'),
                fetch('/api/equipment') // API existente para obtener todos los equipos
            ]);
            if (clinicsResponse.ok) setClinics(await clinicsResponse.json());
            if (credentialsResponse.ok) {
                const credentials = await credentialsResponse.json();
                setAvailableCredentials(credentials.map((c: any) => ({ id: c.id, name: c.name })));
                // Actualizar estado de credenciales
                setCredentialsStatus(credentials.map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    status: c.status || 'error'
                })));
            }
            if (equipmentResponse.ok) {
                const equipment = await equipmentResponse.json();
                setAllEquipment(equipment.map((eq: any) => ({
                    id: eq.id,
                    name: eq.name,
                    clinicName: eq.clinic?.name || 'Sin clínica'
                })));
            }
        };
        fetchPlugs();
        fetchInitialData();
    }, [fetchPlugs]);

    // Polling para actualizar el estado de credenciales cada 30 segundos (tiempo real)
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const response = await fetch('/api/shelly/credentials');
                if (response.ok) {
                    const credentials = await response.json();
                    setCredentialsStatus(credentials.map((c: any) => ({
                        id: c.id,
                        name: c.name,
                        status: c.status || 'error'
                    })));
                }
            } catch (error) {
                console.error('Error actualizando estado de credenciales:', error);
            }
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    // Filtrado local de datos
    const filteredPlugs = useMemo(() => {
        let filtered = plugs;

        // Filtro por credencial
        if (selectedCredentialFilter !== 'all') {
            filtered = filtered.filter(plug => plug.credentialId === selectedCredentialFilter);
        }

        // Filtro por online/offline
        if (onlineFilter !== 'all') {
            filtered = filtered.filter(plug => 
                onlineFilter === 'online' ? plug.online : !plug.online
            );
        }

        // Filtro por estado relay (encendido/apagado)
        if (relayStatusFilter !== 'all') {
            filtered = filtered.filter(plug => {
                const isOn = plug.online && plug.relayOn;
                return relayStatusFilter === 'on' ? isOn : !isOn;
            });
        }

        // Filtro por clínica
        if (clinicFilter !== 'all') {
            if (clinicFilter === 'unassigned') {
                filtered = filtered.filter(plug => !plug.equipment?.clinicId);
            } else {
                filtered = filtered.filter(plug => plug.equipment?.clinicId === clinicFilter);
            }
        }

        // Filtro por equipo
        if (equipmentFilter !== 'all') {
            filtered = filtered.filter(plug => plug.equipmentId === equipmentFilter);
        }

        // Búsqueda por texto (nombre)
        if (searchText.trim()) {
            const search = searchText.toLowerCase();
            filtered = filtered.filter(plug => 
                plug.name.toLowerCase().includes(search)
            );
        }

        return filtered;
    }, [plugs, selectedCredentialFilter, onlineFilter, relayStatusFilter, clinicFilter, equipmentFilter, searchText]);

    // Efecto para recargar cuando cambia el filtro de credencial (solo este necesita API)
    useEffect(() => {
        fetchPlugs(1, pagination.pageSize, selectedCredentialFilter);
    }, [selectedCredentialFilter, fetchPlugs, pagination.pageSize]);

    // useEffect para cargar equipos cuando se selecciona una clínica o se edita un enchufe
    useEffect(() => {
        const fetchAvailableEquipment = async () => {
            if (selectedClinic) {
                const response = await fetch(`/api/internal/equipment/available-for-plug?clinicId=${selectedClinic}`);
                if (response.ok) {
                    const equipment = await response.json();
                    setAvailableEquipment(equipment);
                }
            } else {
                setAvailableEquipment([]);
            }
        };
        fetchAvailableEquipment();
    }, [selectedClinic]);

    // Procesar actualizaciones en tiempo real
    useEffect(() => {
        if (updates.length === 0) return;

        console.log('🔄 Procesando actualizaciones en tiempo real:', updates);

        updates.forEach(update => {
            if (update.eventType === 'UPDATE' && update.new) {
                // Actualizar dispositivo existente
                setPlugs(prevPlugs => 
                    prevPlugs.map(plug => 
                        plug.id === update.new!.id 
                            ? { 
                                ...plug, 
                                online: update.new!.online,
                                relayOn: update.new!.relayOn,
                                currentPower: update.new!.currentPower,
                                voltage: update.new!.voltage,
                                temperature: update.new!.temperature,
                                wifiRssi: update.new!.wifiRssi,
                                lastSeenAt: update.new!.lastSeenAt,
                                updatedAt: update.new!.updatedAt
                            }
                            : plug
                    )
                );
                
                // Mostrar notificación de cambio
                const deviceName = update.new.name || update.new.deviceId;
                if (update.old?.online !== update.new.online) {
                    toast.info(
                        `${deviceName} ${update.new.online ? 'conectado' : 'desconectado'}`,
                        { duration: 3000 }
                    );
                }
                if (update.old?.relayOn !== update.new.relayOn) {
                    toast.info(
                        `${deviceName} ${update.new.relayOn ? 'encendido' : 'apagado'}`,
                        { duration: 3000 }
                    );
                }
            } else if (update.eventType === 'INSERT' && update.new) {
                // Recargar la lista si se agrega un nuevo dispositivo
                fetchPlugs(pagination.page, pagination.pageSize, selectedCredentialFilter);
            } else if (update.eventType === 'DELETE' && update.old) {
                // Eliminar dispositivo de la lista
                setPlugs(prevPlugs => 
                    prevPlugs.filter(plug => plug.id !== update.old!.id)
                );
            }
        });

        // Limpiar actualizaciones procesadas
        clearUpdates();
    }, [updates, clearUpdates, pagination.page, pagination.pageSize]);

    const handleSave = async () => {
        if (!currentPlug || !currentPlug.equipmentId) {
            toast.error("Por favor, selecciona un equipo para asociar.");
            return;
        }

        if (!selectedClinic) {
            toast.error("Por favor, selecciona una clínica.");
            return;
        }

        const method = currentPlug.id ? 'PUT' : 'POST';
        const url = currentPlug.id ? `/api/internal/smart-plug-devices/${currentPlug.id}` : '/api/internal/smart-plug-devices';
        
        const body = { 
            ...currentPlug, 
            type: 'SHELLY',
            integrationId: "provisional_integration_id",
            clinicId: selectedClinic
        };

        try {
            const response = await fetch(url, { 
                method, 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify(body) 
            });
            
            if (response.ok) {
                toast.success("Dispositivo guardado correctamente.");
                setIsModalOpen(false);
                setCurrentPlug(null);
                setSelectedClinic(null);
                await fetchPlugs(pagination.page, pagination.pageSize, selectedCredentialFilter);
            } else {
                const errorData = await response.json();
                toast.error(`Error al guardar: ${errorData.error || 'Error desconocido'}`);
            }
        } catch (error) {
            toast.error("Error de conexión al guardar el dispositivo.");
        }
    };
    
    const handleDelete = async (id: string) => {
        const confirmed = window.confirm("¿Estás seguro de que quieres eliminar este enchufe inteligente? Esta acción también eliminará todos los registros de uso asociados y no se puede deshacer.");
        
        if (!confirmed) return;

        try {
            const response = await fetch(`/api/internal/smart-plug-devices/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                toast.success("Enchufe eliminado correctamente.");
                await fetchPlugs(pagination.page, pagination.pageSize, selectedCredentialFilter);
            } else {
                const errorData = await response.json();
                toast.error(`Error al eliminar: ${errorData.error || 'Error desconocido'}`);
            }
        } catch (error) {
            toast.error("Error de conexión al eliminar el enchufe.");
        }
    };
    
    const handleEdit = useCallback(async (plug: SmartPlug) => {
        // Primero establecer la clínica
        const clinicId = plug.equipment?.clinicId;
        setSelectedClinic(clinicId || null);
        
        // Cargar los equipos de esa clínica si existe
        if (clinicId) {
            try {
                const response = await fetch(`/api/internal/equipment/available-for-plug?clinicId=${clinicId}`);
                if (response.ok) {
                    const equipment = await response.json();
                    setAvailableEquipment(equipment);
                    
                    // Establecer los datos del enchufe DESPUÉS de cargar los equipos
                    setCurrentPlug({
                        ...plug,
                        clinicId: clinicId
                    });
                    
                    setIsModalOpen(true);
                } else {
                    toast.error("Error al cargar los equipos de la clínica");
                }
            } catch (error) {
                console.error('Error loading equipment for edit:', error);
                toast.error("Error de conexión al cargar equipos");
            }
        } else {
            // Si no hay clínica, establecer los datos del enchufe directamente
            setCurrentPlug({
                ...plug,
                clinicId: clinicId
            });
            setIsModalOpen(true);
        }
    }, []);

    const handleControl = async (plugId: string, plugIp: string, action: 'on' | 'off') => {
        // Marcar como activo visualmente
        setActivePlugs(prev => ({ ...prev, [plugId]: true }));
        
        try {
            const response = await fetch(`/api/shelly/device/${plugId}/control`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action })
            });

            if (response.ok) {
                toast.success(`Dispositivo ${action === 'on' ? 'activado' : 'desactivado'} correctamente`);
                
                // Después de 3 segundos, quitar el estado activo
                setTimeout(() => {
                    setActivePlugs(prev => ({ ...prev, [plugId]: false }));
                }, 3000);
            } else {
                const error = await response.json();
                toast.error(error.error || "Error al controlar el dispositivo");
                setActivePlugs(prev => ({ ...prev, [plugId]: false }));
            }
        } catch (error) {
            toast.error("Error de conexión al controlar el dispositivo");
            setActivePlugs(prev => ({ ...prev, [plugId]: false }));
        }
    };

    const handleToggleExclusion = async (plugId: string, currentExcluded: boolean) => {
        const action = currentExcluded ? 'incluir en' : 'excluir de';
        const confirmed = window.confirm(
            `¿Estás seguro de que quieres ${action} sincronización este dispositivo?\n\n` +
            `${currentExcluded ? 
                'Al incluirlo, se volverá a sincronizar en futuras actualizaciones.' : 
                'Al excluirlo, no se actualizará automáticamente desde Shelly, pero podrás controlarlo manualmente.'
            }`
        );
        
        if (!confirmed) return;

        try {
            const response = await fetch(`/api/shelly/device/${plugId}/exclude`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ excludeFromSync: !currentExcluded })
            });

            if (response.ok) {
                toast.success(`Dispositivo ${!currentExcluded ? 'excluido de' : 'incluido en'} sincronización`);
                
                // Actualizar el estado local
                setPlugs(prevPlugs => 
                    prevPlugs.map(plug => 
                        plug.id === plugId 
                            ? { ...plug, excludeFromSync: !currentExcluded }
                            : plug
                    )
                );
            } else {
                const error = await response.json();
                toast.error(error.error || "Error al actualizar exclusión");
            }
        } catch (error) {
            toast.error("Error de conexión al actualizar exclusión");
        }
    };

    const columns = useMemo<ColumnDef<SmartPlug>[]>(() => [
        {
            id: 'credential',
            header: () => <div className="text-left">Credencial</div>,
            cell: ({ row }) => {
                const plug = row.original;
                return (
                    <div className="text-left">
                        {plug.credential ? (
                            <div className="font-medium">{plug.credential.name}</div>
                        ) : (
                            <span className="text-gray-400">Sin credencial</span>
                        )}
                    </div>
                );
            },
        },
        {
            id: 'name',
            header: () => <div className="text-left">{t('integrations.smart_plugs.table.name')}</div>,
            cell: ({ row }) => {
                const plug = row.original;
                return <div className="text-left">{plug.name}</div>;
            },
        },
        {
            id: 'equipment',
            header: () => <div className="text-left">{t('integrations.smart_plugs.table.equipment')}</div>,
            cell: ({ row }) => {
                const plug = row.original;
                return <div className="text-left">{plug.equipment?.name || 'N/A'}</div>;
            },
        },
        {
            id: 'clinic',
            header: () => <div className="text-left">{t('integrations.smart_plugs.table.clinic')}</div>,
            cell: ({ row }) => {
                const plug = row.original;
                return <div className="text-left">{plug.equipment?.clinic?.name || 'N/A'}</div>;
            },
        },
        {
            id: 'deviceId',
            header: () => <div className="text-left">{t('integrations.smart_plugs.table.device_id')}</div>,
            cell: ({ row }) => {
                const plug = row.original;
                return <div className="text-left">{plug.deviceId}</div>;
            },
        },
        {
            id: 'deviceIp',
            header: () => <div className="text-left">{t('integrations.smart_plugs.table.ip')}</div>,
            cell: ({ row }) => {
                const plug = row.original;
                return <div className="text-left">{plug.deviceIp}</div>;
            },
        },
        {
            id: 'connectionStatus',
            header: () => <div className="text-left">Online</div>,
            cell: ({ row }) => {
                const plug = row.original;
                const isOnline = plug.online;
                
                return (
                    <div className="text-left">
                        {isOnline ? (
                            <Badge className="text-white bg-green-500">
                                <Wifi className="mr-1 w-3 h-3" />
                                Online
                            </Badge>
                        ) : (
                            <Badge className="text-white bg-red-500">
                                <WifiOff className="mr-1 w-3 h-3" />
                                Offline
                            </Badge>
                        )}
                    </div>
                );
            }
        },
        {
            id: 'relayStatus', 
            header: () => <div className="text-left">Estado</div>,
            cell: ({ row }) => {
                const plug = row.original;
                const isOnline = plug.online;
                const relayOn = plug.relayOn;
                
                // Si está offline, no puede estar encendido
                const actualRelayState = isOnline ? relayOn : false;
                
                return (
                    <div className="text-left">
                        {actualRelayState ? (
                            <Badge className="text-white bg-green-500">
                                <Power className="mr-1 w-3 h-3" />
                                Encendido
                            </Badge>
                        ) : (
                            <Badge className="text-white bg-gray-500">
                                <Power className="mr-1 w-3 h-3" />
                                Apagado
                            </Badge>
                        )}
                    </div>
                );
            }
        },
        {
            id: 'sync',
            header: () => <div className="text-left">Sincronización</div>,
            cell: ({ row }) => {
                const plug = row.original;
                return (
                    <div className="text-left">
                        {plug.excludeFromSync ? (
                            <Badge variant="outline" className="text-orange-600 border-orange-300">
                                Excluido
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="text-green-600 border-green-300">
                                Incluido
                            </Badge>
                        )}
                    </div>
                );
            },
        },
        {
            id: 'actions',
            header: () => <div className="w-full text-right">{t('common.actions')}</div>,
            cell: ({ row }) => {
                const plug = row.original;
                const isActive = activePlugs[plug.id] || false;
                
                return (
                    <div className="flex gap-2 justify-end items-center">
                        <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleControl(plug.id, plug.deviceIp, 'on')}
                            className={`transition-all duration-300 ${
                                isActive 
                                    ? 'text-green-700 bg-green-100 shadow-lg animate-pulse' 
                                    : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                            }`}
                            title="Activar dispositivo"
                        >
                            <Play className="w-4 h-4" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleToggleExclusion(plug.id, plug.excludeFromSync)}
                            className={`transition-all duration-300 ${
                                plug.excludeFromSync
                                    ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50' 
                                    : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                            }`}
                            title={plug.excludeFromSync ? "Incluir en sincronización" : "Excluir de sincronización"}
                        >
                            {plug.excludeFromSync ? <Settings className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleEdit(plug)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Editar enchufe"
                        >
                            <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDelete(plug.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Eliminar enchufe"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                );
            },
        }
    ], [t, handleDelete, handleEdit, handleControl, activePlugs, handleToggleExclusion]);

    const table = useReactTable({
        data: filteredPlugs,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
        <div className="space-y-6">
            
            <Card className="mx-4">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Dispositivos Shelly</CardTitle>
                            <CardDescription>
                                Gestión de enchufes inteligentes conectados
                            </CardDescription>
                        </div>
                        <div className="flex gap-2 items-center">
                            {/* Píldoras de estado de credenciales en tiempo real */}
                            {credentialsStatus.map((credential) => (
                                <Badge 
                                    key={credential.id}
                                    className={`flex gap-1 items-center px-3 py-1 ${
                                        credential.status === 'connected' 
                                            ? 'bg-green-500 text-white' 
                                            : credential.status === 'expired'
                                            ? 'bg-amber-500 text-white'
                                            : 'bg-red-500 text-white'
                                    }`}
                                >
                                    <div className={`w-2 h-2 rounded-full ${
                                        credential.status === 'connected' ? 'bg-white animate-pulse' : 'bg-white opacity-70'
                                    }`} />
                                    Credencial {credential.name}
                                </Badge>
                            ))}
                            
                            {credentialsStatus.length === 0 && (
                                <Badge variant="secondary" className="flex gap-1 items-center">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full" />
                                    Sin credenciales
                                </Badge>
                            )}

                            {lastUpdate && (
                                <span className="text-xs text-gray-500">
                                    Última actualización: {lastUpdate.toLocaleTimeString()}
                                </span>
                            )}
                            
                            {/* Botón de sincronizar dispositivos igual al de credenciales */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                    // Sincronizar todos los dispositivos de todas las credenciales conectadas
                                    const connectedCredentials = credentialsStatus.filter(c => c.status === 'connected');
                                    if (connectedCredentials.length === 0) {
                                        toast.error("No hay credenciales conectadas para sincronizar");
                                        return;
                                    }
                                    
                                    for (const credential of connectedCredentials) {
                                        try {
                                            const response = await fetch(`/api/shelly/sync/${credential.id}`, {
                                                method: 'POST'
                                            });
                                            if (response.ok) {
                                                toast.success(`Dispositivos sincronizados para ${credential.name}`);
                                            } else {
                                                toast.error(`Error sincronizando ${credential.name}`);
                                            }
                                        } catch (error) {
                                            toast.error(`Error de conexión sincronizando ${credential.name}`);
                                        }
                                    }
                                    // Recargar dispositivos después de sincronizar
                                    await fetchPlugs(pagination.page, pagination.pageSize, selectedCredentialFilter);
                                }}
                                className="px-3 py-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                                title="Sincronizar dispositivos"
                            >
                                <Smartphone className="mr-1 w-4 h-4" />
                                Dispositivos
                            </Button>
                        </div>
                    </div>
                    
                    {/* Filtros Avanzados */}
                    <div className="pt-4 space-y-4 border-t">
                        {/* Primera fila de filtros */}
                        <div className="flex flex-wrap gap-3 items-center">
                            {/* Búsqueda */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 w-4 h-4 text-gray-400 transform -translate-y-1/2" />
                                <Input
                                    placeholder="Buscar por nombre..."
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    className="pl-10 w-64"
                                />
                                {searchText && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSearchText('')}
                                        className="absolute right-1 top-1/2 p-0 w-6 h-6 transform -translate-y-1/2"
                                    >
                                        <X className="w-3 h-3" />
                                    </Button>
                                )}
                            </div>

                            {/* Filtro Credencial */}
                            {availableCredentials.length > 0 && (
                                <Select value={selectedCredentialFilter} onValueChange={setSelectedCredentialFilter}>
                                    <SelectTrigger className="w-48">
                                        <SelectValue placeholder="Todas las credenciales" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas las credenciales</SelectItem>
                                        {availableCredentials.map(credential => (
                                            <SelectItem key={credential.id} value={credential.id}>
                                                {credential.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            {/* Filtro Online/Offline */}
                            <Select value={onlineFilter} onValueChange={setOnlineFilter}>
                                <SelectTrigger className="w-36">
                                    <SelectValue placeholder="Conectividad" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="online">Online</SelectItem>
                                    <SelectItem value="offline">Offline</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Filtro Encendido/Apagado */}
                            <Select value={relayStatusFilter} onValueChange={setRelayStatusFilter}>
                                <SelectTrigger className="w-36">
                                    <SelectValue placeholder="Estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="on">Encendido</SelectItem>
                                    <SelectItem value="off">Apagado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Segunda fila de filtros */}
                        <div className="flex flex-wrap gap-3 items-center">
                            {/* Filtro Clínica */}
                            <Select value={clinicFilter} onValueChange={setClinicFilter}>
                                <SelectTrigger className="w-48">
                                    <SelectValue placeholder="Todas las clínicas" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas las clínicas</SelectItem>
                                    <SelectItem value="unassigned">Sin asociar</SelectItem>
                                    {clinics.map(clinic => (
                                        <SelectItem key={clinic.id} value={clinic.id}>
                                            {clinic.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Filtro Equipo con búsqueda interna */}
                            <div className="w-64">
                                <Select value={equipmentFilter} onValueChange={setEquipmentFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todos los equipos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <div className="p-2">
                                            <div className="relative">
                                                <Search className="absolute left-2 top-1/2 w-3 h-3 text-gray-400 transform -translate-y-1/2" />
                                                <Input
                                                    placeholder="Buscar equipo..."
                                                    value={equipmentSearchText}
                                                    onChange={(e) => setEquipmentSearchText(e.target.value)}
                                                    className="pl-7 h-8 text-xs"
                                                />
                                            </div>
                                        </div>
                                        <SelectItem value="all">Todos los equipos</SelectItem>
                                        {allEquipment
                                            .filter(eq => 
                                                equipmentSearchText === '' || 
                                                eq.name.toLowerCase().includes(equipmentSearchText.toLowerCase()) ||
                                                eq.clinicName.toLowerCase().includes(equipmentSearchText.toLowerCase())
                                            )
                                            .map(equipment => (
                                                <SelectItem key={equipment.id} value={equipment.id}>
                                                    {equipment.name} ({equipment.clinicName})
                                                </SelectItem>
                                            ))
                                        }
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Botón limpiar filtros */}
                            {(selectedCredentialFilter !== 'all' || onlineFilter !== 'all' || 
                              relayStatusFilter !== 'all' || clinicFilter !== 'all' || 
                              equipmentFilter !== 'all' || searchText.trim()) && (
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                        setSelectedCredentialFilter('all');
                                        setOnlineFilter('all');
                                        setRelayStatusFilter('all');
                                        setClinicFilter('all');
                                        setEquipmentFilter('all');
                                        setSearchText('');
                                        setEquipmentSearchText('');
                                    }}
                                    className="text-xs"
                                >
                                    <X className="mr-1 w-3 h-3" />
                                    Limpiar filtros
                                </Button>
                            )}
                        </div>

                        {/* Contador de resultados */}
                        <div className="text-sm text-gray-500">
                            {filteredPlugs.length} de {plugs.length} dispositivos
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto rounded-md border">
                        <Table className="min-w-full">
                            <TableHeader>
                                {table.getHeaderGroups().map(headerGroup => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map(header => (
                                            <TableHead key={header.id}>
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                {header.column.getCanSort() && (
                                                    <Button variant="ghost" size="sm" onClick={() => header.column.toggleSorting(header.column.getIsSorted() === 'asc')}>
                                                        {/* Icono de ordenación */}
                                                    </Button>
                                                )}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    // Skeleton loading rows
                                    [...Array(5)].map((_, index) => (
                                        <TableRow key={index}>
                                            <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                                            <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                                            <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                                            <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                                            <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                                            <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                                            <TableCell><div className="h-6 bg-gray-200 rounded-full animate-pulse"></div></TableCell>
                                            <TableCell><div className="h-6 bg-gray-200 rounded-full animate-pulse"></div></TableCell>
                                            <TableCell><div className="h-6 bg-gray-200 rounded-full animate-pulse"></div></TableCell>
                                            <TableCell>
                                                <div className="flex gap-2 justify-end">
                                                    <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                                                    <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                                                    <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                                                    <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : table.getRowModel().rows.length > 0 ? (
                                    table.getRowModel().rows.map(row => (
                                        <TableRow key={row.id}>
                                            {row.getVisibleCells().map(cell => (
                                                <TableCell key={cell.id}>
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="h-24 text-center">
                                            No hay enchufes configurados.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <PaginationControls
                        currentPage={pagination.page}
                        totalPages={pagination.totalPages}
                        onPageChange={(p) => fetchPlugs(p, pagination.pageSize, selectedCredentialFilter)}
                        pageSize={pagination.pageSize}
                        onPageSizeChange={(s) => fetchPlugs(1, s, selectedCredentialFilter)}
                        totalCount={pagination.totalCount}
                        itemType="enchufes"
                    />
                </CardContent>
            </Card>

            <div className="flex fixed right-4 bottom-4 z-50 gap-2">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 w-4 h-4" />{t('common.back')}
                </Button>
                <Button onClick={() => { 
                    setCurrentPlug({name: '', deviceId: '', deviceIp: ''}); 
                    setSelectedClinic(null);
                    setIsModalOpen(true); 
                }}>
                    <PlusCircle className="mr-2 w-4 h-4" />{t('integrations.smart_plugs.add_button')}
                </Button>
            </div>
            
            {isModalOpen && (
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader className="pb-4">
                            <DialogTitle>{currentPlug?.id ? t('integrations.smart_plugs.modal.edit_title') : t('integrations.smart_plugs.modal.add_title')}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-6 px-6 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">{t('integrations.smart_plugs.modal.name_label')}</Label>
                                <Input 
                                    id="name" 
                                    value={currentPlug?.name || ''} 
                                    onChange={(e) => setCurrentPlug(p => ({ ...p, name: e.target.value }))} 
                                    placeholder={t('integrations.smart_plugs.modal.name_placeholder')}
                                    className="input-focus"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="deviceId">{t('integrations.smart_plugs.modal.deviceId_label')}</Label>
                                    <Input 
                                        id="deviceId" 
                                        value={currentPlug?.deviceId || ''} 
                                        onChange={(e) => setCurrentPlug(p => ({ ...p, deviceId: e.target.value }))}
                                        className="input-focus"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="deviceIp">{t('integrations.smart_plugs.modal.deviceIp_label')}</Label>
                                    <Input 
                                        id="deviceIp" 
                                        value={currentPlug?.deviceIp || ''} 
                                        onChange={(e) => setCurrentPlug(p => ({ ...p, deviceIp: e.target.value }))} 
                                        placeholder={t('integrations.smart_plugs.modal.deviceIp_placeholder')}
                                        className="input-focus"
                                    />
                                </div>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="clinicId">{t('integrations.smart_plugs.modal.clinic_label')}</Label>
                                <Select onValueChange={setSelectedClinic} value={selectedClinic || undefined}>
                                    <SelectTrigger className="select-focus">
                                        <SelectValue placeholder={t('integrations.smart_plugs.modal.clinic_placeholder')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {clinics.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="equipmentId">{t('integrations.smart_plugs.modal.equipment_label')}</Label>
                                <Select
                                    value={currentPlug?.equipmentId}
                                    onValueChange={(value) => setCurrentPlug(p => ({ ...p, equipmentId: value }))}
                                    disabled={!selectedClinic || availableEquipment.length === 0}
                                >
                                    <SelectTrigger className="select-focus">
                                        <SelectValue placeholder={!selectedClinic ? t('integrations.smart_plugs.modal.equipment_placeholder_loading') : t('integrations.smart_plugs.modal.equipment_placeholder')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableEquipment.map(eq => <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter className="px-6 pt-4">
                            <Button variant="outline" onClick={() => setIsModalOpen(false)}>{t('common.cancel')}</Button>
                            <Button onClick={handleSave}>{t('common.save')}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
};

export default SmartPlugsPage; 