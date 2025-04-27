"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation'; // Importar useParams
import { PackageDefinitionForm } from '@/components/package/package-definition-form';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton'; // Para loading

// Tipo para los datos del formulario (debería coincidir con el del form)
type PackageDefinitionFormData = z.infer<typeof packageDefinitionFormSchema>; // Asumiendo que el schema Zod está disponible o se importa
// --- Si no se importa el schema, definir un tipo local similar ---
// interface PackageItemData { id?: string; itemType: 'SERVICE' | 'PRODUCT'; itemId: string; quantity: number; }
// interface PackageDefinitionFormData { name: string; description?: string | null; price: number; isActive: boolean; pointsAwarded: number; items: PackageItemData[]; }
// --- Fin tipo local ---

// Importar Zod y los schemas si es necesario para el tipo anterior
import * as z from 'zod'; 
const packageItemSchema = z.object({ id: z.string().optional(), itemType: z.enum(['SERVICE', 'PRODUCT']), itemId: z.string().min(1), quantity: z.coerce.number().min(1) });
const packageDefinitionFormSchema = z.object({ name: z.string().min(3), description: z.string().optional(), price: z.coerce.number().min(0), isActive: z.boolean().default(true), pointsAwarded: z.coerce.number().min(0).default(0), items: z.array(packageItemSchema).min(1) });
// --- Fin imports Zod --- 

export default function EditPackagePage() {
    const router = useRouter();
    const params = useParams(); // Obtener parámetros de la URL
    const id = params.id as string; // Obtener el ID del paquete

    const [initialData, setInitialData] = useState<PackageDefinitionFormData | null>(null);
    const [isLoading, setIsLoading] = useState(true); // Empezar cargando
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            const fetchPackageData = async () => {
                setIsLoading(true);
                setError(null);
                try {
                    const response = await fetch(`/api/package-definitions/${id}`);
                    if (!response.ok) {
                         if (response.status === 404) {
                             throw new Error('Paquete no encontrado.');
                         } else {
                             const errorData = await response.json();
                             throw new Error(errorData.error || 'Error al cargar los datos del paquete');
                         }
                    }
                    const data = await response.json();
                    // Adaptar los datos de la API al formato del formulario si es necesario
                    const formData: PackageDefinitionFormData = {
                        ...data,
                        items: data.items.map((item: any) => ({
                            id: item.id, // Mantener ID del PackageItem si existe
                            itemType: item.itemType,
                            itemId: item.serviceId || item.productId,
                            quantity: item.quantity,
                        }))
                    };
                    setInitialData(formData);
                } catch (err: any) {
                    setError(err.message);
                    toast.error("Error al cargar datos", { description: err.message });
                } finally {
                    setIsLoading(false);
                }
            };
            fetchPackageData();
        }
    }, [id]);

    const handleBack = () => {
        router.push('/configuracion/paquetes'); // Volver siempre a la lista
    };

    const handleUpdate = async (data: PackageDefinitionFormData) => {
        setIsSubmitting(true);
        const updatingToast = toast.loading("Actualizando paquete...");
        console.log("Datos a enviar para actualizar paquete:", data);
        try {
            const response = await fetch(`/api/package-definitions/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al actualizar el paquete');
            }

            toast.success("Paquete actualizado con éxito", { id: updatingToast });
            router.push('/configuracion/paquetes'); // Volver a la lista después de actualizar

        } catch (error: any) {
            console.error("Error al actualizar paquete:", error);
            toast.error("Error al actualizar", { 
                id: updatingToast,
                description: error.message 
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Renderizado condicional (Carga, Error, Formulario)
    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="space-y-4 p-6">
                     <Skeleton className="h-8 w-1/2 mb-4" />
                     <Skeleton className="h-10 w-full" />
                     <Skeleton className="h-20 w-full" />
                     <Skeleton className="h-40 w-full" />
                     <div className="flex justify-end space-x-2">
                         <Skeleton className="h-10 w-24" />
                         <Skeleton className="h-10 w-24" />
                     </div>
                 </div>
            );
        }

        if (error) {
             return <p className="text-red-500 text-center p-6">{error}</p>;
        }
        
        if (initialData) {
            return (
                 <PackageDefinitionForm 
                    onSubmit={handleUpdate} 
                    onCancel={handleBack}
                    initialData={initialData}
                    isLoading={isSubmitting}
                 /> 
            );
        }

        return null; // No debería llegar aquí si no hay error y no está cargando
    };

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-2xl font-semibold">Editar Paquete</CardTitle>
                        <CardDescription>Modifica los detalles y los items del paquete.</CardDescription>
                    </div>
                    <Button variant="outline" size="icon" onClick={handleBack} title="Volver" disabled={isSubmitting}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent>
                    {renderContent()}
                </CardContent>
            </Card>
        </div>
    );
} 