'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PackagesUsingItemTable } from '@/components/package/packages-using-item-table';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { Product } from '@prisma/client';
import { ArrowLeft, PlusCircle, HelpCircle, Package as PackageIcon, Save } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

// Interfaz simplificada para los paquetes
interface SimplePackageDefinition {
    id: string;
    name: string;
    price: number;
}

export default function ProductoPaquetesRelacionadosPage() {
    const router = useRouter();
    const params = useParams();
    const productId = params.id as string;
    const { t } = useTranslation();

    const [productName, setProductName] = useState<string | null>(null);
    const [relatedPackages, setRelatedPackages] = useState<SimplePackageDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!productId) {
            setError('ID de producto no válido.');
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            // Cargar nombre del producto y paquetes en paralelo
            const [productRes, packagesRes] = await Promise.all([
                fetch(`/api/products/${productId}?select=name`), // Pedimos solo el nombre
                fetch(`/api/package-definitions?productId=${productId}`)
            ]);

            // Validar respuesta del producto (necesario para el título)
            if (!productRes.ok) {
                 if (productRes.status === 404) throw new Error(t('products.edit.loadError') || 'Producto no encontrado');
                 throw new Error(`Error ${productRes.status} cargando nombre del producto`);
            }

            // Validar respuesta de paquetes (crítico para esta página)
             if (!packagesRes.ok) {
                 throw new Error(`Error ${packagesRes.status} cargando paquetes relacionados`);
             }

            const productData: Pick<Product, 'name'> = await productRes.json();
            const packagesJson: { packageDefinitions: SimplePackageDefinition[] } = await packagesRes.json();

            setProductName(productData.name);
            setRelatedPackages(packagesJson.packageDefinitions || []);

        } catch (err) {
            console.error("Error fetching related packages data:", err);
            setError(err instanceof Error ? err.message : t('common.unknownError') || "Error desconocido");
            setRelatedPackages([]); // Limpiar en caso de error
        } finally {
            setIsLoading(false);
        }
    }, [productId, t]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const renderSkeleton = () => (
        <div className="max-w-4xl p-4 pb-24 mx-auto space-y-6 md:p-6 lg:p-8">
            <Skeleton className="w-1/2 h-8 mb-6" />
            <Skeleton className="w-full h-64" />
        </div>
    );

    const handleGoToNewPackage = () => {
        router.push('/configuracion/paquetes/nuevo');
    }
    
    const handleAyuda = () => toast.info("Funcionalidad de Ayuda pendiente.");

    return (
        <>
            <div className="max-w-4xl p-4 pb-24 mx-auto md:p-6 lg:p-8">
                <h1 className="mb-6 text-2xl font-semibold">
                    {isLoading ? t('common.loading') :
                    productName ? `${t('packages.relatedSectionTitle')} para "${productName}"` :
                    t('packages.relatedSectionTitle')}
                </h1>

                {isLoading ? (
                    renderSkeleton()
                ) : error ? (
                    <div className="p-4 text-center text-red-500 border border-red-200 rounded-md bg-red-50">
                        {t('common.error')}: {error}
                    </div>
                ) : (
                    <PackagesUsingItemTable
                        packages={relatedPackages}
                        isLoading={false}
                        itemType="product"
                    />
                )}
            </div>

            <footer 
                className="fixed bottom-0 z-10 px-4 py-3 border-t bg-background md:px-6 lg:px-8"
                style={{
                    left: 'var(--main-margin-left)',
                    width: 'var(--main-width)',
                    transition: 'left 0.3s ease-in-out, width 0.3s ease-in-out'
                } as React.CSSProperties}
            >
                 <div className="flex items-center justify-end max-w-4xl mx-auto space-x-2">
                    <Button variant="outline" onClick={() => router.back()} disabled={isLoading}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        {t('common.back')}
                    </Button>
                    <Button variant="default" onClick={handleGoToNewPackage} disabled={isLoading}>
                        <PlusCircle className="w-4 h-4 mr-2" />
                        {t('packages.new')}
                    </Button>
                     <Button variant="outline" size="icon" onClick={handleAyuda} disabled={isLoading}> 
                        <HelpCircle className="w-4 h-4" />
                        <span className="sr-only">{t('common.help')}</span>
                    </Button>
                 </div>
             </footer>
        </>
    );
} 