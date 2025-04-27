'use client';

import { BonoList } from '@/components/bono/bono-list';
import { useParams } from 'next/navigation';

export default function BonosPage() {
  const params = useParams();
  const servicioId = params.servicioId as string;

  return (
    <div className="container mx-auto py-6">
      <BonoList servicioId={servicioId} />
    </div>
  );
} 