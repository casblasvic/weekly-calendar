import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getServicioById, updateServicio } from '@/contexts/servicios-context';
import { calcularPrecioSinIVA } from '@/utils/utils';

const EditarServicio: React.FC = () => {
  const router = useRouter();
  const servicioId = 'some-id'; // Replace with actual servicioId
  const tarifaId = 'some-tarifa-id'; // Replace with actual tarifaId
  const tiposIVA = []; // Replace with actual tiposIVA

  const [servicio, setServicio] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const servicioExistente = getServicioById(servicioId);
    if (servicioExistente) {
      setServicio(servicioExistente);
      
      console.log("Servicio cargado:", servicioExistente);
      console.log("IVA del servicio:", tiposIVA?.find(t => t.id === servicioExistente.ivaId));
    }
  }, [servicioId, getServicioById, tiposIVA]);

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
      precioSinIVA: calcularPrecioSinIVA(servicio.precioConIVA, servicio.ivaId),
    };

    console.log("Actualizando servicio:", servicioActualizado);

    updateServicio(servicioId, servicioActualizado);

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