/**
 * ✅ PÁGINA BASE DE AGENDA - MANEJO INTELIGENTE DE CARGA DIRECTA
 * 
 * PROPÓSITO:
 * - Detectar si el usuario entra directamente a /agenda sin fecha específica
 * - Verificar que hay clínica activa antes de redirigir
 * - Mostrar loading state mientras se carga la clínica
 * - Redirigir a vista semanal actual una vez que todo esté listo
 * 
 * INTEGRACIÓN CON PRISMA:
 * - SIEMPRE usar: import { prisma } from '@/lib/db';
 * 
 * FLUJO DE CARGA:
 * 1. Usuario accede a /agenda directamente
 * 2. Verificar si hay clínica activa en contexto
 * 3. Si no hay clínica → mostrar spinner hasta que se cargue
 * 4. Una vez cargada → redirigir a /agenda/semana/{today}
 * 5. Si hay error → redirigir a dashboard
 */

"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { useClinic } from '@/contexts/clinic-context';

export default function AgendaBasePage() {
  const router = useRouter();
  const { activeClinic, isLoading: isLoadingClinic } = useClinic();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // ✅ ESPERAR A QUE SE CARGUE LA CLÍNICA ACTIVA
    if (isLoadingClinic) {
      console.log('[AgendaBasePage] ⏳ Esperando carga de clínica activa...');
      return;
    }

    // ✅ VERIFICAR QUE HAY CLÍNICA ACTIVA
    if (!activeClinic) {
      console.log('[AgendaBasePage] ⚠️ No hay clínica activa - redirigiendo a dashboard');
      router.replace('/dashboard');
      return;
    }

    // ✅ REDIRIGIR A VISTA SEMANAL ACTUAL
    console.log('[AgendaBasePage] ✅ Clínica activa detectada - redirigiendo a agenda semanal');
    setIsRedirecting(true);
    
    const today = new Date();
    const formattedDate = format(today, 'yyyy-MM-dd');
    const targetUrl = `/agenda/semana/${formattedDate}`;
    
    router.replace(targetUrl);
  }, [activeClinic, isLoadingClinic, router]);

  // ✅ MOSTRAR LOADING STATE MIENTRAS SE RESUELVE LA REDIRECCIÓN
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center">
        <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-600"/>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          {isLoadingClinic ? 'Cargando clínica...' : 
           isRedirecting ? 'Cargando agenda...' : 
           'Preparando agenda...'}
        </h2>
        <p className="text-sm text-gray-600">
          {isLoadingClinic ? 'Verificando configuración de la clínica' :
           isRedirecting ? 'Redirigiendo a la vista semanal' :
           'Un momento por favor...'}
        </p>
      </div>
    </div>
  );
}

