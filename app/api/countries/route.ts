import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerAuthSession } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getServerAuthSession();
  if (!session) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  try {
    const countries = await prisma.countryInfo.findMany({
      select: {
        isoCode: true,
        name: true,
        phoneCode: true,
        currencyCode: true,
        currencyName: true,
        currencySymbol: true,
        // languageCode: true, // Podríamos incluirlo si se necesita para el selector de idioma
      },
      orderBy: {
        name: 'asc', // Ordenar alfabéticamente por nombre
      },
    });

    return NextResponse.json(countries);

  } catch (error) {
    console.error("[API_COUNTRIES_GET] Error fetching countries:", error);
    // Evitar exponer detalles del error en producción
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 