/**
 * 🆔 VALIDACIÓN Y GESTIÓN DE IDENTIDAD DE PERSONAS
 * Sistema avanzado para prevenir duplicados y gestionar identidades únicas.
 * 
 * ACTUALIZADO: Ahora usa el sistema de contactos múltiples (PersonContact)
 * en lugar de los campos únicos email/phone de Person.
 * 
 * ESTRATEGIA DE VALIDACIÓN JERÁRQUICA:
 * 1. Email (prioridad más alta si existe)
 * 2. Teléfono (si no hay email)
 * 3. ID Nacional (si no hay email ni teléfono)
 * 4. Nombre + Apellido + Fecha nacimiento (último recurso)
 * 
 * CASOS ESPECIALES:
 * - Contact proxy para menores o personas sin contacto
 * - Múltiples contactos por persona
 * - Detección inteligente de duplicados
 * 
 * @see docs/PERSON_IDENTITY_MANAGEMENT.md
 */

import { prisma } from '@/lib/db';
import { ContactType } from '@prisma/client';
import { getEffectiveContactData, detectPotentialDuplicates } from './person-contacts';

// ===== TIPOS Y INTERFACES =====

export interface PersonSearchCriteria {
  email?: string;
  phone?: string;
  nationalId?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: Date;
  systemId: string;
}

export interface DuplicateValidationResult {
  isValid: boolean;
  duplicateFound?: any;
  conflictReason?: string;
  suggestedAction?: 'merge' | 'update' | 'create_new';
}

// ===== FUNCIONES HELPER =====

/**
 * Busca una persona usando la estrategia jerárquica de validación
 * SIN depender de constraints únicos en la base de datos
 */
export async function findPersonByHierarchicalSearch(criteria: PersonSearchCriteria): Promise<any | null> {
  const { email, phone, nationalId, firstName, lastName, birthDate, systemId } = criteria;

  // 1. PRIORIDAD 1: Buscar por email (si existe)
  if (email) {
    const personByEmail = await prisma.person.findFirst({
      where: {
        systemId,
        email: email
      }
    });
    if (personByEmail) {
      return personByEmail;
    }
  }

  // 2. PRIORIDAD 2: Buscar por teléfono (si no hay email)
  if (phone && !email) {
    const personByPhone = await prisma.person.findFirst({
      where: {
        systemId,
        phone: phone
      }
    });
    if (personByPhone) {
      return personByPhone;
    }
  }

  // 3. PRIORIDAD 3: Buscar por ID nacional (si no hay email ni teléfono)
  if (nationalId && !email && !phone) {
    const personByNationalId = await prisma.person.findFirst({
      where: {
        systemId,
        nationalId: nationalId
      }
    });
    if (personByNationalId) {
      return personByNationalId;
    }
  }

  // 4. PRIORIDAD 4: Buscar por nombre + apellido + fecha nacimiento (último recurso)
  if (firstName && lastName && birthDate && !email && !phone && !nationalId) {
    const personByNameAndBirth = await prisma.person.findFirst({
      where: {
        systemId,
        firstName: firstName,
        lastName: lastName,
        birthDate: birthDate
      }
    });
    if (personByNameAndBirth) {
      return personByNameAndBirth;
    }
  }

  return null;
}

/**
 * Crea o actualiza una persona usando upsert inteligente
 */
export async function upsertPersonSafely(personData: any): Promise<any> {
  // Buscar persona existente usando la estrategia jerárquica
  const existingPerson = await findPersonByHierarchicalSearch({
    email: personData.email,
    phone: personData.phone,
    nationalId: personData.nationalId,
    firstName: personData.firstName,
    lastName: personData.lastName,
    birthDate: personData.birthDate,
    systemId: personData.systemId
  });

  // Preparar datos para Prisma (quitar systemId y usar relación system)
  const { systemId, ...prismaData } = personData;
  const finalData = {
    ...prismaData,
    system: { connect: { id: systemId } }
  };

  if (existingPerson) {
    // Actualizar persona existente
    return await prisma.person.update({
      where: { id: existingPerson.id },
      data: finalData
    });
  } else {
    // Crear nueva persona
    return await prisma.person.create({
      data: finalData
    });
  }
}

/**
 * Valida si una persona puede ser creada sin generar duplicados
 */
export async function validatePersonUniqueness(
  personData: PersonSearchCriteria
): Promise<DuplicateValidationResult> {
  const existingPerson = await findPersonByHierarchicalSearch(personData);
  
  if (existingPerson) {
    return {
      isValid: false,
      duplicateFound: existingPerson,
      conflictReason: 'Persona ya existe con los mismos datos de identificación',
      suggestedAction: 'update'
    };
  }

  return {
    isValid: true
  };
}

// ===== FUNCIONES EXISTENTES ACTUALIZADAS =====

/**
 * Busca personas que puedan actuar como contact proxy para otra
 */
export async function findPotentialContactProxies(
  targetPersonId: string,
  systemId: string
): Promise<Array<{
  person: any;
  relationship?: string;
  suggestedPermissions: {
    canSchedule: boolean;
    canPayment: boolean;
    canMedicalInfo: boolean;
  };
}>> {
  // Buscar relaciones familiares existentes
  const relationships = await prisma.personRelationship.findMany({
    where: {
      OR: [
        { personId: targetPersonId },
        { relatedPersonId: targetPersonId }
      ],
      systemId,
      isActive: true
    },
    include: {
      person: true,
      relatedPerson: true
    }
  });

  const potentialProxies = [];

  for (const rel of relationships) {
    const isSource = rel.personId === targetPersonId;
    const proxyPerson = isSource ? rel.relatedPerson : rel.person;
    const relationshipType = rel.relationshipType;

    // Determinar permisos sugeridos basados en el tipo de relación
    let suggestedPermissions = {
      canSchedule: false,
      canPayment: false,
      canMedicalInfo: false
    };

    switch (relationshipType?.toLowerCase()) {
      case 'parent':
      case 'madre':
      case 'padre':
        suggestedPermissions = {
          canSchedule: true,
          canPayment: true,
          canMedicalInfo: true
        };
        break;
      case 'spouse':
      case 'esposo':
      case 'esposa':
        suggestedPermissions = {
          canSchedule: true,
          canPayment: true,
          canMedicalInfo: false
        };
        break;
      case 'sibling':
      case 'hermano':
      case 'hermana':
        suggestedPermissions = {
          canSchedule: true,
          canPayment: false,
          canMedicalInfo: false
        };
        break;
      default:
        suggestedPermissions = {
          canSchedule: false,
          canPayment: false,
          canMedicalInfo: false
        };
    }

    potentialProxies.push({
      person: proxyPerson,
      relationship: relationshipType,
      suggestedPermissions
    });
  }

  return potentialProxies;
}

/**
 * Obtiene los datos de contacto efectivos para una persona
 * (propios o a través de contact proxy)
 */
export async function getEffectivePersonContactData(
  personId: string,
  systemId: string
): Promise<{
  email?: string;
  phone?: string;
  whatsapp?: string;
  isProxy: boolean;
  proxyPersonId?: string;
  proxyRelationship?: string;
}> {
  // Primero intentar obtener contactos directos de la persona
  const directContacts = await prisma.personContact.findMany({
    where: {
      personId,
      systemId
    },
    orderBy: [
      { isPreferred: 'desc' },
      { lastUsedAt: 'desc' },
      { createdAt: 'desc' }
    ]
  });

  if (directContacts.length > 0) {
    const result: any = { isProxy: false };
    
    // Obtener el email preferido
    const emailContact = directContacts.find(c => c.contactType === 'EMAIL');
    if (emailContact) result.email = emailContact.contactValue;
    
    // Obtener el teléfono preferido
    const phoneContact = directContacts.find(c => c.contactType === 'PHONE');
    if (phoneContact) result.phone = phoneContact.contactValue;
    
    // Obtener WhatsApp preferido
    const whatsappContact = directContacts.find(c => c.contactType === 'WHATSAPP');
    if (whatsappContact) result.whatsapp = whatsappContact.contactValue;
    
    return result;
  }

  // Si no hay contactos directos, buscar contact proxy
  const proxyConfig = await prisma.personContactProxy.findFirst({
    where: {
      targetPersonId: personId,
      systemId,
      isActive: true,
      canReceiveInfo: true
    },
    include: {
      sourcePerson: {
        include: {
          contacts: {
            orderBy: [
              { isPreferred: 'desc' },
              { lastUsedAt: 'desc' }
            ]
          }
        }
      }
    }
  });

  if (proxyConfig && proxyConfig.sourcePerson.contacts.length > 0) {
    const proxyContacts = proxyConfig.sourcePerson.contacts;
    const result: any = { 
      isProxy: true, 
      proxyPersonId: proxyConfig.sourcePersonId,
      proxyRelationship: proxyConfig.relationshipType 
    };
    
    const emailContact = proxyContacts.find(c => c.contactType === 'EMAIL');
    if (emailContact) result.email = emailContact.contactValue;
    
    const phoneContact = proxyContacts.find(c => c.contactType === 'PHONE');
    if (phoneContact) result.phone = phoneContact.contactValue;
    
    const whatsappContact = proxyContacts.find(c => c.contactType === 'WHATSAPP');
    if (whatsappContact) result.whatsapp = whatsappContact.contactValue;
    
    return result;
  }

  return { isProxy: false };
} 