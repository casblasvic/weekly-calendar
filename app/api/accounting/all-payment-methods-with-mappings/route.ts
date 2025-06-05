/**
 * API para obtener todos los métodos de pago del sistema con sus mapeos contables
 * (si existen) para una entidad legal específica
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerAuthSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getServerAuthSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const systemId = searchParams.get('systemId');
  const legalEntityId = searchParams.get('legalEntityId');

  if (!systemId || !legalEntityId) {
    return NextResponse.json(
      { error: 'systemId y legalEntityId son requeridos' },
      { status: 400 }
    );
  }

  try {
    console.log('[API] all-payment-methods-with-mappings - params:', { systemId, legalEntityId });

    // 1. Obtener TODOS los métodos de pago del sistema
    const allPaymentMethods = await prisma.paymentMethodDefinition.findMany({
      where: {
        systemId
      },
      include: {
        paymentMethodAccountMappings: {
          where: {
            legalEntityId
          }
        }
      }
    });

    console.log('[API] Found', allPaymentMethods.length, 'payment methods in system');

    // 2. Obtener las configuraciones específicas de clínica
    const clinicSettings = await prisma.clinicPaymentSetting.findMany({
      where: {
        clinic: {
          legalEntityId
        }
      },
      include: {
        clinic: true
      }
    });

    console.log('[API] Found', clinicSettings.length, 'clinic payment settings');

    // 3. Crear un mapa de métodos por clínica
    const clinicMethodsMap = new Map<string, Set<string>>();
    
    clinicSettings.forEach(setting => {
      const clinicId = setting.clinicId;
      if (!clinicMethodsMap.has(clinicId)) {
        clinicMethodsMap.set(clinicId, new Set());
      }
      clinicMethodsMap.get(clinicId)!.add(setting.paymentMethodDefinitionId);
    });

    // 4. Formatear la respuesta
    const globalMethods = allPaymentMethods.map(method => ({
      id: method.id,
      name: method.name,
      code: method.code,
      type: method.type,
      isGlobal: true,
      isMapped: method.paymentMethodAccountMappings.length > 0,
      currentAccountId: method.paymentMethodAccountMappings[0]?.accountId || null,
      isActive: method.isActive
    }));

    // 5. Agrupar por clínica
    const clinicGroups: any[] = [];
    
    // Obtener información de las clínicas
    const clinicIds = Array.from(clinicMethodsMap.keys());
    if (clinicIds.length > 0) {
      const clinics = await prisma.clinic.findMany({
        where: {
          id: { in: clinicIds }
        }
      });

      clinics.forEach(clinic => {
        const methodIds = clinicMethodsMap.get(clinic.id) || new Set();
        const clinicMethods = allPaymentMethods
          .filter(method => methodIds.has(method.id))
          .map(method => ({
            id: method.id,
            name: method.name,
            code: method.code,
            type: method.type,
            isGlobal: false,
            isMapped: method.paymentMethodAccountMappings.length > 0,
            currentAccountId: method.paymentMethodAccountMappings[0]?.accountId || null,
            isActive: method.isActive
          }));

        if (clinicMethods.length > 0) {
          clinicGroups.push({
            clinicId: clinic.id,
            clinicName: clinic.name,
            paymentMethods: clinicMethods
          });
        }
      });
    }

    const response = {
      global: globalMethods,
      clinics: clinicGroups
    };

    console.log('[API] Response:', {
      globalMethodsCount: globalMethods.length,
      clinicsCount: clinicGroups.length
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error loading all payment methods:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
