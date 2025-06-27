"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface ShellyCredentialModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    credential?: { id: string; name: string; email: string } | null;
}

type Step = 'credentials' | 'connecting' | 'result';

export function ShellyCredentialModal({ isOpen, onClose, onSuccess, credential }: ShellyCredentialModalProps) {
    const [step, setStep] = useState<Step>('credentials');
    const [formData, setFormData] = useState({
        name: credential?.name || '',
        email: credential?.email || '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [connectionResult, setConnectionResult] = useState<{
        success: boolean;
        message: string;
        syncDevices?: boolean;
        credentialId?: string;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleConnect = async () => {
        if (!formData.name || !formData.email || !formData.password) {
            toast.error("Por favor completa todos los campos");
            return;
        }

        setStep('connecting');
        setIsLoading(true);

        try {
            const response = await fetch('/api/shelly/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    credentialId: credential?.id
                })
            });

            const data = await response.json();

            if (response.ok) {
                setConnectionResult({
                    success: true,
                    message: "Cuenta conectada exitosamente",
                    syncDevices: true,
                    credentialId: data.credentialId
                });
                setStep('result');
                onSuccess();
            } else {
                setConnectionResult({
                    success: false,
                    message: data.error || "Error al conectar con Shelly"
                });
                setStep('result');
            }
        } catch (error) {
            setConnectionResult({
                success: false,
                message: "Error de conexión con el servidor"
            });
            setStep('result');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSyncDevices = async () => {
        if (!connectionResult?.credentialId) {
            toast.error("No se encontró el ID de credencial");
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`/api/shelly/sync/${connectionResult.credentialId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                toast.success("Dispositivos sincronizados correctamente");
                onSuccess();
                handleClose();
            } else {
                const errorData = await response.json();
                toast.error(errorData.error || "Error al sincronizar dispositivos");
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setStep('credentials');
        setFormData({ name: '', email: '', password: '' });
        setConnectionResult(null);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader className="pb-4">
                    <DialogTitle>
                        {credential ? 'Re-autenticar Cuenta Shelly' : 'Añadir Cuenta Shelly'}
                    </DialogTitle>
                </DialogHeader>

                {step === 'credentials' && (
                    <>
                        <div className="grid gap-6 py-4 px-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nombre de la Cuenta (Alias)</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ej: Clínica Principal"
                                    className="input-focus"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email de Shelly Cloud</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="tu@email.com"
                                    className="input-focus"
                                    disabled={!!credential}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Contraseña</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="••••••••"
                                        className="input-focus pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="pt-4 px-6">
                            <Button variant="outline" onClick={handleClose}>
                                Cancelar
                            </Button>
                            <Button onClick={handleConnect}>
                                Conectar
                            </Button>
                        </DialogFooter>
                    </>
                )}

                {step === 'connecting' && (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
                        <h3 className="text-lg font-medium">Estableciendo conexión...</h3>
                        <div className="text-sm text-muted-foreground space-y-1 text-center">
                            <p>Paso 1/3: Autenticando credenciales</p>
                            <p>Paso 2/3: Obteniendo token de acceso</p>
                            <p>Paso 3/3: Verificando conexión</p>
                        </div>
                    </div>
                )}

                {step === 'result' && connectionResult && (
                    <>
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            {connectionResult.success ? (
                                <>
                                    <CheckCircle className="h-12 w-12 text-green-600" />
                                    <h3 className="text-lg font-medium text-green-600">
                                        {connectionResult.message}
                                    </h3>
                                    {connectionResult.syncDevices && (
                                        <p className="text-sm text-muted-foreground">
                                            ¿Deseas sincronizar los dispositivos ahora?
                                        </p>
                                    )}
                                </>
                            ) : (
                                <>
                                    <XCircle className="h-12 w-12 text-red-600" />
                                    <h3 className="text-lg font-medium text-red-600">
                                        Error de conexión
                                    </h3>
                                    <p className="text-sm text-muted-foreground text-center max-w-sm">
                                        {connectionResult.message}
                                    </p>
                                </>
                            )}
                        </div>
                        <DialogFooter className="pt-4 px-6">
                            {connectionResult.success ? (
                                <>
                                    <Button 
                                        variant="outline" 
                                        onClick={() => {
                                            onSuccess();
                                            handleClose();
                                        }}
                                    >
                                        Más tarde
                                    </Button>
                                    <Button 
                                        onClick={handleSyncDevices}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Sincronizando...
                                            </>
                                        ) : (
                                            'Sincronizar Dispositivos'
                                        )}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button variant="outline" onClick={handleClose}>
                                        Cerrar
                                    </Button>
                                    <Button onClick={() => setStep('credentials')}>
                                        Intentar de nuevo
                                    </Button>
                                </>
                            )}
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
} 