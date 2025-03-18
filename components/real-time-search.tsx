"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface Client {
  id: string
  name: string
  phone: string
}

interface RealTimeSearchProps {
  onClientSelect: (client: Client) => void
}

export function RealTimeSearch({ onClientSelect }: RealTimeSearchProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [results, setResults] = useState<Client[]>([])

  useEffect(() => {
    if (searchTerm.length > 2) {
      // Aquí iría la lógica para buscar clientes en tiempo real
      // Por ahora, usaremos datos de ejemplo
      const mockResults: Client[] = [
        { id: "1", name: "Juan Pérez", phone: "123-456-7890" },
        { id: "2", name: "María García", phone: "098-765-4321" },
      ]
      setResults(
        mockResults.filter(
          (client) => client.name.toLowerCase().includes(searchTerm.toLowerCase()) || client.phone.includes(searchTerm),
        ),
      )
    } else {
      setResults([])
    }
  }, [searchTerm])

  return (
    <div className="relative">
      <div className="relative">
        <Input
          type="text"
          placeholder="Buscar cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
      </div>
      {results.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
          {results.map((client) => (
            <div
              key={client.id}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => onClientSelect(client)}
            >
              <div className="font-medium">{client.name}</div>
              <div className="text-sm text-gray-600">{client.phone}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

