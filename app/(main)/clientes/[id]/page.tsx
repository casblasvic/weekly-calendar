"use client"

import { useState, useEffect, use } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Save, Trash2, User, MapPin, Phone, Building, FileText, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import ClientProfileImage from "@/components/ui/client-profile-image"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useForm } from "react-hook-form"
import { CustomDatePicker } from "@/components/custom-date-picker"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { CountryInfo } from "@prisma/client"

// API para obtener cliente por ID
async function getClientById(id: string) {
  try {
    const response = await fetch(`/api/clients/${id}`)
    if (!response.ok) {
      throw new Error("Error al obtener el cliente")
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error fetching client:", error)
    return null
  }
}

// API para actualizar cliente
async function updateClient(id: string, data: any) {
  try {
    const response = await fetch(`/api/clients/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    })
    if (!response.ok) {
      throw new Error("Error al actualizar el cliente")
    }
    return await response.json()
  } catch (error) {
    console.error("Error updating client:", error)
    throw error
  }
}

// Componente para título de sección
function SectionTitle({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
      <Icon className="h-5 w-5 text-purple-600" />
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
    </div>
  )
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [client, setClient] = useState<any>(null)
  const [birthDate, setBirthDate] = useState<Date | null>(null)
  
  // Estados para países
  const [countries, setCountries] = useState<CountryInfo[]>([])
  const [isLoadingCountries, setIsLoadingCountries] = useState(true)
  const [countriesError, setCountriesError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      primaryPhone: "",
      primaryPhoneCountryCode: "ES",
      secondaryPhone: "",
      secondaryPhoneCountryCode: "ES",
      gender: "",
      dni: "",
      notes: "",
      address: "",
      city: "",
      postalCode: "",
      country: "ES",
      fiscalName: "",
      fiscalId: "",
      isFiscalClient: false,
      acceptsMarketing: false,
      acceptsDataProcessing: false
    }
  })

  // Cargar países
  useEffect(() => {
    const fetchCountries = async () => {
      setIsLoadingCountries(true)
      setCountriesError(null)
      try {
        const response = await fetch('/api/countries')
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }
        const data: CountryInfo[] = await response.json()
        setCountries(data)
      } catch (err) {
        console.error("Error fetching countries:", err)
        setCountriesError(err instanceof Error ? err.message : 'Error desconocido al cargar países')
        setCountries([])
      } finally {
        setIsLoadingCountries(false)
      }
    }
    fetchCountries()
  }, [])

  useEffect(() => {
    loadClient()
  }, [resolvedParams.id])

  const loadClient = async () => {
    setLoading(true)
    try {
      const data = await getClientById(resolvedParams.id)
      if (data) {
        setClient(data)
        // Actualizar valores del formulario
        setValue("firstName", data.firstName || "")
        setValue("lastName", data.lastName || "")
        setValue("email", data.email || "")
        setValue("primaryPhone", data.primaryPhone || "")
        setValue("primaryPhoneCountryCode", data.primaryPhoneCountryCode || "ES")
        setValue("secondaryPhone", data.secondaryPhone || "")
        setValue("secondaryPhoneCountryCode", data.secondaryPhoneCountryCode || "ES")
        setValue("gender", data.gender || "")
        setValue("dni", data.dni || "")
        setValue("notes", data.notes || "")
        setValue("address", data.address || "")
        setValue("city", data.city || "")
        setValue("postalCode", data.postalCode || "")
        setValue("country", data.country || "ES")
        setValue("fiscalName", data.fiscalName || "")
        setValue("fiscalId", data.fiscalId || "")
        setValue("isFiscalClient", data.isFiscalClient || false)
        setValue("acceptsMarketing", data.acceptsMarketing || false)
        setValue("acceptsDataProcessing", data.acceptsDataProcessing || false)
        
        if (data.birthDate) {
          setBirthDate(new Date(data.birthDate))
        }
      }
    } catch (error) {
      console.error("Error loading client:", error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: any) => {
    setSaving(true)
    try {
      const updateData = {
        ...data,
        birthDate: birthDate ? birthDate.toISOString() : null
      }
      
      await updateClient(resolvedParams.id, updateData)
      await loadClient() // Recargar datos actualizados
      // Mostrar mensaje de éxito
      alert("Cliente actualizado correctamente")
    } catch (error) {
      console.error("Error saving client:", error)
      alert("Error al guardar los cambios")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Alert>
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            No se pudo cargar la información del cliente.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Card principal consolidada */}
        <Card>
          <CardHeader className="pb-6">
            <div className="flex items-center gap-4">
              <ClientProfileImage 
                clientId={client.id}
                clinicId="default"
                initialImage={client.profileImage}
                size="lg"
                editable={false}
              />
              <div>
                <CardTitle className="text-2xl">
                  {client.firstName} {client.lastName}
                </CardTitle>
                <p className="text-gray-600 mt-1">
                  Cliente desde {client.createdAt ? format(new Date(client.createdAt), "MMMM yyyy", { locale: es }) : "Fecha no disponible"}
                </p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-8">
            {/* Sección: Datos personales */}
            <div>
              <SectionTitle icon={User} title="Datos personales" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nombre *</Label>
                  <Input
                    id="firstName"
                    {...register("firstName", { required: "El nombre es obligatorio" })}
                    className={errors.firstName ? "border-red-500" : ""}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-red-500">{errors.firstName.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lastName">Apellidos *</Label>
                  <Input
                    id="lastName"
                    {...register("lastName", { required: "Los apellidos son obligatorios" })}
                    className={errors.lastName ? "border-red-500" : ""}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-red-500">{errors.lastName.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="dni">DNI/NIE</Label>
                  <Input
                    id="dni"
                    {...register("dni")}
                    placeholder="12345678A"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="gender">Género</Label>
                  <Select value={watch("gender")} onValueChange={(value) => setValue("gender", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar género" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Masculino</SelectItem>
                      <SelectItem value="female">Femenino</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="birthDate">Fecha de nacimiento</Label>
                  <CustomDatePicker
                    value={birthDate}
                    onChange={(date) => setBirthDate(date)}
                    onBlur={() => {}}
                    name="birthDate"
                  />
                </div>
              </div>
            </div>

            {/* Sección: Datos de contacto */}
            <div>
              <SectionTitle icon={Phone} title="Datos de contacto" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email", { 
                      required: "El email es obligatorio",
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Email inválido"
                      }
                    })}
                    className={errors.email ? "border-red-500" : ""}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="primaryPhone">Teléfono principal</Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={watch("primaryPhoneCountryCode")}
                      onValueChange={(value) => setValue("primaryPhoneCountryCode", value)}
                      disabled={isLoadingCountries}
                    >
                      <SelectTrigger className="h-9 w-auto min-w-[120px] text-sm">
                        <SelectValue placeholder={isLoadingCountries ? "Cargando..." : "Prefijo"} />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingCountries ? (
                          <SelectItem value="loading" disabled>Cargando...</SelectItem>
                        ) : countriesError ? (
                          <SelectItem value="error" disabled>Error</SelectItem>
                        ) : countries.length === 0 ? (
                          <SelectItem value="no-countries" disabled>N/A</SelectItem>
                        ) : (
                          countries.map(country => (
                            <SelectItem key={country.isoCode} value={country.isoCode}>
                              {country.phoneCode} ({country.isoCode})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Input
                      id="primaryPhone"
                      {...register("primaryPhone")}
                      className="flex-1 text-sm h-9"
                      placeholder="Número de teléfono"
                    />
                  </div>
                  {countriesError && (
                    <p className="mt-1 text-xs text-red-500">Error al cargar prefijos: {countriesError}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="secondaryPhone">Teléfono secundario</Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={watch("secondaryPhoneCountryCode")}
                      onValueChange={(value) => setValue("secondaryPhoneCountryCode", value)}
                      disabled={isLoadingCountries}
                    >
                      <SelectTrigger className="h-9 w-auto min-w-[120px] text-sm">
                        <SelectValue placeholder={isLoadingCountries ? "Cargando..." : "Prefijo"} />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingCountries ? (
                          <SelectItem value="loading" disabled>Cargando...</SelectItem>
                        ) : countriesError ? (
                          <SelectItem value="error" disabled>Error</SelectItem>
                        ) : countries.length === 0 ? (
                          <SelectItem value="no-countries" disabled>N/A</SelectItem>
                        ) : (
                          countries.map(country => (
                            <SelectItem key={country.isoCode} value={country.isoCode}>
                              {country.phoneCode} ({country.isoCode})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Input
                      id="secondaryPhone"
                      {...register("secondaryPhone")}
                      className="flex-1 text-sm h-9"
                      placeholder="Número de teléfono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sección: Dirección */}
            <div>
              <SectionTitle icon={MapPin} title="Dirección" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    {...register("address")}
                    placeholder="Calle, número, piso..."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad</Label>
                  <Input
                    id="city"
                    {...register("city")}
                    placeholder="Ciudad"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Código postal</Label>
                  <Input
                    id="postalCode"
                    {...register("postalCode")}
                    placeholder="28001"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="country">País</Label>
                  <Select value={watch("country")} onValueChange={(value) => setValue("country", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar país" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map(country => (
                        <SelectItem key={country.isoCode} value={country.isoCode}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Sección: Datos fiscales */}
            <div>
              <SectionTitle icon={Building} title="Datos fiscales" />
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isFiscalClient"
                    checked={watch("isFiscalClient")}
                    onCheckedChange={(checked) => setValue("isFiscalClient", checked as boolean)}
                  />
                  <Label htmlFor="isFiscalClient" className="text-sm">
                    Cliente con datos fiscales
                  </Label>
                </div>
                
                {watch("isFiscalClient") && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                    <div className="space-y-2">
                      <Label htmlFor="fiscalName">Razón social</Label>
                      <Input
                        id="fiscalName"
                        {...register("fiscalName")}
                        placeholder="Nombre de la empresa"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="fiscalId">CIF/NIF</Label>
                      <Input
                        id="fiscalId"
                        {...register("fiscalId")}
                        placeholder="A12345678"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sección: Configuración */}
            <div>
              <SectionTitle icon={Settings} title="Configuración" />
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="acceptsMarketing"
                    checked={watch("acceptsMarketing")}
                    onCheckedChange={(checked) => setValue("acceptsMarketing", checked as boolean)}
                  />
                  <Label htmlFor="acceptsMarketing" className="text-sm">
                    Acepta recibir comunicaciones comerciales
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="acceptsDataProcessing"
                    checked={watch("acceptsDataProcessing")}
                    onCheckedChange={(checked) => setValue("acceptsDataProcessing", checked as boolean)}
                  />
                  <Label htmlFor="acceptsDataProcessing" className="text-sm">
                    Acepta el tratamiento de datos personales
                  </Label>
                </div>
              </div>
            </div>

            {/* Sección: Notas */}
            <div>
              <SectionTitle icon={FileText} title="Notas" />
              <div className="space-y-2">
                <Label htmlFor="notes">Observaciones</Label>
                <Textarea
                  id="notes"
                  {...register("notes")}
                  placeholder="Notas adicionales sobre el cliente..."
                  className="min-h-[100px] resize-none"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botones de acción fijos */}
        <div className="fixed bottom-4 right-4 flex items-center gap-2 z-50">
          <Button
            type="submit"
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {saving ? "Guardando..." : "Guardar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-full bg-black text-white hover:bg-gray-800"
            onClick={() => {/* Implementar ayuda */}}
          >
            ?
          </Button>
        </div>

        {/* Espaciador para evitar que el contenido se oculte detrás de los botones */}
        <div className="h-16"></div>
      </form>
    </div>
  )
}
