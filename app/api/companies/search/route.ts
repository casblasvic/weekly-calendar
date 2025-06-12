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

    // Buscar empresas por nombre o NIF
    const companies = await db.company.findMany({
      where: {
        systemId,
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { taxId: { contains: search, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        taxId: true,
        email: true,
        phone: true
      },
      take: limit,
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({ results: companies })
  } catch (error) {
    console.error("Error buscando empresas:", error)
    return NextResponse.json(
      { error: "Error al buscar empresas" },
      { status: 500 }
    )
  }
}
