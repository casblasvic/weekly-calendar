"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Save, HelpCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ServiceForm, ServiceFormData } from '@/components/service/service-form'; // Importar el formulario y su tipo
import { Category, VATType, Equipment } from '@prisma/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton'; // Para el estado de carga
import { Card, CardContent } from "@/components/ui/card"; // <<< AÑADIDO IMPORT

export default function NuevoServicioPage() {
    const router = useRouter();
    const [categories, setCategories] = useState<Category[]>([]);
    const [vatTypes, setVatTypes] = useState<VATType[]>([]);
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [isLoadingAux, setIsLoadingAux] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Cargar datos auxiliares necesarios para el formulario
    const loadAuxData = useCallback(async () => {
        setIsLoadingAux(true);
        setError(null);
        try {
            const [catRes, vatRes, equipRes] = await Promise.all([
                fetch('/api/categories'),
                fetch('/api/vat-types'),
                fetch('/api/equipments') // Asumiendo endpoint para equipos
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

    return (
        // Volver a usar Fragment <> y pb-24 en el div de contenido
        <>
            {/* Contenido principal con padding, max-w y pb-24 */}
            <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto pb-24"> 
                <h1 className="text-2xl font-semibold mb-6">Nuevo Servicio Global</h1>

                     {isLoadingAux ? (
                        renderFormSkeleton()
                     ) : error ? (
                         <div className="text-red-600">Error al cargar datos: {error}</div>
                     ) : (
                         <ServiceForm 
                             categories={categories}
                             vatTypes={vatTypes}
                             equipments={equipments}
                             onSubmit={handleFormSubmit}
                             isSaving={isSaving}
                             formId="new-service-form"
                         />
                     )}
            </div>

            {/* Footer fixed usando CSS Variables para left/width */}
            <footer 
                className="fixed bottom-0 z-10 border-t bg-background py-3 px-4 md:px-6 lg:px-8"
                style={{
                    left: 'var(--main-margin-left)', 
                    width: 'var(--main-width)',
                    transition: 'left 0.3s ease-in-out, width 0.3s ease-in-out'
                } as React.CSSProperties}
            >
                 <div className="max-w-4xl mx-auto flex items-center justify-start space-x-2">
                    {/* Botones Izquierda (NUEVO) */}
                    <div className="flex items-center gap-2">
                         <Button variant="outline" size="sm" onClick={() => toast.info("Funcionalidad de Puntos pendiente.")}>Puntos</Button>
                         <Button variant="outline" size="sm" onClick={() => toast.info("Funcionalidad de Bonos pendiente.")}>Bonos</Button>
                         <Button variant="outline" size="sm" onClick={() => toast.info("Funcionalidad de Suscripciones pendiente.")}>Suscripciones</Button>
                    </div>

                    {/* Botones Derecha (EXISTENTE) */}
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => router.back()} disabled={isSaving}>
                            Volver
                        </Button>
                        <Button type="submit" form="new-service-form" disabled={isSaving}>
                            <Save className="mr-2 h-4 w-4" />
                            {isSaving ? 'Creando Servicio...' : 'Crear Servicio'}
                        </Button>
                        <Button variant="outline" size="icon" disabled>
                           <HelpCircle className="h-4 w-4" />
                           <span className="sr-only">Ayuda</span>
                       </Button>
                    </div>
                 </div>
            </footer>
        </>
    );
} 