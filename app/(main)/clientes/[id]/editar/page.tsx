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

// Mock client data (same as client detail page)
const getMockClient = (id: string) => {
  return {
    id,
    name: "Juan Pérez",
    email: "juan.perez@ejemplo.com",
    phone: "555-123-4567",
    address: "Calle Principal 123, Ciudad",
    birthDate: "1985-06-15",
    notes: "Cliente frecuente. Prefiere cabañas con vista al lago.",
  }
}

export default function EditClientPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm()

  useEffect(() => {
    // In a real app, this would be an API call
    const clientId = params.id as string
    const client = getMockClient(clientId)

    // Set form values
    setValue("name", client.name)
    setValue("email", client.email)
    setValue("phone", client.phone)
    setValue("address", client.address)
    setValue("birthDate", new Date(client.birthDate))
    setValue("notes", client.notes)

    setLoading(false)
  }, [params.id, setValue])

  const birthDate = watch("birthDate")

  const onSubmit = async (data: any) => {
    setSaving(true)
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000))
    console.log("Saving client data:", data)
    setSaving(false)
    router.push(`/clientes/${params.id}`)
  }

  const handleBack = () => {
    router.push(`/clientes/${params.id}`)
  }

  const handleDateChange = (date: Date | undefined) => {
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
        <h1 className="text-2xl font-bold tracking-tight">Editar Cliente</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Nombre Completo
                </label>
                <Input id="name" {...register("name", { required: "El nombre es obligatorio" })} />
                {errors.name && <p className="text-sm text-red-500">{errors.name.message as string}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  {...register("email", {
                    required: "El email es obligatorio",
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
                <Input id="phone" {...register("phone", { required: "El teléfono es obligatorio" })} />
                {errors.phone && <p className="text-sm text-red-500">{errors.phone.message as string}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="birthDate" className="text-sm font-medium">
                  Fecha de Nacimiento
                </label>
                <CustomDatePicker
                  date={birthDate}
                  onDateChange={handleDateChange}
                  calendarHeaderColor="#8a70d6"
                  showClearButton={true}
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
    </div>
  )
}

