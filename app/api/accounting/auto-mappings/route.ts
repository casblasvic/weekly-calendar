import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
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

    // Obtener solo las subcuentas analíticas (las que tienen punto en el número)
    const chartOfAccounts = await prisma.chartOfAccountEntry.findMany({
      where: {
        legalEntityId,
        ...(systemId && { systemId }),
        accountNumber: {
          contains: '.'
        }
      },
      select: {
        id: true,
        accountNumber: true,
        name: true,
        parentAccountId: true,
        level: true
      }
    });

    // Obtener cuentas padre en consulta separada
    const parentIds = [...new Set(chartOfAccounts.map(a => a.parentAccountId).filter(Boolean))];
    const parentAccounts = await prisma.chartOfAccountEntry.findMany({
      where: {
        id: { in: parentIds as string[] }
      },
      select: {
        id: true,
        accountNumber: true,
        name: true
      }
    });

    // Crear mapa de cuentas padre
    const parentMap = parentAccounts.reduce((acc, parent) => {
      acc[parent.id] = parent;
      return acc;
    }, {} as Record<string, any>);

    // Agrupar por cuenta padre
    const groupedByParent = chartOfAccounts.reduce((acc, account) => {
      const parentId = account.parentAccountId || 'root';
      if (!acc[parentId]) {
        acc[parentId] = {
          parent: parentMap[parentId] || null,
          accounts: []
        };
      }
      acc[parentId].accounts.push(account);
      return acc;
    }, {} as Record<string, { parent: any; accounts: any[] }>);

    // Calcular subcuentas por tipo basándose en los mapeos reales
    const subcuentasPorTipo = {
      categories: 0,
      products: 0,
      services: 0
    };

    // Contar subcuentas analíticas por tipo basándose en el código de la cuenta
    // Las subcuentas de categorías suelen empezar con 71 (ej: 712.01)
    // Las subcuentas de productos suelen empezar con 70 (ej: 701.01)
    // Las subcuentas de servicios suelen empezar con 70 (ej: 705.01)
    
    const analyticAccounts = chartOfAccounts.filter(account => 
      account.accountNumber.includes('.')
    );

    // Para un conteo más preciso, verificar las cuentas asociadas a los mapeos
    const categoryMappings = await prisma.categoryAccountMapping.findMany({
      where: {
        legalEntityId,
        ...(systemId && { systemId })
      },
      include: {
        category: true,
        account: {
          include: {
            parentAccount: true
          }
        }
      }
    });

    // Contar subcuentas creadas para categorías
    const categoryAccountNumbers = categoryMappings
      .map(m => m.account.accountNumber)
      .filter(num => num.includes('.'));
    
    subcuentasPorTipo.categories = categoryAccountNumbers.length;

    // Obtener mapeos de productos
    const productMappings = await prisma.productAccountMapping.findMany({
      where: {
        legalEntityId,
        ...(systemId && { systemId })
      },
      include: {
        product: true,
        account: {
          include: {
            parentAccount: true
          }
        }
      }
    });

    // Contar subcuentas creadas para productos
    const productAccountNumbers = productMappings
      .map(m => m.account.accountNumber)
      .filter(num => num.includes('.'));
    
    subcuentasPorTipo.products = productAccountNumbers.length;

    // Obtener mapeos de servicios
    const serviceMappings = await prisma.serviceAccountMapping.findMany({
      where: {
        legalEntityId,
        ...(systemId && { systemId })
      },
      include: {
        service: true,
        account: {
          include: {
            parentAccount: true
          }
        }
      }
    });

    // Contar subcuentas creadas para servicios
    const serviceAccountNumbers = serviceMappings
      .map(m => m.account.accountNumber)
      .filter(num => num.includes('.'));
    
    subcuentasPorTipo.services = serviceAccountNumbers.length;

    // Agrupar subcuentas analíticas por tipo basándose en los mapeos
    const categoriesGroup = {
      parent: categoryAccountNumbers.length > 0 && categoryMappings[0]?.account.parentAccount ? {
        accountNumber: categoryMappings[0].account.parentAccount.accountNumber,
        name: categoryMappings[0].account.parentAccount.name
      } : null,
      accounts: categoryMappings
        .filter(m => m.account.accountNumber.includes('.'))
        .map(m => ({
          id: m.account.id,
          accountNumber: m.account.accountNumber,
          name: m.account.name
        }))
    };

    const productsGroup = {
      parent: productAccountNumbers.length > 0 && productMappings[0]?.account.parentAccount ? {
        accountNumber: productMappings[0].account.parentAccount.accountNumber,
        name: productMappings[0].account.parentAccount.name
      } : null,
      accounts: productMappings
        .filter(m => m.account.accountNumber.includes('.'))
        .map(m => ({
          id: m.account.id,
          accountNumber: m.account.accountNumber,
          name: m.account.name
        }))
    };

    const servicesGroup = {
      parent: serviceAccountNumbers.length > 0 && serviceMappings[0]?.account.parentAccount ? {
        accountNumber: serviceMappings[0].account.parentAccount.accountNumber,
        name: serviceMappings[0].account.parentAccount.name
      } : null,
      accounts: serviceMappings
        .filter(m => m.account.accountNumber.includes('.'))
        .map(m => ({
          id: m.account.id,
          accountNumber: m.account.accountNumber,
          name: m.account.name
        }))
    };

    // Obtener mapeos de métodos de pago
    const paymentMethodMappings = await prisma.paymentMethodAccountMapping.findMany({
      where: {
        legalEntityId,
        ...(systemId && { systemId })
      },
      include: {
        paymentMethodDefinition: true,
        account: true
      }
    });

    // Obtener mapeos de IVA
    const vatMappings = await prisma.vATTypeAccountMapping.findMany({
      where: {
        legalEntityId
      },
      include: {
        vatType: true,
        inputAccount: true,
        outputAccount: true
      }
    });

    // Obtener mapeos de tipos de descuento
    const discountMappings = await prisma.discountTypeAccountMapping.findMany({
      where: {
        legalEntityId,
        ...(systemId && { systemId })
      },
      include: {
        account: true
      }
    });

    // Obtener mapeos de tipos de gasto
    const expenseMappings = await prisma.expenseType.findMany({
      where: {
        systemId,
        chartOfAccountEntryId: { not: null }
      }
    });

    // Obtener las cuentas de los gastos
    const expenseAccountIds = expenseMappings.map(e => e.chartOfAccountEntryId).filter(Boolean);
    const expenseAccounts = await prisma.chartOfAccountEntry.findMany({
      where: { id: { in: expenseAccountIds as string[] } }
    });
    const expenseAccountMap = new Map(expenseAccounts.map(a => [a.id, a]));

    // Obtener mapeos de sesiones de caja
    const cashSessionMappings = await prisma.cashSessionAccountMapping.findMany({
      where: {
        legalEntityId,
        ...(systemId && { systemId })
      },
      include: {
        account: true,
        clinic: true,
        posTerminal: true
      }
    });

    return NextResponse.json({
      autoGeneratedAccounts: {
        ...groupedByParent,
        categories: categoriesGroup,
        products: productsGroup,
        services: servicesGroup
      },
      directMappings: {
        categories: categoryMappings.map(m => ({
          id: m.id,
          categoryId: m.categoryId,
          categoryName: m.category.name,
          accountId: m.accountId,
          accountNumber: m.account.accountNumber,
          accountName: m.account.name,
          appliesToServices: m.appliesToServices,
          appliesToProducts: m.appliesToProducts
        })),
        products: productMappings.map(m => ({
          id: m.id,
          productId: m.productId,
          productName: m.product.name,
          accountId: m.accountId,
          accountNumber: m.account.accountNumber,
          accountName: m.account.name
        })),
        services: serviceMappings.map(m => ({
          id: m.id,
          serviceId: m.serviceId,
          serviceName: m.service.name,
          accountId: m.accountId,
          accountNumber: m.account.accountNumber,
          accountName: m.account.name
        })),
        paymentMethods: paymentMethodMappings.map(m => ({
          id: m.id,
          paymentMethodId: m.paymentMethodDefinitionId,
          paymentMethodName: m.paymentMethodDefinition.name,
          accountId: m.accountId,
          accountNumber: m.account.accountNumber,
          accountName: m.account.name
        })),
        vatTypes: vatMappings.map(m => ({
          id: m.id,
          vatTypeId: m.vatTypeId,
          vatTypeName: m.vatType.name,
          vatRate: m.vatType.rate,
          inputAccountId: m.inputAccountId,
          inputAccountNumber: m.inputAccount?.accountNumber,
          inputAccountName: m.inputAccount?.name,
          outputAccountId: m.outputAccountId,
          outputAccountNumber: m.outputAccount?.accountNumber,
          outputAccountName: m.outputAccount?.name
        })),
        discountTypes: discountMappings.map(d => ({
          id: d.id,
          discountTypeCode: d.discountTypeCode,
          discountTypeName: d.discountTypeName,
          accountId: d.accountId,
          accountNumber: d.account.accountNumber,
          accountName: d.account.name
        })),
        expenseTypes: expenseMappings.map(e => {
          const account = expenseAccountMap.get(e.chartOfAccountEntryId || '');
          return {
            id: e.id,
            name: e.name,
            accountId: e.chartOfAccountEntryId,
            accountNumber: account?.accountNumber,
            accountName: account?.name
          };
        }),
        cashSessions: cashSessionMappings.map(c => ({
          id: c.id,
          clinicId: c.clinicId,
          clinicName: c.clinic?.name,
          posTerminalId: c.posTerminalId,
          posTerminalName: c.posTerminal?.name,
          accountId: c.accountId,
          accountNumber: c.account.accountNumber,
          accountName: c.account.name
        }))
      },
      summary: {
        totalAutoAccounts: chartOfAccounts.length,
        totalCategories: categoryMappings.length,
        totalProducts: productMappings.length,
        totalServices: serviceMappings.length,
        totalPaymentMethods: paymentMethodMappings.length,
        totalVatTypes: vatMappings.length,
        totalDiscountTypes: discountMappings.length,
        totalExpenseTypes: expenseMappings.filter(e => e.chartOfAccountEntryId).length,
        totalCashSessions: cashSessionMappings.length
      }
    });
  } catch (error) {
    console.error('Error obteniendo mapeos automáticos:', error);
    return NextResponse.json(
      { error: 'Error al obtener mapeos automáticos' },
      { status: 500 }
    );
  }
}
