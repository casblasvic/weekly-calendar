/**
 * Tipos para el sistema de contabilidad internacional
 */

export interface MultiLanguageText {
  es?: string;
  fr?: string;
  en?: string;
  ar?: string;
  [key: string]: string | undefined;
}

export interface ChartOfAccountTemplateEntry {
  accountNumber: string;
  names: MultiLanguageText;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE' | 'COST_OF_GOODS_SOLD';
  description?: MultiLanguageText;
  isMonetary?: boolean;
  allowsDirectEntry?: boolean;
  level: number;
  parentNumber?: string;
  ifrsCode?: string;
  localCode?: string;
  vatCategory?: string;
  defaultForServices?: boolean;
  defaultForProducts?: boolean;
  serviceCategories?: string[];
  productCategories?: string[];
}

export interface ChartOfAccountTemplate {
  code: string;
  names: MultiLanguageText;
  description?: MultiLanguageText;
  level: number;
  countryIso?: string | null;
  version: string;
  isActive?: boolean;
  isSystem?: boolean;
  baseTemplateCode?: string;
  entries: ChartOfAccountTemplateEntry[];
}

export interface CountryTemplate extends ChartOfAccountTemplate {
  mappings: Record<string, string>;
}

export interface VATRate {
  code: string;
  name: MultiLanguageText;
  rate: number;
  type: 'STANDARD' | 'REDUCED' | 'SUPER_REDUCED' | 'ZERO' | 'EXEMPT';
  category?: string;
  isDefault?: boolean;
}

export interface CountryVATConfig {
  countryIso: string;
  rates: VATRate[];
  defaultRate: string;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: Date;
  description: string;
  reference?: string;
  lines: JournalEntryLine[];
  status: 'DRAFT' | 'POSTED' | 'REVERSED';
  createdAt: Date;
  updatedAt: Date;
}

export interface JournalEntryLine {
  id: string;
  accountId: string;
  accountNumber: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
  vatAmount?: number;
  vatRate?: number;
  order: number;
}

export interface AccountingIntegrationSettings {
  autoCreateJournalEntries: boolean;
  autoMapServices: boolean;
  autoMapProducts: boolean;
  defaultServiceAccount?: string;
  defaultProductAccount?: string;
  defaultCashAccount?: string;
  defaultBankAccount?: string;
  defaultCustomerAccount?: string;
  defaultSupplierAccount?: string;
}

// ============= NUEVOS TIPOS PARA SECTORES =============
/**
 * Enum para tipos de negocio soportados en el SaaS
 * Estos sectores están específicamente diseñados para clínicas estéticas y centros de belleza
 */
export enum BusinessSector {
  AESTHETIC_CLINIC = 'AESTHETIC_CLINIC',           // Clínica estética general
  BEAUTY_CENTER = 'BEAUTY_CENTER',                 // Centro de belleza y peluquería
  SPA_WELLNESS = 'SPA_WELLNESS',                   // Spa y centro de bienestar
  MEDICAL_CENTER = 'MEDICAL_CENTER',               // Centro médico privado
  PHYSIOTHERAPY_CENTER = 'PHYSIOTHERAPY_CENTER',   // Centro de fisioterapia
  DENTAL_CLINIC = 'DENTAL_CLINIC'                  // Clínica dental (futuro)
}

/**
 * Interface para definir las personalizaciones específicas de cada sector
 */
export interface SectorTemplate {
  sector: BusinessSector;
  names: MultiLanguageText;
  description: MultiLanguageText;
  accountCustomizations: {
    // Cuentas adicionales específicas del sector
    additionalAccounts?: ChartOfAccountTemplateEntry[];
    // Modificaciones a cuentas existentes (ej: cambiar nombres)
    accountModifications?: Record<string, Partial<ChartOfAccountTemplateEntry>>;
    // Mapeos predeterminados servicio/producto -> cuenta contable
    defaultMappings?: {
      services: Record<string, string>; // categoría servicio -> número cuenta
      products: Record<string, string>; // categoría producto -> número cuenta
    };
  };
}

/**
 * Interface para la combinación de plantilla país + sector
 */
export interface CountrySectorTemplate {
  countryIso: string;
  sector: BusinessSector;
  baseTemplateCode: string; // Referencia a la plantilla país base
  sectorTemplateCode: string; // Referencia a la plantilla sector
  template: ChartOfAccountTemplate; // Plantilla combinada resultante
}
// ============= FIN NUEVOS TIPOS PARA SECTORES ============= 