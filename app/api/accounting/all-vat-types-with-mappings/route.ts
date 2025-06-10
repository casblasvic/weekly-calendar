import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma as db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const legalEntityId = searchParams.get('legalEntityId');

    if (!legalEntityId) {
      return NextResponse.json(
        { error: 'legalEntityId es requerido' },
        { status: 400 }
      );
    }

    // Primero obtener la entidad legal para obtener el systemId
    const legalEntity = await db.legalEntity.findUnique({
      where: { id: legalEntityId },
      select: { systemId: true }
    });

    if (!legalEntity) {
      return NextResponse.json(
        { error: 'Entidad legal no encontrada' },
        { status: 404 }
      );
    }

    // Obtener todos los tipos de IVA del sistema
    const vatTypes = await db.vATType.findMany({
      where: {
        systemId: legalEntity.systemId
      },
      orderBy: {
        name: 'asc'
      }
    });

    console.log('VAT Types found:', vatTypes.length);
    console.log('VAT Types:', vatTypes);

    // Obtener todos los mapeos de IVA (globales y por clínica)
    const vatMappings = await db.vATTypeAccountMapping.findMany({
      where: {
        systemId: legalEntity.systemId
      },
      include: {
        inputAccount: true,
        outputAccount: true,
        clinic: true
      }
    });

    // Obtener todas las clínicas de la entidad legal
    const clinics = await db.clinic.findMany({
      where: {
        legalEntityId: legalEntityId,
        isActive: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Crear un mapa de mapeos por vatTypeId y clinicId
    const mappingsByVatTypeAndClinic = new Map<string, any>();
    const globalMappingsByVatType = new Map<string, any>();

    vatMappings.forEach(mapping => {
      const key = mapping.clinicId 
        ? `${mapping.vatTypeId}-${mapping.clinicId}`
        : mapping.vatTypeId;
      
      if (mapping.clinicId) {
        mappingsByVatTypeAndClinic.set(key, mapping);
      } else {
        globalMappingsByVatType.set(mapping.vatTypeId, mapping);
      }
    });

    // Estructurar la respuesta con tipos de IVA globales y por clínica
    const globalVatTypes = vatTypes.map(vatType => {
      const globalMapping = globalMappingsByVatType.get(vatType.id);
      return {
        ...vatType,
        inputAccountId: globalMapping?.inputAccountId || null,
        outputAccountId: globalMapping?.outputAccountId || null,
        inputAccount: globalMapping?.inputAccount || null,
        outputAccount: globalMapping?.outputAccount || null,
        isMapped: !!(globalMapping?.inputAccountId || globalMapping?.outputAccountId)
      };
    });

    // Estructurar tipos de IVA por clínica
    const clinicsWithVatTypes = clinics.map(clinic => {
      const clinicVatTypes = vatTypes.map(vatType => {
        const clinicMapping = mappingsByVatTypeAndClinic.get(`${vatType.id}-${clinic.id}`);
        const globalMapping = globalMappingsByVatType.get(vatType.id);
        
        // Si hay mapeo específico de clínica, usarlo; si no, usar el global
        const effectiveMapping = clinicMapping || globalMapping;
        
        return {
          ...vatType,
          inputAccountId: effectiveMapping?.inputAccountId || null,
          outputAccountId: effectiveMapping?.outputAccountId || null,
          inputAccount: effectiveMapping?.inputAccount || null,
          outputAccount: effectiveMapping?.outputAccount || null,
          isMapped: !!(effectiveMapping?.inputAccountId || effectiveMapping?.outputAccountId),
          isClinicSpecific: !!clinicMapping
        };
      });

      const mappedCount = clinicVatTypes.filter(vt => vt.isMapped).length;
      const unmappedCount = clinicVatTypes.filter(vt => !vt.isMapped).length;

      return {
        clinic,
        vatTypes: clinicVatTypes,
        mappedCount,
        unmappedCount,
        totalCount: clinicVatTypes.length
      };
    });

    return NextResponse.json({
      globalVatTypes,
      clinics: clinicsWithVatTypes,
      totalVatTypes: vatTypes.length
    });

  } catch (error) {
    console.error('Error al obtener tipos de IVA con mapeos:', error);
    return NextResponse.json(
      { error: 'Error al obtener tipos de IVA con mapeos' },
      { status: 500 }
    );
  }
}
