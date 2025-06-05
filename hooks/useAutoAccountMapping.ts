import { useMutation, useQuery } from '@tanstack/react-query';
import { getAutoAccountMapping, CategoryType } from '@/app/(main)/configuracion/contabilidad/lib/auto-account-mapping';

interface UseAutoAccountMappingProps {
  legalEntityId: string;
  enabled?: boolean;
}

export function useAutoAccountMapping({ legalEntityId, enabled = true }: UseAutoAccountMappingProps) {
  // Obtener el plan contable para la entidad legal
  const { data: chartOfAccounts, isLoading } = useQuery({
    queryKey: ['chart-of-accounts', legalEntityId],
    queryFn: async () => {
      const response = await fetch(`/api/chart-of-accounts?legalEntityId=${legalEntityId}`);
      if (!response.ok) throw new Error('Error al cargar plan contable');
      return response.json();
    },
    enabled,
  });

  // Función para obtener mapeo automático
  const getMapping = async (item: { type: 'category' | 'product' | 'service'; data: any }) => {
    if (!chartOfAccounts) return null;
    return getAutoAccountMapping(item, chartOfAccounts);
  };

  // Mutación para crear mapeo de categoría
  const createCategoryMapping = useMutation({
    mutationFn: async (data: {
      categoryId: string;
      accountId: string;
      appliesToServices: boolean;
      appliesToProducts: boolean;
    }) => {
      const response = await fetch('/api/accounting/category-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          legalEntityId,
        }),
      });
      if (!response.ok) throw new Error('Error al crear mapeo');
      return response.json();
    },
  });

  // Función para aplicar mapeo automático a una categoría
  const applyCategoryAutoMapping = async (categoryId: string, categoryType: CategoryType) => {
    const accountId = await getMapping({
      type: 'category',
      data: { type: categoryType },
    });

    if (!accountId) return null;

    // Determinar a qué aplica según el tipo
    const appliesToServices = categoryType === 'SERVICE' || categoryType === 'MIXED';
    const appliesToProducts = categoryType === 'PRODUCT' || categoryType === 'MIXED';

    return createCategoryMapping.mutateAsync({
      categoryId,
      accountId,
      appliesToServices,
      appliesToProducts,
    });
  };

  return {
    chartOfAccounts,
    isLoading,
    getMapping,
    applyCategoryAutoMapping,
    createCategoryMapping,
  };
}
