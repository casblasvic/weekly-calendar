"use client";

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ContabilidadLayoutProps {
  children: React.ReactNode;
}

export default function ContabilidadLayout({ children }: ContabilidadLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Determinar la pestaña activa basada en la ruta
  // La ruta base '/configuracion/contabilidad' es para 'plan-contable'
  // La ruta '/configuracion/contabilidad/importar' es para 'importar'
  let activeTab = 'plan-contable';
  if (pathname === '/configuracion/contabilidad/importar') {
    activeTab = 'importar';
  } else if (pathname.startsWith('/configuracion/contabilidad/ejercicios')) { // Ejemplo para futura pestaña
    activeTab = 'ejercicios';
  }

  const handleTabChange = (value: string) => {
    if (value === 'plan-contable') {
      router.push('/configuracion/contabilidad');
    } else if (value === 'importar') {
      router.push('/configuracion/contabilidad/importar');
    } else if (value === 'ejercicios') {
      // router.push('/configuracion/contabilidad/ejercicios'); // Para futura pestaña
    }
  };

  return (
    <div className="container mx-auto py-10">
      {/* Puedes mantener un título general si lo deseas aquí, o moverlo a las páginas individuales */}
      {/* <h1 className="text-3xl font-bold mb-6">Configuración Contable</h1> */}
      
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[300px] mb-6">
          <TabsTrigger value="plan-contable">Plan Contable</TabsTrigger>
          <TabsTrigger value="importar">Importaciones</TabsTrigger>
          {/* <TabsTrigger value="ejercicios">Ejercicios</TabsTrigger> */}
        </TabsList>
        {/* El contenido de la pestaña activa (page.tsx o importar/page.tsx) se renderiza aquí */}
        {children}
      </Tabs>
    </div>
  );
}
