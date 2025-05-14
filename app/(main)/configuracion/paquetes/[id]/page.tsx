"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, HelpCircle, Loader2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation'; // Importar useParams
import { PackageDefinitionForm } from '@/components/package/package-definition-form';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton'; // Para loading
import * as z from 'zod'; 
import { useTranslation } from 'react-i18next'; // Import useTranslation

// Tipo para los datos del formulario (debería coincidir con el del form)
type PackageDefinitionFormData = z.infer<typeof packageDefinitionFormSchema>; // Asumiendo que el schema Zod está disponible o se importa
// --- Si no se importa el schema, definir un tipo local similar ---
// interface PackageItemData { id?: string; itemType: 'SERVICE' | 'PRODUCT'; itemId: string; quantity: number; }
// interface PackageDefinitionFormData { name: string; description?: string | null; price: number; isActive: boolean; pointsAwarded: number; items: PackageItemData[]; }
// --- Fin tipo local ---

// Importar Zod y los schemas si es necesario para el tipo anterior
// const packageItemSchema = z.object({ id: z.string().optional(), itemType: z.enum(['SERVICE', 'PRODUCT']), itemId: z.string().min(1), quantity: z.coerce.number().min(1) });
// const packageDefinitionFormSchema = z.object({ name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }), description: z.string().nullish(), price: z.coerce.number().min(0, { message: "El precio no puede ser negativo." }), isActive: z.boolean().default(true), pointsAwarded: z.coerce.number().min(0, { message: "Los puntos no pueden ser negativos." }).default(0), items: z.array(packageItemSchema).min(1, { message: "Debe añadir al menos un ítem al paquete." }) });

// Unificar con el schema de package-definition-form.tsx y ajustar 'price'
const packageItemSchema = z.object({
    id: z.string().optional(),
    itemType: z.enum(['SERVICE', 'PRODUCT']),
    itemId: z.string().min(1, "Debes seleccionar un servicio o producto."),
    quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1."),
    price: z.string().trim().optional().nullable().transform((val, ctx) => { // Añadido .nullable()
        if (val === undefined || val === "" || val === null) return undefined; // Maneja null explícitamente
        const num = Number(val);
        if (isNaN(num)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "El precio debe ser un número válido o estar vacío.",
            });
            return z.NEVER;
        }
        return num;
    }),
});

const packageDefinitionFormSchema = z.object({
    name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
    description: z.string().nullish(),
    price: z.coerce.number().min(0, "El precio no puede ser negativo."), // Precio general del paquete
    isActive: z.boolean().default(true),
    pointsAwarded: z.coerce.number().min(0, "Los puntos no pueden ser negativos.").default(0),
    items: z.array(packageItemSchema).min(1, "El paquete debe contener al menos un ítem."),
});
// --- Fin imports Zod --- 

const FORM_ID = "edit-package-form"; // Define a constant for the form ID

export default function EditPackagePage() {
    const router = useRouter();
    const params = useParams(); // Obtener parámetros de la URL
    const id = params.id as string; // Obtener el ID del paquete
    const { t } = useTranslation(); // Initialize useTranslation

    const [initialData, setInitialData] = useState<PackageDefinitionFormData | null>(null);
    const [isLoading, setIsLoading] = useState(true); // Empezar cargando
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [packageNameForTitle, setPackageNameForTitle] = useState<string>('...'); // State for dynamic title

    useEffect(() => {
        if (id) {
            const fetchPackageData = async () => {
                setIsLoading(true);
                setError(null);
                try {
                    const response = await fetch(`/api/package-definitions/${id}`);
                    if (!response.ok) {
                         if (response.status === 404) {
                             throw new Error(t('packages.edit.loadError')); // Use t()
                         } else {
                             const errorData = await response.json().catch(() => ({}));
                             throw new Error(errorData.error || t('packages.edit.loadDataError')); // Use t()
                         }
                    }
                    const data = await response.json();
                    // Adaptar los datos de la API al formato del formulario si es necesario
                    const formData: PackageDefinitionFormData = {
                        name: data.name,
                        description: data.description,
                        price: data.price,
                        isActive: data.settings?.isActive ?? packageDefinitionFormSchema.shape.isActive.parse(undefined),
                        pointsAwarded: data.settings?.pointsAwarded ?? packageDefinitionFormSchema.shape.pointsAwarded.parse(undefined),
                        items: data.items.map((item: any) => ({
                            id: item.id, // Mantener ID del PackageItem si existe
                            itemType: item.itemType,
                            itemId: item.serviceId || item.productId,
                            quantity: item.quantity,
                            price: item.price, // Mantener lógica de precio de item
                        }))
                    };
                    setInitialData(formData);
                    setPackageNameForTitle(formData.name); // Set package name for title
                } catch (err: any) {
                    setError(err.message);
                    toast.error(t('common.errors.loadingTitle'), { description: err.message }); // Use t()
                } finally {
                    setIsLoading(false);
                }
            };
            fetchPackageData();
        }
    }, [id, t]); // Add t to dependency array

    const handleBack = () => {
        router.push('/configuracion/paquetes'); // Volver siempre a la lista
    };

    const handleUpdate = async (data: PackageDefinitionFormData) => {
        setIsSubmitting(true);
        const updatingToast = toast.loading(t('common.saving'));
        console.log("Datos del formulario antes de transformar para API:", data);

        // Transformar datos para la API: anidar settings
        const { isActive, pointsAwarded, ...restOfData } = data;
        const apiPayload = {
            ...restOfData,
            settings: {
                isActive: isActive,
                pointsAwarded: pointsAwarded ?? 0, // Asegurar que pointsAwarded sea un número
                // Incluir otros campos de settings con sus valores actuales o defaults si es necesario
                // validityDays: data.settings?.validityDays, // Ejemplo si tuvieras estos campos en el form
                // costPrice: data.settings?.costPrice,
                // commissionType: data.settings?.commissionType,
                // commissionValue: data.settings?.commissionValue,
                // appearsInApp: data.settings?.appearsInApp ?? true,
                // autoAddToInvoice: data.settings?.autoAddToInvoice ?? false,
            }
        };
        // Eliminar vatTypeId del payload si es null o undefined, ya que va en settings en el backend
        // if (apiPayload.vatTypeId === null || apiPayload.vatTypeId === undefined) {
        //     delete apiPayload.vatTypeId;
        // }


        console.log("Datos a enviar para actualizar paquete (transformados):", apiPayload);

        try {
            const response = await fetch(`/api/package-definitions/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(apiPayload), // Usar apiPayload
            });

            if (!response.ok) {
                let detailedError = t('common.errors.savingDesc'); // Default message
                let errorPayload = null;
                try {
                    errorPayload = await response.json();
                    console.error("Payload de error de la API:", errorPayload); // Log the full error payload

                    if (errorPayload) {
                        if (errorPayload.error) { // Main API error message
                            detailedError = errorPayload.error;
                        }
                        // Add details if 'details' object or Zod 'issues' array exists
                        if (errorPayload.details && typeof errorPayload.details === 'object') {
                            detailedError += `\nDetalles: ${JSON.stringify(errorPayload.details, null, 2)}`;
                        } else if (Array.isArray(errorPayload.issues)) { // Zod errors
                            detailedError += "\nDetalles:\n" + errorPayload.issues.map((issue: any) => `  - Campo '${issue.path.join('.')}': ${issue.message}`).join('\n');
                        } else if (typeof errorPayload === 'object' && errorPayload !== null && Object.keys(errorPayload).length > 0 && !errorPayload.error) {
                            // If it's an object but not 'error' or 'issues', and not empty
                            const otherDetails = JSON.stringify(errorPayload, null, 2);
                            if (otherDetails !== '{}') {
                                detailedError += `\nRespuesta completa de la API: ${otherDetails}`;
                            }
                        }
                    }
                } catch (e) {
                    console.error("No se pudo parsear el JSON de la respuesta de error de la API:", e);
                    detailedError = `${t('common.errors.savingDesc')} (Respuesta: ${response.status} ${response.statusText})`;
                }
                // This error will be caught by the catch block below.
                throw new Error(detailedError);
            }

            toast.success(t('common.success_edit_title'), { id: updatingToast }); // Use t()
            router.push('/configuracion/paquetes'); // Volver a la lista después de actualizar

        } catch (error: any) {
            // The error.message now contains the detailed message constructed above
            console.error("Error al actualizar paquete (procesado):", error.message);
            
            toast.error(t('common.error_edit_title'), { 
                id: updatingToast,
                description: error.message // Use the processed message directly
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
                    initialData={initialData}
                    formId={FORM_ID} // Pass the form ID
                 /> 
            );
        }

        return null; // No debería llegar aquí si no hay error y no está cargando
    };

    return (
        <div className="p-4 md:p-6 flex flex-col h-full">
            <Card className="mb-4 flex-shrink-0">
                <CardHeader>
                    <div>
                         <CardTitle className="text-2xl font-semibold">{t('packages.edit.title_simple_variant', { packageName: packageNameForTitle })}</CardTitle>
                    </div>
                </CardHeader>
             </Card>
             
             <div className="flex-grow overflow-y-auto pb-20">
                 <Card>
                     <CardContent className="p-0">
                    {renderContent()}
                </CardContent>
            </Card>
             </div>

            <footer 
                className="fixed bottom-4 right-4 z-50 flex items-center gap-2"
                style={{ 
                    left: 'var(--main-margin-left)', 
                    width: 'var(--main-width)',
                    justifyContent: 'flex-end', 
                }}
            >
                <Button variant="outline" onClick={handleBack} disabled={isSubmitting || isLoading}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> {t('common.back')} 
                </Button>
                <Button variant="outline" onClick={() => toast.info(t('common.help_not_implemented'))} disabled={isSubmitting || isLoading}>
                    <HelpCircle className="w-4 h-4 mr-2" /> {t('common.help')}
                </Button>
                <Button 
                    type="button"
                    onClick={() => {
                        (document.getElementById(FORM_ID) as HTMLFormElement | null)?.requestSubmit();
                    }}
                    disabled={isSubmitting || isLoading}
                    className="min-w-[100px]"
                >
                    {isSubmitting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4 mr-2" />
                    )}
                    {t('common.saveChanges')}
                </Button>
            </footer>
        </div>
    );
} 