import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerAuthSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const countries = await prisma.countryInfo.findMany({
      select: {
        isoCode: true,
        name: true,
        timezone: true,
        phoneCode: true,
        currencyCode: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(countries);
  } catch (error) {
    console.error("Error obteniendo países:", error);
    return NextResponse.json(
      { error: "Error al obtener países" },
      { status: 500 }
    );
  }
} 