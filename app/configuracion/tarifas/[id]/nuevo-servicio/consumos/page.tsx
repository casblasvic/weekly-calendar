"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import React from "react"

export default function ConsumosPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const tarifaId = use(params).id
  
  const handleVolver = () => {
    router.push(`/configuracion/tarifas/${tarifaId}/nuevo-servicio`)
  }
  
  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <h1 className="text-xl font-semibold mb-6">Configuración de Consumos</h1>
      <p className="mb-6">Aquí podrás configurar los consumos detallados del servicio.</p>
      
      <button 
        onClick={handleVolver}
        className="rounded-md bg-gray-100 hover:bg-gray-200 border-gray-300"
      >
        Volver
      </button>
    </div>
  )
}