"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, /* QrCode, */ ArrowLeft, HelpCircle, ChevronUp, ChevronDown, Plus, Edit, UserX, UserCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useUser, Usuario } from "@/contexts/user-context"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

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

  useEffect(() => {
    setUsuarios(allUsuarios)
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

  useEffect(() => {
    let filtered = allUsuarios.filter(usuario => {
      const searchTermLower = searchTerm.toLowerCase()
      const matchesSearch = 
        (usuario.firstName?.toLowerCase() || '').includes(searchTermLower) ||
        (usuario.lastName?.toLowerCase() || '').includes(searchTermLower) ||
        (usuario.email?.toLowerCase() || '').includes(searchTermLower)
      
      const matchesStatus = showDisabled ? true : usuario.isActive
      
      return matchesSearch && matchesStatus
    })

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
      if (valA < valB) return -1 * modifier
      if (valA > valB) return 1 * modifier
      return 0
    })

    setUsuarios(filtered)

  }, [searchTerm, showDisabled, sortField, sortDirection, allUsuarios])

  const handleToggleUserStatus = async (userId: string, currentState: boolean) => {
    try {
      console.warn("toggleUsuarioStatus pendiente de API en contexto")
      setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, isActive: !currentState } : u))
      toast({
        title: "Estado actualizado (Simulado)",
        description: "El estado del usuario se actualizará cuando la API esté implementada.",
      })
    } catch (error) {
      console.error("Error al actualizar estado del usuario:", error)
      toast({ title: "Error", description: "No se pudo actualizar el estado.", variant: "destructive" })
    }
  }

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
    <Card className="m-4">
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-xl font-semibold">Gestión de Usuarios</h1>
        <div className="flex items-center space-x-2">
           <Dialog open={showNewUserDialog} onOpenChange={setShowNewUserDialog}>
              <DialogTrigger asChild>
                 <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Añadir Usuario</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Añadir Nuevo Usuario</DialogTitle>
                  <DialogDescription>
                    Complete los detalles del nuevo usuario. Se enviará un email de bienvenida (pendiente).
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="firstName" className="text-right">Nombre</Label>
                    <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="lastName" className="text-right">Apellidos</Label>
                    <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className="col-span-3" />
                  </div>
                   <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="col-span-3" />
                  </div>
                   <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="confirmEmail" className="text-right">Confirmar Email</Label>
                    <Input id="confirmEmail" type="email" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} className="col-span-3" />
                  </div>
                   <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="password" className="text-right">Contraseña</Label>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="col-span-3" />
                  </div>
                   <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="phone" className="text-right">Teléfono</Label>
                    <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="col-span-3" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" onClick={handleCreateUser}>Crear Usuario</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          <Button variant="outline" size="sm" onClick={() => setShowHelp(!showHelp)}><HelpCircle className="mr-2 h-4 w-4" /> Ayuda</Button>
        </div>
      </div>
      
      <div className="flex items-center justify-between p-4 space-x-2">
        <div className="flex items-center flex-grow space-x-2">
          <Search className="h-5 w-5 text-gray-400" />
          <Input 
            placeholder="Buscar por nombre, apellidos o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm flex-grow"
          />
        </div>
        <div className="flex items-center space-x-2">
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
            {usuarios.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center">No se encontraron usuarios.</TableCell></TableRow>
            )}
            {usuarios.map((usuario) => (
              <TableRow key={usuario.id}>
                <TableCell>{usuario.lastName}</TableCell>
                <TableCell>{usuario.firstName}</TableCell>
                <TableCell>{usuario.email}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={usuario.isActive ? "default" : "destructive"}>
                    {usuario.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" title={usuario.isActive ? "Desactivar" : "Activar"} onClick={() => handleToggleUserStatus(usuario.id, usuario.isActive)}>
                    {usuario.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" title="Editar" onClick={() => router.push(`/configuracion/usuarios/${usuario.id}`)}>
                     <Edit className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  )
}

