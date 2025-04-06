"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, ArrowLeft, HelpCircle, ChevronUp, ChevronDown, Plus, Edit, UserX, UserCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useUser, Usuario } from "@/contexts/user-context"
import { useClinic, Clinica } from "@/contexts/clinic-context"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import * as React from 'react'

type SortField = "lastName" | "firstName" | "email" | "isActive"
type SortDirection = "asc" | "desc"

export default function ClinicaUsuariosPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const clinicaId = params.id
  
  const { usuarios: allUsuarios, isLoading: isLoadingUsers, error: userError, refetchUsuarios, toggleUsuarioStatus, createUsuario, getUsuariosByClinica } = useUser()
  const { getClinicaById } = useClinic()
  
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [clinica, setClinica] = useState<Clinica | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showDisabled, setShowDisabled] = useState(false)
  const [sortField, setSortField] = useState<SortField>("lastName")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [showHelp, setShowHelp] = useState(false)
  const [showNewUserDialog, setShowNewUserDialog] = useState(false)
  
  // Form fields for new user
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [confirmEmail, setConfirmEmail] = useState("")
  const [password, setPassword] = useState("")
  const [phone, setPhone] = useState("")

  // Cargar datos de la clínica y filtrar usuarios
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        // Cargar clínica
        const clinicaData = await getClinicaById(clinicaId)
        if (!clinicaData) {
          toast({ title: "Error", description: "Clínica no encontrada", variant: "destructive" })
          router.push("/configuracion/clinicas")
          return
        }
        setClinica(clinicaData)
        
        // Cargar usuarios de la clínica (función pendiente de API en contexto)
        // La función actual devuelve [] hasta que la API esté lista
        const usuariosClinica = await getUsuariosByClinica(clinicaId)
        console.warn("Mostrando usuarios filtrados localmente (getUsuariosByClinica pendiente de API)")
        // COMO FALLBACK TEMPORAL MIENTRAS getUsuariosByClinica está pendiente, filtrar todos:
        // TODO: Quitar este filtro cuando getUsuariosByClinica funcione con la API
        const fallbackUsuarios = allUsuarios
        // Necesitaríamos saber cómo se relaciona User con Clinic en Prisma para filtrar aquí
        // Ejemplo si User tiene clinicId: fallbackUsuarios.filter(u => u.clinicId === clinicaId)
        // Ejemplo si User tiene una relación M2M UserClinic: buscar en esa tabla
        // Por ahora, mostramos *todos* los usuarios como placeholder
        setUsuarios(fallbackUsuarios)
        
      } catch (error) {
        console.error("Error al cargar datos:", error)
        toast({ title: "Error", description: "No se pudieron cargar los datos", variant: "destructive" })
        router.push("/configuracion/clinicas")
      } finally {
        setIsLoading(false)
      }
    }
    
    if (clinicaId && allUsuarios.length > 0) { // Esperar a que allUsuarios tenga datos
      loadData()
    } else if (!isLoadingUsers && allUsuarios.length === 0) {
      // Si ya terminó de cargar y no hay usuarios, podemos continuar
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicaId, getClinicaById, getUsuariosByClinica, router, allUsuarios, isLoadingUsers])

  // Ordenación (similar a la página general, pero usa el estado local 'usuarios')
  const handleSort = (field: SortField) => {
    const newDirection = (sortField === field && sortDirection === "asc") ? "desc" : "asc"
    setSortField(field)
    setSortDirection(newDirection)
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null
    return sortDirection === "asc" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
  }

  // Filtrado y Ordenación (similar a la página general, pero actúa sobre 'usuarios')
  useEffect(() => {
    let filtered = allUsuarios.filter(usuario => {
      // Este filtro inicial asume que allUsuarios son los correctos para la clínica
      // Si no, el filtro real debe hacerse en la carga inicial (loadData)
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

    // Actualizar el estado local 'usuarios' que se muestra en la tabla
    setUsuarios(filtered)

  }, [searchTerm, showDisabled, sortField, sortDirection, allUsuarios])

  // Función para cambiar estado (igual que antes, simula)
  const handleToggleUserStatus = async (userId: string, currentState: boolean) => {
    try {
      console.warn("toggleUsuarioStatus pendiente de API en contexto")
      // Simulación local
      setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, isActive: !currentState } : u))
      toast({
        title: "Estado actualizado (Simulado)",
        description: "El estado se actualizará cuando la API esté implementada.",
      })
    } catch (error) {
      toast({ title: "Error", description: "No se pudo actualizar el estado.", variant: "destructive" })
    }
  }

  // Crear Usuario (igual que antes, pero no necesita asignar clínica aquí)
  const handleCreateUser = async () => {
    if (!firstName.trim()) {
      toast({
        title: "Error",
        description: "El nombre es obligatorio",
        variant: "destructive",
      })
      return
    }
    if (!lastName.trim()) {
      toast({
        title: "Error",
        description: "El apellido es obligatorio",
        variant: "destructive",
      })
      return
    }
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "El email es obligatorio",
        variant: "destructive",
      })
      return
    }
    if (email !== confirmEmail) {
      toast({
        title: "Error",
        description: "Los emails no coinciden",
        variant: "destructive",
      })
      return
    }
    if (!password) {
      toast({
        title: "Error",
        description: "La contraseña es obligatoria",
        variant: "destructive",
      })
      return
    }

    try {
      const newUserPayload = {
        firstName,
        lastName,
        email,
        password,
        phone: phone || null,
        profileImageUrl: null, 
        isActive: true,
        // La asignación a la clínica/rol se manejará en la página de detalle del usuario
      }

      const createdUser = await createUsuario(newUserPayload)
      
      if (createdUser) {
        toast({ title: "Usuario creado", description: "Usuario creado. Asigne roles/clínicas en su perfil." })
        setFirstName("")
        setLastName("")
        setEmail("")
        setConfirmEmail("")
        setPassword("")
        setPhone("")
        setShowNewUserDialog(false)
        // Refrescar lista (aunque el nuevo usuario podría no aparecer si el filtro inicial falla)
        // Idealmente, la API de creación debería devolver si pertenece a esta clínica
        refetchUsuarios()
      } else {
        toast({ title: "Error", description: "No se pudo crear el usuario (desde contexto)", variant: "destructive" })
      }
      
    } catch (error) {
      toast({ title: "Error", description: typeof error === 'string' ? error : "No se pudo crear el usuario.", variant: "destructive" })
    }
  }

  if (isLoading) {
    return <p className="p-4 text-center">Cargando datos de la clínica y usuarios...</p>
  }

  return (
    <Card className="m-4">
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-xl font-semibold">Usuarios - {clinica?.name || `Clínica ${clinicaId}`}</h1>
        <div className="flex items-center space-x-2">
          <Dialog open={showNewUserDialog} onOpenChange={setShowNewUserDialog}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Añadir Usuario</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Nuevo usuario para {clinica?.name}</DialogTitle>
                <DialogDescription>
                  Completa los campos para crear un nuevo usuario en esta clínica.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="firstName" className="text-right">Nombre</Label>
                  <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="lastName" className="text-right">Apellido</Label>
                  <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">E-mail</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="confirmEmail" className="text-right">Confirma e-mail</Label>
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
          <Button variant="outline" size="sm" onClick={() => router.push(`/configuracion/clinicas/${clinicaId}`)}><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Button>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 space-x-2">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Buscador"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="showDisabled" checked={showDisabled} onCheckedChange={(checked) => setShowDisabled(Boolean(checked))} />
          <Label htmlFor="showDisabled">Mostrar inactivos</Label>
        </div>
      </div>

      {userError && <p className="p-4 text-center text-red-600">Error cargando usuarios: {userError}</p>}

      {!isLoading && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer" onClick={() => handleSort('lastName')}>
                <div className="flex items-center gap-2">
                  Apellido
                  {getSortIcon('lastName')}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('firstName')}>
                <div className="flex items-center gap-2">
                  Nombre
                  {getSortIcon('firstName')}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('email')}>
                <div className="flex items-center gap-2">
                  Login
                  {getSortIcon('email')}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('isActive')}>
                <div className="flex items-center gap-2">
                  Estado
                  {getSortIcon('isActive')}
                </div>
              </TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center">No se encontraron usuarios para esta clínica (o filtro).</TableCell></TableRow>
            )}
            {usuarios.map((usuario) => (
              <TableRow key={usuario.id}>
                <TableCell>{usuario.lastName}</TableCell>
                <TableCell>{usuario.firstName}</TableCell>
                <TableCell>{usuario.email}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={usuario.isActive ? "default" : "destructive"}>{usuario.isActive ? "Activo" : "Inactivo"}</Badge>
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" title={usuario.isActive ? "Desactivar" : "Activar"} onClick={() => handleToggleUserStatus(usuario.id, usuario.isActive)}>
                    {usuario.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" title="Editar" onClick={() => router.push(`/configuracion/usuarios/${usuario.id}?clinicId=${clinicaId}`)}>
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