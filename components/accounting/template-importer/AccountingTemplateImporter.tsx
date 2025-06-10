/**
 * Componente para importar plantillas de planes contables predefinidos
 * 
 * Permite a los usuarios seleccionar e importar planes contables
 * específicos para su país y tipo de negocio
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { 
  FileText, 
  Globe, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Download,
  Eye,
  Sparkles,
  Info,
  Briefcase,
  Loader2,
  ChevronRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { 
  COUNTRY_INFO, 
  COUNTRY_TEMPLATES, 
  COUNTRY_VAT_CONFIGS,
  getAvailableSectors,
  type SupportedCountry,
  type SupportedLanguage,
  type ChartOfAccountTemplate
} from '@/config/accounting';
import { BusinessSector } from '@/types/accounting';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface AccountingTemplateImporterProps {
  systemId: string;
  legalEntityId?: string;
  currentLanguage: SupportedLanguage;
  onImportComplete?: () => void;
}

interface PreviewAccount {
  accountNumber: string;
  name: string;
  type: string;
  description?: string;
  level: number;
  children?: PreviewAccount[];
  isExpanded?: boolean;
}

export default function AccountingTemplateImporter({
  systemId,
  legalEntityId,
  currentLanguage = 'es',
  onImportComplete
}: AccountingTemplateImporterProps) {
  const { t } = useTranslation();
  const [selectedCountry, setSelectedCountry] = useState<SupportedCountry | ''>('');
  const [selectedSector, setSelectedSector] = useState<BusinessSector | 'GENERAL'>('GENERAL');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewAccounts, setPreviewAccounts] = useState<PreviewAccount[]>([]);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [showRisksConfirmation, setShowRisksConfirmation] = useState(false);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [allowReplacePlan, setAllowReplacePlan] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Estados para configuración del ejercicio fiscal
  const [showFiscalYearConfig, setShowFiscalYearConfig] = useState(false);
  const [fiscalYearName, setFiscalYearName] = useState(`Ejercicio ${new Date().getFullYear()}`);
  const [fiscalYearStartDate, setFiscalYearStartDate] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
  );
  const [fiscalYearEndDate, setFiscalYearEndDate] = useState(
    new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]
  );

  // Estados para características del negocio
  const [businessFeatures, setBusinessFeatures] = useState({
    hasConsultationServices: false,
    hasMedicalTreatments: false,
    hasHairSalon: false,
    hasSpa: false,
    sellsProducts: false,
    isMultiCenter: false
  });

  // Estados para ubicaciones
  const [locations, setLocations] = useState([]);

  // Verificar si ya existe un plan contable
  const { data: existingChart, isLoading: checkingChart } = useQuery({
    queryKey: ['chart-of-accounts', systemId, legalEntityId],
    queryFn: async () => {
      const params = new URLSearchParams({
        systemId,
        ...(legalEntityId && { legalEntityId })
      });
      const response = await fetch(`/api/chart-of-accounts?${params}`);
      if (!response.ok) throw new Error('Error checking existing chart');
      return response.json();
    }
  });

  // Verificar movimientos contables
  const { data: movements, isLoading: checkingMovements } = useQuery({
    queryKey: ['journal-entries-count', systemId, legalEntityId],
    queryFn: async () => {
      if (!legalEntityId || !existingChart?.hasEntries) return { count: 0 };
      const params = new URLSearchParams({
        systemId,
        legalEntityId,
        countOnly: 'true'
      });
      const response = await fetch(`/api/journal-entries?${params}`);
      if (!response.ok) return { count: 0 };
      return response.json();
    },
    enabled: !!legalEntityId && !!existingChart?.hasEntries
  });

  // Obtener información de la sociedad fiscal
  const { data: legalEntity } = useQuery({
    queryKey: ['legal-entity', legalEntityId],
    queryFn: async () => {
      if (!legalEntityId) return null;
      const response = await fetch(`/api/legal-entities/${legalEntityId}`);
      if (!response.ok) throw new Error('Error loading legal entity');
      return response.json();
    },
    enabled: !!legalEntityId
  });

  // Pre-seleccionar país si hay sociedad fiscal
  useEffect(() => {
    if (legalEntity?.countryIso && !selectedCountry) {
      setSelectedCountry(legalEntity.countryIso as SupportedCountry);
    }
  }, [legalEntity, selectedCountry]);

  // Obtener sectores disponibles
  const availableSectors = useMemo(() => {
    return getAvailableSectors().filter(sector => sector.isAvailable);
  }, []);

  // Construir código de plantilla completo
  const fullTemplateCode = useMemo(() => {
    if (!selectedCountry) return '';
    return selectedSector && selectedSector !== 'GENERAL'
      ? `${selectedCountry}_${selectedSector}`
      : `${selectedCountry}_BASE`;
  }, [selectedCountry, selectedSector]);

  const handlePreview = async () => {
    if (!selectedCountry || !fullTemplateCode) return;
    
    setPreviewAccounts([]);
    setShowPreview(true);
    
    try {
      // Cargar plantilla de preview
      const response = await fetch(`/api/chart-of-accounts/preview-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateCode: fullTemplateCode,
          country: selectedCountry, // ✅ Campo requerido
          sector: selectedSector === 'GENERAL' ? undefined : selectedSector // ✅ Campo opcional
        })
      });
      
      if (!response.ok) throw new Error('Error loading preview');
      const data = await response.json();
      
      // Organizar cuentas en estructura jerárquica
      const accounts = organizeAccountsHierarchy(data.accounts);
      setPreviewAccounts(accounts);
    } catch (error) {
      toast.error(t('accounting.import.errors.loadingTemplate'));
      setShowPreview(false);
    }
  };

  const handleImport = async () => {
    if (!selectedCountry || !fullTemplateCode) return;
    
    // Si hay movimientos y modo reemplazar, mostrar confirmación
    if (movements?.count > 0 && importMode === 'replace' && !showRisksConfirmation) {
      setShowRisksConfirmation(true);
      return;
    }
    
    setIsImporting(true);
    
    try {
      // Determinar las fechas del período fiscal
      const startDateForFiscalYear = showFiscalYearConfig ? fiscalYearStartDate : `${new Date().getFullYear()}-01-01`;
      const endDateForFiscalYear = showFiscalYearConfig ? fiscalYearEndDate : `${new Date().getFullYear()}-12-31`;
      
      toast.info('🔄 Verificando ejercicios fiscales...');
      
      // Verificar ejercicios fiscales existentes
      const existingFiscalYearsResponse = await fetch(
        `/api/fiscal-years?legalEntityId=${legalEntity?.id}`
      );
      
      let fiscalYear = null;
      let existingFiscalYears: any[] = [];
      let wasExistingFiscalYear = false;
      
      if (existingFiscalYearsResponse.ok) {
        existingFiscalYears = await existingFiscalYearsResponse.json();
        
        if (existingFiscalYears.length > 0) {
          // Buscar si hay ejercicio fiscal que solape con las fechas del período
          const startDate = new Date(startDateForFiscalYear);
          const endDate = new Date(endDateForFiscalYear);
          
          fiscalYear = existingFiscalYears.find((fy: any) => {
            const fyStart = new Date(fy.startDate);
            const fyEnd = new Date(fy.endDate);
            const startDate = new Date(startDateForFiscalYear);
            const endDate = new Date(endDateForFiscalYear);
            
            // Verificar si hay solapamiento de fechas
            const hasOverlap = (startDate <= fyEnd && endDate >= fyStart);
            
            if (hasOverlap) {
              console.log(`📅 Ejercicio existente encontrado: ${fy.name} (${fyStart.toDateString()} - ${fyEnd.toDateString()})`);
              console.log(`📅 Período solicitado: ${startDate.toDateString()} - ${endDate.toDateString()}`);
              
              // Calcular el solapamiento
              const overlapStart = new Date(Math.max(startDate.getTime(), fyStart.getTime()));
              const overlapEnd = new Date(Math.min(endDate.getTime(), fyEnd.getTime()));
              const overlapDays = Math.max(0, Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)));
              const requestedDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
              const overlapPercentage = (overlapDays / requestedDays) * 100;
              
              console.log(`📊 Solapamiento: ${overlapDays} días de ${requestedDays} (${overlapPercentage.toFixed(1)}%)`);
              
              // Si el solapamiento es mayor al 95% O el período está completamente dentro, lo usamos
              if (overlapPercentage >= 95 || (startDate >= fyStart && endDate <= fyEnd)) {
                console.log('✅ Solapamiento suficiente, usando ejercicio existente');
                return true;
              }
              
              // Si el período solicitado es un año natural estándar (1 ene - 31 dic)
              // y el ejercicio existente incluye ese año, también lo usamos
              const isStandardYear = startDate.getMonth() === 0 && startDate.getDate() === 1 &&
                                   endDate.getMonth() === 11 && endDate.getDate() === 31;
              const yearMatches = startDate.getFullYear() === endDate.getFullYear();
              const endDateWithMargin = new Date(endDate.getTime() - (7 * 24 * 60 * 60 * 1000)); // 7 días de margen
              const exerciseIncludesYear = fyStart <= startDate && fyEnd >= endDateWithMargin;
              
              if (isStandardYear && yearMatches && exerciseIncludesYear) {
                console.log('✅ Período estándar anual con ejercicio compatible, usando ejercicio existente');
                return true;
              }
            }
            
            return false;
          });
          
          if (fiscalYear) {
            // Ya existe un ejercicio fiscal que incluye el período
            wasExistingFiscalYear = true;
            console.log('✅ Usando ejercicio fiscal existente:', fiscalYear.name);
            toast.success(`📅 Usando ejercicio fiscal existente: ${fiscalYear.name}`);
          } else {
            // Verificar que no haya solapamientos problemáticos (solo si es realmente problemático)
            const hasProblematicOverlap = existingFiscalYears.some((fy: any) => {
              const fyStart = new Date(fy.startDate);
              const fyEnd = new Date(fy.endDate);
              const startDate = new Date(startDateForFiscalYear);
              const endDate = new Date(endDateForFiscalYear);
              
              // Solo es problemático si hay solapamiento pero es menor al 50%
              const hasOverlap = (startDate <= fyEnd && endDate >= fyStart);
              if (!hasOverlap) return false;
              
              const overlapStart = new Date(Math.max(startDate.getTime(), fyStart.getTime()));
              const overlapEnd = new Date(Math.min(endDate.getTime(), fyEnd.getTime()));
              const overlapDays = Math.max(0, Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)));
              const requestedDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
              const overlapPercentage = (overlapDays / requestedDays) * 100;
              
              // Es problemático si hay solapamiento menor al 50% (ni muy poco ni suficiente)
              return overlapPercentage > 10 && overlapPercentage < 50;
            });
            
            if (hasProblematicOverlap) {
              throw new Error('El período seleccionado tiene un solapamiento parcial con ejercicios fiscales existentes. Por favor, ajuste las fechas o use el ejercicio fiscal existente desde la configuración.');
            }
            
            // No hay ejercicio que incluya el período, necesitamos crear uno nuevo
            // Verificar que el nombre no esté duplicado
            let proposedName = fiscalYearName;
            let counter = 1;
            
            while (existingFiscalYears.some((fy: any) => fy.name === proposedName)) {
              proposedName = `${fiscalYearName} (${counter})`;
              counter++;
            }
            
            toast.info(`📅 Creando nuevo ejercicio fiscal: ${proposedName}...`);
            
            // Crear el nuevo ejercicio fiscal con nombre único
            const fiscalYearResponse = await fetch('/api/fiscal-years', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: proposedName,
                startDate: new Date(startDateForFiscalYear),
                endDate: new Date(endDateForFiscalYear),
                legalEntityId: legalEntity?.id,
                systemId
              })
            });

            if (!fiscalYearResponse.ok) {
              const errorData = await fiscalYearResponse.json();
              throw new Error(errorData.error || 'Error al crear el año fiscal');
            }

            fiscalYear = await fiscalYearResponse.json();
            console.log('✅ Ejercicio fiscal creado:', fiscalYear.name);
            toast.success(`📅 Ejercicio fiscal creado: ${fiscalYear.name}`);
          }
        } else {
          // No hay ejercicios fiscales, crear el primero
          toast.info(`📅 Creando primer ejercicio fiscal: ${fiscalYearName}...`);
          
          const fiscalYearResponse = await fetch('/api/fiscal-years', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: fiscalYearName,
              startDate: new Date(startDateForFiscalYear),
              endDate: new Date(endDateForFiscalYear),
              legalEntityId: legalEntity?.id,
              systemId
            })
          });

          if (!fiscalYearResponse.ok) {
            const errorData = await fiscalYearResponse.json();
            throw new Error(errorData.error || 'Error al crear el año fiscal');
          }

          fiscalYear = await fiscalYearResponse.json();
          console.log('✅ Primer ejercicio fiscal creado:', fiscalYear.name);
          toast.success(`📅 Primer ejercicio fiscal creado: ${fiscalYear.name}`);
        }
      }

      // Luego importar la plantilla con los campos correctos
      toast.info('📊 Importando plan contable...');
      
      const response = await fetch('/api/chart-of-accounts/import-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateCode: fullTemplateCode,
          country: selectedCountry, // ✅ Campo requerido
          sector: selectedSector !== 'GENERAL' ? selectedSector : undefined, // ✅ Campo opcional
          legalEntityId: legalEntity?.id,
          systemId,
          mode: importMode, // ✅ Corregido: era 'importMode', ahora es 'mode'
          // Nuevas características del negocio
          businessFeatures,
          locations: businessFeatures.isMultiCenter ? locations : undefined,
          allowReplacePlan
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Error al importar plantilla');
      }

      const result = await response.json();
      
      toast.success(`✅ ${result.message || 'Plan contable importado correctamente'}`);
      toast.success('🎉 ¡Configuración contable completada!');
      
      onImportComplete?.();
    } catch (error) {
      console.error('Error en importación:', error);
      toast.error(`❌ ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Organizar cuentas en jerarquía
  const organizeAccountsHierarchy = (accounts: any[]): PreviewAccount[] => {
    const accountMap = new Map<string, PreviewAccount>();
    const rootAccounts: PreviewAccount[] = [];
    
    // Primero crear todos los nodos
    accounts.forEach(acc => {
      accountMap.set(acc.accountNumber, {
        accountNumber: acc.accountNumber,
        name: acc.names[currentLanguage] || acc.names.es,
        type: acc.type,
        description: acc.description?.[currentLanguage],
        level: acc.level,
        children: []
      });
    });
    
    // Luego construir la jerarquía
    accounts.forEach(acc => {
      const node = accountMap.get(acc.accountNumber)!;
      if (acc.parentNumber && accountMap.has(acc.parentNumber)) {
        const parent = accountMap.get(acc.parentNumber)!;
        parent.children = parent.children || [];
        parent.children.push(node);
      } else if (acc.level === 1) {
        rootAccounts.push(node);
      }
    });
    
    return rootAccounts;
  };

  const toggleAccountExpansion = (accountNumber: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountNumber)) {
      newExpanded.delete(accountNumber);
    } else {
      newExpanded.add(accountNumber);
    }
    setExpandedAccounts(newExpanded);
  };

  const expandAll = () => {
    const allNumbers = new Set<string>();
    const collectAll = (accounts: PreviewAccount[]) => {
      accounts.forEach(acc => {
        if (acc.children && acc.children.length > 0) {
          allNumbers.add(acc.accountNumber);
          collectAll(acc.children);
        }
      });
    };
    collectAll(previewAccounts);
    setExpandedAccounts(allNumbers);
  };

  const collapseAll = () => {
    setExpandedAccounts(new Set());
  };

  const renderPreviewAccount = (account: PreviewAccount, depth = 0) => {
    const hasChildren = account.children && account.children.length > 0;
    const isExpanded = expandedAccounts.has(account.accountNumber);
    
    return (
      <div key={account.accountNumber}>
        <div 
          className={cn(
            "flex items-center gap-2 py-2 px-3 hover:bg-muted/50 rounded-md cursor-pointer transition-colors",
            depth > 0 && "ml-" + (depth * 6)
          )}
          onClick={() => hasChildren && toggleAccountExpansion(account.accountNumber)}
        >
          {hasChildren && (
            isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
          )}
          {!hasChildren && <div className="w-4" />}
          
          <div className="flex-1 grid grid-cols-[120px_1fr_100px] gap-4 items-center">
            <code className="font-mono text-sm">{account.accountNumber}</code>
            <div>
              <p className="text-sm font-medium">{account.name}</p>
              {account.description && (
                <p className="text-xs text-muted-foreground">{account.description}</p>
              )}
            </div>
            <Badge variant="outline" className="text-xs">
              {t(`accounting.accountTypes.${account.type}`)}
            </Badge>
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {account.children!.map(child => renderPreviewAccount(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {t('accounting.import.title')}
          </CardTitle>
          <CardDescription>
            {t('accounting.import.sector.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Alerta si ya existe un plan */}
          {existingChart?.hasEntries && (
            <Alert variant={allowReplacePlan ? "destructive" : "default"}>
              <AlertCircle className="w-4 h-4" />
              <AlertTitle>{t('accounting.import.warnings.hasMovements.title')}</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>
                  {movements?.count > 0 
                    ? t('accounting.import.warnings.hasMovements.description', { count: movements.count })
                    : t('accounting.import.warnings.replace.description')
                  }
                </p>
                <div className="flex items-center pt-2 space-x-2">
                  <Checkbox 
                    id="allow-replace"
                    checked={allowReplacePlan}
                    onCheckedChange={(checked) => {
                      setAllowReplacePlan(checked as boolean);
                      // Si se marca el checkbox, forzar modo replace
                      if (checked) {
                        setImportMode('replace');
                      }
                    }}
                  />
                  <Label 
                    htmlFor="allow-replace" 
                    className="text-sm font-normal cursor-pointer"
                  >
                    {t('accounting.import.warnings.replace.confirmReplace')}
                    {movements?.count > 0 && (
                      <span className="font-medium text-destructive">
                        {' '}{t('accounting.import.warnings.replace.warningWithMovements', { count: movements.count })}
                      </span>
                    )}
                  </Label>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Selección de país */}
          <div className="space-y-2">
            <Label htmlFor="country">{t('accounting.import.country.label')}</Label>
            <Select
              value={selectedCountry}
              onValueChange={(value) => {
                setSelectedCountry(value as SupportedCountry);
                setSelectedSector('GENERAL');
              }}
              disabled={
                // Solo deshabilitar si hay entidad legal Y no se ha marcado reemplazar
                (!!legalEntity && existingChart?.hasEntries && !allowReplacePlan) || 
                checkingChart
              }
            >
              <SelectTrigger id="country">
                <SelectValue placeholder={t('accounting.import.country.placeholder')}>
                  {selectedCountry && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      {COUNTRY_INFO[selectedCountry].names[currentLanguage]}
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(COUNTRY_INFO).map(([code, info]) => (
                  <SelectItem key={code} value={code}>
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      <span>{info.names[currentLanguage]}</span>
                      <Badge variant="secondary" className="ml-auto">
                        {info.accounting.standard}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {legalEntity && !allowReplacePlan && (
              <p className="text-sm text-muted-foreground">
                {t('accounting.import.country.description')}
              </p>
            )}
          </div>

          {/* Selección de sector */}
          {selectedCountry && (
            <div className="space-y-2">
              <Label htmlFor="sector">{t('accounting.import.sector.label')}</Label>
              <Select
                value={selectedSector}
                onValueChange={(value) => setSelectedSector(value as BusinessSector | 'GENERAL')}
              >
                <SelectTrigger id="sector">
                  <SelectValue placeholder={t('accounting.import.sector.placeholder')}>
                    {selectedSector === 'GENERAL' ? (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        {t('accounting.import.sector.generalPlan.name')}
                      </div>
                    ) : selectedSector ? (
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        {t(`accounting.sectors.${selectedSector}.name`)}
                      </div>
                    ) : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERAL">
                    <div className="py-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        <span className="font-medium">{t('accounting.import.sector.generalPlan.name')}</span>
                      </div>
                      <p className="pl-6 text-sm text-muted-foreground">
                        {t('accounting.import.sector.generalPlan.description')}
                      </p>
                    </div>
                  </SelectItem>
                  {availableSectors.map((sector) => (
                    <SelectItem key={sector.sector} value={sector.sector}>
                      <div className="py-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4" />
                          <span className="font-medium">{sector.name}</span>
                        </div>
                        <p className="pl-6 text-sm text-muted-foreground">
                          {sector.description}
                        </p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {t('accounting.import.sector.description')}
              </p>
            </div>
          )}

          {/* Modo de importación - Solo mostrar si ya existe plan Y se permite reemplazar */}
          {existingChart?.hasEntries && selectedCountry && allowReplacePlan && (
            <div className="space-y-2">
              <Label>{t('accounting.import.mode.label')}</Label>
              <Tabs value={importMode} onValueChange={(v) => setImportMode(v as 'replace' | 'merge')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="replace">{t('accounting.import.mode.options.replace')}</TabsTrigger>
                  <TabsTrigger value="merge">{t('accounting.import.mode.options.merge')}</TabsTrigger>
                </TabsList>
                <TabsContent value="replace" className="mt-2">
                  <Alert variant="destructive">
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>
                      {t('accounting.import.warnings.replace.description')}
                    </AlertDescription>
                  </Alert>
                </TabsContent>
                <TabsContent value="merge" className="mt-2">
                  <Alert>
                    <Info className="w-4 h-4" />
                    <AlertDescription>
                      {t('accounting.import.mode.descriptions.merge')}
                    </AlertDescription>
                  </Alert>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Información adicional */}
          {selectedCountry && (
            <Card className="bg-muted/50">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t('accounting.import.standardInfo.accountingStandard')}</span>
                  <Badge>{COUNTRY_INFO[selectedCountry].accounting.standard}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t('accounting.import.standardInfo.currency')}</span>
                  <Badge variant="outline">{COUNTRY_INFO[selectedCountry].currency}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t('accounting.import.standardInfo.fiscalYear')}</span>
                  <span className="text-sm text-muted-foreground">
                    {COUNTRY_INFO[selectedCountry].accounting.fiscalYearStart} - {COUNTRY_INFO[selectedCountry].accounting.fiscalYearEnd}
                  </span>
                </div>
                {selectedSector && selectedSector !== 'GENERAL' && (
                  <div className="pt-2 border-t">
                    <p className="mb-1 text-sm font-medium">{t('accounting.import.standardInfo.sectorCustomization')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t(`accounting.sectors.${selectedSector}.description`)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Configuración de importación */}
          {selectedCountry && (
            <div className="space-y-4">
              <Separator />
              
              {/* Configuración del Ejercicio Fiscal */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">
                    {t('accounting.import.fiscalYear.title')}
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFiscalYearConfig(!showFiscalYearConfig)}
                  >
                    {showFiscalYearConfig ? (
                      <>
                        <ChevronUp className="w-4 h-4 mr-1" />
                        {t('accounting.import.fiscalYear.hide')}
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 mr-1" />
                        {t('accounting.import.fiscalYear.configure')}
                      </>
                    )}
                  </Button>
                </div>
                
                {!showFiscalYearConfig ? (
                  <Alert>
                    <Info className="w-4 h-4" />
                    <AlertDescription>
                      {t('accounting.import.fiscalYear.defaultInfo', {
                        year: new Date().getFullYear()
                      })}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Card className="p-4 space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="fiscal-year-name">
                        {t('accounting.import.fiscalYear.name')}
                      </Label>
                      <Input
                        id="fiscal-year-name"
                        value={fiscalYearName}
                        onChange={(e) => setFiscalYearName(e.target.value)}
                        placeholder={t('accounting.import.fiscalYear.namePlaceholder')}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="fiscal-start">
                          {t('accounting.import.fiscalYear.startDate')}
                        </Label>
                        <Input
                          id="fiscal-start"
                          type="date"
                          value={fiscalYearStartDate}
                          onChange={(e) => setFiscalYearStartDate(e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="fiscal-end">
                          {t('accounting.import.fiscalYear.endDate')}
                        </Label>
                        <Input
                          id="fiscal-end"
                          type="date"
                          value={fiscalYearEndDate}
                          onChange={(e) => setFiscalYearEndDate(e.target.value)}
                          min={fiscalYearStartDate}
                        />
                      </div>
                    </div>
                    
                    <Alert>
                      <AlertDescription className="text-xs">
                        {t('accounting.import.fiscalYear.customInfo')}
                      </AlertDescription>
                    </Alert>
                  </Card>
                )}
              </div>

              {/* Opción de reemplazo del plan contable */}
              <div className="space-y-4">
                <Label className="text-base font-medium">
                  {t('accounting.import.replacementOption.title')}
                </Label>
                
                <Card className="p-4 space-y-3">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      checked={allowReplacePlan}
                      onCheckedChange={(checked) => setAllowReplacePlan(checked as boolean)}
                      id="replace-plan"
                    />
                    <div className="space-y-2">
                      <label 
                        htmlFor="replace-plan" 
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {t('accounting.import.replacementOption.replaceExisting')}
                      </label>
                      <p className="text-sm text-muted-foreground">
                        {allowReplacePlan 
                          ? t('accounting.import.replacementOption.replaceDescription')
                          : t('accounting.import.replacementOption.mergeDescription')
                        }
                      </p>
                    </div>
                  </div>
                  
                  {allowReplacePlan && (
                    <Alert variant="destructive">
                      <AlertTriangle className="w-4 h-4" />
                      <AlertDescription>
                        {t('accounting.import.replacementOption.warning')}
                      </AlertDescription>
                    </Alert>
                  )}
                </Card>
              </div>

              {/* Características del negocio */}
              <div className="space-y-4">
                <Label className="text-base font-medium">
                  {t('accounting.import.businessFeatures.title')}
                </Label>
                
                <Card className="p-4 space-y-3">
                  <div className="grid grid-cols-1 gap-4">
                    {/* Características del negocio - Primera fila */}
                    <div className="grid grid-cols-2 gap-4">
                      <label className="flex items-center space-x-2">
                        <Checkbox
                          checked={businessFeatures.hasConsultationServices}
                          onCheckedChange={(checked) =>
                            setBusinessFeatures((prev) => ({
                              ...prev,
                              hasConsultationServices: checked as boolean
                            }))
                          }
                        />
                        <span>{t('accountingImport.features.consultationServices')}</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <Checkbox
                          checked={businessFeatures.hasMedicalTreatments}
                          onCheckedChange={(checked) =>
                            setBusinessFeatures((prev) => ({
                              ...prev,
                              hasMedicalTreatments: checked as boolean
                            }))
                          }
                        />
                        <span>{t('accountingImport.features.medicalTreatments')}</span>
                      </label>
                    </div>
                    {/* Segunda fila */}
                    <div className="grid grid-cols-2 gap-4">
                      <label className="flex items-center space-x-2">
                        <Checkbox
                          checked={businessFeatures.hasHairSalon}
                          onCheckedChange={(checked) =>
                            setBusinessFeatures((prev) => ({
                              ...prev,
                              hasHairSalon: checked as boolean
                            }))
                          }
                        />
                        <span>{t('accountingImport.features.hairSalon')}</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <Checkbox
                          checked={businessFeatures.hasSpa}
                          onCheckedChange={(checked) =>
                            setBusinessFeatures((prev) => ({
                              ...prev,
                              hasSpa: checked as boolean
                            }))
                          }
                        />
                        <span>{t('accountingImport.features.spa')}</span>
                      </label>
                    </div>
                    {/* Tercera fila */}
                    <div className="grid grid-cols-2 gap-4">
                      <label className="flex items-center space-x-2">
                        <Checkbox
                          checked={businessFeatures.sellsProducts}
                          onCheckedChange={(checked) =>
                            setBusinessFeatures((prev) => ({
                              ...prev,
                              sellsProducts: checked as boolean
                            }))
                          }
                        />
                        <span>{t('accountingImport.features.sellsProducts')}</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <Checkbox
                          checked={businessFeatures.isMultiCenter}
                          onCheckedChange={(checked) =>
                            setBusinessFeatures((prev) => ({
                              ...prev,
                              isMultiCenter: checked as boolean
                            }))
                          }
                        />
                        <span>{t('accountingImport.features.multiCenter')}</span>
                      </label>
                    </div>
                  </div>
                  
                  {/* Campo de ubicaciones si es multi-centro */}
                  {businessFeatures.isMultiCenter && (
                    <div className="space-y-2 mt-4 p-4 bg-muted rounded-lg">
                      <Label htmlFor="locations">
                        {t('accounting.import.businessFeatures.locationsLabel')}
                      </Label>
                      <Input
                        id="locations"
                        placeholder={t('accounting.import.businessFeatures.locationsPlaceholder')}
                        value={locations.join(', ')}
                        onChange={(e) => {
                          const value = e.target.value;
                          const locs = value.split(',').map(loc => loc.trim()).filter(loc => loc);
                          setLocations(locs);
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t('accounting.import.businessFeatures.locationsHelp')}
                      </p>
                    </div>
                  )}
                  
                  <Alert className="mt-4">
                    <Info className="w-4 h-4" />
                    <AlertDescription>
                      {t('accounting.import.businessFeatures.configInfo')}
                    </AlertDescription>
                  </Alert>
                </Card>
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={handlePreview}
                  disabled={!selectedCountry || isImporting}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {t('accounting.import.preview.title')}
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={
                    !selectedCountry || 
                    isImporting || 
                    checkingChart || 
                    checkingMovements ||
                    // Desactivar si existe plan y no se ha marcado el checkbox
                    (existingChart?.hasEntries && !allowReplacePlan)
                  }
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      {t('accounting.import.actions.import')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de vista previa */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{t('accounting.import.preview.title')}</DialogTitle>
            <DialogDescription>
              {t('accounting.import.template.description', {
                country: selectedCountry ? COUNTRY_INFO[selectedCountry].names[currentLanguage] : '',
                sector: selectedSector === 'GENERAL' 
                  ? 'General' 
                  : selectedSector 
                    ? t(`accounting.sectors.${selectedSector}.name`) 
                    : 'General'
              })}
            </DialogDescription>
          </DialogHeader>
          
          {previewAccounts.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between py-2 border-b">
                <p className="text-sm text-muted-foreground">
                  {t('accounting.import.preview.showingAccounts', { count: previewAccounts.length })}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={expandAll}>
                    {t('accounting.import.preview.expandAll')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={collapseAll}>
                    {t('accounting.import.preview.collapseAll')}
                  </Button>
                </div>
              </div>
              
              <ScrollArea className="h-[60vh] w-full pr-4">
                <div className="space-y-1">
                  {previewAccounts.map(account => renderPreviewAccount(account))}
                </div>
              </ScrollArea>
            </>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              {t('accounting.import.actions.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación de riesgos */}
      <Dialog open={showRisksConfirmation} onOpenChange={setShowRisksConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              {t('accounting.import.warnings.hasMovements.title')}
            </DialogTitle>
            <DialogDescription>
              {t('accounting.import.warnings.hasMovements.description', { 
                count: movements?.count || 0 
              })}
            </DialogDescription>
          </DialogHeader>
          
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              Esta acción no se puede deshacer. Todos los asientos contables existentes
              perderán sus referencias a las cuentas actuales.
            </AlertDescription>
          </Alert>
          
          <div className="flex items-center py-4 space-x-2">
            <Checkbox 
              id="understand-risks"
              onCheckedChange={(checked) => {
                // Solo permitir continuar si está marcado
              }}
            />
            <Label htmlFor="understand-risks" className="text-sm font-normal">
              {t('accounting.import.warnings.hasMovements.confirmButton')}
            </Label>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRisksConfirmation(false)}>
              {t('accounting.import.actions.cancel')}
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                setShowRisksConfirmation(false);
                handleImport();
              }}
            >
              Continuar con la importación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 