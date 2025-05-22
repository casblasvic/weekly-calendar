"use client";

import React from 'react';
import { DebtList } from '@/components/debts/debt-list';
import { useClinic } from '@/contexts/clinic-context';

export default function PagosAplazadosPage() {
  const { activeClinic } = useClinic();
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Pagos aplazados</h1>
      <DebtList clinicId={activeClinic?.id} />
    </div>
  );
} 