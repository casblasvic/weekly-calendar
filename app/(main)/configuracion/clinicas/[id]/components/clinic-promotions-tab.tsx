"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, PlusCircle, Loader2 } from 'lucide-react';
import { PromotionListTable } from '@/components/promotions/promotion-list-table';
import { Skeleton } from '@/components/ui/skeleton';

interface ClinicPromotionsTabContentProps {
  clinicId: string;
}

// Skeleton específico para la tabla de promociones
const PromotionsTableSkeleton = () => {
  const { t } = useTranslation();
  // Asumimos 5 columnas como ejemplo, ajusta según las columnas reales
  const columnCount = 5; 
  return (
    <div className="space-y-4">
      {/* Skeleton para controles de tabla (si existen) */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-24" />
      </div>
      {/* Skeleton para la tabla */}
      <div className="rounded-md border">
        <div className="w-full">
          {/* Header */}
          <div className="flex border-b">
            {Array.from({ length: columnCount }).map((_, i) => (
              <div key={i} className="flex-1 p-4">
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
          {/* Body */}
          {Array.from({ length: 5 }).map((_, rowIndex) => (
            <div key={rowIndex} className="flex border-b last:border-b-0">
              {Array.from({ length: columnCount }).map((_, colIndex) => (
                <div key={colIndex} className="flex-1 p-4">
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
       {/* Skeleton para paginación (si existe) */}
       <div className="flex items-center justify-end space-x-2 py-4">
         <Skeleton className="h-8 w-20" />
         <Skeleton className="h-8 w-20" />
       </div>
    </div>
  );
};

export function ClinicPromotionsTabContent({ clinicId }: ClinicPromotionsTabContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();

  const handleAddPromotion = () => {
    const redirectUrl = `${pathname}?tab=descuentos`; // Volver a la pestaña de descuentos
    router.push(`/configuracion/promociones/nuevo?preselectedClinicId=${clinicId}&redirectBackTo=${encodeURIComponent(redirectUrl)}`);
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t('clinics.edit.promotions.description', 'Gestiona las promociones globales y las específicas para esta clínica.')}
        </p>
      </div>
      
      {/* <<< ELIMINAR ENVOLTURA overflow-x-auto >>> */}
      {/* <div className="overflow-x-auto"> */}
        {/* Renderizar la tabla directamente */}
        <PromotionListTable />
      {/* </div> */}
      {/* <<< FIN ELIMINACIÓN >>> */}

      {/* Botón para añadir nueva promoción, pre-seleccionando esta clínica */}
      <div className="flex justify-end mt-4">
         {/* TODO: Quitar este botón de aquí y ponerlo fijo abajo junto a los otros dos */}
        <Button onClick={handleAddPromotion}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('clinics.edit.promotions.add', 'Añadir Promoción')}
        </Button>
      </div>
    </div>
  );
} 