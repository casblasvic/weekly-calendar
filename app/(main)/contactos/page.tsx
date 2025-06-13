"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, UserPlus, FilePenLine, Trash2, Eye, Users, Target, Building2 } from "lucide-react"
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

// Mock data con diferentes tipos de contactos
const mockContacts = [
  {
    id: "1",
    name: "Juan Pérez",
    email: "juan.perez@ejemplo.com",
    phone: "555-123-4567",
    lastVisit: "2023-10-15",
    type: "client",
    roles: ["Cliente"],
  },
  {
    id: "2",
    name: "María García",
    email: "maria.garcia@ejemplo.com",
    phone: "555-765-4321",
    lastVisit: "2023-11-05",
    type: "client",
    roles: ["Cliente", "Lead"],
  },
  {
    id: "3",
    name: "Carlos Rodríguez",
    email: "carlos.rodriguez@ejemplo.com",
    phone: "555-987-6543",
    lastVisit: "2023-09-28",
    type: "lead",
    roles: ["Lead"],
    company: "Tech Solutions S.L.",
  },
  {
    id: "4",
    name: "Ana Martínez",
    email: "ana.martinez@ejemplo.com",
    phone: "555-456-7890",
    lastVisit: "2023-11-12",
    type: "contact",
    roles: ["Contacto"],
    company: "Innovación Digital S.A.",
  },
  {
    id: "5",
    name: "Roberto Sánchez",
    email: "roberto.sanchez@ejemplo.com",
    phone: "555-321-0987",
    lastVisit: "2023-10-30",
    type: "employee",
    roles: ["Empleado", "Cliente"],
  },
]

export default function ContactosPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const router = useRouter()

  // Filter contacts based on search and type
  const filteredContacts = mockContacts.filter((contact) => {
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

  // Format date to Spanish locale
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
    return new Date(dateString).toLocaleDateString("es-ES", options)
  }

  // Navigate to new contact page
  const handleNewContact = () => {
    router.push("/clientes/nuevo")
  }

  // View contact details
  const handleViewContact = (id: string) => {
    router.push(`/clientes/${id}`)
  }

  // Edit contact
  const handleEditContact = (id: string) => {
    router.push(`/clientes/${id}/editar`)
  }

  // Delete contact (would be connected to an API in a real app)
  const handleDeleteContact = (id: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar este contacto?")) {
      // Delete logic would go here
      console.log(`Deleted contact ${id}`)
    }
  }

  // Get badge variant based on role
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

      <Card>
        <CardHeader>
          <CardTitle>Buscar Contactos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por nombre, email, teléfono o empresa..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filterType === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("all")}
            >
              Todos
            </Button>
            <Button
              variant={filterType === "client" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("client")}
            >
              Clientes
            </Button>
            <Button
              variant={filterType === "lead" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("lead")}
            >
              Leads
            </Button>
            <Button
              variant={filterType === "contact" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("contact")}
            >
              Contactos Empresa
            </Button>
            <Button
              variant={filterType === "employee" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("employee")}
            >
              Empleados
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="hidden md:table-cell">Teléfono</TableHead>
                  <TableHead className="hidden lg:table-cell">Empresa</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead className="hidden lg:table-cell">Última Actividad</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.length > 0 ? (
                  filteredContacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-medium">{contact.name}</TableCell>
                      <TableCell>{contact.email}</TableCell>
                      <TableCell className="hidden md:table-cell">{contact.phone}</TableCell>
                      <TableCell className="hidden lg:table-cell">{contact.company || "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {contact.roles.map((role, index) => (
                            <Badge key={index} variant={getRoleBadgeVariant(role)} className="text-xs">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">{formatDate(contact.lastVisit)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleViewContact(contact.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Detalles
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditContact(contact.id)}>
                              <FilePenLine className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteContact(contact.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No se encontraron contactos.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Quick stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contactos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockContacts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Activos</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockContacts.filter((c) => c.roles.includes("Cliente")).length}
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
              {mockContacts.filter((c) => c.roles.includes("Lead")).length}
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
              {new Set(mockContacts.filter((c) => c.company).map((c) => c.company)).size}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
