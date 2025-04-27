"use client";

import React, { useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { z } from 'zod';

import { PromotionForm } from '@/components/promotions/promotion-form';
import { Skeleton } from '@/components/ui/skeleton';
import { PromotionSchema } from '@/lib/schemas/promotion';
import { PromotionWithRelations } from '@/types/promotion';

const fetchPromotion = async (id: string): Promise<PromotionWithRelations> => {
  const response = await fetch(`/api/promociones/${id}`);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Promotion not found');
    }
    throw new Error('Failed to fetch promotion');
  }
  return response.json();
};

const updatePromotion = async ({ id, data }: { id: string, data: z.infer<typeof PromotionSchema> }): Promise<PromotionWithRelations> => {
  const response = await fetch(`/api/promociones/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to update promotion');
  }
  return response.json();
};

type PromotionEditValues = z.infer<typeof PromotionSchema>;

export default function EditarPromocionPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const promotionId = params.id as string;

  const { data: promotion, isLoading, error, isError } = useQuery<PromotionWithRelations, Error>({
    queryKey: ['promotion', promotionId],
    queryFn: () => fetchPromotion(promotionId),
    enabled: !!promotionId,
  });

  const mutation = useMutation<PromotionWithRelations, Error, PromotionEditValues>({
    mutationFn: (data) => updatePromotion({ id: promotionId, data }),
    onSuccess: (data) => {
      toast.success(`¡Promoción "${data.name}" actualizada con éxito! (Test estático)`);
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      queryClient.invalidateQueries({ queryKey: ['promotion', promotionId] });
    },
    onError: (error) => {
      toast.error(t('promotions.edit.error', { message: error.message }));
    },
  });

  const handleSubmit = useCallback(async (data: PromotionEditValues) => {
    await mutation.mutateAsync(data);
  }, [mutation]);

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  if (isLoading) {
    return (
        <div className="space-y-6 p-4 md:p-6">
          <Skeleton className="h-8 w-1/3 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      );
  }

  if (isError) {
    if (error.message === 'Promotion not found') {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <p className="text-red-500 text-lg">{t('promotions.edit.notFound')}</p>
        </div>
      );
    }
    return (
        <div className="flex flex-col items-center justify-center h-full">
          <p className="text-red-500 text-lg">{t('promotions.edit.loadingError', { message: error.message })}</p>
        </div>
      );
  }

  if (!promotion) {
    return <p>{t('promotions.edit.noData')}</p>;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-semibold mb-4">{t('promotions.edit_title', { name: promotion.name })}</h1>
      <PromotionForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading || mutation.isPending}
        isSubmitting={mutation.isPending}
        initialData={promotion}
        errorMessage={mutation.error?.message}
      />
    </div>
  );
} 