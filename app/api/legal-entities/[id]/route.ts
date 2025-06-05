import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  updateLegalEntitySchema,
  type UpdateLegalEntityPayload,
  type LegalEntityResponse 
} from '@/lib/schemas/legal-entity-schemas'; // LegalEntityResponse puede necesitar ajustes si GET devuelve más datos (ej. clínicas)
import { auth } from '@/lib/auth';
import { handleClinicLegalEntityChange } from '@/app/(main)/configuracion/contabilidad/lib/accounting-sync';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !session.user || !session.user.systemId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ message: 'Legal entity ID is required' }, { status: 400 });
  }

  try {
    const legalEntity = await prisma.legalEntity.findUnique({
      where: {
        id,
        systemId: session.user.systemId,
      },
      select: {
        id: true,
        name: true,
        fullAddress: true,
        countryIsoCode: true,
        taxIdentifierFields: true,
        notes: true,
        email: true,
        phone: true,
        phoneCountryIsoCode: true,
        systemId: true,
        createdAt: true,
        updatedAt: true,
        clinics: {
          select: {
            id: true,
            name: true,
          }
        },
        country: { // Jurisdicción fiscal
          select: {
            isoCode: true,
            name: true,
          }
        },
        phoneCountry: { // País del teléfono
          select: {
            isoCode: true,
            name: true,
            phoneCode: true // Necesitaremos el phoneCode para el frontend
          }
        }
      }
    });

    if (!legalEntity) {
      return NextResponse.json({ message: 'Legal entity not found or access denied' }, { status: 404 });
    }

    // Adaptar la respuesta si es necesario para que coincida con un tipo esperado por el frontend
    // Por ejemplo, si LegalEntityResponse no espera 'clinics' directamente.
    return NextResponse.json(legalEntity, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching legal entity:', error);
    return NextResponse.json({ message: 'Error fetching legal entity', error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth(); // Obtiene la sesión del servidor
  if (!session || !session.user.systemId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ message: 'Legal entity ID is required' }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 });
  }

  const validationResult = updateLegalEntitySchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json({ message: 'Invalid request data', errors: validationResult.error.format() }, { status: 400 });
  }

  const { clinicIds, ...legalEntityData } = validationResult.data as UpdateLegalEntityPayload; // Cast seguro después de validación

  try {
    // Obtener las clínicas asociadas ANTES de la actualización
    const previouslyAssociatedClinics = await prisma.clinic.findMany({
      where: { legalEntityId: id },
      select: { id: true },
    });
    const previouslyAssociatedClinicIds = previouslyAssociatedClinics.map(c => c.id);

    const updatedLegalEntity = await prisma.$transaction(async (tx) => {
      // 1. Verificar que la LegalEntity exista y pertenezca al systemId del usuario
      const existingLegalEntity = await tx.legalEntity.findUnique({
        where: {
          id,
          systemId: session.user.systemId,
        },
      });

      if (!existingLegalEntity) {
        throw new Error('Legal entity not found or access denied'); // Se capturará y devolverá 404
      }

      // 2. Actualizar los campos básicos de LegalEntity
      const updatedEntity = await tx.legalEntity.update({
        where: {
          id,
        },
        data: legalEntityData,
        select: {
          id: true,
          name: true,
          fullAddress: true,
          countryIsoCode: true,
          taxIdentifierFields: true,
          notes: true,
          email: true,
          phone: true,
          phoneCountryIsoCode: true,
          systemId: true,
          createdAt: true,
          updatedAt: true,
          clinics: {
            select: {
              id: true,
              name: true,
            }
          },
          country: { // Jurisdicción fiscal
            select: {
              isoCode: true,
              name: true,
            }
          },
          phoneCountry: { // País del teléfono
            select: {
              isoCode: true,
              name: true,
              phoneCode: true
            }
          }
        }
      });

      if (clinicIds !== undefined) { // Solo modificar clínicas si clinicIds está presente en el payload
        // 3. Clínicas actualmente asociadas a esta LegalEntity
        const currentlyAssociatedClinics = await tx.clinic.findMany({
          where: { legalEntityId: id },
          select: { id: true },
        });
        const currentlyAssociatedClinicIds = currentlyAssociatedClinics.map(c => c.id);

        const newClinicIds = clinicIds || []; // Si clinicIds es null/undefined, tratar como array vacío

        // 4. Clínicas a desasociar
        const clinicsToUnassignIds = currentlyAssociatedClinicIds.filter(id => !newClinicIds.includes(id));
        if (clinicsToUnassignIds.length > 0) {
          await tx.clinic.updateMany({
            where: { 
              id: { in: clinicsToUnassignIds },
              legalEntityId: id // Asegurar que solo desasociamos de esta entidad
            },
            data: { legalEntityId: null },
          });
        }

        // 5. Clínicas a asociar
        const clinicsToAssignIds = newClinicIds.filter(id => !currentlyAssociatedClinicIds.includes(id));
        if (clinicsToAssignIds.length > 0) {
          // Verificar que las clínicas a asignar no estén ya vinculadas a OTRA LegalEntity
          const clinicsToAssignData = await tx.clinic.findMany({
            where: { 
              id: { in: clinicsToAssignIds },
              systemId: session.user.systemId, // Asegurar que son del mismo sistema
            },
            select: {
              id: true,
              legalEntityId: true,
              name: true,
            }
          });

          for (const clinic of clinicsToAssignData) {
            if (clinic.legalEntityId && clinic.legalEntityId !== id) {
              // Esta clínica ya está asociada a otra LegalEntity
              throw new Error(`La clínica "${clinic.name}" ya está asociada a otra sociedad mercantil.`);
            }
          }
          
          // Proceder a asociar
          await tx.clinic.updateMany({
            where: { 
              id: { in: clinicsToAssignIds },
              systemId: session.user.systemId,
            },
            data: { legalEntityId: id },
          });
        }
      }

      return updatedEntity;
    });

    // Sincronizar series contables para las clínicas nuevamente asociadas
    if (clinicIds !== undefined) {
      // Las clínicas recién asociadas son las que están en clinicIds pero no estaban antes
      const newlyAssociatedClinicIds = (clinicIds || []).filter(id => !previouslyAssociatedClinicIds.includes(id));
      
      // Para cada clínica recién asociada, llamar a handleClinicLegalEntityChange
      for (const clinicId of newlyAssociatedClinicIds) {
        await handleClinicLegalEntityChange(clinicId, null, id);
      }
    }

    return NextResponse.json(updatedLegalEntity, { status: 200 });

  } catch (error: any) {
    if (error.message.includes('Legal entity not found')) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    if (error.message.includes('ya está asociada a otra sociedad mercantil')) {
      return NextResponse.json({ message: error.message }, { status: 409 }); // 409 Conflict
    }
    console.error('Error updating legal entity:', error);
    return NextResponse.json({ message: 'Error updating legal entity', error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await auth(); // Obtiene la sesión del servidor
  if (!session || !session.user.systemId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const id = params.id;
  if (!id) {
    return NextResponse.json({ message: 'Legal entity ID is required' }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Verificar que la LegalEntity exista y pertenezca al systemId del usuario
      const existingLegalEntity = await tx.legalEntity.findUnique({
        where: {
          id: id,
          systemId: session.user.systemId,
        },
      });

      if (!existingLegalEntity) {
        throw new Error('Legal entity not found or access denied'); // Se capturará y devolverá 404
      }

      // 2. Desasociar cualquier clínica vinculada (onDelete: SetNull debería manejar esto, pero es bueno ser explícito si se requiere lógica adicional)
      // Si onDelete: SetNull está correctamente configurado en el schema para la relación Clinic -> LegalEntity,
      // este paso podría ser redundante o servir para lógica adicional antes de la eliminación.
      await tx.clinic.updateMany({
        where: { legalEntityId: id },
        data: { legalEntityId: null },
      });

      // 3. Eliminar la LegalEntity
      await tx.legalEntity.delete({
        where: {
          id,
          // systemId: session.user.systemId, // Doble check, ya validado arriba
        },
      });
    });

    return NextResponse.json({ message: 'Legal entity deleted successfully' }, { status: 200 }); // O 204 No Content

  } catch (error: any) {
    if (error.message.includes('Legal entity not found')) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    // Capturar errores de 'Foreign key constraint failed' si alguna relación no permite SetNull o Cascade
    // y la entidad aún está referenciada.
    if (error.code === 'P2003' || error.code === 'P2014') { // Códigos de error de Prisma para FK constraints
        return NextResponse.json({ message: 'Cannot delete legal entity. It is still referenced by other records.' }, { status: 409 });
    }
    console.error('Error deleting legal entity:', error);
    return NextResponse.json({ message: 'Error deleting legal entity', error: error.message }, { status: 500 });
  }
}
