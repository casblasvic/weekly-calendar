/**
 * Hook de Integración Contable
 * 
 * Proporciona funciones para integrar la contabilidad automática
 * en las operaciones del sistema
 */

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { JournalEntryService } from '@/services/accounting/JournalEntryService';

interface GenerateTicketJournalOptions {
  ticketId: string;
  showNotification?: boolean;
}

interface GeneratePaymentJournalOptions {
  paymentId: string;
  showNotification?: boolean;
}

interface GenerateCashSessionJournalOptions {
  cashSessionId: string;
  showNotification?: boolean;
}

export function useAccountingIntegration() {
  // Generar asiento para ticket
  const generateTicketJournal = useMutation({
    mutationFn: async ({ ticketId }: GenerateTicketJournalOptions) => {
      return await JournalEntryService.generateFromTicket(ticketId);
    },
    onSuccess: (data, variables) => {
      if (variables.showNotification !== false) {
        toast.success('Asiento contable generado para el ticket');
      }
    },
    onError: (error: Error, variables) => {
      console.error('Error generando asiento de ticket:', error);
      if (variables.showNotification !== false) {
        toast.error('Error al generar asiento contable');
      }
    }
  });

  // Generar asiento para pago
  const generatePaymentJournal = useMutation({
    mutationFn: async ({ paymentId }: GeneratePaymentJournalOptions) => {
      return await JournalEntryService.generateFromPayment(paymentId);
    },
    onSuccess: (data, variables) => {
      if (data && variables.showNotification !== false) {
        toast.success('Asiento contable generado para el pago');
      }
    },
    onError: (error: Error, variables) => {
      console.error('Error generando asiento de pago:', error);
      if (variables.showNotification !== false) {
        toast.error('Error al generar asiento contable');
      }
    }
  });

  // Generar asiento para cierre de caja
  const generateCashSessionJournal = useMutation({
    mutationFn: async ({ cashSessionId }: GenerateCashSessionJournalOptions) => {
      return await JournalEntryService.generateFromCashSession(cashSessionId);
    },
    onSuccess: (data, variables) => {
      if (variables.showNotification !== false) {
        toast.success('Asiento de cierre de caja generado');
      }
    },
    onError: (error: Error, variables) => {
      console.error('Error generando asiento de cierre:', error);
      if (variables.showNotification !== false) {
        toast.error('Error al generar asiento de cierre');
      }
    }
  });

  // Función para verificar si la contabilidad está configurada
  const checkAccountingSetup = async (legalEntityId: string): Promise<boolean> => {
    try {
      // Verificar que haya un plan contable
      const chartResponse = await fetch(
        `/api/chart-of-accounts?legalEntityId=${legalEntityId}&countOnly=true`
      );
      if (!chartResponse.ok) return false;
      const chartData = await chartResponse.json();
      if (chartData.count === 0) return false;

      // Verificar que haya ejercicio fiscal activo
      const fiscalResponse = await fetch(
        `/api/fiscal-years?legalEntityId=${legalEntityId}&status=OPEN`
      );
      if (!fiscalResponse.ok) return false;
      const fiscalData = await fiscalResponse.json();
      if (fiscalData.length === 0) return false;

      return true;
    } catch (error) {
      console.error('Error verificando configuración contable:', error);
      return false;
    }
  };

  // Función para procesar ticket con contabilidad
  const processTicketWithAccounting = async (
    ticketId: string,
    clinicLegalEntityId?: string
  ) => {
    if (!clinicLegalEntityId) {
      console.log('Clínica sin entidad legal, omitiendo contabilidad');
      return;
    }

    const isSetup = await checkAccountingSetup(clinicLegalEntityId);
    if (!isSetup) {
      console.log('Contabilidad no configurada, omitiendo generación de asiento');
      return;
    }

    await generateTicketJournal.mutateAsync({ 
      ticketId, 
      showNotification: false 
    });
  };

  // Función para procesar pago con contabilidad
  const processPaymentWithAccounting = async (
    paymentId: string,
    clinicLegalEntityId?: string
  ) => {
    if (!clinicLegalEntityId) {
      console.log('Clínica sin entidad legal, omitiendo contabilidad');
      return;
    }

    const isSetup = await checkAccountingSetup(clinicLegalEntityId);
    if (!isSetup) {
      console.log('Contabilidad no configurada, omitiendo generación de asiento');
      return;
    }

    await generatePaymentJournal.mutateAsync({ 
      paymentId, 
      showNotification: false 
    });
  };

  // Función para procesar cierre de caja con contabilidad
  const processCashSessionWithAccounting = async (
    cashSessionId: string,
    clinicLegalEntityId?: string
  ) => {
    if (!clinicLegalEntityId) {
      console.log('Clínica sin entidad legal, omitiendo contabilidad');
      return;
    }

    const isSetup = await checkAccountingSetup(clinicLegalEntityId);
    if (!isSetup) {
      console.log('Contabilidad no configurada, omitiendo generación de asiento');
      return;
    }

    await generateCashSessionJournal.mutateAsync({ 
      cashSessionId, 
      showNotification: true // Mostrar notificación para cierres de caja
    });
  };

  return {
    // Mutations directas
    generateTicketJournal,
    generatePaymentJournal,
    generateCashSessionJournal,
    
    // Funciones de procesamiento con verificación
    processTicketWithAccounting,
    processPaymentWithAccounting,
    processCashSessionWithAccounting,
    
    // Utilidades
    checkAccountingSetup,
    
    // Estados de carga
    isGeneratingTicketJournal: generateTicketJournal.isPending,
    isGeneratingPaymentJournal: generatePaymentJournal.isPending,
    isGeneratingCashSessionJournal: generateCashSessionJournal.isPending
  };
} 