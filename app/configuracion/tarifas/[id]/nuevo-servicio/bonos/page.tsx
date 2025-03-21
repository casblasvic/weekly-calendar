"use client"

import { Button } from "@/components/ui/button"
import { useRouter, useSearchParams } from "next/navigation"
import React from "react"

export default function BonosPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tarifaId = Array.isArray(params.id) ? params.id[0] : params.id as string
  
  const handleVolver = () => {
    router.push(`/configuracion/tarifas/${tarifaId}/nuevo-servicio`)
  }
  
  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <h1 className="text-xl font-semibold mb-6">Configuración de Bonos</h1>
      <p className="mb-6">Aquí podrás configurar los bonos aplicables al servicio.</p>
      
      <Button 
        onClick={handleVolver}
        className="rounded-md bg-gray-100 hover:bg-gray-200 border-gray-300"
      >
        Volver
      </Button>
    </div>
  )
} 