'use client';

import { BonoForm } from '@/components/bono/bono-form';
import { useParams } from 'next/navigation';

export default function EditarBonoPage() {
  const params = useParams();
  const servicioId = params.servicioId as string;
  const bonoId = params.bonoId as string;

  return (
    <div className="container mx-auto py-6">
      <BonoForm servicioId={servicioId} bonoId={bonoId} />
    </div>
  );
} 