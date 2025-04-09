import { NextResponse } from 'next/server';
// Eliminar importación directa
// import { PrismaClient } from '@prisma/client';
// Importar instancia singleton
import { prisma } from '@/lib/db';

// Eliminar instanciación directa
// let prisma: PrismaClient;

export async function GET() {
  // Ya no es necesario instanciar aquí
  // if (!prisma) {
  //   prisma = new PrismaClient();
  // }

  try {
    // Realizar una consulta simple para probar la conexión
    // await prisma.$queryRaw`SELECT 1`; // Para PostgreSQL
    // O una consulta simple a un modelo existente
    await prisma.system.findFirst(); // Asumiendo que tienes un modelo System

    console.log('Database connection successful.');
    return NextResponse.json({ message: 'Database connection successful.' });
  } catch (error) {
    console.error('Database connection failed:', error);
    return NextResponse.json({ message: 'Database connection failed.', error: (error as Error).message }, { status: 500 });
  } finally {
    // NO desconectar la instancia singleton aquí
    // await prisma?.$disconnect();
  }
} 