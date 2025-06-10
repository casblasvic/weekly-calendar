'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { 
  Package, 
  FileText, 
  CreditCard, 
  Percent, 
  Receipt, 
  Banknote,
  Sparkles,
  Check,
  X,
  AlertCircle,
  Info,
  Tag,
  ChevronRight,
  Building,
  Wand2,
  Loader2,
  Save,
  Briefcase,
  Calculator,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Settings,
  Settings2,
  Globe,
  Trash2
} from 'lucide-react';
import AutoMappingsViewer from './AutoMappingsViewer';

/**
 * Configurador de Mapeos Contables
 * 
 * Permite configurar manualmente las relaciones entre:
 * - Servicios → Cuentas contables
 * - Métodos de pago → Cuentas contables  
 * - Tipos de IVA → Cuentas contables
 * - Reglas automáticas de mapeo
 */

import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { api } from "@/utils/api-client";

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
  currentAccountCode?: string;
  currentAccountName?: string;
  suggestedAccountId?: string;
  hasChildren: boolean;
  level?: number;
  path?: string;
  clinicName?: string;
  clinicId?: string;
  mappingClinicId?: string;
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
  currentAccountCode?: string;
  currentAccountName?: string;
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
  salesAccountId?: string;
  salesAccountCode?: string;
  salesAccountName?: string;
  purchaseAccountId?: string;
  purchaseAccountCode?: string;
  purchaseAccountName?: string;
  settings?: {
    isForSale: boolean;
    isInternalUse: boolean;
  };
  mappingClinicId?: string;
}

interface PaymentMethodMapping {
  id: string;
  name: string;
  code: string;
  type: string;
  isGlobal: boolean;
  isMapped: boolean;
  currentAccountId?: string | null;
  currentAccountCode?: string | null;
  currentAccountName?: string | null;
  mappingClinicId?: string | null;
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
  parentAccountId?: string | null;
}

interface PromotionMapping {
  discountTypeCode: string;
  discountTypeName: string;
  promotionId?: string;
  isFixed: boolean;
  isGlobal: boolean;
  isInheritedFromGlobal: boolean;
  isMapped: boolean;
  currentAccountId?: string | null;
  currentAccountNumber?: string | null;
  currentAccountName?: string | null;
  mappingClinicId?: string | null;
  clinicName?: string;
  clinicId?: string;
}

// Traducciones en español
const translations = {
  title: 'Configuración de Mapeos Contables',
  description: 'Configure las cuentas contables para cada elemento del centro de negocio',
  tabs: {
    mappings: 'Mapeos',
    services: 'Servicios',
    products: 'Productos',
    payments: 'Métodos de Pago',
    vat: 'Tipos de IVA',
    expenses: 'Gastos',
    cash: 'Cajas',
    discounts: 'Promociones',
    rules: 'Reglas Automáticas',
    categories: 'Categorías',
    banks: 'Bancos'
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
  expenses: {
    info: 'Configure las cuentas contables para los diferentes tipos de gastos de la clínica.',
    noMappings: 'Todos los tipos de gastos están correctamente mapeados'
  },
  cash: {
    info: 'Configure las cuentas de tesorería para cada caja o terminal POS.',
    noMappings: 'Todas las cajas están correctamente mapeadas'
  },
  discounts: {
    info: 'Configure las cuentas para registrar los diferentes tipos de descuentos y promociones aplicados.',
    noMappings: 'Todos los tipos de descuentos y promociones están correctamente mapeados'
  },
  banks: {
    info: 'Configure las cuentas contables para bancos y sus cuentas bancarias. Las cuentas bancarias y tarjetas se mapearán como subcuentas del banco correspondiente.',
    noMappings: 'Todos los bancos están correctamente mapeados',
    bankAccounts: 'Cuentas Bancarias',
    noBankAccounts: 'Este banco no tiene cuentas bancarias asociadas'
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
    mappingDeleted: 'Mapeo eliminado correctamente',
    noChanges: 'No hay cambios para guardar'
  }
};

export default function AccountingMappingConfigurator({
  systemId,
  legalEntityId,
  currentLanguage = 'es',
  onComplete
}: AccountingMappingConfiguratorProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('mappings');
  const [hasChanges, setHasChanges] = useState(false);
  const [applyToSubcategories, setApplyToSubcategories] = useState(true);
  const [selectedClinicFilter, setSelectedClinicFilter] = useState<string>('all');

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

  // Query para obtener los mapeos automáticos
  const { data: autoMappingsData } = useQuery({
    queryKey: ['accounting-auto-mappings', legalEntityId, systemId],
    queryFn: async () => {
      const params = new URLSearchParams({
        legalEntityId,
        ...(systemId && { systemId })
      });
      
      const response = await fetch(`/api/accounting/auto-mappings?${params}`);
      if (!response.ok) {
        throw new Error('Error al obtener mapeos automáticos');
      }
      return response.json();
    },
    enabled: !!legalEntityId && !!systemId
  });

  // Mapeos locales
  const [serviceMappings, setServiceMappings] = useState<Record<string, string>>({});
  const [productMappings, setProductMappings] = useState<Record<string, { accountId: string; clinicId?: string }>>({});
  const [paymentMappings, setPaymentMappings] = useState<Record<string, { accountId: string; clinicId?: string }>>({});
  const [vatMappings, setVatMappings] = useState<Record<string, { 
    input?: string; 
    output?: string;
    vatTypeId?: string;
    clinicId?: string | null;
  }>>({});
  const [expenseMappings, setExpenseMappings] = useState<Record<string, string>>({});
  const [cashSessionMappings, setCashSessionMappings] = useState<Record<string, string>>({});
  const [discountMappings, setDiscountMappings] = useState<Record<string, string>>({});
  const [promotionMappings, setPromotionMappings] = useState<Record<string, { accountId: string; clinicId?: string }>>({});
  const [categoryMappings, setCategoryMappings] = useState<Record<string, string>>({});
  const [bankMappings, setBankMappings] = useState<Record<string, string>>({});
  const [bankAccountMappings, setBankAccountMappings] = useState<Record<string, string>>({});
  const [expandedBanks, setExpandedBanks] = useState<Set<string>>(new Set());
  const [expandedPaymentClinics, setExpandedPaymentClinics] = useState<Set<string>>(new Set());
  const [expandedVatClinics, setExpandedVatClinics] = useState<Set<string>>(new Set());

  // Query para obtener las clínicas asociadas a la sociedad fiscal
  const { data: clinicsData } = useQuery({
    queryKey: ['legal-entity-clinics', legalEntityId],
    queryFn: async () => {
      const response = await fetch(`/api/clinics?legalEntityId=${legalEntityId}`);
      if (!response.ok) throw new Error('Error fetching clinics');
      const data = await response.json();
      return data || [];
    },
    enabled: !!legalEntityId && hasClinics
  });

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
        // Para forceRemap, solo incluir los tipos específicos solicitados
        if (types?.includes('all') || !types) {
          // Si es 'all' o no hay tipos específicos, incluir todo
          if (allServices.length > 0) availableTypes.push('services');
          if (allProducts.length > 0) availableTypes.push('products');
          if (allPaymentMethods.length > 0) availableTypes.push('paymentMethods');
          if (allVatTypes && allVatTypes.length > 0) availableTypes.push('vat');
          if (allExpenseTypesResponse?.hasData && allExpenseTypesResponse.items.length > 0) availableTypes.push('expenseTypes');
          if (allCashEntitiesResponse?.hasData && allCashEntitiesResponse.items.length > 0) availableTypes.push('cash-session');
          if (allDiscountTypesResponse?.hasData && allDiscountTypesResponse.items.length > 0) availableTypes.push('discountTypes');
          if (allBanks.length > 0) availableTypes.push('banks');
        } else {
          // Si hay tipos específicos, solo incluir esos
          types.forEach(type => {
            if (type === 'services' && allServices.length > 0) availableTypes.push('services');
            if (type === 'products' && allProducts.length > 0) availableTypes.push('products');
            if (type === 'paymentMethods' && allPaymentMethods.length > 0) availableTypes.push('paymentMethods');
            if (type === 'vat' && allVatTypes && allVatTypes.length > 0) availableTypes.push('vat');
            if (type === 'expenseTypes' && allExpenseTypesResponse?.hasData && allExpenseTypesResponse.items.length > 0) availableTypes.push('expenseTypes');
            if (type === 'cash-session' && allCashEntitiesResponse?.hasData && allCashEntitiesResponse.items.length > 0) availableTypes.push('cash-session');
            if (type === 'discountTypes' && allDiscountTypesResponse?.hasData && allDiscountTypesResponse.items.length > 0) availableTypes.push('discountTypes');
            if (type === 'banks' && allBanks.length > 0) availableTypes.push('banks');
          });
        }
      } else {
        // Filtrar solo los items no mapeados
        const unmappedServicesFiltered = allServices.filter(s => !s.currentAccountId);
        const unmappedProductsFiltered = allProducts.filter(p => !p.currentAccountId);
        const unmappedPaymentMethodsFiltered = allPaymentMethods.filter(p => !p.currentAccountId);
        const unmappedExpenseTypesFiltered = allExpenseTypes.filter(e => !e.currentAccountId);
        const unmappedCashEntitiesFiltered = allCashEntities.filter(e => !e.currentAccountId);
        const unmappedDiscountTypesFiltered = allDiscountTypes.filter(d => !d.currentAccountId);
        const unmappedBanksFiltered = allBanks.filter(b => !b.accountId);
        
        if (types?.includes('all') || !types) {
          // Si es 'all', verificar qué elementos existen sin mapear
          if (unmappedServicesFiltered.length > 0) availableTypes.push('services');
          if (unmappedProductsFiltered.length > 0) availableTypes.push('products');
          if (unmappedPaymentMethodsFiltered.length > 0) availableTypes.push('paymentMethods');
          if (unmappedVatTypes.length > 0) availableTypes.push('vat');
          if (unmappedExpenseTypesFiltered.length > 0) availableTypes.push('expenseTypes');
          if (unmappedCashEntitiesFiltered.length > 0) availableTypes.push('cash-session');
          if (unmappedDiscountTypesFiltered.length > 0) availableTypes.push('discountTypes');
          if (unmappedBanksFiltered.length > 0) availableTypes.push('banks');
        } else {
          // Si hay tipos específicos, verificar cada uno
          types.forEach(type => {
            if (type === 'services' && unmappedServicesFiltered.length > 0) availableTypes.push('services');
            if (type === 'products' && unmappedProductsFiltered.length > 0) availableTypes.push('products');
            if (type === 'paymentMethods' && unmappedPaymentMethodsFiltered.length > 0) availableTypes.push('paymentMethods');
            if (type === 'vat' && unmappedVatTypes.length > 0) availableTypes.push('vat');
            if (type === 'expenseTypes' && unmappedExpenseTypesFiltered.length > 0) availableTypes.push('expenseTypes');
            if (type === 'cash-session' && unmappedCashEntitiesFiltered.length > 0) availableTypes.push('cash-session');
            if (type === 'discountTypes' && unmappedDiscountTypesFiltered.length > 0) availableTypes.push('discountTypes');
            if (type === 'banks' && unmappedBanksFiltered.length > 0) availableTypes.push('banks');
          });
        }
      }
      
      // Si no hay elementos disponibles para mapear, no hacer la llamada
      if (availableTypes.length === 0) {
        toast.warning('No hay elementos disponibles para mapear');
        return { categories: { mapped: 0, errors: 0 }, products: { mapped: 0, errors: 0 }, 
                services: { mapped: 0, errors: 0 }, paymentMethods: { mapped: 0, errors: 0 } };
      }
      
      console.log('[AutoMapping] Iniciando mapeo con:', {
        legalEntityId,
        systemId,
        types: availableTypes,
        forceRemap
      });
      
      const response = await fetch('/api/accounting/auto-map-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          legalEntityId,
          systemId,
          types: availableTypes.length > 0 ? availableTypes : ['all'],
          forceRemap, // Pasar el parámetro al backend
          clinicId: selectedClinicFilter !== 'all' ? selectedClinicFilter : undefined // Añadir clinicId solo si hay una clínica específica seleccionada
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('[AutoMapping] Error:', response.status, errorData);
        throw new Error(errorData?.error || 'Error al ejecutar mapeo automático');
      }
      
      return response.json();
    },
    onSuccess: async (data) => {
      // La respuesta tiene la estructura: { success, message, results: { categories: { mapped, errors }, ... } }
      let successful = 0;
      
      if (data.results) {
        successful = (data.results.categories?.mapped || 0) +
                    (data.results.products?.mapped || 0) +
                    (data.results.services?.mapped || 0) +
                    (data.results.paymentMethods?.mapped || 0) +
                    (data.results.banks?.mapped || 0) +
                    (data.results.discounts?.mapped || 0);
      }
      
      if (successful > 0) {
        toast.success(`Se mapearon ${successful} elementos automáticamente`);
        
        // Refrescar todos los datos después del mapeo exitoso
        await Promise.all([
          refetchAllCategories(),
          refetchServices(),
          refetchProducts(),
          refetchPaymentMethods(),
          refetchUnmappedVat(),
          refetchAllExpenses(),
          refetchAllDiscounts(),
          refetchUnmappedCashSessions(),
          refetchBanks(),
          refetchChartOfAccounts(),
          queryClient.invalidateQueries({ queryKey: ['all-services-with-mappings'] }),
          queryClient.invalidateQueries({ queryKey: ['all-products-with-mappings'] }),
          queryClient.invalidateQueries({ queryKey: ['all-payment-methods-with-mappings'] }),
          queryClient.invalidateQueries({ queryKey: ['all-categories-with-mappings'] }),
          queryClient.invalidateQueries({ queryKey: ['all-banks-with-mappings'] }),
          queryClient.invalidateQueries({ queryKey: ['accounting-auto-mappings'] }),
          queryClient.invalidateQueries({ queryKey: ['unmapped-items'] })
        ]);
      } else {
        toast.info('No se encontraron elementos para mapear');
      }
      
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
          isGlobal: false,
          currentAccountId: service.accountId,
          currentAccountCode: service.accountCode,
          currentAccountName: service.accountName
        });
      });
    });
    
    // Servicios globales
    servicesResponse.globalServices?.forEach((service: any) => {
      services.push({
        ...service,
        clinicName: 'Global',
        isGlobal: true,
        currentAccountId: service.accountId,
        currentAccountCode: service.accountCode,
        currentAccountName: service.accountName
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
          isGlobal: false,
          currentAccountId: product.accountId,
          currentAccountCode: product.accountCode,
          currentAccountName: product.accountName,
          mappingClinicId: product.mappingClinicId
        });
      });
    });
    
    // Productos globales
    productsResponse.globalProducts?.forEach((product: any) => {
      products.push({
        ...product,
        clinicName: 'Global',
        isGlobal: true,
        currentAccountId: product.accountId,
        currentAccountCode: product.accountCode,
        currentAccountName: product.accountName,
        mappingClinicId: product.mappingClinicId
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
    
    // Métodos por clínica
    paymentMethodsResponse.clinics?.forEach((clinic: any) => {
      clinic.methods?.forEach((method: any) => {
        methods.push({
          ...method,
          clinicName: clinic.clinicName,
          clinicId: clinic.clinicId,
          mappingClinicId: method.clinicId
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

  // Cargar TODOS los tipos de IVA con mapeos (globales y por clínica)
  const { data: vatTypesWithMappingsResponse, isLoading: loadingAllVatTypes, refetch: refetchAllVat } = useQuery({
    queryKey: ['all-vat-types-with-mappings', legalEntityId],
    queryFn: async () => {
      const response = await fetch(
        `/api/accounting/all-vat-types-with-mappings?legalEntityId=${legalEntityId}`
      );
      if (!response.ok) throw new Error('Error loading all VAT types');
      return response.json();
    },
    enabled: !!legalEntityId && !!systemId && hasClinics
  });

  // Procesar tipos de IVA con mapeos
  const allVatTypes = useMemo(() => {
    if (!vatTypesWithMappingsResponse) return [];
    
    const vatTypes: any[] = [];
    
    // Solo tipos de IVA de clínicas
    vatTypesWithMappingsResponse.clinics?.forEach((clinic: any) => {
      clinic.vatTypes?.forEach((vatType: any) => {
        vatTypes.push({
          ...vatType,
          clinicName: clinic.clinic.name,
          clinicId: clinic.clinic.id,
          isGlobal: false,
          isClinicSpecific: vatType.isClinicSpecific
        });
      });
    });
    
    return vatTypes;
  }, [vatTypesWithMappingsResponse]);

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
    enabled: !!legalEntityId && !!systemId
  });

  const unmappedExpenseTypes = expenseTypesResponse?.hasData ? expenseTypesResponse.items : [];

  // Cargar TODOS los tipos de gastos (mapeados y no mapeados)
  const { data: allExpenseTypesResponse, isLoading: loadingAllExpenses, refetch: refetchAllExpenses } = useQuery({
    queryKey: ['all-expense-types-with-mappings', legalEntityId],
    queryFn: async () => {
      const response = await fetch(
        `/api/accounting/all-expense-types-with-mappings?legalEntityId=${legalEntityId}`
      );
      if (!response.ok) throw new Error('Error loading all expense types');
      return response.json();
    },
    enabled: !!legalEntityId && !!systemId
  });

  const allExpenseTypes = allExpenseTypesResponse?.items || [];

  // Cargar cajas sin mapear
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

  // Cargar TODAS las entidades de caja con sus mapeos actuales
  const { data: allCashEntitiesResponse, isLoading: loadingAllCashEntities, refetch: refetchAllCashEntities } = useQuery({
    queryKey: ['all-cash-entities-with-mappings', legalEntityId],
    queryFn: async () => {
      const response = await fetch(
        `/api/accounting/all-cash-entities-with-mappings?legalEntityId=${legalEntityId}`
      );
      if (!response.ok) throw new Error('Error loading all cash entities');
      return response.json() as Promise<{
        hasData: boolean;
        reason?: string;
        items: any[];
        mappedCount: number;
        totalCount: number;
      }>;
    },
    enabled: !!legalEntityId && !!systemId && hasClinics
  });

  const allCashEntities = allCashEntitiesResponse?.items || [];

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

  // Cargar TODOS los tipos de descuento (mapeados y no mapeados)
  const { data: allDiscountTypesResponse, isLoading: loadingAllDiscounts, refetch: refetchAllDiscounts } = useQuery({
    queryKey: ['all-discount-types-with-mappings', legalEntityId],
    queryFn: async () => {
      const response = await fetch(
        `/api/accounting/all-discount-types-with-mappings?legalEntityId=${legalEntityId}`
      );
      if (!response.ok) throw new Error('Error loading all discount types');
      return response.json();
    },
    enabled: !!legalEntityId && !!systemId && hasClinics
  });

  const allDiscountTypes = allDiscountTypesResponse?.items || [];

  // Cargar promociones y descuentos agrupados por clínica
  const {
    data: allPromotionsResponse,
    isLoading: loadingAllPromotions,
    refetch: refetchAllPromotions
  } = useQuery({
    queryKey: ['all-promotions-with-mappings', legalEntityId],
    queryFn: async () => {
      const response = await fetch(
        `/api/accounting/all-promotions-with-mappings?legalEntityId=${legalEntityId}`
      );
      if (!response.ok) throw new Error('Error loading all promotions');
      return response.json();
    },
    enabled: !!legalEntityId && hasClinics
  });

  // Cargar bancos con sus mapeos
  const { data: banksResponse, isLoading: loadingBanks, refetch: refetchBanks } = useQuery({
    queryKey: ['all-banks-with-mappings', legalEntityId],
    queryFn: async () => {
      const response = await fetch(
        `/api/accounting/all-banks?legalEntityId=${legalEntityId}`
      );
      if (!response.ok) throw new Error('Error loading banks');
      return response.json();
    },
    enabled: !!legalEntityId && !!systemId && hasClinics
  });

  const allBanks = banksResponse?.banks || [];

  // Cargar plan de cuentas
  const { data: chartOfAccounts, isLoading: loadingChartOfAccounts, refetch: refetchChartOfAccounts } = useQuery({
    queryKey: ['chart-of-accounts', legalEntityId],
    queryFn: async () => {
      const response = await fetch(
        `/api/chart-of-accounts?legalEntityId=${legalEntityId}`,
        {
          headers: {
            'x-from-mapping': 'true' // Indicar que viene del configurador de mapeos
          }
        }
      );
      if (!response.ok) throw new Error('Error loading chart of accounts');
      const data = await response.json();
      // Si el endpoint devuelve estructura con flat y hierarchical, usar flat
      const accounts = data.flat || data;
      console.log('[ChartOfAccounts] Total accounts:', accounts.length);
      console.log('[ChartOfAccounts] Sample accounts:', accounts.slice(0, 5).map(a => ({
        number: a.accountNumber,
        name: a.name,
        isSubAccount: a.isSubAccount,
        parentId: a.parentAccountId
      })));
      console.log('[ChartOfAccounts] Subaccounts found:', accounts.filter(a => a.isSubAccount || a.accountNumber.includes('.')).length);
      return accounts;
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
      refetchServices();
      refetchChartOfAccounts();
      setServiceMappings({});
    },
    onError: () => {
      toast.error(translations.common.mappingError);
    }
  });

  // Mutación para guardar mapeos de productos
  const saveProductMappings = useMutation({
    mutationFn: async (mappings: Record<string, { accountId: string; clinicId?: string }>) => {
      // Convertir el objeto de mapeos a array para la API
      const mappingsArray = Object.entries(mappings)
        .filter(([_, mapping]) => mapping.accountId)
        .map(([productId, mapping]) => ({
          productId,
          accountId: mapping.accountId,
          clinicId: mapping.clinicId
        }));

      const response = await fetch('/api/accounting/save-product-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legalEntityId,
          systemId,
          mappings: mappingsArray
        })
      });
      if (!response.ok) throw new Error('Error saving mappings');
      return response.json();
    },
    onSuccess: () => {
      toast.success(translations.common.mappingSaved);
      refetchProducts();
      refetchChartOfAccounts();
      setProductMappings({});
    },
    onError: () => {
      toast.error(translations.common.mappingError);
    }
  });

  // Mutación para guardar mapeos de métodos de pago
  const savePaymentMappings = useMutation({
    mutationFn: async (mappings: Record<string, { accountId: string; clinicId?: string }>) => {
      // Convertir el objeto de mapeos a array para la API
      const mappingsArray = Object.entries(mappings)
        .filter(([_, mapping]) => mapping.accountId)
        .map(([paymentMethodId, mapping]) => ({
          paymentMethodId,
          accountId: mapping.accountId,
          clinicId: mapping.clinicId
        }));

      const response = await fetch('/api/accounting/payment-method-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legalEntityId,
          systemId,
          mappings: mappingsArray
        })
      });
      if (!response.ok) throw new Error('Error saving mappings');
      return response.json();
    },
    onSuccess: () => {
      toast.success(translations.common.mappingSaved);
      refetchPaymentMethods();
      refetchChartOfAccounts();
      setPaymentMappings({});
    },
    onError: () => {
      toast.error(translations.common.mappingError);
    }
  });

  // Mutación para guardar mapeos de IVA
  const saveVatMappings = useMutation({
    mutationFn: async (mappings: any[]) => {
      // Guardar cada mapeo individualmente
      const promises = mappings.map(mapping => 
        fetch('/api/accounting/save-vat-mapping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...mapping,
            legalEntityId,
            systemId
          })
        }).then(res => {
          if (!res.ok) throw new Error('Error al guardar mapeo de IVA');
          return res.json();
        })
      );
      
      return Promise.all(promises);
    },
    onSuccess: () => {
      toast.success(translations.common.mappingSaved);
      setVatMappings({});
      refetchAllVat();
      refetchUnmappedVat();
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
      refetchUnmappedExpenses();
      refetchAllExpenses();
      refetchChartOfAccounts();
      setExpenseMappings({});
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
            const item = allCashEntities?.find((cs: any) => (cs.clinicId === id || cs.posTerminalId === id));
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
      refetchUnmappedCashSessions();
      refetchAllCashEntities();
      refetchChartOfAccounts();
      setCashSessionMappings({});
    },
    onError: () => {
      toast.error(translations.common.mappingError);
    }
  });

  // Mutación para guardar mapeos de descuentos
  const saveDiscountMappings = useMutation({
    mutationFn: async (mappings: Array<{ discountTypeCode: string; accountId: string; clinicId: string | null }>) => {
      const response = await fetch('/api/accounting/discount-mappings', {
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
      refetchUnmappedDiscounts();
      refetchAllDiscounts();
      refetchAllPromotions();
      refetchChartOfAccounts();
      setDiscountMappings({});
    },
    onError: () => {
      toast.error(translations.common.mappingError);
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
          mappings: Object.entries(mappings).map(([categoryId, accountId]) => ({
            categoryId,
            accountId
          }))
        })
      });
      if (!response.ok) throw new Error('Error saving mappings');
      return response.json();
    },
    onSuccess: () => {
      toast.success(translations.common.mappingSaved);
      refetchAllCategories();
      refetchChartOfAccounts();
      setCategoryMappings({});
    },
    onError: () => {
      toast.error(translations.common.mappingError);
    }
  });

  // Mutación para guardar mapeos de bancos
  const saveBankMappings = useMutation({
    mutationFn: async (params: { bankMappings: Record<string, string>, bankAccountMappings: Record<string, string> }) => {
      const response = await fetch('/api/accounting/bank-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legalEntityId,
          systemId,
          ...params
        })
      });
      if (!response.ok) throw new Error('Error saving bank mappings');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Mapeos de bancos guardados correctamente');
      refetchBanks();
      refetchChartOfAccounts();
      setBankMappings({});
      setBankAccountMappings({});
    },
    onError: () => {
      toast.error('Error al guardar mapeos de bancos');
    }
  });

  const unmappedServicesCount = allServices.filter(service => !service.currentAccountId).length;
  const unmappedProductsCount = allProducts.filter(product => !product.currentAccountId).length;
  const unmappedPaymentsCount = allPaymentMethods.filter(payment => !payment.isMapped).length;
  const unmappedVatCount = allVatTypes.filter(vat => 
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
    vatTypesWithMappingsResponse?.reason,
    expenseTypesResponse?.reason,
    cashSessionsResponse?.reason,
    discountTypesResponse?.reason
  ].some(reason => reason === 'no_clinics_assigned' || reason === 'legal_entity_not_found');

  const hasNoClinicsAssigned = !hasClinics;

  // Función para renderizar servicios con jerarquía
  const renderServiceItem = (service: ServiceMapping) => {
    const indentLevel = service.level || 0;
    const hasMapping = serviceMappings[service.id] || service.currentAccountId;
    const isClinicSpecific = service.mappingClinicId && service.mappingClinicId === service.clinicId;
    
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
          {service.hasMapping && service.currentAccountId && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Mapeado a:</span>
              <Badge variant="outline" className="font-mono">
                {service.currentAccountCode}
              </Badge>
              <span>{service.currentAccountName}</span>
              {isClinicSpecific && (
                <Badge variant="secondary" className="text-xs">
                  Específico de clínica
                </Badge>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
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
              {chartOfAccounts && (() => {
                // Eliminar duplicados usando Map con accountNumber como clave
                const uniqueAccounts = Array.from(
                  new Map(chartOfAccounts.map((acc: ChartAccount) => [acc.id, acc])).values()
                ) as ChartAccount[];
                return uniqueAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">
                        {account.accountNumber}
                      </span>
                      <span className="text-sm">{account.name}</span>
                    </div>
                  </SelectItem>
                ));
              })()}
            </SelectContent>
          </Select>
          {isClinicSpecific && service.currentAccountId && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteMapping.mutate({ 
                type: 'service', 
                id: service.id, 
                clinicId: service.clinicId || undefined 
              })}
              disabled={deleteMapping.isPending}
              title="Eliminar mapeo específico de clínica"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderProductItem = (product: ProductMapping) => {
    const indentLevel = product.level || 0;
    const hasMapping = productMappings[product.id]?.accountId || product.currentAccountId;
    const isClinicSpecific = product.mappingClinicId && product.mappingClinicId === product.clinicId;
    
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
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {product.categoryName && <span>{product.categoryName}</span>}
            {product.categoryName && product.price !== undefined && <span>•</span>}
            {product.price !== undefined && (
              <span>
                {new Intl.NumberFormat(currentLanguage === 'es' ? 'es-ES' : 'fr-FR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                }).format(product.price)}
              </span>
            )}
          </div>
          {product.hasChildren && (
            <div className="text-sm text-muted-foreground">
              {translations.products.hasSubcategories}
            </div>
          )}
          {product.hasMapping && product.currentAccountId && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Mapeado a:</span>
              <Badge variant="outline" className="font-mono">
                {product.currentAccountCode}
              </Badge>
              <span>{product.currentAccountName}</span>
              {isClinicSpecific && (
                <Badge variant="secondary" className="text-xs">
                  Específico de clínica
                </Badge>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Select
              value={productMappings[product.id]?.accountId || product.currentAccountId || ''}
              onValueChange={(value) => 
                setProductMappings(prev => ({
                  ...prev,
                  [product.id]: { accountId: value, clinicId: product.clinicId }
                }))
              }
            >
              <SelectTrigger className="w-[350px]">
                <SelectValue placeholder={translations.common.selectAccount} />
              </SelectTrigger>
              <SelectContent>
                {chartOfAccounts && (() => {
                  // Eliminar duplicados usando Map con accountNumber como clave
                  const uniqueAccounts = Array.from(
                    new Map(chartOfAccounts.map((acc: ChartAccount) => [acc.id, acc])).values()
                  ) as ChartAccount[];
                  return uniqueAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">
                          {account.accountNumber}
                        </span>
                        <span className="text-sm">{account.name}</span>
                      </div>
                    </SelectItem>
                  ));
                })()}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            {product.suggestedAccountId && !productMappings[product.id] && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => 
                  setProductMappings(prev => ({
                    ...prev,
                    [product.id]: { accountId: product.suggestedAccountId!, clinicId: product.clinicId }
                  }))
                }
              >
                <Sparkles className="w-4 h-4 mr-1" />
                {translations.common.useSuggestion}
              </Button>
            )}
            {isClinicSpecific && product.currentAccountId && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteMapping.mutate({ 
                  type: 'product', 
                  id: product.id, 
                  clinicId: product.clinicId || undefined 
                })}
                disabled={deleteMapping.isPending}
                title="Eliminar mapeo específico de clínica"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
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
      .filter(([_, mapping]) => mapping.accountId)
      .reduce((acc, [id, mapping]) => ({
        ...acc,
        [id]: mapping.accountId
      }), {});

    if (Object.keys(validMappings).length === 0) {
      toast.warning(translations.common.noChanges);
      return;
    }

    saveProductMappings.mutate(productMappings);
  };

  const handleSavePayments = () => {
    // Detectar cambios: comparar los valores actuales con los nuevos
    const changedMappings: Record<string, { accountId: string; clinicId?: string }> = {};
    
    allPaymentMethods.forEach(payment => {
      const newMapping = paymentMappings[payment.id];
      const currentValue = payment.currentAccountId || '';
      
      // Tratar "none" como vacío
      const normalizedNewValue = newMapping?.accountId === 'none' ? '' : (newMapping?.accountId || '');
      const normalizedCurrentValue = currentValue === 'none' ? '' : currentValue;
      
      if (normalizedNewValue !== normalizedCurrentValue) {
        changedMappings[payment.id] = {
          accountId: normalizedNewValue,
          clinicId: payment.mappingClinicId
        };
      }
    });

    if (Object.keys(changedMappings).length === 0) {
      toast.warning(translations.common.noChanges);
      return;
    }

    savePaymentMappings.mutate(changedMappings);
  };

  const handleSaveVat = () => {
    const mappingsToSave: any[] = [];
    
    Object.entries(vatMappings).forEach(([key, mapping]) => {
      if (!mapping.input && !mapping.output) return;
      
      mappingsToSave.push({
        vatTypeId: mapping.vatTypeId,
        clinicId: mapping.clinicId || null,
        inputAccountId: mapping.input || null,
        outputAccountId: mapping.output || null
      });
    });

    if (mappingsToSave.length === 0) {
      toast.warning(translations.common.noChanges);
      return;
    }

    saveVatMappings.mutate(mappingsToSave);
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
    // Preparar mapeos para enviar al backend
    const mappingsToSave: any[] = [];
    
    Object.entries(discountMappings).forEach(([key, accountId]) => {
      if (!accountId || accountId === '' || accountId === 'none') return;
      
      // El key tiene formato "clinicId:discountTypeCode"
      const [clinicId, discountTypeCode] = key.split(':');
      
      mappingsToSave.push({
        discountTypeCode,
        accountId,
        clinicId: clinicId || null
      });
    });

    if (mappingsToSave.length === 0) {
      toast.warning(translations.common.noChanges);
      return;
    }

    saveDiscountMappings.mutate(mappingsToSave);
  };

  const handleSaveCategoryMappings = () => {
    if (Object.keys(categoryMappings).length === 0) return;
    
    // Filtrar solo los mapeos que han cambiado
    const changedMappings = Object.entries(categoryMappings).reduce((acc, [categoryId, accountId]) => {
      const category = allCategories?.find((c: any) => c.categoryId === categoryId);
      if (category && category.currentAccountId !== accountId) {
        acc[categoryId] = accountId;
      }
      return acc;
    }, {} as Record<string, string>);

    if (Object.keys(changedMappings).length > 0) {
      saveCategoryMappings.mutate(changedMappings);
    }
  };

  const handleSaveBankMappings = () => {
    console.log('[Banks] Guardando mapeos de bancos:', bankMappings);
    console.log('[Banks] Guardando mapeos de cuentas bancarias:', bankAccountMappings);
    
    const validMappings = Object.entries(bankMappings)
      .filter(([_, accountId]) => accountId && accountId !== 'none')
      .reduce((acc, [bankId, accountId]) => ({
        ...acc,
        [bankId]: accountId
      }), {});
    
    const validAccountMappings = Object.entries(bankAccountMappings)
      .filter(([_, accountId]) => accountId && accountId !== 'none')
      .reduce((acc, [accountId, mappedAccountId]) => ({
        ...acc,
        [accountId]: mappedAccountId
      }), {});
    
    saveBankMappings.mutate({ 
      bankMappings: validMappings, 
      bankAccountMappings: validAccountMappings 
    });
  };

  // Función helper para obtener la información de la cuenta
  const getAccountInfo = (accountId: string | null | undefined): string => {
    if (!accountId || accountId === 'none') return 'Sin asignar';
    const account = chartOfAccounts?.find(acc => acc.id === accountId);
    return account ? `${account.accountNumber} - ${account.name}` : accountId;
  };

  // Función helper para obtener el nivel de indentación de una cuenta
  const getAccountLevel = (account: ChartAccount): number => {
    // Si la cuenta tiene parentAccountId, calcular su nivel basado en el número de cuenta
    if (account.parentAccountId || account.level) {
      return account.level || 1;
    }
    // Las cuentas raíz (primer dígito) tienen nivel 0
    const firstDotIndex = account.accountNumber.indexOf('.');
    return firstDotIndex === -1 ? 0 : account.accountNumber.split('.').length - 1;
  };

  // Función helper para renderizar una opción de cuenta con indentación
  const renderAccountOption = (account: ChartAccount) => {
    const level = getAccountLevel(account);
    const isSubaccount = level > 0;
    
    return (
      <div 
        className="flex items-center gap-2"
        style={{ paddingLeft: `${level * 1.5}rem` }}
      >
        {isSubaccount && (
          <span className="text-gray-400">↳</span>
        )}
        <span className={cn(
          "font-mono text-sm",
          isSubaccount && "text-gray-600"
        )}>
          {account.accountNumber}
        </span>
        <span className={cn(
          "text-sm",
          isSubaccount && "text-gray-600"
        )}>
          {account.name}
        </span>
        {account.parentAccountId && (
          <Badge variant="outline" className="text-xs ml-2">
            Subcuenta
          </Badge>
        )}
      </div>
    );
  };

  // Query para obtener todas las categorías con sus mapeos
  const { data: allCategories, refetch: refetchAllCategories, isLoading: loadingAllCategories } = useQuery({
    queryKey: ['all-categories-with-mappings', legalEntityId],
    queryFn: async () => {
      const response = await fetch(`/api/accounting/all-categories-with-mappings?legalEntityId=${legalEntityId}`);
      if (!response.ok) throw new Error('Error fetching all categories with mappings');
      const data = await response.json();
      return data?.items || [];
    },
    enabled: !!legalEntityId && activeTab === 'categories'
  });

  useEffect(() => {
    if (allBanks && allBanks.length > 0) {
      const initialMappings: Record<string, string> = {};
      const initialAccountMappings: Record<string, string> = {};
      
      allBanks.forEach((bank: any) => {
        if (bank.accountId) {
          initialMappings[bank.id] = bank.accountId;
        }
        
        // Inicializar mapeos de cuentas bancarias
        if (bank.bankAccounts) {
          bank.bankAccounts.forEach((account: any) => {
            if (account.accountId) {
              initialAccountMappings[account.id] = account.accountId;
            }
          });
        }
      });
      
      setBankMappings(initialMappings);
      setBankAccountMappings(initialAccountMappings);
    }
  }, [allBanks]);

  // Función de filtrado por clínica
  const filterByClinic = <T extends { clinicId?: string | null }>(items: T[]): T[] => {
    if (selectedClinicFilter === 'all') return items;
    if (selectedClinicFilter === 'global') {
      return items.filter(item => !item.clinicId);
    }
    return items.filter(item => item.clinicId === selectedClinicFilter);
  };

  // Aplicar filtros a los datos
  const filteredServices = filterByClinic(allServices || []);
  const filteredProducts = filterByClinic(allProducts || []);
  const filteredPaymentMethods = filterByClinic(allPaymentMethods || []);
  const filteredExpenseTypes = filterByClinic(allExpenseTypesResponse?.items || []);
  const filteredCashEntities = filterByClinic(allCashEntitiesResponse?.items || []);
  const filteredBanks = filterByClinic(allBanks || []);

  // Mutation para eliminar mapeos
  const deleteMapping = useMutation({
    mutationFn: async (params: { 
      type: 'service' | 'product' | 'paymentMethod' | 'vat' | 'expense' | 'bank', 
      id: string, 
      clinicId?: string 
    }) => {
      const response = await fetch('/api/accounting/delete-mapping', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          legalEntityId
        })
      });
      if (!response.ok) throw new Error('Error deleting mapping');
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast.success(data.message || 'Mapeo eliminado correctamente');
      
      // Refrescar los datos según el tipo
      switch (variables.type) {
        case 'service':
          refetchServices();
          break;
        case 'product':
          refetchProducts();
          break;
        case 'paymentMethod':
          refetchPaymentMethods();
          break;
        case 'vat':
          refetchAllVat();
          break;
        case 'expense':
          refetchAllExpenses();
          break;
        case 'bank':
          refetchBanks();
          break;
      }
    },
    onError: () => {
      toast.error('Error al eliminar el mapeo');
    }
  });

  // Mutación para guardar mapeos de promociones
  const savePromotionMappings = useMutation({
    mutationFn: async (mappings: Record<string, { accountId: string; clinicId?: string }>) => {
      const response = await fetch('/api/accounting/promotion-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legalEntityId,
          systemId,
          mappings: Object.entries(mappings).map(([promotionKey, mapping]) => {
            const [discountTypeCode, clinicId] = promotionKey.split('|');
            const promotion = allPromotions.find(p => 
              p.discountTypeCode === discountTypeCode && 
              (p.clinicId === clinicId || (!p.clinicId && !clinicId))
            );
            return {
              discountTypeCode,
              discountTypeName: promotion?.discountTypeName || promotion?.discountTypeName || discountTypeCode,
              accountId: mapping.accountId,
              clinicId: mapping.clinicId || null
            };
          })
        })
      });
      if (!response.ok) throw new Error('Error saving promotion mappings');
      return response.json();
    },
    onSuccess: () => {
      toast.success(translations.common.mappingSaved);
      refetchAllPromotions();
      refetchChartOfAccounts();
      setPromotionMappings({});
    },
    onError: () => {
      toast.error(translations.common.mappingError);
    }
  });

  // Mutación para eliminar mapeos de promociones
  const deletePromotionMapping = useMutation({
    mutationFn: async ({ discountTypeCode, clinicId }: { discountTypeCode: string; clinicId?: string }) => {
      const response = await fetch('/api/accounting/promotion-mappings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legalEntityId,
          discountTypeCode,
          clinicId: clinicId || null
        })
      });
      if (!response.ok) throw new Error('Error deleting promotion mapping');
      return response.json();
    },
    onSuccess: () => {
      toast.success(translations.common.mappingDeleted);
      refetchAllPromotions();
      refetchChartOfAccounts();
    },
    onError: () => {
      toast.error(translations.common.mappingError);
    }
  });

  // Estructurar promociones similar a métodos de pago
  const allPromotions: PromotionMapping[] = [];
  
  if (allPromotionsResponse?.hasData) {
    allPromotionsResponse.clinics?.forEach((clinic: any) => {
      clinic.promotions?.forEach((promotion: any) => {
        allPromotions.push({
          ...promotion,
          clinicName: clinic.clinicName,
          clinicId: clinic.clinicId
        });
      });
    });
  }

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
              {clinicsData && clinicsData.length > 0 && (
                <Select value={selectedClinicFilter} onValueChange={setSelectedClinicFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filtrar por clínica" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Todas las clínicas
                      </div>
                    </SelectItem>
                    <SelectItem value="global">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Solo mapeos globales
                      </div>
                    </SelectItem>
                    <SelectSeparator />
                    {clinicsData.map((clinic: any) => (
                      <SelectItem key={clinic.id} value={clinic.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          {clinic.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
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
                    onClick={() => executeAutoMapping.mutate({ types: ['products'], forceRemap: true })}
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
                    onClick={() => executeAutoMapping.mutate({ types: ['cash-session'] })}
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
                    onClick={() => executeAutoMapping.mutate({ types: ['discountTypes'] })}
                    disabled={unmappedDiscountsCount === 0}
                  >
                    <Tag className="mr-2 h-4 w-4" />
                    <div>
                      <div className="font-medium">Solo promociones</div>
                      <div className="text-xs text-muted-foreground">
                        {unmappedDiscountsCount} sin mapear
                      </div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => executeAutoMapping.mutate({ types: ['banks'] })}
                    disabled={allBanks.filter(b => !b.accountId).length === 0}
                  >
                    <Banknote className="mr-2 h-4 w-4" />
                    <div>
                      <div className="font-medium">Solo bancos</div>
                      <div className="text-xs text-muted-foreground">
                        {allBanks.filter(b => !b.accountId).length} sin mapear
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-9">
            <TabsTrigger value="mappings">
              {translations.tabs.mappings}
            </TabsTrigger>
            <TabsTrigger value="services">
              {translations.tabs.services}
              {unmappedServicesCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {unmappedServicesCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="products">
              {translations.tabs.products}
              {unmappedProductsCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {unmappedProductsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="payments">
              {translations.tabs.payments}
              {unmappedPaymentsCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {unmappedPaymentsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="vat">
              {translations.tabs.vat}
              {unmappedVatCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {unmappedVatCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="expenses">
              {translations.tabs.expenses}
              {unmappedExpensesCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {unmappedExpensesCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="cash-sessions">
              {translations.tabs.cash}
              {unmappedCashEntitiesCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {unmappedCashEntitiesCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="discounts">
              {translations.tabs.discounts}
              {unmappedDiscountsCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {unmappedDiscountsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="banks">
              Bancos
            </TabsTrigger>
          </TabsList>

          {/* Nueva pestaña de mapeos que contiene sub-pestañas */}
          <TabsContent value="mappings" className="mt-4 space-y-4">
            <Tabs defaultValue="auto-mappings" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="auto-mappings">Mapeos Automáticos</TabsTrigger>
                <TabsTrigger value="rules">Reglas Automáticas</TabsTrigger>
              </TabsList>
              
              <TabsContent value="auto-mappings" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Mapeos Automáticos</CardTitle>
                    <CardDescription>
                      Vista de todos los mapeos generados automáticamente
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AutoMappingsViewer 
                      systemId={systemId}
                      legalEntityId={legalEntityId}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="rules" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Configuración de Reglas Automáticas</CardTitle>
                    <CardDescription>
                      Define las reglas para la generación automática de mapeos
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Aquí iría el componente de configuración de reglas */}
                    <p className="text-muted-foreground">Configuración de reglas en desarrollo...</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Pestaña de Servicios */}
          <TabsContent value="services" className="mt-4 space-y-4">
            {checkingClinics || loadingServices || loadingChartOfAccounts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : !hasClinics ? (
              getReasonMessage('no_clinics_assigned', 'servicios')
            ) : filteredServices && filteredServices.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <Alert className="flex-1 mr-4">
                    <Info className="w-4 h-4" />
                    <AlertDescription>
                      {translations.services.info}
                    </AlertDescription>
                  </Alert>
                  <Button 
                    className="ml-auto"
                    variant={autoMappingsData?.directMappings?.services?.length > 0 ? "destructive" : "default"}
                    size="sm"
                    onClick={() => {
                      console.log('[Services] Iniciando mapeo de servicios...');
                      if (autoMappingsData?.directMappings?.services?.length > 0) {
                        if (confirm('¿Estás seguro de que deseas remapear? Esto sobrescribirá los mapeos existentes de servicios.')) {
                          console.log('[Services] Ejecutando remapeo forzado...');
                          executeAutoMapping.mutate({ types: ['services'], forceRemap: true });
                        }
                      } else {
                        console.log('[Services] Ejecutando mapeo inicial...');
                        executeAutoMapping.mutate({ types: ['services'], forceRemap: false });
                      }
                    }}
                    disabled={executeAutoMapping.isPending}
                  >
                    {executeAutoMapping.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Mapeando...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        {autoMappingsData?.directMappings?.services?.length > 0 ? 'Remapear Servicios' : 'Mapear Servicios'}
                      </>
                    )}
                  </Button>
                </div>

                <Accordion type="multiple" className="w-full">
                  {(() => {
                    // Agrupar servicios por clínica
                    const servicesByClinic = filteredServices.reduce((acc, service) => {
                      const key = service.clinicName || 'Sin Centro de Negocio';
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(service);
                      return acc;
                    }, {} as Record<string, ServiceMapping[]>);

                    return Object.entries(servicesByClinic).map(([clinicName, clinicServices]) => {
                      // Agrupar los servicios de esta clínica por categoría
                      const servicesByCategory = clinicServices.reduce((acc, service) => {
                        const categoryKey = service.categoryName || 'Sin Categoría';
                        if (!acc[categoryKey]) acc[categoryKey] = [];
                        acc[categoryKey].push(service);
                        return acc;
                      }, {} as Record<string, ServiceMapping[]>);

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
                            <div className="pt-4 space-y-4">
                              {/* Renderizar servicios agrupados por categoría */}
                              {Object.entries(servicesByCategory).map(([categoryName, categoryServices]) => {
                                const categoryUnmapped = categoryServices.filter(s => !s.currentAccountId).length;
                                const categoryMapped = categoryServices.filter(s => s.currentAccountId).length;
                                
                                // Obtener la cuenta de la categoría si existe
                                const categoryAccount = categoryServices[0]?.categoryId && 
                                  autoMappingsData?.directMappings?.categories?.find(
                                    (cat: any) => cat.id === categoryServices[0].categoryId
                                  )?.accountCode;

                                return (
                                  <div key={`${clinicName}-${categoryName}`} className="border rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-2">
                                        <Tag className="w-4 h-4 text-muted-foreground" />
                                        <span className="font-medium">{categoryName}</span>
                                        {categoryAccount && (
                                          <Badge variant="outline" className="ml-2 font-mono text-xs">
                                            {categoryAccount}
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 text-sm">
                                        {categoryUnmapped > 0 && (
                                          <Badge variant="destructive" className="h-5 text-xs">
                                            {categoryUnmapped} sin mapear
                                          </Badge>
                                        )}
                                        {categoryMapped > 0 && (
                                          <Badge variant="default" className="h-5 bg-green-500 text-white hover:bg-green-600 text-xs">
                                            {categoryMapped} mapeados
                                          </Badge>
                                        )}
                                      </div>
                                    </div>

                                    {/* Servicios no mapeados de esta categoría */}
                                    {categoryUnmapped > 0 && (
                                      <div className="mb-3">
                                        <h5 className="text-xs font-medium mb-2 text-red-600">
                                          Sin mapear ({categoryUnmapped})
                                        </h5>
                                        <div className="space-y-2">
                                          {categoryServices
                                            .filter((service: ServiceMapping) => !service.currentAccountId)
                                            .map((service) => (
                                              <div key={`${clinicName}-${categoryName}-${service.id}`}>
                                                {renderServiceItem(service)}
                                              </div>
                                            ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Servicios mapeados de esta categoría */}
                                    {categoryMapped > 0 && (
                                      <div>
                                        <h5 className="text-xs font-medium mb-2 text-green-600">
                                          Mapeados ({categoryMapped})
                                        </h5>
                                        <div className="space-y-2">
                                          {categoryServices
                                            .filter((service: ServiceMapping) => service.currentAccountId)
                                            .map((service) => (
                                              <div key={`${clinicName}-${categoryName}-${service.id}`}>
                                                {renderServiceItem(service)}
                                              </div>
                                            ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
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
                <AlertTitle>Centros sin Tarifa Asignada</AlertTitle>
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
            ) : filteredProducts && filteredProducts.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <Alert className="flex-1 mr-4">
                    <Info className="w-4 h-4" />
                    <AlertDescription>
                      {translations.products.info}
                    </AlertDescription>
                  </Alert>
                  <Button 
                    className="ml-auto"
                    variant={autoMappingsData?.directMappings?.products?.length > 0 ? "destructive" : "default"}
                    size="sm"
                    onClick={() => {
                      console.log('[Products] Iniciando mapeo de productos...');
                      if (autoMappingsData?.directMappings?.products?.length > 0) {
                        if (confirm('¿Estás seguro de que deseas remapear? Esto sobrescribirá los mapeos existentes de productos.')) {
                          console.log('[Products] Ejecutando remapeo forzado...');
                          executeAutoMapping.mutate({ types: ['products'], forceRemap: true });
                        }
                      } else {
                        console.log('[Products] Ejecutando mapeo inicial...');
                        executeAutoMapping.mutate({ types: ['products'], forceRemap: false });
                      }
                    }}
                    disabled={executeAutoMapping.isPending}
                  >
                    {executeAutoMapping.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Mapeando...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        {autoMappingsData?.directMappings?.products?.length > 0 ? 'Remapear Productos' : 'Mapear Productos'}
                      </>
                    )}
                  </Button>
                </div>

                <Accordion type="multiple" className="w-full">
                  {(() => {
                    // Agrupar productos por clínica
                    const productsByClinic = filteredProducts.reduce((acc, product) => {
                      const key = product.clinicName || 'Sin Centro de Negocio';
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(product);
                      return acc;
                    }, {} as Record<string, ProductMapping[]>);

                    return Object.entries(productsByClinic).map(([clinicName, clinicProducts]) => {
                      // Agrupar los productos de esta clínica por categoría
                      const productsByCategory = clinicProducts.reduce((acc, product) => {
                        const categoryKey = product.categoryName || 'Sin Categoría';
                        if (!acc[categoryKey]) acc[categoryKey] = [];
                        acc[categoryKey].push(product);
                        return acc;
                      }, {} as Record<string, ProductMapping[]>);

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
                            <div className="pt-4 space-y-4">
                              {/* Renderizar productos agrupados por categoría */}
                              {Object.entries(productsByCategory).map(([categoryName, categoryProducts]) => {
                                // Primero separar por estado de mapeo
                                const mappedProducts = categoryProducts.filter(p => p.currentAccountId);
                                const unmappedProducts = categoryProducts.filter(p => !p.currentAccountId);
                                
                                // Luego, separar los productos MAPEADOS por tipo basándose en los campos isForSale e isInternalUse
                                const productsForSale = mappedProducts.filter(p => {
                                  // Si tiene el campo settings, usarlo; si no, inferir del número de cuenta
                                  if (p.settings) {
                                    return p.settings.isForSale;
                                  }
                                  // Fallback: inferir del número de cuenta
                                  const accountNumber = p.currentAccountCode || '';
                                  return accountNumber.startsWith('7');
                                });
                                const productsForConsumption = mappedProducts.filter(p => {
                                  // Si tiene el campo settings, usarlo; si no, inferir del número de cuenta
                                  if (p.settings) {
                                    return p.settings.isInternalUse;
                                  }
                                  // Fallback: inferir del número de cuenta
                                  const accountNumber = p.currentAccountCode || '';
                                  return accountNumber.startsWith('6');
                                });
                                
                                const categoryUnmapped = unmappedProducts.length;
                                const categoryMapped = mappedProducts.length;
                                
                                // Obtener la cuenta de la categoría si existe
                                const categoryAccount = categoryProducts[0]?.categoryId && 
                                  autoMappingsData?.directMappings?.categories?.find(
                                    (cat: any) => cat.id === categoryProducts[0].categoryId
                                  )?.accountCode;

                                return (
                                  <div key={`${clinicName}-${categoryName}`} className="border rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-2">
                                        <Tag className="w-4 h-4 text-muted-foreground" />
                                        <span className="font-medium">{categoryName}</span>
                                        {categoryAccount && (
                                          <Badge variant="outline" className="ml-2 font-mono text-xs">
                                            {categoryAccount}
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 text-sm">
                                        {categoryUnmapped > 0 && (
                                          <Badge variant="destructive" className="h-5 text-xs">
                                            {categoryUnmapped} sin mapear
                                          </Badge>
                                        )}
                                        {categoryMapped > 0 && (
                                          <Badge variant="default" className="h-5 bg-green-500 text-white hover:bg-green-600 text-xs">
                                            {categoryMapped} mapeados
                                          </Badge>
                                        )}
                                      </div>
                                    </div>

                                    {/* Productos sin mapear */}
                                    {unmappedProducts.length > 0 && (
                                      <div className="mb-4">
                                        <h5 className="text-sm font-medium mb-3 text-destructive">
                                          Sin Mapear ({unmappedProducts.length})
                                        </h5>
                                        <div className="space-y-2 ml-6">
                                          {unmappedProducts
                                            .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                                            .map((product) => (
                                              <div key={`${clinicName}-${categoryName}-unmapped-${product.id}`}>
                                                {renderProductItem(product)}
                                              </div>
                                            ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Productos para venta (cuentas 7xx) */}
                                    {productsForSale.length > 0 && (
                                      <div className="mb-4">
                                        <h5 className="text-sm font-medium mb-3 text-blue-600">
                                          Productos para Venta ({productsForSale.length})
                                        </h5>
                                        <div className="space-y-2 ml-6">
                                          {productsForSale
                                            .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                                            .map((product) => (
                                              <div key={`${clinicName}-${categoryName}-sale-${product.id}`}>
                                                {renderProductItem(product)}
                                              </div>
                                            ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Productos de consumo interno (cuentas 6xx) */}
                                    {productsForConsumption.length > 0 && (
                                      <div className="mb-4">
                                        <h5 className="text-sm font-medium mb-3 text-orange-600">
                                          Productos de Consumo Interno ({productsForConsumption.length})
                                        </h5>
                                        <div className="space-y-2 ml-6">
                                          {productsForConsumption
                                            .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                                            .map((product) => (
                                              <div key={`${clinicName}-${categoryName}-consumption-${product.id}`}>
                                                {renderProductItem(product)}
                                              </div>
                                            ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Si no hay productos en ninguna categoría */}
                                    {categoryProducts.length === 0 && (
                                      <div className="text-sm text-muted-foreground text-center py-2">
                                        No hay productos en esta categoría
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
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
            ) : filteredPaymentMethods && filteredPaymentMethods.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <Alert className="flex-1 mr-4">
                    <Info className="w-4 h-4" />
                    <AlertDescription>
                      {translations.payments.info}
                    </AlertDescription>
                  </Alert>
                  <Button 
                    className="ml-auto"
                    variant={autoMappingsData?.directMappings?.paymentMethods?.length > 0 ? "destructive" : "default"}
                    size="sm"
                    onClick={() => {
                      console.log('[Payments] Iniciando mapeo de métodos de pago...');
                      if (autoMappingsData?.directMappings?.paymentMethods?.length > 0) {
                        if (confirm('¿Estás seguro de que deseas remapear? Esto sobrescribirá los mapeos existentes de métodos de pago.')) {
                          console.log('[Payments] Ejecutando remapeo forzado...');
                          executeAutoMapping.mutate({ types: ['paymentMethods'] });
                        }
                      } else {
                        console.log('[Payments] Ejecutando mapeo inicial...');
                        executeAutoMapping.mutate({ types: ['paymentMethods'] });
                      }
                    }}
                    disabled={executeAutoMapping.isPending}
                  >
                    {executeAutoMapping.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Mapeando...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        {autoMappingsData?.directMappings?.paymentMethods?.length > 0 ? 'Remapear Métodos de Pago' : 'Mapear Métodos de Pago'}
                      </>
                    )}
                  </Button>
                </div>

                {/* Agrupación de métodos de pago por clínica */}
                {(() => {
                  // Agrupar métodos de pago por clínica
                  const paymentsByClinic = new Map<string, any[]>();
                  
                  filteredPaymentMethods.forEach(payment => {
                    const clinicKey = payment.clinicId || 'ALL_CLINICS';
                    if (!paymentsByClinic.has(clinicKey)) {
                      paymentsByClinic.set(clinicKey, []);
                    }
                    paymentsByClinic.get(clinicKey)!.push(payment);
                  });

                  return Array.from(paymentsByClinic.entries()).map(([clinicKey, payments]) => {
                    const isGlobal = clinicKey === 'ALL_CLINICS';
                    const clinic = isGlobal ? null : clinicsData?.find(c => c.id === clinicKey);
                    const clinicName = isGlobal ? 'Métodos Globales' : clinic?.name || 'Clínica Desconocida';
                    const clinicPrefix = isGlobal ? 'GLOBAL' : clinic?.prefix || 'UNK';
                    
                    const unmappedCount = payments.filter(p => !p.isMapped).length;
                    const mappedCount = payments.filter(p => p.isMapped).length;

                    return (
                      <Card key={clinicKey} className="mb-4">
                        <CardHeader 
                          className="cursor-pointer"
                          onClick={() => {
                            const newExpanded = new Set(expandedPaymentClinics);
                            if (newExpanded.has(clinicKey)) {
                              newExpanded.delete(clinicKey);
                            } else {
                              newExpanded.add(clinicKey);
                            }
                            setExpandedPaymentClinics(newExpanded);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <ChevronRight 
                                  className={cn(
                                    "w-4 h-4 text-muted-foreground transition-transform",
                                    expandedPaymentClinics.has(clinicKey) && "rotate-90"
                                  )}
                                />
                                <div>
                                  <CardTitle className="text-base font-medium">{clinicName}</CardTitle>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs">
                                      {clinicPrefix}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">
                                      {payments.length} método{payments.length !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {mappedCount > 0 && (
                                <Badge variant="default" className="bg-green-100 text-green-700">
                                  {mappedCount} mapeado{mappedCount !== 1 ? 's' : ''}
                                </Badge>
                              )}
                              {unmappedCount > 0 && (
                                <Badge variant="destructive">
                                  {unmappedCount} sin mapear
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        
                        {expandedPaymentClinics.has(clinicKey) && (
                          <CardContent className="pt-0">
                            {/* Métodos de pago sin mapear */}
                            {payments.filter(payment => !payment.isMapped).length > 0 && (
                              <div className="mb-6">
                                <h5 className="text-sm font-medium mb-3 text-orange-700">
                                  Pendientes ({payments.filter(payment => !payment.isMapped).length})
                                </h5>
                                <div className="space-y-3">
                                  {payments.filter(payment => !payment.isMapped).map((payment) => (
                                    <div
                                      key={`${payment.id}-${payment.clinicId || 'global'}`}
                                      className="flex items-center gap-3 p-3 border rounded-lg"
                                    >
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 font-medium">
                                          <span className="text-gray-900 dark:text-gray-100">{payment.name}</span>
                                          {payment.mappingClinicId && payment.mappingClinicId === payment.clinicId && (
                                            <Badge variant="secondary" className="text-xs">
                                              Específico de clínica
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                          Código: {payment.code}
                                        </div>
                                      </div>
                                      <Select
                                        value={paymentMappings[payment.id]?.accountId || payment.currentAccountId || 'none'}
                                        onValueChange={(value) => 
                                          setPaymentMappings(prev => ({
                                            ...prev,
                                            [payment.id]: { accountId: value, clinicId: payment.mappingClinicId }
                                          }))
                                        }
                                      >
                                        <SelectTrigger className="w-[350px]">
                                          <SelectValue placeholder={translations.common.selectAccount}>
                                            {getAccountInfo(payment.currentAccountId)}
                                          </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none">
                                            <span className="text-muted-foreground">Sin asignar</span>
                                          </SelectItem>
                                          {chartOfAccounts && (() => {
                                            const uniqueAccounts = Array.from(
                                              new Map(chartOfAccounts.map((acc: ChartAccount) => [acc.id, acc])).values()
                                            ) as ChartAccount[];
                                            return uniqueAccounts.map((account) => (
                                              <SelectItem key={account.id} value={account.id}>
                                                {renderAccountOption(account)}
                                              </SelectItem>
                                            ));
                                          })()}
                                        </SelectContent>
                                      </Select>
                                      {payment.mappingClinicId && payment.mappingClinicId === payment.clinicId && payment.currentAccountId && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => deleteMapping.mutate({ 
                                            type: 'paymentMethod', 
                                            id: payment.id, 
                                            clinicId: payment.clinicId || undefined 
                                          })}
                                          disabled={deleteMapping.isPending}
                                          title="Eliminar mapeo específico de clínica"
                                        >
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Métodos de pago mapeados */}
                            {payments.filter(payment => payment.isMapped).length > 0 && (
                              <div className="mb-6">
                                <h5 className="text-sm font-medium mb-3 text-green-700">
                                  Mapeados ({payments.filter(payment => payment.isMapped).length})
                                </h5>
                                <div className="space-y-3">
                                  {payments.filter(payment => payment.isMapped).map((payment) => (
                                    <div
                                      key={`${payment.id}-${payment.clinicId || 'global'}`}
                                      className="flex items-center gap-3 p-3 border rounded-lg bg-muted/20"
                                    >
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 font-medium">
                                          <span className="text-gray-900 dark:text-gray-100">{payment.name}</span>
                                          {payment.mappingClinicId && payment.mappingClinicId === payment.clinicId && (
                                            <Badge variant="secondary" className="text-xs">
                                              Específico de clínica
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                          Código: {payment.code} | 
                                          Cuenta actual: {getAccountInfo(payment.currentAccountId)}
                                        </div>
                                      </div>
                                      <Select
                                        value={paymentMappings[payment.id]?.accountId || payment.currentAccountId || 'none'}
                                        onValueChange={(value) => 
                                          setPaymentMappings(prev => ({
                                            ...prev,
                                            [payment.id]: { accountId: value, clinicId: payment.mappingClinicId }
                                          }))
                                        }
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none">
                                            <span className="text-muted-foreground">Sin asignar</span>
                                          </SelectItem>
                                          {chartOfAccounts && (() => {
                                            const uniqueAccounts = Array.from(
                                              new Map(chartOfAccounts.map((acc: ChartAccount) => [acc.id, acc])).values()
                                            ) as ChartAccount[];
                                            return uniqueAccounts.map((account) => (
                                              <SelectItem key={account.id} value={account.id}>
                                                {renderAccountOption(account)}
                                              </SelectItem>
                                            ));
                                          })()}
                                        </SelectContent>
                                      </Select>
                                      {payment.mappingClinicId && payment.mappingClinicId === payment.clinicId && payment.currentAccountId && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => deleteMapping.mutate({ 
                                            type: 'paymentMethod', 
                                            id: payment.id, 
                                            clinicId: payment.clinicId || undefined 
                                          })}
                                          disabled={deleteMapping.isPending}
                                          title="Eliminar mapeo específico de clínica"
                                        >
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        )}
                      </Card>
                    );
                  });
                })()}

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setActiveTab('products')}>
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
              <NoDataMessage reason="no_payment_methods_available" type="métodos de pago" />
            )}
          </TabsContent>

          {/* Pestaña de IVA */}
          <TabsContent value="vat" className="mt-4 space-y-4">
            {loadingAllVatTypes || loadingChartOfAccounts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : vatTypesWithMappingsResponse ? (
              <>
                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertDescription>
                    Los tipos de IVA pueden configurarse de forma global o específica por clínica. Configure las cuentas de IVA soportado (compras) y repercutido (ventas).
                  </AlertDescription>
                </Alert>

                {/* Tipos de IVA por Clínica */}
                {vatTypesWithMappingsResponse.clinics && vatTypesWithMappingsResponse.clinics.length > 0 && (
                  <Accordion type="single" collapsible>
                    {vatTypesWithMappingsResponse.clinics.map((clinicData: any) => {
                      const mappedCount = clinicData.vatTypes.filter((vat: any) => 
                        vat.inputAccountId && vat.outputAccountId
                      ).length;
                      
                      return (
                        <AccordionItem key={clinicData.clinic.id} value={clinicData.clinic.id}>
                          <AccordionTrigger>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{clinicData.clinic.name}</span>
                              <Badge variant={mappedCount === clinicData.vatTypes.length ? "default" : "secondary"}>
                                {mappedCount} / {clinicData.vatTypes.length} mapeados
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4 pt-4">
                              {clinicData.vatTypes.map((vat: any) => (
                                <Card key={`${clinicData.clinic.id}-${vat.id}`} className="p-4">
                                  <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <div className="font-medium">{vat.name}</div>
                                        <div className="text-sm text-muted-foreground">
                                          Tasa: {vat.rate}% • Código: {vat.code}
                                          {vat.isClinicSpecific && (
                                            <Badge variant="outline" className="ml-2">
                                              Específico de clínica
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <Badge variant={vat.inputAccountId && vat.outputAccountId ? "default" : "secondary"}>
                                          {vat.inputAccountId && vat.outputAccountId ? "Completo" : "Pendiente"}
                                        </Badge>
                                      </div>
                                    </div>
                                    
                                    <Separator />
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                      {/* IVA Soportado (Compras) */}
                                      <div className="space-y-2">
                                        <Label>IVA Soportado (Compras)</Label>
                                        <Select
                                          value={vatMappings[`${clinicData.clinic.id}-${vat.id}`]?.input || vat.inputAccountId || 'none'}
                                          onValueChange={(value) => 
                                            setVatMappings(prev => ({
                                              ...prev,
                                              [`${clinicData.clinic.id}-${vat.id}`]: {
                                                ...prev[`${clinicData.clinic.id}-${vat.id}`],
                                                input: value === 'none' ? null : value,
                                                vatTypeId: vat.id,
                                                clinicId: clinicData.clinic.id
                                              }
                                            }))
                                          }
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar cuenta IVA soportado">
                                              {getAccountInfo(vatMappings[`${clinicData.clinic.id}-${vat.id}`]?.input || vat.inputAccountId)}
                                            </SelectValue>
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="none">
                                              <span className="text-muted-foreground">Sin asignar</span>
                                            </SelectItem>
                                            {chartOfAccounts
                                              ?.filter((account: ChartAccount) => 
                                                account.accountNumber.startsWith('472') || 
                                                account.accountNumber.startsWith('3455')
                                              )
                                              .map((account: ChartAccount) => (
                                                <SelectItem key={account.id} value={account.id}>
                                                  {renderAccountOption(account)}
                                                </SelectItem>
                                              ))}
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      {/* IVA Repercutido (Ventas) */}
                                      <div className="space-y-2">
                                        <Label>IVA Repercutido (Ventas)</Label>
                                        <Select
                                          value={vatMappings[`${clinicData.clinic.id}-${vat.id}`]?.output || vat.outputAccountId || 'none'}
                                          onValueChange={(value) => 
                                            setVatMappings(prev => ({
                                              ...prev,
                                              [`${clinicData.clinic.id}-${vat.id}`]: {
                                                ...prev[`${clinicData.clinic.id}-${vat.id}`],
                                                output: value === 'none' ? null : value,
                                                vatTypeId: vat.id,
                                                clinicId: clinicData.clinic.id
                                              }
                                            }))
                                          }
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar cuenta IVA repercutido">
                                              {getAccountInfo(vatMappings[`${clinicData.clinic.id}-${vat.id}`]?.output || vat.outputAccountId)}
                                            </SelectValue>
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="none">
                                              <span className="text-muted-foreground">Sin asignar</span>
                                            </SelectItem>
                                            {chartOfAccounts
                                              ?.filter((account: ChartAccount) => 
                                                account.accountNumber.startsWith('477') || 
                                                account.accountNumber.startsWith('4455')
                                              )
                                              .map((account: ChartAccount) => (
                                                <SelectItem key={account.id} value={account.id}>
                                                  {renderAccountOption(account)}
                                                </SelectItem>
                                              ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                )}

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
                        Guardando...
                      </>
                    ) : (
                      'Guardar Mapeos de IVA'
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <Alert>
                <AlertCircle className="w-4 w-4" />
                <AlertDescription>
                  No se encontraron tipos de IVA. Asegúrese de haber configurado los tipos de IVA en el sistema.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Pestaña de Gastos */}
          <TabsContent value="expenses" className="mt-4 space-y-4">
            {loadingAllExpenses || loadingChartOfAccounts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : allExpenseTypes.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <Alert className="flex-1 mr-4">
                    <Info className="w-4 w-4" />
                    <AlertDescription>
                      Configure las cuentas contables para los diferentes tipos de gastos de la clínica.
                    </AlertDescription>
                  </Alert>
                  <Button 
                    className="ml-auto"
                    variant={allExpenseTypes.some(e => e.currentAccountId) ? "destructive" : "default"}
                    size="sm"
                    onClick={() => {
                      console.log('[Expenses] Iniciando mapeo de gastos...');
                      if (allExpenseTypes.some(e => e.currentAccountId)) {
                        if (confirm('¿Estás seguro de que deseas remapear? Esto sobrescribirá los mapeos existentes de gastos.')) {
                          console.log('[Expenses] Ejecutando remapeo forzado...');
                          executeAutoMapping.mutate({ types: ['expenseTypes'] });
                        }
                      } else {
                        console.log('[Expenses] Ejecutando mapeo inicial...');
                        executeAutoMapping.mutate({ types: ['expenseTypes'] });
                      }
                    }}
                    disabled={executeAutoMapping.isPending}
                  >
                    {executeAutoMapping.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Mapeando...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        {allExpenseTypes.some(e => e.currentAccountId) ? 'Remapear Gastos' : 'Mapear Gastos'}
                      </>
                    )}
                  </Button>
                </div>

                {/* Tabla de todos los tipos de gastos */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Tipos de Gasto del Sistema</CardTitle>
                    <CardDescription>
                      {allExpenseTypes.filter(e => e.currentAccountId).length} de {allExpenseTypes.length} tipos de gasto mapeados
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {allExpenseTypes.map((expense: any) => (
                        <div
                          key={expense.expenseTypeId}
                          className="flex items-center gap-3 p-3 border rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-900 dark:text-gray-100">{expense.expenseTypeName}</span>
                              {expense.mappingClinicId && expense.mappingClinicId === expense.clinicId && (
                                <Badge variant="secondary" className="text-xs">
                                  Específico de clínica
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Código: {expense.expenseTypeCode}
                            </div>
                          </div>
                          <Select
                            value={expenseMappings[expense.expenseTypeId] || expense.currentAccountId || 'none'}
                            onValueChange={(value) => 
                              setExpenseMappings(prev => ({
                                ...prev,
                                [expense.expenseTypeId]: value
                              }))
                            }
                          >
                            <SelectTrigger className="w-[350px]">
                              <SelectValue placeholder={translations.common.selectAccount}>
                                {getAccountInfo(expense.currentAccountId)}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                <span className="text-muted-foreground">Sin asignar</span>
                              </SelectItem>
                              {chartOfAccounts
                                ?.filter((account: ChartAccount) => 
                                  account.accountNumber.startsWith('472') || 
                                  account.accountNumber.startsWith('3455')
                                )
                                .map((account: ChartAccount) => (
                                  <SelectItem key={account.id} value={account.id}>
                                    {renderAccountOption(account)}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Botón guardar siempre visible */}
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
              <NoDataMessage reason="no_expense_types_available" type="tipos de gasto" />
            )}
          </TabsContent>

          {/* Pestaña de Cajas */}
          <TabsContent value="cash-sessions" className="mt-4 space-y-4">
            {checkingClinics || loadingAllCashEntities || loadingChartOfAccounts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : !hasClinics ? (
              getReasonMessage('no_clinics_assigned', 'cajas')
            ) : allCashEntities.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <Alert className="flex-1 mr-4">
                    <Info className="w-4 w-4" />
                    <AlertDescription>
                      Configure las cuentas de tesorería para cada caja o terminal POS.
                    </AlertDescription>
                  </Alert>
                  <Button 
                    className="ml-auto"
                    variant={allCashEntities.some(e => e.currentAccountId) ? "destructive" : "default"}
                    size="sm"
                    onClick={() => {
                      console.log('[CashSessions] Iniciando mapeo de cajas...');
                      if (allCashEntities.some(e => e.currentAccountId)) {
                        if (confirm('¿Estás seguro de que deseas remapear? Esto sobrescribirá los mapeos existentes de cajas.')) {
                          console.log('[CashSessions] Ejecutando remapeo forzado...');
                          executeAutoMapping.mutate({ types: ['cash-session'] });
                        }
                      } else {
                        console.log('[CashSessions] Ejecutando mapeo inicial...');
                        executeAutoMapping.mutate({ types: ['cash-session'] });
                      }
                    }}
                    disabled={executeAutoMapping.isPending}
                  >
                    {executeAutoMapping.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Mapeando...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        {allCashEntities.some(e => e.currentAccountId) ? 'Remapear Cajas' : 'Mapear Cajas'}
                      </>
                    )}
                  </Button>
                </div>

                {/* Tabla de todas las entidades de caja */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Cajas y Terminales POS</CardTitle>
                    <CardDescription>
                      {allCashEntities.filter(e => e.currentAccountId).length} de {allCashEntities.length} entidades mapeadas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {allCashEntities.map((entity: any) => (
                        <div
                          key={entity.clinicId || entity.posTerminalId}
                          className="flex items-center gap-3 p-3 border rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {entity.type === 'clinic' ? (
                                <Building2 className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <CreditCard className="w-4 h-4 text-muted-foreground" />
                              )}
                              <span className="text-gray-900 dark:text-gray-100">{entity.name}</span>
                              {entity.mappingClinicId && entity.mappingClinicId === entity.clinicId && (
                                <Badge variant="secondary" className="text-xs">
                                  Específico de clínica
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {entity.type === 'clinic' ? 'Caja de Clínica' : 'Terminal POS'}
                            </div>
                          </div>
                          <Select
                            value={cashSessionMappings[entity.clinicId || entity.posTerminalId] || entity.currentAccountId || 'none'}
                            onValueChange={(value) => 
                              setCashSessionMappings(prev => ({
                                ...prev,
                                [entity.clinicId || entity.posTerminalId]: value
                              }))
                            }
                          >
                            <SelectTrigger className="w-[350px]">
                              <SelectValue placeholder={translations.common.selectAccount}>
                                {getAccountInfo(entity.currentAccountId)}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                <span className="text-muted-foreground">Sin asignar</span>
                              </SelectItem>
                              {chartOfAccounts
                                ?.filter((account: ChartAccount) => 
                                  account.accountNumber.startsWith('570') || 
                                  account.accountNumber.startsWith('571') ||
                                  account.accountNumber.startsWith('516') ||
                                  account.accountNumber.startsWith('514')
                                )
                                .map((account: ChartAccount) => (
                                  <SelectItem key={account.id} value={account.id}>
                                    {renderAccountOption(account)}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Botón guardar siempre visible */}
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
              <NoDataMessage reason="no_cash_entities_available" type="cajas" />
            )}
          </TabsContent>

          {/* Pestaña de Promociones */}
          <TabsContent value="discounts" className="mt-4 space-y-4">
            {checkingClinics || loadingAllPromotions || loadingChartOfAccounts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : !hasClinics ? (
              getReasonMessage('no_clinics_assigned', 'promociones')
            ) : allPromotionsResponse?.hasData ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <Alert className="flex-1 mr-4">
                    <Info className="w-4 h-4" />
                    <AlertDescription>
                      Configure las cuentas para registrar los diferentes tipos de descuentos y promociones aplicados.
                    </AlertDescription>
                  </Alert>
                  <Button 
                    className="ml-auto"
                    variant={allPromotionsResponse?.totalMapped > 0 ? "destructive" : "default"}
                    size="sm"
                    onClick={() => {
                      console.log('[Promociones] Iniciando mapeo de promociones...');
                      if (allPromotionsResponse?.totalMapped > 0) {
                        if (confirm('¿Estás seguro de que deseas remapear? Esto sobrescribirá los mapeos existentes de promociones.')) {
                          console.log('[Promociones] Ejecutando remapeo forzado...');
                          executeAutoMapping.mutate({ types: ['discountTypes'], forceRemap: true });
                        }
                      } else {
                        console.log('[Promociones] Ejecutando mapeo inicial...');
                        executeAutoMapping.mutate({ types: ['discountTypes'], forceRemap: false });
                      }
                    }}
                    disabled={executeAutoMapping.isPending}
                  >
                    {executeAutoMapping.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Mapeando...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        {allPromotionsResponse?.totalMapped > 0 ? 'Remapear Promociones' : 'Mapear Promociones'}
                      </>
                    )}
                  </Button>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Tipos de Promociones del Sistema</CardTitle>
                    <CardDescription>
                      {allPromotionsResponse.totalMapped} de {allPromotionsResponse.totalItems} tipos mapeados
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="multiple" className="w-full">
                      {/* Promociones por Clínica */}
                      {allPromotionsResponse.clinics?.map((clinic: any) => {
                        const unmappedTypes = clinic.promotionTypes.filter((p: any) => !p.hasMapping).length;
                        const mappedTypes = clinic.promotionTypes.filter((p: any) => p.hasMapping).length;
                        const totalPromotions = clinic.promotions.length;
                        
                        return (
                          <AccordionItem key={clinic.clinicId} value={clinic.clinicId}>
                            <AccordionTrigger>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{clinic.clinicName}</span>
                                <Badge variant="outline" className="h-5">
                                  {clinic.promotionTypes.length} tipos
                                </Badge>
                                {totalPromotions > 0 && (
                                  <Badge variant="secondary" className="h-5">
                                    {totalPromotions} promociones creadas
                                  </Badge>
                                )}
                                {unmappedTypes > 0 && (
                                  <Badge variant="destructive" className="h-5">
                                    {unmappedTypes} sin mapear
                                  </Badge>
                                )}
                                {mappedTypes > 0 && (
                                  <Badge variant="default" className="h-5 bg-green-500 text-white hover:bg-green-600">
                                    {mappedTypes} mapeados
                                  </Badge>
                                )}
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="pt-4 space-y-4">
                                {/* Tipos de Promociones del Sistema */}
                                <div>
                                  <h5 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <Package className="w-4 h-4" />
                                    Tipos de Promociones del Sistema
                                  </h5>
                                  <div className="space-y-2">
                                    {clinic.promotionTypes.map((promType: any) => (
                                      <div key={promType.id} className="border rounded-lg p-4">
                                        <div className="flex items-center gap-3">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                              <div className="font-medium">
                                                {promType.name}
                                              </div>
                                              <Badge variant="secondary" className="text-xs">
                                                Sistema
                                              </Badge>
                                              {promType.mappingIsGlobal && promType.hasMapping && (
                                                <Badge variant="outline" className="text-xs">
                                                  Heredado de Global
                                                </Badge>
                                              )}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                              Código: {promType.code}
                                            </div>
                                          </div>
                                          <Select
                                            value={discountMappings[`${clinic.clinicId}:${promType.code}`] || promType.accountId || 'none'}
                                            onValueChange={(value) => 
                                              setDiscountMappings(prev => ({
                                                ...prev,
                                                [`${clinic.clinicId}:${promType.code}`]: value
                                              }))
                                            }
                                          >
                                            <SelectTrigger className="w-[300px]">
                                              <SelectValue placeholder="Seleccionar cuenta">
                                                {promType.accountCode ? `${promType.accountCode} - ${promType.accountName}` : 'Sin asignar'}
                                              </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="none">
                                                <span className="text-muted-foreground">Sin asignar</span>
                                              </SelectItem>
                                              {chartOfAccounts
                                                ?.map((account: ChartAccount) => (
                                                  <SelectItem key={account.id} value={account.id}>
                                                    {renderAccountOption(account)}
                                                  </SelectItem>
                                                ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={onComplete}>
                    {translations.common.cancel}
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
              <NoDataMessage reason="all_promotions_mapped" type="promotions" />
            )}
          </TabsContent>

          {/* Pestaña de Reglas */}
          <TabsContent value="rules" className="mt-4">
            <Alert>
              <AlertCircle className="w-4 w-4" />
              <AlertDescription>
                {translations.rules.comingSoon}
              </AlertDescription>
            </Alert>
          </TabsContent>

          {/* Pestaña de Bancos */}
          <TabsContent value="banks" className="mt-4 space-y-4">
            {checkingClinics || loadingBanks || loadingChartOfAccounts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : !hasClinics ? (
              getReasonMessage('no_clinics_assigned', 'bancos')
            ) : allBanks.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <Alert className="flex-1 mr-4">
                    <Info className="w-4 h-4" />
                    <AlertDescription>
                      {translations.banks.info}
                    </AlertDescription>
                  </Alert>
                  <Button 
                    className="ml-auto"
                    variant={allBanks.some(b => b.accountId) ? "destructive" : "default"}
                    size="sm"
                    onClick={() => {
                      console.log('[Banks] Iniciando mapeo de bancos...');
                      if (allBanks.some(b => b.accountId)) {
                        if (confirm('¿Estás seguro de que deseas remapear? Esto sobrescribirá los mapeos existentes de bancos.')) {
                          console.log('[Banks] Ejecutando remapeo forzado...');
                          executeAutoMapping.mutate({ types: ['banks'] });
                        }
                      } else {
                        console.log('[Banks] Ejecutando mapeo inicial...');
                        executeAutoMapping.mutate({ types: ['banks'] });
                      }
                    }}
                    disabled={executeAutoMapping.isPending}
                  >
                    {executeAutoMapping.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Mapeando...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        {allBanks.some(b => b.accountId) ? 'Remapear Bancos' : 'Mapear Bancos'}
                      </>
                    )}
                  </Button>
                </div>

                {/* Lista de bancos */}
                <div className="space-y-4">
                  {allBanks.map((bank: any) => (
                    <Card key={bank.id}>
                      <CardHeader 
                        className="cursor-pointer"
                        onClick={() => {
                          const newExpanded = new Set(expandedBanks);
                          if (newExpanded.has(bank.id)) {
                            newExpanded.delete(bank.id);
                          } else {
                            newExpanded.add(bank.id);
                          }
                          setExpandedBanks(newExpanded);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <ChevronRight 
                                className={cn(
                                  "w-4 h-4 text-muted-foreground transition-transform",
                                  expandedBanks.has(bank.id) && "rotate-90"
                                )}
                              />
                              <Building2 className="w-5 h-5 text-muted-foreground" />
                              <CardTitle className="text-base">{bank.name}</CardTitle>
                              {bank.code && (
                                <Badge variant="secondary">{bank.code}</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {bank.isGlobal ? (
                              <Badge variant="outline">Global</Badge>
                            ) : (
                              <Badge variant="outline">
                                {bank.clinics.map((c: any) => c.name).join(', ')}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      
                      {expandedBanks.has(bank.id) && (
                        <CardContent className="space-y-4">
                          {/* Mapeo del banco principal */}
                          <div className="flex items-center gap-3">
                            <Label className="w-32">Cuenta banco:</Label>
                            <Select
                              value={bankMappings[bank.id] || bank.accountId || 'none'}
                              onValueChange={(value) => 
                                setBankMappings(prev => ({
                                  ...prev,
                                  [bank.id]: value === 'none' ? '' : value
                                }))
                              }
                            >
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder={translations.common.selectAccount}>
                                  {getAccountInfo(bankMappings[bank.id] || bank.accountId)}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">
                                  <span className="text-muted-foreground">Sin asignar</span>
                                </SelectItem>
                                {chartOfAccounts
                                  ?.filter((account: ChartAccount) => 
                                    account.accountNumber.startsWith('572') || 
                                    account.accountNumber.startsWith('514') ||
                                    account.accountNumber.startsWith('516')
                                  )
                                  .map((account: ChartAccount) => (
                                    <SelectItem key={account.id} value={account.id}>
                                      {renderAccountOption(account)}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Cuentas bancarias del banco */}
                          {bank.bankAccounts && bank.bankAccounts.length > 0 ? (
                            <div className="space-y-3 mt-4">
                              <Label className="text-sm font-medium text-muted-foreground">
                                {translations.banks.bankAccounts}
                              </Label>
                              {bank.bankAccounts.map((account: any) => (
                                <div key={account.id} className="ml-4 p-3 border rounded-lg bg-muted/30">
                                  <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                      <div className="font-medium">{account.name}</div>
                                      <div className="text-sm text-muted-foreground">
                                        IBAN: {account.iban} {account.currency && `(${account.currency})`}
                                      </div>
                                      {!account.isGlobal && account.clinics && account.clinics.length > 0 && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                          Clínicas: {account.clinics.map((c: any) => c.name).join(', ')}
                                        </div>
                                      )}
                                    </div>
                                    <Badge variant={account.isActive ? "default" : "secondary"}>
                                      {account.isActive ? 'Activa' : 'Inactiva'}
                                    </Badge>
                                  </div>
                                  
                                  {/* Mapeo de subcuenta */}
                                  <div className="flex items-center gap-3 mt-3">
                                    <Label className="w-32 text-sm">Subcuenta:</Label>
                                    <Select
                                      value={bankAccountMappings[account.id] || account.accountId || 'none'}
                                      onValueChange={(value) => 
                                        setBankAccountMappings(prev => ({
                                          ...prev,
                                          [account.id]: value === 'none' ? '' : value
                                        }))
                                      }
                                    >
                                      <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="Seleccionar subcuenta">
                                          {getAccountInfo(bankAccountMappings[account.id] || account.accountId)}
                                        </SelectValue>
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">
                                          <span className="text-muted-foreground">Sin asignar</span>
                                        </SelectItem>
                                        {chartOfAccounts
                                          ?.filter((acc: ChartAccount) => 
                                            acc.accountNumber.startsWith('572') || 
                                            acc.accountNumber.startsWith('514') ||
                                            acc.accountNumber.startsWith('516')
                                          )
                                          .map((account: ChartAccount) => (
                                            <SelectItem key={account.id} value={account.id}>
                                              {renderAccountOption(account)}
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {/* Clínicas que usan esta cuenta bancaria */}
                                  {account.assignedClinics && account.assignedClinics.length > 0 && (
                                    <div className="mt-3 pl-4 border-l-2 border-primary/20">
                                      <div className="text-xs font-medium text-muted-foreground mb-2">
                                        Clínicas asignadas:
                                      </div>
                                      {account.assignedClinics.map((clinic: any) => (
                                        <div key={clinic.id} className="flex items-center gap-2 text-sm py-1">
                                          <Building2 className="h-3 w-3 text-primary/60" />
                                          <span>{clinic.name}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {/* POS Terminals de esta cuenta bancaria */}
                                  {account.posTerminals && account.posTerminals.length > 0 && (
                                    <div className="mt-3 pl-4 border-l-2 border-muted">
                                      <div className="text-xs font-medium text-muted-foreground mb-2">
                                        Terminales POS asociados:
                                      </div>
                                      {account.posTerminals.map((pos: any) => (
                                        <div key={pos.id} className="flex items-center gap-2 text-sm py-1">
                                          <div className="w-2 h-2 bg-primary rounded-full" />
                                          <span>{pos.name}</span>
                                          {pos.isActive ? (
                                            <Badge variant="outline" className="text-xs">
                                              Activo
                                            </Badge>
                                          ) : (
                                            <Badge variant="secondary" className="text-xs">
                                              Inactivo
                                            </Badge>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="ml-8 text-sm text-muted-foreground">
                              {translations.banks.noBankAccounts}
                            </div>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>

                {/* Botón guardar */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setActiveTab('discounts')}>
                    Volver
                  </Button>
                  <Button 
                    onClick={handleSaveBankMappings}
                    disabled={saveBankMappings.isPending || Object.keys(bankMappings).length === 0}
                  >
                    {saveBankMappings.isPending ? (
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
              <NoDataMessage reason="no_banks_available" type="bancos" />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
