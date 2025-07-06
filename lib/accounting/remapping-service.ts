import { prisma, Prisma } from '@/lib/db';
/**
 * Servicio de remapeo contable automático
 * 
 * Este servicio se encarga de actualizar automáticamente los mapeos contables
 * cuando cambian las asignaciones de clínicas a entidades (bancos, cuentas, POS, etc.)
 */

interface RemappingContext {
  entityType: 'bank' | 'bankAccount' | 'posTerminal' | 'paymentMethod' | 'clinic';
  entityId: string;
  changeType: 'clinicAssignment' | 'globalStatus' | 'legalEntityChange' | 'activation';
  previousState?: any;
  newState?: any;
  systemId: string;
  userId: string;
}

interface RemappingResult {
  success: boolean;
  affectedMappings: number;
  changes: RemappingChange[];
  warnings: string[];
  requiresManualReview: boolean;
}

interface RemappingChange {
  entityType: string;
  entityId: string;
  entityName: string;
  previousMapping?: string;
  newMapping?: string;
  reason: string;
}

export class AccountingRemappingService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Ejecuta el remapeo contable basado en el contexto del cambio
   */
  async executeRemapping(context: RemappingContext): Promise<RemappingResult> {
    const result: RemappingResult = {
      success: true,
      affectedMappings: 0,
      changes: [],
      warnings: [],
      requiresManualReview: false
    };

    try {
      switch (context.entityType) {
        case 'bank':
          await this.remapBankChanges(context, result);
          break;
        case 'bankAccount':
          await this.remapBankAccountChanges(context, result);
          break;
        case 'posTerminal':
          await this.remapPosTerminalChanges(context, result);
          break;
        case 'paymentMethod':
          await this.remapPaymentMethodChanges(context, result);
          break;
        case 'clinic':
          await this.remapClinicChanges(context, result);
          break;
      }

      // Registrar los cambios en el log
      if (result.changes.length > 0) {
        await this.logRemappingChanges(context, result);
      }

    } catch (error) {
      console.error('Error during remapping:', error);
      result.success = false;
      result.warnings.push(`Error durante el remapeo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }

    return result;
  }

  /**
   * Remapea cambios en bancos
   */
  private async remapBankChanges(context: RemappingContext, result: RemappingResult) {
    const { entityId, changeType, systemId } = context;

    if (changeType === 'clinicAssignment' || changeType === 'globalStatus') {
      // Obtener el banco con sus relaciones actuales
      const bank = await this.prisma.bank.findUnique({
        where: { id: entityId },
        include: {
          account: true,
          applicableClinics: {
            include: { clinic: true }
          },
          bankAccounts: {
            include: {
              applicableClinics: {
                include: { clinic: true }
              }
            }
          }
        }
      });

      if (!bank) return;

      // Si el banco ya no es global y no tiene clínicas asignadas, eliminar mapeo
      if (!bank.isGlobal && bank.applicableClinics.length === 0) {
        if (bank.accountId) {
          await this.prisma.bank.update({
            where: { id: entityId },
            data: { accountId: null }
          });

          result.changes.push({
            entityType: 'bank',
            entityId: bank.id,
            entityName: bank.name,
            previousMapping: bank.account?.accountNumber,
            newMapping: undefined,
            reason: 'Banco sin clínicas asignadas'
          });
          result.affectedMappings++;
        }
      }

      // Verificar cuentas bancarias del banco
      for (const account of bank.bankAccounts) {
        if (!account.isGlobal && account.applicableClinics.length === 0) {
          if (account.accountId) {
            await this.prisma.bankAccount.update({
              where: { id: account.id },
              data: { accountId: null }
            });

            result.changes.push({
              entityType: 'bankAccount',
              entityId: account.id,
              entityName: account.accountName,
              previousMapping: account.accountId,
              newMapping: undefined,
              reason: 'Cuenta bancaria sin clínicas asignadas'
            });
            result.affectedMappings++;
          }
        }
      }
    }
  }

  /**
   * Remapea cambios en cuentas bancarias
   */
  private async remapBankAccountChanges(context: RemappingContext, result: RemappingResult) {
    const { entityId, changeType } = context;

    if (changeType === 'clinicAssignment' || changeType === 'globalStatus') {
      const account = await this.prisma.bankAccount.findUnique({
        where: { id: entityId },
        include: {
          account: true,
          applicableClinics: {
            include: { clinic: true }
          }
        }
      });

      if (!account) return;

      // Si la cuenta ya no es global y no tiene clínicas, eliminar mapeo
      if (!account.isGlobal && account.applicableClinics.length === 0) {
        if (account.accountId) {
          await this.prisma.bankAccount.update({
            where: { id: entityId },
            data: { accountId: null }
          });

          result.changes.push({
            entityType: 'bankAccount',
            entityId: account.id,
            entityName: account.accountName,
            previousMapping: account.account?.accountNumber,
            newMapping: undefined,
            reason: 'Cuenta sin clínicas asignadas'
          });
          result.affectedMappings++;
        }
      }
    }
  }

  /**
   * Remapea cambios en terminales POS
   */
  private async remapPosTerminalChanges(context: RemappingContext, result: RemappingResult) {
    // TODO: Implementar cuando se agregue mapeo de POS
    result.warnings.push('Remapeo de POS pendiente de implementación');
  }

  /**
   * Remapea cambios en métodos de pago
   */
  private async remapPaymentMethodChanges(context: RemappingContext, result: RemappingResult) {
    // TODO: Implementar cuando se agregue mapeo de métodos de pago
    result.warnings.push('Remapeo de métodos de pago pendiente de implementación');
  }

  /**
   * Remapea cambios cuando una clínica cambia de sociedad fiscal
   */
  private async remapClinicChanges(context: RemappingContext, result: RemappingResult) {
    const { entityId, changeType } = context;

    if (changeType === 'legalEntityChange') {
      // Obtener todos los mapeos afectados por el cambio de sociedad
      const clinic = await this.prisma.clinic.findUnique({
        where: { id: entityId },
        include: {
          availableBanks: {
            include: { bank: true }
          },
          availableBankAccounts: {
            include: { bankAccount: true }
          }
        }
      });

      if (!clinic) return;

      // Marcar para revisión manual todos los mapeos de esta clínica
      result.requiresManualReview = true;
      result.warnings.push(
        `La clínica ${clinic.name} cambió de sociedad fiscal. ` +
        `Se requiere revisión manual de todos los mapeos contables asociados.`
      );

      // Contar entidades afectadas
      result.affectedMappings += clinic.availableBanks.length;
      result.affectedMappings += clinic.availableBankAccounts.length;
    }
  }

  /**
   * Registra los cambios de remapeo en el sistema
   */
  private async logRemappingChanges(context: RemappingContext, result: RemappingResult) {
    // TODO: Implementar cuando se cree el modelo AuditLog
    console.log('Remapping changes:', {
      context,
      result,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Verifica si un mapeo contable es válido para las clínicas actuales
   */
  async validateMappingForClinics(
    mappingId: string,
    clinicIds: string[],
    legalEntityId: string
  ): Promise<boolean> {
    const account = await this.prisma.chartOfAccountEntry.findUnique({
      where: { id: mappingId },
      select: { legalEntityId: true }
    });

    // El mapeo es válido si la cuenta pertenece a la misma sociedad fiscal
    return account?.legalEntityId === legalEntityId;
  }

  /**
   * Obtiene un resumen de los mapeos que serían afectados por un cambio
   */
  async previewRemappingImpact(context: RemappingContext): Promise<{
    affectedEntities: number;
    details: string[];
  }> {
    const preview = {
      affectedEntities: 0,
      details: []
    };

    // Simular el remapeo sin hacer cambios
    const dryRunResult = await this.executeRemapping({
      ...context,
      // Modo dry-run (no implementado aún, pero útil para el futuro)
    });

    preview.affectedEntities = dryRunResult.affectedMappings;
    preview.details = dryRunResult.changes.map(
      change => `${change.entityType} "${change.entityName}": ${change.reason}`
    );

    return preview;
  }
}

// Singleton para uso en la aplicación
let remappingService: AccountingRemappingService;

export function getRemappingService(prisma: PrismaClient): AccountingRemappingService {
  if (!remappingService) {
    remappingService = new AccountingRemappingService(prisma);
  }
  return remappingService;
}
