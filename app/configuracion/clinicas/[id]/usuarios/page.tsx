"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, ArrowLeft, HelpCircle, ChevronUp, ChevronDown, Plus, Edit } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useUser } from "@/contexts/user-context"
import { useClinic } from "@/contexts/clinic-context"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import * as React from 'react'

type SortField = "nombre" | "email" | "perfil"
type SortDirection = "asc" | "desc"

export default function ClinicaUsuariosPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const resolvedParams = React.use(params as unknown as Promise<{ id: string }>)
  const clinicaId = resolvedParams.id
  
  const [searchTerm, setSearchTerm] = useState("")
  const [showDisabled, setShowDisabled] = useState(false)
  const [sortField, setSortField] = useState<SortField>("nombre")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [showHelp, setShowHelp] = useState(false)
  const [showNewUserDialog, setShowNewUserDialog] = useState(false)
  
  // Form fields for new user
  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [confirmEmail, setConfirmEmail] = useState("")
  const [prefijo, setPrefijo] = useState("")
  const [telefono, setTelefono] = useState("")
  const [perfil, setPerfil] = useState("")

  const { usuarios, toggleUsuarioStatus, createUsuario, getUsuariosByClinica } = useUser()
  const { clinics, getClinicaById } = useClinic()
  
  const [clinicaUsuarios, setClinicaUsuarios] = useState([])
  const [clinica, setClinica] = useState(null)
  const [loading, setLoading] = useState(true)

  // Cargar datos de la clínica y sus usuarios
  useEffect(() => {
    const loadData = async () => {
      try {
        // Cargar datos de la clínica
        const clinicaData = await getClinicaById(clinicaId)
        if (!clinicaData) {
          toast({
            title: "Error",
            description: "No se pudo encontrar la clínica",
            variant: "destructive",
          })
          router.push("/configuracion/clinicas")
          return
        }
        setClinica(clinicaData)
        
        // Cargar usuarios de la clínica
        const usuariosClinica = await getUsuariosByClinica(clinicaId)
        setClinicaUsuarios(usuariosClinica)
        setLoading(false)
      } catch (error) {
        console.error("Error al cargar datos:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos",
          variant: "destructive",
        })
        router.push("/configuracion/clinicas")
      }
    }
    
    loadData()
  }, [clinicaId, getClinicaById, getUsuariosByClinica, router])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null
    return sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
  }

  const sortedUsuarios = [...clinicaUsuarios].sort((a, b) => {
    const modifier = sortDirection === "asc" ? 1 : -1
    if (a[sortField] < b[sortField]) return -1 * modifier
    if (a[sortField] > b[sortField]) return 1 * modifier
    return 0
  })

  // Función para cambiar el estado de activación de un usuario
  const toggleUserStatus = async (userId: string) => {
    try {
      const success = await toggleUsuarioStatus(userId);
      
      if (success) {
        // Actualizar la lista local después de cambiar el estado
        const updatedUsuarios = await getUsuariosByClinica(clinicaId);
        setClinicaUsuarios(updatedUsuarios);
        
        toast({
          title: "Estado actualizado",
          description: "El estado del usuario ha sido actualizado correctamente.",
        });
      } else {
        throw new Error("La actualización no fue exitosa");
      }
    } catch (error) {
      console.error("Error al actualizar el estado del usuario:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del usuario.",
        variant: "destructive",
      });
    }
  };

  const filteredUsuarios = sortedUsuarios.filter(
    (usuario) => {
      // Primero filtramos por término de búsqueda
      const matchesSearch = 
        usuario.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        usuario.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        usuario.perfil.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Luego filtramos por estado (activo/inactivo)
      const matchesStatus = showDisabled ? true : usuario.isActive;
      
      return matchesSearch && matchesStatus;
    }
  )

  const handleCreateUser = async () => {
    // Validaciones
    if (!nombre.trim()) {
      toast({
        title: "Error",
        description: "El nombre es obligatorio",
        variant: "destructive",
      });
      return;
    }

    if (!email.trim()) {
      toast({
        title: "Error",
        description: "El email es obligatorio",
        variant: "destructive",
      });
      return;
    }

    if (email !== confirmEmail) {
      toast({
        title: "Error",
        description: "Los emails no coinciden",
        variant: "destructive",
      });
      return;
    }

    if (!perfil) {
      toast({
        title: "Error",
        description: "Debe seleccionar un perfil",
        variant: "destructive",
      });
      return;
    }

    try {
      const newUser = {
        nombre,
        email,
        prefijoTelefonico: prefijo,
        telefono,
        perfil,
        clinicasIds: [clinicaId], // Asignamos automáticamente la clínica actual
        isActive: true,
        fechaCreacion: new Date().toISOString()
      };

      await createUsuario(newUser);
      
      // Actualizar la lista local de usuarios
      const updatedUsuarios = await getUsuariosByClinica(clinicaId);
      setClinicaUsuarios(updatedUsuarios);
      
      toast({
        title: "Usuario creado",
        description: "El usuario ha sido creado correctamente",
      });
      
      // Limpiar formulario
      setNombre("");
      setEmail("");
      setConfirmEmail("");
      setPrefijo("");
      setTelefono("");
      setPerfil("");
      setShowNewUserDialog(false);
      
    } catch (error) {
      console.error("Error al crear usuario:", error);
      toast({
        title: "Error",
        description: "No se pudo crear el usuario",
        variant: "destructive",
      });
    }
  };

  // Función para renderizar un badge con el estado de actividad de la clínica
  const renderClinicBadge = (clinicaId: string) => {
    const clinica = clinics.find(c => String(c.id) === String(clinicaId));
    if (!clinica) return null;
    
    return (
      <Badge 
        key={clinicaId} 
        variant="outline"
        className={`text-xs ${!clinica.isActive ? 'bg-red-50 border-red-200' : ''}`}
      >
        {clinica.prefix}
        {!clinica.isActive && (
          <span className="ml-1 text-red-500 text-xs">•</span>
        )}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Cargando información...</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Usuarios de {clinica?.name}</h1>
        <h2 className="text-lg text-gray-500">Gestión de personal de la clínica</h2>
      </div>

      <Card className="p-6">
        {/* Add filter above search bar */}
        <div className="mb-4 flex justify-end">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="showDisabled" 
              checked={showDisabled} 
              onCheckedChange={(checked) => setShowDisabled(checked === true)}
            />
            <Label htmlFor="showDisabled">Mostrar usuarios deshabilitados</Label>
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Buscador"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="cursor-pointer" onClick={() => handleSort("nombre")}>
                  <div className="flex items-center gap-2">
                    Nombre de usuario
                    {getSortIcon("nombre")}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("email")}>
                  <div className="flex items-center gap-2">
                    Login
                    {getSortIcon("email")}
                  </div>
                </TableHead>
                <TableHead className="w-[100px] cursor-pointer text-center">
                  Restringir IP
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("perfil")}>
                  <div className="flex items-center gap-2">
                    Perfil
                    {getSortIcon("perfil")}
                  </div>
                </TableHead>
                <TableHead className="w-[100px] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsuarios.map((usuario, index) => (
                <TableRow key={usuario.id} className={cn(index % 2 === 0 ? "bg-purple-50/50" : "")}>
                  <TableCell>{usuario.nombre}</TableCell>
                  <TableCell>{usuario.email}</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell>{usuario.perfil}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                        onClick={() => toggleUserStatus(String(usuario.id))}
                      >
                        <span className={`px-2 py-1 text-xs rounded-full ${usuario.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {usuario.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                        onClick={() => router.push(`/configuracion/usuarios/${usuario.id}`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Modal para crear nuevo usuario */}
      <Dialog open={showNewUserDialog} onOpenChange={setShowNewUserDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo usuario para {clinica?.name}</DialogTitle>
            <DialogDescription>
              Completa los campos para crear un nuevo usuario en esta clínica.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Mostrar clínica preseleccionada */}
            <div className="space-y-2">
              <Label>Clínica</Label>
              <div className="flex items-center space-x-2 p-2 border rounded-md bg-gray-50">
                <Badge variant="outline" className="text-xs">
                  {clinica?.prefix} - {clinica?.name}
                </Badge>
                <span className="text-xs text-gray-500">(Preseleccionada)</span>
              </div>
            </div>

            <div>
              <Label htmlFor="nombre">Nombre</Label>
              <Input 
                id="nombre" 
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input 
                id="email" 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="confirmEmail">Confirma e-mail</Label>
              <Input 
                id="confirmEmail" 
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
              />
            </div>
            
            <div className="flex gap-4">
              <div className="w-1/3">
                <Label htmlFor="prefijo">Prefijo</Label>
                <Select onValueChange={setPrefijo}>
                  <SelectTrigger id="prefijo">
                    <SelectValue placeholder="Seleccione una opción" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ES">ES (+34)</SelectItem>
                    <SelectItem value="MA">MA (+212)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="w-2/3">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input 
                  id="telefono" 
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="perfil">Perfil</Label>
              <Select onValueChange={setPerfil}>
                <SelectTrigger id="perfil">
                  <SelectValue placeholder="Seleccione una opción" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Administrador">Administrador</SelectItem>
                  <SelectItem value="Central">Central</SelectItem>
                  <SelectItem value="Contabilidad">Contabilidad</SelectItem>
                  <SelectItem value="Doctor Administrador">Doctor Administrador</SelectItem>
                  <SelectItem value="Encargado">Encargado</SelectItem>
                  <SelectItem value="Gerente de zona">Gerente de zona</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Operador Call Center">Operador Call Center</SelectItem>
                  <SelectItem value="Personal sin acceso">Personal sin acceso</SelectItem>
                  <SelectItem value="Personal">Personal</SelectItem>
                  <SelectItem value="Profesional">Profesional</SelectItem>
                  <SelectItem value="Recepción">Recepción</SelectItem>
                  <SelectItem value="Supervisor Call Center">Supervisor Call Center</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewUserDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateUser}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bottom controls - Updated styling */}
      <div className="fixed bottom-16 md:bottom-8 left-0 right-0 px-4 flex items-center justify-end max-w-screen-xl mx-auto">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.push(`/configuracion/clinicas/${clinicaId}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <Button onClick={() => setShowNewUserDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo usuario
          </Button>
          <Button
            variant="secondary"
            className="bg-black text-white hover:bg-gray-900"
            onClick={() => setShowHelp(true)}
          >
            <HelpCircle className="mr-2 h-4 w-4" />
            Ayuda
          </Button>
        </div>
      </div>
    </div>
  )
} 