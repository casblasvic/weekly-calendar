"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, Controller } from "react-hook-form"
import * as z from "zod"
import { es } from "date-fns/locale"
import { User, MapPin, CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { setDatePickerHeaderColor } from "@/lib/utils"
import React from "react"

const formSchema = z.object({
  fechaNacimiento: z.date({
    required_error: "La fecha de nacimiento es requerida",
  }),
  nombre: z.string().min(2, {
    message: "El nombre debe tener al menos 2 caracteres",
  }),
  primerApellido: z.string().min(2, {
    message: "El primer apellido debe tener al menos 2 caracteres",
  }),
  segundoApellido: z.string().optional(),
  tipoDocumento: z.string({
    required_error: "El tipo de documento es requerido",
  }),
  numeroDocumento: z.string().min(1, {
    message: "El número de documento es requerido",
  }),
  sexo: z.string({
    required_error: "El sexo es requerido",
  }),
  comoNosHaConocido: z.string({
    required_error: "Este campo es requerido",
  }),
  cp: z.string().min(5, {
    message: "El código postal debe tener 5 dígitos",
  }),
  localidad: z.string().min(2, {
    message: "La localidad es requerida",
  }),
  email: z.string().email({
    message: "Email inválido",
  }),
  telefono: z.string().min(9, {
    message: "El teléfono debe tener al menos 9 dígitos",
  }),
  direccion: z.string().min(5, {
    message: "La dirección es requerida",
  }),
  representante: z
    .object({
      parentesco: z.string().optional(),
      nombre: z.string().optional(),
      apellidos: z.string().optional(),
      direccion: z.string().optional(),
      telefono: z.string().optional(),
      tipoDocumento: z.string().optional(),
      numeroDocumento: z.string().optional(),
      email: z.string().email().optional(),
    })
    .optional(),
})

type FormValues = z.infer<typeof formSchema>

const CustomDatePicker = React.forwardRef<
  any,
  {
    onChange: (date: Date | null) => void
    onBlur: () => void
    value: Date | null
    name: string
    onDateSelect?: (date: Date | null) => void
  }
>(({ onChange, onBlur, value, name, onDateSelect }, ref) => {
  const [key, setKey] = React.useState(0) // Add key for forcing re-render

  const handleChange = (date: Date | null) => {
    onChange(date)
    if (onDateSelect) {
      onDateSelect(date)
    }
  }

  return (
    <div className="relative">
      <DatePicker
        key={key} // Add key to force re-render and clear internal state
        selected={value}
        onChange={handleChange}
        onBlur={onBlur}
        dateFormat="dd/MM/yyyy"
        locale={es}
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        isClearable={false}
        placeholderText="Seleccione una fecha"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        calendarClassName="date-picker-custom"
        renderCustomHeader={({
          date,
          changeYear,
          changeMonth,
          decreaseMonth,
          increaseMonth,
          prevMonthButtonDisabled,
          nextMonthButtonDisabled,
        }) => (
          <div>
            <div className="flex justify-between px-4 pt-2">
              <button onClick={decreaseMonth} disabled={prevMonthButtonDisabled} type="button" className="p-1">
                <ChevronLeft className="h-4 w-4 text-white" />
              </button>
              <div className="flex gap-2">
                <select
                  value={date.getMonth()}
                  onChange={({ target: { value } }) => changeMonth(Number.parseInt(value, 10))}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i}>
                      {es.localize?.month(i)}
                    </option>
                  ))}
                </select>
                <select
                  value={date.getFullYear()}
                  onChange={({ target: { value } }) => changeYear(Number.parseInt(value, 10))}
                >
                  {Array.from({ length: 10 }, (_, i) => (
                    <option key={i} value={date.getFullYear() - 5 + i}>
                      {date.getFullYear() - 5 + i}
                    </option>
                  ))}
                </select>
              </div>
              <button onClick={increaseMonth} disabled={nextMonthButtonDisabled} type="button" className="p-1">
                <ChevronRight className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>
        )}
      >
        <div className="datepicker-footer">
          <button
            onClick={(e) => {
              e.preventDefault()
              handleChange(null)
              setKey((prev) => prev + 1) // Force re-render on clear
            }}
            type="button"
          >
            BORRAR
          </button>
          <button
            onClick={(e) => {
              e.preventDefault()
              handleChange(new Date())
              setKey((prev) => prev + 1) // Force re-render on today
            }}
            type="button"
          >
            HOY
          </button>
        </div>
      </DatePicker>
      <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
    </div>
  )
})
CustomDatePicker.displayName = "CustomDatePicker"

export default function NuevoClientePage() {
  const [showLegalRepresentative, setShowLegalRepresentative] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fechaNacimiento: null, // Changed from new Date() to null
      nombre: "",
      primerApellido: "",
      segundoApellido: "",
      tipoDocumento: "",
      numeroDocumento: "",
      sexo: "",
      comoNosHaConocido: "",
      cp: "",
      localidad: "",
      email: "",
      telefono: "",
      direccion: "",
    },
  })

  function onSubmit(values: FormValues) {
    console.log(values)
  }

  const handleDateChange = (date: Date | null) => {
    if (date) {
      const today = new Date()
      const age = today.getFullYear() - date.getFullYear()
      setShowLegalRepresentative(age < 18)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <Form form={form} onSubmit={onSubmit}>
        <div className="space-y-8">
          {/* Datos personales */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="flex flex-row items-center p-6 gap-2">
              <User className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold">Datos personales</h3>
            </div>
            <div className="p-6 pt-0 grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="fechaNacimiento"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha nacimiento</FormLabel>
                    <FormControl>
                      <Controller
                        name="fechaNacimiento"
                        control={form.control}
                        render={({ field }) => <CustomDatePicker {...field} onDateSelect={handleDateChange} />}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="primerApellido"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primer apellido</FormLabel>
                    <FormControl>
                      <Input placeholder="Primer apellido" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="segundoApellido"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Segundo apellido</FormLabel>
                    <FormControl>
                      <Input placeholder="Segundo apellido" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipoDocumento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de documento</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione una opción" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pasaporte">Pasaporte</SelectItem>
                        <SelectItem value="otros">Otros</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="numeroDocumento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de documento</FormLabel>
                    <FormControl>
                      <Input placeholder="Número de documento" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sexo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sexo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione una opción" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="mujer">Mujer</SelectItem>
                        <SelectItem value="hombre">Hombre</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="comoNosHaConocido"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>¿Cómo nos has conocido?</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Elija uno" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="autres">Autres</SelectItem>
                        <SelectItem value="facebook">Facebook</SelectItem>
                        <SelectItem value="google">Google</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="mobile-app">Mobile App</SelectItem>
                        <SelectItem value="recommande">Recommandé</SelectItem>
                        <SelectItem value="voisinage">Voisinage</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Datos del representante legal */}
          {showLegalRepresentative && (
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
              <div className="flex flex-row items-center p-6 gap-2">
                <User className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold">Datos del representante legal</h3>
              </div>
              <div className="p-6 pt-0 grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="representante.parentesco"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parentesco</FormLabel>
                      <FormControl>
                        <Input placeholder="Parentesco" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="representante.nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="representante.apellidos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellidos</FormLabel>
                      <FormControl>
                        <Input placeholder="Apellidos" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="representante.direccion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección</FormLabel>
                      <FormControl>
                        <Input placeholder="Dirección" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="representante.tipoDocumento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de documento</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione una opción" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pasaporte">Pasaporte</SelectItem>
                          <SelectItem value="otros">Otros</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="representante.numeroDocumento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de documento</FormLabel>
                      <FormControl>
                        <Input placeholder="Número de documento" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="representante.email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="E-mail" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="representante.telefono"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input placeholder="Teléfono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {/* Datos de contacto */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="flex flex-row items-center p-6 gap-2">
              <MapPin className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold">Datos de contacto</h3>
            </div>
            <div className="p-6 pt-0 grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="cp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CP</FormLabel>
                    <FormControl>
                      <Input placeholder="CP" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="localidad"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Localidad</FormLabel>
                    <FormControl>
                      <Input placeholder="Localidad" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="E-mail" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="telefono"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input placeholder="Teléfono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="direccion"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Dirección</FormLabel>
                    <FormControl>
                      <Input placeholder="Dirección" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => setDatePickerHeaderColor("#" + Math.floor(Math.random() * 16777215).toString(16))}
              className="bg-blue-600 hover:bg-blue-700 mr-2"
            >
              Cambiar color del encabezado
            </Button>
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
              Guardar
            </Button>
          </div>
        </div>
      </Form>
    </div>
  )
}

