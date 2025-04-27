"use client"

import { Button } from "@/components/ui/button"
import { useRouter, useSearchParams } from "next/navigation"
import React from "react"

export default function SuscripcionesPage({ params }: { params: Promise<{ id: string, servicioId: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { id, servicioId } = React.use(params)
  const tarifaId = Array.isArray(id) ? id[0] : id as string
  
  const handleVolver = () => {
    router.push(`/configuracion/tarifas/${tarifaId}/servicio/${servicioId}`)
  }
  
  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <h1 className="text-xl font-semibold mb-6">Configuración de Suscripciones</h1>
      <p className="mb-6">Aquí podrás configurar las suscripciones relacionadas al servicio.</p>
      
      <Button 
        onClick={handleVolver}
        className="rounded-md bg-gray-100 hover:bg-gray-200 border-gray-300"
      >
        Volver
      </Button>
    </div>
  )
}