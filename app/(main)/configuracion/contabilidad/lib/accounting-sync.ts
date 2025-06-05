/**
 * Funciones para sincronizar la configuración contable cuando se asocian clínicas a sociedades
 */

import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { SERIES_TEMPLATES_BY_COUNTRY, generateSeriesCode } from '@/config/accounting';

/**
 * Genera un prefijo automático basado en el nombre de la clínica
 * - Si tiene múltiples palabras: primera consonante de cada palabra
 * - Si tiene una palabra: primeras 3 consonantes
 * - Si no hay suficientes consonantes: se completa con números aleatorios
 */
export function generateClinicPrefix(clinicName: string): string {
  const consonants = 'BCDFGHJKLMNPQRSTVWXYZ';
  const cleanName = clinicName.toUpperCase().replace(/[^A-Z\s]/g, '');
  const words = cleanName.split(/\s+/).filter(w => w.length > 0);
  
  let prefix = '';
  
  if (words.length > 1) {
    // Múltiples palabras: primera consonante de cada palabra
    for (const word of words) {
      const firstConsonant = word.split('').find(char => consonants.includes(char));
      if (firstConsonant) {
        prefix += firstConsonant;
        if (prefix.length >= 3) break;
      }
    }
  } else if (words.length === 1) {
    // Una palabra: primeras 3 consonantes
    const wordConsonants = words[0].split('').filter(char => consonants.includes(char));
    prefix = wordConsonants.slice(0, 3).join('');
  }
  
  // Si no tenemos suficientes caracteres, completar con números aleatorios
  while (prefix.length < 3) {
    prefix += Math.floor(Math.random() * 10).toString();
  }
  
  return prefix.slice(0, 4); // Máximo 4 caracteres
}

/**
 * Verifica si una clínica puede cambiar su prefijo
 * No se permite si ya tiene documentos emitidos (tickets o facturas)
 */
export async function canChangeClinicPrefix(clinicId: string): Promise<boolean> {
  // Verificar si hay tickets emitidos para esta clínica
  const ticketsCount = await prisma.ticket.count({
    where: {
      clinicId: clinicId
    }
  });
  
  // Verificar si hay facturas emitidas para esta clínica (a través de tickets)
  const invoicesCount = await prisma.invoice.count({
    where: {
      ticket: {
        clinicId: clinicId
      }
    }
  });
  
  return ticketsCount === 0 && invoicesCount === 0;
}

/**
 * Crea las series documentales para una clínica cuando se asocia a una sociedad
 * que ya tiene plan contable configurado
 */
export async function createSeriesForClinic(
  tx: Prisma.TransactionClient,
  clinicId: string,
  legalEntityId: string
) {
  // Verificar que la sociedad tenga plan contable
  const accountCount = await tx.chartOfAccountEntry.count({
    where: { legalEntityId }
  });
  
  if (accountCount === 0) {
    console.log('La sociedad no tiene plan contable configurado. No se crean series.');
    return 0;
  }
  
  // Obtener la sociedad para conocer el país
  const legalEntity = await tx.legalEntity.findUnique({
    where: { id: legalEntityId },
    select: { countryIsoCode: true, systemId: true }
  });
  
  if (!legalEntity) {
    throw new Error('Sociedad no encontrada');
  }
  
  // Obtener la clínica
  const clinic = await tx.clinic.findUnique({
    where: { id: clinicId },
    select: { id: true, prefix: true, name: true }
  });
  
  if (!clinic) {
    throw new Error('Clínica no encontrada');
  }
  
  const seriesTemplates = SERIES_TEMPLATES_BY_COUNTRY[legalEntity.countryIsoCode];
  if (!seriesTemplates) {
    console.log(`No hay plantillas de series para el país ${legalEntity.countryIsoCode}`);
    return 0;
  }
  
  const currentYear = new Date().getFullYear();
  const clinicCode = clinic.prefix || generateClinicPrefix(clinic.name);
  
  // Verificar series existentes para evitar duplicados
  const existingSeries = await tx.documentSeries.findMany({
    where: { 
      legalEntityId,
      clinicId: clinicId
    },
    select: { documentType: true }
  });
  
  const existingTypes = new Set(existingSeries.map(s => s.documentType));
  
  // Crear las series que faltan (incluyendo CREDIT_NOTE para rectificativas)
  const seriesToCreate = [];
  
  for (const template of seriesTemplates) {
    if (!existingTypes.has(template.documentType)) {
      const code = generateSeriesCode(template, clinicCode, currentYear);
      
      seriesToCreate.push({
        organizationId: legalEntity.systemId,
        legalEntityId,
        clinicId,
        code,
        documentType: template.documentType,
        prefix: `${template.prefix}-${clinicCode}`,
        padding: 6,
        nextNumber: template.startNumber,
        resetPolicy: template.resetPolicy,
        isActive: true
      });
    }
  }
  
  if (seriesToCreate.length > 0) {
    await tx.documentSeries.createMany({
      data: seriesToCreate
    });
    console.log(`Creadas ${seriesToCreate.length} series para la clínica ${clinic.name}`);
  }
  
  return seriesToCreate.length;
}

/**
 * Hook para ejecutar cuando se actualiza una clínica
 * Verifica si cambió la sociedad y crea las series necesarias
 */
export async function handleClinicLegalEntityChange(
  clinicId: string,
  oldLegalEntityId: string | null,
  newLegalEntityId: string | null
) {
  // Solo actuar si se está asignando una nueva sociedad
  if (!newLegalEntityId || oldLegalEntityId === newLegalEntityId) {
    return;
  }
  
  try {
    await prisma.$transaction(async (tx) => {
      await createSeriesForClinic(tx, clinicId, newLegalEntityId);
    });
  } catch (error) {
    console.error('Error al crear series para la clínica:', error);
    // No lanzamos el error para no bloquear la actualización de la clínica
  }
}

/**
 * Crea series para todas las clínicas de una sociedad
 * Útil después de configurar el plan contable
 */
export async function createSeriesForAllClinics(
  tx: Prisma.TransactionClient,
  legalEntityId: string
) {
  const clinics = await tx.clinic.findMany({
    where: { legalEntityId },
    select: { id: true }
  });
  
  let totalCreated = 0;
  for (const clinic of clinics) {
    const created = await createSeriesForClinic(tx, clinic.id, legalEntityId);
    totalCreated += created;
  }
  
  return totalCreated;
}
