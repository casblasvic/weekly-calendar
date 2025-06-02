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
  
  // Cargar categorías sin mapear
  const { data: unmappedCategories, isLoading: loadingCategories } = useQuery({
    queryKey: ['unmapped-categories', legalEntityId],
    queryFn: async () => {
      const response = await fetch(
        `/api/accounting/unmapped-items?type=category&legalEntityId=${legalEntityId}`
      );
      if (!response.ok) throw new Error('Error loading categories');
      const data = await response.json() as CategoryMapping[];
      
      // Organizar categorías por jerarquía
      return data.sort((a, b) => {
        // Primero las categorías padre, luego por nivel
        if (!a.parentId && b.parentId) return -1;
        if (a.parentId && !b.parentId) return 1;
        return (a.level || 0) - (b.level || 0);
      });
    }
  });

  // Cargar métodos de pago sin mapear
  const { data: unmappedPaymentMethods, isLoading: loadingPayments } = useQuery({
    queryKey: ['unmapped-payment-methods', legalEntityId],
    queryFn: async () => {
      const response = await fetch(
        `/api/accounting/unmapped-items?type=payment-method&legalEntityId=${legalEntityId}`
      );
      if (!response.ok) throw new Error('Error loading payment methods');
      return response.json() as Promise<PaymentMethodMapping[]>;
    }
  });

  // Cargar tipos de IVA sin mapear
  const { data: unmappedVatTypes, isLoading: loadingVat } = useQuery({
    queryKey: ['unmapped-vat-types', legalEntityId],
    queryFn: async () => {
      const response = await fetch(
        `/api/accounting/unmapped-items?type=vat&legalEntityId=${legalEntityId}`
      );
      if (!response.ok) throw new Error('Error loading VAT types');
      return response.json() as Promise<VATMapping[]>;
    }
  });

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

  const unmappedCategoriesCount = unmappedCategories?.length || 0;
  const unmappedPaymentsCount = unmappedPaymentMethods?.length || 0;
  const unmappedVatCount = unmappedVatTypes?.length || 0;

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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <FolderTree className="w-4 h-4" />
              {translations.tabs.categories}
              {unmappedCategoriesCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {unmappedCategoriesCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              {translations.tabs.payments}
              {unmappedPaymentsCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {unmappedPaymentsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="vat" className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              {translations.tabs.vat}
              {unmappedVatCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {unmappedVatCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="rules" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              {translations.tabs.rules}
            </TabsTrigger>
          </TabsList>

          {/* Pestaña de Categorías */}
          <TabsContent value="categories" className="mt-4 space-y-4">
            {loadingCategories || loadingChart ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
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
              <div className="py-8 text-center">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <p className="text-muted-foreground">
                  {translations.categories.noMappings}
                </p>
              </div>
            )}
          </TabsContent>

          {/* Pestaña de Métodos de Pago */}
          <TabsContent value="payments" className="mt-4 space-y-4">
            {loadingPayments || loadingChart ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
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
              <div className="py-8 text-center">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <p className="text-muted-foreground">
                  {translations.payments.noMappings}
                </p>
              </div>
            )}
          </TabsContent>

          {/* Pestaña de IVA */}
          <TabsContent value="vat" className="mt-4 space-y-4">
            {loadingVat || loadingChart ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : unmappedVatTypes && unmappedVatTypes.length > 0 ? (
              <>
                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertDescription>
                    {translations.vat.info}
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  {unmappedVatTypes.map((vat) => (
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
              </>
            ) : (
              <div className="py-8 text-center">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <p className="text-muted-foreground">
                  {translations.vat.noMappings}
                </p>
              </div>
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