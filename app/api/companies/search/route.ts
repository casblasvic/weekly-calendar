import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

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
    const companies = await prisma.company.findMany({
      where: {
        systemId,
        OR: [
          { fiscalName: { contains: search, mode: 'insensitive' } },
          { taxId: { contains: search, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        fiscalName: true,
        taxId: true,
        email: true,
        phone: true
      },
      take: limit,
      orderBy: { fiscalName: 'asc' }
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
