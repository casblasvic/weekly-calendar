import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const legalEntityId = searchParams.get('legalEntityId');
    const systemId = searchParams.get('systemId');

    if (!legalEntityId) {
      return NextResponse.json(
        { error: 'Se requiere legalEntityId' },
        { status: 400 }
      );
    }

    // Obtener todas las clínicas de esta entidad legal
    const clinics = await prisma.clinic.findMany({
      where: {
        legalEntityId,
        ...(systemId && { id: systemId }),
      },
      include: {
        tariff: {
          include: {
            servicePrices: {
              include: {
                service: {
                  include: {
                    category: true,
                    settings: true,
                    serviceAccountMappings: {
                      where: {
                        legalEntityId,
                        ...(systemId && { systemId })
                      },
                      include: {
                        account: true,
                        clinic: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    // Agrupar servicios por clínica
    const servicesByClinic = clinics.map(clinic => {
      const services = clinic.tariff?.servicePrices.map(priceItem => {
        // Buscar el mapeo específico para esta clínica
        const mapping = priceItem.service.serviceAccountMappings.find(m => m.clinicId === clinic.id) || 
                       priceItem.service.serviceAccountMappings.find(m => !m.clinicId); // Si no hay mapeo específico, buscar el global
        
        return {
          id: priceItem.service.id,
          name: priceItem.service.name,
          categoryId: priceItem.service.categoryId,
          categoryName: priceItem.service.category?.name || null,
          isActive: priceItem.service.settings?.appearsInApp ?? true,
          price: priceItem.price,
          hasMapping: !!mapping,
          accountId: mapping?.accountId || null,
          accountCode: mapping?.account?.accountNumber || null,
          accountName: mapping?.account?.name || null,
          clinicId: clinic.id, // Añadir clinicId para debugging
        };
      }) || [];

      return {
        clinicId: clinic.id,
        clinicName: clinic.name,
        services: services
      };
    });

    // También obtener servicios globales del sistema sin tarifa específica
    const globalServices = await prisma.service.findMany({
      where: {
        systemId: clinics[0]?.systemId || session.user.systemId,
      },
      include: {
        category: true,
        settings: true,
        serviceAccountMappings: {
          where: {
            legalEntityId,
            ...(systemId && { systemId })
          },
          include: {
            account: true,
            clinic: true // Incluir información de la clínica
          }
        }
      }
    });

    // Filtrar servicios que no estén en ninguna tarifa
    const allTariffServiceIds = new Set(
      servicesByClinic.flatMap(clinic => 
        clinic.services.map(service => service.id)
      )
    );

    const unmappedGlobalServices = globalServices
      .filter(service => !allTariffServiceIds.has(service.id))
      .map(service => {
        // Para servicios globales, buscar mapeo sin clínica específica
        const mapping = service.serviceAccountMappings.find(m => !m.clinicId);
        return {
          id: service.id,
          name: service.name,
          categoryId: service.categoryId,
          categoryName: service.category?.name || null,
          isActive: service.settings?.appearsInApp ?? true,
          hasMapping: !!mapping,
          accountId: mapping?.accountId || null,
          accountCode: mapping?.account?.accountNumber || null,
          accountName: mapping?.account?.name || null,
        };
      });

    // Añadir información de debug sobre los mapeos
    console.log('[all-services-with-mappings] Total clínicas:', clinics.length);
    console.log('[all-services-with-mappings] Servicios por clínica:', servicesByClinic.map(c => ({
      clinic: c.clinicName,
      services: c.services.length,
      mapped: c.services.filter(s => s.hasMapping).length
    })));

    return NextResponse.json({
      items: servicesByClinic,
      globalServices: unmappedGlobalServices,
      totalServices: servicesByClinic.reduce((acc, clinic) => acc + clinic.services.length, 0) + unmappedGlobalServices.length
    });
  } catch (error) {
    console.error('Error obteniendo servicios con mapeos:', error);
    return NextResponse.json(
      { error: 'Error al obtener servicios con mapeos' },
      { status: 500 }
    );
  }
}
