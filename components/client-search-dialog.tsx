"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useLastClient } from "@/contexts/last-client-context"
import { useState } from "react"
import { NewClientDialog } from "./new-client-dialog"
import { History } from "lucide-react"

interface ClientSearchDialogProps {
  isOpen: boolean
  onClose: () => void
  onClientSelect: (client: Client) => void
  selectedTime?: string
}

interface Client {
  id: string
  name: string
  phone: string
  email: string
  clientNumber: string
  clinic: string
}

const TEST_CLIENTS = [
  {
    id: "1",
    name: "vicente blasco",
    phone: "+34627378552",
    email: "casblasvic@gmail.com",
    clientNumber: "949",
    clinic: "Multilaser Californie",
  },
  {
    id: "2",
    name: "Vicente Test",
    phone: "+212111333444",
    email: "",
    clientNumber: "9239",
    clinic: "Multilaser Californie",
  },
]

export function ClientSearchDialog({ isOpen, onClose, onClientSelect, selectedTime }: ClientSearchDialogProps) {
  const { lastClient, setLastClient } = useLastClient()
  const [formData, setFormData] = useState({
    nombre: "",
    primerApellido: "",
    segundoApellido: "",
    telefono: "",
    numeroCliente: "",
  })
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false)
  const [searchResults, setSearchResults] = useState<Client[]>([])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSearch = () => {
    const results = TEST_CLIENTS.filter((client) => client.name.toLowerCase().includes(formData.nombre.toLowerCase()))
    setSearchResults(results)
  }

  const handleClientSelection = (client: Client) => {
    setLastClient(client)
    onClientSelect(client)
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[700px] md:max-w-[900px] p-0">
          <DialogTitle className="p-6 pb-0">Buscar cliente</DialogTitle>
          <div className="p-6 space-y-6">
            <div className="flex flex-col h-full">
              <h2 className="text-xl font-semibold mb-4">Buscador de clientes</h2>

              {/* Quick Select Button */}
              {lastClient && (
                <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-purple-600" />
                      <div>
                        <div className="font-medium text-purple-900">{lastClient.name}</div>
                        <div className="text-sm text-purple-700">Último cliente seleccionado</div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      className="text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                      onClick={() => handleClientSelection(lastClient)}
                    >
                      Seleccionar
                    </Button>
                  </div>
                </div>
              )}

              {/* Search Form */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <Input name="nombre" value={formData.nombre} onChange={handleInputChange} placeholder="Nombre" />
                <Input
                  name="primerApellido"
                  value={formData.primerApellido}
                  onChange={handleInputChange}
                  placeholder="Primer apellido"
                />
                <Input
                  name="segundoApellido"
                  value={formData.segundoApellido}
                  onChange={handleInputChange}
                  placeholder="Segundo apellido"
                />
                <Input name="telefono" value={formData.telefono} onChange={handleInputChange} placeholder="Teléfono" />
              </div>

              <div className="flex gap-3 mb-4">
                <Input
                  name="numeroCliente"
                  value={formData.numeroCliente}
                  onChange={handleInputChange}
                  placeholder="Nº Cliente"
                  className="max-w-[200px]"
                />
                <Button variant="default" className="bg-purple-600 hover:bg-purple-700 ml-auto" onClick={handleSearch}>
                  Buscar
                </Button>
              </div>

              {/* Results */}
              <div className="flex-1 overflow-y-auto">
                {searchResults.map((client) => (
                  <div key={client.id} className="border-b last:border-b-0 p-3 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{client.name}</div>
                        <div className="text-sm text-gray-500">
                          Nº {client.clientNumber} · {client.phone}
                        </div>
                        {client.email && <div className="text-sm text-gray-500">{client.email}</div>}
                      </div>
                      <Button
                        variant="ghost"
                        className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                        onClick={() => handleClientSelection(client)}
                      >
                        Seleccionar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                <Button variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button
                  variant="default"
                  className="bg-purple-600 hover:bg-purple-700"
                  onClick={() => setIsNewClientDialogOpen(true)}
                >
                  Nuevo cliente
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <NewClientDialog isOpen={isNewClientDialogOpen} onClose={() => setIsNewClientDialogOpen(false)} />
    </>
  )
}

