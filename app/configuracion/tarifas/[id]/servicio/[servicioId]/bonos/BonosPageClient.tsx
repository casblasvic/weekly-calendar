'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { BonoList } from '@/components/bono/bono-list'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface BonosPageClientProps {
  tarifaId: string
  servicioId: string
}

export default function BonosPageClient({ tarifaId, servicioId }: BonosPageClientProps) {
  const router = useRouter()
  
  const handleVolver = () => {
    router.push(`/configuracion/tarifas/${tarifaId}/servicio/${servicioId}`)
  }
  
  const handleNuevoBono = () => {
    router.push(`/configuracion/tarifas/${tarifaId}/servicio/${servicioId}/bonos/nuevo`)
  }
  
  return (
    <div className="container mx-auto py-6 relative">
      <Card>
        <CardHeader>
          <CardTitle>Bonos del servicio</CardTitle>
        </CardHeader>
        <CardContent className="pb-16">
          <BonoList servicioId={servicioId} tarifaId={tarifaId} />
        </CardContent>
      </Card>
      
      {/* Botones fijos en la parte inferior derecha */}
      <div className="fixed bottom-6 right-6 flex space-x-2 z-10">
        <Button variant="outline" onClick={handleVolver}>
          Volver
        </Button>
        <Button onClick={handleNuevoBono}>
          Nuevo bono
        </Button>
      </div>
    </div>
  )
} 