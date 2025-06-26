import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// POST /api/internal/webhooks/validate-slug - Validar disponibilidad de slug
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { slug, systemId, webhookId } = body

    if (!slug || !systemId) {
      return NextResponse.json(
        { error: 'Missing required fields: slug, systemId' },
        { status: 400 }
      )
    }

    // Verificar si el slug ya existe en OTRO webhook
    const existingWebhook = await prisma.webhook.findFirst({
      where: {
        slug,
        systemId,
        // Si estamos editando (webhookId existe), excluimos este mismo webhook de la búsqueda
        ...(webhookId && {
          id: {
            not: webhookId
          }
        })
      }
    })

    if (!existingWebhook) {
      return NextResponse.json({
        isAvailable: true,
        suggestions: []
      })
    }

    // Generar sugerencias alternativas
    const suggestions = []
    
    // Intentar con números
    for (let i = 2; i <= 10; i++) {
      const candidate = `${slug}-${i}`
      const exists = await prisma.webhook.findFirst({
        where: { slug: candidate, systemId }
      })
      
      if (!exists) {
        suggestions.push(candidate)
        if (suggestions.length >= 3) break
      }
    }
    
    // Intentar con sufijos descriptivos si no hay suficientes sugerencias
    if (suggestions.length < 3) {
      const suffixes = ['new', 'v2', 'updated', 'alt', 'copy']
      for (const suffix of suffixes) {
        const candidate = `${slug}-${suffix}`
        const exists = await prisma.webhook.findFirst({
          where: { slug: candidate, systemId }
        })
        
        if (!exists) {
          suggestions.push(candidate)
          if (suggestions.length >= 5) break
        }
      }
    }

    return NextResponse.json({
      isAvailable: false,
      suggestions: suggestions.slice(0, 5) // Máximo 5 sugerencias
    })

  } catch (error) {
    console.error('Error validating slug:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 