"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Save } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { useUser } from "@/contexts/user-context"
import { useClinic } from "@/contexts/clinic-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import * as React from 'react'

export default function EditarUsuarioPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  // Usamos React.use para desenvolver params (nueva API de Next.js)
  const resolvedParams = React.use(params as unknown as Promise<{ id: string }>)
  const userId = resolvedParams.id
  const { getUsuarioById, updateUsuario } = useUser()
  const { clinics } = useClinic()
  
  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [confirmEmail, setConfirmEmail] = useState("")
  const [prefijo, setPrefijo] = useState("")
  const [telefono, setTelefono] = useState("")
  const [perfil, setPerfil] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [selectedClinicas, setSelectedClinicas] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showDisabledClinics, setShowDisabledClinics] = useState(false)
  
  // Filtrar las clínicas activas
  const activeClinicas = clinics.filter(clinic => clinic.isActive)
  
  // Clínicas a mostrar en el selector (según el filtro)
  const clinicasToShow = showDisabledClinics ? clinics : activeClinicas
  
  useEffect(() => {
    const loadUsuario = async () => {
      try {
        const usuario = await getUsuarioById(userId)
        
        if (!usuario) {
          toast({
            title: "Error",
            description: "No se pudo encontrar el usuario",
            variant: "destructive",
          })
          router.push("/configuracion/usuarios")
          return
        }
        
        setNombre(usuario.nombre)
        setEmail(usuario.email)
        setConfirmEmail(usuario.email)
        setPrefijo(usuario.prefijoTelefonico || "")
        setTelefono(usuario.telefono || "")
        setPerfil(usuario.perfil)
        setIsActive(usuario.isActive)
        setSelectedClinicas(usuario.clinicasIds)
        setLoading(false)
      } catch (error) {
        console.error("Error al cargar usuario:", error)
        toast({
          title: "Error",
          description: "No se pudo cargar la información del usuario",
          variant: "destructive",
        })
        router.push("/configuracion/usuarios")
      }
    }
    
    loadUsuario()
  }, [userId, getUsuarioById, router])
  
  const handleAddClinica = (clinicaId: string) => {
    if (!selectedClinicas.includes(clinicaId)) {
      setSelectedClinicas([...selectedClinicas, clinicaId])
    }
  }
  
  const handleRemoveClinica = (clinicaId: string) => {
    setSelectedClinicas(selectedClinicas.filter(id => id !== clinicaId))
  }
  
  const handleSave = async () => {
    // Validaciones
    if (!nombre.trim()) {
      toast({
        title: "Error",
        description: "El nombre es obligatorio",
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
    
    if (!perfil) {
      toast({
        title: "Error",
        description: "Debe seleccionar un perfil",
        variant: "destructive",
      })
      return
    }
    
    if (selectedClinicas.length === 0) {
      toast({
        title: "Error",
        description: "Debe seleccionar al menos una clínica",
        variant: "destructive",
      })
      return
    }
    
    try {
      const updatedUser = {
        nombre,
        email,
        prefijoTelefonico: prefijo,
        telefono,
        perfil,
        clinicasIds: selectedClinicas,
        isActive,
        fechaModificacion: new Date().toISOString()
      }
      
      const success = await updateUsuario(userId, updatedUser)
      
      if (success) {
        toast({
          title: "Usuario actualizado",
          description: "El usuario ha sido actualizado correctamente",
        })
        router.push("/configuracion/usuarios")
      } else {
        throw new Error("No se pudo actualizar el usuario")
      }
    } catch (error) {
      console.error("Error al actualizar usuario:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el usuario",
        variant: "destructive",
      })
    }
  }
  
  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Cargando información del usuario...</h1>
        </div>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Editar usuario</h1>
      </div>
      
      <Card className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
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
                <Select value={prefijo} onValueChange={setPrefijo}>
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
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="perfil">Perfil</Label>
              <Select value={perfil} onValueChange={setPerfil}>
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
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Clínica</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="showDisabledClinics" 
                    checked={showDisabledClinics} 
                    onCheckedChange={(checked) => setShowDisabledClinics(checked === true)}
                  />
                  <Label htmlFor="showDisabledClinics" className="text-xs">Ver inactivas</Label>
                </div>
              </div>
              <Select onValueChange={handleAddClinica}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una clínica" />
                </SelectTrigger>
                <SelectContent>
                  {clinicasToShow.map((clinic) => (
                    <SelectItem key={clinic.id} value={String(clinic.id)}>
                      {clinic.prefix} - {clinic.name}
                      {!clinic.isActive && <span className="ml-2 text-red-500 text-xs">(inactiva)</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Mostrar clínicas seleccionadas como badges */}
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedClinicas.map(clinicaId => {
                  const clinica = clinics.find(c => String(c.id) === clinicaId);
                  return clinica ? (
                    <Badge 
                      key={clinicaId} 
                      className={`flex items-center gap-1 pl-2 pr-1 py-1 ${!clinica.isActive ? 'bg-red-50 border-red-200' : ''}`}
                      variant="outline"
                    >
                      {clinica.name}
                      {!clinica.isActive && <span className="ml-1 text-red-500 text-xs">•</span>}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-5 w-5 p-0 text-gray-500 hover:text-gray-700"
                        onClick={() => handleRemoveClinica(clinicaId)}
                      >
                        ×
                      </Button>
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
            
            <div className="flex items-center space-x-2 pt-4">
              <Switch 
                checked={isActive} 
                onCheckedChange={setIsActive} 
                id="active-status" 
              />
              <Label htmlFor="active-status" className="font-medium cursor-pointer">
                Usuario {isActive ? 'activo' : 'inactivo'}
              </Label>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Bottom controls */}
      <div className="fixed bottom-16 md:bottom-8 left-0 right-0 px-4 flex items-center justify-end max-w-screen-xl mx-auto">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.push("/configuracion/usuarios")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Guardar
          </Button>
        </div>
      </div>
    </div>
  )
} 