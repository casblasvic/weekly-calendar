"use client"

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useServicio, Servicio } from '@/contexts/servicios-context';
import { calcularPrecioSinIVA } from '@/utils/utils';
import { Button } from '@/components/ui/button';

const EditarServicio = ({ params }) => {
  const router = useRouter();
  const servicioId = params?.id || 'some-id'; // Obtener de params
  const tarifaId = params?.id || 'some-tarifa-id'; // Obtener de params
  const tiposIVA = []; // Reemplazar con los tipos de IVA reales
  const { getServicioById, actualizarServicio } = useServicio();

  const [servicio, setServicio] = useState<Partial<Servicio>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const servicioExistente = getServicioById(servicioId);
    if (servicioExistente) {
      setServicio(servicioExistente);
      
      console.log("Servicio cargado:", servicioExistente);
      console.log("IVA del servicio:", tiposIVA?.find(t => t.id === servicioExistente.ivaId));
    }
  }, [servicioId, tiposIVA, getServicioById]);

  const handleGuardarServicio = () => {
    if (!servicio.nombre) {
      alert("Por favor ingresa un nombre para el servicio");
      return;
    }

    if (!servicio.ivaId || servicio.ivaId === "") {
      alert("Por favor selecciona un tipo de IVA");
      return;
    }

    setIsSaving(true);

    const servicioActualizado = {
      ...servicio,
      ivaId: servicio.ivaId,
      precioSinIVA: calcularPrecioSinIVA(parseFloat(servicio.precioConIVA || "0"), servicio.ivaId),
    };

    console.log("Actualizando servicio:", servicioActualizado);

    actualizarServicio(servicioId, servicioActualizado);

    setTimeout(() => {
      setIsSaving(false);
      router.push(`/configuracion/tarifas/${tarifaId}`);
    }, 500);
  };

  return (
    <div className="container mx-auto py-6">
      {/* ... resto del formulario ... */}
      
      <div className="flex justify-end mt-6 space-x-2">
        <Button 
          variant="outline" 
          onClick={() => router.back()}
        >
          Cancelar
        </Button>
        <Button 
          type="button" 
          onClick={handleGuardarServicio}
          disabled={isSaving}
        >
          {isSaving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </div>
  );
};

export default EditarServicio; 