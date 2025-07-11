"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Save, HelpCircle, ArrowLeft, Image as ImageIcon, FileText, BarChart, Star, SlidersHorizontal, Settings, Cpu, Briefcase, Ticket, Package as PackageIcon, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ServiceForm, ServiceFormData } from '@/components/service/service-form';
import { Category, VATType, Equipment, Prisma } from '@prisma/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PackagesUsingItemTable } from '@/components/package/packages-using-item-table';
import { useTranslation } from 'react-i18next';
import { ServiceActionFooter } from '@/components/service/service-action-footer';

interface SimplePackageDefinition {
    id: string;
    name: string;
    price: number;
}

// --- Definir tipo para Service con relaciones --- 
type ServiceWithDetails = Prisma.ServiceGetPayload<{
    include: {
        category: true;
        vatType: true;
        settings: {
            include: {
                equipmentRequirements: { 
                    include: { equipment: true } 
                };
                skillRequirements: { 
                    include: { skill: true } 
                };
            }
        };
    }
}>
// --- Fin definición tipo ---

export default function EditarServicioPage() {
    const router = useRouter();
    const params = useParams();
    const serviceId = params.id as string;
    const { t } = useTranslation();
    const formId = "edit-service-form";

    const [initialData, setInitialData] = useState<ServiceFormData | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [vatTypes, setVatTypes] = useState<VATType[]>([]);
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [relatedPackages, setRelatedPackages] = useState<SimplePackageDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingPackages, setIsLoadingPackages] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadInitialData = useCallback(async () => {
        if (!serviceId) {
            setError(t('services.edit.idError') || "ID de servicio no encontrado en la URL.");
            setIsLoading(false);
            setIsLoadingPackages(false);
            return;
        }
        setIsLoading(true);
        setIsLoadingPackages(true);
        setError(null);
        try {
            const [catRes, vatRes, equipRes, serviceRes, packagesRes] = await Promise.all([
                fetch('/api/categories'),
                fetch('/api/vat-types'),
                fetch('/api/equipment'),
                fetch(`/api/services/${serviceId}`),
                fetch(`/api/package-definitions?serviceId=${serviceId}`)
            ]);

            if (!catRes.ok || !vatRes.ok || !equipRes.ok) {
                throw new Error(t('common.errors.auxDataLoadError') || 'Error al cargar datos auxiliares.');
            }
            if (!serviceRes.ok) {
                 if (serviceRes.status === 404) throw new Error(t('services.edit.loadError') || 'Servicio no encontrado.');
                 throw new Error(`Error ${serviceRes.status} al cargar el servicio.`);
            }
             if (!packagesRes.ok) {
                 console.warn(`Advertencia: No se pudieron cargar los paquetes asociados (status ${packagesRes.status})`);
             }

            const catData = await catRes.json();
            const vatData = await vatRes.json();
            const equipData = await equipRes.json();
            const serviceData: ServiceWithDetails = await serviceRes.json();
            let packagesData: { packageDefinitions: SimplePackageDefinition[] } = { packageDefinitions: [] };
             if (packagesRes.ok) {
                 try {
                    packagesData = await packagesRes.json();
                 } catch (jsonError) {
                      console.warn("Advertencia: Error al parsear JSON de paquetes, se mostrará vacío.", jsonError);
                      packagesData = { packageDefinitions: [] };
                 }
             }

            setCategories(catData);
            setVatTypes(vatData);
            setEquipments(equipData);
            setRelatedPackages(packagesData.packageDefinitions || []);

            const serviceIsActive = serviceData.settings?.isActive ?? true;

            // ✅ NUEVO: Extraer el primer equipamiento requerido (asumiendo uno por servicio)
            const firstEquipmentRequirement = serviceData.settings?.equipmentRequirements?.[0];
            const equipmentId = firstEquipmentRequirement?.equipmentId || null;

            console.log("🔍 [Service Edit] Datos cargados:", {
                serviceId: serviceData.id,
                serviceName: serviceData.name,
                settingsExists: !!serviceData.settings,
                equipmentRequirementsCount: serviceData.settings?.equipmentRequirements?.length || 0,
                firstEquipmentId: equipmentId,
                equipmentName: firstEquipmentRequirement?.equipment?.name || 'Sin equipamiento'
            });

            const formattedInitialData: ServiceFormData = {
                id: serviceData.id,
                name: serviceData.name,
                code: serviceData.code || '',
                categoryId: serviceData.categoryId || '',
                defaultVatId: serviceData.vatTypeId,
                duration: (serviceData as any).durationMinutes, // Usar el campo existente
                treatmentDuration: (serviceData as any).treatmentDurationMinutes || 0,
                color: serviceData.colorCode,
                basePrice: serviceData.price,
                
                equipmentId: equipmentId, // ✅ CORREGIDO: Leer desde equipmentRequirements
                commissionType: serviceData.settings?.commissionType || null,
                commissionValue: serviceData.settings?.commissionValue || null,
                requiresParams: serviceData.settings?.requiresParams || false,
                isValuationVisit: false, // TODO: Añadir campo si es necesario
                showInApp: serviceData.settings?.appearsInApp ?? true,
                allowAutomaticDiscounts: true, // TODO: Añadir campos si son necesarios
                allowManualDiscounts: true,
                acceptsPromotions: true,
                allowPvpEditing: false,
                affectsStatistics: true,
                isActive: serviceIsActive,
            };
            setInitialData(formattedInitialData);

        } catch (err: any) {
            console.error("Error loading initial data:", err);
            const errorMessage = err.message || t('common.unknownError') || "Error desconocido";
            setError(errorMessage);
            toast.error(t('common.errors.loadingTitle') || 'Error al cargar', { description: errorMessage });
        } finally {
            setIsLoading(false);
            setIsLoadingPackages(false);
        }
    }, [serviceId, t]);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    const handleFormSubmit = async (data: ServiceFormData) => {
        if (!serviceId) return;
        setIsSaving(true);
        console.log("Datos a enviar para actualizar servicio:", data);
        
        // 🔧 TRANSFORMAR datos de ServiceFormData al formato API
        const transformedData = {
            // Campos básicos del servicio
            name: data.name,
            code: data.code || null,
            description: null, // ServiceFormData no tiene description actualmente
            durationMinutes: Number(data.duration) || 1, // ✅ duration → durationMinutes  
            treatmentDurationMinutes: Number(data.treatmentDuration) || 0, // ✅ NUEVO: treatmentDuration → treatmentDurationMinutes
            price: data.basePrice !== null ? Number(data.basePrice) : null, // ✅ basePrice → price
            colorCode: data.color || null, // ✅ color → colorCode
            categoryId: data.categoryId || null,
            vatTypeId: data.defaultVatId || null, // ✅ defaultVatId → vatTypeId
            
            // Equipamiento y habilidades (arrays para relaciones M-M)
            equipmentIds: data.equipmentId ? [data.equipmentId] : [], // ✅ Convertir a array
            skillIds: [], // Por ahora vacío
            
            // ✅ NUEVO: Settings object que falta
            settings: {
                requiresMedicalSignOff: !!data.requiresParams,
                pointsAwarded: 0, // Por defecto
                commissionType: data.commissionType || null,
                commissionValue: data.commissionValue !== null ? Number(data.commissionValue) : null,
                requiresParams: !!data.requiresParams,
                appearsInApp: !!data.showInApp,
                autoAddToInvoice: false, // Por defecto
                onlineBookingEnabled: !!data.showInApp,
                minTimeBeforeBooking: null,
                maxTimeBeforeBooking: null,
                cancellationPolicy: null,
                preparationTimeMinutes: null,
                cleanupTimeMinutes: null,
                internalNotes: null,
            } as any // ✅ Temporalmente usar any para evitar conflictos de tipo
        };

        console.log("Datos transformados para API:", transformedData);
        
        try {
            const response = await fetch(`/api/services/${serviceId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(transformedData),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Error ${response.status} al actualizar el servicio`);
            }

            const updatedService = await response.json();
            toast.success(t('services.updateSuccess', { name: updatedService.name }) || `Servicio "${updatedService.name}" actualizado correctamente.`);
            router.push('/configuracion/servicios');

        } catch (err: any) {
            console.error("Error actualizando servicio:", err);
            toast.error(t('services.updateError') || 'Error al actualizar', { description: err.message });
            setIsSaving(false);
        }
    };

    const handleSubSectionNavigation = (targetSection: string) => {
        if (!serviceId) return;
        const basePath = `/configuracion/servicios/${serviceId}`;
        switch (targetSection) {
            case 'consumos':
            case 'puntos':
            case 'bonos':
            case 'paquetes':
            case 'suscripciones':
            case 'recursos':
            case 'parametros':
            case 'avanzado':
                 router.push(`${basePath}/${targetSection}`);
                 break;
            default:
                toast.info(t('common.navigationNotImplemented', { section: targetSection }) || `Navegación a ${targetSection} no implementada.`);
                break;
        }
    };

    const triggerFormSubmit = () => {
        (document.getElementById(formId) as HTMLFormElement | null)?.requestSubmit();
    };

    const renderFormSkeleton = () => (
         <div className="space-y-6">
             <Skeleton className="mb-4 w-1/4 h-10" />
             <Card>
                 <CardContent className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
                     <Skeleton className="w-full h-10" />
                     <Skeleton className="w-full h-10" />
                     <Skeleton className="w-full h-10 md:col-span-2" />
                     <Skeleton className="w-full h-10 md:col-span-2" />
                 </CardContent>
             </Card>
             <Skeleton className="mb-4 w-1/4 h-10" />
             <Card>
                 <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
                     <Skeleton className="w-full h-10" />
                     <Skeleton className="w-full h-10 sm:col-span-2" />
                      <Skeleton className="w-full h-10 md:col-span-1" />
                     <Skeleton className="w-full h-10 md:col-span-1" />
                      <Skeleton className="w-full h-10 md:col-span-1" />
                     <Skeleton className="w-full h-10 md:col-span-1" />
                 </CardContent>
             </Card>
             <Skeleton className="mb-4 w-1/4 h-10" />
         </div>
    );

    return (
        <>
            <div className="container mx-auto px-4 py-8 relative min-h-screen flex flex-col max-w-4xl pb-32">
                <h1 className="mb-6 text-2xl font-semibold">
                    {isLoading ? t('common.loading') : (initialData ? t('services.edit.title', { serviceName: initialData.name }) : t('services.edit.loadError'))}
                </h1>

                     {isLoading ? (
                        renderFormSkeleton()
                     ) : error ? (
                         <div className="text-center text-red-600">{t('common.error')}: {error}</div>
                     ) : initialData ? (
                                <ServiceForm 
                                    initialData={initialData}
                                    categories={categories}
                                    vatTypes={vatTypes}
                                    equipments={equipments}
                                    onSubmit={handleFormSubmit}
                                    isSaving={isSaving}
                            formId={formId}
                        />
                             ) : (
                                 <div className="text-center">{t('services.edit.loadDataError')}</div>
                             )}
            </div>

            <div className="fixed bottom-0 left-0 right-0 z-10 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto px-4 py-3 max-w-4xl">
            <ServiceActionFooter 
                serviceId={serviceId}
                isSaving={isSaving}
                isLoading={isLoading} 
                formId={formId} 
                hasInitialData={!!initialData}
                onBack={() => router.back()}
                onNavigate={handleSubSectionNavigation} 
                onSubmitTrigger={triggerFormSubmit} 
            />
                </div>
            </div>
        </>
    );
} 