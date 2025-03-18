"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { use } from "react"
import { ChevronDown, Pencil, Trash2, ShoppingCart, Package, User, ChevronUp, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MockData } from "@/lib/mock-data"
import { useFamily } from "@/contexts/family-context"
import Link from "next/link"
import { useTarif } from "@/contexts/tarif-context"
import { Card, CardContent } from "@/components/ui/card"

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

export interface TipoIVA {
  id: string;
  descripcion: string;
  porcentaje: number;
  tarifaId: string;
}

export default function ConfiguracionTarifa({ params }: { params: { id: string } }) {
  const router = useRouter()
  const tarifaId = params.id
  
  const { families } = useFamily()
  const [tarifa, setTarifa] = useState<Tarifa | null>(null)
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [tipoFiltro, setTipoFiltro] = useState("")
  const [familiaFiltro, setFamiliaFiltro] = useState("")
  const [showDisabled, setShowDisabled] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const { getTarifaById, getFamiliasByTarifaId } = useTarif()
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);

  // Obtener las familias específicas de esta tarifa
  const tarifaFamilies = getFamiliasByTarifaId ? getFamiliasByTarifaId(tarifaId) : [];

  // Funciones para manejar la creación de diferentes tipos
  const handleNuevoServicio = () => {
    console.log("Crear nuevo servicio")
    setMenuOpen(false)
    router.push(`/configuracion/tarifas/${tarifaId}/nuevo-servicio`)
  }

  const handleNuevoProducto = () => {
    console.log("Crear nuevo producto")
    setMenuOpen(false)
    router.push(`/configuracion/tarifas/${tarifaId}/nuevo-producto`)
  }

  const handleNuevoPaquete = () => {
    console.log("Crear nuevo paquete")
    setMenuOpen(false)
    router.push(`/configuracion/tarifas/${tarifaId}/nuevo-paquete`)
  }

  // Navegación a las diferentes secciones
  const navegarATarifasPlanas = () => {
    router.push(`/configuracion/tarifas/${tarifaId}/tarifas-planas`)
  }

  const navegarAFamilias = () => {
    router.push(`/configuracion/tarifas/familias`)
  }

  const navegarAHerencias = () => {
    router.push(`/configuracion/tarifas/${tarifaId}/herencias`)
  }

  const navegarATiposIVA = () => {
    router.push(`/configuracion/tarifas/${tarifaId}/iva`)
  }

  // Ordenar los servicios cuando cambia la configuración de ordenación
  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Obtener el ícono de ordenación para la columna
  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown size={14} />;
    }
    return sortConfig.direction === 'ascending' 
      ? <ChevronUp size={14} /> 
      : <ChevronDown size={14} />;
  };

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

  // Cerrar el menú si se hace clic fuera de él
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuRef])

  return (
    <div className="pt-20 px-6 pb-20">
      {/* Card con buscador y botones de acciones */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Columna izquierda - Filtros de búsqueda */}
            <div className="space-y-4">
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
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
                <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo
                </label>
                <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                  <SelectTrigger className="w-full">
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
                <label htmlFor="familia" className="block text-sm font-medium text-gray-700 mb-1">
                  Familia
                </label>
                <Select value={familiaFiltro} onValueChange={setFamiliaFiltro}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="(Todas)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">(Todas)</SelectItem>
                    {tarifaFamilies && tarifaFamilies.map((familia) => (
                      <SelectItem key={familia.id} value={familia.name}>
                        {familia.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="verProductosDeshabilitados"
                  checked={showDisabled}
                  onCheckedChange={(checked) => setShowDisabled(!!checked)}
                />
                <label htmlFor="verProductosDeshabilitados" className="text-sm">
                  Ver productos deshabilitados
                </label>
              </div>
            </div>

            {/* Columna derecha - Botones para añadir elementos */}
            <div className="space-y-4">
              {/* Botón Nuevo con menú desplegable */}
              <div className="relative" ref={menuRef}>
                <Button 
                  variant="default" 
                  className="w-full bg-purple-700 hover:bg-purple-800"
                  onClick={() => setMenuOpen(!menuOpen)}
                >
                  Nuevo <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-full bg-white rounded-md shadow-lg z-10">
                    <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                      <button
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                        onClick={handleNuevoServicio}
                      >
                        <div className="flex items-center">
                          <ShoppingCart size={16} className="mr-2" />
                          Servicio
                        </div>
                      </button>
                      <button
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                        onClick={handleNuevoProducto}
                      >
                        <div className="flex items-center">
                          <Package size={16} className="mr-2" />
                          Producto
                        </div>
                      </button>
                      <button
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                        onClick={handleNuevoPaquete}
                      >
                        <div className="flex items-center">
                          <User size={16} className="mr-2" />
                          Paquete
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="w-full" onClick={navegarATarifasPlanas}>
                  Tarifas planas
                </Button>
                <Button variant="outline" className="w-full" onClick={navegarAFamilias}>
                  Familias
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="w-full" onClick={navegarAHerencias}>
                  Herencias
                </Button>
                <Button variant="outline" className="w-full" onClick={navegarATiposIVA}>
                  Tipos de IVA
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sección de tabla con botones de exportar y buscar */}
      <div className="flex justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Listado de productos y servicios: {tarifa?.nombre || ""}</h2>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            Exportar
          </Button>
          <Button variant="default" size="sm" className="bg-purple-700 hover:bg-purple-800">
            Buscar
          </Button>
        </div>
      </div>

      {/* Tabla de servicios */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort('familia')}
              >
                <div className="flex items-center">
                  Familia
                  <span className="ml-1">{getSortIcon('familia')}</span>
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort('nombre')}
              >
                <div className="flex items-center">
                  Nombre
                  <span className="ml-1">{getSortIcon('nombre')}</span>
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-purple-700 uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort('precio')}
              >
                <div className="flex items-center justify-end">
                  Precio
                  <span className="ml-1">{getSortIcon('precio')}</span>
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-purple-700 uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort('iva')}
              >
                <div className="flex items-center justify-end">
                  IVA
                  <span className="ml-1">{getSortIcon('iva')}</span>
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

