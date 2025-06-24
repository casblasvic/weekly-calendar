"use client";

import React from 'react';
import { DebtList } from '@/components/debts/debt-list';
import { useClinic } from '@/contexts/clinic-context';
import { Loader2 } from 'lucide-react';

export default function PagosAplazadosPage() {
  const { activeClinic, isInitialized } = useClinic();

  // ✅ ESPERAR A QUE LA INICIALIZACIÓN ESTÉ COMPLETA
  if (!isInitialized) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          <span className="ml-2">Inicializando clínicas...</span>
        </div>
      </div>
    );
  }

  // ✅ VERIFICAR CLÍNICA ACTIVA DESPUÉS DE LA INICIALIZACIÓN
  if (!activeClinic) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            Sin clínica seleccionada
          </h3>
          <p className="text-gray-500">
            Selecciona una clínica para ver los pagos aplazados.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Pagos aplazados</h1>
      <DebtList clinicId={activeClinic.id} />
    </div>
  );
} 