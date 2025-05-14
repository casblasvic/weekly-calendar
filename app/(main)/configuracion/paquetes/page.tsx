"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { PackageListTable } from './_components/package-list-table';
import { PlusCircle } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { type Prisma } from '@prisma/client'; 

// DEFINICIÓN DE TIPO CON RELACIONES (mantener para referencia)
export type PackageDefinitionWithRelations = Prisma.PackageDefinitionGetPayload<{
    include: {
        items: {
            include: {
                service: { select: { id: true, name: true } };
                product: { select: { id: true, name: true } };
            }
        };
        settings: {
            select: {
                isActive: true;
                pointsAwarded: true;
            }
        };
        tariffPrices: {
           select: {
                tariff: {
                    select: {
                        id: true;
                        name: true;
                    }
                }
            }
        };
    }
}>;

export default function PackagesPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const selectForTariffId = searchParams?.get("selectForTariff");
    
    // En lugar de cargar datos en el servidor, usaremos los hooks optimizados
    // El componente PackageListTable se encargará de usar los hooks de consulta que creamos
    
    return (
        <div className="p-4 md:p-6">
            <div className="flex flex-col items-start justify-between gap-4 mb-6 sm:flex-row sm:items-center">
                <h1 className="text-2xl font-semibold">
                    {selectForTariffId ? "Seleccionar paquetes para tarifa" : "Gestión de Paquetes"}
                </h1>
            </div>
            
            <PackageListTable
                isSelectionMode={!!selectForTariffId}
            />
        </div>
    );
} 