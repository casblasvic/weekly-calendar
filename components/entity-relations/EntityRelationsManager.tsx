"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Plus, User, Building, Trash2, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AnimatedDialog, AnimatedDialogContent, AnimatedDialogHeader, AnimatedDialogTitle, AnimatedDialogDescription } from "@/components/ui/animated-dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface EntityRelation {
  id: string
  entityAType: string
  entityAId: string
  entityBType: string
  entityBId: string
  relationType: string
  direction?: string
  notes?: string
  createdAt: string
  relatedEntity?: any
  relatedEntityType: string
}

interface EntityRelationsManagerProps {
  entityType: 'client' | 'user' | 'company' | 'lead' | 'contact'
  entityId: string
  systemId: string
  className?: string
}

const RELATION_TYPES = {
  client: [
    { value: 'madre', label: 'Madre' },
    { value: 'padre', label: 'Padre' },
    { value: 'tutor', label: 'Tutor/a' },
    { value: 'hijo', label: 'Hijo/a' },
    { value: 'conyuge', label: 'Cónyuge' },
    { value: 'hermano', label: 'Hermano/a' },
    { value: 'empresa', label: 'Empresa' },
    { value: 'empleado', label: 'Empleado' },
    { value: 'otro', label: 'Otro' }
  ],
  user: [
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'subordinado', label: 'Subordinado' },
    { value: 'compañero', label: 'Compañero' },
    { value: 'cliente_asignado', label: 'Cliente asignado' },
    { value: 'empresa_empleadora', label: 'Empresa empleadora' }
  ],
  company: [
    { value: 'filial', label: 'Filial' },
    { value: 'matriz', label: 'Matriz' },
    { value: 'proveedor', label: 'Proveedor' },
    { value: 'cliente', label: 'Cliente' },
    { value: 'partner', label: 'Partner' }
  ]
}

const ENTITY_TYPES = [
  { value: 'client', label: 'Cliente', icon: User, color: 'text-blue-600' },
  { value: 'company', label: 'Empresa', icon: Building, color: 'text-green-600' },
  { value: 'user', label: 'Empleado', icon: User, color: 'text-purple-600' },
  { value: 'lead', label: 'Lead', icon: User, color: 'text-orange-600' },
  { value: 'contact', label: 'Contacto', icon: User, color: 'text-yellow-600' }
]

export function EntityRelationsManager({
  entityType,
  entityId,
  systemId,
  className
}: EntityRelationsManagerProps) {
  const [relations, setRelations] = useState<EntityRelation[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [recentEntities, setRecentEntities] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedEntityType, setSelectedEntityType] = useState<string>("")
  const [selectedEntity, setSelectedEntity] = useState<any>(null)
  const [relationType, setRelationType] = useState("")
  const [notes, setNotes] = useState("")
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cargar relaciones existentes
  useEffect(() => {
    loadRelations()
  }, [entityId])

  const loadRelations = async () => {
    try {
      const response = await fetch(
        `/api/entity-relations?entityType=${entityType}&entityId=${entityId}&systemId=${systemId}`
      )
      if (response.ok) {
        const data = await response.json()
        setRelations(data)
      }
    } catch (error) {
      console.error("Error al cargar relaciones:", error)
    } finally {
      setLoading(false)
    }
  }

  // Buscar entidades con debounce
  const searchEntitiesDebounced = useCallback((query: string, type: string) => {
    // Limpiar timeout anterior si existe
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Si la búsqueda está vacía o muy corta, limpiar resultados
    if (!query || query.length < 2) {
      setSearchResults([])
      setSearching(false)
      return
    }

    // Mostrar estado de búsqueda
    setSearching(true)

    // Configurar nuevo timeout
    searchTimeoutRef.current = setTimeout(() => {
      searchEntities(query, type)
    }, 500)
  }, [systemId])

  // Buscar entidades según el tipo
  const searchEntities = async (query: string, type: string) => {
    try {
      setSearching(true)
      
      let endpoint = ""
      switch (type) {
        case "client":
          endpoint = `/api/clients/search?systemId=${systemId}&search=${encodeURIComponent(query)}&limit=10`
          break
        case "company":
          endpoint = `/api/companies/search?systemId=${systemId}&search=${encodeURIComponent(query)}&limit=10`
          break
        case "user":
          // Para empleados, buscar en la tabla User
          endpoint = `/api/users/search?systemId=${systemId}&search=${encodeURIComponent(query)}&limit=10&role=employee`
          break
        case "lead":
          endpoint = `/api/leads/search?systemId=${systemId}&search=${encodeURIComponent(query)}&limit=10`
          break
        case "contact":
          endpoint = `/api/contacts/search?systemId=${systemId}&search=${encodeURIComponent(query)}&limit=10`
          break
        default:
          console.error("Tipo de entidad no soportado:", type)
          setSearching(false)
          return
      }

      const response = await fetch(endpoint)
      if (!response.ok) {
        throw new Error("Error al buscar entidades")
      }

      const data = await response.json()
      setSearchResults(data.results || data || [])
    } catch (error) {
      console.error("Error buscando entidades:", error)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  // Cargar entidades recientes cuando se selecciona un tipo
  useEffect(() => {
    if (selectedEntityType && searchOpen) {
      loadRecentEntities(selectedEntityType)
    }
  }, [selectedEntityType, searchOpen])

  // Función para cargar entidades recientes o más usadas
  const loadRecentEntities = async (type: string) => {
    try {
      const endpoint = type === 'client' ? '/api/clients' : 
                      type === 'company' ? '/api/companies' : 
                      '/api/users'
      
      const params = new URLSearchParams({
        limit: '10',
        orderBy: 'createdAt',
        order: 'desc'
      })
      
      const response = await fetch(`${endpoint}?${params}`)
      if (response.ok) {
        const data = await response.json()
        setRecentEntities(data.data || data.clients || data.companies || data.users || [])
      }
    } catch (error) {
      console.error("Error al cargar entidades recientes:", error)
    }
  }

  // Crear nueva relación
  const handleCreateRelation = async () => {
    if (!selectedEntity || !relationType) return

    try {
      const response = await fetch('/api/entity-relations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          entityAType: entityType,
          entityAId: entityId,
          entityBType: selectedEntityType,
          entityBId: selectedEntity.id,
          relationType,
          notes,
          systemId
        })
      })

      if (response.ok) {
        await loadRelations()
        handleCloseModal()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al crear la relación')
      }
    } catch (error) {
      console.error("Error al crear relación:", error)
      alert('Error al crear la relación')
    }
  }

  // Eliminar relación
  const handleDeleteRelation = async (relationId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta relación?')) return

    try {
      const response = await fetch(`/api/entity-relations?id=${relationId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadRelations()
      }
    } catch (error) {
      console.error("Error al eliminar relación:", error)
    }
  }

  const handleCloseModal = () => {
    setShowAddModal(false)
    setSelectedEntityType("")
    setSelectedEntity(null)
    setRelationType("")
    setNotes("")
    setSearchQuery("")
    setSearchResults([])
  }

  const getEntityIcon = (type: string) => {
    const entity = ENTITY_TYPES.find(e => e.value === type)
    return entity ? entity.icon : User
  }

  const getEntityColor = (type: string) => {
    const entity = ENTITY_TYPES.find(e => e.value === type)
    return entity ? entity.color : 'text-gray-600'
  }

  const getEntityLabel = (entity: any, type: string) => {
    switch (type) {
      case 'client':
      case 'user':
      case 'lead':
      case 'contact':
        return `${entity.firstName} ${entity.lastName || ''}`
      case 'company':
        return entity.name
      default:
        return 'Desconocido'
    }
  }

  if (loading) {
    return <div className="text-center py-4">Cargando relaciones...</div>
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Tabla de relaciones */}
      {relations.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo de relación</TableHead>
              <TableHead>Entidad relacionada</TableHead>
              <TableHead>Notas</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {relations.map((relation) => {
              const Icon = getEntityIcon(relation.relatedEntityType)
              const color = getEntityColor(relation.relatedEntityType)
              
              return (
                <TableRow key={relation.id}>
                  <TableCell>
                    <Badge variant="outline">
                      {relation.relationType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Icon className={cn("h-4 w-4", color)} />
                      <span>
                        {relation.relatedEntity 
                          ? getEntityLabel(relation.relatedEntity, relation.relatedEntityType)
                          : 'Entidad no encontrada'}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {ENTITY_TYPES.find(e => e.value === relation.relatedEntityType)?.label}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">
                      {relation.notes || 'Sin notas'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRelation(relation.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No hay relaciones registradas</p>
          <p className="text-sm">Las relaciones permiten asociar esta entidad con otros clientes, empresas o empleados del sistema</p>
        </div>
      )}

      {/* Botón para añadir relación */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => setShowAddModal(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Añadir Relación
        </Button>
      </div>

      {/* Modal para añadir relación */}
      <AnimatedDialog open={showAddModal} onOpenChange={setShowAddModal}>
        <AnimatedDialogContent className="sm:max-w-[500px]">
          <AnimatedDialogHeader>
            <AnimatedDialogTitle>Añadir Nueva Relación</AnimatedDialogTitle>
            <AnimatedDialogDescription>
              Asocia esta entidad con otros clientes, empresas o empleados del sistema
            </AnimatedDialogDescription>
          </AnimatedDialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Selección del tipo de entidad */}
            <div className="space-y-2">
              <Label>Relacionado con</Label>
              <Select
                value={selectedEntityType}
                onValueChange={(value) => {
                  setSelectedEntityType(value)
                  setSelectedEntity(null)
                  setSearchResults([])
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo de entidad" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className={cn("h-4 w-4", type.color)} />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de relación */}
            <div className="space-y-2">
              <Label>Tipo de relación</Label>
              <Select value={relationType} onValueChange={setRelationType}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo de relación" />
                </SelectTrigger>
                <SelectContent>
                  {(RELATION_TYPES[entityType] || RELATION_TYPES.client).map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Búsqueda de entidad */}
            {selectedEntityType && (
              <div className="space-y-2">
                <Label>Buscar {ENTITY_TYPES.find(e => e.value === selectedEntityType)?.label}</Label>
                <Popover open={searchOpen} onOpenChange={setSearchOpen} modal={false}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={searchOpen}
                      className="w-full justify-between"
                    >
                      {selectedEntity
                        ? getEntityLabel(selectedEntity, selectedEntityType)
                        : `Seleccionar ${ENTITY_TYPES.find(e => e.value === selectedEntityType)?.label}...`}
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-[450px] p-0 z-[300]" 
                    align="start" 
                    sideOffset={4}
                    onInteractOutside={(e) => {
                      // Prevenir que se cierre si se hace clic dentro del contenido
                      const target = e.target as HTMLElement
                      if (target.closest('[role="combobox"]') || target.closest('.command-input')) {
                        e.preventDefault()
                      }
                    }}
                  >
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Buscar por nombre..."
                        value={searchQuery}
                        onValueChange={(value) => {
                          setSearchQuery(value)
                          searchEntitiesDebounced(value, selectedEntityType)
                        }}
                      />
                      <CommandList>
                        {searching ? (
                          <CommandEmpty>
                            <div className="flex items-center justify-center py-6">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                            </div>
                          </CommandEmpty>
                        ) : (
                          <>
                            {/* Mostrar resultados de búsqueda si hay query */}
                            {searchQuery.length >= 2 ? (
                              searchResults.length === 0 ? (
                                <CommandEmpty>
                                  No se encontraron resultados
                                </CommandEmpty>
                              ) : (
                                <CommandGroup heading="Resultados de búsqueda">
                                  {searchResults.slice(0, 20).map((result) => (
                                    <CommandItem
                                      key={result.id}
                                      value={result.id}
                                      onSelect={() => {
                                        setSelectedEntity(result)
                                        setSearchOpen(false)
                                        setSearchQuery("")
                                      }}
                                      className="cursor-pointer"
                                    >
                                      <div className="flex items-center gap-2 w-full">
                                        <span className="font-medium">
                                          {getEntityLabel(result, selectedEntityType)}
                                        </span>
                                        {result.email && (
                                          <span className="text-sm text-muted-foreground">
                                            {result.email}
                                          </span>
                                        )}
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              )
                            ) : (
                              /* Mostrar sugerencias recientes cuando no hay búsqueda */
                              recentEntities.length > 0 ? (
                                <CommandGroup heading="Recientes">
                                  {recentEntities.map((entity) => (
                                    <CommandItem
                                      key={entity.id}
                                      value={entity.id}
                                      onSelect={() => {
                                        setSelectedEntity(entity)
                                        setSearchOpen(false)
                                        setSearchQuery("")
                                      }}
                                      className="cursor-pointer"
                                    >
                                      <div className="flex items-center gap-2 w-full">
                                        <span className="font-medium">
                                          {getEntityLabel(entity, selectedEntityType)}
                                        </span>
                                        {entity.email && (
                                          <span className="text-sm text-muted-foreground">
                                            {entity.email}
                                          </span>
                                        )}
                                      </div>
                                    </CommandItem>
                                  ))}
                                  <CommandItem disabled className="text-sm text-muted-foreground text-center">
                                    Escribe al menos 2 caracteres para buscar más
                                  </CommandItem>
                                </CommandGroup>
                              ) : (
                                <CommandEmpty>
                                  Escribe al menos 2 caracteres para buscar
                                </CommandEmpty>
                              )
                            )}
                          </>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Notas */}
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Información adicional sobre la relación..."
                className="min-h-[80px]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateRelation}
              disabled={!selectedEntity || !relationType}
            >
              Añadir Relación
            </Button>
          </div>
        </AnimatedDialogContent>
      </AnimatedDialog>
    </div>
  )
}
