/**
 * Servicio de control de dispositivos Shelly con validación de citas
 * Implementa control de fraude: dispositivos solo se encienden con cita activa
 */

import { prisma } from '@/lib/db';
import { AppointmentStatus, AppointmentServiceStatus, EntityType } from '@prisma/client';
import { UnifiedDeviceStatus, AppointmentControlCommands, errorHandlers } from '../api/endpoints';
import { shellyDeviceClient } from '../device-client';

export class DeviceControlService implements AppointmentControlCommands {
  constructor(private systemId: string) {}

  /**
   * Validar que existe una cita activa antes de encender el dispositivo
   */
  async validateAndTurnOn(
    deviceId: string, 
    appointmentId: string, 
    serviceId: string
  ): Promise<{
    success: boolean;
    deviceUsageId?: string;
    error?: string;
  }> {
    try {
      // 1. Verificar que la cita existe y está en progreso
      const appointment = await prisma.appointment.findFirst({
        where: {
          id: appointmentId,
          systemId: this.systemId,
          status: AppointmentStatus.IN_PROGRESS,
        },
        include: {
          services: {
            where: {
              serviceId: serviceId,
            },
          },
          person: true,
        },
      });

      if (!appointment) {
        return {
          success: false,
          error: 'No se encontró una cita activa en progreso',
        };
      }

      // 2. Verificar que el servicio está programado o en progreso
      const appointmentService = appointment.services[0];
      if (!appointmentService || 
          (appointmentService.status !== AppointmentServiceStatus.SCHEDULED && 
           appointmentService.status !== AppointmentServiceStatus.IN_PROGRESS)) {
        return {
          success: false,
          error: 'El servicio no está programado o en progreso',
        };
      }

      // 3. Obtener el dispositivo SmartPlugDevice
      const smartDevice = await prisma.smartPlugDevice.findFirst({
        where: {
          id: deviceId,
          systemId: this.systemId,
        },
        include: {
          credential: true,
          equipment: true,
        },
      });

      if (!smartDevice || !smartDevice.credential) {
        return {
          success: false,
          error: 'Dispositivo no encontrado o sin credenciales',
        };
      }

      // 4. Verificar que no hay otro uso activo del dispositivo
      const activeUsage = await prisma.appointmentDeviceUsage.findFirst({
        where: {
          deviceId: smartDevice.equipment?.deviceId || '', // El Device.id asociado al Equipment
          endedAt: null,
          systemId: this.systemId,
        },
      });

      if (activeUsage) {
        return {
          success: false,
          error: 'El dispositivo ya está en uso en otra cita',
        };
      }

      // 5. Resetear contador de energía antes de iniciar
      const resetResult = await this.resetCounterForService(deviceId);
      
      // 6. Encender el dispositivo
      const client = await shellyDeviceClient.getClient({
        ...smartDevice,
        shellyCredential: smartDevice.credential,
      });
      const turnOnResult = await client.turnOn();

      if (!turnOnResult) {
        return {
          success: false,
          error: 'No se pudo encender el dispositivo',
        };
      }

      // 7. Crear registro de uso del dispositivo
      const deviceUsage = await prisma.appointmentDeviceUsage.create({
        data: {
          appointmentId: appointmentId,
          appointmentServiceId: appointmentService.id,
          equipmentId: smartDevice.equipmentId || '',
          deviceId: smartDevice.equipment?.deviceId || '',
          startedAt: new Date(),
          estimatedMinutes: appointmentService.estimatedDuration || 60,
          startedByUserId: appointmentService.serviceStartedByUserId || appointment.professionalUserId,
          systemId: this.systemId,
          deviceData: {
            resetCounterResult: resetResult,
            deviceGeneration: smartDevice.generation,
            shellyDeviceId: smartDevice.deviceId,
          },
        },
      });

      // 8. Si es Gen 3, configurar LED para indicar cita activa
      if (smartDevice.generation === '3') {
        try {
          await client.setAppointmentLED(true);
        } catch (error) {
          console.error('Error configurando LED:', error);
          // No fallar si el LED no se puede configurar
        }
      }

      return {
        success: true,
        deviceUsageId: deviceUsage.id,
      };

    } catch (error) {
      console.error('Error en validateAndTurnOn:', error);
      return {
        success: false,
        error: errorHandlers.formatError(error, 'validación y encendido'),
      };
    }
  }

  /**
   * Apagar el dispositivo y registrar el fin del uso
   */
  async turnOffAndRecord(
    deviceId: string, 
    deviceUsageId: string
  ): Promise<{
    success: boolean;
    energyConsumed?: number;
    duration?: number;
  }> {
    try {
      // 1. Verificar que el registro de uso existe y está activo
      const deviceUsage = await prisma.appointmentDeviceUsage.findFirst({
        where: {
          id: deviceUsageId,
          endedAt: null,
          systemId: this.systemId,
        },
        include: {
          equipment: true,
        },
      });

      if (!deviceUsage) {
        return {
          success: false,
        };
      }

      // 2. Obtener el SmartPlugDevice
      const smartDevice = await prisma.smartPlugDevice.findFirst({
        where: {
          id: deviceId,
          systemId: this.systemId,
        },
        include: {
          credential: true,
        },
      });

      if (!smartDevice || !smartDevice.credential) {
        return {
          success: false,
        };
      }

      // 3. Obtener estado actual del dispositivo para capturar consumo
      const client = await shellyDeviceClient.getClient({
        ...smartDevice,
        shellyCredential: smartDevice.credential,
      });
      const status = await client.getStatus();
      
      // 4. Apagar el dispositivo
      const turnOffResult = await client.turnOff();

      if (!turnOffResult) {
        return {
          success: false,
        };
      }

      // 5. Calcular duración y consumo
      const endedAt = new Date();
      const duration = Math.round((endedAt.getTime() - deviceUsage.startedAt.getTime()) / 60000); // minutos
      const energyConsumed = status.power.total; // kWh

      // 6. Actualizar registro de uso
      await prisma.appointmentDeviceUsage.update({
        where: { id: deviceUsageId },
        data: {
          endedAt: endedAt,
          actualMinutes: duration,
          energyConsumption: energyConsumed,
          deviceData: {
            ...(deviceUsage.deviceData as any || {}),
            finalStatus: status,
          },
        },
      });

      // 7. Si es Gen 3, restaurar LED normal
      if (smartDevice.generation === '3') {
        try {
          await client.setAppointmentLED(false);
        } catch (error) {
          console.error('Error restaurando LED:', error);
        }
      }

      // 8. Verificar cumplimiento (si excedió tiempo de cita)
      const compliance = await this.checkUsageCompliance(deviceUsageId);
      if (!compliance.compliant) {
        // Registrar alerta de posible fraude
        await this.registerFraudAlert(deviceUsageId, compliance);
      }

      return {
        success: true,
        energyConsumed,
        duration,
      };

    } catch (error) {
      console.error('Error en turnOffAndRecord:', error);
      return {
        success: false,
      };
    }
  }

  /**
   * Resetear contador de energía al iniciar servicio
   */
  async resetCounterForService(deviceId: string): Promise<{
    success: boolean;
    previousTotal?: number;
  }> {
    try {
      const smartDevice = await prisma.smartPlugDevice.findFirst({
        where: {
          id: deviceId,
          systemId: this.systemId,
        },
        include: {
          credential: true,
        },
      });

      if (!smartDevice || !smartDevice.credential) {
        return { success: false };
      }

      const client = await shellyDeviceClient.getClient({
        ...smartDevice,
        shellyCredential: smartDevice.credential,
      });
      
      // Obtener total actual antes de resetear
      const statusBefore = await client.getStatus();
      const previousTotal = statusBefore.power.total;

      // Resetear contadores
      const resetResult = await client.resetEnergyCounters();

      return {
        success: resetResult,
        previousTotal,
      };

    } catch (error) {
      console.error('Error en resetCounterForService:', error);
      return { success: false };
    }
  }

  /**
   * Verificar si el tiempo de uso excede la duración de la cita
   */
  async checkUsageCompliance(deviceUsageId: string): Promise<{
    compliant: boolean;
    appointmentDuration: number;
    actualUsage: number;
    exceedBy?: number;
  }> {
    try {
      const deviceUsage = await prisma.appointmentDeviceUsage.findUnique({
        where: { id: deviceUsageId },
        include: {
          appointment: true,
          appointmentService: {
            include: {
              service: true,
            },
          },
        },
      });

      if (!deviceUsage) {
        throw new Error('Registro de uso no encontrado');
      }

      // Duración esperada: la del servicio o la estimada en el registro
      const appointmentDuration = deviceUsage.appointmentService?.estimatedDuration || 
                                 deviceUsage.appointmentService?.service.durationMinutes ||
                                 deviceUsage.estimatedMinutes;

      const actualUsage = deviceUsage.actualMinutes || 0;
      const exceedBy = actualUsage > appointmentDuration ? actualUsage - appointmentDuration : 0;

      return {
        compliant: exceedBy === 0,
        appointmentDuration,
        actualUsage,
        exceedBy: exceedBy > 0 ? exceedBy : undefined,
      };

    } catch (error) {
      console.error('Error en checkUsageCompliance:', error);
      return {
        compliant: true, // En caso de error, asumir cumplimiento
        appointmentDuration: 0,
        actualUsage: 0,
      };
    }
  }

  /**
   * Registrar alerta de posible fraude
   */
  private async registerFraudAlert(
    deviceUsageId: string, 
    compliance: {
      compliant: boolean;
      appointmentDuration: number;
      actualUsage: number;
      exceedBy?: number;
    }
  ): Promise<void> {
    try {
      const deviceUsage = await prisma.appointmentDeviceUsage.findUnique({
        where: { id: deviceUsageId },
        include: {
          appointment: {
            include: {
              person: true,
            },
          },
          equipment: true,
          startedByUser: true,
        },
      });

      if (!deviceUsage) return;

      // Crear registro en el log de cambios como alerta
      await prisma.entityChangeLog.create({
        data: {
          entityType: EntityType.APPOINTMENT,
          entityId: deviceUsage.appointmentId,
          userId: deviceUsage.startedByUserId,
          systemId: this.systemId,
          action: 'FRAUD_ALERT',
          details: {
            alertType: 'USAGE_EXCEEDED_APPOINTMENT',
            deviceUsageId: deviceUsageId,
            equipmentName: deviceUsage.equipment.name,
            clientName: deviceUsage.appointment.person?.firstName + ' ' + deviceUsage.appointment.person?.lastName,
            appointmentDuration: compliance.appointmentDuration,
            actualUsage: compliance.actualUsage,
            exceedByMinutes: compliance.exceedBy,
            startedBy: deviceUsage.startedByUser.firstName + ' ' + deviceUsage.startedByUser.lastName,
            metadata: {
              severity: compliance.exceedBy! > 30 ? 'HIGH' : 'MEDIUM',
              requiresReview: true,
            },
          },
        },
      });

      // Si es Gen 3, configurar LED de alerta
      const smartDevice = await prisma.smartPlugDevice.findFirst({
        where: {
          equipmentId: deviceUsage.equipmentId,
          systemId: this.systemId,
        },
        include: {
          credential: true,
        },
      });

      if (smartDevice?.generation === '3' && smartDevice.credential) {
        try {
          const client = await shellyDeviceClient.getClient({
            ...smartDevice,
            shellyCredential: smartDevice.credential,
          });
          await client.setAlertLED('fraud');
        } catch (error) {
          console.error('Error configurando LED de alerta:', error);
        }
      }

    } catch (error) {
      console.error('Error registrando alerta de fraude:', error);
    }
  }
}

// Singleton para cada sistema
const deviceControlServices = new Map<string, DeviceControlService>();

export function getDeviceControlService(systemId: string): DeviceControlService {
  if (!deviceControlServices.has(systemId)) {
    deviceControlServices.set(systemId, new DeviceControlService(systemId));
  }
  return deviceControlServices.get(systemId)!;
} 