"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useLastClient } from "@/contexts/last-client-context"
import { useState, useEffect, useCallback } from "react"
import { NewClientDialog } from "./new-client-dialog"
import { History, Search, Loader2, UserPlus, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { debounce } from "lodash"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"

interface PersonSearchDialogProps {
  isOpen: boolean
  onClose: () => void
  onPersonSelect: (person: Person) => void
  selectedTime?: string
}

interface Person {
  id: string
  firstName: string
  lastName: string
  name?: string // Para compatibilidad con el formato antiguo
  phone: string
  email: string
  address?: string
  city?: string
  postalCode?: string
  clientData?: {
    address?: string
    city?: string
    postalCode?: string
    countryIsoCode?: string
    marketingConsent?: boolean
    isActive?: boolean
  }
}

// Interfaz adaptadora para el contexto lastClient
interface ClientAdapter {
  id: string
  name: string
  clientNumber: string
  phone: string
  email: string
  clinic: string
  avatar?: string
}

export function PersonSearchDialog({ isOpen, onClose, onPersonSelect, selectedTime }: PersonSearchDialogProps) {
  const { lastClient, setLastClient } = useLastClient()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<Person[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false)

  // Función para buscar personas con debounce
  const searchPersons = useCallback(
    debounce(async (search: string) => {
      if (!search.trim()) {
        setSearchResults([])
        setIsSearching(false)
        return
      }

      setIsSearching(true)
      try {
        const response = await fetch(`/api/persons?search=${encodeURIComponent(search)}`)
        if (!response.ok) {
          throw new Error('Error al buscar personas')
        }

        const data = await response.json()
        
        // Transformar los datos para compatibilidad con el formato esperado
        const transformedData = data.map((person: any) => ({
          ...person,
          name: `${person.firstName} ${person.lastName}`.trim()
        }))
        
        setSearchResults(transformedData)
      } catch (error) {
        console.error('Error searching persons:', error)
        toast({
          title: "Error",
          description: "No se pudieron buscar las personas. Por favor, intenta de nuevo.",
          variant: "destructive",
        })
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300),
    [toast]
  )

  // Efecto para buscar cuando cambia el término de búsqueda
  useEffect(() => {
    searchPersons(searchTerm)
  }, [searchTerm, searchPersons])

  // Limpiar resultados al cerrar
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("")
      setSearchResults([])
    }
  }, [isOpen])

  // Convertir Person a formato compatible con el contexto lastClient
  const personToClient = (person: Person): ClientAdapter => {
    return {
      id: person.id,
      name: person.name || `${person.firstName} ${person.lastName}`.trim(),
      clientNumber: '', // Este campo no existe en Person, usar vacío por ahora
      phone: person.phone || '',
      email: person.email || '',
      clinic: '', // Este campo no existe en Person, usar vacío por ahora
      avatar: undefined
    }
  }

  // Convertir lastClient a Person para mostrar
  const clientToPerson = (client: ClientAdapter): Person => {
    const [firstName, ...lastNameParts] = client.name.split(' ')
    return {
      id: client.id,
      firstName: firstName || '',
      lastName: lastNameParts.join(' ') || '',
      name: client.name,
      phone: client.phone,
      email: client.email
    }
  }

  const handlePersonSelection = (person: Person) => {
    const personWithName = {
      ...person,
      name: person.name || `${person.firstName} ${person.lastName}`.trim()
    }
    setLastClient(personToClient(personWithName))
    onPersonSelect(personWithName)
    onClose()
  }

  const handleNewClientCreated = () => {
    // Cerrar el diálogo de nuevo cliente
    setIsNewClientDialogOpen(false)
    // Refrescar la búsqueda si hay un término
    if (searchTerm) {
      searchPersons(searchTerm)
    }
  }

  // Función para obtener la dirección completa
  const getFullAddress = (person: Person) => {
    const parts = []
    const address = person.clientData?.address || person.address
    const postalCode = person.clientData?.postalCode || person.postalCode
    const city = person.clientData?.city || person.city
    
    if (address) parts.push(address)
    if (postalCode) parts.push(postalCode)
    if (city) parts.push(city)
    
    return parts.join(', ')
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[900px] h-[600px] p-0 flex flex-col">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle>Buscar Persona</DialogTitle>
            <DialogDescription>
              Busca una persona existente por nombre, teléfono o email para asignarlo a la cita.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-6 pb-2">
            {/* Quick Select Button */}
            {lastClient && (
              <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-purple-600" />
                    <div>
                      <div className="font-medium text-purple-900">{lastClient.name}</div>
                      <div className="text-sm text-purple-700">Última persona seleccionada</div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePersonSelection(clientToPerson(lastClient))}
                    className="text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Search Input */}
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Buscar por nombre, teléfono o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                )}
              </div>

              {/* Create New Person Button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsNewClientDialogOpen(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Crear nueva persona
              </Button>
            </div>
          </div>

          {/* Search Results Table */}
          <div className="flex-1 px-6 pb-6 overflow-hidden">
            {searchTerm && !isSearching && searchResults.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No se encontraron resultados para "{searchTerm}"
              </div>
            ) : searchResults.length > 0 ? (
              <div className="border rounded-lg h-full">
                <ScrollArea className="h-full">
                  <style jsx global>{`
                    /* Personalizar scrollbar para que sea violeta */
                    [data-radix-scroll-area-viewport] {
                      scrollbar-width: thin;
                      scrollbar-color: #9333ea #f3f4f6;
                    }
                    
                    [data-radix-scroll-area-viewport]::-webkit-scrollbar {
                      width: 8px;
                      height: 8px;
                    }
                    
                    [data-radix-scroll-area-viewport]::-webkit-scrollbar-track {
                      background: #f3f4f6;
                      border-radius: 4px;
                    }
                    
                    [data-radix-scroll-area-viewport]::-webkit-scrollbar-thumb {
                      background: #9333ea;
                      border-radius: 4px;
                    }
                    
                    [data-radix-scroll-area-viewport]::-webkit-scrollbar-thumb:hover {
                      background: #7c3aed;
                    }
                  `}</style>
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                      <TableRow>
                        <TableHead className="w-[200px]">Nombre</TableHead>
                        <TableHead className="w-[150px]">Teléfono</TableHead>
                        <TableHead className="w-[200px]">Email</TableHead>
                        <TableHead>Dirección</TableHead>
                        <TableHead className="w-[80px] text-center">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {searchResults.map((person) => (
                        <TableRow 
                          key={person.id} 
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handlePersonSelection(person)}
                        >
                          <TableCell className="font-medium">
                            {person.firstName} {person.lastName}
                          </TableCell>
                          <TableCell>{person.phone || '-'}</TableCell>
                          <TableCell className="text-sm">{person.email || '-'}</TableCell>
                          <TableCell className="text-sm">{getFullAddress(person) || '-'}</TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                              onClick={(e) => {
                                e.stopPropagation()
                                handlePersonSelection(person)
                              }}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            ) : searchTerm && isSearching ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Ingresa un término de búsqueda para encontrar personas
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <NewClientDialog
        isOpen={isNewClientDialogOpen}
        onClose={() => {
          setIsNewClientDialogOpen(false)
          handleNewClientCreated()
        }}
      />
    </>
  )
}
