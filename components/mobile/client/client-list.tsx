"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Calendar } from "lucide-react"
import { useRouter } from "next/navigation"

interface Client {
  id: string
  name: string
  clientNumber: string
  phone: string
  email: string
  clinic: string
}

export function MobileClientList() {
  const [searchTerm, setSearchTerm] = useState("")
  const router = useRouter()

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

  const filteredClients = mockClients.filter((client) => client.name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="p-4 space-y-4">
      <div className="relative">
        <Input
          type="text"
          placeholder="Buscar cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 py-2 w-full"
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
      </div>

      <div className="space-y-4">
        {filteredClients.map((client) => (
          <div key={client.id} className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-medium text-lg">{client.name}</h3>
            <p className="text-sm text-gray-500">#{client.clientNumber}</p>
            <p className="text-sm">{client.phone}</p>
            <p className="text-sm">{client.email}</p>
            <div className="mt-2 flex justify-between">
              <Button
                variant="outline"
                size="sm"
                className="text-purple-600"
                onClick={() => router.push(`/clientes/${client.id}`)}
              >
                <Search className="w-4 h-4 mr-2" />
                Ver detalles
              </Button>
              <Button variant="outline" size="sm" className="text-green-600">
                <Calendar className="w-4 h-4 mr-2" />
                Agendar cita
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

