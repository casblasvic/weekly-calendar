"use client"

import { useEffect, useState } from "react"
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  CreditCard,
  Package,
  Clock,
  FileText,
  Save,
  Loader2,
  X
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { useClient } from "@/contexts/client-context"

interface Person {
  id: string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  postalCode?: string | null
  birthDate?: Date | null
}

interface ClientQuickViewDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  client: Person | null
}

export function ClientQuickViewDialog({ 
  isOpen, 
  onOpenChange, 
  client 
}: ClientQuickViewDialogProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    postalCode: "",
    birthDate: ""
  })
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("datos")

  useEffect(() => {
    if (client) {
      setFormData({
        firstName: client.firstName || "",
        lastName: client.lastName || "",
        phone: client.phone || "",
        email: client.email || "",
        address: client.address || "",
        city: client.city || "",
        postalCode: client.postalCode || "",
        birthDate: client.birthDate ? format(new Date(client.birthDate), "yyyy-MM-dd") : ""
      })
    }
  }, [client])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const { refetchClients } = useClient();

  const handleSave = async () => {
    if (isSaving || !hasChanges) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/persons/${client?.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          birthDate: formData.birthDate ? new Date(formData.birthDate) : null
        })
      })

      if (response.ok) {
        // Actualizar cache de clientes y cerrar modal
        await refetchClients();
        setHasChanges(false)
        setIsSaving(false)
        toast({
          title: "Cambios guardados",
          description: "La información del cliente se ha actualizado correctamente."
        });
        // Cerrar modal después de mostrar notificación
        onOpenChange(false);
      } else {
        setIsSaving(false)
        toast({
          title: "Error",
          description: "No se pudo guardar la información del cliente.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error al guardar cambios:', error)
      toast({
        title: "Error inesperado",
        description: "Ocurrió un problema al guardar.",
        variant: "destructive"
      })
    }
  }

  const clientName = `${formData.firstName} ${formData.lastName}`.trim()
  const initials = `${formData.firstName?.[0] || ''}${formData.lastName?.[0] || ''}`.toUpperCase()

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] p-0 flex flex-col h-full">
        <SheetHeader className="sr-only">
          <SheetTitle>Información del cliente</SheetTitle>
        </SheetHeader>
        {/* Header con avatar y nombre */}
        <div className="border-b px-6 py-4 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 bg-purple-100">
              
              <AvatarFallback className="bg-purple-100 text-purple-700">{initials || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">{clientName || 'Sin nombre'}</h2>
              <p className="text-sm text-gray-600">{formData.email || 'Sin email'}</p>
            </div>
            
          </div>
        </div>

        {/* Contenido con scroll */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="w-full justify-start rounded-none border-b bg-gray-50 h-11 p-0">
              <TabsTrigger 
                value="datos" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:bg-white data-[state=active]:text-purple-600 hover:bg-gray-100 hover:text-gray-900 px-4"
              >
                <User className="h-3.5 w-3.5 mr-1.5" />
                Datos
              </TabsTrigger>
              <TabsTrigger 
                value="bonos"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:bg-white data-[state=active]:text-purple-600 hover:bg-gray-100 hover:text-gray-900 px-4"
              >
                <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                Bonos
              </TabsTrigger>
              <TabsTrigger 
                value="paquetes"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:bg-white data-[state=active]:text-purple-600 hover:bg-gray-100 hover:text-gray-900 px-4"
              >
                <Package className="h-3.5 w-3.5 mr-1.5" />
                Paquetes
              </TabsTrigger>
              <TabsTrigger 
                value="pagos"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:bg-white data-[state=active]:text-purple-600 hover:bg-gray-100 hover:text-gray-900 px-4"
              >
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                Pagos
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="datos" className="mt-0 space-y-4 p-6">
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-xs font-medium">Nombre</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-xs font-medium">Apellidos</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-xs font-medium flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      Teléfono
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-medium flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-xs font-medium flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Dirección
                    </Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-xs font-medium">Ciudad</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postalCode" className="text-xs font-medium">Código Postal</Label>
                      <Input
                        id="postalCode"
                        value={formData.postalCode}
                        onChange={(e) => handleInputChange('postalCode', e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="birthDate" className="text-xs font-medium flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Fecha de nacimiento
                    </Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => handleInputChange('birthDate', e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="bonos" className="mt-0 p-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700">Bonos activos</h3>
                  <div className="border rounded-lg p-4 text-center text-gray-500 text-sm">
                    No hay bonos activos
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="paquetes" className="mt-0 p-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700">Paquetes activos</h3>
                  <div className="border rounded-lg p-4 text-center text-gray-500 text-sm">
                    No hay paquetes activos
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="pagos" className="mt-0 p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-700">Historial de pagos</h3>
                    <Button size="sm" variant="outline" className="h-8 text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      Ver aplazados
                    </Button>
                  </div>
                  <div className="border rounded-lg p-4 text-center text-gray-500 text-sm">
                    No hay pagos registrados
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Footer fijo con botones */}
        <div className="border-t px-6 py-4 bg-gray-50">
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-9 px-4 text-sm hover:bg-gray-100 hover:text-gray-900"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="h-9 px-4 text-sm bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
              Guardar cambios
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
