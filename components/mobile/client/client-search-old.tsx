"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Calendar, DollarSign } from "lucide-react"

interface Client {
  id: string
  name: string
  phone: string
  email: string
  clientNumber: string
  clinic: string
}

interface MobileClientSearchProps {
  onClientSelect: (client: Client) => void
  onClose: () => void
}

export function MobileClientSearch({ onClientSelect, onClose }: MobileClientSearchProps) {
  const [searchParams, setSearchParams] = useState({
    nombre: "",
    primerApellido: "",
    segundoApellido: "",
    telefono: "",
    numeroCliente: "",
  })

  const mockClients: Client[] = [
    {
      id: "1",
      name: "Lina Sadaoui Sadaoui",
      clientNumber: "6557",
      phone: "+212622742529",
      email: "linasadaoui@gmail.com",
      clinic: "Multilaser Californie",
    },
    {
      id: "2",
      name: "saadaoui lina saadaoui",
      clientNumber: "1249",
      phone: "+212622742529",
      email: "ls.organicare@gmail.com",
      clinic: "Multilaser Californie",
    },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Search Form */}
      <div className="p-4 space-y-4">
        <Input
          placeholder="Nombre"
          value={searchParams.nombre}
          onChange={(e) => setSearchParams((prev) => ({ ...prev, nombre: e.target.value }))}
        />
        <Input
          placeholder="Primer apellido"
          value={searchParams.primerApellido}
          onChange={(e) => setSearchParams((prev) => ({ ...prev, primerApellido: e.target.value }))}
        />
        <Input
          placeholder="Segundo apellido"
          value={searchParams.segundoApellido}
          onChange={(e) => setSearchParams((prev) => ({ ...prev, segundoApellido: e.target.value }))}
        />
        <Input
          placeholder="Teléfono"
          value={searchParams.telefono}
          onChange={(e) => setSearchParams((prev) => ({ ...prev, telefono: e.target.value }))}
        />
        <Input
          placeholder="Nº Cliente"
          value={searchParams.numeroCliente}
          onChange={(e) => setSearchParams((prev) => ({ ...prev, numeroCliente: e.target.value }))}
        />
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto px-4">
        {mockClients.map((client) => (
          <div
            key={client.id}
            className="bg-white rounded-lg border p-4 mb-3 space-y-2"
            onClick={() => onClientSelect(client)}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">{client.name}</h3>
                <p className="text-sm text-gray-500">Nº: {client.clientNumber}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-purple-600">
                  <Calendar className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600">
                  <DollarSign className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>{client.phone}</p>
              <p>{client.email}</p>
              <p>{client.clinic}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-t bg-white">
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button className="bg-purple-600 hover:bg-purple-700">Buscar</Button>
        </div>
      </div>
    </div>
  )
}

