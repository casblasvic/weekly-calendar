"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import React from "react"

export default function SuscripcionesPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const tarifaId = params.id
  
  const handleVolver = () => {
    router.push(`/configuracion/tarifas/${tarifaId}/nuevo-servicio`)
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