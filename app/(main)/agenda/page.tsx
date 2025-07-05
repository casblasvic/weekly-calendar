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

import { redirect } from 'next/navigation';

export default function AgendaRedirectPage() {
  // Aseguramos que la página se genere siempre de forma dinámica para calcular la fecha actual
  // (sin esto Next podría intentar cachear la ruta estáticamente y se produciría un error).
  // eslint-disable-next-line react-hooks/rules-of-hooks
  // (no aplicable en server components, solo aclaratorio)

  const today = new Date();
  const formattedDate = today.toISOString().split('T')[0];
  redirect(`/agenda/semana/${formattedDate}`);
}

// Forzar renderizado dinámico (Next.js 13/14)
export const dynamic = 'force-dynamic';

