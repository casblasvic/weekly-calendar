"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Calendar } from "lucide-react"
import { useRouter } from "next/navigation"
import { useClientsQuery } from "@/lib/hooks/use-client-query"

export function MobileClientList() {
  const [searchTerm, setSearchTerm] = useState("")
  const router = useRouter()

  // Obtener datos reales de la base de datos
  const { data: clients = [], isLoading, error } = useClientsQuery({
    search: searchTerm
  })

  const filteredClients = clients.filter((client) => 
    `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (client.phone && client.phone.includes(searchTerm))
  )

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center py-8 text-gray-500">
          Cargando clientes...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 space-y-4">
        <div className="p-4 text-red-600 bg-red-50 border border-red-200 rounded-md">
          Error al cargar los clientes: {error.message}
        </div>
      </div>
    )
  }

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
        {filteredClients.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? "No se encontraron clientes" : "No hay clientes para mostrar"}
          </div>
        ) : (
          filteredClients.map((client) => (
            <div key={client.id} className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-medium text-lg">{`${client.firstName} ${client.lastName}`}</h3>
              <p className="text-sm text-gray-500">#{client.id.slice(-8)}</p>
              <p className="text-sm">{client.phone || "-"}</p>
              <p className="text-sm">{client.email || "-"}</p>
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
          ))
        )}
      </div>
    </div>
  )
}
