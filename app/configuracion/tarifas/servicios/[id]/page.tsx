"use client"

import type React from "react"
import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useTarif } from "@/contexts/tarif-context"

export default function ServiciosTarifa({ params }: { params: { id: string } }) {
  const router = useRouter()
  const tarifaId = use(params).id
  const { getTarifaById, getFamiliasByTarifaId } = useTarif()
  const tarifa = getTarifaById(tarifaId)
  const familias = getFamiliasByTarifaId(tarifaId)

  if (!tarifa) {
    return <div>Tarifa no encontrada</div>
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-4">Servicios de {tarifa.nombre}</h1>
      <div className="mb-4">
        <Button onClick={() => router.back()}>Volver</Button>
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-2">Familias disponibles:</h2>
        <ul className="space-y-2">
          {familias.map(familia => (
            <li key={familia.id} className="p-2 border rounded">
              {familia.name} ({familia.code})
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
} 