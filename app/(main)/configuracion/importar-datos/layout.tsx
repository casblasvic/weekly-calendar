"use client";

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ImportarDatosLayoutProps {
  children: React.ReactNode;
}

const validTabs = ["contabilidad", "servicios", "productos", "familias", "impuestos", "clientes", "empleados"];
const defaultTab = "contabilidad";

// Contenido para las pestañas placeholder
const placeholderContent: Record<string, { title: string; description: string }> = {
  servicios: {
    title: "Importar Servicios",
    description: "Aquí podrás importar tu lista de servicios al sistema desde un archivo CSV. Asegúrate de que el archivo incluya columnas como código de servicio, nombre, descripción, precio, tipo de impuesto aplicable, etc."
  },
  productos: {
    title: "Importar Productos",
    description: "Utiliza esta sección para importar tu catálogo de productos desde un archivo CSV. El archivo debería contener información como SKU, nombre del producto, descripción, familia, precio de coste, precio de venta, stock inicial, proveedor, etc."
  },
  familias: {
    title: "Importar Familias de Productos/Servicios",
    description: "Importa las familias o categorías para organizar tus productos y servicios. Un archivo CSV simple con el nombre de la familia y, opcionalmente, una familia padre para jerarquías, sería suficiente."
  },
  impuestos: {
    title: "Importar Tipos de Impuesto",
    description: "Configura e importa los diferentes tipos de impuestos que aplican a tus productos y servicios (ej. IVA 21%, IVA 10%, IGIC, etc.). El CSV debería incluir nombre del impuesto, porcentaje y si es un impuesto por defecto."
  },
  clientes: {
    title: "Importar Clientes",
    description: "Importa tu base de datos de clientes. El archivo CSV puede incluir campos como NIF/CIF, nombre fiscal, nombre comercial, dirección, persona de contacto, email, teléfono, condiciones de pago, etc."
  },
  empleados: {
    title: "Importar Empleados",
    description: "Importa la información de tus empleados. Considera campos como nombre, apellidos, DNI, puesto, departamento, fecha de alta, etc. (Ten en cuenta la sensibilidad de estos datos y las normativas de protección de datos)."
  }
};

export default function ImportarDatosLayout({ children }: ImportarDatosLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isClient, setIsClient] = React.useState(false);

  // Determinar la pestaña activa basada en la ruta
  // Ejemplo: /configuracion/importar-datos/contabilidad -> activa 'contabilidad'
  let activeTab = pathname.split('/').pop() || 'contabilidad';
  
  // Efecto para manejar la redirección solo en el cliente
  React.useEffect(() => {
    setIsClient(true);
    
    // Si estamos en la ruta base, redirigir a contabilidad
    if (pathname === '/configuracion/importar-datos') {
      router.replace('/configuracion/importar-datos/contabilidad');
      return;
    }
    
    // Si la pestaña activa no es válida, redirigir a contabilidad
    if (!validTabs.includes(activeTab)) {
      router.replace('/configuracion/importar-datos/contabilidad');
    }
  }, [pathname, activeTab, router]);
  
  // Si no estamos en el cliente o estamos redirigiendo, mostrar solo el contenedor vacío
  if (!isClient || pathname === '/configuracion/importar-datos') {
    return <div className="container mx-auto py-10"></div>;
  }

  const handleTabChange = (value: string) => {
    // Solo redirige si la página para esa pestaña existe o está planificada
    if (value === 'contabilidad') {
      router.push('/configuracion/importar-datos/contabilidad');
    } else {
      // Para futuras pestañas, podrías redirigir o mostrar un mensaje
      // router.push(`/configuracion/importar-datos/${value}`);
      alert(`La sección de importación para '${value}' aún no está implementada.`);
    }
  };

  // Pestañas que queremos mostrar
  const tabsConfig = [
    { value: 'contabilidad', label: 'Contabilidad' },
    { value: 'servicios', label: 'Servicios' },
    { value: 'productos', label: 'Productos' },
    { value: 'familias', label: 'Familias' },
    { value: 'impuestos', label: 'Impuestos' },
    { value: 'clientes', label: 'Clientes' },
    { value: 'empleados', label: 'Empleados' },
  ];

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Importar Datos</h1>
      
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-6">
          {tabsConfig.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} disabled={tab.value !== 'contabilidad'}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {/* El contenido de la página de la pestaña activa se renderiza aquí */}
        {children}
      </Tabs>
    </div>
  );
}
