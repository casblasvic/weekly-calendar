/**
 * Configurador de Mapeos Contables
 * 
 * Permite configurar manualmente las relaciones entre:
 * - Servicios → Cuentas contables
 * - Métodos de pago → Cuentas contables  
 * - Tipos de IVA → Cuentas contables
 * - Reglas automáticas de mapeo
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Save,
  Package,
  CreditCard,
  Percent,
  Receipt,
  Settings,
  Briefcase,
  CheckCircle2,
  Info,
  Wand2,
  Calculator,
  ChevronRight,
  ChevronDown,
  Loader2,
  AlertCircle,
  Building2,
  Sparkles,
  Tag,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/utils/api-client";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/use-toast";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";

interface AccountingMappingConfiguratorProps {
  systemId: string;
  legalEntityId: string;
  currentLanguage?: string;
  onComplete?: () => void;
}

interface ServiceMapping {
  id: string;
  name: string;
  categoryId?: string;
  categoryName?: string;
  currentAccountId?: string;
  suggestedAccountId?: string;
  hasChildren: boolean;
  level?: number;
  path?: string;
  clinicName?: string;
  clinicId?: string;
  isGlobal?: boolean;
  price?: number;
  hasMapping?: boolean;
  accountId?: string;
  accountCode?: string;
  accountName?: string;
}

interface ProductMapping {
  id: string;
  name: string;
  categoryId?: string;
  categoryName?: string;
  currentAccountId?: string;
  suggestedAccountId?: string;
  hasChildren: boolean;
  level?: number;
  path?: string;
  clinicName?: string;
  clinicId?: string;
  isGlobal?: boolean;
  price?: number;
  accountId?: string;
  accountCode?: string;
  accountName?: string;
  salesAccountId?: string;
  salesAccountCode?: string;
  salesAccountName?: string;
  purchaseAccountId?: string;
  purchaseAccountCode?: string;
  purchaseAccountName?: string;
}

interface PaymentMethodMapping {
  id: string;
  name: string;
  code: string;
  type: string;
  isGlobal: boolean;
  isMapped: boolean;
  currentAccountId?: string | null;
  isActive: boolean;
  clinicName?: string;
  clinicId?: string;
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
  description: 'Configure las cuentas contables para cada elemento del centro de negocio',
  tabs: {
    services: 'Servicios',
    products: 'Productos',
    payments: 'Métodos de Pago',
    vat: 'Tipos de IVA',
    rules: 'Reglas Automáticas'
  },
  services: {
    info: 'Asigne cuentas contables a los servicios. Las subcategorías heredarán la cuenta de su categoría padre si no se especifica una diferente.',
    hasSubcategories: 'Tiene subcategorías',
    noMappings: 'Todos los servicios están correctamente mapeados',
    applyToSubcategories: 'Aplicar a todas las subcategorías'
  },
  products: {
    info: 'Asigne cuentas contables a los productos. Las subcategorías heredarán la cuenta de su categoría padre si no se especifica una diferente.',
    hasSubcategories: 'Tiene subcategorías',
    noMappings: 'Todos los productos están correctamente mapeados',
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
  const [activeTab, setActiveTab] = useState('services');
  const [hasChanges, setHasChanges] = useState(false);
  const [applyToSubcategories, setApplyToSubcategories] = useState(true);

  // PRIMERO: Verificar si la sociedad fiscal tiene centros asociados
  const { data: clinicsCheckData, isLoading: checkingClinics } = useQuery({
    queryKey: ['check-legal-entity-clinics', legalEntityId],
    queryFn: async () => {
      const response = await fetch(
        `/api/accounting/check-legal-entity-clinics?legalEntityId=${legalEntityId}`
      );
      if (!response.ok) throw new Error('Error checking clinics');
      return response.json();
    },
    enabled: !!legalEntityId && !!systemId
  });

  const hasClinics = clinicsCheckData?.hasClinics || false;
  const clinicsWithoutTariffs = clinicsCheckData?.clinicsWithoutTariffs || [];

  // Mapeos locales
  const [serviceMappings, setServiceMappings] = useState<Record<string, string>>({});
  const [productMappings, setProductMappings] = useState<Record<string, string>>({});
  const [paymentMappings, setPaymentMappings] = useState<Record<string, string>>({});
  const [vatMappings, setVatMappings] = useState<Record<string, { input?: string; output?: string }>>({});
  const [expenseMappings, setExpenseMappings] = useState<Record<string, string>>({});
  const [cashSessionMappings, setCashSessionMappings] = useState<Record<string, string>>({});
  const [discountMappings, setDiscountMappings] = useState<Record<string, string>>({});

  // Mutation para ejecutar el mapeo automático
  const executeAutoMapping = useMutation({
    mutationFn: async (params: { types?: string[], forceRemap?: boolean }) => {
      const { types, forceRemap = false } = params;
      
      // Validar que tenemos los IDs necesarios
      if (!legalEntityId || !systemId) {
        throw new Error('Falta información de la entidad legal o sistema');
      }
      
      // Verificar qué tipos tienen elementos disponibles para mapear
      const availableTypes: string[] = [];
      
      // Si forceRemap es true, incluir todos los tipos con elementos
      if (forceRemap) {
        if (allServices.length > 0) availableTypes.push('services');
        if (allProducts.length > 0) availableTypes.push('products');
        if (allPaymentMethods.length > 0) availableTypes.push('paymentMethods');
        if (allVatTypes && allVatTypes.length > 0) availableTypes.push('vat');
        if (expenseTypesResponse?.hasData && expenseTypesResponse.items.length > 0) availableTypes.push('expenseTypes');
        if (cashSessionsResponse?.hasData && cashSessionsResponse.items.length > 0) availableTypes.push('cashEntities');
        if (discountTypesResponse?.hasData && discountTypesResponse.items.length > 0) availableTypes.push('promotions');
      } else {
        // Filtrar solo los items no mapeados
        const unmappedServicesFiltered = allServices.filter(s => !s.currentAccountId);
        const unmappedProductsFiltered = allProducts.filter(p => !p.currentAccountId);
        const unmappedPaymentMethodsFiltered = allPaymentMethods.filter(p => !p.currentAccountId);
        
        if (types?.includes('all') || !types) {
          // Si es 'all', verificar qué elementos existen sin mapear
          if (unmappedServicesFiltered.length > 0) availableTypes.push('services');
          if (unmappedProductsFiltered.length > 0) availableTypes.push('products');
          if (unmappedPaymentMethodsFiltered.length > 0) availableTypes.push('paymentMethods');
          if (unmappedVatTypes.length > 0) availableTypes.push('vat');
          if (unmappedExpenseTypes.length > 0) availableTypes.push('expenseTypes');
          if (unmappedCashEntities.length > 0) availableTypes.push('cashEntities');
          if (unmappedDiscountTypes.length > 0) availableTypes.push('promotions');
        } else {
          // Si son tipos específicos, verificar cada uno
          types.forEach(type => {
            if (type === 'services' && unmappedServicesFiltered.length > 0) availableTypes.push('services');
            if (type === 'products' && unmappedProductsFiltered.length > 0) availableTypes.push('products');
            if (type === 'paymentMethods' && unmappedPaymentMethodsFiltered.length > 0) availableTypes.push('paymentMethods');
            if (type === 'vat' && unmappedVatTypes.length > 0) availableTypes.push('vat');
            if (type === 'expenseTypes' && unmappedExpenseTypes.length > 0) availableTypes.push('expenseTypes');
            if (type === 'cashEntities' && unmappedCashEntities.length > 0) availableTypes.push('cashEntities');
            if (type === 'promotions' && unmappedDiscountTypes.length > 0) availableTypes.push('promotions');
          });
        }
      }
      
      // Si no hay elementos disponibles para mapear, no hacer la llamada
      if (availableTypes.length === 0) {
        toast.warning('No hay elementos disponibles para mapear');
        return { categories: { mapped: 0, errors: 0 }, products: { mapped: 0, errors: 0 }, 
                services: { mapped: 0, errors: 0 }, paymentMethods: { mapped: 0, errors: 0 } };
      }
      
      const response = await fetch('/api/accounting/auto-map-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          legalEntityId,
          systemId,
          types: availableTypes.length > 0 ? availableTypes : ['all'],
          forceRemap // Pasar el parámetro al backend
        })
      });
      
      if (!response.ok) {
        throw new Error('Error al ejecutar mapeo automático');
      }
      
      return response.json();
    },
    onSuccess: async (data) => {
      // La respuesta tiene la estructura: { success, message, results: { categories: { mapped, errors }, ... } }
      let successful = 0;
      
      if (data.results) {
        Object.values(data.results).forEach((result: any) => {
          if (result.mapped) {
            successful += result.mapped;
          }
        });
      }
      
      if (successful > 0) {
        toast.success(`Se mapearon ${successful} elementos correctamente`);
      } else {
        toast.info('No se encontraron elementos para mapear');
      }
      
      // Refrescar TODAS las queries relacionadas para actualizar tanto elementos sin mapear como mapeados
      await Promise.all([
        refetchServices(),
        refetchProducts(),
        refetchPaymentMethods(),
        refetchUnmappedVat(),
        refetchUnmappedExpenses(),
        refetchUnmappedDiscounts(),
        refetchUnmappedCashSessions(),
        // También refrescar las queries de todos los elementos con mapeos
        refetchAllVat && refetchAllVat(),
      ]);
      
      // También mostrar el mensaje general del servidor si existe
      if (data.message) {
        toast.info(data.message);
      }
    },
    onError: (error) => {
      console.error('Error en mapeo automático:', error);
      toast.error('Error al ejecutar el mapeo automático');
    }
  });

  // Función para obtener el mensaje de razón
  const getReasonMessage = (reason: string, type: string): React.ReactElement => {
    if (reason === 'no_clinics_assigned') {
      return (
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Sin Datos Disponibles</AlertTitle>
          <AlertDescription className="mt-2">
            <div className="space-y-2">
              <p>Esta sociedad fiscal no tiene centros de negocio asignados. Configure al menos un centro de negocio para poder mapear elementos contables.</p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <span>💡</span>
                <span className="font-medium">Sugerencia:</span> Vaya a Configuración → Centros de Negocio para asignar al menos un centro de negocio a esta sociedad fiscal.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      );
    }
    
    const messages: Record<string, string> = {
      legal_entity_not_found: 'No se pudo encontrar la sociedad fiscal especificada.',
      no_unmapped_items: `No hay ${type} sin mapear en esta sociedad fiscal.`,
      all_items_mapped: `Todos los ${type} ya están mapeados correctamente.`,
      account_plan_missing: 'No se ha configurado un plan contable para esta sociedad fiscal.',
      account_plan_empty: 'El plan contable no contiene cuentas disponibles.'
    };
    
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>{messages[reason] || `No hay ${type} disponibles para mapear.`}</AlertDescription>
      </Alert>
    );
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
      {getReasonMessage(reason!, type)}
      {reason === 'no_clinics_assigned' && (
        <div className="p-4 mt-4 border border-blue-200 rounded-lg bg-blue-50">
          <p className="text-sm text-blue-800">
            💡 <strong>Sugerencia:</strong> Vaya a Configuración → Centros de Negocio para asignar al menos un centro de negocio a esta sociedad fiscal.
          </p>
        </div>
      )}
    </div>
  );

  // Cargar TODOS los servicios con sus mapeos
  const { data: servicesResponse, isLoading: loadingServices, refetch: refetchServices } = useQuery({
    queryKey: ['all-services-with-mappings', legalEntityId],
    queryFn: async () => {
      const response = await fetch(
        `/api/accounting/all-services-with-mappings?legalEntityId=${legalEntityId}`
      );
      if (!response.ok) throw new Error('Error loading services');
      return response.json();
    },
    enabled: !!legalEntityId && !!systemId && hasClinics
  });

  // Procesar servicios de todas las clínicas y globales
  const allServices = useMemo<ServiceMapping[]>(() => {
    if (!servicesResponse) return [];
    
    const services: ServiceMapping[] = [];
    
    // Servicios por clínica
    servicesResponse.items?.forEach((clinic: any) => {
      clinic.services?.forEach((service: any) => {
        services.push({
          ...service,
          clinicName: clinic.clinicName,
          clinicId: clinic.clinicId,
          isGlobal: false
        });
      });
    });
    
    // Servicios globales
    servicesResponse.globalServices?.forEach((service: any) => {
      services.push({
        ...service,
        clinicName: 'Global',
        isGlobal: true
      });
    });
    
    return services;
  }, [servicesResponse]);

  // Cargar TODOS los productos con sus mapeos
  const { data: productsResponse, isLoading: loadingProducts, refetch: refetchProducts } = useQuery({
    queryKey: ['all-products-with-mappings', legalEntityId],
    queryFn: async () => {
      const response = await fetch(
        `/api/accounting/all-products-with-mappings?legalEntityId=${legalEntityId}`
      );
      if (!response.ok) throw new Error('Error loading products');
      return response.json();
    },
    enabled: !!legalEntityId && !!systemId && hasClinics
  });

  // Procesar productos de todas las clínicas y globales
  const allProducts = useMemo<ProductMapping[]>(() => {
    if (!productsResponse) return [];
    
    const products: ProductMapping[] = [];
    
    // Productos por clínica
    productsResponse.items?.forEach((clinic: any) => {
      clinic.products?.forEach((product: any) => {
        products.push({
          ...product,
          clinicName: clinic.clinicName,
          clinicId: clinic.clinicId,
          isGlobal: false
        });
      });
    });
    
    // Productos globales
    productsResponse.globalProducts?.forEach((product: any) => {
      products.push({
        ...product,
        clinicName: 'Global',
        isGlobal: true
      });
    });
    
    return products;
  }, [productsResponse]);

  // Cargar métodos de pago sin mapear y mapeados
  const {
    data: paymentMethodsResponse,
    isLoading: loadingPayments,
    refetch: refetchPaymentMethods
  } = useQuery({
    queryKey: ['payment-methods-mappings', legalEntityId, systemId],
    queryFn: async () => {
      // Si hay centros, traer TODOS los métodos de pago
      if (hasClinics) {
        const response = await fetch(
          `/api/accounting/all-payment-methods-with-mappings?systemId=${systemId}&legalEntityId=${legalEntityId}`
        );
        if (!response.ok) throw new Error('Error loading payment methods');
        return response.json();
      }
      return null;
    },
    enabled: !!legalEntityId && !!systemId && hasClinics
  });

  // Procesar métodos de pago globales y por clínica
  const allPaymentMethods = useMemo(() => {
    if (!paymentMethodsResponse) return [];
    
    const methods: PaymentMethodMapping[] = [];
    
    // Métodos globales
    paymentMethodsResponse.global?.forEach((method: any) => {
      methods.push({
        ...method,
        clinicName: 'Global'
      });
    });
    
    // Métodos por clínica
    paymentMethodsResponse.clinics?.forEach((clinic: any) => {
      clinic.paymentMethods?.forEach((method: any) => {
        methods.push({
          ...method,
          clinicName: clinic.clinicName,
          clinicId: clinic.clinicId
        });
      });
    });
    
    return methods;
  }, [paymentMethodsResponse]);

  // Cargar tipos de IVA sin mapear
  const { data: vatTypesResponse, isLoading: loadingVat, refetch: refetchUnmappedVat } = useQuery({
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
    },
    enabled: !!legalEntityId && !!systemId && hasClinics
  });

  const unmappedVatTypes = vatTypesResponse?.hasData ? vatTypesResponse.items : [];

  // Cargar TODOS los tipos de IVA (para mostrar siempre la tabla completa)
  const { data: allVatTypes, isLoading: loadingAllVat, refetch: refetchAllVat } = useQuery({
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
    },
    enabled: !!legalEntityId && !!systemId && hasClinics
  });

  // Cargar tipos de gastos sin mapear
  const { data: expenseTypesResponse, isLoading: loadingExpenses, refetch: refetchUnmappedExpenses } = useQuery({
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
    },
    enabled: !!legalEntityId && !!systemId && hasClinics
  });

  const unmappedExpenseTypes = expenseTypesResponse?.hasData ? expenseTypesResponse.items : [];

  // Cargar cajas/terminales sin mapear
  const { data: cashSessionsResponse, isLoading: loadingCashSessions, refetch: refetchUnmappedCashSessions } = useQuery({
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
    },
    enabled: !!legalEntityId && !!systemId && hasClinics
  });

  const unmappedCashEntities = cashSessionsResponse?.hasData ? cashSessionsResponse.items : [];

  // Cargar tipos de descuento sin mapear
  const { data: discountTypesResponse, isLoading: loadingDiscounts, refetch: refetchUnmappedDiscounts } = useQuery({
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
    },
    enabled: !!legalEntityId && !!systemId && hasClinics
  });

  const unmappedDiscountTypes = discountTypesResponse?.hasData ? discountTypesResponse.items : [];

  // Cargar plan de cuentas
  const { data: chartOfAccounts, isLoading: loadingChartOfAccounts, refetch: refetchChartOfAccounts } = useQuery({
    queryKey: ['chart-of-accounts', legalEntityId],
    queryFn: async () => {
      const response = await fetch(
        `/api/chart-of-accounts?legalEntityId=${legalEntityId}`
      );
      if (!response.ok) throw new Error('Error loading chart of accounts');
      return response.json();
    },
    enabled: !!legalEntityId && !!systemId && hasClinics
  });

  // Mutación para guardar mapeos de servicios
  const saveServiceMappings = useMutation({
    mutationFn: async (mappings: Record<string, string>) => {
      const response = await fetch('/api/accounting/service-mappings', {
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
      if (activeTab === 'services') {
        setActiveTab('products');
      }
    },
    onError: () => {
      toast.error(translations.common.mappingError);
    }
  });

  // Mutación para guardar mapeos de productos
  const saveProductMappings = useMutation({
    mutationFn: async (mappings: Record<string, string>) => {
      const response = await fetch('/api/accounting/product-mappings', {
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
      if (activeTab === 'products') {
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
            const item = unmappedCashEntities?.find((cs: any) => cs.id === id);
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

  const unmappedServicesCount = allServices.filter(service => !service.currentAccountId).length;
  const unmappedProductsCount = allProducts.filter(product => !product.currentAccountId).length;
  const unmappedPaymentsCount = allPaymentMethods.filter(payment => !payment.currentAccountId).length;
  const unmappedVatCount = unmappedVatTypes.filter(vat => 
    !vat.currentInputAccountId && !vat.currentOutputAccountId
  ).length;
  const unmappedExpensesCount = unmappedExpenseTypes.length;
  const unmappedCashEntitiesCount = unmappedCashEntities.length;
  const unmappedDiscountsCount = unmappedDiscountTypes.length;

  // Total de elementos sin mapear (solo los soportados por el mapeo automático)
  const totalUnmapped = unmappedServicesCount + unmappedProductsCount + unmappedPaymentsCount;

  // Comprobar si alguna sección tiene errores críticos (no_clinics_assigned, etc.)
  const hasDataIssues = [
    servicesResponse?.reason,
    productsResponse?.reason,
    paymentMethodsResponse?.reason,
    vatTypesResponse?.reason,
    expenseTypesResponse?.reason,
    cashSessionsResponse?.reason,
    discountTypesResponse?.reason
  ].some(reason => reason === 'no_clinics_assigned' || reason === 'legal_entity_not_found');

  const hasNoClinicsAssigned = !hasClinics;

  // Función para renderizar servicios con jerarquía
  const renderServiceItem = (service: ServiceMapping) => {
    const indentLevel = service.level || 0;
    const hasMapping = serviceMappings[service.id] || service.currentAccountId;
    
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 border rounded-lg transition-colors",
          hasMapping && "bg-muted/50"
        )}
        style={{ marginLeft: `${indentLevel * 20}px` }}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 font-medium">
            {indentLevel > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            {service.name}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {service.categoryName && <span>{service.categoryName}</span>}
            {service.clinicName && (
              <>
                <span>•</span>
                <span>{service.clinicName}</span>
              </>
            )}
            {service.price !== undefined && (
              <>
                <span>•</span>
                <span>{service.price}€</span>
              </>
            )}
          </div>
        </div>
        <Select
          value={serviceMappings[service.id] || service.currentAccountId || ''}
          onValueChange={(value) => 
            setServiceMappings(prev => ({
              ...prev,
              [service.id]: value
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
    );
  };

  const renderProductItem = (product: ProductMapping) => {
    const indentLevel = product.level || 0;
    const hasMapping = productMappings[product.id] || product.currentAccountId;
    
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 border rounded-lg transition-colors",
          hasMapping && "bg-muted/50"
        )}
        style={{ marginLeft: `${indentLevel * 20}px` }}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 font-medium">
            {indentLevel > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            <span className="text-gray-900 dark:text-gray-100">
              {product.name || 'Sin nombre'}
            </span>
          </div>
          {product.hasChildren && (
            <div className="text-sm text-muted-foreground">
              {translations.products.hasSubcategories}
            </div>
          )}
        </div>
        <Select
          value={productMappings[product.id] || product.currentAccountId || ''}
          onValueChange={(value) => 
            setProductMappings(prev => ({
              ...prev,
              [product.id]: value
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
        {product.suggestedAccountId && !productMappings[product.id] && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => 
              setProductMappings(prev => ({
                ...prev,
                [product.id]: product.suggestedAccountId!
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

  const handleSaveServices = () => {
    const validMappings = Object.entries(serviceMappings)
      .filter(([_, accountId]) => accountId)
      .reduce((acc, [id, accountId]) => ({
        ...acc,
        [id]: accountId
      }), {});

    if (Object.keys(validMappings).length === 0) {
      toast.warning(translations.common.noChanges);
      return;
    }

    saveServiceMappings.mutate(validMappings);
  };

  const handleSaveProducts = () => {
    const validMappings = Object.entries(productMappings)
      .filter(([_, accountId]) => accountId)
      .reduce((acc, [id, accountId]) => ({
        ...acc,
        [id]: accountId
      }), {});

    if (Object.keys(validMappings).length === 0) {
      toast.warning(translations.common.noChanges);
      return;
    }

    saveProductMappings.mutate(validMappings);
  };

  const handleSavePayments = () => {
    // Detectar cambios: comparar los valores actuales con los nuevos
    const changedMappings: Record<string, string> = {};
    
    allPaymentMethods.forEach(payment => {
      const newValue = paymentMappings[payment.id] || '';
      const currentValue = payment.currentAccountId || '';
      
      if (newValue !== currentValue) {
        changedMappings[payment.id] = newValue;
      }
    });

    if (Object.keys(changedMappings).length === 0) {
      toast.warning(translations.common.noChanges);
      return;
    }

    savePaymentMappings.mutate(changedMappings);
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

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              {translations.title}
            </CardTitle>
            <CardDescription>
              {translations.description}
            </CardDescription>
          </div>
          {totalUnmapped > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                {totalUnmapped} sin mapear
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="default" 
                    size="sm"
                    disabled={executeAutoMapping.isPending || totalUnmapped === 0}
                  >
                    {executeAutoMapping.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Wand2 className="w-4 h-4 mr-2" />
                    )}
                    Mapear Automáticamente
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[250px]">
                  <DropdownMenuLabel>Opciones de Mapeo</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => executeAutoMapping.mutate({ types: ['all'], forceRemap: true })}
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    <div>
                      <div className="font-medium">Forzar remapeo de todos</div>
                      <div className="text-xs text-muted-foreground">
                        Remapea todos los elementos
                      </div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => executeAutoMapping.mutate({ types: ['all'] })}
                    disabled={totalUnmapped === 0}
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    <div>
                      <div className="font-medium">Mapear sin mapear</div>
                      <div className="text-xs text-muted-foreground">
                        Solo elementos sin mapear
                      </div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => executeAutoMapping.mutate({ types: ['services'] })}
                    disabled={unmappedServicesCount === 0}
                  >
                    <Briefcase className="mr-2 h-4 w-4" />
                    <div>
                      <div className="font-medium">Solo servicios</div>
                      <div className="text-xs text-muted-foreground">
                        {unmappedServicesCount} sin mapear
                      </div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => executeAutoMapping.mutate({ types: ['products'] })}
                    disabled={unmappedProductsCount === 0}
                  >
                    <Package className="mr-2 h-4 w-4" />
                    <div>
                      <div className="font-medium">Solo productos</div>
                      <div className="text-xs text-muted-foreground">
                        {unmappedProductsCount} sin mapear
                      </div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => executeAutoMapping.mutate({ types: ['paymentMethods'] })}
                    disabled={unmappedPaymentsCount === 0}
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    <div>
                      <div className="font-medium">Solo métodos de pago</div>
                      <div className="text-xs text-muted-foreground">
                        {unmappedPaymentsCount} sin mapear
                      </div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => executeAutoMapping.mutate({ types: ['vat'] })}
                    disabled={unmappedVatCount === 0}
                  >
                    <Receipt className="mr-2 h-4 w-4" />
                    <div>
                      <div className="font-medium">Solo tipos de IVA</div>
                      <div className="text-xs text-muted-foreground">
                        {unmappedVatCount} sin mapear
                      </div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => executeAutoMapping.mutate({ types: ['expenseTypes'] })}
                    disabled={unmappedExpensesCount === 0}
                  >
                    <Receipt className="mr-2 h-4 w-4" />
                    <div>
                      <div className="font-medium">Solo gastos</div>
                      <div className="text-xs text-muted-foreground">
                        {unmappedExpensesCount} sin mapear
                      </div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => executeAutoMapping.mutate({ types: ['cashEntities'] })}
                    disabled={unmappedCashEntitiesCount === 0}
                  >
                    <Calculator className="mr-2 h-4 w-4" />
                    <div>
                      <div className="font-medium">Solo cajas</div>
                      <div className="text-xs text-muted-foreground">
                        {unmappedCashEntitiesCount} sin mapear
                      </div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => executeAutoMapping.mutate({ types: ['promotions'] })}
                    disabled={unmappedDiscountsCount === 0}
                  >
                    <Tag className="mr-2 h-4 w-4" />
                    <div>
                      <div className="font-medium">Solo descuentos</div>
                      <div className="text-xs text-muted-foreground">
                        {unmappedDiscountsCount} sin mapear
                      </div>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="services">
              <Briefcase className="w-4 h-4 mr-2" />
              {translations.tabs.services}
              {allServices.filter(s => !s.currentAccountId).length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {allServices.filter(s => !s.currentAccountId).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="products">
              <Package className="w-4 h-4 mr-2" />
              {translations.tabs.products}
              {allProducts.filter(p => !p.currentAccountId).length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {allProducts.filter(p => !p.currentAccountId).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="payments">
              <CreditCard className="w-4 h-4 mr-2" />
              {translations.tabs.payments}
              {allPaymentMethods.filter(p => !p.currentAccountId).length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {allPaymentMethods.filter(p => !p.currentAccountId).length}
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
              {unmappedCashEntitiesCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {unmappedCashEntitiesCount}
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

          {/* Pestaña de Servicios */}
          <TabsContent value="services" className="mt-4 space-y-4">
            {checkingClinics || loadingServices || loadingChartOfAccounts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : !hasClinics ? (
              getReasonMessage('no_clinics_assigned', 'servicios')
            ) : clinicsWithoutTariffs.length > 0 ? (
              // Mostrar mensaje si hay clínicas sin tarifa
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertTitle className="text-yellow-800">Centros sin Tarifa Asignada</AlertTitle>
                <AlertDescription className="text-yellow-700">
                  Los siguientes centros no tienen una tarifa asignada y no mostrarán servicios:
                  <ul className="mt-2 list-disc pl-5">
                    {clinicsWithoutTariffs.map((clinic: any) => (
                      <li key={clinic.id}>{clinic.name}</li>
                    ))}
                  </ul>
                  <p className="mt-2">
                    Por favor, asigne una tarifa a estos centros desde la configuración de centros de negocio.
                  </p>
                </AlertDescription>
              </Alert>
            ) : allServices && allServices.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <Alert className="flex-1 mr-4">
                    <Info className="w-4 h-4" />
                    <AlertDescription>
                      {translations.services.info}
                    </AlertDescription>
                  </Alert>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => executeAutoMapping.mutate({ types: ['services'] })}
                    disabled={executeAutoMapping.isPending || allServices.filter(s => !s.currentAccountId).length === 0}
                  >
                    {executeAutoMapping.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Wand2 className="w-4 h-4 mr-2" />
                    )}
                    Mapear Servicios
                  </Button>
                </div>

                <Accordion type="multiple" className="w-full">
                  {(() => {
                    const servicesByClinic = allServices.reduce((acc, service) => {
                      const key = service.clinicName || 'Sin Centro de Negocio';
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(service);
                      return acc;
                    }, {} as Record<string, ServiceMapping[]>);

                    return Object.entries(servicesByClinic).map(([clinicName, clinicServices]) => {
                      const unmappedCount = clinicServices.filter((s: ServiceMapping) => !s.currentAccountId).length;
                      const mappedCount = clinicServices.filter((s: ServiceMapping) => s.currentAccountId).length;
                      
                      return (
                        <AccordionItem key={clinicName} value={clinicName}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center justify-between w-full pr-4">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">{clinicName}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                {unmappedCount > 0 && (
                                  <Badge variant="destructive" className="h-5">
                                    {unmappedCount} sin mapear
                                  </Badge>
                                )}
                                {mappedCount > 0 && (
                                  <Badge variant="default" className="h-5 bg-green-500 text-white hover:bg-green-600">
                                    {mappedCount} mapeados
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="pt-4">
                              {/* Servicios no mapeados de este centro */}
                              {unmappedCount > 0 && (
                                <div className="mb-4">
                                  <h4 className="text-sm font-medium mb-2 text-red-600">
                                    Sin mapear ({unmappedCount})
                                  </h4>
                                  <div className="space-y-2">
                                    {clinicServices
                                      .filter((service: ServiceMapping) => !service.currentAccountId)
                                      .map((service) => (
                                        <div key={service.id}>
                                          {renderServiceItem(service)}
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              )}

                              {/* Servicios mapeados de este centro */}
                              {mappedCount > 0 && (
                                <div className="mb-4">
                                  <h4 className="text-sm font-medium mb-2 text-green-600">
                                    Mapeados ({mappedCount})
                                  </h4>
                                  <div className="space-y-2">
                                    {clinicServices
                                      .filter((service: ServiceMapping) => service.currentAccountId)
                                      .map((service) => (
                                        <div key={service.id}>
                                          {renderServiceItem(service)}
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    });
                  })()}
                </Accordion>

                <div className="flex items-center pt-4 space-x-2">
                  <Checkbox
                    id="apply-subcategories"
                    checked={applyToSubcategories}
                    onCheckedChange={(checked) => 
                      setApplyToSubcategories(checked as boolean)
                    }
                  />
                  <Label htmlFor="apply-subcategories" className="cursor-pointer">
                    {translations.services.applyToSubcategories}
                  </Label>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={onComplete}>
                    {translations.common.cancel}
                  </Button>
                  <Button 
                    onClick={handleSaveServices}
                    disabled={saveServiceMappings.isPending || Object.keys(serviceMappings).length === 0}
                  >
                    {saveServiceMappings.isPending ? (
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
              <NoDataMessage reason="all_services_mapped" type="services" />
            )}
          </TabsContent>

          {/* Pestaña de Productos */}
          <TabsContent value="products" className="mt-4 space-y-4">
            {checkingClinics || loadingProducts || loadingChartOfAccounts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : !hasClinics ? (
              getReasonMessage('no_clinics_assigned', 'productos')
            ) : clinicsWithoutTariffs.length > 0 ? (
              // Mostrar mensaje si hay clínicas sin tarifa
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertTitle className="text-yellow-800">Centros sin Tarifa Asignada</AlertTitle>
                <AlertDescription className="text-yellow-700">
                  Los siguientes centros no tienen una tarifa asignada y no mostrarán productos:
                  <ul className="mt-2 list-disc pl-5">
                    {clinicsWithoutTariffs.map((clinic: any) => (
                      <li key={clinic.id}>{clinic.name}</li>
                    ))}
                  </ul>
                  <p className="mt-2">
                    Por favor, asigne una tarifa a estos centros desde la configuración de centros de negocio.
                  </p>
                </AlertDescription>
              </Alert>
            ) : allProducts && allProducts.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <Alert className="flex-1 mr-4">
                    <Info className="w-4 h-4" />
                    <AlertDescription>
                      {translations.products.info}
                    </AlertDescription>
                  </Alert>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => executeAutoMapping.mutate({ types: ['products'] })}
                    disabled={executeAutoMapping.isPending || allProducts.filter(p => !p.currentAccountId).length === 0}
                  >
                    {executeAutoMapping.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Wand2 className="w-4 h-4 mr-2" />
                    )}
                    Mapear Productos
                  </Button>
                </div>

                <Accordion type="multiple" className="w-full">
                  {(() => {
                    const productsByClinic = allProducts.reduce((acc, product) => {
                      const key = product.clinicName || 'Sin Centro de Negocio';
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(product);
                      return acc;
                    }, {} as Record<string, ProductMapping[]>);

                    return Object.entries(productsByClinic).map(([clinicName, clinicProducts]) => {
                      const unmappedCount = clinicProducts.filter((p: ProductMapping) => !p.currentAccountId).length;
                      const mappedCount = clinicProducts.filter((p: ProductMapping) => p.currentAccountId).length;
                      
                      return (
                        <AccordionItem key={clinicName} value={clinicName}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center justify-between w-full pr-4">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">{clinicName}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                {unmappedCount > 0 && (
                                  <Badge variant="destructive" className="h-5">
                                    {unmappedCount} sin mapear
                                  </Badge>
                                )}
                                {mappedCount > 0 && (
                                  <Badge variant="default" className="h-5 bg-green-500 text-white hover:bg-green-600">
                                    {mappedCount} mapeados
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="pt-4">
                              {/* Productos no mapeados de este centro */}
                              {unmappedCount > 0 && (
                                <div className="mb-4">
                                  <h4 className="text-sm font-medium mb-2 text-red-600">
                                    Sin mapear ({unmappedCount})
                                  </h4>
                                  <div className="space-y-2">
                                    {clinicProducts
                                      .filter((product: ProductMapping) => !product.currentAccountId)
                                      .map((product) => (
                                        <div key={product.id}>
                                          {renderProductItem(product)}
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              )}

                              {/* Productos mapeados de este centro */}
                              {mappedCount > 0 && (
                                <div className="mb-4">
                                  <h4 className="text-sm font-medium mb-2 text-green-600">
                                    Mapeados ({mappedCount})
                                  </h4>
                                  <div className="space-y-2">
                                    {clinicProducts
                                      .filter((product: ProductMapping) => product.currentAccountId)
                                      .map((product) => (
                                        <div key={product.id}>
                                          {renderProductItem(product)}
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    });
                  })()}
                </Accordion>

                <div className="flex items-center pt-4 space-x-2">
                  <Checkbox
                    id="apply-subcategories"
                    checked={applyToSubcategories}
                    onCheckedChange={(checked) => 
                      setApplyToSubcategories(checked as boolean)
                    }
                  />
                  <Label htmlFor="apply-subcategories" className="cursor-pointer">
                    {translations.products.applyToSubcategories}
                  </Label>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setActiveTab('services')}>
                    Volver
                  </Button>
                  <Button 
                    onClick={handleSaveProducts}
                    disabled={saveProductMappings.isPending || Object.keys(productMappings).length === 0}
                  >
                    {saveProductMappings.isPending ? (
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
              <NoDataMessage reason="all_products_mapped" type="products" />
            )}
          </TabsContent>

          {/* Pestaña de Métodos de Pago */}
          <TabsContent value="payments" className="mt-4 space-y-4">
            {checkingClinics || loadingPayments || loadingChartOfAccounts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : !hasClinics ? (
              getReasonMessage('no_clinics_assigned', 'métodos de pago')
            ) : allPaymentMethods && allPaymentMethods.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <Alert className="flex-1 mr-4">
                    <Info className="w-4 h-4" />
                    <AlertDescription>
                      {translations.payments.info}
                    </AlertDescription>
                  </Alert>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => executeAutoMapping.mutate({ types: ['paymentMethods'] })}
                    disabled={executeAutoMapping.isPending || allPaymentMethods.filter(p => !p.currentAccountId).length === 0}
                  >
                    {executeAutoMapping.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Wand2 className="w-4 h-4 mr-2" />
                    )}
                    Mapear Métodos de Pago
                  </Button>
                </div>

                {/* Métodos de pago no mapeados */}
                {allPaymentMethods.filter(payment => !payment.currentAccountId).length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium mb-3">Sin mapear ({allPaymentMethods.filter(payment => !payment.currentAccountId).length})</h4>
                    <div className="space-y-3">
                      {allPaymentMethods.filter(payment => !payment.currentAccountId).map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center gap-3 p-3 border rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="font-medium">{payment.name}</div>
                            <div className="text-sm text-muted-foreground">
                              Código: {payment.code}
                            </div>
                          </div>
                          <Select
                            value={paymentMappings[payment.id] || ''}
                            onValueChange={(value) => 
                              setPaymentMappings(prev => ({
                                ...prev,
                                [payment.id]: value
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
                  </div>
                )}

                {/* Métodos de pago mapeados */}
                {allPaymentMethods.filter(payment => payment.currentAccountId).length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium mb-3">Mapeados ({allPaymentMethods.filter(payment => payment.currentAccountId).length})</h4>
                    <div className="space-y-3">
                      {allPaymentMethods.filter(payment => payment.currentAccountId).map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center gap-3 p-3 border rounded-lg bg-muted/20"
                        >
                          <div className="flex-1">
                            <div className="font-medium">{payment.name}</div>
                            <div className="text-sm text-muted-foreground">
                              Código: {payment.code} | 
                              Cuenta actual: {payment.currentAccountId}
                            </div>
                          </div>
                          <Select
                            value={paymentMappings[payment.id] || payment.currentAccountId || ''}
                            onValueChange={(value) => 
                              setPaymentMappings(prev => ({
                                ...prev,
                                [payment.id]: value
                              }))
                            }
                          >
                            <SelectTrigger className="w-[350px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">
                                <span className="text-muted-foreground">Sin asignar</span>
                              </SelectItem>
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
                  </div>
                )}
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setActiveTab('products')}>
                    Volver
                  </Button>
                  <Button 
                    onClick={handleSavePayments}
                    disabled={
                      savePaymentMappings.isPending || 
                      !allPaymentMethods.some(payment => {
                        const newValue = paymentMappings[payment.id] || '';
                        const currentValue = payment.currentAccountId || '';
                        return newValue !== currentValue;
                      })
                    }
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
            {checkingClinics || loadingVat || loadingChartOfAccounts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : !hasClinics ? (
              getReasonMessage('no_clinics_assigned', 'tipos de IVA')
            ) : vatTypesResponse ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <Alert className="flex-1 mr-4">
                    <Info className="w-4 h-4" />
                    <AlertDescription>
                      {translations.vat.info}
                    </AlertDescription>
                  </Alert>
                </div>

                {/* Mensaje más pequeño cuando todo está mapeado */}
                {unmappedVatCount === 0 && (
                  <div className="flex items-center gap-2 mb-4 text-sm text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
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
            ) : (
              <NoDataMessage reason="all_vat_types_mapped" type="vat" />
            )}
          </TabsContent>

          {/* Pestaña de Gastos */}
          <TabsContent value="expenses" className="mt-4 space-y-4">
            {checkingClinics || loadingExpenses || loadingChartOfAccounts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : !hasClinics ? (
              getReasonMessage('no_clinics_assigned', 'tipos de gastos')
            ) : expenseTypesResponse ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <Alert className="flex-1 mr-4">
                    <Info className="w-4 h-4" />
                    <AlertDescription>
                      Configure las cuentas contables para los diferentes tipos de gastos de la clínica.
                    </AlertDescription>
                  </Alert>
                </div>

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

          {/* Pestaña de Cajas */}
          <TabsContent value="cash-sessions" className="mt-4 space-y-4">
            {checkingClinics || loadingCashSessions || loadingChartOfAccounts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : !hasClinics ? (
              getReasonMessage('no_clinics_assigned', 'cajas')
            ) : cashSessionsResponse ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <Alert className="flex-1 mr-4">
                    <Info className="w-4 h-4" />
                    <AlertDescription>
                      Configure las cuentas de tesorería para cada caja o terminal POS.
                    </AlertDescription>
                  </Alert>
                </div>

                <div className="space-y-3">
                  {unmappedCashEntities.map((item: any) => (
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
            {checkingClinics || loadingDiscounts || loadingChartOfAccounts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : !hasClinics ? (
              getReasonMessage('no_clinics_assigned', 'descuentos')
            ) : discountTypesResponse ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <Alert className="flex-1 mr-4">
                    <Info className="w-4 h-4" />
                    <AlertDescription>
                      Configure las cuentas para registrar los diferentes tipos de descuentos aplicados.
                    </AlertDescription>
                  </Alert>
                </div>

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