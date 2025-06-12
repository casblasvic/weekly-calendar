import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET: Obtener relaciones de una entidad
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')
    const systemId = searchParams.get('systemId')

    if (!entityType || !entityId || !systemId) {
      return NextResponse.json(
        { error: 'entityType, entityId y systemId son requeridos' },
        { status: 400 }
      )
    }

    const relations = await prisma.entityRelation.findMany({
      where: {
        systemId,
        OR: [
          {
            entityAType: entityType,
            entityAId: entityId
          },
          {
            entityBType: entityType,
            entityBId: entityId
          }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Enriquecer las relaciones con información de las entidades relacionadas
    const enrichedRelations = await Promise.all(
      relations.map(async (relation) => {
        const isEntityA = relation.entityAType === entityType && relation.entityAId === entityId
        const relatedEntityType = isEntityA ? relation.entityBType : relation.entityAType
        const relatedEntityId = isEntityA ? relation.entityBId : relation.entityAId

        let relatedEntity = null

        try {
          switch (relatedEntityType) {
            case 'client':
              relatedEntity = await prisma.client.findUnique({
                where: { id: relatedEntityId },
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              })
              break
            case 'company':
              relatedEntity = await prisma.company.findUnique({
                where: { id: relatedEntityId },
                select: {
                  id: true,
                  fiscalName: true,
                  taxId: true,
                  email: true
                }
              })
              break
            case 'user':
              relatedEntity = await prisma.user.findUnique({
                where: { id: relatedEntityId },
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              })
              break
            case 'lead':
              relatedEntity = await prisma.lead.findUnique({
                where: { id: relatedEntityId },
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              })
              break
            case 'contact':
              relatedEntity = await prisma.contactPerson.findUnique({
                where: { id: relatedEntityId },
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  position: true
                }
              })
              break
          }
        } catch (error) {
          console.error(`Error al obtener entidad relacionada ${relatedEntityType}:`, error)
        }

        return {
          ...relation,
          relatedEntity,
          relatedEntityType,
          direction: isEntityA ? 'outgoing' : 'incoming'
        }
      })
    )

    return NextResponse.json(enrichedRelations)
  } catch (error) {
    console.error('Error al obtener relaciones:', error)
    return NextResponse.json(
      { error: 'Error al obtener relaciones' },
      { status: 500 }
    )
  }
}

// POST: Crear nueva relación
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const {
      entityAType,
      entityAId,
      entityBType,
      entityBId,
      relationType,
      direction = 'bidirectional',
      notes,
      systemId
    } = data

    if (!entityAType || !entityAId || !entityBType || !entityBId || !relationType || !systemId) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos excepto notes' },
        { status: 400 }
      )
    }

    // Verificar que no exista ya una relación idéntica
    const existingRelation = await prisma.entityRelation.findUnique({
      where: {
        entityAType_entityAId_entityBType_entityBId_relationType: {
          entityAType,
          entityAId,
          entityBType,
          entityBId,
          relationType
        }
      }
    })

    if (existingRelation) {
      return NextResponse.json(
        { error: 'Ya existe una relación con estos parámetros' },
        { status: 409 }
      )
    }

    const newRelation = await prisma.entityRelation.create({
      data: {
        entityAType,
        entityAId,
        entityBType,
        entityBId,
        relationType,
        direction,
        notes,
        systemId
      }
    })

    return NextResponse.json(newRelation, { status: 201 })
  } catch (error) {
    console.error('Error al crear relación:', error)
    return NextResponse.json(
      { error: 'Error al crear relación' },
      { status: 500 }
    )
  }
}

// DELETE: Eliminar relación
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID es requerido' },
        { status: 400 }
      )
    }

    await prisma.entityRelation.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar relación:', error)
    return NextResponse.json(
      { error: 'Error al eliminar relación' },
      { status: 500 }
    )
  }
}
