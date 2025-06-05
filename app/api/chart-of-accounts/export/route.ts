import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

// Función para convertir datos a CSV
function toCSV(data: any[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      // Escapar valores que contengan comas o comillas
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value ?? '';
    }).join(',');
  });
  
  return [csvHeaders, ...csvRows].join('\n');
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { accountIds, legalEntityId, systemId, includeSubaccounts = false } = body;

    if (!legalEntityId || !systemId) {
      return NextResponse.json(
        { error: "Entidad legal y sistema requeridos" },
        { status: 400 }
      );
    }

    let allAccountIds = accountIds || [];

    // Si no se especifican IDs, exportar todas las cuentas
    if (!accountIds || accountIds.length === 0) {
      const allAccounts = await prisma.chartOfAccountEntry.findMany({
        where: {
          systemId,
          legalEntityId,
        },
        select: { id: true }
      });
      allAccountIds = allAccounts.map(a => a.id);
    }

    // Si se incluyen subcuentas, obtenerlas recursivamente
    if (includeSubaccounts && allAccountIds.length > 0) {
      const accountsWithSubs = await prisma.chartOfAccountEntry.findMany({
        where: {
          id: { in: allAccountIds },
          systemId,
          legalEntityId,
        },
        include: {
          subAccounts: {
            include: {
              subAccounts: {
                include: {
                  subAccounts: {
                    include: {
                      subAccounts: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      // Función recursiva para obtener todos los IDs
      const getAllDescendantIds = (account: any): string[] => {
        let ids = [account.id];
        if (account.subAccounts && account.subAccounts.length > 0) {
          for (const child of account.subAccounts) {
            ids = ids.concat(getAllDescendantIds(child));
          }
        }
        return ids;
      };

      // Obtener todos los IDs incluyendo subcuentas
      allAccountIds = [];
      for (const account of accountsWithSubs) {
        allAccountIds = allAccountIds.concat(getAllDescendantIds(account));
      }
      allAccountIds = [...new Set(allAccountIds)];
    }

    // Usar streaming para manejar grandes cantidades de datos
    const BATCH_SIZE = 1000;
    const batches = [];
    for (let i = 0; i < allAccountIds.length; i += BATCH_SIZE) {
      batches.push(allAccountIds.slice(i, i + BATCH_SIZE));
    }

    const allAccounts = [];
    
    // Procesar por lotes para evitar problemas de memoria
    for (const batch of batches) {
      const accounts = await prisma.chartOfAccountEntry.findMany({
        where: {
          id: { in: batch },
          systemId,
          legalEntityId,
        },
        select: {
          accountNumber: true,
          name: true,
          type: true,
          description: true,
          isActive: true,
          level: true,
          isSubAccount: true,
          parentAccount: {
            select: {
              accountNumber: true,
              name: true
            }
          }
        },
        orderBy: [
          { accountNumber: 'asc' },
          { level: 'asc' }
        ]
      });

      // Transformar datos para CSV
      const transformedAccounts = accounts.map(account => ({
        'Número de Cuenta': account.accountNumber,
        'Nombre': account.name,
        'Tipo': account.type,
        'Descripción': account.description || '',
        'Activa': account.isActive ? 'Sí' : 'No',
        'Nivel': account.level,
        'Es Subcuenta': account.isSubAccount ? 'Sí' : 'No',
        'Cuenta Padre': account.parentAccount ? 
          `${account.parentAccount.accountNumber} - ${account.parentAccount.name}` : ''
      }));

      allAccounts.push(...transformedAccounts);
    }

    // Generar CSV
    const csv = toCSV(allAccounts);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    
    // Crear respuesta con headers apropiados
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="plan_contable_${new Date().toISOString().split('T')[0]}.csv"`,
        'Content-Type': 'text/csv;charset=utf-8;',
      },
    });

  } catch (error) {
    console.error("Error en exportación:", error);
    
    return NextResponse.json(
      { 
        error: "Error al exportar las cuentas", 
        details: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    );
  }
}
