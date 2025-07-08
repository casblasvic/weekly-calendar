import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { webSocketManager } from "@/lib/websocket";

type Params = Promise<{ id: string }>;

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session?.user?.systemId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = params;

    try {
        const body = await request.json();
        
        // Verificar que el enchufe pertenece al sistema del usuario
        const existingPlug = await prisma.smartPlugDevice.findFirst({
            where: {
                id,
                systemId: session.user.systemId
            }
        });

        if (!existingPlug) {
            return NextResponse.json({ error: "Enchufe no encontrado" }, { status: 404 });
        }

        // Verificar si la asignación de equipo cambió para invalidar cache
        const assignmentChanged = existingPlug.equipmentClinicAssignmentId !== body.equipmentClinicAssignmentId;
        
        console.log('🔍 [SMART_PLUG_UPDATE] Debug cambio de asignación:', {
          deviceName: existingPlug.name,
          oldAssignmentId: existingPlug.equipmentClinicAssignmentId,
          newAssignmentId: body.equipmentClinicAssignmentId,
          assignmentChanged
        });

        // Actualizar el enchufe
        const updatedDevice = await prisma.smartPlugDevice.update({
            where: { id },
            data: {
                name: body.name,
                deviceId: body.deviceId,
                deviceIp: body.deviceIp,
                equipmentClinicAssignmentId: body.equipmentClinicAssignmentId,
                clinicId: body.clinicId,
            },
            include: {
                equipmentClinicAssignment: {
                    include: {
                        equipment: {
                            select: {
                                name: true,
                            }
                        },
                        clinic: {
                            select: {
                                name: true,
                            }
                        }
                    },
                },
            },
        });

        // 📡 Si la asignación cambió, notificar por Socket.IO para actualizar el menú flotante
        if (assignmentChanged) {
            try {
                console.log(`📡 [SMART_PLUG_UPDATE] Notificando cambio de asignación: ${updatedDevice.name}`);
                
                // Usar Socket.IO en lugar de WebSocket broadcast
                if (global.broadcastAssignmentUpdate) {
                    global.broadcastAssignmentUpdate(session.user.systemId, {
                        type: 'smart-plug-assignment-updated',
                        deviceId: updatedDevice.id,
                        deviceName: updatedDevice.name,
                        systemId: session.user.systemId,
                        equipmentClinicAssignmentId: updatedDevice.equipmentClinicAssignmentId,
                        clinicId: updatedDevice.clinicId,
                        equipmentName: updatedDevice.equipmentClinicAssignment?.equipment?.name,
                        clinicName: updatedDevice.equipmentClinicAssignment?.clinic?.name,
                        timestamp: new Date().toISOString()
                    });
                    console.log(`✅ [SMART_PLUG_UPDATE] Notificación Socket.IO enviada exitosamente`);
                } else {
                    console.warn(`⚠️ [SMART_PLUG_UPDATE] broadcastAssignmentUpdate no disponible`);
                }
            } catch (wsError) {
                console.warn(`⚠️ [SMART_PLUG_UPDATE] Error enviando notificación Socket.IO:`, wsError);
                // No fallar la operación por un error de Socket.IO
            }
        }

        return NextResponse.json(updatedDevice);

    } catch (error) {
        console.error("Error updating smart plug device:", error);
        return NextResponse.json({ error: "Error al actualizar el dispositivo" }, { status: 500 });
    }
}

// GET /api/internal/smart-plug-devices/[id]
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    // ... (Implementación si se necesita obtener un solo dispositivo)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const session = await auth();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validar que el dispositivo pertenezca al sistema del usuario
    const device = await prisma.smartPlugDevice.findFirst({
      where: {
        id,
        systemId: session.user.systemId
      }
    });

    if (!device) {
      return NextResponse.json({ error: 'Dispositivo no encontrado' }, { status: 404 });
    }

    // Verificar si la asignación de equipo cambió para invalidar cache
    const assignmentChanged = body.equipmentClinicAssignmentId !== undefined && 
                             device.equipmentClinicAssignmentId !== body.equipmentClinicAssignmentId;
    
    console.log('🔍 [SMART_PLUG_PATCH] Debug cambio de asignación:', {
      deviceName: device.name,
      oldAssignmentId: device.equipmentClinicAssignmentId,
      newAssignmentId: body.equipmentClinicAssignmentId,
      bodyHasAssignmentId: body.equipmentClinicAssignmentId !== undefined,
      assignmentChanged
    });

    // Construir objeto de actualización con solo los campos proporcionados
    const updateData: any = {};

    // 🔍 REVERIFICAR SI ES ENCHUFE CUANDO SE ASIGNA A CLÍNICA O EQUIPO
    const assigningClinic = (body.clinicId && body.clinicId !== 'none') ||  (body.equipmentClinicAssignmentId && body.equipmentClinicAssignmentId !== 'none');
    if (assigningClinic) {
      // Determinar si el dispositivo ya se consideraba enchufe
      const { isSmartPlug } = await import('@/utils/shelly-device-utils');
      const isPlug = isSmartPlug(device.modelCode);

      // Si no era enchufe o estaba excluido de sync, forzarlo como enchufe
      if (!isPlug || device.excludeFromSync) {
        console.log(`🔄 [SMART_PLUG_PATCH] Forzando dispositivo como enchufe por asignación manual: ${device.name}`);
        updateData.excludeFromSync = false; // Asegurar que se sincronice en el futuro
      }
    }
    
    // Campos básicos
    if (body.name !== undefined) updateData.name = body.name;
    if (body.clinicId !== undefined) updateData.clinicId = body.clinicId;
    if (body.equipmentClinicAssignmentId !== undefined) updateData.equipmentClinicAssignmentId = body.equipmentClinicAssignmentId;
    
    // Campos de configuración
    if (body.timezone !== undefined) updateData.timezone = body.timezone;
    if (body.autoUpdate !== undefined) updateData.autoUpdate = body.autoUpdate;
    if (body.wifiBackupEnabled !== undefined) updateData.wifiBackupEnabled = body.wifiBackupEnabled;
    if (body.wifiBackupSsid !== undefined) updateData.wifiBackupSsid = body.wifiBackupSsid;
    if (body.apModeEnabled !== undefined) updateData.apModeEnabled = body.apModeEnabled;
    if (body.autoOffEnabled !== undefined) updateData.autoOffEnabled = body.autoOffEnabled;
    if (body.autoOffDelay !== undefined) updateData.autoOffDelay = body.autoOffDelay;
    if (body.powerLimit !== undefined) updateData.powerLimit = body.powerLimit;
    if (body.ledBrightness !== undefined) updateData.ledBrightness = body.ledBrightness;
    if (body.ledColorMode !== undefined) updateData.ledColorMode = body.ledColorMode;
    if (body.ledColorR !== undefined) updateData.ledColorR = body.ledColorR;
    if (body.ledColorG !== undefined) updateData.ledColorG = body.ledColorG;
    if (body.ledColorB !== undefined) updateData.ledColorB = body.ledColorB;
    if (body.ledNightMode !== undefined) updateData.ledNightMode = body.ledNightMode;

    // Actualizar el dispositivo
    const updatedDevice = await prisma.smartPlugDevice.update({
      where: { id },
      data: updateData,
      include: {
        credential: true,
        equipmentClinicAssignment: {
          include: {
            equipment: true,
            clinic: true
          }
        },
        clinic: true
      }
    });

    // 📡 Si la asignación cambió, notificar por Socket.IO para actualizar el menú flotante
    if (assignmentChanged) {
      try {
        console.log(`📡 [SMART_PLUG_PATCH] Notificando cambio de asignación: ${updatedDevice.name}`);
        
        // Usar Socket.IO en lugar de WebSocket broadcast
        if (global.broadcastAssignmentUpdate) {
          global.broadcastAssignmentUpdate(session.user.systemId, {
            type: 'smart-plug-assignment-updated',
            deviceId: updatedDevice.id,
            deviceName: updatedDevice.name,
            systemId: session.user.systemId,
            equipmentClinicAssignmentId: updatedDevice.equipmentClinicAssignmentId,
            clinicId: updatedDevice.clinicId,
            equipmentName: updatedDevice.equipmentClinicAssignment?.equipment?.name,
            clinicName: updatedDevice.equipmentClinicAssignment?.clinic?.name,
            timestamp: new Date().toISOString()
          });
          console.log(`✅ [SMART_PLUG_PATCH] Notificación Socket.IO enviada exitosamente`);
        } else {
          console.warn(`⚠️ [SMART_PLUG_PATCH] broadcastAssignmentUpdate no disponible`);
        }
      } catch (wsError) {
        console.warn(`⚠️ [SMART_PLUG_PATCH] Error enviando notificación Socket.IO:`, wsError);
        // No fallar la operación por un error de Socket.IO
      }
    }

    return NextResponse.json(updatedDevice);
  } catch (error) {
    console.error('Error actualizando dispositivo:', error);
    return NextResponse.json(
      { error: 'Error al actualizar dispositivo' },
      { status: 500 }
    );
  }
}

// DELETE /api/internal/smart-plug-devices/[id]
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session?.user?.systemId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = params;

    try {
        // Verificar que el enchufe pertenece al sistema del usuario
        const smartPlug = await prisma.smartPlugDevice.findFirst({
            where: {
                id,
                systemId: session.user.systemId
            }
        });

        if (!smartPlug) {
            return NextResponse.json({ error: "Enchufe no encontrado" }, { status: 404 });
        }

        // Eliminar registros de uso asociados al equipo del enchufe
        // Como AppointmentDeviceUsage se relaciona con Equipment, no directamente con SmartPlugDevice
        if (smartPlug.equipmentClinicAssignmentId) {
            const assignment = await prisma.equipmentClinicAssignment.findUnique({
                where: { id: smartPlug.equipmentClinicAssignmentId }
            });
            
            if (assignment) {
                await prisma.appointmentDeviceUsage.deleteMany({
                    where: {
                        equipmentId: assignment.equipmentId,
                        systemId: session.user.systemId
                    }
                });
            }
        }

        // Eliminar el enchufe inteligente
        await prisma.smartPlugDevice.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Error deleting smart plug device:", error);
        return NextResponse.json({ error: "Error al eliminar el dispositivo" }, { status: 500 });
    }
} 