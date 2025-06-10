'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, HelpCircle, Building2 } from 'lucide-react';
import { SuppliersList } from '@/components/suppliers/suppliers-list';
import { SupplierDialog } from '@/components/suppliers/supplier-dialog';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

export default function SuppliersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const router = useRouter();
  const { t } = useTranslation();

  const handleAddSupplier = () => {
    setSelectedSupplier(null);
    setIsDialogOpen(true);
  };

  const handleEditSupplier = (supplier: any) => {
    setSelectedSupplier(supplier);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedSupplier(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Contenido principal con scroll */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold tracking-tight">Proveedores</h2>
          <Button onClick={handleAddSupplier}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Proveedor
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Proveedores</CardTitle>
          </CardHeader>
          <CardContent>
            <SuppliersList onEdit={handleEditSupplier} />
          </CardContent>
        </Card>
      </div>

      {/* Footer fijo con botones */}
      <div className="shrink-0 border-t bg-background">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Volver</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleAddSupplier}
              className="gap-2"
            >
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Nuevo Proveedor</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => {/* TODO: Implementar ayuda */}}
              className="gap-2"
            >
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Ayuda</span>
            </Button>
          </div>
        </div>
      </div>

      <SupplierDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        supplier={selectedSupplier}
        onClose={handleCloseDialog}
      />
    </div>
  );
}
