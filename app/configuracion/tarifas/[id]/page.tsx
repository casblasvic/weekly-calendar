"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { use } from "react"
import { ChevronDown, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { MockData } from "@/lib/mock-data"
import { useFamily } from "@/contexts/family-context"
import Link from "next/link"

// Interfaces
interface Tarifa {
  id: string
  nombre: string
  clinicaId: string
  deshabilitada: boolean
}

interface Servicio {
  id: string
  nombre: string
  familia: string
  precio: number
  iva: string
  tipo: string
}

export default function ConfiguracionTarifa({ params }: { params: { id: string } }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const tarifaId = resolvedParams.id
  const { families } = useFamily()
  const [tarifa, setTarifa] = useState<Tarifa | null>(null)
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [tipoFiltro, setTipoFiltro] = useState("")
  const [familiaFiltro, setFamiliaFiltro] = useState("")
  const [showDisabled, setShowDisabled] = useState(false)

  // Cargar datos de la tarifa
  useEffect(() => {
    const tarifaEncontrada = MockData.tarifas?.find((t) => t.id === tarifaId) || null
    setTarifa(tarifaEncontrada)

    // Cargar servicios (sin datos de ejemplo)
    const serviciosEjemplo = MockData.servicios || []
    // Añadir tipo a los servicios para el filtro
    const serviciosConTipo = serviciosEjemplo.map((servicio) => ({
      ...servicio,
      tipo: ["Servicios", "Productos", "Paquetes", "Suscripciones"][Math.floor(Math.random() * 4)],
    }))
    setServicios(serviciosConTipo)
  }, [tarifaId])

  // Filtrar servicios
  const serviciosFiltrados = servicios.filter((servicio) => {
    const matchesSearch = servicio.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTipo = !tipoFiltro || tipoFiltro === "all" || servicio.tipo === tipoFiltro
    const matchesFamilia = !familiaFiltro || familiaFiltro === "all" || servicio.familia === familiaFiltro
    const matchesDisabled = showDisabled ? true : true // Aquí implementaríamos la lógica para productos deshabilitados

    return matchesSearch && matchesTipo && matchesFamilia && matchesDisabled
  })

  // Obtener tipos únicos para filtros
  const tiposUnicos = ["Servicios", "Productos", "Paquetes", "Suscripciones"]

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Productos y Servicios</h1>

      {/* Filtros y botones superiores */}
      <div className="bg-white rounded-lg border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Columna izquierda: campos de búsqueda */}
          <div className="space-y-4">
            <div>
              <label htmlFor="nombre" className="block text-xs font-medium text-gray-500 mb-1">
                Nombre
              </label>
              <Input
                id="nombre"
                placeholder="Buscar por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="tipo" className="block text-xs font-medium text-gray-500 mb-1">
                Tipo
              </label>
              <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                <SelectTrigger>
                  <SelectValue placeholder="(Todos)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">(Todos)</SelectItem>
                  {tiposUnicos.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="familia" className="block text-xs font-medium text-gray-500 mb-1">
                Familia
              </label>
              <Select value={familiaFiltro} onValueChange={setFamiliaFiltro}>
                <SelectTrigger>
                  <SelectValue placeholder="(Todas)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">(Todas)</SelectItem>
                  {families.map((familia) => (
                    <SelectItem key={familia.id} value={familia.name}>
                      {familia.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="verDeshabilitados"
                checked={showDisabled}
                onCheckedChange={(checked) => setShowDisabled(!!checked)}
              />
              <label htmlFor="verDeshabilitados" className="text-sm">
                Ver productos deshabilitados
              </label>
            </div>
          </div>

          {/* Columna derecha: botones */}
          <div className="space-y-2">
            <Button variant="default" className="w-full bg-purple-800 hover:bg-purple-900">
              Nuevo
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="w-full">
                Tarifas planas
              </Button>
              <Link href="/configuracion/tarifas/familias" className="w-full">
                <Button variant="outline" className="w-full">
                  Familias
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="w-full">
                Herencias
              </Button>
              <Button variant="outline" className="w-full">
                Tipos de IVA
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-4 space-x-2">
          <Button variant="outline">Exportar</Button>
          <Button variant="default" className="bg-purple-800 hover:bg-purple-900">
            Buscar
          </Button>
        </div>
      </div>

      {/* Título de la sección */}
      <div className="text-sm text-gray-600">
        Listado de productos y servicios: <span className="font-semibold">{tarifa?.nombre}</span>
      </div>

      {/* Tabla de servicios */}
      <div className="overflow-x-auto rounded-md border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-purple-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider cursor-pointer"
              >
                <div className="flex items-center space-x-1">
                  <span>Familia</span>
                  <ChevronDown size={14} />
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider cursor-pointer"
              >
                <div className="flex items-center space-x-1">
                  <span>Nombre</span>
                  <ChevronDown size={14} />
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-purple-700 uppercase tracking-wider cursor-pointer"
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Precio</span>
                  <ChevronDown size={14} />
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-purple-700 uppercase tracking-wider cursor-pointer"
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>IVA</span>
                  <ChevronDown size={14} />
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-center text-xs font-medium text-purple-700 uppercase tracking-wider"
              >
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {serviciosFiltrados.map((servicio) => (
              <tr key={servicio.id} className="hover:bg-purple-50/50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{servicio.familia || "(Ninguna)"}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{servicio.nombre}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {servicio.precio.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{servicio.iva}%</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                  <div className="flex justify-center space-x-2">
                    <button className="text-purple-600 hover:text-purple-900">
                      <Pencil size={18} />
                    </button>
                    <button className="text-red-600 hover:text-red-900">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {serviciosFiltrados.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                  No se encontraron servicios
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Botones de acción fijos */}
      <div className="fixed bottom-6 right-6 flex space-x-2">
        <Button variant="outline" onClick={() => router.push("/configuracion/tarifas")}>
          Volver
        </Button>
        <Button variant="outline">Ayuda</Button>
      </div>
    </div>
  )
}

