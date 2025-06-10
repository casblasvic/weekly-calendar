'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, HelpCircle, Receipt } from 'lucide-react';
import { ExpensesList } from '@/components/accounting/expenses/expenses-list';
import { ExpenseDialog } from '@/components/accounting/expenses/expense-dialog';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

export default function GastosPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const router = useRouter();
  const { t } = useTranslation();

  const handleAddExpense = () => {
    setSelectedExpense(null);
    setIsDialogOpen(true);
  };

  const handleEditExpense = (expense: any) => {
    setSelectedExpense(expense);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedExpense(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Contenido principal con scroll */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold tracking-tight">Gastos</h2>
          <Button onClick={handleAddExpense}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Gasto
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Gastos</CardTitle>
          </CardHeader>
          <CardContent>
            <ExpensesList onEdit={handleEditExpense} />
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
              onClick={handleAddExpense}
              className="gap-2"
            >
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Nuevo Gasto</span>
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

      {/* Diálogo para crear/editar gastos */}
      <ExpenseDialog
        expense={selectedExpense}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onClose={handleCloseDialog}
      />
    </div>
  );
}
