"use client";

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { PlusCircle, RefreshCw, AlertCircle, Wifi, WifiOff, Edit, Trash2, Smartphone, Power } from "lucide-react";
import { toast } from "sonner";
import { ShellyCredentialModal } from './components/ShellyCredentialModal';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ShellyCredential {
    id: string;
    name: string;
    email: string;
    status: 'connected' | 'error' | 'expired';
    lastSyncAt: string | null;
    createdAt: string;
    webSocketStatus: 'connected' | 'disconnected' | 'error' | 'connecting';
    webSocketAutoReconnect: boolean;
    webSocketLastPing: string | null;
    webSocketError: string | null;
    connectionStatus: 'connected' | 'disconnected' | 'error' | 'expired';
    canConnectWebSocket: boolean;
}

export default function ShellyCredentialsPage() {
    const { t } = useTranslation();
    const [credentials, setCredentials] = useState<ShellyCredential[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCredential, setSelectedCredential] = useState<ShellyCredential | null>(null);
    
    // Estados de loading para acciones específicas
    const [loadingStates, setLoadingStates] = useState<{
        [credentialId: string]: {
            reconnecting?: boolean;
            syncing?: boolean;
            deleting?: boolean;
            connectingWebSocket?: boolean;
        }
    }>({});

    const updateCredentialStatus = (credentialId: string, newStatus: 'connected' | 'error' | 'expired', lastSyncAt?: string) => {
        setCredentials(prev => prev.map(cred => 
            cred.id === credentialId 
                ? { 
                    ...cred, 
                    status: newStatus,
                    ...(lastSyncAt && { lastSyncAt })
                }
                : cred
        ));
    };

    const fetchCredentials = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/shelly/credentials');
            if (response.ok) {
                const data = await response.json();
                setCredentials(data);
            } else {
                toast.error("Error al cargar las credenciales");
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCredentials();
    }, [fetchCredentials]);

    const handleSync = async (credentialId: string) => {
        // Activar estado de loading
        setLoadingStates(prev => ({
            ...prev,
            [credentialId]: { ...prev[credentialId], syncing: true }
        }));

        try {
            const response = await fetch(`/api/shelly/sync/${credentialId}`, {
                method: 'POST'
            });
            
            if (response.ok) {
                toast.success("Sincronización completada");
                // Actualizar solo el estado y lastSyncAt de esta credencial
                updateCredentialStatus(credentialId, 'connected', new Date().toISOString());
            } else {
                const errorData = await response.json();
                toast.error(errorData.error || "Error al sincronizar");
                // Marcar como error si falló la sincronización
                updateCredentialStatus(credentialId, 'error');
            }
        } catch (error) {
            toast.error("Error de conexión");
            updateCredentialStatus(credentialId, 'error');
        } finally {
            // Desactivar estado de loading con un pequeño delay para ver la animación
            setTimeout(() => {
                setLoadingStates(prev => ({
                    ...prev,
                    [credentialId]: { ...prev[credentialId], syncing: false }
                }));
            }, 500);
        }
    };

    const handleReauth = (credential: ShellyCredential) => {
        setSelectedCredential(credential);
        setIsModalOpen(true);
    };

    const handleReconnect = async (credentialId: string) => {
        // Activar estado de loading
        setLoadingStates(prev => ({
            ...prev,
            [credentialId]: { ...prev[credentialId], reconnecting: true }
        }));

        try {
            const response = await fetch(`/api/shelly/credentials/${credentialId}/reconnect`, {
                method: 'POST'
            });
            
            if (response.ok) {
                toast.success("Reconexión exitosa");
                // Actualizar solo el estado de esta credencial
                updateCredentialStatus(credentialId, 'connected');
            } else {
                const errorData = await response.json();
                toast.error(errorData.error || "Error al reconectar");
                // Mantener como expirado si no se pudo reconectar
                updateCredentialStatus(credentialId, 'expired');
            }
        } catch (error) {
            toast.error("Error de conexión");
            updateCredentialStatus(credentialId, 'error');
        } finally {
            // Desactivar estado de loading con un pequeño delay para ver la animación
            setTimeout(() => {
                setLoadingStates(prev => ({
                    ...prev,
                    [credentialId]: { ...prev[credentialId], reconnecting: false }
                }));
            }, 500);
        }
    };

    const handleDelete = async (credential: ShellyCredential) => {
        const confirmed = window.confirm(
            `¿Estás seguro de que quieres eliminar la cuenta "${credential.name}"?\n\n` +
            `Se eliminará la cuenta y TODOS los dispositivos asociados a estas credenciales.\n\n` +
            `Esta acción no se puede deshacer.`
        );

        if (!confirmed) return;

        // Activar estado de loading
        setLoadingStates(prev => ({
            ...prev,
            [credential.id]: { ...prev[credential.id], deleting: true }
        }));

        try {
            const response = await fetch(`/api/shelly/credentials/${credential.id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                toast.success("Cuenta eliminada exitosamente");
                // Eliminar de la lista local sin recargar
                setCredentials(prev => prev.filter(cred => cred.id !== credential.id));
            } else {
                const errorData = await response.json();
                toast.error(errorData.error || "Error al eliminar la cuenta");
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            // Desactivar estado de loading con un pequeño delay para ver la animación
            setTimeout(() => {
                setLoadingStates(prev => ({
                    ...prev,
                    [credential.id]: { ...prev[credential.id], deleting: false }
                }));
            }, 500);
        }
    };

    // 🔌 NUEVO: Conectar WebSocket para tiempo real (transparente para el usuario)
    const handleConnectWebSocket = async (credentialId: string) => {
        // Activar estado de loading
        setLoadingStates(prev => ({
            ...prev,
            [credentialId]: { ...prev[credentialId], connectingWebSocket: true }
        }));

        try {
            const response = await fetch(`/api/shelly/credentials/${credentialId}/connect-websocket`, {
                method: 'POST'
            });
            
            if (response.ok) {
                const result = await response.json();
                toast.success("Conexión en tiempo real activada exitosamente");
                // Recargar credenciales para obtener el estado actualizado
                await fetchCredentials();
            } else {
                const errorData = await response.json();
                toast.error(errorData.error || "Error al activar conexión en tiempo real");
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            // Desactivar estado de loading con un pequeño delay para ver la animación
            setTimeout(() => {
                setLoadingStates(prev => ({
                    ...prev,
                    [credentialId]: { ...prev[credentialId], connectingWebSocket: false }
                }));
            }, 500);
        }
    };

    const getStatusBadge = (credential: ShellyCredential, credentialId: string) => {
        const loading = loadingStates[credentialId];
        
        // 🔌 NUEVO: Estado de conectando WebSocket
        if (loading?.connectingWebSocket) {
            return (
                <Badge className="flex gap-1 items-center px-2 py-1 text-white bg-blue-500">
                    <Power className="w-3 h-3 animate-pulse" />
                    Conectando...
                </Badge>
            );
        }
        
        // Estado de reconectando
        if (loading?.reconnecting) {
            return (
                <Badge className="flex gap-1 items-center px-2 py-1 text-white bg-orange-500">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Reconectando...
                </Badge>
            );
        }

        // Estado de sincronizando
        if (loading?.syncing) {
            return (
                <Badge className="flex gap-1 items-center px-2 py-1 text-white bg-blue-500">
                    <Smartphone className="w-3 h-3 animate-bounce" />
                    Sincronizando...
                </Badge>
            );
        }

        // Estado de eliminando
        if (loading?.deleting) {
            return (
                <Badge className="flex gap-1 items-center px-2 py-1 text-white bg-red-600">
                    <Trash2 className="w-3 h-3 animate-pulse" />
                    Eliminando...
                </Badge>
            );
        }

        // 🔌 NUEVO: Usar estado combinado (credencial + WebSocket)
        switch (credential.connectionStatus) {
            case 'connected':
                return (
                    <Badge className="flex gap-1 items-center px-2 py-1 text-white bg-green-500">
                        <Wifi className="w-3 h-3" />
                        Conectado
                    </Badge>
                );
            case 'disconnected':
                return (
                    <Badge className="flex gap-1 items-center px-2 py-1 text-white bg-red-500">
                        <WifiOff className="w-3 h-3" />
                        Desconectado
                    </Badge>
                );
            case 'expired':
                return (
                    <Badge className="flex gap-1 items-center px-2 py-1 text-white bg-amber-500">
                        <WifiOff className="w-3 h-3" />
                        Expirado
                    </Badge>
                );
            case 'error':
                return (
                    <Badge className="flex gap-1 items-center px-2 py-1 text-white bg-red-500">
                        <AlertCircle className="w-3 h-3" />
                        Error
                    </Badge>
                );
            default:
                return <Badge variant="outline">Desconocido</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div></div>
                <Button onClick={() => { setSelectedCredential(null); setIsModalOpen(true); }}>
                    <PlusCircle className="mr-2 w-4 h-4" />
                    Añadir Credenciales
                </Button>
            </div>

            <Card className="mx-4">
                <CardHeader>
                    <CardTitle>Cuentas Conectadas</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Alias</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Última Sincronización</TableHead>
                                    <TableHead className="w-80 text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            Cargando...
                                        </TableCell>
                                    </TableRow>
                                ) : credentials.length > 0 ? (
                                    credentials.map((credential) => (
                                        <TableRow key={credential.id}>
                                            <TableCell className="font-medium">{credential.name}</TableCell>
                                            <TableCell>{credential.email}</TableCell>
                                            <TableCell>{getStatusBadge(credential, credential.id)}</TableCell>
                                            <TableCell>
                                                {credential.lastSyncAt 
                                                    ? format(new Date(credential.lastSyncAt), "dd/MM/yyyy HH:mm", { locale: es })
                                                    : "Nunca sincronizado"
                                                }
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-1 justify-end items-center">
                                                    {/* 🔌 NUEVO: Botón Conectar Tiempo Real (WebSocket) */}
                                                    {credential.canConnectWebSocket && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleConnectWebSocket(credential.id)}
                                                            disabled={loadingStates[credential.id]?.connectingWebSocket}
                                                            className="px-3 py-1 text-green-600 border-green-200 hover:bg-green-50"
                                                            title="Activar conexión en tiempo real"
                                                        >
                                                            <Power className={`w-4 h-4 mr-1 ${loadingStates[credential.id]?.connectingWebSocket ? 'animate-pulse' : ''}`} />
                                                            {loadingStates[credential.id]?.connectingWebSocket ? 'Conectando...' : 'Conectar'}
                                                        </Button>
                                                    )}

                                                    {/* Botón Reconectar (siempre disponible si no está conectado) */}
                                                    {credential.status !== 'connected' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleReconnect(credential.id)}
                                                            disabled={loadingStates[credential.id]?.reconnecting}
                                                            className="px-3 py-1 text-amber-600 border-amber-200 hover:bg-amber-50"
                                                            title="Reconectar con los mismos datos"
                                                        >
                                                            <Wifi className={`w-4 h-4 mr-1 ${loadingStates[credential.id]?.reconnecting ? 'animate-pulse' : ''}`} />
                                                            {loadingStates[credential.id]?.reconnecting ? 'Reconectando...' : 'Reconectar'}
                                                        </Button>
                                                    )}
                                                    
                                                    {/* Píldora Sincronizar Dispositivos */}
                                                    {credential.status === 'connected' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleSync(credential.id)}
                                                            disabled={loadingStates[credential.id]?.syncing}
                                                            className="px-3 py-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                                                            title="Sincronizar dispositivos"
                                                        >
                                                            <Smartphone className={`w-4 h-4 mr-1 ${loadingStates[credential.id]?.syncing ? 'animate-bounce' : ''}`} />
                                                            {loadingStates[credential.id]?.syncing ? 'Sincronizando...' : 'Dispositivos'}
                                                        </Button>
                                                    )}
                                                    
                                                    {/* Botón Reconectar (siempre disponible si está conectado) */}
                                                    {credential.status === 'connected' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleReconnect(credential.id)}
                                                            disabled={loadingStates[credential.id]?.reconnecting}
                                                            className="px-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                                            title="Reiniciar conexión"
                                                        >
                                                            <RefreshCw className={`w-4 h-4 ${loadingStates[credential.id]?.reconnecting ? 'animate-spin' : ''}`} />
                                                        </Button>
                                                    )}
                                                    
                                                    {/* Botón Editar */}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleReauth(credential)}
                                                        disabled={Object.values(loadingStates[credential.id] || {}).some(Boolean)}
                                                        className="px-2 text-gray-500 hover:text-blue-700 hover:bg-blue-50"
                                                        title="Editar credenciales"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    
                                                    {/* Botón Eliminar */}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(credential)}
                                                        disabled={loadingStates[credential.id]?.deleting}
                                                        className="px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        title="Eliminar cuenta y dispositivos"
                                                    >
                                                        <Trash2 className={`w-4 h-4 ${loadingStates[credential.id]?.deleting ? 'animate-pulse' : ''}`} />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            No hay credenciales configuradas
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {isModalOpen && (
                <ShellyCredentialModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => {
                        setIsModalOpen(false);
                        // Solo recargar si es una nueva credencial o se editó una existente
                        fetchCredentials();
                    }}
                    credential={selectedCredential}
                />
            )}
        </div>
    );
} 