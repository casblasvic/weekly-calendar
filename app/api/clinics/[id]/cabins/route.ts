import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id: clinicId } = params;

  console.log(`[API GET /api/clinics/[id]/cabins] Received request for clinicId: ${clinicId}`);

  if (!clinicId || typeof clinicId !== 'string') {
    console.warn("[API GET /api/clinics/[id]/cabins] Invalid or missing Clinic ID in params.", params);
    return NextResponse.json({ error: 'Clinic ID is required and must be a string' }, { status: 400 });
  }

  try {
    console.log(`[API GET /api/clinics/[id]/cabins] Fetching cabins for clinicId: ${clinicId}`);
    const cabins = await prisma.cabin.findMany({
      where: {
        clinicId: clinicId,
      },
      orderBy: {
        order: 'asc',
      },
    });
    console.log(`[API GET /api/clinics/[id]/cabins] Found ${cabins.length} cabins for clinicId: ${clinicId}`);

    return NextResponse.json(cabins);
  } catch (error) {
    console.error(`[API GET /api/clinics/[id]/cabins] Error fetching cabins for clinicId ${clinicId}:`, error);
    if (error instanceof Prisma.PrismaClientInitializationError) {
      // Specific error for DB connection issues (e.g., P1000, P1001)
      return NextResponse.json(
        { message: "Cannot connect to the database. Please try again later." },
        { status: 503 } // 503 Service Unavailable
      );
    } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle other known Prisma errors (e.g., unique constraint violation P2002, record not found P2025)
      // You might want to customize messages based on error.code
      return NextResponse.json(
        { message: "A database operational error occurred. Our team has been notified." },
        { status: 500 }
      );
    }
    // Generic fallback for other types of errors
    return NextResponse.json({ message: 'Failed to fetch cabins due to an unexpected server error.' }, { status: 500 });
  } finally {
    // await prisma.$disconnect(); // Considerar la gestión de la conexión
  }
}

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  // TODO: Añadir autenticación/autorización
  const { id: clinicId } = params;

  if (!clinicId) {
    return NextResponse.json({ error: 'Clinic ID is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { name, code, color, isActive, order } = body;

    if (!name) {
      return NextResponse.json({ error: 'Cabin name is required' }, { status: 400 });
    }

    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { systemId: true }
    });

    if (!clinic) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
    }

    const newCabin = await prisma.cabin.create({
      data: {
        name,
        code: code || null,
        color: color || null,
        isActive: isActive !== undefined ? isActive : true,
        order: order !== undefined ? Number(order) : null,
        clinicId: clinicId,
        systemId: clinic.systemId,
      },
    });

    return NextResponse.json(newCabin, { status: 201 });

  } catch (error) {
    console.error("Error creating cabin:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'A cabin with this name already exists for this clinic' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create cabin' }, { status: 500 });
  } finally {
    // await prisma.$disconnect();
  }
} 