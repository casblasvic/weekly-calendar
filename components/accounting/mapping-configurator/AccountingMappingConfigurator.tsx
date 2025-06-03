/**
 * Configurador de Mapeos Contables
 * 
 * Permite configurar manualmente las relaciones entre:
 * - Categorías → Cuentas contables
 * - Métodos de pago → Cuentas contables  
 * - Tipos de IVA → Cuentas contables
 * - Reglas automáticas de mapeo
 */

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  BookOpen,
  ChevronRight,
  CreditCard,
  FolderTree,
  Info,
  Loader2,
  Receipt,
  Save,
  Settings,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Folder,
  Calculator,
  Tag,
  Wand2,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AccountingMappingConfiguratorProps {
  systemId: string;
  legalEntityId: string;
  currentLanguage?: string;
  onComplete?: () => void;
}

interface CategoryMapping {
  categoryId: string;
  categoryName: string;
  parentId?: string;
  currentAccountId?: string;
  suggestedAccountId?: string;
  hasChildren: boolean;
  level?: number;
  path?: string;
}

interface PaymentMethodMapping {
  paymentMethodId: string;
  paymentMethodName: string;
  paymentMethodCode: string;
  currentAccountId?: string;
  suggestedAccountId?: string;
}

interface VATMapping {
  vatTypeId: string;
  vatTypeName: string;
  vatRate: number;
  currentInputAccountId?: string;
  currentOutputAccountId?: string;
  suggestedInputAccountId?: string;
  suggestedOutputAccountId?: string;
}

interface ChartAccount {
  id: string;
  accountNumber: string;
  name: string;
  type: string;
  level: number;
  allowsDirectEntry: boolean;
}

// Traducciones en español
const translations = {
  title: 'Configuración de Mapeos Contables',
  description: 'Configure las cuentas contables para cada elemento del sistema',
  tabs: {
    categories: 'Categorías',
    payments: 'Métodos de Pago',
    vat: 'Tipos de IVA',
    rules: 'Reglas Automáticas'
  },
  categories: {
    info: 'Asigne cuentas contables a las categorías de servicios. Las subcategorías heredarán la cuenta de su categoría padre si no se especifica una diferente.',
    hasSubcategories: 'Tiene subcategorías',
    noMappings: 'Todas las categorías están correctamente mapeadas',
    applyToSubcategories: 'Aplicar a todas las subcategorías'
  },
  payments: {
    info: 'Configure las cuentas contables para cada método de pago. Esto determinará dónde se registran los cobros.',
    noMappings: 'Todos los métodos de pago están correctamente mapeados'
  },
  vat: {
    info: 'Configure las cuentas de IVA repercutido (ventas) y soportado (compras) para cada tipo de IVA.',
    inputAccount: 'Cuenta IVA Soportado',
    outputAccount: 'Cuenta IVA Repercutido',
    noMappings: 'Todos los tipos de IVA están correctamente mapeados'
  },
  rules: {
    info: 'Configure reglas automáticas para asignar cuentas contables basadas en criterios específicos.',
    comingSoon: 'Esta funcionalidad estará disponible próximamente'
  },
  common: {
    selectAccount: 'Seleccionar cuenta',
    useSuggestion: 'Usar sugerida',
    save: 'Guardar cambios',
    saving: 'Guardando...',
    cancel: 'Cancelar',
    noMappings: 'No hay mapeos para configurar',
    mappingSaved: 'Mapeos guardados correctamente',
    mappingError: 'Error al guardar los mapeos',
    noChanges: 'No hay cambios para guardar'
  }
};

export default function AccountingMappingConfigurator({
  systemId,
  legalEntityId,
  currentLanguage = 'es',
  onComplete
}: AccountingMappingConfiguratorProps) {
  const [activeTab, setActiveTab] = useState('categories');
  const [applyToSubcategories, setApplyToSubcategories] = useState(true);
  const [categoryMappings, setCategoryMappings] = useState<Record<string, string>>({});
  const [paymentMappings, setPaymentMappings] = useState<Record<string, string>>({});
  const [vatMappings, setVatMappings] = useState<Record<string, { input?: string; output?: string }>>({});
  const [expenseMappings, setExpenseMappings] = useState<Record<string, string>>({});
  const [cashSessionMappings, setCashSessionMappings] = useState<Record<string, string>>({});
  const [discountMappings, setDiscountMappings] = useState<Record<string, string>>({});
  
  // Función para obtener mensaje de razón en español
  const getReasonMessage = (reason?: string): string => {
    const messages: Record<string, string> = {
      'legal_entity_not_found': 'La sociedad fiscal seleccionada no existe',
      'no_clinics_assigned': 'Esta sociedad fiscal no tiene clínicas asignadas. Configure al menos una clínica para poder mapear elementos contables.',
      'no_categories_in_tariffs': 'No hay categorías con servicios o productos definidos en las tarifas de esta sociedad fiscal',
      'all_categories_mapped': 'Todas las categorías están correctamente mapeadas',
      'no_payment_methods_configured': 'No hay métodos de pago configurados en las clínicas de esta sociedad fiscal',
      'no_active_payment_methods': 'Los métodos de pago configurados están desactivados',
      'all_payment_methods_mapped': 'Todos los métodos de pago están correctamente mapeados',
      'no_tariffs_found': 'No se encontraron tarifas asociadas a las clínicas de esta sociedad fiscal',
      'no_vat_types_in_tariffs': 'No hay tipos de IVA definidos en las tarifas de esta sociedad fiscal',
      'all_vat_types_mapped': 'Todos los tipos de IVA están correctamente mapeados',
      'no_expense_types_defined': 'No hay tipos de gastos definidos en el sistema',
      'all_expense_types_mapped': 'Todos los tipos de gastos están correctamente mapeados',
      'no_cash_entities_to_map': 'No hay clínicas ni terminales POS para mapear en esta sociedad fiscal',
      'all_cash_entities_mapped': 'Todas las cajas y terminales están correctamente mapeadas',
      'no_promotions_available': 'No hay promociones disponibles para esta sociedad fiscal. Las promociones pueden ser globales o específicas de las clínicas asignadas.',
      'all_promotions_mapped': 'Todas las promociones están correctamente mapeadas'
    };
    return reason ? messages[reason] || 'Sin datos disponibles' : 'Sin datos disponibles';
  };

  // Componente para mostrar estado sin datos
  const NoDataMessage = ({ reason, type }: { reason?: string; type: string }) => (
    <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
      <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-muted">
        <Info className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="mb-2 text-lg font-medium">
        {reason?.includes('all_') ? 'Configuración Completa' : 'Sin Datos Disponibles'}
      </h3>
      <p className="max-w-md text-muted-foreground">
        {getReasonMessage(reason)}
      </p>
      {reason === 'no_clinics_assigned' && (
        <div className="p-4 mt-4 border border-blue-200 rounded-lg bg-blue-50">
          <p className="text-sm text-blue-800">
            💡 <strong>Sugerencia:</strong> Vaya a Configuración → Clínicas para asignar al menos una clínica a esta sociedad fiscal.
          </p>
        </div>
      )}
    </div>
  );

  // Cargar categorías sin mapear
  const { data: categoriesResponse, isLoading: loadingCategories } = useQuery({
    queryKey: ['unmapped-categories', legalEntityId],
    queryFn: async () => {
      const response = await fetch(
        `/api/accounting/unmapped-items?type=category&legalEntityId=${legalEntityId}`
      );
      if (!response.ok) throw new Error('Error loading categories');
      return response.json() as Promise<{
        hasData: boolean;
        reason?: string;
        items: CategoryMapping[];
      }>;
    }
  });

  const unmappedCategories = categoriesResponse?.hasData ? categoriesResponse.items.sort((a, b) => {
    // Primero las categorías padre, luego por nivel
    if (!a.parentId && b.parentId) return -1;
    if (a.parentId && !b.parentId) return 1;
    return (a.level || 0) - (b.level || 0);
  }) : [];

  // Cargar métodos de pago sin mapear
  const { data: paymentMethodsResponse, isLoading: loadingPayments } = useQuery({
    queryKey: ['unmapped-payment-methods', legalEntityId],
    queryFn: async () => {
      const response = await fetch(
        `/api/accounting/unmapped-items?type=payment&legalEntityId=${legalEntityId}`
      );
      if (!response.ok) throw new Error('Error loading payment methods');
      return response.json() as Promise<{
        hasData: boolean;
        reason?: string;
        items: PaymentMethodMapping[];
      }>;
    }
  });

  const unmappedPaymentMethods = paymentMethodsResponse?.hasData ? paymentMethodsResponse.items : [];

  // Cargar tipos de IVA sin mapear
  const { data: vatTypesResponse, isLoading: loadingVat } = useQuery({
    queryKey: ['unmapped-vat-types', legalEntityId],
    queryFn: async () => {
      const response = await fetch(
        `/api/accounting/unmapped-items?type=vat&legalEntityId=${legalEntityId}`
      );
      if (!response.ok) throw new Error('Error loading VAT types');
      return response.json() as Promise<{
        hasData: boolean;
        reason?: string;
        items: VATMapping[];
      }>;
    }
  });

  const unmappedVatTypes = vatTypesResponse?.hasData ? vatTypesResponse.items : [];

  // Cargar TODOS los tipos de IVA (para mostrar siempre la tabla completa)
  const { data: allVatTypes, isLoading: loadingAllVat } = useQuery({
    queryKey: ['all-vat-types', legalEntityId],
    queryFn: async () => {
      // Primero obtener todos los tipos de IVA
      const vatResponse = await fetch(
        `/api/vat-types?legalEntityId=${legalEntityId}`
      );
      if (!vatResponse.ok) throw new Error('Error loading all VAT types');
      const vatTypes = await vatResponse.json();
      
      // Luego obtener los mapeos existentes
      const mappingsResponse = await fetch(
        `/api/accounting/vat-mappings?legalEntityId=${legalEntityId}`
      );
      const mappings = mappingsResponse.ok ? await mappingsResponse.json() : [];
      
      // Crear un mapa de mapeos por vatTypeId para búsqueda rápida
      const mappingsByVatType = mappings.reduce((acc: any, mapping: any) => {
        acc[mapping.vatTypeId] = mapping;
        return acc;
      }, {});
      
      // Combinar los tipos de IVA con sus mapeos
      return vatTypes.map((vat: any) => {
        const mapping = mappingsByVatType[vat.id];
        return {
          vatTypeId: vat.id,
          vatTypeName: vat.name,
          vatRate: vat.rate,
          currentInputAccountId: mapping?.inputAccountId || null,
          currentOutputAccountId: mapping?.outputAccountId || null
        };
      });
    }
  });

  // Cargar tipos de gastos sin mapear
  const { data: expenseTypesResponse, isLoading: loadingExpenses } = useQuery({
    queryKey: ['unmapped-expense-types', legalEntityId],
    queryFn: async () => {
      const response = await fetch(
        `/api/accounting/unmapped-items?type=expense&legalEntityId=${legalEntityId}`
      );
      if (!response.ok) throw new Error('Error loading expense types');
      return response.json() as Promise<{
        hasData: boolean;
        reason?: string;
        items: any[];
      }>;
    }
  });

  const unmappedExpenseTypes = expenseTypesResponse?.hasData ? expenseTypesResponse.items : [];

  // Cargar cajas/terminales sin mapear
  const { data: cashSessionsResponse, isLoading: loadingCashSessions } = useQuery({
    queryKey: ['unmapped-cash-sessions', legalEntityId],
    queryFn: async () => {
      const response = await fetch(
        `/api/accounting/unmapped-items?type=cash-session&legalEntityId=${legalEntityId}`
      );
      if (!response.ok) throw new Error('Error loading cash sessions');
      return response.json() as Promise<{
        hasData: boolean;
        reason?: string;
        items: any[];
      }>;
    }
  });

  const unmappedCashSessions = cashSessionsResponse?.hasData ? cashSessionsResponse.items : [];

  // Cargar tipos de descuento sin mapear
  const { data: discountTypesResponse, isLoading: loadingDiscounts } = useQuery({
    queryKey: ['unmapped-discount-types', legalEntityId],
    queryFn: async () => {
      const response = await fetch(
        `/api/accounting/unmapped-items?type=discount&legalEntityId=${legalEntityId}`
      );
      if (!response.ok) throw new Error('Error loading discount types');
      return response.json() as Promise<{
        hasData: boolean;
        reason?: string;
        items: any[];
      }>;
    }
  });

  const unmappedDiscountTypes = discountTypesResponse?.hasData ? discountTypesResponse.items : [];

  // Cargar plan de cuentas
  const { data: chartOfAccounts, isLoading: loadingChart } = useQuery({
    queryKey: ['chart-of-accounts', legalEntityId],
    queryFn: async () => {
      const response = await fetch(
        `/api/chart-of-accounts?legalEntityId=${legalEntityId}&allowsDirectEntry=true&isActive=true`
      );
      if (!response.ok) throw new Error('Error loading chart of accounts');
      return response.json() as Promise<ChartAccount[]>;
    }
  });

  // Mutación para guardar mapeos de categorías
  const saveCategoryMappings = useMutation({
    mutationFn: async (mappings: Record<string, string>) => {
      const response = await fetch('/api/accounting/category-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legalEntityId,
          systemId,
          mappings,
          applyToSubcategories
        })
      });
      if (!response.ok) throw new Error('Error saving mappings');
      return response.json();
    },
    onSuccess: () => {
      toast.success(translations.common.mappingSaved);
      if (activeTab === 'categories') {
        setActiveTab('payments');
      }
    },
    onError: () => {
      toast.error(translations.common.mappingError);
    }
  });

  // Mutación para guardar mapeos de métodos de pago
  const savePaymentMappings = useMutation({
    mutationFn: async (mappings: Record<string, string>) => {
      const response = await fetch('/api/accounting/payment-method-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legalEntityId,
          systemId,
          mappings
        })
      });
      if (!response.ok) throw new Error('Error saving mappings');
      return response.json();
    },
    onSuccess: () => {
      toast.success(translations.common.mappingSaved);
      if (activeTab === 'payments') {
        setActiveTab('vat');
      }
    },
    onError: () => {
      toast.error(translations.common.mappingError);
    }
  });

  // Mutación para guardar mapeos de IVA
  const saveVatMappings = useMutation({
    mutationFn: async (mappings: Record<string, { input?: string; output?: string }>) => {
      const response = await fetch('/api/accounting/vat-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legalEntityId,
          systemId,
          mappings
        })
      });
      if (!response.ok) throw new Error('Error saving mappings');
      return response.json();
    },
    onSuccess: () => {
      toast.success(translations.common.mappingSaved);
      onComplete?.();
    },
    onError: () => {
      toast.error(translations.common.mappingError);
    }
  });

  // Mutación para guardar mapeos de gastos
  const saveExpenseMappings = useMutation({
    mutationFn: async (mappings: Record<string, string>) => {
      const response = await fetch('/api/accounting/expense-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legalEntityId,
          systemId,
          mappings: Object.entries(mappings).map(([expenseTypeId, accountId]) => ({
            expenseTypeId,
            accountId
          }))
        })
      });
      if (!response.ok) throw new Error('Error saving mappings');
      return response.json();
    },
    onSuccess: () => {
      toast.success(translations.common.mappingSaved);
      if (activeTab === 'expenses') {
        setActiveTab('cash-sessions');
      }
    },
    onError: () => {
      toast.error(translations.common.mappingError);
    }
  });

  // Mutación para guardar mapeos de cajas
  const saveCashSessionMappings = useMutation({
    mutationFn: async (mappings: Record<string, string>) => {
      const response = await fetch('/api/accounting/cash-session-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legalEntityId,
          systemId,
          mappings: Object.entries(mappings).map(([id, accountId]) => {
            // Determinar si es clínica o terminal
            const item = unmappedCashSessions?.find((cs: any) => cs.id === id);
            return item?.type === 'clinic' 
              ? { clinicId: id, accountId }
              : { posTerminalId: id, accountId };
          })
        })
      });
      if (!response.ok) throw new Error('Error saving mappings');
      return response.json();
    },
    onSuccess: () => {
      toast.success(translations.common.mappingSaved);
      if (activeTab === 'cash-sessions') {
        setActiveTab('discounts');
      }
    },
    onError: () => {
      toast.error(translations.common.mappingError);
    }
  });

  // Mutación para guardar mapeos de descuentos
  const saveDiscountMappings = useMutation({
    mutationFn: async (mappings: Record<string, string>) => {
      const response = await fetch('/api/accounting/discount-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legalEntityId,
          systemId,
          mappings: Object.entries(mappings).map(([discountTypeCode, accountId]) => {
            const discount = unmappedDiscountTypes?.find((d: any) => d.discountTypeCode === discountTypeCode);
            return {
              discountTypeCode,
              discountTypeName: discount?.discountTypeName || discountTypeCode,
              accountId
            };
          })
        })
      });
      if (!response.ok) throw new Error('Error saving mappings');
      return response.json();
    },
    onSuccess: () => {
      toast.success(translations.common.mappingSaved);
      onComplete?.();
    },
    onError: () => {
      toast.error(translations.common.mappingError);
    }
  });

  const handleSaveCategories = () => {
    const validMappings = Object.entries(categoryMappings)
      .filter(([_, accountId]) => accountId)
      .reduce((acc, [categoryId, accountId]) => ({
        ...acc,
        [categoryId]: accountId
      }), {});

    if (Object.keys(validMappings).length === 0) {
      toast.warning(translations.common.noChanges);
      return;
    }

    saveCategoryMappings.mutate(validMappings);
  };

  const handleSavePayments = () => {
    const validMappings = Object.entries(paymentMappings)
      .filter(([_, accountId]) => accountId)
      .reduce((acc, [paymentMethodId, accountId]) => ({
        ...acc,
        [paymentMethodId]: accountId
      }), {});

    if (Object.keys(validMappings).length === 0) {
      toast.warning(translations.common.noChanges);
      return;
    }

    savePaymentMappings.mutate(validMappings);
  };

  const handleSaveVat = () => {
    const validMappings = Object.entries(vatMappings)
      .filter(([_, accounts]) => accounts.input || accounts.output)
      .reduce((acc, [vatTypeId, accounts]) => ({
        ...acc,
        [vatTypeId]: accounts
      }), {});

    if (Object.keys(validMappings).length === 0) {
      toast.warning(translations.common.noChanges);
      return;
    }

    saveVatMappings.mutate(validMappings);
  };

  const handleSaveExpenses = () => {
    const validMappings = Object.entries(expenseMappings)
      .filter(([_, accountId]) => accountId)
      .reduce((acc, [expenseTypeId, accountId]) => ({
        ...acc,
        [expenseTypeId]: accountId
      }), {});

    if (Object.keys(validMappings).length === 0) {
      toast.warning(translations.common.noChanges);
      return;
    }

    saveExpenseMappings.mutate(validMappings);
  };

  const handleSaveCashSessions = () => {
    const validMappings = Object.entries(cashSessionMappings)
      .filter(([_, accountId]) => accountId)
      .reduce((acc, [id, accountId]) => ({
        ...acc,
        [id]: accountId
      }), {});

    if (Object.keys(validMappings).length === 0) {
      toast.warning(translations.common.noChanges);
      return;
    }

    saveCashSessionMappings.mutate(validMappings);
  };

  const handleSaveDiscounts = () => {
    const validMappings = Object.entries(discountMappings)
      .filter(([_, accountId]) => accountId)
      .reduce((acc, [discountTypeCode, accountId]) => ({
        ...acc,
        [discountTypeCode]: accountId
      }), {});

    if (Object.keys(validMappings).length === 0) {
      toast.warning(translations.common.noChanges);
      return;
    }

    saveDiscountMappings.mutate(validMappings);
  };

  const unmappedCategoriesCount = unmappedCategories?.length || 0;
  const unmappedPaymentsCount = unmappedPaymentMethods?.length || 0;
  const unmappedVatCount = unmappedVatTypes?.length || 0;
  const unmappedExpensesCount = unmappedExpenseTypes?.length || 0;
  const unmappedCashSessionsCount = unmappedCashSessions?.length || 0;
  const unmappedDiscountsCount = unmappedDiscountTypes?.length || 0;

  // Comprobar si alguna sección tiene errores críticos (no_clinics_assigned, etc.)
  const hasDataIssues = [
    categoriesResponse?.reason,
    paymentMethodsResponse?.reason,
    vatTypesResponse?.reason,
    expenseTypesResponse?.reason,
    cashSessionsResponse?.reason,
    discountTypesResponse?.reason
  ].some(reason => reason === 'no_clinics_assigned' || reason === 'legal_entity_not_found');

  // Función para renderizar categorías con jerarquía
  const renderCategoryItem = (category: CategoryMapping) => {
    const indentLevel = category.level || 0;
    const hasMapping = categoryMappings[category.categoryId] || category.currentAccountId;
    
    return (
      <div
        key={category.categoryId}
        className={cn(
          "flex items-center gap-3 p-3 border rounded-lg transition-colors",
          hasMapping && "bg-muted/50"
        )}
        style={{ marginLeft: `${indentLevel * 20}px` }}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 font-medium">
            {indentLevel > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            {category.categoryName}
          </div>
          {category.hasChildren && (
            <div className="text-sm text-muted-foreground">
              {translations.categories.hasSubcategories}
            </div>
          )}
        </div>
        <Select
          value={categoryMappings[category.categoryId] || category.currentAccountId || ''}
          onValueChange={(value) => 
            setCategoryMappings(prev => ({
              ...prev,
              [category.categoryId]: value
            }))
          }
        >
          <SelectTrigger className="w-[350px]">
            <SelectValue placeholder={translations.common.selectAccount} />
          </SelectTrigger>
          <SelectContent>
            {chartOfAccounts?.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">
                    {account.accountNumber}
                  </span>
                  <span className="text-sm">{account.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {category.suggestedAccountId && !categoryMappings[category.categoryId] && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => 
              setCategoryMappings(prev => ({
                ...prev,
                [category.categoryId]: category.suggestedAccountId!
              }))
            }
          >
            <Sparkles className="w-4 h-4 mr-1" />
            {translations.common.useSuggestion}
          </Button>
        )}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          {translations.title}
        </CardTitle>
        <CardDescription>
          {translations.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="categories">
              <Folder className="w-4 h-4 mr-2" />
              {translations.tabs.categories}
              {unmappedCategoriesCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {unmappedCategoriesCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="payments">
              <CreditCard className="w-4 h-4 mr-2" />
              {translations.tabs.payments}
              {unmappedPaymentsCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {unmappedPaymentsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="vat">
              <Receipt className="w-4 h-4 mr-2" />
              {translations.tabs.vat}
              {unmappedVatCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {unmappedVatCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="expenses">
              <Receipt className="w-4 h-4 mr-2" />
              Gastos
              {unmappedExpensesCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {unmappedExpensesCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="cash-sessions">
              <Calculator className="w-4 h-4 mr-2" />
              Cajas
              {unmappedCashSessionsCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {unmappedCashSessionsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="discounts">
              <Tag className="w-4 h-4 mr-2" />
              Descuentos
              {unmappedDiscountsCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {unmappedDiscountsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="rules">
              <Wand2 className="w-4 h-4 mr-2" />
              {translations.tabs.rules}
            </TabsTrigger>
          </TabsList>

          {/* Pestaña de Categorías */}
          <TabsContent value="categories" className="mt-4 space-y-4">
            {loadingCategories || loadingChart ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : !categoriesResponse?.hasData ? (
              <NoDataMessage reason={categoriesResponse?.reason} type="categories" />
            ) : unmappedCategories && unmappedCategories.length > 0 ? (
              <>
                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertDescription>
                    {translations.categories.info}
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  {unmappedCategories.map(renderCategoryItem)}
                </div>

                <div className="flex items-center pt-4 space-x-2">
                  <Checkbox
                    id="apply-subcategories"
                    checked={applyToSubcategories}
                    onCheckedChange={(checked) => 
                      setApplyToSubcategories(checked as boolean)
                    }
                  />
                  <Label htmlFor="apply-subcategories" className="cursor-pointer">
                    {translations.categories.applyToSubcategories}
                  </Label>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={onComplete}>
                    {translations.common.cancel}
                  </Button>
                  <Button 
                    onClick={handleSaveCategories}
                    disabled={saveCategoryMappings.isPending || Object.keys(categoryMappings).length === 0}
                  >
                    {saveCategoryMappings.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {translations.common.saving}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {translations.common.save}
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <NoDataMessage reason="all_categories_mapped" type="categories" />
            )}
          </TabsContent>

          {/* Pestaña de Métodos de Pago */}
          <TabsContent value="payments" className="mt-4 space-y-4">
            {loadingPayments || loadingChart ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : !paymentMethodsResponse?.hasData ? (
              <NoDataMessage reason={paymentMethodsResponse?.reason} type="payments" />
            ) : unmappedPaymentMethods && unmappedPaymentMethods.length > 0 ? (
              <>
                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertDescription>
                    {translations.payments.info}
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  {unmappedPaymentMethods.map((payment) => (
                    <div
                      key={payment.paymentMethodId}
                      className="flex items-center gap-3 p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{payment.paymentMethodName}</div>
                        <div className="text-sm text-muted-foreground">
                          Código: {payment.paymentMethodCode}
                        </div>
                      </div>
                      <Select
                        value={paymentMappings[payment.paymentMethodId] || payment.currentAccountId || ''}
                        onValueChange={(value) => 
                          setPaymentMappings(prev => ({
                            ...prev,
                            [payment.paymentMethodId]: value
                          }))
                        }
                      >
                        <SelectTrigger className="w-[350px]">
                          <SelectValue placeholder={translations.common.selectAccount} />
                        </SelectTrigger>
                        <SelectContent>
                          {chartOfAccounts?.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm">
                                  {account.accountNumber}
                                </span>
                                <span className="text-sm">{account.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {payment.suggestedAccountId && !paymentMappings[payment.paymentMethodId] && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => 
                            setPaymentMappings(prev => ({
                              ...prev,
                              [payment.paymentMethodId]: payment.suggestedAccountId!
                            }))
                          }
                        >
                          <Sparkles className="w-4 h-4 mr-1" />
                          {translations.common.useSuggestion}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setActiveTab('categories')}>
                    Volver
                  </Button>
                  <Button 
                    onClick={handleSavePayments}
                    disabled={savePaymentMappings.isPending || Object.keys(paymentMappings).length === 0}
                  >
                    {savePaymentMappings.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {translations.common.saving}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {translations.common.save}
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <NoDataMessage reason="all_payment_methods_mapped" type="payments" />
            )}
          </TabsContent>

          {/* Pestaña de IVA */}
          <TabsContent value="vat" className="mt-4 space-y-4">
            {loadingAllVat || loadingChart ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : !vatTypesResponse?.hasData ? (
              <NoDataMessage reason={vatTypesResponse?.reason} type="vat" />
            ) : (
              <>
                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertDescription>
                    {translations.vat.info}
                  </AlertDescription>
                </Alert>

                {/* Mensaje más pequeño cuando todo está mapeado */}
                {unmappedVatCount === 0 && (
                  <div className="flex items-center gap-2 mb-4 text-sm text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>{translations.vat.noMappings}</span>
                  </div>
                )}

                <div className="space-y-4">
                  {allVatTypes && allVatTypes.map((vat) => (
                    <div
                      key={vat.vatTypeId}
                      className="p-4 space-y-3 border rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{vat.vatTypeName}</div>
                          <div className="text-sm text-muted-foreground">
                            Tasa: {vat.vatRate}%
                          </div>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="grid grid-cols-2 gap-4">
                        {/* IVA Soportado (Compras) */}
                        <div className="space-y-2">
                          <Label>{translations.vat.inputAccount}</Label>
                          <Select
                            value={vatMappings[vat.vatTypeId]?.input || vat.currentInputAccountId || ''}
                            onValueChange={(value) => 
                              setVatMappings(prev => ({
                                ...prev,
                                [vat.vatTypeId]: {
                                  ...prev[vat.vatTypeId],
                                  input: value
                                }
                              }))
                            }
                            disabled={unmappedVatCount === 0 && !vatMappings[vat.vatTypeId]}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={translations.common.selectAccount} />
                            </SelectTrigger>
                            <SelectContent>
                              {chartOfAccounts?.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm">
                                      {account.accountNumber}
                                    </span>
                                    <span className="text-sm">{account.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* IVA Repercutido (Ventas) */}
                        <div className="space-y-2">
                          <Label>{translations.vat.outputAccount}</Label>
                          <Select
                            value={vatMappings[vat.vatTypeId]?.output || vat.currentOutputAccountId || ''}
                            onValueChange={(value) => 
                              setVatMappings(prev => ({
                                ...prev,
                                [vat.vatTypeId]: {
                                  ...prev[vat.vatTypeId],
                                  output: value
                                }
                              }))
                            }
                            disabled={unmappedVatCount === 0 && !vatMappings[vat.vatTypeId]}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={translations.common.selectAccount} />
                            </SelectTrigger>
                            <SelectContent>
                              {chartOfAccounts?.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm">
                                      {account.accountNumber}
                                    </span>
                                    <span className="text-sm">{account.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {unmappedVatCount > 0 && (
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => setActiveTab('payments')}>
                      Volver
                    </Button>
                    <Button 
                      onClick={handleSaveVat}
                      disabled={saveVatMappings.isPending || Object.keys(vatMappings).length === 0}
                    >
                      {saveVatMappings.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {translations.common.saving}
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          {translations.common.save}
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Pestaña de Gastos */}
          <TabsContent value="expenses" className="mt-4 space-y-4">
            {loadingExpenses || loadingChart ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : !expenseTypesResponse?.hasData ? (
              <NoDataMessage reason={expenseTypesResponse?.reason} type="expenses" />
            ) : unmappedExpenseTypes && unmappedExpenseTypes.length > 0 ? (
              <>
                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertDescription>
                    Configure las cuentas contables para los diferentes tipos de gastos de la clínica.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  {unmappedExpenseTypes.map((expense: any) => (
                    <div
                      key={expense.expenseTypeId}
                      className="flex items-center gap-3 p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{expense.expenseTypeName}</div>
                        <div className="text-sm text-muted-foreground">
                          Código: {expense.expenseTypeCode}
                        </div>
                      </div>
                      <Select
                        value={expenseMappings[expense.expenseTypeId] || expense.account || ''}
                        onValueChange={(value) => 
                          setExpenseMappings(prev => ({
                            ...prev,
                            [expense.expenseTypeId]: value
                          }))
                        }
                      >
                        <SelectTrigger className="w-[350px]">
                          <SelectValue placeholder={translations.common.selectAccount} />
                        </SelectTrigger>
                        <SelectContent>
                          {chartOfAccounts?.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm">
                                  {account.accountNumber}
                                </span>
                                <span className="text-sm">{account.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setActiveTab('vat')}>
                    Volver
                  </Button>
                  <Button 
                    onClick={handleSaveExpenses}
                    disabled={saveExpenseMappings.isPending || Object.keys(expenseMappings).length === 0}
                  >
                    {saveExpenseMappings.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {translations.common.saving}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {translations.common.save}
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <NoDataMessage reason="all_expense_types_mapped" type="expenses" />
            )}
          </TabsContent>

          {/* Pestaña de Cajas/Terminales */}
          <TabsContent value="cash-sessions" className="mt-4 space-y-4">
            {loadingCashSessions || loadingChart ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : !cashSessionsResponse?.hasData ? (
              <NoDataMessage reason={cashSessionsResponse?.reason} type="cash-sessions" />
            ) : unmappedCashSessions && unmappedCashSessions.length > 0 ? (
              <>
                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertDescription>
                    Configure las cuentas de tesorería para cada caja o terminal POS.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  {unmappedCashSessions.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 font-medium">
                          {item.type === 'clinic' ? (
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <CreditCard className="w-4 h-4 text-muted-foreground" />
                          )}
                          {item.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {item.type === 'clinic' ? 'Clínica' : 'Terminal POS'}
                        </div>
                      </div>
                      <Select
                        value={cashSessionMappings[item.id] || item.account || ''}
                        onValueChange={(value) => 
                          setCashSessionMappings(prev => ({
                            ...prev,
                            [item.id]: value
                          }))
                        }
                      >
                        <SelectTrigger className="w-[350px]">
                          <SelectValue placeholder={translations.common.selectAccount} />
                        </SelectTrigger>
                        <SelectContent>
                          {chartOfAccounts?.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm">
                                  {account.accountNumber}
                                </span>
                                <span className="text-sm">{account.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setActiveTab('expenses')}>
                    Volver
                  </Button>
                  <Button 
                    onClick={handleSaveCashSessions}
                    disabled={saveCashSessionMappings.isPending || Object.keys(cashSessionMappings).length === 0}
                  >
                    {saveCashSessionMappings.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {translations.common.saving}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {translations.common.save}
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <NoDataMessage reason="all_cash_entities_mapped" type="cash-sessions" />
            )}
          </TabsContent>

          {/* Pestaña de Descuentos */}
          <TabsContent value="discounts" className="mt-4 space-y-4">
            {loadingDiscounts || loadingChart ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : !discountTypesResponse?.hasData ? (
              <NoDataMessage reason={discountTypesResponse?.reason} type="discounts" />
            ) : unmappedDiscountTypes && unmappedDiscountTypes.length > 0 ? (
              <>
                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertDescription>
                    Configure las cuentas para registrar los diferentes tipos de descuentos aplicados.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  {unmappedDiscountTypes.map((discount: any) => (
                    <div
                      key={discount.discountTypeCode}
                      className="flex items-center gap-3 p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{discount.discountTypeName}</div>
                        <div className="text-sm text-muted-foreground">
                          Código: {discount.discountTypeCode}
                        </div>
                      </div>
                      <Select
                        value={discountMappings[discount.discountTypeCode] || discount.account || ''}
                        onValueChange={(value) => 
                          setDiscountMappings(prev => ({
                            ...prev,
                            [discount.discountTypeCode]: value
                          }))
                        }
                      >
                        <SelectTrigger className="w-[350px]">
                          <SelectValue placeholder={translations.common.selectAccount} />
                        </SelectTrigger>
                        <SelectContent>
                          {chartOfAccounts?.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm">
                                  {account.accountNumber}
                                </span>
                                <span className="text-sm">{account.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setActiveTab('cash-sessions')}>
                    Volver
                  </Button>
                  <Button 
                    onClick={handleSaveDiscounts}
                    disabled={saveDiscountMappings.isPending || Object.keys(discountMappings).length === 0}
                  >
                    {saveDiscountMappings.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {translations.common.saving}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {translations.common.save}
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <NoDataMessage reason="all_promotions_mapped" type="discounts" />
            )}
          </TabsContent>

          {/* Pestaña de Reglas */}
          <TabsContent value="rules" className="mt-4">
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                {translations.rules.comingSoon}
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 