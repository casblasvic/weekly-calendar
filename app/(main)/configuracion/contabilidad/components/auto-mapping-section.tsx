'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Wand2, 
  Package, 
  Briefcase, 
  Tag, 
  CreditCard, 
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Loader2,
  ChevronRight,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface AutoMappingSectionProps {
  legalEntityId: string;
  unmappedCounts: {
    categories: number;
    products: number;
    services: number;
    paymentMethods: number;
    promotions: number;
  };
  onRefresh?: () => void;
}

export function AutoMappingSection({ 
  legalEntityId, 
  unmappedCounts,
  onRefresh 
}: AutoMappingSectionProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [processing, setProcessing] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [mappingResults, setMappingResults] = useState<any>(null);
  const [showResultsDialog, setShowResultsDialog] = useState(false);

  const totalUnmapped = Object.values(unmappedCounts).reduce((a, b) => a + b, 0);

  const handleAutoMapAll = async () => {
    setProcessing('all');
    setProgress(0);
    
    try {
      const response = await fetch('/api/accounting/auto-map-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          legalEntityId,
          types: ['all']
        }),
      });

      if (!response.ok) {
        throw new Error('Error al aplicar mapeo automático');
      }

      const data = await response.json();
      
      setProgress(100);
      toast.success(data.message || 'Mapeo automático completado');
      
      // Guardar resultados para mostrar
      if (data.createdSubaccounts && data.createdSubaccounts.length > 0) {
        setMappingResults(data);
        setShowResultsDialog(true);
      }
      
      onRefresh?.();
    } catch (error) {
      toast.error('Error al aplicar mapeo automático');
    } finally {
      setProcessing(null);
      setProgress(0);
    }
  };

  const handleAutoMapType = async (type: string) => {
    setProcessing(type);
    
    try {
      let endpoint = '';
      let body = {};
      
      switch (type) {
        case 'categories':
          endpoint = '/api/accounting/auto-map-all';
          body = { legalEntityId, types: ['categories'] };
          break;
        case 'products':
          endpoint = '/api/accounting/auto-map-all';
          body = { legalEntityId, types: ['products'] };
          break;
        case 'services':
          endpoint = '/api/accounting/auto-map-all';
          body = { legalEntityId, types: ['services'] };
          break;
        case 'paymentMethods':
          endpoint = '/api/accounting/auto-map-all';
          body = { legalEntityId, types: ['paymentMethods'] };
          break;
        default:
          throw new Error('Tipo no válido');
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Error al mapear ${type}`);
      }

      const data = await response.json();
      
      toast.success(data.message || `Mapeo automático completado para ${type}`);
      
      // Guardar resultados para mostrar
      if (data.createdSubaccounts && data.createdSubaccounts.length > 0) {
        setMappingResults(data);
        setShowResultsDialog(true);
      }
      
      onRefresh?.();
    } catch (error) {
      toast.error(`Error al mapear ${type}`);
    } finally {
      setProcessing(null);
    }
  };

  const mappingItems = [
    {
      id: 'categories',
      label: 'Categorías',
      icon: Tag,
      count: unmappedCounts.categories,
      description: 'Familias de productos y servicios',
      color: 'text-blue-600 bg-blue-50'
    },
    {
      id: 'products',
      label: 'Productos',
      icon: Package,
      count: unmappedCounts.products,
      description: 'Artículos para venta o consumo',
      color: 'text-green-600 bg-green-50'
    },
    {
      id: 'services',
      label: 'Servicios',
      icon: Briefcase,
      count: unmappedCounts.services,
      description: 'Tratamientos y servicios',
      color: 'text-purple-600 bg-purple-50'
    },
    {
      id: 'paymentMethods',
      label: 'Métodos de Pago',
      icon: CreditCard,
      count: unmappedCounts.paymentMethods,
      description: 'Formas de cobro disponibles',
      color: 'text-orange-600 bg-orange-50'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              Mapeo Contable Inteligente
            </CardTitle>
            <CardDescription>
              Asigna automáticamente cuentas contables basándose en las características de cada elemento
            </CardDescription>
          </div>
          {totalUnmapped > 0 && (
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {totalUnmapped} elementos sin mapear
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Vista General</TabsTrigger>
            <TabsTrigger value="details">Por Tipo</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <h4 className="font-medium">Aplicar Mapeo Automático</h4>
                  <p className="text-sm text-muted-foreground">
                    {totalUnmapped === 0 
                      ? "Revisa y actualiza los mapeos contables existentes"
                      : `Mapea automáticamente ${totalUnmapped} elementos sin configurar`
                    }
                  </p>
                </div>
                <Button 
                  onClick={handleAutoMapAll}
                  disabled={processing === 'all'}
                >
                  {processing === 'all' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Ejecutar Mapeo
                    </>
                  )}
                </Button>
              </div>

              {totalUnmapped === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">¡Todo mapeado!</h3>
                  <p className="text-muted-foreground">
                    Todos los elementos tienen asignada una cuenta contable
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    {mappingItems.map(item => {
                      const Icon = item.icon;
                      return (
                        <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${item.color}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="font-medium">{item.label}</div>
                              <div className="text-sm text-muted-foreground">{item.description}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-semibold">{item.count}</div>
                            <div className="text-sm text-muted-foreground">sin mapear</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-semibold">Aplicar mapeo automático</h4>
                        <p className="text-sm text-muted-foreground">
                          El sistema asignará las cuentas más apropiadas según el tipo y características
                        </p>
                      </div>
                      <Button 
                        onClick={handleAutoMapAll}
                        disabled={processing !== null}
                        size="lg"
                      >
                        {processing === 'all' ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Procesando...
                          </>
                        ) : (
                          <>
                            <Wand2 className="mr-2 h-4 w-4" />
                            Mapear Todo Automáticamente
                          </>
                        )}
                      </Button>
                    </div>
                    
                    {processing === 'all' && (
                      <div className="space-y-2">
                        <Progress value={progress} className="h-2" />
                        <p className="text-sm text-center text-muted-foreground">
                          {progress < 30 && 'Analizando elementos...'}
                          {progress >= 30 && progress < 60 && 'Asignando cuentas contables...'}
                          {progress >= 60 && progress < 90 && 'Verificando mapeos...'}
                          {progress >= 90 && 'Finalizando...'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                    <div className="text-sm text-amber-800">
                      <p className="font-medium mb-1">Recomendación</p>
                      <p>
                        El mapeo automático asigna cuentas basándose en patrones comunes. 
                        Siempre puedes ajustar manualmente los mapeos después si lo necesitas.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            {mappingItems.map(item => {
              const Icon = item.icon;
              const hasUnmapped = item.count > 0;
              
              return (
                <Card key={item.id} className={!hasUnmapped ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${item.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{item.label}</h4>
                          <p className="text-sm text-muted-foreground">
                            {hasUnmapped ? `${item.count} elementos sin mapear` : 'Todos mapeados'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {hasUnmapped ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAutoMapType(item.id)}
                              disabled={processing !== null}
                            >
                              {processing === item.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Wand2 className="mr-2 h-3 w-3" />
                                  Mapear
                                </>
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                            >
                              <a href={`/configuracion/contabilidad/${item.id}`}>
                                Ver detalles
                                <ArrowRight className="ml-1 h-3 w-3" />
                              </a>
                            </Button>
                          </>
                        ) : (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
        
        {/* Diálogo para mostrar resultados del mapeo */}
        <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Mapeo Automático Completado
              </DialogTitle>
              <DialogDescription>
                Se han creado las siguientes subcuentas analíticas
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="h-[400px] mt-4">
              <div className="space-y-4">
                {mappingResults?.mappings && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">Categorías</p>
                      <p className="text-2xl font-semibold text-blue-600">
                        {mappingResults.mappings.categories}
                      </p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">Productos</p>
                      <p className="text-2xl font-semibold text-green-600">
                        {mappingResults.mappings.products}
                      </p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">Servicios</p>
                      <p className="text-2xl font-semibold text-purple-600">
                        {mappingResults.mappings.services}
                      </p>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">Métodos de Pago</p>
                      <p className="text-2xl font-semibold text-orange-600">
                        {mappingResults.mappings.paymentMethods}
                      </p>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">Tipos de IVA</p>
                      <p className="text-2xl font-semibold text-yellow-600">
                        {mappingResults.mappings.vatTypes}
                      </p>
                    </div>
                    <div className="bg-indigo-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">Subcuentas Creadas</p>
                      <p className="text-2xl font-semibold text-indigo-600">
                        {mappingResults.mappings.subaccountsCreated}
                      </p>
                    </div>
                  </div>
                )}
                
                <Separator />
                
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Subcuentas Analíticas Creadas
                  </h3>
                  {mappingResults?.createdSubaccounts?.map((sub: any, index: number) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {sub.type === 'category' ? 'Categoría' :
                           sub.type === 'product' ? 'Producto' :
                           sub.type === 'service' ? 'Servicio' :
                           sub.type === 'payment-method' ? 'Método de Pago' :
                           sub.type}
                        </Badge>
                        <span className="text-sm font-medium">{sub.subaccountCode}</span>
                        <ChevronRight className="h-3 w-3 text-gray-400" />
                        <span className="text-sm">{sub.subaccountName}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Cuenta padre: {sub.parentAccount}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
            
            <div className="flex justify-end mt-4">
              <Button onClick={() => setShowResultsDialog(false)}>
                Cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
