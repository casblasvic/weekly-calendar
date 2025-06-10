import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const systemId = session.user.systemId;

    // Verificar si existen tipos de gastos
    const expenseTypes = await prisma.expenseType.findMany({
      where: {
        systemId
      }
    });

    // Si no existen, crear algunos tipos básicos
    if (expenseTypes.length === 0) {
      console.log('[CheckExpenseTypes] No se encontraron tipos de gastos, creando tipos básicos...');
      
      const basicExpenseTypes = [
        { code: 'SUPPLIES', name: 'Material y suministros', description: 'Gastos en material de oficina, productos de limpieza, etc.' },
        { code: 'UTILITIES', name: 'Servicios básicos', description: 'Electricidad, agua, gas, internet' },
        { code: 'RENT', name: 'Alquiler', description: 'Alquiler de local o instalaciones' },
        { code: 'SALARIES', name: 'Sueldos y salarios', description: 'Nóminas del personal' },
        { code: 'MARKETING', name: 'Marketing y publicidad', description: 'Gastos en promoción y publicidad' },
        { code: 'MAINTENANCE', name: 'Mantenimiento', description: 'Reparaciones y mantenimiento de equipos' },
        { code: 'TRANSPORT', name: 'Transporte', description: 'Gastos de transporte y envíos' },
        { code: 'INSURANCE', name: 'Seguros', description: 'Pólizas de seguros' },
        { code: 'TAXES', name: 'Impuestos y tasas', description: 'Impuestos municipales, tasas' },
        { code: 'PROFESSIONAL', name: 'Servicios profesionales', description: 'Asesoría, gestoría, consultoría' },
        { code: 'BANKING', name: 'Gastos bancarios', description: 'Comisiones bancarias' },
        { code: 'OTHER', name: 'Otros gastos', description: 'Otros gastos no clasificados' }
      ];

      const created = await prisma.expenseType.createMany({
        data: basicExpenseTypes.map(type => ({
          ...type,
          systemId,
          isActive: true
        }))
      });

      console.log(`[CheckExpenseTypes] Creados ${created.count} tipos de gastos`);
    }

    // Obtener todos los tipos actuales
    const allTypes = await prisma.expenseType.findMany({
      where: { systemId },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({
      count: allTypes.length,
      expenseTypes: allTypes
    });

  } catch (error) {
    console.error('[CheckExpenseTypes] Error:', error);
    return NextResponse.json(
      { error: 'Error verificando tipos de gastos' },
      { status: 500 }
    );
  }
}
