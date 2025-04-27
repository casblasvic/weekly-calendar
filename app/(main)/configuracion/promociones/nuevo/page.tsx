"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { PromotionForm } from '@/components/promotions/promotion-form';
import { PromotionSchema } from '@/lib/schemas/promotion';
import { z } from 'zod';

// Definir el tipo para los datos del formulario
type PromotionFormData = z.infer<typeof PromotionSchema>;

export default function CrearPromocionPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: PromotionFormData) => {
    console.log('CrearPromocionPage: handleSubmit called with data:', data);
    setIsLoading(true);
    try {
      // Convertir campos numéricos y fechas si es necesario antes de enviar
      // El schema Zod ya debería haber validado los tipos, pero podemos ser extra seguros
      const payload = {
        ...data,
        // Asegurar que los valores opcionales undefined se envíen como null si la API lo prefiere,
        // o simplemente dejar que Zod los maneje.
        // Por ahora, asumimos que la API maneja bien undefined o los campos opcionales.
      };

      const response = await fetch('/api/promociones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // Intentar obtener un mensaje de error específico del backend
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || t('promotions.create_error_default'));
      }

      toast.success(t('promotions.create_success'));
      router.push('/configuracion/promociones'); // Redirigir a la lista
      router.refresh(); // Refrescar datos en la página de lista

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('promotions.create_error_default');
      toast.error(errorMessage);
      console.error("Error creating promotion:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.back(); // Volver a la página anterior
  };

  return (
    <div className="container p-4 mx-auto md:p-6">
      <h1 className="mb-6 text-2xl font-semibold">{t('promotions.create_title')}</h1>
      <PromotionForm 
        onSubmit={handleSubmit} 
        isLoading={isLoading} 
        onCancel={handleCancel} 
      />
    </div>
  );
} 