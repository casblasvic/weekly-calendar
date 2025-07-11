/**
 * 🔧 SCRIPT DE MIGRACIÓN: Corregir estimatedMinutes para usar treatmentDurationMinutes
 * 
 * Este script corrige los registros de appointmentDeviceUsage que fueron creados
 * usando service.durationMinutes en lugar de service.treatmentDurationMinutes
 * para el cálculo de estimatedMinutes.
 * 
 * PROBLEMA:
 * - Los registros existentes tienen estimatedMinutes calculado con durationMinutes (duración total de la cita)
 * - Deberían usar treatmentDurationMinutes (duración específica del uso del equipo)
 * 
 * SOLUCIÓN:
 * - Recalcular estimatedMinutes usando treatmentDurationMinutes cuando esté disponible
 * - Solo actualizar registros activos (ACTIVE, PAUSED) para no afectar históricos completados
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixEstimatedMinutesWithTreatmentDuration() {
  console.log('🔧 [FIX_ESTIMATED_MINUTES] Iniciando corrección de estimatedMinutes...');
  
  try {
    // 1. Obtener todos los registros de uso activos/pausados con equipamiento
    const activeUsages = await prisma.appointmentDeviceUsage.findMany({
      where: {
        currentStatus: { in: ['ACTIVE', 'PAUSED'] },
        equipmentId: { not: null }, // Solo los que usan equipamiento
        endedAt: null
      },
      include: {
        appointment: {
          include: {
            services: {
              include: {
                service: {
                  select: {
                    id: true,
                    name: true,
                    durationMinutes: true,
                    treatmentDurationMinutes: true,
                    settings: {
                      include: {
                        equipmentRequirements: {
                          select: {
                            equipmentId: true
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    console.log(`📊 [FIX_ESTIMATED_MINUTES] Encontrados ${activeUsages.length} registros activos/pausados con equipamiento`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const usage of activeUsages) {
      try {
        // 2. Filtrar servicios que requieren este equipamiento específico
        const servicesUsingThisEquipment = usage.appointment.services.filter(appointmentService => {
          const equipmentReqs = appointmentService.service.settings?.equipmentRequirements || [];
          return equipmentReqs.some(req => req.equipmentId === usage.equipmentId);
        });

        if (servicesUsingThisEquipment.length === 0) {
          console.log(`⚠️ [SKIP] Uso ${usage.id}: No se encontraron servicios que requieran equipamiento ${usage.equipmentId}`);
          skippedCount++;
          continue;
        }

        // 3. Calcular nueva duración estimada usando treatmentDurationMinutes
        const newEstimatedMinutes = servicesUsingThisEquipment.reduce((total, appointmentService) => {
          const service = appointmentService.service;
          // ✅ USAR treatmentDurationMinutes si está disponible y > 0, sino durationMinutes
          const duration = service.treatmentDurationMinutes > 0 
            ? service.treatmentDurationMinutes 
            : (service.durationMinutes || 0);
          return total + duration;
        }, 0);

        // 4. Solo actualizar si el valor cambió
        if (newEstimatedMinutes !== usage.estimatedMinutes) {
          await prisma.appointmentDeviceUsage.update({
            where: { id: usage.id },
            data: { estimatedMinutes: newEstimatedMinutes }
          });

          console.log(`✅ [UPDATED] Uso ${usage.id}:`, {
            appointmentId: usage.appointmentId,
            equipmentId: usage.equipmentId,
            oldEstimatedMinutes: usage.estimatedMinutes,
            newEstimatedMinutes: newEstimatedMinutes,
            servicesUsed: servicesUsingThisEquipment.map(s => ({
              name: s.service.name,
              durationMinutes: s.service.durationMinutes,
              treatmentDurationMinutes: s.service.treatmentDurationMinutes,
              usedDuration: s.service.treatmentDurationMinutes > 0 ? s.service.treatmentDurationMinutes : s.service.durationMinutes
            }))
          });

          updatedCount++;
        } else {
          console.log(`📍 [NO_CHANGE] Uso ${usage.id}: estimatedMinutes ya es correcto (${usage.estimatedMinutes})`);
          skippedCount++;
        }

      } catch (error) {
        console.error(`❌ [ERROR] Error procesando uso ${usage.id}:`, error);
        skippedCount++;
      }
    }

    console.log('🎯 [FIX_ESTIMATED_MINUTES] Resumen final:', {
      totalProcessed: activeUsages.length,
      updated: updatedCount,
      skipped: skippedCount
    });

    console.log('✅ [FIX_ESTIMATED_MINUTES] Corrección completada exitosamente');

  } catch (error) {
    console.error('💥 [FIX_ESTIMATED_MINUTES] Error en el script:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script si se llama directamente
if (require.main === module) {
  fixEstimatedMinutesWithTreatmentDuration()
    .then(() => {
      console.log('🚀 Script ejecutado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error ejecutando script:', error);
      process.exit(1);
    });
}

module.exports = { fixEstimatedMinutesWithTreatmentDuration }; 