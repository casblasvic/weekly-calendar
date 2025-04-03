"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, ChevronUp, ChevronDown, Edit } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useUser } from "@/contexts/user-context"
import { useClinic } from "@/contexts/clinic-context"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

type SortField = "nombre" | "email" | "perfil"
type SortDirection = "asc" | "desc"

interface UsuariosClinicaProps {
  clinicId: string;
  onNewUser?: () => void;
  showNewUserDialog?: boolean;
  onCloseNewUserDialog?: () => void;
}

export function UsuariosClinica({ clinicId, onNewUser, showNewUserDialog = false, onCloseNewUserDialog }: UsuariosClinicaProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [showDisabled, setShowDisabled] = useState(false)
  const [sortField, setSortField] = useState<SortField>("nombre")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [localShowNewUserDialog, setLocalShowNewUserDialog] = useState(false)
  
  // Form fields for new user
  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [confirmEmail, setConfirmEmail] = useState("")
  const [prefijo, setPrefijo] = useState("")
  const [telefono, setTelefono] = useState("")
  const [perfil, setPerfil] = useState("")

  const { usuarios, toggleUsuarioStatus, createUsuario, getUsuariosByClinica } = useUser()
  const { clinics, getClinicaById } = useClinic()
  
  const [clinicaUsuarios, setClinicaUsuarios] = useState<any[]>([])
  const [clinica, setClinica] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Cargar datos de la clínica y sus usuarios
  useEffect(() => {
    const loadData = async () => {
      try {
        // Cargar datos de la clínica
        const clinicaData = await getClinicaById(clinicId)
        if (!clinicaData) {
          toast({
            title: "Error",
            description: "No se pudo encontrar la clínica",
            variant: "destructive",
          })
          return
        }
        setClinica(clinicaData)
        
        // Cargar usuarios de la clínica
        const usuariosClinica = await getUsuariosByClinica(clinicId)
        setClinicaUsuarios(usuariosClinica)
        setLoading(false)
      } catch (error) {
        console.error("Error al cargar datos:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos",
          variant: "destructive",
        })
      }
    }
    
    loadData()
  }, [clinicId, getClinicaById, getUsuariosByClinica])
  
  // Actualizar la lista cuando showNewUserDialog cambia (probablemente después de cerrar el diálogo)
  useEffect(() => {
    if (!showNewUserDialog && !localShowNewUserDialog) {
      // Recargar usuarios cuando se cierra el diálogo
      const reloadUsers = async () => {
        try {
          const usuariosClinica = await getUsuariosByClinica(clinicId)
          setClinicaUsuarios(usuariosClinica)
        } catch (error) {
          console.error("Error al recargar usuarios:", error)
        }
      }
      
      reloadUsers()
    }
  }, [showNewUserDialog, localShowNewUserDialog, getUsuariosByClinica, clinicId])

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
        const updatedUsuarios = await getUsuariosByClinica(clinicId);
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
        clinicasIds: [clinicId], // Asignamos automáticamente la clínica actual
        isActive: true,
        fechaCreacion: new Date().toISOString()
      };

      await createUsuario(newUser);
      
      // Actualizar la lista local de usuarios
      const updatedUsuarios = await getUsuariosByClinica(clinicId);
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
      
      // Cerrar el diálogo de forma controlada
      if (onCloseNewUserDialog) {
        onCloseNewUserDialog();
      } else {
        setLocalShowNewUserDialog(false);
      }
      
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
    return <div>Cargando usuarios...</div>;
  }

  // Usar el diálogo controlado externamente o el local
  const isDialogOpen = showNewUserDialog || localShowNewUserDialog;

  return (
    <div>
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
            {filteredUsuarios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                  No hay usuarios asignados a esta clínica
                </TableCell>
              </TableRow>
            ) : (
              filteredUsuarios.map((usuario, index) => (
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
                        onClick={() => router.push(`/configuracion/usuarios/${usuario.id}?returnTo=/configuracion/clinicas/${clinicId}&tab=usuarios`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal para crear nuevo usuario */}
      <Dialog 
        open={isDialogOpen} 
        onOpenChange={(open) => {
          if (!open) {
            if (onCloseNewUserDialog) {
              onCloseNewUserDialog();
            } else {
              setLocalShowNewUserDialog(false);
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-xl font-semibold">Nuevo usuario para {clinica?.name}</DialogTitle>
          </DialogHeader>

          <div className="py-6 space-y-5">
            {/* Mostrar clínica preseleccionada */}
            <div className="space-y-2">
              <Label className="font-medium">Clínica</Label>
              <div className="flex items-center p-3 border rounded-md bg-gray-50">
                <Badge variant="outline" className="text-sm px-2 py-1">
                  {clinica?.prefix} - {clinica?.name}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre" className="font-medium">Nombre</Label>
              <Input 
                id="nombre" 
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="h-10"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="font-medium">E-mail</Label>
              <Input 
                id="email" 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmEmail" className="font-medium">Confirma e-mail</Label>
              <Input 
                id="confirmEmail" 
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                className="h-10"
              />
            </div>
            
            <div className="flex gap-4">
              <div className="w-1/3 space-y-2">
                <Label htmlFor="prefijo" className="font-medium">Prefijo</Label>
                <Select onValueChange={setPrefijo}>
                  <SelectTrigger id="prefijo" className="h-10">
                    <SelectValue placeholder="Seleccione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ES">ES (+34)</SelectItem>
                    <SelectItem value="MA">MA (+212)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="w-2/3 space-y-2">
                <Label htmlFor="telefono" className="font-medium">Teléfono</Label>
                <Input 
                  id="telefono" 
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="perfil" className="font-medium">Perfil</Label>
              <Select onValueChange={setPerfil}>
                <SelectTrigger id="perfil" className="h-10">
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

          <DialogFooter className="pt-4 border-t flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => {
                if (onCloseNewUserDialog) {
                  onCloseNewUserDialog();
                } else {
                  setLocalShowNewUserDialog(false);
                }
              }}
              className="px-5"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateUser}
              className="px-5 bg-purple-600 hover:bg-purple-700 text-white"
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 