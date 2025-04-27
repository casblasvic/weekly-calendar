"use client"

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ProductForm } from '@/components/product/product-form';
import { Button } from "@/components/ui/button";
import { toast as sonnerToast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Product, Category, VATType } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PackagesUsingItemTable } from '@/components/package/packages-using-item-table';
import { Package as PackageIcon, PlusCircle, Star, Ticket } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Tipo ampliado que esperamos de la API (incluye relaciones)
type ProductWithRelations = Product & {
    category?: Category | null;
    vatType?: VATType | null;
};

// Interfaz simplificada para los paquetes
interface SimplePackageDefinition {
    id: string;
    name: string;
    price: number;
}

export default function EditarProductoPage() {
    const router = useRouter();
    const params = useParams();
    const productId = params.id as string;
    const { t } = useTranslation();

    const [productData, setProductData] = useState<ProductWithRelations | null>(null);
    const [relatedPackages, setRelatedPackages] = useState<SimplePackageDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingPackages, setIsLoadingPackages] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Cargar datos del producto Y paquetes relacionados
    const fetchData = useCallback(async () => {
        if (!productId) return;
        setIsLoading(true);
        setIsLoadingPackages(true);
        setError(null);
        try {
            // Cargar producto y paquetes en paralelo
            const [productRes, packagesRes] = await Promise.all([
                fetch(`/api/products/${productId}`),
                fetch(`/api/package-definitions?productId=${productId}`)
            ]);

            // Validar respuesta del producto
            if (!productRes.ok) {
                 if (productRes.status === 404) throw new Error(t('products.edit.loadError') || "Producto no encontrado");
                 throw new Error(`Error ${productRes.status} al cargar el producto`);
            }
            
            // Validar respuesta de paquetes (no crítico si falla)
             if (!packagesRes.ok) {
                 console.warn(`Advertencia: No se pudieron cargar los paquetes asociados (status ${packagesRes.status})`);
             }
             
            // Procesar datos
            const productJson: ProductWithRelations = await productRes.json();
            let packagesJson: { packageDefinitions: SimplePackageDefinition[] } = { packageDefinitions: [] };
             if (packagesRes.ok) {
                 try {
                    packagesJson = await packagesRes.json();
                 } catch (jsonError) {
                      console.warn("Advertencia: Error al parsear JSON de paquetes, se mostrará vacío.", jsonError);
                      packagesJson = { packageDefinitions: [] }; // Asegurar valor por defecto
                 }
             }

            setProductData(productJson);
            setRelatedPackages(packagesJson.packageDefinitions || []);
            
        } catch (err) {
            console.error("Error fetching data:", err);
            setError(err instanceof Error ? err.message : t('common.unknownError') || "Error desconocido");
            setProductData(null); // Limpiar datos si hay error
            setRelatedPackages([]); // Limpiar paquetes si hay error
        } finally {
            setIsLoading(false);
            setIsLoadingPackages(false);
        }
    }, [productId, t]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSubmit = async (formData: any) => {
        setIsSaving(true);
        try {
            const response = await fetch(`/api/products/${productId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Error ${response.status}`);
            }

            sonnerToast.success(t('products.updateSuccess') || "Producto actualizado correctamente.");
            fetchData(); // Recargar datos para ver cambios

        } catch (error) {
            console.error("Error actualizando producto:", error);
            sonnerToast.error(`${t('products.updateError') || 'Error al actualizar'}: ${error instanceof Error ? error.message : t('common.unknownError') || 'Error desconocido'}`);
        } finally {
             setIsSaving(false);
        }
    };

    // --- Placeholders --- 
    const handleOpenPuntosModal = () => sonnerToast.info("Funcionalidad de Puntos pendiente.");
    
    // Navegar a la subpágina de bonos del producto
    const handleNavigateBonos = () => {
        if (!productId) {
            sonnerToast.error(t('products.edit.idError') || "Error: No se pudo obtener el ID del producto actual.");
            return;
        }
        router.push(`/configuracion/productos/${productId}/bonos`);
    };
    
    // --- AÑADIR NAVEGACIÓN A PAQUETES --- 
    const handleNavigatePaquetes = () => {
        if (!productId) {
            sonnerToast.error(t('products.edit.idError') || "Error: No se pudo obtener el ID del producto actual.");
            return;
        }
        router.push(`/configuracion/productos/${productId}/paquetes`);
    };
    // --- FIN AÑADIR ---

    const handleNavigateSuscripciones = () => sonnerToast.info("Funcionalidad de Suscripciones pendiente.");
    const handleAyuda = () => sonnerToast.info("Funcionalidad de Ayuda pendiente.");

    // --- Skeleton mejorado para incluir la tabla de paquetes --- 
    const renderSkeleton = () => (
        <div className="max-w-4xl p-4 mx-auto space-y-6 md:p-6 lg:p-8">
             <Skeleton className="w-1/3 h-8 mb-6" />
             <Skeleton className="w-full h-96" /> {/* Skeleton para el form */} 
             <div className="flex justify-start pt-4 space-x-2">
                 <Skeleton className="w-24 h-10" />
                 <Skeleton className="w-24 h-10" />
                 <Skeleton className="w-24 h-10" />
                 <Skeleton className="w-32 h-10" />
                 <Skeleton className="w-32 h-10" />
             </div>
        </div>
    );

    // --- Renderizado condicional --- 
    if (isLoading) {
        return renderSkeleton();
    }

    if (error) {
        return <div className="p-6 text-center text-red-600">{t('common.errors.dataLoading', {context: 'producto'}) || t('common.error')} cargando producto: {error}</div>;
    }

    if (!productData) {
         return <div className="p-6 text-center text-gray-500">{t('products.notFound') || 'Producto no encontrado.'}</div>;
    }

    return (
        <>
            <div className="max-w-4xl p-4 pb-24 mx-auto md:p-6 lg:p-8"> 
                <h1 className="mb-6 text-2xl font-semibold">{t('products.edit.title', { productName: productData.name }) || `Editar Producto: ${productData.name}`}</h1>
                
                {/* Pasar initialData y la función onSubmit */}
                <ProductForm 
                    initialData={productData} 
                    isSaving={isSaving} 
                    onSubmit={handleSubmit} 
                />
                
            </div>

            {/* Footer fixed usando CSS Variables para left/width */}
            <footer 
                className="fixed bottom-0 z-10 px-4 py-3 border-t bg-background md:px-6 lg:px-8"
                style={{
                    left: 'var(--main-margin-left)', 
                    width: 'var(--main-width)',
                    transition: 'left 0.3s ease-in-out, width 0.3s ease-in-out'
                } as React.CSSProperties}
            >
                 <div className="flex items-center justify-start max-w-4xl mx-auto space-x-2">
                     {/* --- AÑADIR BOTONES DE SUBSECCIÓN Y REORDENAR --- */}
                     <Button variant="outline" size="sm" onClick={handleOpenPuntosModal} disabled={isSaving} className="whitespace-nowrap">
                        <Star className="w-3.5 h-3.5 mr-1.5"/> Puntos
                    </Button>
                     <Button variant="outline" size="sm" onClick={handleNavigateBonos} disabled={isSaving} className="whitespace-nowrap">
                         <Ticket className="w-3.5 h-3.5 mr-1.5"/> Bonos
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleNavigatePaquetes} disabled={isSaving} className="whitespace-nowrap">
                         <PackageIcon className="w-3.5 h-3.5 mr-1.5"/> {t('sidebar.packages')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleNavigateSuscripciones} disabled={isSaving} className="whitespace-nowrap">
                        {/* <Icono Suscripcion> */} Suscripciones
                    </Button>
                    {/* --- FIN AÑADIR/REORDENAR --- */}

                    <Button variant="outline" type="button" onClick={() => router.push('/configuracion/productos')} disabled={isSaving}>{t('common.backToList') || 'Volver a Lista'}</Button>
                     <Button 
                        type="submit" 
                        form="product-form" // Asegúrate que el ID del form es correcto
                        disabled={isSaving}
                     >
                         {isSaving ? t('common.saving') : t('common.saveChanges')}
                     </Button>
                     <Button variant="secondary" type="button" onClick={handleAyuda} disabled={isSaving}>Ayuda</Button>
                 </div>
             </footer>
        </>
    );
} 