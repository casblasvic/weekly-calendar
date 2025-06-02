/**
 * Mapeador de Métodos de Pago a Cuentas Contables
 * 
 * Permite configurar qué cuenta contable se usará para cada método de pago
 * durante la generación automática de asientos contables
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
  CreditCard,
  DollarSign,
  Building2,
  Smartphone,
  Save,
  CheckCircle,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { PaymentMethodType } from '@prisma/client';

interface PaymentMethodAccountMapperProps {
  systemId: string;
  legalEntityId: string;
}

interface PaymentMethodMapping {
  id: string;
  paymentMethodDefinitionId: string;
  paymentMethodDefinition: {
    id: string;
    name: string;
    code?: string;
    type: PaymentMethodType;
    isActive: boolean;
  };
  accountId: string;
  account?: {
    id: string;
    accountNumber: string;
    name: string;
  };
}

interface ChartAccount {
  id: string;
  accountNumber: string;
  name: string;
  type: string;
  isActive: boolean;
}

const PAYMENT_TYPE_ICONS: Record<PaymentMethodType, React.ReactNode> = {
  CASH: <DollarSign className="h-4 w-4" />,
  CARD: <CreditCard className="h-4 w-4" />,
  BANK_TRANSFER: <Building2 className="h-4 w-4" />,
  ONLINE_GATEWAY: <Smartphone className="h-4 w-4" />,
  CHECK: <DollarSign className="h-4 w-4" />,
  INTERNAL_CREDIT: <DollarSign className="h-4 w-4" />,
  DEFERRED_PAYMENT: <DollarSign className="h-4 w-4" />,
  OTHER: <DollarSign className="h-4 w-4" />
};

export default function PaymentMethodAccountMapper({
  systemId,
  legalEntityId
}: PaymentMethodAccountMapperProps) {
  const queryClient = useQueryClient();
  const [unsavedChanges, setUnsavedChanges] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Cargar métodos de pago disponibles
  const { data: paymentMethods, isLoading: isLoadingMethods } = useQuery({
    queryKey: ['payment-methods', systemId],
    queryFn: async () => {
      const response = await fetch(`/api/payment-methods?systemId=${systemId}`);
      if (!response.ok) throw new Error('Error cargando métodos de pago');
      return response.json();
    }
  });

  // Cargar mapeos existentes
  const { data: mappings, isLoading: isLoadingMappings } = useQuery({
    queryKey: ['payment-method-mappings', legalEntityId],
    queryFn: async () => {
      const response = await fetch(
        `/api/accounting/payment-method-mappings?legalEntityId=${legalEntityId}`
      );
      if (!response.ok) throw new Error('Error cargando mapeos');
      return response.json() as Promise<PaymentMethodMapping[]>;
    }
  });

  // Cargar cuentas contables disponibles
  const { data: accounts, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['chart-accounts-asset', legalEntityId],
    queryFn: async () => {
      const response = await fetch(
        `/api/chart-of-accounts?legalEntityId=${legalEntityId}&type=ASSET&isActive=true`
      );
      if (!response.ok) throw new Error('Error cargando cuentas');
      const data = await response.json();
      return data.filter((acc: ChartAccount) => 
        acc.name.toLowerCase().includes('caja') ||
        acc.name.toLowerCase().includes('banco') ||
        acc.name.toLowerCase().includes('tarjeta') ||
        acc.name.toLowerCase().includes('efectivo')
      );
    }
  });

  // Guardar mapeos
  const saveMutation = useMutation({
    mutationFn: async (mappingData: Array<{
      paymentMethodDefinitionId: string;
      accountId: string;
    }>) => {
      const response = await fetch('/api/accounting/payment-method-mappings', {
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
      toast.success('Mapeos guardados correctamente');
      setUnsavedChanges({});
      queryClient.invalidateQueries({ queryKey: ['payment-method-mappings'] });
    },
    onError: () => {
      toast.error('Error al guardar los mapeos');
    }
  });

  const handleAccountChange = (paymentMethodId: string, accountId: string) => {
    setUnsavedChanges(prev => ({
      ...prev,
      [paymentMethodId]: accountId
    }));
  };

  const handleSave = () => {
    const mappingData = Object.entries(unsavedChanges).map(([methodId, accountId]) => ({
      paymentMethodDefinitionId: methodId,
      accountId
    }));

    saveMutation.mutate(mappingData);
  };

  const getAccountForMethod = (methodId: string): string => {
    if (unsavedChanges[methodId]) {
      return unsavedChanges[methodId];
    }
    const mapping = mappings?.find(m => m.paymentMethodDefinitionId === methodId);
    return mapping?.accountId || '';
  };

  const suggestAccountForType = (type: PaymentMethodType): string => {
    if (!accounts) return '';
    
    let searchTerm = '';
    switch (type) {
      case 'CASH':
        searchTerm = 'caja';
        break;
      case 'CARD':
        searchTerm = 'tarjeta';
        break;
      case 'BANK_TRANSFER':
        searchTerm = 'banco';
        break;
      default:
        searchTerm = 'caja';
    }

    const suggested = accounts.find(acc => 
      acc.name.toLowerCase().includes(searchTerm)
    );
    return suggested?.id || '';
  };

  const isLoading = isLoadingMethods || isLoadingMappings || isLoadingAccounts;
  const hasUnsavedChanges = Object.keys(unsavedChanges).length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Mapeo de Métodos de Pago
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
          Configura qué cuenta contable se usará para cada método de pago
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!accounts || accounts.length === 0 ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No hay cuentas de tipo ACTIVO configuradas. Primero debes importar 
              o crear un plan contable con cuentas de caja, banco y tarjeta.
            </AlertDescription>
          </Alert>
        ) : isLoading ? (
          <div className="text-center py-8">Cargando configuración...</div>
        ) : paymentMethods && paymentMethods.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Método de Pago</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cuenta Contable</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentMethods.map((method: any) => {
                const currentAccountId = getAccountForMethod(method.id);
                const hasMapping = !!currentAccountId;
                const isModified = !!unsavedChanges[method.id];

                return (
                  <TableRow key={method.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {PAYMENT_TYPE_ICONS[method.type]}
                        {method.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {method.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={currentAccountId}
                        onValueChange={(value) => handleAccountChange(method.id, value)}
                      >
                        <SelectTrigger className={isModified ? 'border-yellow-500' : ''}>
                          <SelectValue placeholder="Seleccionar cuenta..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Sin asignar</SelectItem>
                          {accounts.map((account: ChartAccount) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.accountNumber} - {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!currentAccountId && method.isActive && (
                        <Button
                          variant="link"
                          size="sm"
                          className="mt-1 h-auto p-0"
                          onClick={() => {
                            const suggestedId = suggestAccountForType(method.type);
                            if (suggestedId) {
                              handleAccountChange(method.id, suggestedId);
                            }
                          }}
                        >
                          Sugerir cuenta
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      {hasMapping ? (
                        <Badge className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Configurado
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          Pendiente
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No hay métodos de pago configurados en el sistema.
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