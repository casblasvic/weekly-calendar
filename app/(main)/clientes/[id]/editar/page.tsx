"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useForm } from "react-hook-form"
import { CustomDatePicker } from "@/components/custom-date-picker"
import { PersonTabs } from "@/components/persons/person-tabs"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"

export default function EditPersonPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [personData, setPersonData] = useState<any>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm()

  useEffect(() => {
    const fetchPersonData = async () => {
      try {
        const personId = params.id as string
        const response = await fetch(`/api/persons/${personId}`)
        
        if (!response.ok) {
          throw new Error('Error al cargar los datos de la persona')
        }
        
        const data = await response.json()
        setPersonData(data)
        
        // Set form values
        setValue("firstName", data.firstName)
        setValue("lastName", data.lastName)
        setValue("email", data.email)
        setValue("phone", data.phone)
        setValue("address", data.address)
        setValue("birthDate", data.birthDate ? new Date(data.birthDate) : null)
        setValue("notes", data.notes)
      } catch (error) {
        console.error('Error fetching person data:', error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos de la persona",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    fetchPersonData()
  }, [params.id, setValue])

  const birthDate = watch("birthDate")

  const onSubmit = async (data: any) => {
    setSaving(true)
    // TODO: Implementar guardado real
    console.log("Guardando:", data)
    
    setTimeout(() => {
      setSaving(false)
      toast({
        title: "Cambios guardados",
        description: "Los datos se han actualizado correctamente"
      })
      router.push(`/clientes/${params.id}`)
    }, 1000)
  }

  const handleBack = () => {
    router.push(`/clientes/${params.id}`)
  }

  const handleDateChange = (date: Date | null) => {
    setValue("birthDate", date)
  }

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Cargando...</div>
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" onClick={handleBack} className="mr-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Ficha del Cliente</h1>
      </div>

      <Tabs defaultValue="edit" className="space-y-4">
        <TabsList>
          <TabsTrigger value="edit">Editar Datos</TabsTrigger>
          <TabsTrigger value="view">Ver Información Completa</TabsTrigger>
        </TabsList>

        <TabsContent value="edit">
          <form onSubmit={handleSubmit(onSubmit)}>
            <Card>
              <CardHeader>
                <CardTitle>Información Personal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="firstName" className="text-sm font-medium">
                      Nombre
                    </label>
                    <Input id="firstName" {...register("firstName", { required: "El nombre es obligatorio" })} />
                    {errors.firstName && <p className="text-sm text-red-500">{errors.firstName.message as string}</p>}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="lastName" className="text-sm font-medium">
                      Apellidos
                    </label>
                    <Input id="lastName" {...register("lastName", { required: "Los apellidos son obligatorios" })} />
                    {errors.lastName && <p className="text-sm text-red-500">{errors.lastName.message as string}</p>}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">
                      Email
                    </label>
                    <Input
                      id="email"
                      type="email"
                      {...register("email", {
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: "Email inválido",
                        },
                      })}
                    />
                    {errors.email && <p className="text-sm text-red-500">{errors.email.message as string}</p>}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="phone" className="text-sm font-medium">
                      Teléfono
                    </label>
                    <Input id="phone" {...register("phone")} />
                    {errors.phone && <p className="text-sm text-red-500">{errors.phone.message as string}</p>}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="birthDate" className="text-sm font-medium">
                      Fecha de Nacimiento
                    </label>
                    <CustomDatePicker
                      value={birthDate}
                      onChange={handleDateChange}
                      onBlur={() => {}}
                      name="birthDate"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label htmlFor="address" className="text-sm font-medium">
                      Dirección
                    </label>
                    <Input id="address" {...register("address")} />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label htmlFor="notes" className="text-sm font-medium">
                      Notas
                    </label>
                    <Textarea id="notes" rows={5} {...register("notes")} />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end space-x-2">
                <Button variant="outline" onClick={handleBack} disabled={saving}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-[#8a70d6] hover:bg-[#7c63c3]" disabled={saving}>
                  {saving ? (
                    "Guardando..."
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Guardar Cambios
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>

        <TabsContent value="view">
          {personData && <PersonTabs person={personData} />}
        </TabsContent>
      </Tabs>
    </div>
  )
}
