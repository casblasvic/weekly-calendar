'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Rocket, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { 
  quickSetupAccounting, 
  checkExistingAccountingSetup 
} from './plan-contable/quick-setup-actions';

interface QuickSetupProps {
  legalEntityId: string;
  onSetupComplete?: () => void;
}

const SUPPORTED_COUNTRIES = [
  { code: 'ES', name: 'España', flag: '🇪🇸' },
  { code: 'FR', name: 'Francia', flag: '🇫🇷' },
  { code: 'MA', name: 'Marruecos', flag: '🇲🇦' },
  { code: 'MX', name: 'México', flag: '🇲🇽' },
];

export function QuickSetup({ legalEntityId, onSetupComplete }: QuickSetupProps) {
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [setupStatus, setSetupStatus] = useState<{
    hasAccounts: boolean;
    hasSeries: boolean;
    accountsCount: number;
    seriesCount: number;
  } | null>(null);

  // Verificar si ya existe configuración
  const checkExistingSetup = async () => {
    try {
      const status = await checkExistingAccountingSetup(legalEntityId);
      setSetupStatus(status);
    } catch (error) {
      console.error('Error verificando configuración:', error);
    }
  };

  useEffect(() => {
    checkExistingSetup();
  }, [legalEntityId]);

  const handleQuickSetup = async () => {
    if (!selectedCountry) {
      toast({
        title: 'País requerido',
        description: 'Por favor selecciona un país para continuar',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await quickSetupAccounting(legalEntityId, selectedCountry);
      
      toast({
        title: 'Configuración completada',
        description: (
          <div className="space-y-1">
            <p>✓ {result.accountsCreated} cuentas creadas</p>
            <p>✓ {result.paymentMethodsCreated} métodos de pago configurados</p>
            {result.fiscalYearCreated && (
              <p>✓ Ejercicio fiscal {result.fiscalYearCreated} creado</p>
            )}
            <p>✓ {result.seriesCreated} series contables generadas</p>
            {result.clinicsProcessed > 0 && (
              <p>✓ {result.clinicsProcessed} clínicas procesadas</p>
            )}
            {result.mappingsCreated && (
              <>
                <p className="font-semibold mt-2">Mapeos automáticos:</p>
                {result.mappingsCreated.categories > 0 && <p className="ml-2">• {result.mappingsCreated.categories} categorías</p>}
                {result.mappingsCreated.services > 0 && <p className="ml-2">• {result.mappingsCreated.services} servicios</p>}
                {result.mappingsCreated.products > 0 && <p className="ml-2">• {result.mappingsCreated.products} productos</p>}
                {result.mappingsCreated.paymentMethods > 0 && <p className="ml-2">• {result.mappingsCreated.paymentMethods} métodos de pago</p>}
                {result.mappingsCreated.vat > 0 && <p className="ml-2">• {result.mappingsCreated.vat} tipos de IVA</p>}
                {result.mappingsCreated.banks > 0 && <p className="ml-2">• {result.mappingsCreated.banks} cuentas bancarias</p>}
                {result.mappingsCreated.cashes > 0 && <p className="ml-2">• {result.mappingsCreated.cashes} cajas</p>}
                {result.mappingsCreated.expenses > 0 && <p className="ml-2">• {result.mappingsCreated.expenses} categorías de gastos</p>}
                {result.mappingsCreated.promotions > 0 && <p className="ml-2">• {result.mappingsCreated.promotions} promociones</p>}
              </>
            )}
          </div>
        ),
      });

      // Actualizar estado
      await checkExistingSetup();
      
      // Callback opcional
      onSetupComplete?.();
    } catch (error) {
      toast({
        title: 'Error en la configuración',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Si ya hay configuración, mostrar resumen
  if (setupStatus?.hasAccounts || setupStatus?.hasSeries) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Sistema Contable Configurado
          </CardTitle>
          <CardDescription>
            Ya existe una configuración contable activa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• {setupStatus.accountsCount} cuentas contables configuradas</p>
            <p>• {setupStatus.seriesCount} series de documentos activas</p>
          </div>
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Para modificar la configuración existente, utiliza las opciones de edición
              manual en las pestañas correspondientes.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="h-5 w-5" />
          Configuración Rápida
        </CardTitle>
        <CardDescription>
          Configura automáticamente el plan contable básico, métodos de pago y series de documentos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Selecciona el país de operación
          </label>
          <Select value={selectedCountry} onValueChange={setSelectedCountry}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un país" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_COUNTRIES.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  <span className="flex items-center gap-2">
                    <span>{country.flag}</span>
                    <span>{country.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Esta acción creará:
            <ul className="mt-2 ml-4 list-disc text-sm">
              <li>Plan de cuentas básico (20-30 cuentas esenciales)</li>
              <li>Todos los métodos de pago disponibles</li>
              <li>Series de documentos para cada clínica</li>
              <li>Mapeos contables predeterminados</li>
            </ul>
          </AlertDescription>
        </Alert>

        <Button
          onClick={handleQuickSetup}
          disabled={!selectedCountry || isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Configurando sistema...
            </>
          ) : (
            <>
              <Rocket className="mr-2 h-4 w-4" />
              Iniciar Configuración Rápida
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
