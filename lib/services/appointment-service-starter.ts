import { prisma } from '@/lib/db';
import { AppointmentServiceStatus, AppointmentStatus } from '@prisma/client';

export interface ServiceStartResult {
  success: boolean;
  message: string;
  data?: {
    deviceUsage?: {
      id: string;
      startedAt: string;
      estimatedMinutes: number;
      equipment?: {
        id: string;
        name: string;
      };
    };
    startedAt?: string;
    requiresEquipment?: boolean;
  };
  requiresSelection?: boolean;
  availableEquipment?: Array<{
    id: string;
    name: string;
    description?: string;
    hasDevice: boolean;
    deviceStatus?: string | null;
    location?: string;
  }>;
}

export interface StartServiceParams {
  appointmentId: string;
  serviceId: string;
  equipmentId?: string;
  userId: string;
  systemId: string;
}

/**
 * Servicio principal para iniciar servicios de citas
 */
export class AppointmentServiceStarter {
  
  /**
   * Inicia un servicio de cita con toda la lógica de validación
   */
  static async startService(params: StartServiceParams): Promise<ServiceStartResult> {
    const { appointmentId, serviceId, equipmentId, userId, systemId } = params;

    try {
      // 1. Validar la cita y obtener información completa
      const appointment = await this.validateAndGetAppointment(appointmentId, systemId);
      if (!appointment) {
        throw new Error('Cita no encontrada o no pertenece a tu sistema');
      }

      // 2. Validar el servicio
      const appointmentService = this.validateAppointmentService(appointment, serviceId);
      if (!appointmentService) {
        throw new Error('El servicio no pertenece a esta cita');
      }

      // 3. Verificar estado del servicio
      this.validateServiceStatus(appointmentService);

      // 4. Obtener equipos requeridos
      const equipmentRequirements = appointmentService.service.settings?.equipmentRequirements || [];
      const availableEquipment = this.getAvailableEquipment(equipmentRequirements, appointment.clinicId);

      // 5. Determinar flujo según equipos
      if (!equipmentId) {
        return await this.handleNoEquipmentSpecified(
          appointmentId, 
          serviceId, 
          userId, 
          systemId, 
          availableEquipment
        );
      }

      // 6. Validar equipo especificado
      const selectedEquipment = this.validateSelectedEquipment(availableEquipment, equipmentId);
      if (!selectedEquipment) {
        throw new Error('Equipo no válido para este servicio o no disponible');
      }

      // 7. Iniciar servicio con equipo
      return await this.startServiceWithEquipment(
        appointmentId,
        serviceId,
        equipmentId,
        userId,
        systemId
      );

    } catch (error) {
      console.error('[AppointmentServiceStarter] Error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      };
    }
  }

  /**
   * Valida y obtiene la cita con todas las relaciones necesarias
   */
  private static async validateAndGetAppointment(appointmentId: string, systemId: string) {
    return await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        systemId: systemId,
      },
      include: {
        services: {
          include: {
            service: {
              include: {
                settings: {
                  include: {
                    equipmentRequirements: {
                      include: {
                        equipment: {
                          include: {
                            clinicAssignments: {
                              include: {
                                clinic: true
                              },
                              where: {
                                isActive: true
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
        },
        clinic: true
      },
    });
  }

  /**
   * Valida que el servicio pertenece a la cita
   */
  private static validateAppointmentService(appointment: any, serviceId: string) {
    return appointment.services.find((s: any) => s.serviceId === serviceId);
  }

  /**
   * Valida el estado del servicio antes de iniciarlo
   */
  private static validateServiceStatus(appointmentService: any) {
    if (appointmentService.status === AppointmentServiceStatus.IN_PROGRESS) {
      throw new Error('El servicio ya está en progreso');
    }

    if (appointmentService.status === AppointmentServiceStatus.VALIDATED) {
      throw new Error('El servicio ya está validado');
    }
  }

  /**
   * Obtiene equipos disponibles para el servicio
   */
  private static getAvailableEquipment(equipmentRequirements: any[], clinicId: string) {
    return equipmentRequirements
      .map(req => req.equipment)
      .filter(equipment => 
        equipment.isActive && 
        equipment.clinicAssignments.some((assignment: any) => 
          assignment.clinicId === clinicId && assignment.isActive
        )
      );
  }

  /**
   * Valida el equipo seleccionado
   */
  private static validateSelectedEquipment(availableEquipment: any[], equipmentId: string) {
    return availableEquipment.find(eq => eq.id === equipmentId);
  }

  /**
   * Maneja el caso cuando no se especifica equipo
   */
  private static async handleNoEquipmentSpecified(
    appointmentId: string,
    serviceId: string,
    userId: string,
    systemId: string,
    availableEquipment: any[]
  ): Promise<ServiceStartResult> {
    
    // Sin equipos requeridos - iniciar directamente
    if (availableEquipment.length === 0) {
      return await this.startServiceWithoutEquipment(appointmentId, serviceId, userId, systemId);
    }

    // Múltiples equipos - requiere selección
    if (availableEquipment.length > 1) {
      return {
        success: false,
        message: 'Selección de equipo requerida',
        requiresSelection: true,
        availableEquipment: availableEquipment.map(equipment => ({
          id: equipment.id,
          name: equipment.name,
          description: equipment.description,
          hasDevice: !!equipment.device,
          deviceStatus: equipment.device?.lastKnownStatus || null,
          location: equipment.location
        }))
      };
    }

    // Un solo equipo - usar automáticamente
    const selectedEquipment = availableEquipment[0];
    return await this.startServiceWithEquipment(
      appointmentId,
      serviceId,
      selectedEquipment.id,
      userId,
      systemId
    );
  }

  /**
   * Inicia un servicio que requiere equipo
   */
  private static async startServiceWithEquipment(
    appointmentId: string,
    serviceId: string,
    equipmentId: string,
    userId: string,
    systemId: string
  ): Promise<ServiceStartResult> {
    
    return await prisma.$transaction(async (tx) => {
      // 1. Obtener equipo con dispositivo
      const equipment = await tx.equipment.findFirst({
        where: { id: equipmentId },
        include: { 
          clinicAssignments: {
            include: {
              clinic: true
            },
            where: {
              isActive: true
            }
          }
        }
      });

      if (!equipment) {
        throw new Error('Equipo no encontrado');
      }

      // 2. Verificar disponibilidad del equipo
      await this.checkEquipmentAvailability(tx, equipmentId, systemId);

      const now = new Date();

      // 3. Marcar servicio como IN_PROGRESS
      await tx.appointmentService.updateMany({
        where: {
          appointmentId: appointmentId,
          serviceId: serviceId
        },
        data: {
          status: AppointmentServiceStatus.IN_PROGRESS,
          serviceStartedAt: now,
          serviceStartedByUserId: userId
        }
      });

      // 4. Obtener duración estimada del servicio
      const service = await tx.service.findFirst({
        where: { id: serviceId },
        select: { durationMinutes: true }
      });

      // 5. Crear registro de uso de dispositivo
      const equipmentAssignment = equipment.clinicAssignments[0];
      const deviceUsage = await tx.appointmentDeviceUsage.create({
        data: {
          appointmentId: appointmentId,
          appointmentServiceId: `${appointmentId}-${serviceId}`,
          equipmentId: equipmentId,
          equipmentClinicAssignmentId: equipmentAssignment?.id || null,
          deviceId: equipmentAssignment?.deviceId || equipment.id,
          startedAt: now,
          estimatedMinutes: service?.durationMinutes || 30,
          startedByUserId: userId,
          systemId: systemId
        }
      });

      // 6. Actualizar cita principal
      await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          deviceActivationTimestamp: now,
          status: AppointmentStatus.IN_PROGRESS
        }
      });

      // 7. Activar dispositivo si existe (TODO: adaptar al nuevo sistema de asignaciones)
      // Nota: La activación de dispositivos necesita ser reestructurada para el nuevo sistema
      // donde Equipment no tiene relación directa con Device
      /* if (equipment.device?.apiEndpoint) {
        try {
          await DeviceController.activateDevice(equipment.device);
        } catch (deviceError) {
          console.warn('[AppointmentServiceStarter] No se pudo activar dispositivo:', deviceError);
        }
      } */

      return {
        success: true,
        message: 'Servicio iniciado correctamente',
        data: {
          deviceUsage: {
            id: deviceUsage.id,
            startedAt: deviceUsage.startedAt.toISOString(),
            estimatedMinutes: deviceUsage.estimatedMinutes,
            equipment: {
              id: equipment.id,
              name: equipment.name
            }
          }
        }
      };
    });
  }

  /**
   * Inicia un servicio que no requiere equipo
   */
  private static async startServiceWithoutEquipment(
    appointmentId: string,
    serviceId: string,
    userId: string,
    systemId: string
  ): Promise<ServiceStartResult> {
    
    return await prisma.$transaction(async (tx) => {
      const now = new Date();

      // Marcar servicio como IN_PROGRESS
      await tx.appointmentService.updateMany({
        where: {
          appointmentId: appointmentId,
          serviceId: serviceId
        },
        data: {
          status: AppointmentServiceStatus.IN_PROGRESS,
          serviceStartedAt: now,
          serviceStartedByUserId: userId
        }
      });

      // Actualizar estado de la cita
      await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          status: AppointmentStatus.IN_PROGRESS
        }
      });

      return {
        success: true,
        message: 'Servicio iniciado correctamente',
        data: {
          startedAt: now.toISOString(),
          requiresEquipment: false
        }
      };
    });
  }

  /**
   * Verifica que el equipo no esté en uso
   */
  private static async checkEquipmentAvailability(tx: any, equipmentId: string, systemId: string) {
    const equipmentInUse = await tx.appointmentDeviceUsage.findFirst({
      where: {
        equipmentId: equipmentId,
        endedAt: null, // Uso activo
        systemId: systemId
      }
    });

    if (equipmentInUse) {
      throw new Error('El equipo está siendo usado por otra cita');
    }
  }
}

/**
 * Controlador para dispositivos inteligentes
 */
export class DeviceController {
  
  /**
   * Activa un dispositivo inteligente
   */
  static async activateDevice(device: any): Promise<any> {
    if (!device.apiEndpoint) {
      throw new Error('Dispositivo sin endpoint API');
    }

    // Crear AbortController para timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      let response;
      
      // Diferentes tipos de dispositivos
      switch (device.deviceType) {
        case 'SHELLY':
          response = await this.activateShellyDevice(device, controller.signal);
          break;
        case 'SMART_PLUG':
          response = await this.activateSmartPlug(device, controller.signal);
          break;
        default:
          response = await this.activateGenericDevice(device, controller.signal);
      }

      clearTimeout(timeoutId);
      return response;

    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Timeout activando dispositivo');
      }
      throw error;
    }
  }

  /**
   * Activa un dispositivo Shelly
   */
  private static async activateShellyDevice(device: any, signal: AbortSignal) {
    const response = await fetch(`${device.apiEndpoint}/relay/0?turn=on`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      signal
    });

    if (!response.ok) {
      throw new Error(`Error activando dispositivo Shelly: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Activa un enchufe inteligente genérico
   */
  private static async activateSmartPlug(device: any, signal: AbortSignal) {
    const response = await fetch(`${device.apiEndpoint}/power/on`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${device.apiKey || ''}`
      },
      signal
    });

    if (!response.ok) {
      throw new Error(`Error activando enchufe inteligente: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Activa un dispositivo genérico
   */
  private static async activateGenericDevice(device: any, signal: AbortSignal) {
    const response = await fetch(`${device.apiEndpoint}/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      signal
    });

    if (!response.ok) {
      throw new Error(`Error activando dispositivo: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Desactiva un dispositivo inteligente
   */
  static async deactivateDevice(device: any): Promise<any> {
    if (!device.apiEndpoint) {
      throw new Error('Dispositivo sin endpoint API');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      let response;
      
      switch (device.deviceType) {
        case 'SHELLY':
          response = await this.deactivateShellyDevice(device, controller.signal);
          break;
        case 'SMART_PLUG':
          response = await this.deactivateSmartPlug(device, controller.signal);
          break;
        default:
          response = await this.deactivateGenericDevice(device, controller.signal);
      }

      clearTimeout(timeoutId);
      return response;

    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Timeout desactivando dispositivo');
      }
      throw error;
    }
  }

  private static async deactivateShellyDevice(device: any, signal: AbortSignal) {
    const response = await fetch(`${device.apiEndpoint}/relay/0?turn=off`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal
    });

    if (!response.ok) {
      throw new Error(`Error desactivando dispositivo Shelly: ${response.statusText}`);
    }

    return response.json();
  }

  private static async deactivateSmartPlug(device: any, signal: AbortSignal) {
    const response = await fetch(`${device.apiEndpoint}/power/off`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${device.apiKey || ''}`
      },
      signal
    });

    if (!response.ok) {
      throw new Error(`Error desactivando enchufe inteligente: ${response.statusText}`);
    }

    return response.json();
  }

  private static async deactivateGenericDevice(device: any, signal: AbortSignal) {
    const response = await fetch(`${device.apiEndpoint}/deactivate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal
    });

    if (!response.ok) {
      throw new Error(`Error desactivando dispositivo: ${response.statusText}`);
    }

    return response.json();
  }
} 