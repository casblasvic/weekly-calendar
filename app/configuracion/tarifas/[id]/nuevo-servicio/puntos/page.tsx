"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import React from "react"

export default function PuntosPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const tarifaId = params.id
  
  const handleVolver = () => {
    router.push(`/configuracion/tarifas/${tarifaId}/nuevo-servicio`)
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