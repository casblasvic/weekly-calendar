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
import { PaginationControls, PageSizeSelector } from '@/components/pagination-controls';
import { toast } from "sonner";
import { PlusCircle, Edit, Trash2, Play, StopCircle, Wifi, WifiOff, ArrowLeft, ArrowUpDown, ChevronUp, ChevronDown, Power, Settings, Activity, Thermometer, Zap, Plug, AlertTriangle, RefreshCw, Smartphone, Search, Building2, X, Cpu } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { ColumnDef, flexRender, getCoreRowModel, getSortedRowModel, SortingState, useReactTable } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";

import { useSession } from "next-auth/react";
import { DeviceConfigModalV2 } from '@/components/shelly/device-config-modal-v2';
import { SimplePowerButton } from '@/components/ui/simple-power-button';
import useSocket from '@/hooks/useSocket';
import { useIntegrationModules } from '@/hooks/use-integration-modules';
import { isSmartPlug, getSmartPlugInfo } from '@/utils/shelly-device-utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

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
    // ✅ NUEVA ESTRUCTURA: equipmentClinicAssignment
    equipmentClinicAssignmentId?: string;
    equipmentClinicAssignment?: {
        id: string;
        clinicId: string;
        deviceName?: string;
        serialNumber?: string; // ✅ INCLUIR serialNumber para formato completo
        equipment: {
            id: string;
            name: string;
        };
        clinic: {
            id: string;
            name: string;
        };
    };
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
    appointmentOnlyMode?: boolean;
    autoShutdownEnabled?: boolean;
    systemId: string;
    integrationId: string;
    createdAt: Date | string;
    updatedAt: Date | string;
}

interface Equipment {
    id: string;
    name: string;
    clinicId: string;
    assignmentId?: string; // ID de la asignación para la nueva estructura
}

interface Clinic { id: string; name: string; }

const SIDEBAR_WIDTH = "16rem"; // 256px

const SmartPlugsPage = () => {
    const { t } = useTranslation();
    const router = useRouter();
    const { data: session } = useSession();
    const { subscribe, isConnected, requestDeviceUpdate } = useSocket(session?.user?.systemId);
    
    // 🛡️ VERIFICACIÓN DE MÓDULO - Control total de acceso a funcionalidad Shelly
    const { isShellyActive, isLoading: isLoadingModules } = useIntegrationModules();
    
    // Estados existentes
    const [plugs, setPlugs] = useState<SmartPlug[]>([]); // Dispositivos de la vista actual (paginados/filtrados)
    const [allPlugs, setAllPlugs] = useState<SmartPlug[]>([]); // TODOS los dispositivos para cálculo de consumo
    const [isLoading, setIsLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState<SmartPlug | null>(null);

    const [sorting, setSorting] = useState<SortingState>([]);
    
    // Estados para paginación
    const [pagination, setPagination] = useState({ page: 1, pageSize: 50, totalPages: 1, totalCount: 0 });
    
    // Estados para el modal
    const [clinics, setClinics] = useState<Clinic[]>([]);
    
    // Estados para filtros
    const [availableCredentials, setAvailableCredentials] = useState<{id: string; name: string}[]>([]);
    const [selectedCredentialFilter, setSelectedCredentialFilter] = useState<string>('all');
    const [onlineFilter, setOnlineFilter] = useState<string>('all'); // all, online, offline
    const [relayStatusFilter, setRelayStatusFilter] = useState<string>('all'); // all, on, off
    const [clinicFilter, setClinicFilter] = useState<string>('all'); // all, clinic ids, 'unassigned'
    const [searchText, setSearchText] = useState<string>('');
    const [equipmentFilter, setEquipmentFilter] = useState<string>('all');
    const [equipmentSearchText, setEquipmentSearchText] = useState<string>('');
    const [generationFilter, setGenerationFilter] = useState<string[]>([]); // Filtro de selección múltiple por generación
    const [showOnlySmartPlugs, setShowOnlySmartPlugs] = useState<boolean>(true); // 🔌 NUEVO: Filtro para mostrar solo enchufes inteligentes (activo por defecto)
    
    // Estados para credenciales en tiempo real
    const [credentialsStatus, setCredentialsStatus] = useState<{
        id: string; 
        name: string; 
        status: 'connected' | 'error' | 'expired';
        // 🔌 NUEVO: Campos de estado WebSocket
        webSocketStatus: 'connected' | 'disconnected' | 'error' | 'connecting';
        webSocketAutoReconnect: boolean;
        webSocketLastPing: string | null;
        webSocketError: string | null;
        connectionStatus: 'connected' | 'disconnected' | 'error' | 'expired';
        canConnectWebSocket: boolean;
        totalPower?: number;
        deviceCount?: number;
    }[]>([]);
    
    // Estados para equipos disponibles en filtros
    const [allEquipment, setAllEquipment] = useState<{id: string; name: string; clinicName: string}[]>([]);

    // 🔌 NUEVO: Estados de loading para conectar WebSocket
    const [connectingWebSocket, setConnectingWebSocket] = useState<{[credentialId: string]: boolean}>({});
    const [syncingDevices, setSyncingDevices] = useState(false);

    // 🔄 TIEMPO REAL - Escuchar cambios en dispositivos Shelly
    const systemId = session?.user?.systemId || '';

    // 🎯 LÓGICA SIMPLE: WebSocket + mensajes recibidos
    const messagesReceivedRef = useRef<Set<string>>(new Set());
    const lastMessageTimeRef = useRef<number>(Date.now());



    const fetchPlugs = useCallback(async (page = 1, pageSize = 50, credentialFilter = 'all') => {
        setIsLoading(true);
        try {
            let url = `/api/internal/smart-plug-devices?page=${page}&pageSize=${pageSize}`;
            if (credentialFilter !== 'all') {
                url += `&credentialId=${credentialFilter}`;
            }
            const response = await fetch(url, {
                cache: 'no-store', // ← FORZAR SIN CACHE
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            
            // ✅ MANEJO DE ERRORES DE AUTENTICACIÓN
            if (response.status === 401 || response.status === 403) {
                console.error('❌ Sesión expirada, redirigiendo al login...');
                window.location.href = '/login';
                return;
            }
            
            if (response.ok) {
                const { data, totalPages, totalCount } = await response.json();
                
                // Datos cargados desde la API
                
                setPlugs(data);
                setPagination({ page, pageSize, totalPages, totalCount });
                console.log(`📄 Página ${page} cargada con ${data.length} dispositivos (WebSocket se encargará de actualizaciones)`);
            } else {
                // ✅ MANEJO DE OTROS ERRORES
                const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
                console.error('❌ Error cargando dispositivos:', errorData.error);
                toast.error(`Error cargando dispositivos: ${errorData.error}`);
            }
        } catch (error) {
            console.error('❌ Error de conexión cargando dispositivos:', error);
            toast.error('Error de conexión al cargar dispositivos');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Función para cargar TODOS los dispositivos (para cálculo de consumo en tiempo real)
    const fetchAllPlugs = useCallback(async () => {
        try {
            console.log('📥 Cargando TODOS los dispositivos para cálculo de consumo...');
            const response = await fetch('/api/internal/smart-plug-devices?page=1&pageSize=1000', {
                cache: 'no-store', // ← FORZAR SIN CACHE
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            }); // Sin paginación
            
            // ✅ MANEJO DE ERRORES DE AUTENTICACIÓN
            if (response.status === 401 || response.status === 403) {
                console.error('❌ Sesión expirada, redirigiendo al login...');
                window.location.href = '/login';
                return [];
            }
            
            if (response.ok) {
                const { data } = await response.json();
                console.log(`📊 Cargados ${data.length} dispositivos totales`);
                setAllPlugs(data);
                return data;
            } else {
                // ✅ MANEJO DE OTROS ERRORES
                const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
                console.error('❌ Error cargando todos los dispositivos:', errorData.error);
                toast.error(`Error cargando dispositivos: ${errorData.error}`);
            }
        } catch (error) {
            console.error('❌ Error de conexión cargando todos los dispositivos:', error);
            toast.error('Error de conexión al cargar dispositivos');
        }
        return [];
    }, []);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [clinicsResponse, equipmentResponse] = await Promise.all([
                    fetch('/api/internal/clinics/list'),
                    fetch('/api/equipment') // API existente para obtener todos los equipos
                ]);
                
                // ✅ MANEJO DE ERRORES DE AUTENTICACIÓN
                if (clinicsResponse.status === 401 || clinicsResponse.status === 403 ||
                    equipmentResponse.status === 401 || equipmentResponse.status === 403) {
                    console.error('❌ Sesión expirada, redirigiendo al login...');
                    window.location.href = '/login';
                    return;
                }
                
                if (clinicsResponse.ok) setClinics(await clinicsResponse.json());
                if (equipmentResponse.ok) {
                    const equipment = await equipmentResponse.json();
                    setAllEquipment(equipment.map((eq: any) => ({
                        id: eq.id,
                        name: eq.name,
                        clinicName: eq.clinic?.name || 'Sin clínica'
                    })));
                }
                // 🔌 NUEVO: Cargar credenciales con estado de WebSocket
                await fetchCredentialsStatus();
            } catch (error) {
                console.error('❌ Error cargando datos iniciales:', error);
                toast.error('Error de conexión al cargar datos iniciales');
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

        // 🔌 NUEVO: Filtro por tipo de dispositivo (solo enchufes inteligentes)
        if (showOnlySmartPlugs) {
            filtered = filtered.filter(plug => isSmartPlug(plug.modelCode));
        }

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

        // 🆕 Filtro por generación (selección múltiple)
        if (generationFilter.length > 0) {
            filtered = filtered.filter(plug => {
                const generation = plug.generation || 'Desconocida';
                return generationFilter.includes(generation);
            });
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
    }, [plugs, selectedCredentialFilter, onlineFilter, relayStatusFilter, clinicFilter, equipmentFilter, generationFilter, searchText, showOnlySmartPlugs]);

    // 🆕 Memo para obtener generaciones disponibles
    const availableGenerations = useMemo(() => {
        const generations = new Set<string>();
        plugs.forEach(plug => {
            const generation = plug.generation || 'Desconocida';
            generations.add(generation);
        });
        return Array.from(generations).sort();
    }, [plugs]);

    // Efecto para recargar cuando cambia el filtro de credencial (solo este necesita API)
    useEffect(() => {
        fetchPlugs(1, pagination.pageSize, selectedCredentialFilter);
    }, [selectedCredentialFilter, fetchPlugs, pagination.pageSize]);



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
            
            // Ignorar eventos masivos (deviceId==='ALL') que no contienen estado específico
            if (update.deviceId === 'ALL') {
                return;
            }
            
            // 🎯 TRACKING: Marcar mensaje recibido (para compatibilidad con código existente)
            messagesReceivedRef.current.add(update.deviceId);
            lastMessageTimeRef.current = Date.now();
            
            // También agregarlo por si se busca por ID interno
            const foundDevice = allPlugs.find(d => d.deviceId === update.deviceId);
            if (foundDevice) {
                messagesReceivedRef.current.add(foundDevice.id);
            }
            
            // 📡 Datos recibidos por WebSocket - dispositivo está activo
            
            // Función helper para actualizar un dispositivo en lista completa (solo para consumo)
            const updateDeviceInList = (prev: SmartPlug[], listName: string) => {
                
                // Si la lista está vacía, simplemente no hacer nada
                if (prev.length === 0) {
                    console.log(`📦 [DEBUG] Lista ${listName} vacía, no se puede actualizar aún`);
                    return prev;
                }
                
                const deviceIndex = prev.findIndex(device => 
                    device.id === update.deviceId || device.deviceId === update.deviceId
                );
                
                if (deviceIndex === -1) {
                    return prev;
                }
                
                const oldDevice = prev[deviceIndex];
                
                // Verificar cambios reales (incluyendo validez de datos)
                const hasChanges = (
                    Boolean(oldDevice.online) !== Boolean(update.online) ||
                    Boolean(oldDevice.relayOn) !== Boolean(update.relayOn) ||
                    // Para currentPower, considerar null como un cambio válido
                    (oldDevice.currentPower !== update.currentPower) ||
                    Number(oldDevice.voltage || 0) !== Number(update.voltage || 0) ||
                    Number(oldDevice.temperature || 0) !== Number(update.temperature || 0)
                );
                
                if (!hasChanges) {
                    return prev;
                }
                
                // Actualizar dispositivo
                const updated = [...prev];
                const updatedDevice = { 
                    ...oldDevice, 
                    online: update.online,
                    relayOn: update.relayOn,
                    currentPower: update.currentPower,
                    voltage: update.voltage,
                    temperature: update.temperature,
                    lastSeenAt: new Date(update.timestamp)
                };
                updated[deviceIndex] = updatedDevice;
                
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
                    console.log('🔍 [DEBUG] Dispositivo no está en página actual');
                    return prev;
                }
                
                const oldDevice = prev[deviceIndex];
                
                // Verificar si hay cambios reales (incluyendo validez de datos)
                const hasChanges = (
                    Boolean(oldDevice.online) !== Boolean(update.online) ||
                    Boolean(oldDevice.relayOn) !== Boolean(update.relayOn) ||
                    // Para currentPower, considerar null como un cambio válido
                    (oldDevice.currentPower !== update.currentPower) ||
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
    }, [subscribe, isConnected]);

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
            // Usar TODOS los dispositivos para cálculo de consumo real (solo los que tienen datos válidos)
            const credentialDevices = allPlugs.filter(plug => 
                plug.credentialId === credential.id && 
                plug.online && 
                plug.relayOn && 
                plug.currentPower !== null && 
                plug.currentPower !== undefined &&
                plug.currentPower > 0.1  // ✅ Solo dispositivos con consumo real y dato válido
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
        console.log('🔍 [DEBUG handleEdit] Editando plug:', plug.name);
        // Usar siempre el modal avanzado que tiene toda la funcionalidad
        setSelectedDevice(plug);
        setIsEditModalOpen(true);
    }, []);



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

    // Función para controlar dispositivo - SIMPLE y DIRECTO
    const handleDeviceToggle = async (deviceId: string, turnOn: boolean) => {
        console.log(`🎯 [TOGGLE] Iniciando control ${turnOn ? 'ON' : 'OFF'} para ${deviceId}`);

            const response = await fetch(`/api/shelly/device/${deviceId}/control`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action: turnOn ? 'on' : 'off' })
            });

        if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error desconocido');
            }

        const result = await response.json();
        console.log('✅ [TOGGLE] Control exitoso:', result);
        toast.success(`Dispositivo ${turnOn ? 'encendido' : 'apagado'} correctamente`);
        
        // ¡YA ESTÁ! Sin timers, sin esperas artificiales
        // WebSocket actualizará el estado automáticamente
    };

    // Memoizar funciones para evitar re-renders
    const memoizedHandleDelete = useCallback((id: string) => handleDelete(id), []);
    const memoizedHandleEdit = useCallback((plug: SmartPlug) => handleEdit(plug), []);
    const memoizedHandleToggleExclusion = useCallback((plugId: string, currentExcluded: boolean) => handleToggleExclusion(plugId, currentExcluded), []);

    const columns = useMemo<ColumnDef<SmartPlug>[]>(() => {
        return [
        // 🆕 NUEVA COLUMNA: Nombre del dispositivo (PRIMERA POSICIÓN)
        {
            accessorKey: 'name',
            enableSorting: true,
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="h-8 p-0 text-xs font-medium text-left hover:bg-transparent"
                >
                    Nombre del Dispositivo
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                    {column.getIsSorted() === "asc" && <ChevronUp className="ml-1 h-3 w-3" />}
                    {column.getIsSorted() === "desc" && <ChevronDown className="ml-1 h-3 w-3" />}
                </Button>
            ),
            cell: ({ row }) => {
                const plug = row.original;
                const isPlugDevice = isSmartPlug(plug.modelCode);
                const plugInfo = getSmartPlugInfo(plug.modelCode);
                
                return (
                    <div className="text-left">
                        <div className="flex items-center gap-2">
                            {/* 🔌 ICONO DE ENCHUFE: Solo para enchufes inteligentes */}
                            {isPlugDevice ? (
                                <div className="flex-shrink-0 p-1 bg-blue-50 rounded-md" title={plugInfo?.name || 'Enchufe Inteligente'}>
                                    <Plug className="w-4 h-4 text-blue-600" />
                                </div>
                            ) : (
                                <div className="flex-shrink-0 p-1 bg-gray-50 rounded-md" title="Otro dispositivo Shelly">
                                    <Cpu className="w-4 h-4 text-gray-600" />
                                </div>
                            )}
                            <div className="text-sm font-medium max-w-[140px] truncate" title={plug.name}>
                                {plug.name}
                            </div>
                        </div>
                        {/* Información adicional del modelo */}
                        {isPlugDevice && plugInfo && (
                            <div className="text-xs text-gray-500 mt-0.5 ml-6">
                                {plugInfo.name} • Gen {plugInfo.generation}
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'equipmentClinicAssignment.equipment.name',
            enableSorting: true,
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="h-8 p-0 text-xs font-medium text-left hover:bg-transparent"
                >
                    {t('integrations.smart_plugs.table.equipment')}
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                    {column.getIsSorted() === "asc" && <ChevronUp className="ml-1 h-3 w-3" />}
                    {column.getIsSorted() === "desc" && <ChevronDown className="ml-1 h-3 w-3" />}
                </Button>
            ),
            cell: ({ row }) => {
                const plug = row.original;
                // ✅ SOLO ALIAS SIN ICONOS ADICIONALES
                if (plug.equipmentClinicAssignment) {
                    const alias = plug.equipmentClinicAssignment.deviceName || plug.equipmentClinicAssignment.equipment.name;
                    
                    return (
                        <div className="text-left">
                            <div className="text-sm font-medium leading-tight max-w-[140px] truncate" title={alias}>
                                {alias}
                            </div>
                        </div>
                    );
                }
                
                // Fallback para compatibilidad hacia atrás
                const fallbackName = plug.equipment?.name || 'N/A';
                return (
                    <div className="text-left">
                        <div className="text-sm max-w-[140px] truncate" title={fallbackName}>{fallbackName}</div>
                    </div>
                                );
            },
        },
        {
            accessorKey: 'equipmentClinicAssignment.clinic.name',
            enableSorting: true,
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="h-8 p-0 text-xs font-medium text-left hover:bg-transparent"
                >
                    {t('integrations.smart_plugs.table.clinic')}
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                    {column.getIsSorted() === "asc" && <ChevronUp className="ml-1 h-3 w-3" />}
                    {column.getIsSorted() === "desc" && <ChevronDown className="ml-1 h-3 w-3" />}
                </Button>
            ),
            cell: ({ row }) => {
                const plug = row.original;
                const clinicName = plug.equipmentClinicAssignment?.clinic?.name || 
                                 plug.equipment?.clinic?.name || 
                                 'N/A';
                return (
                    <div className="text-left text-sm max-w-[120px]">
                        <div className="truncate" title={clinicName}>
                            {clinicName}
                        </div>
                    </div>
                                );
            },
        },
        {
            accessorKey: 'online',
            enableSorting: true,
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="h-8 p-0 text-xs font-medium text-left hover:bg-transparent"
                >
                    Online
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                    {column.getIsSorted() === "asc" && <ChevronUp className="ml-1 h-3 w-3" />}
                    {column.getIsSorted() === "desc" && <ChevronDown className="ml-1 h-3 w-3" />}
                </Button>
            ),
            cell: ({ row }) => {
                const plug = row.original;
                const isOnline = plug.online;
                
                return (
                    <div className="text-left">
                        {isOnline ? (
                            <Badge className="text-white bg-green-500 text-xs px-2 py-0.5">
                                <Wifi className="mr-1 w-2.5 h-2.5" />
                                Online
                            </Badge>
                        ) : (
                            <Badge className="text-white bg-red-500 text-xs px-2 py-0.5">
                                <WifiOff className="mr-1 w-2.5 h-2.5" />
                                Offline
                            </Badge>
                        )}
                    </div>
                );
            }
        },
        {
            accessorKey: 'relayOn',
            enableSorting: true,
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="h-8 p-0 text-xs font-medium text-left hover:bg-transparent"
                >
                    Estado
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                    {column.getIsSorted() === "asc" && <ChevronUp className="ml-1 h-3 w-3" />}
                    {column.getIsSorted() === "desc" && <ChevronDown className="ml-1 h-3 w-3" />}
                </Button>
            ),
            cell: ({ row }) => {
                const plug = row.original;
                const isOnline = plug.online;
                const relayOn = plug.relayOn;
                
                // Si está offline, no puede estar encendido
                const actualRelayState = isOnline ? relayOn : false;
                
                // ✅ ESTRATEGIA DOS NIVELES: Solo mostrar consumo si hay dato válido
                const hasValidConsumption = plug.currentPower !== null && 
                                          plug.currentPower !== undefined;
                const hasRealPower = hasValidConsumption && plug.currentPower > 0.1;
                
                return (
                    <div className="text-left">
                        <div className="mb-1">
                        {actualRelayState ? (
                            <Badge className="text-white bg-green-500 text-xs px-2 py-0.5 flex items-center gap-1 w-fit">
                                <Power className="w-2.5 h-2.5" />
                                <span>ON</span>
                                
                                {/* ⚡ ESTRATEGIA DOS NIVELES: Solo mostrar si hay dato válido */}
                                {isOnline && hasValidConsumption && hasRealPower && (
                                    <>
                                        <Zap className="w-3 h-3 text-yellow-600" />
                                        <span className="font-mono text-xs font-medium">
                                            {plug.currentPower!.toFixed(1)}W
                                        </span>
                                    </>
                                )}
                                {/* Cuando no hay consumo válido, simplemente no mostrar nada */}
                            </Badge>
                        ) : (
                            <Badge className="text-white bg-gray-500 text-xs px-2 py-0.5 flex items-center gap-1 w-fit">
                                <Power className="w-2.5 h-2.5" />
                                <span>OFF</span>
                            </Badge>
                            )}
                        </div>
                        
                        {/* Métricas adicionales debajo - Solo voltaje y temperatura cuando está encendido */}
                        {isOnline && actualRelayState && (
                            <div className="flex flex-col gap-0.5 text-[10px] leading-none">
                                {/* Voltaje con 1 decimal como especificas */}
                                {plug.voltage && (
                                    <div className="flex gap-1 items-center">
                                        <Plug className="flex-shrink-0 w-2 h-2 text-blue-600" />
                                        <span className="font-medium text-blue-700">
                                            {plug.voltage.toFixed(1)}V
                                        </span>
                                    </div>
                                )}
                                
                                {/* Temperatura */}
                                {plug.temperature && (
                                    <div className="flex gap-1 items-center">
                                        <Thermometer className="flex-shrink-0 w-2 h-2 text-red-600" />
                                        <span className="font-medium text-red-700">
                                            {plug.temperature.toFixed(0)}°C
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
            accessorKey: 'appointmentOnlyMode',
            enableSorting: false,
            header: () => <div className="text-xs font-medium text-center">Auto On</div>,
            cell: ({ row }) => {
                const plug = row.original;
                const isEnabled = plug.appointmentOnlyMode ?? true; // Default true
                
                return (
                    <div className="flex justify-center">
                        <button
                            onClick={async () => {
                                // 🚀 RENDERIZADO OPTIMISTA: Cambio inmediato
                                const newValue = !isEnabled;
                                
                                setPlugs(prev => prev.map(p => 
                                    p.id === plug.id 
                                        ? { ...p, appointmentOnlyMode: newValue }
                                        : p
                                ));
                                setAllPlugs(prev => prev.map(p => 
                                    p.id === plug.id 
                                        ? { ...p, appointmentOnlyMode: newValue }
                                        : p
                                ));

                                try {
                                    const response = await fetch(`/api/internal/smart-plug-devices/${plug.id}/toggle-appointment-only`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ appointmentOnlyMode: newValue })
                                    });
                                    
                                    if (response.ok) {
                                        toast.success(`Auto On ${newValue ? 'activado' : 'desactivado'}`);
                                    } else {
                                        // ❌ ROLLBACK: Revertir al estado original
                                        setPlugs(prev => prev.map(p => 
                                            p.id === plug.id 
                                                ? { ...p, appointmentOnlyMode: isEnabled }
                                                : p
                                        ));
                                        setAllPlugs(prev => prev.map(p => 
                                            p.id === plug.id 
                                                ? { ...p, appointmentOnlyMode: isEnabled }
                                                : p
                                        ));
                                        
                                        const errorData = await response.json();
                                        toast.error(errorData.error || 'Error al actualizar configuración');
                                    }
                                } catch (error) {
                                    // ❌ ROLLBACK: Revertir al estado original (error de red)
                                    setPlugs(prev => prev.map(p => 
                                        p.id === plug.id 
                                            ? { ...p, appointmentOnlyMode: isEnabled }
                                            : p
                                    ));
                                    setAllPlugs(prev => prev.map(p => 
                                        p.id === plug.id 
                                            ? { ...p, appointmentOnlyMode: isEnabled }
                                            : p
                                    ));
                                    
                                    toast.error('Error de conexión');
                                }
                            }}
                            className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                isEnabled 
                                    ? 'bg-green-500 focus:ring-green-500' 
                                    : 'bg-gray-300 focus:ring-gray-300'
                            }`}
                            title={isEnabled ? 'Auto On activado - solo se enciende desde citas' : 'Auto On desactivado - encendido libre'}
                        >
                            <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                isEnabled ? 'translate-x-4' : 'translate-x-0'
                            }`} />
                        </button>
                    </div>
                );
            },
        },
        {
            accessorKey: 'autoShutdownEnabled',
            enableSorting: false,
            header: () => <div className="text-xs font-medium text-center">Auto Off</div>,
            cell: ({ row }) => {
                const plug = row.original;
                const isEnabled = plug.autoShutdownEnabled ?? true; // Default true
                
                return (
                    <div className="flex justify-center">
                        <button
                            onClick={async () => {
                                // 🚀 RENDERIZADO OPTIMISTA: Cambio inmediato
                                const newValue = !isEnabled;
                                
                                setPlugs(prev => prev.map(p => 
                                    p.id === plug.id 
                                        ? { ...p, autoShutdownEnabled: newValue }
                                        : p
                                ));
                                setAllPlugs(prev => prev.map(p => 
                                    p.id === plug.id 
                                        ? { ...p, autoShutdownEnabled: newValue }
                                        : p
                                ));

                                try {
                                    const response = await fetch(`/api/internal/smart-plug-devices/${plug.id}/toggle-auto-shutdown`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ autoShutdownEnabled: newValue })
                                    });
                                    
                                    if (response.ok) {
                                        toast.success(`Auto Off ${newValue ? 'activado' : 'desactivado'}`);
                                    } else {
                                        // ❌ ROLLBACK: Revertir al estado original
                                        setPlugs(prev => prev.map(p => 
                                            p.id === plug.id 
                                                ? { ...p, autoShutdownEnabled: isEnabled }
                                                : p
                                        ));
                                        setAllPlugs(prev => prev.map(p => 
                                            p.id === plug.id 
                                                ? { ...p, autoShutdownEnabled: isEnabled }
                                                : p
                                        ));
                                        
                                        const errorData = await response.json();
                                        toast.error(errorData.error || 'Error al actualizar configuración');
                                    }
                                } catch (error) {
                                    // ❌ ROLLBACK: Revertir al estado original (error de red)
                                    setPlugs(prev => prev.map(p => 
                                        p.id === plug.id 
                                            ? { ...p, autoShutdownEnabled: isEnabled }
                                            : p
                                    ));
                                    setAllPlugs(prev => prev.map(p => 
                                        p.id === plug.id 
                                            ? { ...p, autoShutdownEnabled: isEnabled }
                                            : p
                                    ));
                                    
                                    toast.error('Error de conexión');
                                }
                            }}
                            className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                isEnabled 
                                    ? 'bg-blue-500 focus:ring-blue-500' 
                                    : 'bg-gray-300 focus:ring-gray-300'
                            }`}
                            title={isEnabled ? 'Auto Off activado - apagado automático' : 'Auto Off desactivado'}
                        >
                            <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                isEnabled ? 'translate-x-4' : 'translate-x-0'
                            }`} />
                        </button>
                    </div>
                );
            },
        },
        {
            id: 'actions',
            enableSorting: false,
            header: () => <div className="w-full text-right">{t('common.actions')}</div>,
            cell: ({ row }) => {
                const plug = row.original;
                
                return (
                    <div className="flex gap-2 justify-end items-center">
                        <SimplePowerButton
                            device={{
                                id: plug.deviceId, // ✅ Usar deviceId de Shelly para comandos
                                name: plug.name,
                                online: plug.online,
                                relayOn: plug.relayOn
                            }}
                            onToggle={handleDeviceToggle}
                        />
                        <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleToggleExclusion(plug.id, plug.excludeFromSync)}
                            className={`transition-all duration-300 ${
                                plug.excludeFromSync
                                    ? 'text-gray-500 hover:text-green-600 hover:bg-green-50' 
                                    : 'text-green-600 hover:text-gray-500 hover:bg-gray-50'
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
    }, [t, memoizedHandleDelete, memoizedHandleEdit, memoizedHandleToggleExclusion]);

    const table = useReactTable({
        data: filteredPlugs,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    // Indicador de conexión Socket.io limpio
    const connectionStatus = (
        <div className="flex gap-2 items-center px-3 py-1 text-sm rounded-full">
            <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className={isConnected ? 'text-green-700' : 'text-red-700'}>
                {isConnected ? 'Tiempo real conectado' : 'Desconectado'}
            </span>
        </div>
    );

    // 🔌 NUEVO: Función para conectar WebSocket de una credencial
    const toggleWebSocketConnection = async (credential: typeof credentialsWithPowerData[0]) => {
        // Si está conectado ⇒ desconectar, sino conectar
        const isConnectedCred = credential.connectionStatus === 'connected'
        setConnectingWebSocket(prev => ({ ...prev, [credential.id]: true }));

        try {
            const endpoint = isConnectedCred
              ? `/api/shelly/credentials/${credential.id}/disconnect-websocket`
              : `/api/shelly/credentials/${credential.id}/connect-websocket`;

            const response = await fetch(endpoint, { method: 'POST' });
            if (response.ok) {
                toast.success(`Conexión en tiempo real ${isConnectedCred ? 'desactivada' : 'activada'} exitosamente`);
                await fetchCredentialsStatus();
            } else {
                const errorData = await response.json();
                toast.error(errorData.error || 'Error en la operación');
            }
        } catch (error) {
            toast.error('Error de conexión');
        } finally {
            setTimeout(() => {
                setConnectingWebSocket(prev => ({ ...prev, [credential.id]: false }));
            }, 500);
        }
    };

    // 🔌 NUEVO: Función para cargar estado de credenciales
    const fetchCredentialsStatus = useCallback(async () => {
        try {
            const response = await fetch('/api/shelly/credentials');
            
            // ✅ MANEJO DE ERRORES DE AUTENTICACIÓN
            if (response.status === 401 || response.status === 403) {
                console.error('❌ Sesión expirada, redirigiendo al login...');
                window.location.href = '/login';
                return;
            }
            
            if (response.ok) {
                const credentials = await response.json();
                setAvailableCredentials(credentials.map((c: any) => ({ id: c.id, name: c.name })));
                setCredentialsStatus(credentials);
            } else {
                // ✅ MANEJO DE OTROS ERRORES
                const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
                console.error('❌ Error cargando credenciales:', errorData.error);
                toast.error(`Error cargando credenciales: ${errorData.error}`);
            }
        } catch (error) {
            console.error('❌ Error de conexión cargando credenciales:', error);
            toast.error('Error de conexión al cargar credenciales');
        }
    }, []);

    // 🛡️ MOSTRAR MENSAJE SI EL MÓDULO ESTÁ INACTIVO
    if (isLoadingModules) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="flex flex-col gap-3 items-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                    <p className="text-gray-500">Verificando módulos de integración...</p>
                </div>
            </div>
        );
    }

    if (!isShellyActive) {
        return (
            <div className="space-y-6">
                <Card className="mx-4">
                    <CardContent className="p-8">
                        <div className="flex flex-col gap-6 items-center text-center">
                            <div className="flex flex-col gap-3 items-center">
                                <div className="p-4 bg-amber-100 rounded-full">
                                    <AlertTriangle className="w-8 h-8 text-amber-600" />
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900">
                                    Módulo de Enchufes Inteligentes No Activo
                                </h2>
                                <p className="text-gray-600 max-w-md">
                                    El módulo de enchufes inteligentes Shelly no está activo en el marketplace. 
                                    Actívalo para acceder a la gestión de dispositivos inteligentes.
                                </p>
                            </div>
                            
                            <div className="flex gap-3">
                                <Button 
                                    variant="outline" 
                                    onClick={() => router.push('/configuracion/integraciones')}
                                    className="gap-2"
                                >
                                    <Settings className="w-4 h-4" />
                                    Ir al Marketplace
                                </Button>
                                <Button 
                                    variant="outline" 
                                    onClick={() => router.back()}
                                    className="gap-2"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    {t('common.back')}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

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
                            {/* Píldoras de estado de credenciales en tiempo real - DISEÑO MEJORADO */}
                            {credentialsWithPowerData.map((credential) => (
                                <div key={credential.id} className="flex gap-2 items-center">
                                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                                        credential.connectionStatus === 'connected' 
                                            ? 'text-green-700 bg-green-100' 
                                            : credential.connectionStatus === 'expired'
                                            ? 'text-amber-700 bg-amber-100'
                                            : 'text-red-700 bg-red-100'
                                    }`}>
                                        <div className={`w-2 h-2 rounded-full ${
                                            credential.connectionStatus === 'connected' 
                                                ? 'bg-green-500 animate-pulse' 
                                                : credential.connectionStatus === 'expired'
                                                ? 'bg-amber-500'
                                                : 'bg-red-500'
                                        }`} />
                                        <span className="text-xs font-medium">{credential.name}</span>
                                        
                                        {/* Mostrar consumo total solo cuando hay dispositivos activos y consumo real > 0.1W */}
                                        {credential.connectionStatus === 'connected' && 
                                         credential.totalPower > 0.1 && 
                                         credential.deviceCount > 0 && (
                                            <div className="flex gap-1 items-center">
                                                <Zap className="w-3 h-3 text-yellow-600" />
                                                <span className="font-mono text-xs font-medium">
                                                    {credential.totalPower.toFixed(1)}W
                                                </span>
                                                <span className="text-xs opacity-75">
                                                    ({credential.deviceCount})
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Botón Power para conectar/desconectar */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => toggleWebSocketConnection(credential)}
                                        disabled={connectingWebSocket[credential.id]}
                                        className={`${credential.connectionStatus === 'connected' ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'} p-1`}
                                        title={credential.connectionStatus === 'connected' ? 'Desactivar conexión en tiempo real' : 'Activar conexión en tiempo real'}
                                    >
                                        <Power className={`w-3 h-3 ${connectingWebSocket[credential.id] ? 'animate-pulse' : ''}`} />
                                    </Button>
                                </div>
                            ))}
                            
                            {credentialsWithPowerData.length === 0 && (
                                <div className="flex gap-2 items-center px-3 py-1 text-sm text-gray-700 bg-gray-100 rounded-full">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full" />
                                    <span className="text-xs">Sin credenciales</span>
                                </div>
                            )}


                            
                            {/* Botón de sincronizar dispositivos INTELIGENTE */}
                            {(() => {
                                const connectedCredentials = credentialsWithPowerData.filter(c => c.connectionStatus === 'connected');
                                
                                if (connectedCredentials.length === 0) {
                                    return (
                                        <Button 
                                            variant="outline"
                                            size="sm" 
                                            disabled
                                            className="px-3 py-1 text-gray-400 border-gray-200"
                                            title="No hay credenciales conectadas"
                                        >
                                            <Smartphone className="mr-1 w-4 h-4" />
                                            Dispositivos
                                        </Button>
                                    );
                                }
                                
                                if (connectedCredentials.length === 1) {
                                    // Una sola cuenta: botón simple
                                    return (
                                        <Button 
                                            variant="outline"
                                            size="sm" 
                                            onClick={async () => {
                                                setSyncingDevices(true);
                                                
                                                try {
                                                    const credential = connectedCredentials[0];
                                                    const response = await fetch(`/api/shelly/sync/${credential.id}`, {
                                                        method: 'POST'
                                                    });
                                                    
                                                    if (response.ok) {
                                                        toast.success(`Dispositivos sincronizados para ${credential.name}`);
                                                    } else {
                                                        const errorData = await response.json();
                                                        toast.error(errorData.error || `Error sincronizando ${credential.name}`);
                                                    }
                                                    
                                                    // Recargar dispositivos después de sincronizar
                                                    await fetchPlugs(pagination.page, pagination.pageSize, selectedCredentialFilter);
                                                    await fetchAllPlugs();
                                                } catch (error) {
                                                    toast.error(`Error de conexión sincronizando ${connectedCredentials[0].name}`);
                                                } finally {
                                                    setTimeout(() => {
                                                        setSyncingDevices(false);
                                                    }, 500);
                                                }
                                            }}
                                            disabled={syncingDevices}
                                            className="px-3 py-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                                            title={`Sincronizar dispositivos de ${connectedCredentials[0].name}`}
                                        >
                                            <Smartphone className={`mr-1 w-4 h-4 ${syncingDevices ? 'animate-bounce' : ''}`} />
                                            {syncingDevices ? 'Sincronizando...' : 'Dispositivos'}
                                        </Button>
                                    );
                                }
                                
                                // Múltiples cuentas: dropdown
                                return (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button 
                                                variant="outline"
                                                size="sm" 
                                                disabled={syncingDevices}
                                                className="px-3 py-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                                                title="Sincronizar dispositivos"
                                            >
                                                <Smartphone className={`mr-1 w-4 h-4 ${syncingDevices ? 'animate-bounce' : ''}`} />
                                                {syncingDevices ? 'Sincronizando...' : 'Dispositivos'}
                                                <ChevronDown className="ml-1 w-3 h-3" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-56">
                                            <DropdownMenuItem
                                                onClick={async () => {
                                                    setSyncingDevices(true);
                                                    
                                                    try {
                                                        let successCount = 0;
                                                        let errorCount = 0;
                                                        
                                                        for (const credential of connectedCredentials) {
                                                            try {
                                                                const response = await fetch(`/api/shelly/sync/${credential.id}`, {
                                                                    method: 'POST'
                                                                });
                                                                
                                                                if (response.ok) {
                                                                    successCount++;
                                                                } else {
                                                                    errorCount++;
                                                                    const errorData = await response.json();
                                                                    console.error(`Error sincronizando ${credential.name}:`, errorData.error);
                                                                }
                                                            } catch (error) {
                                                                errorCount++;
                                                                console.error(`Error de conexión sincronizando ${credential.name}:`, error);
                                                            }
                                                        }
                                                        
                                                        if (successCount > 0) {
                                                            toast.success(`${successCount} cuenta(s) sincronizada(s) exitosamente`);
                                                        }
                                                        if (errorCount > 0) {
                                                            toast.error(`${errorCount} cuenta(s) con errores de sincronización`);
                                                        }
                                                        
                                                        // Recargar dispositivos después de sincronizar
                                                        await fetchPlugs(pagination.page, pagination.pageSize, selectedCredentialFilter);
                                                        await fetchAllPlugs();
                                                    } finally {
                                                        setTimeout(() => {
                                                            setSyncingDevices(false);
                                                        }, 500);
                                                    }
                                                }}
                                                className="font-medium"
                                            >
                                                <Smartphone className="mr-2 w-4 h-4" />
                                                Sincronizar todas las cuentas ({connectedCredentials.length})
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            {connectedCredentials.map((credential) => (
                                                <DropdownMenuItem
                                                    key={credential.id}
                                                    onClick={async () => {
                                                        setSyncingDevices(true);
                                                        
                                                        try {
                                                            const response = await fetch(`/api/shelly/sync/${credential.id}`, {
                                                                method: 'POST'
                                                            });
                                                            
                                                            if (response.ok) {
                                                                toast.success(`Dispositivos sincronizados para ${credential.name}`);
                                                            } else {
                                                                const errorData = await response.json();
                                                                toast.error(errorData.error || `Error sincronizando ${credential.name}`);
                                                            }
                                                            
                                                            // Recargar dispositivos después de sincronizar
                                                            await fetchPlugs(pagination.page, pagination.pageSize, selectedCredentialFilter);
                                                            await fetchAllPlugs();
                                                        } catch (error) {
                                                            toast.error(`Error de conexión sincronizando ${credential.name}`);
                                                        } finally {
                                                            setTimeout(() => {
                                                                setSyncingDevices(false);
                                                            }, 500);
                                                        }
                                                    }}
                                                >
                                                    <div className={`w-2 h-2 rounded-full mr-2 ${
                                                        credential.connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
                                                    }`} />
                                                    {credential.name}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                );
                            })()}
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

                            {/* 🔌 NUEVO: Filtro Solo Enchufes Inteligentes */}
                            <div className="flex gap-2 items-center p-2 bg-blue-50 rounded-lg border border-blue-200">
                                <Checkbox
                                    id="smart-plugs-only"
                                    checked={showOnlySmartPlugs}
                                    onCheckedChange={(checked) => setShowOnlySmartPlugs(checked === true)}
                                    className="border-blue-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                />
                                <label 
                                    htmlFor="smart-plugs-only" 
                                    className="text-sm font-medium text-blue-700 cursor-pointer flex gap-1 items-center"
                                >
                                    <Plug className="w-3 h-3" />
                                    Solo enchufes inteligentes
                                </label>
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

                            {/* 🆕 Filtro Generación (selección múltiple) */}
                            {availableGenerations.length > 0 && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="justify-between w-48">
                                            <span className="flex gap-2 items-center">
                                                <Cpu className="w-4 h-4" />
                                                {generationFilter.length === 0 
                                                    ? "Todas las generaciones" 
                                                    : generationFilter.length === 1 
                                                        ? `Gen ${generationFilter[0]}`
                                                        : `${generationFilter.length} generaciones`
                                                }
                                            </span>
                                            <ChevronDown className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-48">
                                        <DropdownMenuLabel>Filtrar por generación</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {availableGenerations.map((generation) => (
                                            <DropdownMenuCheckboxItem
                                                key={generation}
                                                checked={generationFilter.includes(generation)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setGenerationFilter(prev => [...prev, generation]);
                                                    } else {
                                                        setGenerationFilter(prev => prev.filter(g => g !== generation));
                                                    }
                                                }}
                                            >
                                                <div className="flex gap-2 items-center">
                                                    <Cpu className="w-3 h-3" />
                                                    {generation === 'Desconocida' ? 'Sin especificar' : `Generación ${generation}`}
                                                </div>
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                        {generationFilter.length > 0 && (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => setGenerationFilter([])}
                                                    className="text-sm text-muted-foreground"
                                                >
                                                    <X className="mr-2 w-3 h-3" />
                                                    Limpiar selección
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}

                            {/* Botón limpiar filtros */}
                            {(selectedCredentialFilter !== 'all' || onlineFilter !== 'all' || 
                              relayStatusFilter !== 'all' || clinicFilter !== 'all' || 
                              equipmentFilter !== 'all' || generationFilter.length > 0 || searchText.trim() || !showOnlySmartPlugs) && (
                                <Button 
                                variant="outline"
                                    size="sm"
                                onClick={() => {
                                        setSelectedCredentialFilter('all');
                                        setOnlineFilter('all');
                                        setRelayStatusFilter('all');
                                        setClinicFilter('all');
                                        setEquipmentFilter('all');
                                        setGenerationFilter([]);
                                        setSearchText('');
                                        setEquipmentSearchText('');
                                        setShowOnlySmartPlugs(true); // Reset a solo enchufes por defecto
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
                                        <TableCell colSpan={8} className="h-24 text-center">
                                            No hay enchufes configurados.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    {/* Controles de paginación reorganizados */}
                    <div className="flex justify-between items-center mt-4">
                        {/* ✅ NUEVO: Selector de filas por página movido a la izquierda */}
                        <PageSizeSelector
                            pageSize={pagination.pageSize}
                            onPageSizeChange={(size) => fetchPlugs(1, size, selectedCredentialFilter)}
                            itemType="enchufes"
                        />

                        {/* Paginación centrada */}
                        <PaginationControls
                            currentPage={pagination.page}
                            totalPages={pagination.totalPages}
                            onPageChange={(p) => fetchPlugs(p, pagination.pageSize, selectedCredentialFilter)}
                            totalCount={pagination.totalCount}
                            itemType="enchufes"
                        />

                        {/* Espacio para balancear el layout */}
                        <div className="w-48"></div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex fixed right-4 bottom-4 z-50 gap-2">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 w-4 h-4" />{t('common.back')}
                </Button>
            </div>
            

            
            {selectedDevice && (
                <DeviceConfigModalV2
                    device={selectedDevice as any}
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setSelectedDevice(null);
                    }}
                    onDeviceUpdate={async () => {
                        // Refrescar los datos del dispositivo después de actualizar
                        await fetchPlugs(pagination.page, pagination.pageSize, selectedCredentialFilter);
                        await fetchAllPlugs(); // También recargar lista completa
                    }}
                />
            )}
        </div>
    );
};

export default SmartPlugsPage; 