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
        settings: true;
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

            const formattedInitialData: ServiceFormData = {
                id: serviceData.id,
                name: serviceData.name,
                code: serviceData.code || '',
                categoryId: serviceData.categoryId || '',
                defaultVatId: serviceData.vatTypeId,
                duration: serviceData.durationMinutes,
                color: serviceData.colorCode,
                basePrice: serviceData.price,
                
                equipmentId: null,
                commissionType: null,
                commissionValue: null,
                requiresParams: false,
                isValuationVisit: false,
                showInApp: true,
                allowAutomaticDiscounts: true,
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
        try {
            const response = await fetch(`/api/services/${serviceId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
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
             <Skeleton className="w-1/4 h-10 mb-4" />
             <Card>
                 <CardContent className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
                     <Skeleton className="w-full h-10" />
                     <Skeleton className="w-full h-10" />
                     <Skeleton className="w-full h-10 md:col-span-2" />
                     <Skeleton className="w-full h-10 md:col-span-2" />
                 </CardContent>
             </Card>
             <Skeleton className="w-1/4 h-10 mb-4" />
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
             <Skeleton className="w-1/4 h-10 mb-4" />
         </div>
    );

    return (
        <>
            <div className="max-w-4xl p-4 pb-20 mx-auto md:p-6">
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
        </>
    );
} 