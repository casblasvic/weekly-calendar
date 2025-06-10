import { prisma } from '../lib/db';

async function checkAndCreateExpenseTypes() {
  try {
    // Obtener el systemId del primer sistema
    const system = await prisma.system.findFirst();
    if (!system) {
      console.error('No se encontró ningún sistema');
      return;
    }

    console.log(`Verificando tipos de gastos para el sistema: ${system.id}`);

    // Verificar si existen tipos de gastos
    const expenseTypes = await prisma.expenseType.findMany({
      where: {
        systemId: system.id
      }
    });

    console.log(`Tipos de gastos encontrados: ${expenseTypes.length}`);

    // Si no existen, crear algunos tipos básicos
    if (expenseTypes.length === 0) {
      console.log('No se encontraron tipos de gastos, creando tipos básicos...');
      
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
          systemId: system.id,
          isActive: true
        }))
      });

      console.log(`Creados ${created.count} tipos de gastos`);
    }

    // Mostrar todos los tipos actuales
    const allTypes = await prisma.expenseType.findMany({
      where: { systemId: system.id },
      orderBy: { name: 'asc' }
    });

    console.log('\nTipos de gastos actuales:');
    allTypes.forEach((type, index) => {
      console.log(`${index + 1}. ${type.name} (${type.code})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndCreateExpenseTypes();
