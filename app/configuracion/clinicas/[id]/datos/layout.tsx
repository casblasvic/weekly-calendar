"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, HelpCircle, Save } from "lucide-react"
import { useRouter } from "next/navigation"
import { mockClinics, updateClinic } from "@/mockData"
import { toast } from "sonner"

export default function DatosClinicaLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { id: string }
}) {
  const router = useRouter()
  const [hasChanges, setHasChanges] = useState(false)
  const clinicId = Number.parseInt(params.id)

  // Listen for changes in the clinic data
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "mockClinics") {
        setHasChanges(true)
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [])

  const saveClinic = () => {
    const clinic = mockClinics.find((c) => c.id === clinicId)
    if (clinic) {
      updateClinic(clinic)
      toast.success("Configuración guardada correctamente")
      setHasChanges(false)
    } else {
      toast.error("No se pudo encontrar la clínica")
    }
  }

  return (
    <div className="relative min-h-screen">
      {children}

      <div className="fixed bottom-6 right-6 flex items-center gap-2">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>

        <Button onClick={saveClinic} className="bg-purple-600 hover:bg-purple-700">
          <Save className="h-4 w-4 mr-2" />
          Guardar
        </Button>

        <Button variant="outline" className="bg-black text-white hover:bg-gray-800">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

