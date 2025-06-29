"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { PlusCircle, Edit, Trash2, Play, StopCircle, Wifi, WifiOff, ArrowLeft, ArrowUpDown, ChevronUp, ChevronDown, Power, Settings, Activity, Thermometer, Zap, Plug, AlertTriangle, RefreshCw, Smartphone, Search, Building2, X } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { ColumnDef, flexRender, getCoreRowModel, getSortedRowModel, SortingState, useReactTable } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useShellyRealtime } from "@/hooks/use-shelly-realtime";
import { useSession } from "next-auth/react";
import { DeviceEditModal } from '@/components/shelly/device-edit-modal';
import { DeviceControlButton } from '@/components/ui/device-control-button';
import useSocket from '@/hooks/useSocket';

interface SmartPlug {
    id: string;
    name: string;
    type: string;
    deviceId: string;
    deviceIp: string;
    equipment?: { 
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
    // Campos adicionales del dispositivo
    generation?: string;
    modelCode?: string;
    macAddress?: string;
    firmwareVersion?: string;
    hasUpdate?: boolean;
    relaySource?: string;
    currentPower?: number;
    totalEnergy?: number;
    voltage?: number;
    current?: number;
    wifiSsid?: string;
    wifiRssi?: number;
    temperature?: number;
    lastSeenAt?: Date | string;
    systemId: string;
    integrationId: string;
    createdAt: Date | string;
    updatedAt: Date | string;
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
    const { subscribe, isConnected, requestDeviceUpdate } = useSocket(session?.user?.systemId);
    
    // Estados existentes
    const [plugs, setPlugs] = useState<SmartPlug[]>([]); // Dispositivos de la vista actual (paginados/filtrados)
    const [allPlugs, setAllPlugs] = useState<SmartPlug[]>([]); // TODOS los dispositivos para cálculo de consumo
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentPlug, setCurrentPlug] = useState<Partial<SmartPlug> | null>(null);
    const [selectedDevice, setSelectedDevice] = useState<SmartPlug | null>(null);
    const [activePlugs, setActivePlugs] = useState<Record<string, boolean>>({});
    const [sorting, setSorting] = useState<SortingState>([]);
    
    // Estados para paginación
    const [pagination, setPagination] = useState({ page: 1, pageSize: 50, totalPages: 1, totalCount: 0 });
    
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
        totalPower?: number;
        deviceCount?: number;
    }[]>([]);
    
    // Estados para equipos disponibles en filtros
    const [allEquipment, setAllEquipment] = useState<{id: string; name: string; clinicName: string}[]>([]);

    // 🔄 TIEMPO REAL - Escuchar cambios en dispositivos Shelly
    const systemId = session?.user?.systemId || '';
    const { updates, isConnected: shellyIsConnected, lastUpdate, clearUpdates } = useShellyRealtime(systemId);

    const fetchPlugs = useCallback(async (page = 1, pageSize = 50, credentialFilter = 'all') => {
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
                console.log(`📄 Página ${page} cargada con ${data.length} dispositivos (WebSocket se encargará de actualizaciones)`);
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Función para cargar TODOS los dispositivos (para cálculo de consumo en tiempo real)
    const fetchAllPlugs = useCallback(async () => {
        try {
            console.log('📥 Cargando TODOS los dispositivos para cálculo de consumo...');
            const response = await fetch('/api/internal/smart-plug-devices?page=1&pageSize=1000'); // Sin paginación
            if (response.ok) {
                const { data } = await response.json();
                console.log(`📊 Cargados ${data.length} dispositivos totales`);
                setAllPlugs(data);
                return data;
            }
        } catch (error) {
            console.error('❌ Error cargando todos los dispositivos:', error);
        }
        return [];
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
        
        // Cargar datos iniciales solo una vez
        fetchPlugs();
        fetchAllPlugs(); 
        fetchInitialData();
        
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Sin dependencias para ejecutar solo una vez

    // Filtrado y ordenación local de datos
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

        // 🎯 ORDENACIÓN AUTOMÁTICA: Prioridad por estado y luego alfabético
        return filtered.sort((a, b) => {
            // Determinar estados de prioridad
            const getDevicePriority = (device: SmartPlug) => {
                if (device.online && device.relayOn) return 1; // Encendidos (online + ON)
                if (device.online && !device.relayOn) return 2; // Online pero apagados
                if (!device.online) return 3; // Offline
                return 4; // Otros casos
            };
            
            const aPriority = getDevicePriority(a);
            const bPriority = getDevicePriority(b);
            
            // Ordenar por prioridad primero
            if (aPriority !== bPriority) {
                return aPriority - bPriority;
            }
            
            // Si tienen la misma prioridad, ordenar alfabéticamente por nombre
            return a.name.localeCompare(b.name);
        });
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

    // Inicializar Socket.io automáticamente
    useEffect(() => {
        const initializeSocket = async () => {
            try {
                console.log('🚀 Inicializando Socket.io server...');
                const response = await fetch('/api/socket/init');
                const result = await response.json();
                console.log('📡 Socket.io init response:', result);
            } catch (error) {
                console.error('❌ Error inicializando Socket.io:', error);
            }
        };

        if (session?.user?.systemId) {
            initializeSocket();
        }
    }, [session?.user?.systemId]);

    // Suscribirse a actualizaciones Socket.io en tiempo real (optimizado)
    // Ref para evitar suscripciones duplicadas
    const subscriptionRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        // Solo suscribirse cuando está conectado
        if (!isConnected) {
            return;
        }

        // Evitar suscripciones duplicadas
        if (subscriptionRef.current) {
            return;
        }

        console.log('📝 Configurando WebSocket tiempo real...');
        
        const unsubscribe = subscribe((update) => {
            
            // Función helper para actualizar un dispositivo en lista completa (solo para consumo)
            const updateDeviceInList = (prev: SmartPlug[], listName: string) => {
                const deviceIndex = prev.findIndex(device => 
                    device.id === update.deviceId || device.deviceId === update.deviceId
                );
                
                if (deviceIndex === -1) {
                    return prev;
                }
                
                const oldDevice = prev[deviceIndex];
                
                // Verificar cambios reales
                const hasChanges = (
                    Boolean(oldDevice.online) !== Boolean(update.online) ||
                    Boolean(oldDevice.relayOn) !== Boolean(update.relayOn) ||
                    Number(oldDevice.currentPower || 0) !== Number(update.currentPower || 0) ||
                    Number(oldDevice.voltage || 0) !== Number(update.voltage || 0) ||
                    Number(oldDevice.temperature || 0) !== Number(update.temperature || 0)
                );
                
                if (!hasChanges) {
                    return prev;
                }
                
                // Actualizar dispositivo
                const updated = [...prev];
                updated[deviceIndex] = { 
                    ...oldDevice, 
                    online: update.online,
                    relayOn: update.relayOn,
                    currentPower: update.currentPower,
                    voltage: update.voltage,
                    temperature: update.temperature,
                    lastSeenAt: new Date(update.timestamp)
                };
                
                return updated;
            };

            // Actualizar SOLO lista completa para cálculo de consumo
            setAllPlugs(prev => updateDeviceInList(prev, 'lista completa'));
            
            // Actualizar vista actual SOLO si el dispositivo está visible
            setPlugs(prev => {
                const deviceIndex = prev.findIndex(device => 
                    device.id === update.deviceId || device.deviceId === update.deviceId
                );
                
                if (deviceIndex === -1) {
                    // Dispositivo no está en página actual, no hacer nada
                    return prev;
                }
                
                const oldDevice = prev[deviceIndex];
                
                // Verificar si hay cambios reales
                const hasChanges = (
                    Boolean(oldDevice.online) !== Boolean(update.online) ||
                    Boolean(oldDevice.relayOn) !== Boolean(update.relayOn) ||
                    Number(oldDevice.currentPower || 0) !== Number(update.currentPower || 0) ||
                    Number(oldDevice.voltage || 0) !== Number(update.voltage || 0) ||
                    Number(oldDevice.temperature || 0) !== Number(update.temperature || 0)
                );
                
                if (!hasChanges) {
                    return prev;
                }
                
                // Actualizar solo este dispositivo
                const updated = [...prev];
                updated[deviceIndex] = { 
                    ...oldDevice, 
                    online: update.online,
                    relayOn: update.relayOn,
                    currentPower: update.currentPower,
                    voltage: update.voltage,
                    temperature: update.temperature,
                    lastSeenAt: new Date(update.timestamp)
                };
                
                console.log(`🔄 ${oldDevice.name} actualizado en vista: ${oldDevice.relayOn ? 'ON' : 'OFF'} → ${update.relayOn ? 'ON' : 'OFF'} (${update.currentPower || 0}W)`);
                return updated;
            });
        });

        // Guardar referencia para evitar duplicados
        subscriptionRef.current = unsubscribe;
        console.log('✅ WebSocket tiempo real activo');
        
        return () => {
            if (subscriptionRef.current) {
                subscriptionRef.current();
                subscriptionRef.current = null;
            }
        };
    }, [subscribe, isConnected]); // Remover allPlugs.length de dependencias para evitar re-suscripciones

    // Debug del estado de conexión (solo log, sin polling)
    useEffect(() => {
        console.log(`🔌 Estado de conexión Socket.io: ${isConnected ? 'CONECTADO' : 'DESCONECTADO'}`);
    }, [isConnected]);

    // Calcular consumo total por credencial basado en TODOS los dispositivos (tiempo real)
    const credentialsWithPowerData = useMemo(() => {
        if (allPlugs.length === 0 || credentialsStatus.length === 0) {
            return credentialsStatus;
        }
        
        return credentialsStatus.map(credential => {
            // Usar TODOS los dispositivos para cálculo de consumo real
            const credentialDevices = allPlugs.filter(plug => 
                plug.credentialId === credential.id && 
                plug.online && 
                plug.relayOn && 
                plug.currentPower !== null && 
                plug.currentPower !== undefined
            );
            
            const totalPower = credentialDevices.reduce((sum, device) => 
                sum + (device.currentPower || 0), 0
            );
            
            const deviceCount = credentialDevices.length;
            
            return {
                ...credential,
                totalPower,
                deviceCount
            };
        });
    }, [allPlugs, credentialsStatus]);

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
                await fetchAllPlugs(); // También recargar lista completa
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
                await fetchAllPlugs(); // También recargar lista completa
            } else {
                const errorData = await response.json();
                toast.error(`Error al eliminar: ${errorData.error || 'Error desconocido'}`);
            }
        } catch (error) {
            toast.error("Error de conexión al eliminar el enchufe.");
        }
    };
    
    const handleEdit = useCallback(async (plug: SmartPlug) => {
        // Para enchufes con credencial, usar el modal avanzado
        if (plug.credential) {
            setSelectedDevice(plug);
            setIsEditModalOpen(true);
        } else {
            // Para enchufes sin credencial, usar el modal simple
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

    // Función para controlar dispositivo con actualización optimista y Socket.io
    const handleDeviceToggle = async (deviceId: string, turnOn: boolean) => {
        console.log(`🎛️ Controlando dispositivo ${deviceId}: ${turnOn ? 'ON' : 'OFF'}`);
        
        try {
            // Actualización optimista usando deviceId
            setPlugs(prev => prev.map(device => 
                device.deviceId === deviceId 
                    ? { ...device, relayOn: turnOn }
                    : device
            ));

            const response = await fetch(`/api/shelly/device/${deviceId}/control`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: turnOn ? 'on' : 'off' })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al controlar dispositivo');
            }

            const result = await response.json();
            console.log(`✅ Control exitoso para ${deviceId}:`, result);
            
            if (result.success) {
                toast.success(`Dispositivo ${turnOn ? 'encendido' : 'apagado'} correctamente`);
                
                // Solicitar actualización inmediata via Socket.io usando el ID interno
                const device = plugs.find(p => p.deviceId === deviceId);
                if (device) {
                    requestDeviceUpdate(device.id);
                }
            }
        } catch (error) {
            console.error(`❌ Error controlando dispositivo ${deviceId}:`, error);
            
            // Revertir cambio optimista en caso de error
            setPlugs(prev => prev.map(device => 
                device.deviceId === deviceId 
                    ? { ...device, relayOn: !turnOn }
                    : device
            ));
            
            toast.error('Error al controlar el dispositivo');
        }
    };

    // Función para test manual del monitoreo
    const handleTestMonitoring = async () => {
        try {
            console.log('🧪 Iniciando test manual de monitoreo...');
            const response = await fetch('/api/socket/start-monitoring', {
                method: 'POST'
            });
            
            const result = await response.json();
            console.log('📡 Resultado del test:', result);
            
            if (result.success) {
                toast.success('Monitoreo ejecutado correctamente');
            } else {
                toast.error('Error en el monitoreo: ' + (result.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('❌ Error en test de monitoreo:', error);
            toast.error('Error ejecutando el test de monitoreo');
        }
    };

    // Función para test completo del sistema WebSocket
    const handleTestCompleto = async () => {
        console.log('🧪 Ejecutando test completo...');
        try {
            const response = await fetch('/api/test-websocket', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            console.log('📊 Resultado del test completo:', result);
            
            if (result.success) {
                const data = result.data;
                alert(`Test completado exitosamente:\n\n` +
                    `📊 Credenciales: ${data.credentials} (${data.connectedCredentials} conectadas)\n` +
                    `🔗 Conexiones WebSocket: ${data.connections} (${data.shellyConnections} Shelly + ${data.socketIoConnections} Socket.io)\n` +
                    `🔌 Dispositivos: ${data.devices} (${data.onlineDevices} online)\n` +
                    `📝 Logs recientes: ${data.recentLogs}`);
            } else {
                alert(`Error en test: ${result.error}`);
            }
        } catch (error) {
            console.error('❌ Error ejecutando test completo:', error);
            alert('Error ejecutando test completo');
        }
    };

    // Memoizar funciones para evitar re-renders
    const memoizedHandleDelete = useCallback((id: string) => handleDelete(id), []);
    const memoizedHandleEdit = useCallback((plug: SmartPlug) => handleEdit(plug), []);
    const memoizedHandleControl = useCallback((plugId: string, plugIp: string, action: 'on' | 'off') => handleControl(plugId, plugIp, action), []);
    const memoizedHandleToggleExclusion = useCallback((plugId: string, currentExcluded: boolean) => handleToggleExclusion(plugId, currentExcluded), []);

    const columns = useMemo<ColumnDef<SmartPlug>[]>(() => {
        // Solo log cuando realmente cambian las dependencias importantes
        return [
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
                        <div className="mb-2">
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
                        
                        {/* Métricas en tiempo real - Solo cuando está encendido */}
                        {isOnline && actualRelayState && (
                            <div className="flex flex-col gap-1 text-xs">
                                {/* Potencia */}
                                {plug.currentPower !== null && plug.currentPower !== undefined && (
                                    <div className="flex gap-1 items-center">
                                        <Zap className="flex-shrink-0 w-3 h-3 text-yellow-600" />
                                        <span className="font-mono font-medium text-yellow-700">
                                            {plug.currentPower === 0 ? '000.0 W' : 
                                             plug.currentPower < 1 ? 
                                             `${plug.currentPower.toFixed(1).padStart(5, '0')} W` :
                                             `${plug.currentPower.toFixed(1).padStart(5, '0')} W`}
                                        </span>
                                    </div>
                                )}
                                
                                {/* Voltaje */}
                                {plug.voltage && (
                                    <div className="flex gap-1 items-center">
                                        <Plug className="flex-shrink-0 w-3 h-3 text-blue-600" />
                                        <span className="font-medium text-blue-700">
                                            {plug.voltage.toFixed(1)} V
                                        </span>
                                    </div>
                                )}
                                
                                {/* Temperatura */}
                                {plug.temperature && (
                                    <div className="flex gap-1 items-center">
                                        <Thermometer className="flex-shrink-0 w-3 h-3 text-red-600" />
                                        <span className="font-medium text-red-700">
                                            {plug.temperature.toFixed(1)}°C
                                        </span>
                                    </div>
                                )}
                            </div>
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
                        <DeviceControlButton
                            device={{
                                id: plug.deviceId, // Usar deviceId de Shelly, no el id interno
                                name: plug.name,
                                online: plug.online,
                                relayOn: plug.relayOn,
                                currentPower: plug.currentPower,
                                voltage: plug.voltage,
                                temperature: plug.temperature
                            }}
                            onToggle={handleDeviceToggle}
                            showMetrics={false}
                        />
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
    ];
    }, [t, memoizedHandleDelete, memoizedHandleEdit, memoizedHandleControl, activePlugs, memoizedHandleToggleExclusion]);

    const table = useReactTable({
        data: filteredPlugs,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    // Agregar indicador de conexión Socket.io en la UI con botón de test
    const connectionStatus = (
        <div className="flex gap-3 items-center">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                isConnected 
                    ? 'text-green-700 bg-green-100' 
                    : 'text-red-700 bg-red-100'
            }`}>
                <div className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                {isConnected ? 'Tiempo real conectado' : 'Desconectado'}
            </div>
            
            <Button
                onClick={handleTestMonitoring}
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-600 hover:bg-blue-50"
            >
                🧪 Test Monitoreo
            </Button>
            
            <Button
                onClick={handleTestCompleto}
                variant="outline"
                size="sm"
                className="text-purple-600 border-purple-600 hover:bg-purple-50"
            >
                🔍 Test Completo
            </Button>
        </div>
    );

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
                            {credentialsWithPowerData.map((credential) => (
                                <Badge 
                                    key={credential.id}
                                    className={`flex flex-col gap-1 items-center px-3 py-2 ${
                                        credential.status === 'connected' 
                                            ? 'bg-green-500 text-white' 
                                            : credential.status === 'expired'
                                            ? 'bg-amber-500 text-white'
                                            : 'bg-red-500 text-white'
                                    }`}
                                >
                                    <div className="flex gap-1 items-center">
                                        <div className={`w-2 h-2 rounded-full ${
                                            credential.status === 'connected' ? 'bg-white animate-pulse' : 'bg-white opacity-70'
                                        }`} />
                                        <span className="text-xs font-medium">{credential.name}</span>
                                    </div>
                                    
                                    {/* Mostrar consumo total cuando hay dispositivos activos */}
                                    {credential.totalPower && credential.totalPower > 0 && (
                                        <div className="flex gap-1 items-center text-xs">
                                            <Zap className="w-3 h-3" />
                                            <span className="font-mono">
                                                {credential.totalPower.toFixed(1)} W
                                            </span>
                                            <span className="opacity-75">
                                                ({credential.deviceCount} dispositivos)
                                            </span>
                                        </div>
                                    )}
                            </Badge>
                            ))}
                            
                            {credentialsWithPowerData.length === 0 && (
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
                                    const connectedCredentials = credentialsWithPowerData.filter(c => c.status === 'connected');
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
                                    await fetchAllPlugs(); // También recargar lista completa
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

                        {/* Contador de resultados y estado de sincronización */}
                        <div className="flex justify-between items-center">
                            <div className="text-sm text-gray-500">
                                {filteredPlugs.length} de {plugs.length} dispositivos (Página {pagination.page} de {pagination.totalPages})
                            </div>
                            {connectionStatus}
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
            
            {selectedDevice && (
                <DeviceEditModal
                    device={selectedDevice as any}
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setSelectedDevice(null);
                    }}
                    onSave={async (updatedDevice) => {
                        try {
                            const response = await fetch(`/api/internal/smart-plug-devices/${selectedDevice.id}`, { 
                                method: 'PUT', 
                                headers: {'Content-Type': 'application/json'}, 
                                body: JSON.stringify(updatedDevice) 
                            });
                            
                            if (response.ok) {
                                toast.success("Dispositivo actualizado correctamente.");
                                setIsEditModalOpen(false);
                                setSelectedDevice(null);
                                await fetchPlugs(pagination.page, pagination.pageSize, selectedCredentialFilter);
                                await fetchAllPlugs(); // También recargar lista completa
                            } else {
                                const errorData = await response.json();
                                toast.error(`Error al actualizar: ${errorData.error || 'Error desconocido'}`);
                            }
                        } catch (error) {
                            toast.error("Error de conexión al actualizar el dispositivo.");
                        }
                    }}
                />
            )}
        </div>
    );
};

export default SmartPlugsPage; 