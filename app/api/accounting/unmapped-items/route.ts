/**
 * API para obtener items sin mapear a cuentas contables
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type'); // category, payment-method, vat
    const legalEntityId = searchParams.get('legalEntityId');

    if (!type || !legalEntityId) {
      return NextResponse.json(
        { error: 'type y legalEntityId son requeridos' }, 
        { status: 400 }
      );
    }

    const systemId = session.user.systemId;

    switch (type) {
      case 'category':
        // Obtener categorías sin mapeo contable
        const categories = await prisma.category.findMany({
          where: {
            systemId,
            // No existe mapeo para esta categoría
            categoryAccountMappings: {
              none: {
                legalEntityId
              }
            }
          },
          include: {
            parent: true,
            children: {
              select: { id: true }
            },
            categoryAccountMappings: {
              where: {
                legalEntityId
              }
            }
          },
          orderBy: [
            { parentId: 'asc' },
            { name: 'asc' }
          ]
        });

        // Transformar las categorías al formato esperado
        const categoryMappings = categories.map(cat => {
          // Calcular el nivel de jerarquía
          let level = 0;
          let currentParent = cat.parent;
          while (currentParent) {
            level++;
            currentParent = null; // Por ahora solo un nivel
          }

          return {
            categoryId: cat.id,
            categoryName: cat.name,
            parentId: cat.parentId,
            hasChildren: cat.children.length > 0,
            level,
            currentAccountId: cat.categoryAccountMappings[0]?.accountId || null,
            // TODO: Implementar lógica de sugerencias basada en plantillas
            suggestedAccountId: null
          };
        });

        return NextResponse.json(categoryMappings);

      case 'payment-method':
        // Obtener métodos de pago sin mapeo contable
        const paymentMethods = await prisma.paymentMethodDefinition.findMany({
          where: {
            systemId,
            // No existe mapeo para este método de pago
            paymentMethodAccountMappings: {
              none: {
                legalEntityId
              }
            }
          },
          include: {
            paymentMethodAccountMappings: {
              where: {
                legalEntityId
              }
            }
          },
          orderBy: {
            name: 'asc'
          }
        });

        const paymentMappings = paymentMethods.map(pm => ({
          paymentMethodId: pm.id,
          paymentMethodName: pm.name,
          paymentMethodCode: pm.code,
          currentAccountId: pm.paymentMethodAccountMappings[0]?.accountId || null,
          // TODO: Implementar sugerencias basadas en el tipo de pago
          suggestedAccountId: null
        }));

        return NextResponse.json(paymentMappings);

      case 'vat':
        // Obtener tipos de IVA sin mapeo completo
        // TODO: Implementar modelo VATTypeAccountMapping
        const vatTypes = await prisma.vATType.findMany({
          where: {
            legalEntityId,
            // Por ahora obtener todos los tipos de IVA de la entidad legal
          },
          orderBy: {
            rate: 'asc'
          }
        });

        const vatMappings = vatTypes.map(vat => ({
          vatTypeId: vat.id,
          vatTypeName: vat.name,
          vatRate: vat.rate,
          // TODO: Cuando se implemente VATTypeAccountMapping, obtener las cuentas reales
          currentInputAccountId: null,
          currentOutputAccountId: null,
          // TODO: Sugerencias basadas en plantillas contables
          suggestedInputAccountId: null,
          suggestedOutputAccountId: null
        }));

        return NextResponse.json(vatMappings);

      default:
        return NextResponse.json(
          { error: 'Tipo no válido. Use: category, payment-method, o vat' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error fetching unmapped items:', error);
    return NextResponse.json(
      { error: 'Error al obtener elementos sin mapear' },
      { status: 500 }
    );
  }
} 