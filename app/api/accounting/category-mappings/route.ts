/**
 * API para gestionar mapeos de categorías a cuentas contables
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Schema de validación para el body
const CategoryMappingSchema = z.object({
  legalEntityId: z.string(),
  systemId: z.string(),
  mappings: z.record(z.string()), // { categoryId: accountId }
  applyToSubcategories: z.boolean().optional().default(false)
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validation = CategoryMappingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { legalEntityId, systemId, mappings, applyToSubcategories } = validation.data;

    // Verificar que el usuario pertenece al sistema
    if (systemId !== session.user.systemId) {
      return NextResponse.json({ error: 'No autorizado para este sistema' }, { status: 403 });
    }

    // Crear los mapeos en una transacción
    const result = await prisma.$transaction(async (tx) => {
      const createdMappings = [];

      for (const [categoryId, accountId] of Object.entries(mappings)) {
        // Verificar que la categoría existe y pertenece al sistema
        const category = await tx.category.findFirst({
          where: {
            id: categoryId,
            systemId
          },
          include: {
            children: applyToSubcategories ? true : false
          }
        });

        if (!category) {
          throw new Error(`Categoría ${categoryId} no encontrada`);
        }

        // Verificar que la cuenta existe
        const account = await tx.chartOfAccountEntry.findFirst({
          where: {
            id: accountId,
            legalEntityId,
            systemId,
            isActive: true
          }
        });

        if (!account) {
          throw new Error(`Cuenta ${accountId} no encontrada o inactiva`);
        }

        // Crear o actualizar el mapeo para la categoría
        const mapping = await tx.categoryAccountMapping.upsert({
          where: {
            categoryId_legalEntityId: {
              categoryId,
              legalEntityId
            }
          },
          update: {
            accountId
          },
          create: {
            categoryId,
            legalEntityId,
            accountId,
            systemId
          }
        });

        createdMappings.push(mapping);

        // Si applyToSubcategories es true y la categoría tiene hijos
        if (applyToSubcategories && category.children && category.children.length > 0) {
          // Aplicar el mismo mapeo a todas las subcategorías
          for (const child of category.children) {
            const childMapping = await tx.categoryAccountMapping.upsert({
              where: {
                categoryId_legalEntityId: {
                  categoryId: child.id,
                  legalEntityId
                }
              },
              update: {
                accountId
              },
              create: {
                categoryId: child.id,
                legalEntityId,
                accountId,
                systemId
              }
            });
            createdMappings.push(childMapping);
          }
        }
      }

      return createdMappings;
    });

    return NextResponse.json({
      message: 'Mapeos guardados correctamente',
      mappingsCreated: result.length
    });
  } catch (error) {
    console.error('Error saving category mappings:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error al guardar mapeos de categorías' },
      { status: 500 }
    );
  }
} 