"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaginationControls } from '@/components/pagination-controls';
import { toast } from "sonner";
import { PlusCircle, Edit, Trash2, Play, StopCircle, Wifi, WifiOff, ArrowLeft, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { ColumnDef, flexRender, getCoreRowModel, getSortedRowModel, SortingState, useReactTable } from "@tanstack/react-table";
import { useRouter } from "next/navigation";

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
    const [plugs, setPlugs] = useState<SmartPlug[]>([]);
    const [availableEquipment, setAvailableEquipment] = useState<Equipment[]>([]);
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, pageSize: 10, totalPages: 1, totalCount: 0 });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPlug, setCurrentPlug] = useState<Partial<SmartPlug> & { clinicId?: string } | null>(null);
    const [selectedClinic, setSelectedClinic] = useState<string | null>(null);
    const [plugStatus, setPlugStatus] = useState<Record<string, 'online' | 'offline' | 'loading'>>({});
    const [activePlugs, setActivePlugs] = useState<Record<string, boolean>>({});
    const [sorting, setSorting] = useState<SortingState>([]);

    const fetchPlugs = useCallback(async (page = 1, pageSize = 10) => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/internal/smart-plug-devices?page=${page}&pageSize=${pageSize}`);
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
            const response = await fetch('/api/internal/clinics/list');
            if (response.ok) setClinics(await response.json());
        };
        fetchPlugs();
        fetchInitialData();
    }, [fetchPlugs]);

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
                await fetchPlugs(pagination.page, pagination.pageSize);
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
                await fetchPlugs(pagination.page, pagination.pageSize);
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
        if (!plugIp) {
            toast.error("No se puede controlar: dirección IP no configurada");
            return;
        }

        // Marcar como activo visualmente
        setActivePlugs(prev => ({ ...prev, [plugId]: true }));
        
        try {
            // Aquí iría la lógica para llamar al endpoint RPC proxy
            // Por ahora simulamos la activación
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            toast.success(`Dispositivo ${action === 'on' ? 'activado' : 'desactivado'} correctamente`);
            
            // Después de 3 segundos, quitar el estado activo
            setTimeout(() => {
                setActivePlugs(prev => ({ ...prev, [plugId]: false }));
            }, 3000);
            
        } catch (error) {
            toast.error("Error al controlar el dispositivo");
            setActivePlugs(prev => ({ ...prev, [plugId]: false }));
        }
    };

    const columns = useMemo<ColumnDef<SmartPlug>[]>(() => [
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
            id: 'status',
            header: () => <div className="text-left">{t('integrations.smart_plugs.table.status')}</div>,
            cell: ({ row }) => {
                const plug = row.original;
                return (
                    <div className="text-left">
                        {plugStatus[plug.id] === 'online' ? (
                            <Badge className="text-white bg-green-500">{t('integrations.smart_plugs.status.online')}</Badge>
                        ) : plugStatus[plug.id] === 'offline' ? (
                            <Badge className="text-white bg-red-500">{t('integrations.smart_plugs.status.offline')}</Badge>
                        ) : (
                            <Badge className="text-white bg-yellow-500">{t('integrations.smart_plugs.status.loading')}</Badge>
                        )}
                    </div>
                );
            },
        },
        {
            id: 'actions',
            header: () => <div className="text-right">{t('common.actions')}</div>,
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
    ], [t, handleDelete, handleEdit, handleControl, activePlugs]);

    const table = useReactTable({
        data: plugs,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
        <div className="container py-6 mx-auto space-y-6 max-w-7xl">
             <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">{t('integrations.smart_plugs.title')}</h1>
                    <p className="text-muted-foreground">{t('integrations.smart_plugs.description')}</p>
                </div>
            </div>
            
            <Card className="mx-4">
                <CardHeader>
                    {/* Podríamos poner aquí filtros en el futuro */}
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto rounded-md border">
                        <Table>
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
                                {table.getRowModel().rows.length > 0 ? (
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
                        onPageChange={(p) => fetchPlugs(p, pagination.pageSize)}
                        pageSize={pagination.pageSize}
                        onPageSizeChange={(s) => fetchPlugs(1, s)}
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