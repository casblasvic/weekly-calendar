import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const systemId = searchParams.get("systemId")
    const search = searchParams.get("search")
    const limit = parseInt(searchParams.get("limit") || "10")

    if (!systemId) {
      return NextResponse.json({ error: "systemId es requerido" }, { status: 400 })
    }

    if (!search || search.length < 2) {
      return NextResponse.json({ results: [] })
    }

    // Buscar clientes por nombre, apellido, email o teléfono
    const clients = await db.client.findMany({
      where: {
        systemId,
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true
      },
      take: limit,
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    })

    return NextResponse.json({ results: clients })
  } catch (error) {
    console.error("Error buscando clientes:", error)
    return NextResponse.json(
      { error: "Error al buscar clientes" },
      { status: 500 }
    )
  }
}
