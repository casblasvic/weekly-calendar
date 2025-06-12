import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const systemId = searchParams.get("systemId")
    const search = searchParams.get("search")
    const limit = parseInt(searchParams.get("limit") || "10")
    const role = searchParams.get("role")

    if (!systemId) {
      return NextResponse.json({ error: "systemId es requerido" }, { status: 400 })
    }

    if (!search || search.length < 2) {
      return NextResponse.json({ results: [] })
    }

    // Buscar usuarios (empleados) por nombre, apellido o email
    const users = await db.user.findMany({
      where: {
        systemId,
        AND: [
          role ? { role: { not: 'ADMIN' } } : {}, // Si se especifica role=employee, excluir admins
          {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } }
            ]
          }
        ]
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        avatar: true
      },
      take: limit,
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    })

    return NextResponse.json({ results: users })
  } catch (error) {
    console.error("Error buscando usuarios:", error)
    return NextResponse.json(
      { error: "Error al buscar usuarios" },
      { status: 500 }
    )
  }
}
