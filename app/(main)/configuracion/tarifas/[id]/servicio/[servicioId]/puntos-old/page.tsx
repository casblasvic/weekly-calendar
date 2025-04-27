"use client"

import { Button } from "@/components/ui/button"
import { useRouter, useSearchParams } from "next/navigation"
import React from "react"

export default function PuntosPage({ params }: { params: Promise<{ id: string, servicioId: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { id, servicioId } = React.use(params)
  const tarifaId = Array.isArray(id) ? id[0] : id as string
  
  const handleVolver = () => {
    router.push(`/configuracion/tarifas/${tarifaId}/servicio/${servicioId}`)
  }
  
  return (
    <div className="max-w-5xl px-4 py-8 mx-auto">
      <h1 className="mb-6 text-xl font-semibold">Configuración de Puntos</h1>
      <p className="mb-6">Aquí podrás configurar los puntos asociados al servicio.</p>
      
      <Button 
        onClick={handleVolver}
        className="bg-gray-100 border-gray-300 rounded-md hover:bg-gray-200"
      >
        Volver
      </Button>
    </div>
  )
} 