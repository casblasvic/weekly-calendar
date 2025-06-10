import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUIMappings() {
  try {
    console.log('\n🔍 Verificando mapeos tal como se mostrarían en la UI...\n');

    // Obtener las clínicas específicas
    const cmo = await prisma.clinic.findFirst({
      where: { prefix: 'CMO' }
    });
    
    const cafc = await prisma.clinic.findFirst({
      where: { prefix: 'CAFC' }
    });

    console.log('📍 Clínicas objetivo:');
    console.log(`   - CMO: ${cmo?.name}`);
    console.log(`   - CAFC: ${cafc?.name}`);

    // Buscar servicios específicos mencionados en la captura
    const servicios = ['Crema Hidratante Facial', 'Sérum Reparador Nocturno'];
    
    console.log('\n🔧 MAPEOS DE SERVICIOS (como en la captura):');
    
    for (const servicioNombre of servicios) {
      const servicio = await prisma.service.findFirst({
        where: { name: servicioNombre }
      });

      if (!servicio) {
        console.log(`\n   ❌ No se encontró el servicio: ${servicioNombre}`);
        continue;
      }

      console.log(`\n   ${servicioNombre}:`);

      // Mapeo para CMO
      if (cmo) {
        const mapeoCMO = await prisma.serviceAccountMapping.findFirst({
          where: {
            serviceId: servicio.id,
            clinicId: cmo.id
          },
          include: { account: true }
        });
        console.log(`     - ${cmo.name}: ${mapeoCMO?.account.accountNumber || 'SIN MAPEO'}`);
      }

      // Mapeo para CAFC
      if (cafc) {
        const mapeoCAFC = await prisma.serviceAccountMapping.findFirst({
          where: {
            serviceId: servicio.id,
            clinicId: cafc.id
          },
          include: { account: true }
        });
        console.log(`     - ${cafc.name}: ${mapeoCAFC?.account.accountNumber || 'SIN MAPEO'}`);
      }
    }

    // Buscar productos específicos mencionados
    const productos = ['Aceite Corporal Nutritivo', 'Protector Solar SPF50+'];
    
    console.log('\n\n📦 MAPEOS DE PRODUCTOS (como en la captura):');
    
    for (const productoNombre of productos) {
      const producto = await prisma.product.findFirst({
        where: { name: productoNombre }
      });

      if (!producto) {
        console.log(`\n   ❌ No se encontró el producto: ${productoNombre}`);
        continue;
      }

      console.log(`\n   ${productoNombre}:`);

      // Mapeo para CMO (solo venta)
      if (cmo) {
        const mapeoCMO = await prisma.productAccountMapping.findFirst({
          where: {
            productId: producto.id,
            clinicId: cmo.id,
            accountType: 'INVENTORY_SALE'
          },
          include: { account: true }
        });
        console.log(`     - ${cmo.name}: ${mapeoCMO?.account.accountNumber || 'SIN MAPEO'}`);
      }

      // Mapeo para CAFC (solo venta)
      if (cafc) {
        const mapeoCAFC = await prisma.productAccountMapping.findFirst({
          where: {
            productId: producto.id,
            clinicId: cafc.id,
            accountType: 'INVENTORY_SALE'
          },
          include: { account: true }
        });
        console.log(`     - ${cafc.name}: ${mapeoCAFC?.account.accountNumber || 'SIN MAPEO'}`);
      }
    }

    // Verificar si hay cuentas con el patrón mencionado en la captura
    console.log('\n\n📊 BÚSQUEDA DE CUENTAS PROBLEMÁTICAS:');
    
    const cuentasProblematicas = await prisma.chartOfAccountEntry.findMany({
      where: {
        OR: [
          { accountNumber: '711.CM-0.CRE.V' },
          { accountNumber: '711.CM-0.SER.V' },
          { accountNumber: '711.CARN.ACE.V' },
          { accountNumber: '711.CAFU.PRO.V' }
        ]
      }
    });

    console.log(`   Cuentas encontradas: ${cuentasProblematicas.length}`);
    cuentasProblematicas.forEach(cuenta => {
      console.log(`   - ${cuenta.accountNumber}: ${cuenta.name}`);
    });

    // Verificar si "Crema Hidratante Facial" y "Sérum Reparador Nocturno" son servicios o productos
    console.log('\n\n❓ VERIFICACIÓN DE TIPOS:');
    
    const cremaServicio = await prisma.service.findFirst({
      where: { name: 'Crema Hidratante Facial' }
    });
    const cremaProducto = await prisma.product.findFirst({
      where: { name: 'Crema Hidratante Facial' }
    });
    
    console.log(`   "Crema Hidratante Facial":`);
    console.log(`     - ¿Es servicio? ${cremaServicio ? 'SÍ' : 'NO'}`);
    console.log(`     - ¿Es producto? ${cremaProducto ? 'SÍ' : 'NO'}`);

    const serumServicio = await prisma.service.findFirst({
      where: { name: 'Sérum Reparador Nocturno' }
    });
    const serumProducto = await prisma.product.findFirst({
      where: { name: 'Sérum Reparador Nocturno' }
    });
    
    console.log(`   "Sérum Reparador Nocturno":`);
    console.log(`     - ¿Es servicio? ${serumServicio ? 'SÍ' : 'NO'}`);
    console.log(`     - ¿Es producto? ${serumProducto ? 'SÍ' : 'NO'}`);

    console.log('\n✅ Verificación completada!\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUIMappings();
