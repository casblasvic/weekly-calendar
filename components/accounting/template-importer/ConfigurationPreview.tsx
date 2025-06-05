import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  FileText, 
  CreditCard, 
  Layers,
  MapPin,
  CheckCircle2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ConfigurationPreviewProps {
  configuration: {
    baseType: string;
    features: {
      hasHairSalon: boolean;
      hasSpa: boolean;
      hasMedicalTreatments: boolean;
      sellsProducts: boolean;
      hasMultipleLocations: boolean;
    };
    locations: string[];
  };
  serviceCategories: any[];
  productFamilies: any[];
  documentSeries: any[];
  paymentMethods: any[];
}

export function ConfigurationPreview({
  configuration,
  serviceCategories,
  productFamilies,
  documentSeries,
  paymentMethods
}: ConfigurationPreviewProps) {
  const { t } = useTranslation();
  
  // Contar elementos generados
  const totalItems = {
    categories: serviceCategories.length,
    products: productFamilies.length,
    series: documentSeries.length,
    payments: paymentMethods.length
  };

  return (
    <div className="space-y-6">
      {/* Resumen de configuración */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            {t('accounting.import.preview.configurationSummary', 'Resumen de Configuración')}
          </CardTitle>
          <CardDescription>
            {t('accounting.import.preview.configurationDescription', 'Esta es la configuración que se generará para tu negocio')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Layers className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <div className="text-2xl font-bold">{totalItems.categories}</div>
              <div className="text-sm text-muted-foreground">
                {t('accounting.import.preview.serviceCategories', 'Categorías')}
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Package className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <div className="text-2xl font-bold">{totalItems.products}</div>
              <div className="text-sm text-muted-foreground">
                {t('accounting.import.preview.productFamilies', 'Familias')}
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <FileText className="h-8 w-8 mx-auto mb-2 text-orange-500" />
              <div className="text-2xl font-bold">{totalItems.series}</div>
              <div className="text-sm text-muted-foreground">
                {t('accounting.import.preview.documentSeries', 'Series')}
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <CreditCard className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <div className="text-2xl font-bold">{totalItems.payments}</div>
              <div className="text-sm text-muted-foreground">
                {t('accounting.import.preview.paymentMethods', 'Métodos')}
              </div>
            </div>
          </div>
          
          {/* Características seleccionadas */}
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-3">
              {t('accounting.import.businessFeatures.title')}:
            </h4>
            <div className="flex flex-wrap gap-2">
              {configuration.features.hasHairSalon && (
                <Badge variant="secondary">
                  {t('accounting.import.businessFeatures.hasHairSalon')}
                </Badge>
              )}
              {configuration.features.hasSpa && (
                <Badge variant="secondary">
                  {t('accounting.import.businessFeatures.hasSpa')}
                </Badge>
              )}
              {configuration.features.hasMedicalTreatments && (
                <Badge variant="secondary">
                  {t('accounting.import.businessFeatures.hasMedicalTreatments')}
                </Badge>
              )}
              {configuration.features.sellsProducts && (
                <Badge variant="secondary">
                  {t('accounting.import.businessFeatures.sellsProducts')}
                </Badge>
              )}
              {configuration.features.hasMultipleLocations && (
                <Badge variant="secondary">
                  <MapPin className="h-3 w-3 mr-1" />
                  {configuration.locations.length} {t('accounting.import.businessFeatures.locations.label')}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detalles en pestañas */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t('accounting.import.preview.detailedConfiguration', 'Configuración Detallada')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="categories" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="categories">
                <Layers className="h-4 w-4 mr-2" />
                {t('accounting.import.preview.categories', 'Categorías')}
              </TabsTrigger>
              <TabsTrigger value="products">
                <Package className="h-4 w-4 mr-2" />
                {t('accounting.import.preview.products', 'Productos')}
              </TabsTrigger>
              <TabsTrigger value="series">
                <FileText className="h-4 w-4 mr-2" />
                {t('accounting.import.preview.series', 'Series')}
              </TabsTrigger>
              <TabsTrigger value="payments">
                <CreditCard className="h-4 w-4 mr-2" />
                {t('accounting.import.preview.payments', 'Pagos')}
              </TabsTrigger>
            </TabsList>
            
            {/* Categorías de servicios */}
            <TabsContent value="categories" className="mt-4">
              <div className="grid gap-2">
                {serviceCategories.map((category, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <span className="font-medium">{category.name}</span>
                      <Badge variant="outline" className="ml-2">{category.code}</Badge>
                    </div>
                    {category.parentCode && (
                      <span className="text-sm text-muted-foreground">
                        {t('accounting.import.preview.parentCategory', 'Subcategoría')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>
            
            {/* Familias de productos */}
            <TabsContent value="products" className="mt-4">
              <div className="grid gap-2">
                {productFamilies.map((family, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <span className="font-medium">{family.name}</span>
                      <Badge variant="outline" className="ml-2">{family.code}</Badge>
                    </div>
                    <Badge variant={family.forSale ? 'default' : 'secondary'}>
                      {family.forSale ? t('accounting.import.preview.forSale', 'Venta') : t('accounting.import.preview.consumable', 'Consumible')}
                    </Badge>
                  </div>
                ))}
              </div>
            </TabsContent>
            
            {/* Series de documentos */}
            <TabsContent value="series" className="mt-4">
              <div className="grid gap-2">
                {documentSeries.map((series, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <span className="font-medium">{series.description?.es || series.code}</span>
                      <code className="ml-2 text-sm bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                        {series.prefix}00001
                      </code>
                    </div>
                    <Badge variant={series.documentType === 'INVOICE' ? 'default' : 'outline'}>
                      {series.documentType}
                    </Badge>
                  </div>
                ))}
              </div>
            </TabsContent>
            
            {/* Métodos de pago */}
            <TabsContent value="payments" className="mt-4">
              <div className="grid gap-2">
                {paymentMethods.map((method, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <span className="font-medium">{method.name.es}</span>
                      <Badge variant="outline" className="ml-2">{method.code}</Badge>
                    </div>
                    <div className="flex gap-2">
                      {method.requiresTerminal && (
                        <Badge variant="secondary" className="text-xs">
                          {t('accounting.import.preview.requiresTerminal', 'Terminal')}
                        </Badge>
                      )}
                      {method.requiresBankAccount && (
                        <Badge variant="secondary" className="text-xs">
                          {t('accounting.import.preview.requiresBankAccount', 'Cuenta bancaria')}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
