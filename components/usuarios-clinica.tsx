"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, ChevronUp, ChevronDown, Edit, AlertTriangle, CalendarRange } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useUser } from "@/contexts/user-context"
import { useClinic } from "@/contexts/clinic-context"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ConflictoHorario } from "@/services/exceptions-conflict-service"
import { tieneExcepcionesActivas, contarExcepcionesActivas } from "@/services/exceptions-user-service"
import { Skeleton } from "@/components/ui/skeleton"

// Importar el tipo Usuario para usarlo directamente
import type { Usuario } from "@/contexts/user-context";

// Actualizar SortField para usar los nuevos campos
type SortField = "lastName" | "firstName" | "email" // Quitar "nombre" y "perfil"
type SortDirection = "asc" | "desc"

interface UserRowIndicatorsProps {
  conflictos?: number;
  excepciones?: number;
}

// Componente para mostrar indicadores en la fila de usuario
function UserRowIndicators({ conflictos = 0, excepciones = 0 }: UserRowIndicatorsProps) {
  if (conflictos <= 0 && excepciones <= 0) return null;
  
  return (
    <div className="flex items-center gap-2 ml-2">
      {conflictos > 0 && (
        <Badge variant="outline" className="text-amber-600 bg-amber-50 border-amber-200">
          <AlertTriangle className="w-3 h-3 mr-1" />
          {conflictos} {conflictos === 1 ? 'conflicto' : 'conflictos'}
        </Badge>
      )}
      
      {excepciones > 0 && (
        <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
          <CalendarRange className="w-3 h-3 mr-1" />
          {excepciones} {excepciones === 1 ? 'excepción' : 'excepciones'}
        </Badge>
      )}
    </div>
  );
}

interface UsuariosClinicaProps {
  clinicId: string;
  onNewUser?: () => void;
  showNewUserDialog?: boolean;
  onCloseNewUserDialog?: () => void;
  userConflicts?: Record<string, number>; // Número de conflictos por usuario
}

export function UsuariosClinica({ 
  clinicId, 
  onNewUser, 
  showNewUserDialog = false, 
  onCloseNewUserDialog,
  userConflicts = {} // Valor por defecto vacío
}: UsuariosClinicaProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [showDisabled, setShowDisabled] = useState(false)
  const [sortField, setSortField] = useState<SortField>("lastName") // Default a lastName
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [localShowNewUserDialog, setLocalShowNewUserDialog] = useState(false)
  const [userExceptions, setUserExceptions] = useState<Record<string, number>>({})
  
  // Form fields for new user - Refactorizado
  // const [nombre, setNombre] = useState("") // <- Eliminar
  const [firstName, setFirstName] = useState("") // <- Añadir
  const [lastName, setLastName] = useState("")   // <- Añadir
  const [email, setEmail] = useState("")
  const [confirmEmail, setConfirmEmail] = useState("")
  // const [prefijo, setPrefijo] = useState("") // <- Eliminar si no está en payload
  const [telefono, setTelefono] = useState("") // <- Usar 'phone'
  // const [perfil, setPerfil] = useState("")   // <- Eliminar (manejar roles por separado)
  const [password, setPassword] = useState("") // <- Añadir

  const { usuarios, toggleUsuarioStatus, createUsuario, getUsuariosByClinica } = useUser()
  const { clinics, getClinicaById } = useClinic()
  
  const [clinicaUsuarios, setClinicaUsuarios] = useState<Usuario[]>([]) // Usar el tipo Usuario
  const [clinica, setClinica] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Ref para rastrear el estado previo del diálogo
  const prevDialogStateRef = useRef(showNewUserDialog || localShowNewUserDialog);

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
        const usuariosData = await getUsuariosByClinica(clinicId)
        setClinicaUsuarios(usuariosData)
        
        // Verificar excepciones activas para cada usuario
        const excepciones = usuariosData.reduce((acc, usuario) => {
          const numExcepciones = contarExcepcionesActivas(usuario as any);
          if (numExcepciones > 0) {
            acc[usuario.id] = numExcepciones;
          }
          return acc;
        }, {} as Record<string, number>);
        
        setUserExceptions(excepciones);
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
  
  // Refactorizado: useEffect para recargar usuarios SOLO al cerrar el diálogo
  useEffect(() => {
    const isDialogOpen = showNewUserDialog || localShowNewUserDialog;
    // Comprobar si el diálogo acaba de cerrarse (estado previo era true, actual es false)
    if (prevDialogStateRef.current && !isDialogOpen) {
      console.log("[UsuariosClinica] Dialog closed, reloading users...");
      const reloadUsers = async () => {
        try {
          // Usar la función del contexto directamente aquí
          const usuariosData = await getUsuariosByClinica(clinicId) 
          setClinicaUsuarios(usuariosData)
          
          // Actualizar las excepciones activas
          const excepciones = usuariosData.reduce((acc, usuario) => {
            const numExcepciones = contarExcepcionesActivas(usuario as any);
            if (numExcepciones > 0) {
              acc[usuario.id] = numExcepciones;
            }
            return acc;
          }, {} as Record<string, number>);
          
          setUserExceptions(excepciones);
        } catch (error) {
          console.error("Error al recargar usuarios después de cerrar diálogo:", error)
        }
      }
      
      reloadUsers();
    }
    // Actualizar la referencia con el estado actual para la próxima comprobación
    prevDialogStateRef.current = isDialogOpen;

  // Dependencias: Solo necesitamos re-evaluar cuando el estado del diálogo cambie
  }, [showNewUserDialog, localShowNewUserDialog, clinicId, getUsuariosByClinica]); // Mantenemos getUsuariosByClinica por si acaso cambia, pero el if interno controla la ejecución

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
    return sortDirection === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
  }

  const sortedUsuarios = [...clinicaUsuarios].sort((a, b) => {
    const modifier = sortDirection === "asc" ? 1 : -1

    // Manejar campos potencialmente nulos o undefined
    const valA = a[sortField] ?? '';
    const valB = b[sortField] ?? '';

    if (typeof valA === 'string' && typeof valB === 'string') {
      return valA.localeCompare(valB) * modifier;
    }

    // Fallback para otros tipos (aunque aquí deberían ser string)
    if (valA < valB) return -1 * modifier
    if (valA > valB) return 1 * modifier

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
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        (usuario.firstName ?? '').toLowerCase().includes(searchLower) ||
        (usuario.lastName ?? '').toLowerCase().includes(searchLower) ||
        (usuario.email ?? '').toLowerCase().includes(searchLower);
      
      // Luego filtramos por estado (activo/inactivo)
      const matchesStatus = showDisabled ? true : (usuario.isActive ?? true); // Default a true si isActive es null/undefined
      
      return matchesSearch && matchesStatus;
    }
  )

  const handleCreateUser = async () => {
    // Validaciones
    if (!firstName.trim()) {
      toast({
        title: "Error",
        description: "El nombre es obligatorio",
        variant: "destructive",
      });
      return;
    }

    if (!lastName.trim()) {
      toast({
        title: "Error",
        description: "El apellido es obligatorio",
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

    if (!password) {
      toast({
        title: "Error",
        description: "La contraseña es obligatoria",
        variant: "destructive",
      });
      return;
    }

    try {
      // Refactorizado: Crear el payload del nuevo usuario
      // Asegúrate de que los nombres de campo coincidan con el esquema Prisma
      // y las expectativas de tu API/función `createUsuario`.
      const newUserPayload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: telefono.trim() || null, // Usar 'phone', asegurar que sea null si está vacío
        password: password, // Enviar la contraseña
        // profileImageUrl: null, // Comentado/Eliminado - No esperado por el tipo Omit
        isActive: true, // Por defecto activo
        // roles: [], // Manejar roles por separado si es necesario
        clinicasIds: [clinicId], // Asignar a la clínica actual por defecto
        systemId: clinica?.systemId || "" // Asegurar que systemId se incluya
      };

      // Validar que tenemos systemId
      if (!newUserPayload.systemId) {
         toast({ title: "Error", description: "No se pudo determinar el ID del sistema para crear el usuario.", variant: "destructive" });
         return;
      }

      // Llamar a la función del contexto para crear el usuario
      const createdUser = await createUsuario(newUserPayload as any); // Usar 'as any' temporalmente si hay problemas de tipo

      if (createdUser) {
        toast({
          title: "Usuario creado",
          description: "El usuario ha sido creado correctamente",
        });
        
        // Actualizar la lista local de usuarios
        const updatedUsuarios = await getUsuariosByClinica(clinicId);
        setClinicaUsuarios(updatedUsuarios);
        
        // Limpiar formulario
        setFirstName("");
        setLastName("");
        setEmail("");
        setConfirmEmail("");
        setTelefono("");
        setPassword("");
        
        // Cerrar el diálogo de forma controlada
        if (onCloseNewUserDialog) {
          onCloseNewUserDialog();
        } else {
          setLocalShowNewUserDialog(false);
        }
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
          <span className="ml-1 text-xs text-red-500">•</span>
        )}
      </Badge>
    );
  };

  // --- Skeleton para la tabla de usuarios ---
  const renderUserTableSkeleton = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-10 w-2/3" /> 
        <Skeleton className="h-6 w-40" /> 
      </div>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"><Skeleton className="w-5 h-5" /></TableHead>
              <TableHead><Skeleton className="h-5 w-24" /></TableHead>
              <TableHead><Skeleton className="h-5 w-32" /></TableHead>
              <TableHead className="text-right"><Skeleton className="h-5 w-20" /></TableHead>
              <TableHead className="text-center"><Skeleton className="h-5 w-16" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={`skeleton-${index}`}>
                <TableCell><Skeleton className="w-5 h-5" /></TableCell>
                <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-5 w-20" /></TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center space-x-1">
                     <Skeleton className="w-8 h-8 rounded-md" />
                     <Skeleton className="w-8 h-8 rounded-md" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
  // --- Fin Skeleton ---

  if (loading) {
    return renderUserTableSkeleton();
  }

  // Usar el diálogo controlado externamente o el local
  const isDialogOpen = showNewUserDialog || localShowNewUserDialog;

  // Función para mostrar conflictos de usuario
  const handleShowUserConflicts = (userId: string) => {
    console.log(`Ver conflictos/excepciones del usuario: ${userId}`);
    
    // Aquí mostraríamos un diálogo con los detalles de conflictos y excepciones
    // Por ahora solo imprimimos en consola para depuración
    const numConflictos = userConflicts[userId] || 0;
    const numExcepciones = userExceptions[userId] || 0;
    
    console.log(`Conflictos: ${numConflictos}, Excepciones: ${numExcepciones}`);
    
    toast({
      title: "Información de usuario",
      description: `Este usuario tiene ${numConflictos} conflictos y ${numExcepciones} excepciones activas.`,
    });
  };

  return (
    <div>
      {/* Add filter above search bar */}
      <div className="flex justify-end mb-4">
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
        <Search className="absolute w-4 h-4 text-gray-500 -translate-y-1/2 left-3 top-1/2" />
        <Input
          placeholder="Buscador"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="cursor-pointer" onClick={() => handleSort("firstName")}>
                <div className="flex items-center gap-2">
                  Nombre de usuario
                  {getSortIcon("firstName")}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("lastName")}>
                <div className="flex items-center gap-2">
                  Apellidos
                  {getSortIcon("lastName")}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("email")}>
                <div className="flex items-center gap-2">
                  Login
                  {getSortIcon("email")}
                </div>
              </TableHead>
              <TableHead className="w-[100px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsuarios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-4 text-center text-gray-500">
                  No hay usuarios asignados a esta clínica
                </TableCell>
              </TableRow>
            ) : (
              filteredUsuarios.map((usuario, index) => {
                const numConflictos = userConflicts[usuario.id] || 0;
                const numExcepciones = userExceptions[usuario.id] || 0;
                const tieneIndicadores = numConflictos > 0 || numExcepciones > 0;
                
                return (
                  <TableRow 
                    key={usuario.id}
                    className={tieneIndicadores ? "bg-amber-50/30" : ""}
                  >
                    <TableCell className="flex items-center font-medium">
                      {`${usuario.firstName ?? ''} ${usuario.lastName ?? ''}`.trim() || 'Usuario sin nombre'}
                      <UserRowIndicators 
                        conflictos={numConflictos} 
                        excepciones={numExcepciones}
                      />
                    </TableCell>
                    <TableCell>{usuario.email}</TableCell>
                    <TableCell className="space-x-1 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                          onClick={() => toggleUserStatus(String(usuario.id))}
                        >
                          <span className={`px-2 py-1 text-xs rounded-full ${usuario.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {usuario.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                          onClick={() => router.push(`/configuracion/usuarios/${usuario.id}?returnTo=/configuracion/clinicas/${clinicId}&tab=usuarios`)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        
                        {tieneIndicadores && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${numConflictos > 0 ? 'text-amber-500' : 'text-blue-500'}`}
                            onClick={() => handleShowUserConflicts(usuario.id.toString())}
                          >
                            {numConflictos > 0 ? (
                              <AlertTriangle className="w-4 h-4" />
                            ) : (
                              <CalendarRange className="w-4 h-4" />
                            )}
                            <span className="sr-only">Ver detalles</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
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
                <Badge variant="outline" className="px-2 py-1 text-sm">
                  {clinica?.prefix} - {clinica?.name}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="firstName" className="font-medium">Nombre</Label>
              <Input 
                id="firstName" 
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-10"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lastName" className="font-medium">Apellidos</Label>
              <Input 
                id="lastName" 
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
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
            
            <div className="space-y-2">
              <Label htmlFor="telefono" className="font-medium">Teléfono</Label>
              <Input 
                id="telefono" 
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="h-10"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)} 
                className="h-10"
              />
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-3 pt-4 border-t">
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
              className="px-5 text-white bg-purple-600 hover:bg-purple-700"
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 