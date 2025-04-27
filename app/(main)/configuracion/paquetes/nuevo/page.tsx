"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PackageDefinitionForm } from '@/components/package/package-definition-form';
import { toast } from 'sonner';

// Importar el formulario de definición de paquete (cuando exista)
// import { PackageDefinitionForm } from '@/components/package/package-definition-form';

export default function NewPackagePage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleBack = () => {
        router.back(); // Navega a la página anterior
    };

    // TODO: Implementar la lógica de guardado cuando el formulario esté listo
    const handleSave = async (data: any) => {
        setIsLoading(true);
        const savingToast = toast.loading("Creando paquete...");
        console.log("Datos a enviar para crear paquete:", data);
        try {
            const response = await fetch('/api/package-definitions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al crear el paquete');
            }

            const result = await response.json();
            toast.success("Paquete creado con éxito", { 
                id: savingToast,
                description: `ID: ${result.id}` 
            });
            // Redirigir a la página de edición del nuevo paquete o a la lista
            router.push('/configuracion/paquetes'); // Volver a la lista por ahora
            // Opcional: router.push(`/configuracion/paquetes/${result.id}`);

        } catch (error: any) {
            console.error("Error al crear paquete:", error);
            toast.error("Error al crear", { 
                id: savingToast,
                description: error.message 
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto"> {/* Centrado y con ancho máximo */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-2xl font-semibold">Crear Nuevo Paquete</CardTitle>
                        <CardDescription>Define los detalles y los items que compondrán el nuevo paquete.</CardDescription>
                    </div>
                    <Button variant="outline" size="icon" onClick={handleBack} title="Volver" disabled={isLoading}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent>
                    {/* <<< Reemplazar placeholder con el formulario real */}
                    <PackageDefinitionForm 
                        onSubmit={handleSave} 
                        onCancel={handleBack}
                        isLoading={isLoading} // Pasar estado de carga al formulario
                    /> 
                    {/* <<< Fin reemplazo */}

                    {/* Botones provisionales si el formulario no los incluye */}
                    <div className="flex justify-end space-x-2 mt-6">
                        <Button variant="outline" onClick={handleBack}>Volver</Button>
                        {/* <Button onClick={() => handleSave({})}>Guardar (Test)</Button> */}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
} 