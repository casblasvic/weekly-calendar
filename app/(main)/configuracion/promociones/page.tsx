"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowLeft, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PromotionListTable } from '@/components/promotions/promotion-list-table';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function PromocionesPage() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <div className="relative flex flex-col h-full p-4 md:p-6">
      <div className="flex-grow overflow-y-auto pb-20">
      <div className="flex flex-col items-start justify-between gap-4 mb-6 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-semibold">{t('promotions.page_title')}</h1>
      </div>

      {/* TODO: Añadir controles de filtro aquí si se necesitan */}

      {/* Renderizar la tabla */}
      <PromotionListTable />
      </div>

      <div className="absolute bottom-4 right-4 z-20 flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => router.back()} className="order-1 shadow-md">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
        </Button>
        <Button variant="outline" onClick={() => toast.info(t('common.help_not_implemented'))} className="order-2 shadow-md">
            <HelpCircle className="w-4 h-4 mr-2" />
            {t('common.help')}
        </Button>
        <Link href="/configuracion/promociones/nuevo" passHref className="order-3">
          <Button className="text-white bg-blue-600 hover:bg-blue-700 shadow-md">
            <PlusCircle className="w-4 h-4 mr-2" />
            {t('promotions.add_button') || t('common.new') + " " + t('promotions.promotion_singular')}
          </Button>
        </Link>
      </div>
    </div>
  );
} 