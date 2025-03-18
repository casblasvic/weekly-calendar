"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User, MapPin } from "lucide-react"
import { useState } from "react"

interface NewClientDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function NewClientDialog({ isOpen, onClose }: NewClientDialogProps) {
  const [formData, setFormData] = useState({
    birthDate: "",
    name: "",
    firstSurname: "",
    secondSurname: "",
    documentType: "",
    documentNumber: "",
    gender: "",
    howDidYouKnowUs: "",
    postalCode: "",
    city: "",
    email: "",
    phone: "",
    address: "",
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-normal text-gray-600">Nuevo cliente</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Personal Data */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-medium text-gray-700">Datos personales</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                name="birthDate"
                value={formData.birthDate}
                onChange={handleInputChange}
                placeholder="Fecha nacimiento"
              />
              <Input name="name" value={formData.name} onChange={handleInputChange} placeholder="Nombre" />
              <Input
                name="firstSurname"
                value={formData.firstSurname}
                onChange={handleInputChange}
                placeholder="Primer apellido"
              />
              <Input
                name="secondSurname"
                value={formData.secondSurname}
                onChange={handleInputChange}
                placeholder="Segundo apellido"
              />
              <Select
                value={formData.documentType}
                onValueChange={(value) => handleSelectChange("documentType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de documento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dni">DNI</SelectItem>
                  <SelectItem value="nie">NIE</SelectItem>
                  <SelectItem value="passport">Pasaporte</SelectItem>
                </SelectContent>
              </Select>
              <Input
                name="documentNumber"
                value={formData.documentNumber}
                onChange={handleInputChange}
                placeholder="Número de documento"
              />
              <Select value={formData.gender} onValueChange={(value) => handleSelectChange("gender", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sexo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">Mujer</SelectItem>
                  <SelectItem value="male">Hombre</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={formData.howDidYouKnowUs}
                onValueChange={(value) => handleSelectChange("howDidYouKnowUs", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="¿Cómo nos has conocido?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="referral">Recomendación</SelectItem>
                  <SelectItem value="social">Redes sociales</SelectItem>
                  <SelectItem value="search">Búsqueda web</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contact Data */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-medium text-gray-700">Datos de contacto</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input name="postalCode" value={formData.postalCode} onChange={handleInputChange} placeholder="CP" />
              <Input name="city" value={formData.city} onChange={handleInputChange} placeholder="Localidad" />
              <Input
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="E-mail"
                className="col-span-2"
              />
              <Input
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Teléfono"
                className="col-span-2"
              />
              <Input
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Dirección"
                className="col-span-2"
              />
            </div>
          </div>

          {/* Additional Contact Data */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-medium text-gray-700">Datos de contacto</h2>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="outline">Borrar</Button>
          <Button className="bg-purple-600 hover:bg-purple-700">Guardar</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

