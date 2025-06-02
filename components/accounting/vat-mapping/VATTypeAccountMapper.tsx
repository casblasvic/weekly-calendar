/**
 * Mapeador de Tipos de IVA a Cuentas Contables
 * 
 * Permite configurar qué cuentas contables se usarán para:
 * - IVA Repercutido (ventas)
 * - IVA Soportado (compras)
 * Para cada tipo de IVA configurado en el sistema
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Receipt,
  Save,
  CheckCircle,
  Info,
  TrendingDown,
  TrendingUp,
  Percent
} from 'lucide-react';
import { toast } from 'sonner';

interface VATTypeAccountMapperProps {
  systemId: string;
  legalEntityId: string;
  currentLanguage?: string;
}

interface VATType {
  id: string;
  code: string;
  name: string;
  rate: number;
  isDefault: boolean;
}

interface VATMapping {
  vatTypeId: string;
  outputAccountId?: string; // IVA Repercutido (ventas)
  inputAccountId?: string;  // IVA Soportado (compras)
}

interface ChartAccount {
  id: string;
  accountNumber: string;
  name: string;
  names?: any;
  type: string;
  isActive: boolean;
}

export default function VATTypeAccountMapper({
  systemId,
  legalEntityId,
  currentLanguage = 'es'
}: VATTypeAccountMapperProps) {
  const queryClient = useQueryClient();
  const [mappings, setMappings] = useState<Record<string, VATMapping>>({});
  const [unsavedChanges, setUnsavedChanges] = useState<Record<string, VATMapping>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Cargar tipos de IVA
  const { data: vatTypes, isLoading: isLoadingVAT } = useQuery({
    queryKey: ['vat-types', systemId],
    queryFn: async () => {
      const response = await fetch(`/api/vat-types?systemId=${systemId}`);
      if (!response.ok) throw new Error('Error cargando tipos de IVA');
      return response.json() as Promise<VATType[]>;
    }
  });

  // Cargar cuentas contables de tipo LIABILITY (para IVA)
  const { data: accounts, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['chart-accounts-vat', legalEntityId],
    queryFn: async () => {
      const response = await fetch(
        `/api/chart-of-accounts?legalEntityId=${legalEntityId}&type=LIABILITY&isActive=true`
      );
      if (!response.ok) throw new Error('Error cargando cuentas');
      const data = await response.json();
      // Filtrar cuentas que contengan "IVA" o números típicos de IVA
      return data.filter((acc: ChartAccount) => 
        acc.name.toLowerCase().includes('iva') ||
        acc.name.toLowerCase().includes('impuesto') ||
        acc.accountNumber.startsWith('477') || // IVA repercutido
        acc.accountNumber.startsWith('472')    // IVA soportado
      ) as ChartAccount[];
    }
  });

  // Cargar mapeos existentes
  const { data: existingMappings, isLoading: isLoadingMappings } = useQuery({
    queryKey: ['vat-mappings', legalEntityId],
    queryFn: async () => {
      const response = await fetch(
        `/api/accounting/vat-mappings?legalEntityId=${legalEntityId}`
      );
      if (!response.ok) throw new Error('Error cargando mapeos');
      const data = await response.json();
      
      // Convertir a formato de mapeo
      const mappingsByVatType: Record<string, VATMapping> = {};
      data.forEach((mapping: any) => {
        if (!mappingsByVatType[mapping.vatTypeId]) {
          mappingsByVatType[mapping.vatTypeId] = {
            vatTypeId: mapping.vatTypeId
          };
        }
        if (mapping.direction === 'OUTPUT') {
          mappingsByVatType[mapping.vatTypeId].outputAccountId = mapping.accountId;
        } else {
          mappingsByVatType[mapping.vatTypeId].inputAccountId = mapping.accountId;
        }
      });
      
      setMappings(mappingsByVatType);
      return mappingsByVatType;
    }
  });

  // Guardar mapeos
  const saveMutation = useMutation({
    mutationFn: async () => {
      const mappingData: Array<{
        vatTypeId: string;
        accountId: string;
        direction: 'INPUT' | 'OUTPUT';
      }> = [];

      Object.entries(unsavedChanges).forEach(([vatTypeId, mapping]) => {
        if (mapping.outputAccountId) {
          mappingData.push({
            vatTypeId,
            accountId: mapping.outputAccountId,
            direction: 'OUTPUT'
          });
        }
        if (mapping.inputAccountId) {
          mappingData.push({
            vatTypeId,
            accountId: mapping.inputAccountId,
            direction: 'INPUT'
          });
        }
      });

      const response = await fetch('/api/accounting/vat-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legalEntityId,
          mappings: mappingData
        })
      });
      
      if (!response.ok) throw new Error('Error guardando mapeos');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Mapeos de IVA guardados correctamente');
      setUnsavedChanges({});
      queryClient.invalidateQueries({ queryKey: ['vat-mappings'] });
    },
    onError: () => {
      toast.error('Error al guardar los mapeos');
    }
  });

  const handleAccountChange = (vatTypeId: string, accountId: string, direction: 'input' | 'output') => {
    const currentMapping = unsavedChanges[vatTypeId] || mappings[vatTypeId] || { vatTypeId };
    
    setUnsavedChanges(prev => ({
      ...prev,
      [vatTypeId]: {
        ...currentMapping,
        ...(direction === 'output' ? { outputAccountId: accountId } : { inputAccountId: accountId })
      }
    }));
  };

  const getAccountForVAT = (vatTypeId: string, direction: 'input' | 'output'): string => {
    const unsaved = unsavedChanges[vatTypeId];
    if (unsaved) {
      return direction === 'output' ? (unsaved.outputAccountId || '') : (unsaved.inputAccountId || '');
    }
    const existing = mappings[vatTypeId];
    if (existing) {
      return direction === 'output' ? (existing.outputAccountId || '') : (existing.inputAccountId || '');
    }
    return '';
  };

  const suggestAccountForVAT = (vatType: VATType, direction: 'input' | 'output'): string => {
    if (!accounts) return '';
    
    const searchTerms = direction === 'output' 
      ? ['repercutido', '477']
      : ['soportado', '472'];

    const suggested = accounts.find(acc => 
      searchTerms.some(term => 
        acc.name.toLowerCase().includes(term) || 
        acc.accountNumber.startsWith(term)
      )
    );
    
    return suggested?.id || '';
  };

  const getAccountName = (accountId: string, language: string = 'es'): string => {
    const account = accounts?.find(acc => acc.id === accountId);
    if (!account) return '';
    
    // Si tiene nombres multiidioma
    if (account.names && account.names[language]) {
      return `${account.accountNumber} - ${account.names[language]}`;
    }
    
    return `${account.accountNumber} - ${account.name}`;
  };

  const handleSave = () => {
    saveMutation.mutate();
  };

  const isLoading = isLoadingVAT || isLoadingAccounts || isLoadingMappings;
  const hasUnsavedChanges = Object.keys(unsavedChanges).length > 0;

  const labels = {
    es: {
      outputVAT: 'IVA Repercutido (Ventas)',
      inputVAT: 'IVA Soportado (Compras)',
      selectAccount: 'Seleccionar cuenta...',
      suggestAccount: 'Sugerir cuenta',
      configured: 'Configurado',
      pending: 'Pendiente'
    },
    fr: {
      outputVAT: 'TVA Collectée (Ventes)',
      inputVAT: 'TVA Déductible (Achats)',
      selectAccount: 'Sélectionner un compte...',
      suggestAccount: 'Suggérer un compte',
      configured: 'Configuré',
      pending: 'En attente'
    },
    en: {
      outputVAT: 'Output VAT (Sales)',
      inputVAT: 'Input VAT (Purchases)',
      selectAccount: 'Select account...',
      suggestAccount: 'Suggest account',
      configured: 'Configured',
      pending: 'Pending'
    }
  };

  const t = labels[currentLanguage as keyof typeof labels] || labels.es;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Mapeo de Tipos de IVA
          </div>
          {hasUnsavedChanges && (
            <Button 
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          Configura las cuentas contables para IVA repercutido (ventas) y soportado (compras)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!accounts || accounts.length === 0 ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No hay cuentas de IVA configuradas. Primero debes importar o crear un plan 
              contable con cuentas de IVA repercutido (477) y soportado (472).
            </AlertDescription>
          </Alert>
        ) : isLoading ? (
          <div className="text-center py-8">Cargando configuración...</div>
        ) : vatTypes && vatTypes.length > 0 ? (
          <div className="space-y-6">
            {vatTypes.map((vatType) => {
              const outputAccountId = getAccountForVAT(vatType.id, 'output');
              const inputAccountId = getAccountForVAT(vatType.id, 'input');
              const hasOutputMapping = !!outputAccountId;
              const hasInputMapping = !!inputAccountId;
              const isModified = !!unsavedChanges[vatType.id];

              return (
                <Card key={vatType.id} className={isModified ? 'border-yellow-500' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Percent className="h-5 w-5" />
                        <div>
                          <h4 className="font-semibold">{vatType.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {vatType.rate}% • Código: {vatType.code}
                          </p>
                        </div>
                      </div>
                      {vatType.isDefault && (
                        <Badge variant="secondary">Por defecto</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* IVA Repercutido */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        {t.outputVAT}
                      </Label>
                      <div className="flex gap-2">
                        <Select
                          value={outputAccountId}
                          onValueChange={(value) => handleAccountChange(vatType.id, value, 'output')}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder={t.selectAccount} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Sin asignar</SelectItem>
                            {accounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {getAccountName(account.id, currentLanguage)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {hasOutputMapping ? (
                          <Badge className="bg-green-500 whitespace-nowrap">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {t.configured}
                          </Badge>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const suggestedId = suggestAccountForVAT(vatType, 'output');
                              if (suggestedId) {
                                handleAccountChange(vatType.id, suggestedId, 'output');
                              }
                            }}
                          >
                            {t.suggestAccount}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* IVA Soportado */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-blue-600" />
                        {t.inputVAT}
                      </Label>
                      <div className="flex gap-2">
                        <Select
                          value={inputAccountId}
                          onValueChange={(value) => handleAccountChange(vatType.id, value, 'input')}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder={t.selectAccount} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Sin asignar</SelectItem>
                            {accounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {getAccountName(account.id, currentLanguage)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {hasInputMapping ? (
                          <Badge className="bg-green-500 whitespace-nowrap">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {t.configured}
                          </Badge>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const suggestedId = suggestAccountForVAT(vatType, 'input');
                              if (suggestedId) {
                                handleAccountChange(vatType.id, suggestedId, 'input');
                              }
                            }}
                          >
                            {t.suggestAccount}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No hay tipos de IVA configurados en el sistema.
          </div>
        )}

        {hasUnsavedChanges && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Tienes cambios sin guardar. Haz clic en "Guardar Cambios" para aplicarlos.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
} 