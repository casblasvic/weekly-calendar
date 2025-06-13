"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, UserPlus, FilePenLine, Trash2, Eye, Users, Target, Building2, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface Contact {
  id: string
  name: string
  email: string
  phone: string
  lastVisit: string | null
  type: string
  roles: string[]
  company: string | null
  leadData?: {
    status: string
    source: string | null
    assignedTo: string | null
    priority: string | null
    estimatedValue: number | null
  } | null
  contactData?: {
    position: string | null
    department: string | null
    isPrimary: boolean
  } | null
  clientData?: {
    isActive: boolean
    marketingConsent: boolean
    originClinic: string | null
  } | null
}

export default function ContactosPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const router = useRouter()

  // Cargar contactos desde la API
  useEffect(() => {
    fetchContacts()
  }, [])

  const fetchContacts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/contacts')
      if (!response.ok) {
        throw new Error('Error al cargar contactos')
      }
      const data = await response.json()
      setContacts(data)
    } catch (error) {
      console.error('Error fetching contacts:', error)
      toast.error('Error al cargar los contactos')
    } finally {
      setLoading(false)
    }
  }

  // Filtrar contactos basado en búsqueda y tipo
  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phone.includes(searchTerm) ||
      (contact.company && contact.company.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesType =
      filterType === "all" ||
      (filterType === "client" && contact.roles.includes("Cliente")) ||
      (filterType === "lead" && contact.roles.includes("Lead")) ||
      (filterType === "contact" && contact.roles.includes("Contacto")) ||
      (filterType === "employee" && contact.roles.includes("Empleado"))

    return matchesSearch && matchesType
  })

  // Formatear fecha al formato español
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Sin visitas"
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
    return new Date(dateString).toLocaleDateString("es-ES", options)
  }

  // Navegar a nueva persona
  const handleNewContact = () => {
    router.push("/clientes/nuevo")
  }

  // Ver detalles del contacto
  const handleViewContact = (id: string) => {
    router.push(`/clientes/${id}`)
  }

  // Editar contacto
  const handleEditContact = (id: string) => {
    router.push(`/clientes/${id}/editar`)
  }

  // Eliminar contacto
  const handleDeleteContact = async (id: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar este contacto?")) {
      try {
        const response = await fetch(`/api/persons/${id}`, {
          method: 'DELETE',
        })
        if (!response.ok) {
          throw new Error('Error al eliminar contacto')
        }
        toast.success('Contacto eliminado correctamente')
        fetchContacts() // Recargar la lista
      } catch (error) {
        console.error('Error deleting contact:', error)
        toast.error('Error al eliminar el contacto')
      }
    }
  }

  // Obtener variante de badge según el rol
  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "outline" | "destructive" => {
    switch (role) {
      case "Cliente":
        return "default"
      case "Lead":
        return "secondary"
      case "Contacto":
        return "outline"
      case "Empleado":
        return "destructive"
      default:
        return "outline"
    }
  }

  // Obtener color del estado del lead
  const getLeadStatusColor = (status: string) => {
    switch (status) {
      case "NEW":
        return "text-blue-600 bg-blue-50"
      case "CONTACTED":
        return "text-yellow-600 bg-yellow-50"
      case "QUALIFIED":
        return "text-green-600 bg-green-50"
      case "LOST":
        return "text-red-600 bg-red-50"
      default:
        return "text-gray-600 bg-gray-50"
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          <h1 className="text-2xl font-bold tracking-tight">Contactos</h1>
        </div>
        <Button onClick={handleNewContact} className="bg-[#8a70d6] hover:bg-[#7c63c3]">
          <UserPlus className="mr-2 h-4 w-4" />
          Nuevo Contacto
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contactos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contacts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {contacts.filter(c => c.roles.includes("Cliente")).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {contacts.filter(c => c.roles.includes("Lead")).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empresas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(contacts.filter(c => c.company).map(c => c.company)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email, teléfono o empresa"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8a70d6]"
        >
          <option value="all">Todos los tipos</option>
          <option value="client">Clientes</option>
          <option value="lead">Leads</option>
          <option value="contact">Contactos</option>
          <option value="employee">Empleados</option>
        </select>
      </div>

      {/* Tabla de contactos */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Última Visita</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  <p className="mt-2 text-sm text-muted-foreground">Cargando contactos...</p>
                </TableCell>
              </TableRow>
            ) : filteredContacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No se encontraron contactos</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredContacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">{contact.name}</TableCell>
                  <TableCell>{contact.email}</TableCell>
                  <TableCell>{contact.phone}</TableCell>
                  <TableCell>{contact.company || "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {contact.roles.map((role) => (
                        <Badge key={role} variant={getRoleBadgeVariant(role)}>
                          {role}
                        </Badge>
                      ))}
                    </div>
                    {contact.leadData && (
                      <div className={`mt-1 text-xs px-2 py-1 rounded-full inline-block ${getLeadStatusColor(contact.leadData.status)}`}>
                        {contact.leadData.status}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(contact.lastVisit)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleViewContact(contact.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          <span>Ver detalles</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditContact(contact.id)}>
                          <FilePenLine className="mr-2 h-4 w-4" />
                          <span>Editar</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDeleteContact(contact.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Eliminar</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
