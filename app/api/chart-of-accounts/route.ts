import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AccountType } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const systemId = searchParams.get('systemId') || session.user.systemId;
    const legalEntityId = searchParams.get('legalEntityId');
    
    // Parámetros opcionales para filtrado (solo si se pasan explícitamente)
    const type = searchParams.get('type') as AccountType | null;
    const parentAccountId = searchParams.get('parentAccountId');
    
    console.log('API chart-of-accounts - params:', {
      systemId,
      legalEntityId,
      type,
      parentAccountId
    });

    if (!legalEntityId) {
      return NextResponse.json({ error: "legalEntityId es requerido" }, { status: 400 });
    }

    // Construir el objeto where - siempre incluir systemId y legalEntityId
    const whereClause: any = {
      systemId,
      legalEntityId
    };
    
    // Solo agregar filtros opcionales si se pasan
    if (type) {
      whereClause.type = type;
    }
    
    if (parentAccountId) {
      whereClause.parentAccountId = parentAccountId;
    }

    // Obtener TODAS las cuentas del plan contable para esta entidad
    const accounts = await prisma.chartOfAccountEntry.findMany({
      where: whereClause,
      orderBy: [
        { accountNumber: 'asc' }
      ],
      include: {
        parentAccount: true,
        subAccounts: {
          orderBy: {
            accountNumber: 'asc'
          },
          include: {
            subAccounts: {
              orderBy: {
                accountNumber: 'asc'
              }
            }
          }
        }
      }
    });
    
    console.log(`API chart-of-accounts - found ${accounts.length} accounts`);
    
    // Log de algunas cuentas con subcuentas para debug
    const accountsWithSubaccounts = accounts.filter(a => a.subAccounts && a.subAccounts.length > 0);
    console.log(`Accounts with subaccounts: ${accountsWithSubaccounts.length}`);
    if (accountsWithSubaccounts.length > 0) {
      console.log('Example account with subaccounts:', {
        id: accountsWithSubaccounts[0].id,
        accountNumber: accountsWithSubaccounts[0].accountNumber,
        name: accountsWithSubaccounts[0].name,
        subAccountsCount: accountsWithSubaccounts[0].subAccounts.length,
        subAccountNumbers: accountsWithSubaccounts[0].subAccounts.map(s => s.accountNumber)
      });
    }

    // Si se especifica parentAccountId, devolver la lista plana
    if (parentAccountId) {
      return NextResponse.json(accounts);
    }

    // Construir estructura jerárquica solo con cuentas raíz (sin padre)
    const rootAccounts = accounts.filter(account => !account.parentAccountId);
    console.log(`Root accounts: ${rootAccounts.length}`);
    
    // Función para recolectar todas las cuentas de forma plana (incluyendo subcuentas)
    const collectAllAccounts = (accountList: any[]): any[] => {
      const allAccounts: any[] = [];
      const processedIds = new Set<string>();
      
      const processAccount = (account: any) => {
        // Evitar duplicados
        if (processedIds.has(account.id)) {
          return;
        }
        processedIds.add(account.id);
        
        // Agregar la cuenta actual
        allAccounts.push(account);
        
        // Procesar subcuentas si existen
        if (account.subAccounts && account.subAccounts.length > 0) {
          account.subAccounts.forEach(processAccount);
        }
      };
      
      accountList.forEach(processAccount);
      
      return allAccounts;
    };
    
    // Recolectar todas las cuentas de forma plana
    const flatAccounts = collectAllAccounts(accounts);
    console.log(`[ChartOfAccounts] Total flat accounts: ${flatAccounts.length}`);
    console.log(`[ChartOfAccounts] Subaccounts in flat list: ${flatAccounts.filter(a => a.isSubAccount || a.parentAccountId).length}`);
    
    // Crear un mapa de cuentas para acceso rápido
    const accountMap = new Map();
    accounts.forEach(account => {
      accountMap.set(account.id, {
        ...account,
        subAccounts: account.subAccounts || []
      });
    });

    // Función recursiva para construir la jerarquía completa
    const buildHierarchy = (accountId: string): any => {
      const account = accountMap.get(accountId);
      if (!account) return null;
      
      // Buscar todas las subcuentas directas
      const directChildren = accounts.filter(a => a.parentAccountId === accountId);
      
      // Transformar subAccounts a subRows para compatibilidad con la tabla
      const transformedAccount = {
        ...account,
        subRows: directChildren.map(child => buildHierarchy(child.id)).filter(Boolean)
      };
      
      // Eliminar subAccounts para evitar redundancia
      delete transformedAccount.subAccounts;
      
      return transformedAccount;
    };

    // Construir la jerarquía completa
    const hierarchicalAccounts = rootAccounts.map(account => buildHierarchy(account.id)).filter(Boolean);
    
    console.log('Hierarchical accounts sample:', {
      totalRoot: hierarchicalAccounts.length,
      firstAccountWithSubs: hierarchicalAccounts.find(a => a.subRows && a.subRows.length > 0)
    });

    // Para mantener compatibilidad:
    // - Si no se pide un tipo específico ni parentAccountId, devolver el array directo para la tabla
    // - Si se pide desde el mapping configurator (que necesita la lista plana), detectarlo y devolver el objeto
    const isFromMappingConfigurator = request.headers.get('x-from-mapping') === 'true';
    
    if (isFromMappingConfigurator || type) {
      // Para el configurador de mapeos o cuando hay filtros, devolver estructura completa
      const response = {
        flat: flatAccounts,
        hierarchical: hierarchicalAccounts
      };
      return NextResponse.json(response);
    }
    
    // Para la tabla del plan contable, devolver solo la estructura jerárquica (cuentas raíz con subcuentas anidadas)
    return NextResponse.json(hierarchicalAccounts);

  } catch (error) {
    console.error("Error fetching chart of accounts:", error);
    return NextResponse.json(
      { error: "Error al obtener el plan de cuentas" },
      { status: 500 }
    );
  }
}