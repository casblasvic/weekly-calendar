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
    const allowsDirectEntry = searchParams.get('allowsDirectEntry') === 'true';
    const isActive = searchParams.get('isActive') === 'true';
    const type = searchParams.get('type') as AccountType | null; // Cast correcto para el tipo

    if (!legalEntityId) {
      return NextResponse.json({ error: "legalEntityId es requerido" }, { status: 400 });
    }

    // Obtener las cuentas del plan contable con los filtros aplicados
    const accounts = await prisma.chartOfAccountEntry.findMany({
      where: {
        systemId,
        legalEntityId,
        ...(allowsDirectEntry !== undefined && { allowsDirectEntry }),
        ...(isActive !== undefined && { isActive }),
        ...(type && { type })
      },
      orderBy: [
        { accountNumber: 'asc' }
      ]
    });

    // Si no se solicita una lista específica, devolver información resumida
    if (!allowsDirectEntry && !isActive && !type) {
      return NextResponse.json({
        hasEntries: accounts.length > 0,
        count: accounts.length
      });
    }

    // Devolver la lista completa de cuentas
    return NextResponse.json(accounts);

  } catch (error) {
    console.error('Error fetching chart of accounts:', error);
    return NextResponse.json(
      { error: "Error al obtener plan contable" },
      { status: 500 }
    );
  }
} 