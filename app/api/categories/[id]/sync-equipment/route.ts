import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerAuthSession } from "@/lib/auth";
import { z } from 'zod';

// Schema para validar el body de la petición
const SyncEquipmentSchema = z.object({
  equipmentTypeId: z.string().cuid({ message: "ID de equipamiento inválido." }).nullable(),
});

/**
 * POST /api/categories/[id]/sync-equipment
 * Sincroniza el equipamiento de una categoría a todos sus servicios asociados
 */
export async function POST(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerAuthSession();
  if (!session || !session.user?.systemId) {
    console.log('❌ No autorizado - sin sesión o systemId');
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const systemId = session.user.systemId;
  const resolvedParams = await params;
  const categoryId = resolvedParams.id;

  console.log('🔄 INICIO SINCRONIZACIÓN ENDPOINT');
  console.log('📊 Parámetros recibidos:', {
    systemId,
    categoryId,
    userEmail: session.user.email
  });

  try {
    const body = await request.json();
    console.log('📥 Body recibido:', body);
    
    // Validar body
    const validation = SyncEquipmentSchema.safeParse(body);
    if (!validation.success) {
      console.log('❌ Error de validación del body:', validation.error);
      return NextResponse.json(
        { message: 'Datos inválidos.', details: validation.error.format() },
        { status: 400 }
      );
    }
    
    const { equipmentTypeId } = validation.data;
    console.log('✅ Validación exitosa. EquipmentTypeId:', equipmentTypeId);

    // Verificar que la categoría existe y pertenece al sistema
    console.log('🔍 Buscando categoría...');
    const category = await prisma.category.findFirst({
      where: { 
        id: categoryId, 
        systemId: systemId 
      }
    });
    
    if (!category) {
      console.log('❌ Categoría no encontrada para:', { categoryId, systemId });
      return NextResponse.json(
        { message: 'Categoría no encontrada.' },
        { status: 404 }
      );
    }
    console.log('✅ Categoría encontrada:', { id: category.id, name: category.name });

    // Si equipmentTypeId no es null, verificar que el equipamiento existe y pertenece al sistema
    if (equipmentTypeId) {
      console.log('🔍 Validando equipamiento...');
      const equipment = await prisma.equipment.findFirst({
        where: { 
          id: equipmentTypeId, 
          systemId: systemId 
        }
      });
      
      if (!equipment) {
        console.log('❌ Equipamiento no encontrado para:', { equipmentTypeId, systemId });
        return NextResponse.json(
          { message: 'Equipamiento no encontrado.' },
          { status: 404 }
        );
      }
      console.log('✅ Equipamiento validado:', { id: equipment.id, name: equipment.name });
    } else {
      console.log('ℹ️  EquipmentTypeId es null - eliminando equipamiento de servicios');
    }

    // Buscar todos los servicios de esta categoría
    console.log('🔍 Buscando servicios de la categoría...');
    const services = await prisma.service.findMany({
      where: {
        categoryId: categoryId,
        systemId: systemId
      },
      include: {
        settings: {
          include: {
            equipmentRequirements: true
          }
        }
      }
    });

    console.log(`📊 Servicios encontrados: ${services.length}`);
    services.forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.name} (ID: ${service.id})`);
      if (service.settings?.equipmentRequirements?.length) {
        console.log(`      🔧 Equipamiento actual: ${service.settings.equipmentRequirements.map(eq => eq.equipmentId).join(', ')}`);
      } else {
        console.log(`      🚫 Sin equipamiento actual`);
      }
    });

    let updatedCount = 0;
    let processLog: string[] = [];

    // Usar transacción para asegurar consistencia
    console.log('🔄 Iniciando transacción...');
    await prisma.$transaction(async (tx) => {
      for (const service of services) {
        console.log(`\n🔧 Procesando servicio: ${service.name} (${service.id})`);
        
        if (!service.settings) {
          console.log('   📝 Creando ServiceSetting...');
          await tx.serviceSetting.create({
            data: {
              serviceId: service.id
            }
          });
          processLog.push(`Creado ServiceSetting para ${service.name}`);
        }

        // Eliminar requisitos de equipamiento existentes
        console.log('   🗑️  Eliminando equipamiento existente...');
        const deleteResult = await tx.serviceEquipmentRequirement.deleteMany({
          where: { serviceId: service.id }
        });
        console.log(`   ✅ Eliminados ${deleteResult.count} requisitos existentes`);
        processLog.push(`Eliminados ${deleteResult.count} requisitos de ${service.name}`);

        // Si hay equipmentTypeId, crear nuevo requisito
        if (equipmentTypeId) {
          console.log(`   ➕ Añadiendo nuevo equipamiento: ${equipmentTypeId}`);
          await tx.serviceEquipmentRequirement.create({
            data: {
              serviceId: service.id,
              equipmentId: equipmentTypeId
            }
          });
          processLog.push(`Añadido equipamiento ${equipmentTypeId} a ${service.name}`);
          console.log('   ✅ Equipamiento añadido exitosamente');
        } else {
          console.log('   ℹ️  No se añade equipamiento (equipmentTypeId es null)');
          processLog.push(`Equipamiento eliminado de ${service.name}`);
        }

        updatedCount++;
      }
    });

    console.log('\n🎉 TRANSACCIÓN COMPLETADA');
    console.log('📊 Resumen de proceso:');
    processLog.forEach((log, index) => {
      console.log(`   ${index + 1}. ${log}`);
    });

    const result = {
      success: true,
      message: `Equipamiento sincronizado correctamente.`,
      updatedServicesCount: updatedCount,
      categoryName: category.name,
      processLog
    };

    console.log('✅ SINCRONIZACIÓN COMPLETADA:', result);
    return NextResponse.json(result);

  } catch (error) {
    console.error("❌ ERROR EN SINCRONIZACIÓN:", error);
    console.error("📍 Stack trace:", error instanceof Error ? error.stack : 'No stack available');
    return NextResponse.json(
      { message: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
