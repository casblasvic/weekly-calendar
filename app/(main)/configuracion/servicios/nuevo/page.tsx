"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Save, HelpCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ServiceForm, ServiceFormData } from '@/components/service/service-form'; // Importar el formulario y su tipo
import { Category, VATType, Equipment, Service } from '@prisma/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton'; // Para el estado de carga
import { Card, CardContent } from "@/components/ui/card"; // <<< AÑADIDO IMPORT
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ServiceActionFooter } from "@/components/service/service-action-footer"; // <-- Importar el nuevo componente

export default function NuevoServicioPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [categories, setCategories] = useState<Category[]>([]);
    const [vatTypes, setVatTypes] = useState<VATType[]>([]);
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [isLoadingAux, setIsLoadingAux] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const formId = "new-service-form";

    // Cargar datos auxiliares necesarios para el formulario
    const loadAuxData = useCallback(async () => {
        setIsLoadingAux(true);
        setError(null);
        try {
            const [catRes, vatRes, equipRes] = await Promise.all([
                fetch('/api/categories'),
                fetch('/api/vat-types'),
                fetch('/api/equipment') // API moderna de equipamiento
            ]);

            if (!catRes.ok || !vatRes.ok || !equipRes.ok) {
                throw new Error('Error al cargar datos auxiliares para el formulario.');
            }

            const catData = await catRes.json();
            const vatData = await vatRes.json();
            const equipData = await equipRes.json();

            setCategories(catData);
            setVatTypes(vatData);
            setEquipments(equipData);

        } catch (err: any) {
            console.error("Error loading auxiliary data:", err);
            setError(err.message);
            toast.error(`Error al cargar datos: ${err.message}`);
        } finally {
            setIsLoadingAux(false);
        }
    }, []);

    useEffect(() => {
        loadAuxData();
    }, [loadAuxData]);

    // Función para manejar el submit del formulario
    const handleFormSubmit = async (data: ServiceFormData) => {
        setIsSaving(true);
        console.log("Datos a enviar para crear servicio:", data);
        try {
            const response = await fetch('/api/services', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Error ${response.status} al crear el servicio`);
            }

            const newService = await response.json();
            toast.success(`Servicio "${newService.name}" creado correctamente.`);
            // Redirigir a la página de edición del nuevo servicio o al listado
            // router.push(`/configuracion/servicios/${newService.id}`); 
            router.push('/configuracion/servicios'); // Redirigir al listado por ahora

        } catch (err: any) {
            console.error("Error creando servicio:", err);
            toast.error(`Error al crear servicio: ${err.message}`);
            setIsSaving(false); // Permitir reintentar si falla
        }
        // No poner setIsSaving(false) aquí si la redirección es exitosa
    };

    // Skeleton para el formulario mientras cargan los datos auxiliares
    const renderFormSkeleton = () => (
        <div className="space-y-6">
             <Skeleton className="h-10 w-1/4 mb-4" /> {/* Título h2 */}
             <Card>
                 <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                     <Skeleton className="h-10 w-full" />
                     <Skeleton className="h-10 w-full" />
                     <Skeleton className="h-10 w-full md:col-span-2" />
                     <Skeleton className="h-10 w-full md:col-span-2" />
                 </CardContent>
             </Card>
             <Skeleton className="h-10 w-1/4 mb-4" /> {/* Título h2 */}
             <Card>
                 <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                     <Skeleton className="h-10 w-full" />
                     <Skeleton className="h-10 w-full sm:col-span-2" />
                      <Skeleton className="h-10 w-full md:col-span-1" />
                     <Skeleton className="h-10 w-full md:col-span-1" />
                      <Skeleton className="h-10 w-full md:col-span-1" />
                     <Skeleton className="h-10 w-full md:col-span-1" />
                 </CardContent>
             </Card>
         </div>
    );

    // ... (fetchers y createService sin cambios) ...
    const fetchCategories = async (): Promise<Category[]> => {
        const res = await fetch('/api/categories');
        if (!res.ok) throw new Error("Error fetching categories");
        return res.json();
    };

    const fetchVatTypes = async (): Promise<VATType[]> => {
        const res = await fetch('/api/vat-types');
        if (!res.ok) throw new Error("Error fetching VAT types");
        return res.json();
    };

    const fetchEquipments = async (): Promise<Equipment[]> => {
        const res = await fetch('/api/equipment');
        if (!res.ok) throw new Error("Error fetching equipments");
        return res.json();
    };

    const createService = async (data: ServiceFormData): Promise<Service> => {
        const { id, ...createData } = data; 
        const response = await fetch('/api/services', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(createData),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Error ${response.status} al crear el servicio`);
        }
        return response.json();
    };

    // ... (useQuery para categories, vatTypes, equipments sin cambios) ...
    const { data: categoriesData, isLoading: isLoadingCategories, isError: isErrorCategories } = useQuery<Category[]>({ 
        queryKey: ["categories"],
        queryFn: fetchCategories,
    });

    const { data: vatTypesData, isLoading: isLoadingVats, isError: isErrorVats } = useQuery<VATType[]>({ 
        queryKey: ["vatTypes"],
        queryFn: fetchVatTypes,
    });

    const { data: equipmentsData, isLoading: isLoadingEquips, isError: isErrorEquips } = useQuery<Equipment[]>({ 
        queryKey: ["equipments"],
        queryFn: fetchEquipments,
    });

    const isLoadingData = isLoadingCategories || isLoadingVats || isLoadingEquips;
    const isDataError = isErrorCategories || isErrorVats || isErrorEquips;
    // const dataError = errorCategories || errorVats || errorEquips; // Si quieres mostrar el error específico

    // Mutación para crear el servicio
    const createServiceMutation = useMutation<Service, Error, ServiceFormData>({
        mutationFn: createService,
        onSuccess: (newService) => {
            toast.success(`${t('common.success')}: ${t('servicios.serviceCreated', { name: newService.name })}`);
            queryClient.invalidateQueries({ queryKey: ['services'] }); 
            // --- MODIFICACIÓN: Navegar a la página de edición del nuevo servicio --- 
            // router.push('/configuracion/servicios'); // NO volver a la lista
            router.replace(`/configuracion/servicios/${newService.id}`); // REEMPLAZAR URL actual
            // --- FIN MODIFICACIÓN ---
        },
        onError: (error: Error) => {
            toast.error(`${t('common.error')}: ${error.message}`);
        },
    });

    const handleFormSubmitMutation = async (data: ServiceFormData) => {
        await createServiceMutation.mutateAsync(data);
    };
    
    // Función para disparar el submit del form desde el footer
    const triggerFormSubmit = () => {
        (document.getElementById(formId) as HTMLFormElement | null)?.requestSubmit();
    };
    
    // Placeholder para la navegación de subsecciones (no aplica en 'nuevo')
    const handleSubSectionNavigation = (section: string) => {
        // No hacer nada o mostrar un toast informativo si se intenta
        toast.info(t('services.new.actionsDisabled') || "Guarda el servicio primero para acceder a esta sección.");
    };

    if (isLoadingData) {
        // Podríamos añadir un skeleton para el footer también si queremos
        return (
            <>
              {renderFormSkeleton()}
              {/* Skeleton Footer Opcional */}
               <footer className="fixed bottom-0 z-10 px-4 py-3 border-t bg-background md:px-6 lg:px-8" style={{left: 'var(--main-margin-left)', width: 'var(--main-width)'}}>
                    <div className="flex flex-wrap items-center justify-start gap-2 max-w-4xl mx-auto">
                        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={`action-${i}`} className="h-8 w-24" />)} 
                        <div className="flex-grow"></div> 
                        <Skeleton className="h-9 w-24" /> 
                        <Skeleton className="h-9 w-28" /> 
                        <Skeleton className="h-9 w-9 rounded-md" /> 
                    </div>
               </footer>
             </>
         );
    }

    if (isDataError) {
        return <div className="p-4 text-red-500">{t('common.errorLoadingFormDependencies')}</div>;
    }

    if (!categoriesData || !vatTypesData || !equipmentsData) {
         return <div className="p-4 text-orange-500">{t('common.dataNotReady')}</div>;
    }

    return (
        <>
            {/* Contenedor con padding y max-width */}
            <div className="p-4 md:p-6 max-w-4xl mx-auto pb-20">
                <h1 className="text-2xl font-semibold mb-6">{t('servicios.newServiceTitle')}</h1>

                         <ServiceForm 
                    categories={categoriesData}
                    vatTypes={vatTypesData}
                    equipments={equipmentsData}
                    onSubmit={handleFormSubmitMutation}
                    isSaving={createServiceMutation.isPending}
                    formId={formId}
                    // initialData es undefined por defecto en ServiceForm
                         />
            </div>

            {/* Usar el nuevo ServiceActionFooter */}
            <ServiceActionFooter 
                serviceId={null} // Indicar que es nuevo
                isSaving={createServiceMutation.isPending} 
                isLoading={isLoadingData} 
                formId={formId} 
                hasInitialData={false} // Indicar que no hay datos iniciales
                onBack={() => router.back()}
                onNavigate={handleSubSectionNavigation} // Navegación deshabilitada
                onSubmitTrigger={triggerFormSubmit} 
                // onHelp={() => {/* Lógica ayuda */}}
            />
        </>
    );
} 