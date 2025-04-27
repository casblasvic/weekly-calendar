"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Edit, AlertTriangle, CalendarRange, Trash2 } from "lucide-react"
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
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"

// Importar el tipo Usuario para usarlo directamente
import type { Usuario } from "@/contexts/user-context";

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
  const [showDisabled, setShowDisabled] = useState(false)
  const [localShowNewUserDialog, setLocalShowNewUserDialog] = useState(false)
  const [userExceptions, setUserExceptions] = useState<Record<string, number>>({})
  
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [confirmEmail, setConfirmEmail] = useState("")
  const [telefono, setTelefono] = useState("")
  const [password, setPassword] = useState("")

  const { usuarios, getUsuariosByClinica, toggleUsuarioStatus, deleteUsuario } = useUser()
  const { clinics, getClinicaById } = useClinic()
  
  const [clinicaUsuarios, setClinicaUsuarios] = useState<Usuario[]>([])
  const [clinica, setClinica] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const prevDialogStateRef = useRef(showNewUserDialog || localShowNewUserDialog);

  useEffect(() => {
    const loadData = async () => {
      console.log(`[UsuariosClinica useEffect] Running. clinicId: ${clinicId}`);
      if (!clinicId) {
          console.log("[UsuariosClinica useEffect] No clinicId yet, skipping load.");
          setLoading(false);
          return;
      }
      
      setLoading(true);
      try {
        console.log("[UsuariosClinica useEffect] Fetching clinic data...");
        const clinicaData = await getClinicaById(clinicId)
        if (!clinicaData) {
          toast({
            title: "Error",
            description: "No se pudo encontrar la clínica",
            variant: "destructive",
          })
          setLoading(false);
          return
        }
        setClinica(clinicaData)
        console.log("[UsuariosClinica useEffect] Clinic data loaded.");
        
        console.log(`[UsuariosClinica useEffect] Calling getUsuariosByClinica for clinicId: ${clinicId}...`);
        const usuariosData = await getUsuariosByClinica(clinicId)
        console.log(`[UsuariosClinica useEffect] Received usuariosData:`, usuariosData);
        setClinicaUsuarios(usuariosData)
        
        const excepciones = usuariosData.reduce((acc, usuario) => {
          const numExcepciones = contarExcepcionesActivas(usuario as any);
          if (numExcepciones > 0) {
            acc[usuario.id] = numExcepciones;
          }
          return acc;
        }, {} as Record<string, number>);
        
        setUserExceptions(excepciones);
      } catch (error) {
        console.error("[UsuariosClinica useEffect] Error loading data:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos",
          variant: "destructive",
        })
      } finally {
          setLoading(false);
      }
    }
    
    loadData()
  }, [clinicId, getClinicaById, getUsuariosByClinica])
  
  useEffect(() => {
    const isDialogOpen = showNewUserDialog || localShowNewUserDialog;
    if (prevDialogStateRef.current && !isDialogOpen) {
      console.log("[UsuariosClinica] Dialog closed, reloading users...");
      const reloadUsers = async () => {
        try {
          const usuariosData = await getUsuariosByClinica(clinicId) 
          setClinicaUsuarios(usuariosData)
          
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
    prevDialogStateRef.current = isDialogOpen;
  }, [showNewUserDialog, localShowNewUserDialog, clinicId, getUsuariosByClinica]);

  const filteredUsuarios = clinicaUsuarios.filter(
    (usuario) => {
      const matchesStatus = showDisabled ? true : (usuario.isActive ?? true);
      return matchesStatus;
    }
  )

  const renderUserTableSkeleton = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-10 w-2/3" /> 
        <Skeleton className="h-6 w-40" /> 
      </div>
      <div className="border rounded-md p-4">
        <Skeleton className="h-8 w-full mb-4" />
        <Skeleton className="h-10 w-full mb-2" />
        <Skeleton className="h-10 w-full mb-2" />
        <Skeleton className="h-10 w-full mb-2" />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-9 w-40" />
      </div>
    </div>
  );

  if (loading) {
    return renderUserTableSkeleton();
  }

  const isDialogOpen = showNewUserDialog || localShowNewUserDialog;

  const handleShowUserConflicts = (userId: string) => {
    console.log(`Ver conflictos/excepciones del usuario: ${userId}`);
    
    const numConflictos = userConflicts[userId] || 0;
    const numExcepciones = userExceptions[userId] || 0;
    
    console.log(`Conflictos: ${numConflictos}, Excepciones: ${numExcepciones}`);
    
    toast({
      title: "Información de usuario",
      description: `Este usuario tiene ${numConflictos} conflictos y ${numExcepciones} excepciones activas.`,
    });
  };

  const handleToggleStatus = async (userId: string, isActive: boolean) => {
    try {
      const success = await toggleUsuarioStatus(userId, isActive);
      
      if (success) {
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

  const openDeleteDialog = (usuario: Usuario) => {
    console.log("Eliminar usuario:", usuario);
    toast({
        title: "Acción no implementada",
        description: `La eliminación del usuario ${usuario.firstName} aún no está conectada.`,
        variant: "default"
    })
  };

  const columns: ColumnDef<Usuario>[] = [
      {
          accessorKey: "firstName",
          header: ({ column }) => (
             <DataTableColumnHeader column={column} title="Nombre Completo" />
          ),
          cell: ({ row }) => {
              const usuario = row.original;
              const numConflictos = userConflicts[usuario.id] || 0;
              const numExcepciones = userExceptions[usuario.id] || 0;
              
              return (
                  <div className="flex items-center font-medium">
                      {`${usuario.firstName ?? ''} ${usuario.lastName ?? ''}`.trim() || 'Usuario sin nombre'}
                      <UserRowIndicators 
                          conflictos={numConflictos} 
                          excepciones={numExcepciones}
                      />
                  </div>
              );
          },
      },
      {
          accessorKey: "email",
          header: ({ column }) => (
              <DataTableColumnHeader column={column} title="Login (Email)" />
          ),
      },
      {
          accessorKey: "isActive",
          header: () => <div className="text-center">Activo</div>,
          cell: ({ row }) => (
              <div className="text-center">
                  <Checkbox
                      checked={row.original.isActive}
                      onCheckedChange={(checked) => handleToggleStatus(row.original.id, checked as boolean)}
                      aria-label="Activo"
                  />
              </div>
          ),
      },
      {
          id: "actions",
          header: () => <div className="text-right">Acciones</div>,
          cell: ({ row }) => (
              <div className="text-right space-x-1">
                  <Button 
                      variant="ghost" 
                      size="icon" 
                      className="w-8 h-8 text-blue-600 hover:text-blue-800"
                      onClick={() => router.push(`/configuracion/usuarios/${row.original.id}`)}
                      title="Ver/Editar Usuario"
                  >
                      <Search className="w-4 h-4" />
                      <span className="sr-only">Ver/Editar Usuario</span>
                  </Button>
                  
                  <Button 
                      variant="ghost" 
                      size="icon" 
                      className="w-8 h-8 text-destructive hover:text-red-700"
                      onClick={() => openDeleteDialog(row.original)}
                      title="Eliminar Usuario"
                  >
                      <Trash2 className="w-4 h-4" /> 
                      <span className="sr-only">Eliminar Usuario</span>
                  </Button>
              </div>
          ),
      },
  ];

  return (
    <div>
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

      <DataTable 
          columns={columns} 
          data={filteredUsuarios} 
          searchKey="email"
      />

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
              disabled
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