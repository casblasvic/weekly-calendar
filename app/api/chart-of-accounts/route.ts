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
      ]
    });
    
    console.log(`API chart-of-accounts - found ${accounts.length} accounts`);

    // Siempre devolver la lista completa de cuentas
    return NextResponse.json(accounts);

  } catch (error) {
    console.error("Error fetching chart of accounts:", error);
    return NextResponse.json(
      { error: "Error al obtener el plan de cuentas" },
      { status: 500 }
    );
  }
}