"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { ArrowLeft, Plus, HelpCircle } from "lucide-react"
import { useRouter, useParams } from "next/navigation"

export default function EquipamientoLayout({
  children,
}: {
  children: React.ReactNode
  params: { id: string }
}) {
  const router = useRouter()
  const params = useParams()
  const clinicId = params.id as string

  return (
    <div className="relative min-h-screen">
      {children}

      <div className="fixed bottom-6 right-6 flex items-center gap-2">
        <Button 
          variant="outline" 
          onClick={() => router.push(`/configuracion/clinicas/${clinicId}?tab=equipamiento`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>

        <Button onClick={() => router.push(`/configuracion/clinicas/${clinicId}/equipamiento/nuevo`)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo equipamiento
        </Button>

        <Button variant="outline" className="bg-black text-white hover:bg-gray-800">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

