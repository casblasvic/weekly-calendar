"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, /* QrCode, */ ArrowLeft, HelpCircle, ChevronUp, ChevronDown, Plus, Pencil, Trash, UserX, UserCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useUser, Usuario } from "@/contexts/user-context"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

// --- INICIO: Función auxiliar isSameId ---
const isSameId = (id1: string | number, id2: string | number): boolean => {
  return String(id1) === String(id2);
};
// --- FIN: Función auxiliar isSameId ---

type SortField = "lastName" | "firstName" | "email" | "isActive"
type SortDirection = "asc" | "desc"

export default function UsuariosPage() {
  const router = useRouter()
  const { usuarios: allUsuarios, isLoading, error, refetchUsuarios, toggleUsuarioStatus, createUsuario } = useUser()
  
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showDisabled, setShowDisabled] = useState(false)
  const [sortField, setSortField] = useState<SortField>("lastName")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [showHelp, setShowHelp] = useState(false)
  const [showNewUserDialog, setShowNewUserDialog] = useState(false)
  
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [confirmEmail, setConfirmEmail] = useState("")
  const [password, setPassword] = useState("")
  const [phone, setPhone] = useState("")

  // Estado local para la lista de usuarios (se actualiza optimistamente)
  const [usuariosLocales, setUsuariosLocales] = useState<Usuario[]>([])

  // Efecto para inicializar el estado local cuando los usuarios del contexto cambian
  useEffect(() => {
    setUsuariosLocales(allUsuarios)
  }, [allUsuarios])

  const handleSort = (field: SortField) => {
    const newDirection = (sortField === field && sortDirection === "asc") ? "desc" : "asc"
    setSortField(field)
    setSortDirection(newDirection)
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null
    return sortDirection === "asc" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
  }

  // --- NUEVO: Filtrado y ordenación con useMemo sobre el estado local ---
  const filteredAndSortedUsuarios = useMemo(() => {
    console.log("Recalculando filteredAndSortedUsuarios...") // Log para depuración
    let filtered = usuariosLocales.filter(usuario => { // <-- Filtra sobre usuariosLocales
      const searchTermLower = searchTerm.toLowerCase()
      const matchesSearch = 
        (usuario.firstName?.toLowerCase() || '').includes(searchTermLower) ||
        (usuario.lastName?.toLowerCase() || '').includes(searchTermLower) ||
        (usuario.email?.toLowerCase() || '').includes(searchTermLower)
      
      // Aplica filtro de estado (mostrar inactivos o solo activos)
      const matchesStatus = showDisabled ? true : usuario.isActive
      
      return matchesSearch && matchesStatus
    })

    // Aplica ordenación
    filtered.sort((a, b) => {
      const valA = a[sortField] ?? ''
      const valB = b[sortField] ?? ''
      const modifier = sortDirection === "asc" ? 1 : -1

      if (typeof valA === 'string' && typeof valB === 'string') {
        return valA.localeCompare(valB) * modifier
      } 
      if (typeof valA === 'boolean' && typeof valB === 'boolean') {
        return (valA === valB ? 0 : valA ? 1 : -1) * modifier
      }
      // Fallback para otros tipos (números, fechas si existieran)
      if (valA < valB) return -1 * modifier
      if (valA > valB) return 1 * modifier
      return 0
    })

    return filtered
  // Dependencias: estado local, filtros y ordenación
  }, [usuariosLocales, searchTerm, showDisabled, sortField, sortDirection]); 
  // --- FIN NUEVO --- 

  const handleToggleUserStatus = async (userId: string, currentState: boolean) => {
    try {
      const success = await toggleUsuarioStatus(userId);
      if (success) {
        // MODIFICADO: Actualizar estado LOCAL "usuariosLocales" 
        setUsuariosLocales(prevUsuarios => 
          prevUsuarios.map(u => 
            isSameId(u.id, userId) ? { ...u, isActive: !currentState } : u
          )
        );
        toast({
          title: "Estado actualizado",
          description: `El usuario ha sido ${currentState ? "desactivado" : "activado"} correctamente.`,
        });
      } else {
        throw new Error("No se pudo actualizar el estado del usuario desde el contexto.");
      }
    } catch (error) {
      console.error("Error al actualizar estado del usuario desde el componente:", error);
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "No se pudo actualizar el estado del usuario.", 
        variant: "destructive" 
      });
    }
  };

  const handleCreateUser = async () => {
    if (!firstName.trim()) { toast({ title: "Error", description: "El nombre es obligatorio", variant: "destructive" }); return }
    if (!lastName.trim()) { toast({ title: "Error", description: "El apellido es obligatorio", variant: "destructive" }); return }
    if (!email.trim()) { toast({ title: "Error", description: "El email es obligatorio", variant: "destructive" }); return }
    if (email !== confirmEmail) { toast({ title: "Error", description: "Los emails no coinciden", variant: "destructive" }); return }
    if (!password) { toast({ title: "Error", description: "La contraseña es obligatoria", variant: "destructive" }); return }

    try {
      const newUserPayload = {
        firstName,
        lastName,
        email,
        password,
        phone: phone || null,
        profileImageUrl: null,
        isActive: true,
      }

      const createdUser = await createUsuario(newUserPayload)
      
      if (createdUser) {
        toast({ title: "Usuario creado", description: "Usuario creado correctamente." })
        setFirstName("")
        setLastName("")
        setEmail("")
        setConfirmEmail("")
        setPassword("")
        setPhone("")
        setShowNewUserDialog(false)
        refetchUsuarios()
      } else {
        toast({ title: "Error", description: "No se pudo crear el usuario (desde contexto)", variant: "destructive" })
      }
      
    } catch (error) {
      console.error("Error al crear usuario:", error)
      toast({ title: "Error", description: typeof error === 'string' ? error : "No se pudo crear el usuario.", variant: "destructive" })
    }
  }

  return (
    <div className="relative pb-20">
      <div className="container max-w-6xl p-4 mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Gestión de Usuarios</h1>
        </div>

        <Card>
          <div className="flex flex-col items-center gap-4 p-4 border-b md:flex-row">
            <div className="relative flex-grow w-full md:max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nombre, apellidos o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 h-9"
              />
            </div>
            <div className="flex items-center self-end space-x-2 md:self-center">
              <Checkbox id="showDisabled" checked={showDisabled} onCheckedChange={(checked) => setShowDisabled(Boolean(checked))} />
              <Label htmlFor="showDisabled">Mostrar inactivos</Label>
            </div>
          </div>

          {isLoading && <p className="p-4 text-center">Cargando usuarios...</p>}
          {error && <p className="p-4 text-center text-red-600">Error: {error}</p>}

          {!isLoading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('lastName')}>
                      Apellidos {getSortIcon('lastName')}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('firstName')}>
                      Nombre {getSortIcon('firstName')}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('email')}>
                      Email {getSortIcon('email')}
                  </TableHead>
                  <TableHead className="cursor-pointer text-center" onClick={() => handleSort('isActive')}>
                      Estado {getSortIcon('isActive')}
                  </TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedUsuarios.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center">No se encontraron usuarios.</TableCell></TableRow>
                )}
                {filteredAndSortedUsuarios.map((usuario) => (
                  <TableRow key={usuario.id} className="hover:bg-muted/50">
                    <TableCell>{usuario.lastName}</TableCell>
                    <TableCell>{usuario.firstName}</TableCell>
                    <TableCell>{usuario.email}</TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={usuario.isActive ? "default" : "destructive"}
                        className="cursor-pointer hover:opacity-80" 
                        onClick={() => handleToggleUserStatus(usuario.id, usuario.isActive)}
                      >
                        {usuario.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" title={usuario.isActive ? "Desactivar" : "Activar"} onClick={() => handleToggleUserStatus(usuario.id, usuario.isActive)}>
                        <Trash className="h-4 w-4 text-red-600" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => router.push(`/configuracion/usuarios/${usuario.id}`)}>
                         <Pencil className="h-4 w-4 text-blue-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      <div className="fixed bottom-4 right-4 z-50 flex gap-2">
        <Button 
          variant="outline" 
          onClick={() => router.back()}
          className="flex items-center gap-1 bg-white shadow-md hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Button>

        <Dialog open={showNewUserDialog} onOpenChange={setShowNewUserDialog}>
          <DialogTrigger asChild>
            <Button 
              className="flex items-center gap-1 shadow-md bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="w-4 h-4" /> 
              Añadir Usuario
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Añadir Nuevo Usuario</DialogTitle>
              <DialogDescription>
                Complete los detalles del nuevo usuario. Se enviará un email de bienvenida (pendiente).
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 px-6">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nombre</Label>
                <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Apellidos</Label>
                <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmEmail">Confirmar Email</Label>
                <Input id="confirmEmail" type="email" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono (Opcional)</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                onClick={handleCreateUser}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Crear Usuario
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button 
          variant="outline"
          onClick={() => setShowHelp(!showHelp)} 
          className="flex items-center gap-1 bg-white shadow-md hover:bg-gray-100"
          title="Ayuda"
        >
          <HelpCircle className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

