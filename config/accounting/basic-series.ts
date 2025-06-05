// Series contables básicas por país y centro

export type SeriesTemplate = {
  documentType: 'TICKET' | 'INVOICE' | 'CREDIT_NOTE';
  prefix: string;
  suffix?: string;
  startNumber: number;
  resetPolicy: 'YEARLY' | 'NEVER';
  description: string;
};

// Plantillas de series por país
export const SERIES_TEMPLATES_BY_COUNTRY: Record<string, SeriesTemplate[]> = {
  ES: [
    {
      documentType: 'TICKET',
      prefix: 'T',
      startNumber: 1,
      resetPolicy: 'YEARLY',
      description: 'Tickets de venta'
    },
    {
      documentType: 'INVOICE', 
      prefix: 'F',
      startNumber: 1,
      resetPolicy: 'YEARLY',
      description: 'Facturas'
    },
    {
      documentType: 'CREDIT_NOTE',
      prefix: 'A',
      startNumber: 1,
      resetPolicy: 'YEARLY',
      description: 'Abonos'
    }
  ],
  FR: [
    {
      documentType: 'TICKET',
      prefix: 'TK',
      startNumber: 1,
      resetPolicy: 'YEARLY',
      description: 'Tickets de caisse'
    },
    {
      documentType: 'INVOICE',
      prefix: 'FA',
      startNumber: 1,
      resetPolicy: 'YEARLY',
      description: 'Factures'
    },
    {
      documentType: 'CREDIT_NOTE',
      prefix: 'AV',
      startNumber: 1,
      resetPolicy: 'YEARLY',
      description: 'Avoirs'
    }
  ],
  MA: [
    {
      documentType: 'TICKET',
      prefix: 'TC',
      startNumber: 1,
      resetPolicy: 'YEARLY',
      description: 'Tickets de caisse'
    },
    {
      documentType: 'INVOICE',
      prefix: 'FC',
      startNumber: 1,
      resetPolicy: 'YEARLY',
      description: 'Factures'
    },
    {
      documentType: 'CREDIT_NOTE',
      prefix: 'NC',
      startNumber: 1,
      resetPolicy: 'YEARLY',
      description: 'Notes de crédit'
    }
  ],
  MX: [
    {
      documentType: 'TICKET',
      prefix: 'TKT',
      startNumber: 1,
      resetPolicy: 'YEARLY',
      description: 'Tickets'
    },
    {
      documentType: 'INVOICE',
      prefix: 'FAC',
      startNumber: 1,
      resetPolicy: 'YEARLY',
      description: 'Facturas'
    },
    {
      documentType: 'CREDIT_NOTE',
      prefix: 'NC',
      startNumber: 1,
      resetPolicy: 'YEARLY',
      description: 'Notas de crédito'
    }
  ]
};

// Función para generar código de serie con código de clínica
export function generateSeriesCode(
  template: SeriesTemplate, 
  clinicCode: string,
  year?: number
): string {
  const yearSuffix = template.resetPolicy === 'YEARLY' && year ? `/${year}` : '';
  return `${template.prefix}-${clinicCode}${yearSuffix}`;
}

// Función para generar nombre de serie con nombre de clínica  
export function generateSeriesName(
  template: SeriesTemplate,
  clinicName: string
): string {
  return `${template.description} - ${clinicName}`;
}
