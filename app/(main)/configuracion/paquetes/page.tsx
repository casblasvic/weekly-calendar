"use client"; // Necesario para hooks, state, etc.

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import PackageListTable from '@/components/package/package-list-table'; // <<< DESCOMENTADO
import { PlusCircle } from 'lucide-react';
import { toast } from 'sonner'; // Para notificaciones

// Definición de tipos alineada con Prisma (simplificada)
// Idealmente, estos tipos vendrían de un archivo centralizado o inferidos
interface Service {
    id: string;
    name: string;
}
interface Product {
    id: string;
    name: string;
}
interface PackageItem {
    id: string; // El ID del PackageItem en sí
    itemType: 'SERVICE' | 'PRODUCT';
    quantity: number;
    service?: Service | null;
    productId?: string | null;
    product?: Product | null;
    serviceId?: string | null;
}

interface PackageDefinition {
    id: string;
    name: string;
    description?: string | null;
    price: number;
    isActive: boolean;
    pointsAwarded: number;
    items: PackageItem[];
    createdAt: string; // O Date
    updatedAt: string; // O Date
    systemId: string;
    //tariffPrices?: any[]; // Opcional si se necesita
}

interface PaginationState {
    currentPage: number;
    totalPages: number;
    totalPackages: number;
    limit: number;
}


export default function PackagesPage() {
    const router = useRouter();
    const [packages, setPackages] = useState<PackageDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState<PaginationState>({
        currentPage: 1,
        totalPages: 1,
        totalPackages: 0,
        limit: 10, // O un valor por defecto desde configuración
    });
    // Estado para forzar re-fetch después de eliminar
    const [refreshTrigger, setRefreshTrigger] = useState(0); 


    const fetchPackages = useCallback(async (page = 1, limit = 10) => {
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                // TODO: Añadir filtros desde la UI si se implementan (nombre, estado, etc.)
            });
            const response = await fetch(`/api/package-definitions?${params.toString()}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al cargar los paquetes');
            }
            const data = await response.json();
            
            setPackages(data.packageDefinitions || []);
            setPagination({
                currentPage: data.currentPage,
                totalPages: data.totalPages,
                totalPackages: data.totalPackageDefinitions,
                limit: limit,
            });
        } catch (err: any) {
            setError(err.message);
            toast.error("Error", { description: err.message });
        } finally {
            setIsLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // No incluir pagination aquí para evitar bucles si setPagination está dentro

     useEffect(() => {
         fetchPackages(pagination.currentPage, pagination.limit);
     }, [fetchPackages, pagination.currentPage, pagination.limit, refreshTrigger]); // Añadir refreshTrigger

     const handleRefresh = () => {
         setRefreshTrigger(prev => prev + 1); // Cambia el estado para disparar useEffect
     };


    const handleNewPackage = () => {
        router.push('/configuracion/paquetes/nuevo');
    };
    
     const handlePageChange = (newPage: number) => {
         setPagination(prev => ({ ...prev, currentPage: newPage }));
     };

    return (
        <div className="p-4 md:p-6"> {/* Ajuste de padding */}
            <div className="flex flex-col items-start justify-between gap-4 mb-6 sm:flex-row sm:items-center">
                <h1 className="text-2xl font-semibold">Gestión de Paquetes</h1>
                <Button onClick={handleNewPackage} size="sm"> {/* Ajuste de tamaño */}
                    <PlusCircle className="w-4 h-4 mr-2" /> Nuevo Paquete
                </Button>
            </div>
            
            {/* TODO: Añadir controles de filtro aquí */}

            <PackageListTable
                data={packages}
                isLoading={isLoading}
                error={error}
                pagination={pagination}
                onPageChange={handlePageChange} // Pasar función para cambiar página
                onRefresh={handleRefresh} // Pasar función para refrescar
            /> 
            { /* <<< DESCOMENTADO */}
        </div>
    );
} 