import { NextResponse, NextRequest } from 'next/server'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { prisma } from '@/lib/db'
import { getServerAuthSession } from "@/lib/auth"
import { z } from 'zod'

// Esquema Zod para instalar recambio
const installationSchema = z.object({
  serialNumber: z.string().optional().nullable(),
  batchNumber: z.string().optional().nullable(),
  costPrice: z.number().positive().optional().nullable(),
  installationNotes: z.string().optional().nullable(),
  condition: z.enum(['NEW', 'REFURBISHED', 'DAMAGED']).optional().default('NEW'),
  installationDate: z.string().datetime().optional(), // Fecha personalizada de instalación
  equipmentClinicAssignmentId: z.string().min(1, "Debe seleccionar una asignación de clínica"), // Campo requerido
  
  // Nuevos campos para tipos de instalación
  installationType: z.enum(['INITIAL_INSTALLATION', 'REPLACEMENT']).optional(), // Si no se especifica, se detecta automáticamente
  replacementReason: z.enum(['NORMAL_WEAR', 'PREMATURE_FAILURE', 'PREVENTIVE_MAINTENANCE', 'UPGRADE', 'DEFECTIVE']).optional(), // Requerido solo para REPLACEMENT
})

// GET /api/equipment/[id]/spare-parts/[sparePartId]/installations - Obtener historial de instalaciones
export async function GET(request: NextRequest, { params }: { params: { id: string, sparePartId: string } }) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const systemId = session.user.systemId
    const awaitedParams = await params
    const { id: equipmentId, sparePartId } = awaitedParams

    // Verificar que el recambio existe y pertenece al equipamiento y sistema
    const sparePart = await prisma.equipmentSparePart.findFirst({
      where: { 
        id: sparePartId,
        equipmentId: equipmentId,
        systemId: systemId 
      },
      select: { id: true }
    })

    if (!sparePart) {
      return NextResponse.json({ error: 'Recambio no encontrado' }, { status: 404 })
    }

    const installations = await prisma.sparePartInstallation.findMany({
      where: { 
        equipmentSparePartId: sparePartId,
        systemId: systemId 
      },
      include: {
        installedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        removedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        equipmentSparePart: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              }
            }
          }
        }
      },
      orderBy: { installedAt: 'desc' }
    })

    return NextResponse.json(installations)

  } catch (error) {
    console.error("[API_SPARE_PART_INSTALLATIONS_GET]", error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// POST /api/equipment/[id]/spare-parts/[sparePartId]/installations - Instalar nuevo recambio
export async function POST(request: NextRequest, { params }: { params: { id: string, sparePartId: string } }) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const systemId = session.user.systemId
    const userId = session.user.id
    const awaitedParams = await params
    const { id: equipmentId, sparePartId } = awaitedParams

    const body = await request.json()
    
    // Validar con Zod
    const validation = installationSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Datos inválidos.', details: validation.error.format() }, { status: 400 })
    }
    const validatedData = validation.data

    // Verificar que el recambio existe y pertenece al equipamiento y sistema
    const sparePart = await prisma.equipmentSparePart.findFirst({
      where: { 
        id: sparePartId,
        equipmentId: equipmentId,
        systemId: systemId 
      },
      include: {
        product: {
          include: {
            settings: true
          }
        },
        equipment: {
          include: {
            usageLog: true
          }
        }
      }
    })

    if (!sparePart) {
      return NextResponse.json({ error: 'Recambio no encontrado' }, { status: 404 })
    }

    // Verificar que la asignación de clínica existe y pertenece al equipamiento
    const clinicAssignment = await prisma.equipmentClinicAssignment.findFirst({
      where: {
        id: validatedData.equipmentClinicAssignmentId,
        equipmentId: equipmentId,
        systemId: systemId,
        isActive: true
      },
      include: {
        clinic: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!clinicAssignment) {
      return NextResponse.json({ 
        error: 'La asignación de clínica seleccionada no existe o no está activa para este equipamiento' 
      }, { status: 400 })
    }

    // Verificar stock disponible
    if (sparePart.product.settings && sparePart.product.settings.currentStock <= 0) {
      return NextResponse.json({ error: 'No hay stock disponible de este recambio' }, { status: 400 })
    }

    // Obtener horas de uso actuales del equipamiento
    let currentUsageHours = 0
    if (sparePart.equipment.usageLog) {
      currentUsageHours = sparePart.equipment.usageLog.totalHours
    }

    // Calcular fecha estimada de fin de vida
    let estimatedEndOfLife = null
    if (sparePart.recommendedLifespan && currentUsageHours !== null) {
      // Asumiendo uso promedio basado en historial
      const averageHoursPerDay = currentUsageHours > 0 ? currentUsageHours / 365 : 8 // Default 8 horas/día
      const remainingDays = sparePart.recommendedLifespan / averageHoursPerDay
      estimatedEndOfLife = new Date(Date.now() + remainingDays * 24 * 60 * 60 * 1000)
    }

    await prisma.$transaction(async (tx) => {
      // 1. Verificar si hay instalaciones previas activas en la misma asignación de clínica
      const previousActiveInstallation = await tx.sparePartInstallation.findFirst({
        where: {
          equipmentSparePartId: sparePartId,
          equipmentClinicAssignmentId: validatedData.equipmentClinicAssignmentId,
          isActive: true
        },
        orderBy: { installedAt: 'desc' }
      })

      // 2. Determinar tipo de instalación automáticamente si no se especifica
      const isReplacement = previousActiveInstallation !== null
      const installationType = validatedData.installationType || (isReplacement ? 'REPLACEMENT' : 'INITIAL_INSTALLATION')
      
      // 3. Validar que se proporcione motivo de sustitución si es REPLACEMENT
      if (installationType === 'REPLACEMENT' && !validatedData.replacementReason) {
        throw new Error('Se requiere especificar el motivo de la sustitución')
      }

      // 4. Marcar como inactiva cualquier instalación previa en la misma asignación de clínica
      let replacedInstallationId = null
      if (previousActiveInstallation) {
        await tx.sparePartInstallation.updateMany({
          where: {
            equipmentSparePartId: sparePartId,
            equipmentClinicAssignmentId: validatedData.equipmentClinicAssignmentId,
            isActive: true
          },
          data: {
            isActive: false,
            removedAt: new Date(),
            removalReason: 'Reemplazado por nueva instalación',
            removedByUserId: userId
          }
        })
        replacedInstallationId = previousActiveInstallation.id
      }

      // 5. Crear nueva instalación
      const installationDate = validatedData.installationDate 
        ? new Date(validatedData.installationDate) 
        : new Date()

      await tx.sparePartInstallation.create({
        data: {
          equipmentSparePartId: sparePartId,
          equipmentClinicAssignmentId: validatedData.equipmentClinicAssignmentId,
          installedAt: installationDate,
          installedByUserId: userId,
          installationType: installationType as 'INITIAL_INSTALLATION' | 'REPLACEMENT',
          replacedInstallationId: replacedInstallationId,
          replacementReason: validatedData.replacementReason as 'NORMAL_WEAR' | 'PREMATURE_FAILURE' | 'PREVENTIVE_MAINTENANCE' | 'UPGRADE' | 'DEFECTIVE' | null,
          serialNumber: validatedData.serialNumber,
          batchNumber: validatedData.batchNumber,
          costPrice: validatedData.costPrice,
          installationNotes: validatedData.installationNotes,
          condition: validatedData.condition,
          initialUsageHours: currentUsageHours,
          currentUsageHours: currentUsageHours,
          estimatedEndOfLife: estimatedEndOfLife,
          systemId: systemId,
        }
      })

      // 6. Actualizar stock (movimiento OUT)
      if (sparePart.product.settings) {
        await tx.productSetting.update({
          where: { productId: sparePart.productId },
          data: {
            currentStock: {
              decrement: 1
            }
          }
        })

        // 7. Registrar movimiento de stock
        const isRetroactiveInstallation = validatedData.installationDate && 
          new Date(validatedData.installationDate).toDateString() !== new Date().toDateString()
        
        const stockNotes = isRetroactiveInstallation 
          ? `Instalación en equipamiento: ${sparePart.equipment.name} (${clinicAssignment.clinic?.name || 'Clínica'} - S/N: ${clinicAssignment.serialNumber}) (Fecha: ${installationDate.toLocaleDateString('es-ES')})`
          : `Instalación en equipamiento: ${sparePart.equipment.name} (${clinicAssignment.clinic?.name || 'Clínica'} - S/N: ${clinicAssignment.serialNumber})`

        await tx.stockLedger.create({
          data: {
            productId: sparePart.productId,
            movementType: 'CONSUMPTION',
            quantity: -1,
            notes: stockNotes,
            userId: userId,
            systemId: systemId,
          }
        })
      }

      // 8. Inicializar o actualizar log de uso del equipamiento
      await tx.equipmentUsageLog.upsert({
        where: { equipmentId: equipmentId },
        update: { lastUpdated: new Date() },
        create: {
          equipmentId: equipmentId,
          totalHours: currentUsageHours,
          systemId: systemId,
        }
      })
    })

    // Obtener la instalación creada con datos completos
    const newInstallation = await prisma.sparePartInstallation.findFirst({
      where: {
        equipmentSparePartId: sparePartId,
        isActive: true,
        installedByUserId: userId
      },
      include: {
        installedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        equipmentSparePart: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(newInstallation, { status: 201 })

  } catch (error) {
    console.error("[API_SPARE_PART_INSTALLATIONS_POST]", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
} 