import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { getSystemId } from '@/lib/auth/getSystemId';

const prisma = new PrismaClient();

// Schema de validación para crear/actualizar proveedores
const supplierSchema = z.object({
  fiscalName: z.string().min(1, 'El nombre fiscal es requerido'),
  taxId: z.string().min(1, 'El CIF/NIF es requerido'),
  email: z.string().email('Email inválido').optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  countryIsoCode: z.string().optional().nullable(),
  website: z.string().url('URL inválida').optional().nullable().or(z.literal('')),
  notes: z.string().optional().nullable(),
});

// GET - Listar proveedores con filtros
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const systemId = await getSystemId();
    if (!systemId) {
      return NextResponse.json({ error: 'Sistema no encontrado' }, { status: 400 });
    }

    // Obtener parámetros de búsqueda
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    // Construir filtros
    const where: any = {
      systemId,
      // Para identificar proveedores, buscaremos companies que tengan facturas de compra
      purchaseInvoices: {
        some: {} // Tiene al menos una factura de compra
      }
    };

    if (search) {
      where.OR = [
        { fiscalName: { contains: search, mode: 'insensitive' } },
        { taxId: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [suppliers, total] = await Promise.all([
      prisma.company.findMany({
        where,
        include: {
          purchaseInvoices: {
            take: 5,
            orderBy: { issueDate: 'desc' },
            select: {
              id: true,
              invoiceNumber: true,
              issueDate: true,
              totalAmount: true,
              status: true,
            }
          },
          _count: {
            select: {
              purchaseInvoices: true,
            }
          }
        },
        orderBy: { fiscalName: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.company.count({ where })
    ]);

    // Formatear respuesta
    const formattedSuppliers = suppliers.map(supplier => ({
      ...supplier,
      name: supplier.fiscalName, // Añadir alias para compatibilidad
      vat: supplier.taxId, // Añadir alias para compatibilidad
      isSupplier: true, // Marcar como proveedor
      isActive: true, // Por defecto activo ya que no hay campo en el modelo
      lastPurchase: supplier.purchaseInvoices[0]?.issueDate || null,
      totalPurchases: supplier._count.purchaseInvoices,
    }));

    return NextResponse.json({
      suppliers: formattedSuppliers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return NextResponse.json(
      { error: 'Error al obtener proveedores' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo proveedor
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const systemId = await getSystemId();
    if (!systemId) {
      return NextResponse.json({ error: 'Sistema no encontrado' }, { status: 400 });
    }

    const body = await request.json();
    
    // Validar datos
    const validatedData = supplierSchema.parse(body);

    // Verificar si ya existe un proveedor con el mismo CIF/NIF
    const existingSupplier = await prisma.company.findFirst({
      where: {
        taxId: validatedData.taxId,
        systemId,
      }
    });

    if (existingSupplier) {
      return NextResponse.json(
        { error: 'Ya existe una empresa con ese CIF/NIF' },
        { status: 400 }
      );
    }

    // Crear proveedor
    const supplier = await prisma.company.create({
      data: {
        fiscalName: validatedData.fiscalName,
        taxId: validatedData.taxId,
        systemId,
        ...(validatedData.email && { email: validatedData.email }),
        ...(validatedData.phone && { phone: validatedData.phone }),
        ...(validatedData.address && { address: validatedData.address }),
        ...(validatedData.city && { city: validatedData.city }),
        ...(validatedData.postalCode && { postalCode: validatedData.postalCode }),
        ...(validatedData.countryIsoCode && { countryIsoCode: validatedData.countryIsoCode }),
        ...(validatedData.website && { website: validatedData.website }),
        ...(validatedData.notes && { notes: validatedData.notes }),
      },
      include: {
        _count: {
          select: {
            purchaseInvoices: true,
          }
        }
      }
    });

    return NextResponse.json({
      supplier: {
        ...supplier,
        name: supplier.fiscalName, // Añadir alias para compatibilidad
        vat: supplier.taxId, // Añadir alias para compatibilidad
        isSupplier: true,
        isActive: true,
      },
      message: 'Proveedor creado correctamente'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating supplier:', error);
    return NextResponse.json(
      { error: 'Error al crear proveedor' },
      { status: 500 }
    );
  }
}
