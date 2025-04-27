"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PromotionListTable } from '@/components/promotions/promotion-list-table';

export default function PromocionesPage() {
  const { t } = useTranslation();

  return (
    <div className="container p-4 mx-auto md:p-6">
      <div className="flex flex-col items-start justify-between gap-4 mb-6 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-semibold">{t('promotions.page_title')}</h1>
        <Link href="/configuracion/promociones/nuevo" passHref>
          <Button size="sm">
            <PlusCircle className="w-4 h-4 mr-2" /> {t('common.new')} {t('promotions.promotion_singular')}
          </Button>
        </Link>
      </div>

      {/* TODO: Añadir controles de filtro aquí si se necesitan */}

      {/* Renderizar la tabla */}
      <PromotionListTable />
    </div>
  );
} 