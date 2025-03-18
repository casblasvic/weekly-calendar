"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button, BackButton } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save } from "lucide-react"
import { useRouter } from "next/navigation"

interface ClinicFormProps {
  initialData?: any // Tipo más específico según tus datos
  isNewClinic: boolean
  onSubmit: (data: any) => void // Tipo más específico según tus datos
}

export default function ClinicForm({ initialData, isNewClinic, onSubmit }: ClinicFormProps) {
  const [formData, setFormData] = useState(
    initialData || {
      prefix: "",
      name: "",
      address: "",
      city: "",
      phone: "",
      email: "",
      web: "",
      openTime: "",
      closeTime: "",
    },
  )
  const router = useRouter()

  useEffect(() => {
    if (initialData) {
      setFormData(initialData)
    }
  }, [initialData])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card className="p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <Label htmlFor="prefix">Prefijo</Label>
              <Input
                id="prefix"
                name="prefix"
                placeholder="Prefijo"
                value={formData.prefix}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <Label htmlFor="name">Nombre comercial</Label>
              <Input
                id="name"
                name="name"
                placeholder="Nombre comercial"
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                name="address"
                placeholder="Dirección"
                value={formData.address}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <Label htmlFor="city">Ciudad</Label>
              <Input id="city" name="city" placeholder="Ciudad" value={formData.city} onChange={handleInputChange} />
            </div>
            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                name="phone"
                placeholder="Teléfono"
                value={formData.phone}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <Label htmlFor="web">Página web</Label>
              <Input id="web" name="web" placeholder="Página web" value={formData.web} onChange={handleInputChange} />
            </div>
            <div>
              <Label htmlFor="openTime">Hora apertura</Label>
              <Input id="openTime" name="openTime" type="time" value={formData.openTime} onChange={handleInputChange} />
            </div>
            <div>
              <Label htmlFor="closeTime">Hora cierre</Label>
              <Input
                id="closeTime"
                name="closeTime"
                type="time"
                value={formData.closeTime}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {/* Aquí puedes agregar más campos según sea necesario */}

          <div className="mt-6 flex justify-end gap-2">
            <BackButton onClick={() => router.push("/configuracion/clinicas")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </BackButton>
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
              <Save className="h-4 w-4 mr-2" />
              {isNewClinic ? "Crear" : "Guardar"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

