"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FileQuestion, Plus, Minus, ChevronUp, ChevronDown, MessageSquare, Users, HelpCircle, X, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useTarif } from "@/contexts/tarif-context"
import { useIVA } from "@/contexts/iva-context"
import { useFamily } from "@/contexts/family-context"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { HelpButton } from "@/components/ui/help-button"
import React from "react"

// Función para generar IDs únicos sin dependencias externas
const generateId = () => {
  return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Consumo interface
interface Consumo {
  id: string
  cantidad: number
  tipoConsumo: string
}

// Tipos de consumo según la especificación correcta
const tiposConsumo = [
  { id: "Unidades", nombre: "Unidades" },
  { id: "Sesiones", nombre: "Sesiones" },
  { id: "Minutos", nombre: "Minutos" },
  { id: "Disparos", nombre: "Disparos" }
];

// Lista de colores de agenda (actualizada para coincidir con los colores de cabinas)
const coloresAgenda = [
  { id: "Rosa", nombre: "Rosa", color: "#FF69B4", clase: "bg-pink-400" },
  { id: "Rojo", nombre: "Rojo", color: "#FF0000", clase: "bg-red-600" },
  { id: "Naranja", nombre: "Naranja", color: "#FFA500", clase: "bg-orange-500" },
  { id: "Amarillo", nombre: "Amarillo", color: "#FFD700", clase: "bg-yellow-400" },
  { id: "Verde", nombre: "Verde", color: "#32CD32", clase: "bg-green-500" },
  { id: "Turquesa", nombre: "Turquesa", color: "#40E0D0", clase: "bg-teal-400" },
  { id: "Azul", nombre: "Azul", color: "#1E90FF", clase: "bg-blue-500" },
  { id: "Morado", nombre: "Morado", color: "#8A2BE2", clase: "bg-purple-600" },
  { id: "Gris", nombre: "Gris", color: "#A9A9A9", clase: "bg-gray-400" }
];

// Tipos de comisión
const tiposComision = [
  { id: "Porcentaje", nombre: "Porcentaje" },
  { id: "Fijo", nombre: "Fijo" }
];

// Agentes de soporte (mock)
const agentesSoporte = [
  { id: "agent1", nombre: "Laura Sánchez", estado: "disponible", avatar: "/avatars/laura.png" },
  { id: "agent2", nombre: "Carlos Ruiz", estado: "disponible", avatar: "/avatars/carlos.png" },
  { id: "agent3", nombre: "María López", estado: "ocupado", avatar: "/avatars/maria.png" }
];

export default function NuevoServicio({ params }: { params: { id: string } }) {
  const router = useRouter()
  const tarifaId = params.id;
  
  const { getTarifaById } = useTarif()
  const { getTiposIVAByTarifaId } = useIVA()
  const { getRootFamilies } = useFamily()
  
  const tarifa = getTarifaById(tarifaId)
  const tiposIVA = getTiposIVAByTarifaId(tarifaId)
  const familias = getRootFamilies()
  
  const [isSaving, setIsSaving] = useState(false)
  const [chatAbierto, setChatAbierto] = useState(false)
  const [mensajeAyuda, setMensajeAyuda] = useState("")
  const [agenteSeleccionado, setAgenteSeleccionado] = useState<string | null>(null)
  
  const [servicio, setServicio] = useState({
    nombre: "",
    codigo: "",
    tarifaId: tarifaId,
    tarifaBase: tarifa?.nombre || "Tarifa Base",
    familiaId: "",
    precioConIVA: "",
    ivaId: "",
    colorAgenda: "Rosa",
    duracion: 45, // Duración en minutos
    equipoId: "(Todos)",
    tipoComision: "Porcentaje",
    comision: "3",
    requiereParametros: false,
    visitaValoracion: false,
    apareceEnApp: false,
    descuentosAutomaticos: false,
    descuentosManuales: true,
    aceptaPromociones: true,
    aceptaEdicionPVP: false,
    afectaEstadisticas: true,
    deshabilitado: false,
    consumos: [{
      id: generateId(),
      cantidad: 1,
      tipoConsumo: "Unidades"
    }],
    precioCoste: "0.00",
    tarifaPlanaId: "(Ninguna)",
    archivoAyuda: null as string | null,
  })

  // Variables para colores globales de la aplicación
  const colorPrimario = "bg-purple-600 hover:bg-purple-700 text-white";
  const colorSecundario = "bg-gray-200 hover:bg-gray-300 text-gray-800";
  const colorFoco = "focus:ring-2 focus:ring-purple-500 focus:ring-offset-2";
  const colorEncabezado = "text-purple-700";

  // Estilos comunes para botones
  const buttonPrimaryClass = `${colorPrimario} ${colorFoco} transition-all duration-200 ease-in-out transform hover:scale-105`;
  const buttonSecondaryClass = `${colorSecundario} ${colorFoco} transition-all duration-200`;
  const buttonNavClass = `text-sm rounded-md bg-gray-50 hover:bg-gray-100 border-gray-300 ${colorFoco} transition-all duration-200 hover:border-purple-300`;

  // Estilo para los desplegables (como en la barra lateral)
  const selectHoverClass = "hover:border-purple-400 focus:border-purple-500 focus:ring-purple-500";

  // Función para formatear la duración
  const formatearDuracion = (minutos: number) => {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas > 0 ? horas + 'h ' : ''}${mins}min`;
  };

  // Manejar cambios en los inputs
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    setServicio({
      ...servicio,
      [name]: type === 'number' ? Number(value) : value
    })
  }

  // Manejar cambios en la duración
  const handleDuracionChange = (incremento: number) => {
    const nuevaDuracion = Math.max(5, servicio.duracion + incremento);
    setServicio({
      ...servicio,
      duracion: nuevaDuracion
    });
  }

  // Manejar cambios en los selects
  const handleSelectChange = (name: string, value: string) => {
    setServicio({
      ...servicio,
      [name]: value
    });
  }

  // Manejar cambios en los checkboxes
  const handleCheckboxChange = (id: string, checked: boolean) => {
    setServicio({
      ...servicio,
      [id]: checked
    })
  }
  
  // Manejar navegación a otras páginas
  const handleNavigation = (page: string) => {
    router.push(`/configuracion/tarifas/${tarifaId}/nuevo-servicio/${page}`)
  }
  
  // Manejar cancelación
  const handleCancel = () => {
    router.push(`/configuracion/tarifas/${tarifaId}`)
  }
  
  // Manejar subida de archivos
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setServicio({
        ...servicio,
        archivoAyuda: file.name
      })
    }
  }
  // Guardar el servicio
  const handleSaveServicio = () => {
    setIsSaving(true)
    
    // Simulación de guardado (reemplazar con llamada real a API)
    setTimeout(() => {
      console.log("Servicio guardado:", servicio)
      setIsSaving(false)
      router.push(`/configuracion/tarifas/${tarifaId}`)
    }, 1000)
  }
  
  // Función para renderizar el agente con tooltip
  const renderAgente = (agente: typeof agentesSoporte[0]) => {
    return (
      <div key={agente.id} className="relative">
        <TooltipProvider>
          <Tooltip content={
            <div>
              <p>{agente.nombre}</p>
              <p className="text-xs">{agente.estado === 'disponible' ? 'Disponible' : 'Ocupado'}</p>
            </div>
          }>
            <TooltipTrigger>
              <Avatar 
                className={`cursor-pointer ${agenteSeleccionado === agente.id ? 'ring-2 ring-purple-500' : ''} ${agente.estado === 'disponible' ? '' : 'opacity-50'}`}
                onClick={() => agente.estado === 'disponible' && setAgenteSeleccionado(agente.id)}
              >
                <AvatarImage src={agente.avatar} alt={agente.nombre} />
                <AvatarFallback>{agente.nombre.substring(0, 2)}</AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <div>
                <p>{agente.nombre}</p>
                <p className="text-xs">{agente.estado === 'disponible' ? 'Disponible' : 'Ocupado'}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  };

  // Estado para controlar el panel lateral
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <h1 className="text-xl font-semibold mb-6">Datos del servicio</h1>
      
      <Card>
        <CardContent className="pt-6 pb-6">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            {/* Columna Izquierda */}
            <div>
              <div className="mb-4">
                <div className="text-sm text-gray-500 mb-1">Tarifa</div>
                <div className="text-sm font-medium">{servicio.tarifaBase}</div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                <Input
                  id="nombre"
                  name="nombre"
                  value={servicio.nombre}
                  onChange={handleInputChange}
                  placeholder="Nombre del servicio"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="codigo" className="block text-sm font-medium text-gray-700 mb-1">
                  Código
                </label>
                <Input
                  id="codigo"
                  name="codigo"
                  value={servicio.codigo}
                  onChange={handleInputChange}
                  placeholder="Código del servicio"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="familia" className="block text-sm font-medium text-gray-700 mb-1">
                  Familia
                </label>
                <Select
                  value={servicio.familiaId}
                  onValueChange={(value) => handleSelectChange("familiaId", value)}
                >
                  <SelectTrigger className="w-full focus:ring-indigo-500">
                    <SelectValue placeholder="Selecciona una familia" />
                  </SelectTrigger>
                  <SelectContent>
                    {familias && familias.map((familia) => (
                      <SelectItem key={familia.id} value={familia.id}>
                        {familia.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="mb-4">
                <label htmlFor="precioConIVA" className="block text-sm font-medium text-gray-700 mb-1">
                  Precio con IVA
                </label>
                <Input
                  id="precioConIVA"
                  name="precioConIVA"
                  type="number"
                  min="0"
                  step="0.01"
                  value={servicio.precioConIVA}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="iva" className="block text-sm font-medium text-gray-700 mb-1">
                  IVA
                </label>
                <Select
                  value={servicio.ivaId}
                  onValueChange={(value) => handleSelectChange("ivaId", value)}
                >
                  <SelectTrigger className="w-full focus:ring-indigo-500">
                    <SelectValue placeholder="Selecciona un IVA" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposIVA && tiposIVA.map((iva) => (
                      <SelectItem key={iva.id} value={iva.id}>
                        {iva.descripcion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cuando el servicio o producto forma parte de un paquete:
                </label>
                <Select
                  value={servicio.tarifaPlanaId}
                  onValueChange={(value) => handleSelectChange("tarifaPlanaId", value)}
                >
                  <SelectTrigger className="w-full focus:ring-indigo-500">
                    <SelectValue placeholder="Pertenece a la tarifa plana" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="(Ninguna)">(Ninguna)</SelectItem>
                    {/* Aquí irían las tarifas planas disponibles */}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="consumo" className="block text-sm font-medium text-gray-700 mb-1">
                    Consumo
                  </label>
                  <Input
                    id="consumo"
                    name="consumo"
                    type="number"
                    min="1"
                    value={servicio.consumos[0].cantidad}
                    onChange={(e) => {
                      const consumos = [...servicio.consumos];
                      consumos[0].cantidad = Number(e.target.value);
                      setServicio({...servicio, consumos});
                    }}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="tipoConsumo" className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de consumo
                  </label>
                  <Select
                    value={servicio.consumos[0].tipoConsumo}
                    onValueChange={(value) => {
                      const consumos = [...servicio.consumos];
                      consumos[0].tipoConsumo = value;
                      setServicio({...servicio, consumos});
                    }}
                  >
                    <SelectTrigger className="w-full focus:ring-indigo-500">
                      <SelectValue placeholder="Selecciona tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposConsumo.map((tipo) => (
                        <SelectItem key={tipo.id} value={tipo.id}>
                          {tipo.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="precioCoste" className="block text-sm font-medium text-gray-700 mb-1">
                  Precio de coste
                </label>
                <Input
                  id="precioCoste"
                  name="precioCoste"
                  type="number"
                  min="0"
                  step="0.01"
                  value={servicio.precioCoste}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
            
            {/* Columna Derecha */}
            <div>
              <div className="mb-4">
                <label htmlFor="colorAgenda" className="block text-sm font-medium text-gray-700 mb-1">
                  Color en agenda
                </label>
                <Select
                  value={servicio.colorAgenda}
                  onValueChange={(value) => handleSelectChange("colorAgenda", value)}
                >
                  <SelectTrigger className="w-full focus:ring-indigo-500">
                    <SelectValue placeholder="Selecciona un color" />
                  </SelectTrigger>
                  <SelectContent>
                    {coloresAgenda.map((color) => (
                      <SelectItem key={color.id} value={color.id}>
                        <div className="flex items-center">
                          <div className={`w-4 h-4 mr-2 rounded-full ${color.clase}`}></div>
                          {color.nombre}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="mb-4">
                <label htmlFor="duracion" className="block text-sm font-medium text-gray-700 mb-1">
                  Duración
                </label>
                <div className="flex rounded-md">
                  <div className="relative flex flex-grow items-stretch focus-within:z-10">
                    <Input
                      id="duracion"
                      name="duracion"
                      value={formatearDuracion(servicio.duracion)}
                      readOnly
                      placeholder="00:00 (hh:mm)"
                      className="rounded-md rounded-r-none border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                    <div className="absolute inset-y-0 right-0 flex flex-col">
                      <button
                        type="button"
                        className="flex-1 inline-flex items-center justify-center border border-transparent px-1 text-gray-500 hover:text-gray-700"
                        onClick={() => handleDuracionChange(5)}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        className="flex-1 inline-flex items-center justify-center border border-transparent px-1 text-gray-500 hover:text-gray-700"
                        onClick={() => handleDuracionChange(-5)}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
                    Minutos
                  </span>
                </div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="equipo" className="block text-sm font-medium text-gray-700 mb-1">
                  Equipo
                </label>
                <Select
                  value={servicio.equipoId}
                  onValueChange={(value) => handleSelectChange("equipoId", value)}
                >
                  <SelectTrigger className="w-full focus:ring-indigo-500">
                    <SelectValue placeholder="Selecciona un equipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="(Todos)">(Todos)</SelectItem>
                    {/* Aquí irían los equipos disponibles */}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="tipoComision" className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de comisión
                  </label>
                  <Select
                    value={servicio.tipoComision}
                    onValueChange={(value) => handleSelectChange("tipoComision", value)}
                  >
                    <SelectTrigger className="w-full focus:ring-indigo-500">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposComision.map((tipo) => (
                        <SelectItem key={tipo.id} value={tipo.id}>
                          {tipo.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label htmlFor="comision" className="block text-sm font-medium text-gray-700 mb-1">
                    Comisión
                  </label>
                  <Input
                    id="comision"
                    name="comision"
                    type="number"
                    min="0"
                    step="0.01"
                    value={servicio.comision}
                    onChange={handleInputChange}
                    placeholder={servicio.tipoComision === "Porcentaje" ? "0" : "0.00"}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center">
                  <Checkbox
                    id="requiereParametros"
                    checked={servicio.requiereParametros}
                    onCheckedChange={(checked) => handleCheckboxChange("requiereParametros", !!checked)}
                    className="border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="requiereParametros" className="ml-2 text-sm">Requiere parámetros</label>
                </div>
                
                <div className="flex items-center">
                  <Checkbox
                    id="visitaValoracion"
                    checked={servicio.visitaValoracion}
                    onCheckedChange={(checked) => handleCheckboxChange("visitaValoracion", !!checked)}
                    className="border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="visitaValoracion" className="ml-2 text-sm">Visita de valoración</label>
                </div>
                
                <div className="flex items-center">
                  <Checkbox
                    id="apareceEnApp"
                    checked={servicio.apareceEnApp}
                    onCheckedChange={(checked) => handleCheckboxChange("apareceEnApp", !!checked)}
                    className="border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="apareceEnApp" className="ml-2 text-sm">Aparece en App / Self</label>
                </div>
                
                <div className="flex items-center">
                  <Checkbox
                    id="descuentosAutomaticos"
                    checked={servicio.descuentosAutomaticos}
                    onCheckedChange={(checked) => handleCheckboxChange("descuentosAutomaticos", !!checked)}
                    className="border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="descuentosAutomaticos" className="ml-2 text-sm">Descuentos automáticos</label>
                </div>
                
                <div className="flex items-center">
                  <Checkbox
                    id="descuentosManuales"
                    checked={servicio.descuentosManuales}
                    onCheckedChange={(checked) => handleCheckboxChange("descuentosManuales", !!checked)}
                    className="border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="descuentosManuales" className="ml-2 text-sm">Descuentos manuales</label>
                </div>
                
                <div className="flex items-center">
                  <Checkbox
                    id="aceptaPromociones"
                    checked={servicio.aceptaPromociones}
                    onCheckedChange={(checked) => handleCheckboxChange("aceptaPromociones", !!checked)}
                    className="border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="aceptaPromociones" className="ml-2 text-sm">Acepta promociones</label>
                </div>
                
                <div className="flex items-center">
                  <Checkbox
                    id="aceptaEdicionPVP"
                    checked={servicio.aceptaEdicionPVP}
                    onCheckedChange={(checked) => handleCheckboxChange("aceptaEdicionPVP", !!checked)}
                    className="border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="aceptaEdicionPVP" className="ml-2 text-sm">Acepta edición PVP</label>
                </div>
                
                <div className="flex items-center">
                  <Checkbox
                    id="afectaEstadisticas"
                    checked={servicio.afectaEstadisticas}
                    onCheckedChange={(checked) => handleCheckboxChange("afectaEstadisticas", !!checked)}
                    className="border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="afectaEstadisticas" className="ml-2 text-sm">Afecta estadísticas</label>
                </div>
                
                <div className="flex items-center">
                  <Checkbox
                    id="deshabilitado"
                    checked={servicio.deshabilitado}
                    onCheckedChange={(checked) => handleCheckboxChange("deshabilitado", !!checked)}
                    className="border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="deshabilitado" className="ml-2 text-sm">Deshabilitado</label>
                </div>
              </div>
              
              <div className="mt-6">
                <Button
                  type="button"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  onClick={() => {}}
                >
                  <FileQuestion className="h-4 w-4 mr-2" />
                  Archivo De Ayuda
                </Button>
                <input
                  id="archivoAyuda"
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <div className="mt-1 text-xs text-gray-500">Nombre</div>
                <div className="text-sm">{servicio.archivoAyuda || "(Ninguno)"}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Botones de navegación y acción */}
      <div className="flex justify-between mt-6">
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            className={buttonNavClass}
            onClick={() => handleNavigation('consumos')}
          >
            Consumos
          </Button>
          <Button 
            variant="outline" 
            className={buttonNavClass}
            onClick={() => handleNavigation('puntos')}
          >
            Puntos
          </Button>
          <Button 
            variant="outline" 
            className={buttonNavClass}
            onClick={() => handleNavigation('bonos')}
          >
            Bonos
          </Button>
          <Button 
            variant="outline" 
            className={buttonNavClass}
            onClick={() => handleNavigation('suscripciones')}
          >
            Suscripciones
          </Button>
          <Button 
            variant="outline" 
            className={buttonNavClass}
            onClick={() => handleNavigation('datos-app')}
          >
            Datos App
          </Button>
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant="outline"
            className={buttonSecondaryClass}
            onClick={handleCancel}
          >
            Volver
          </Button>
          <Button
            variant="default"
            className={buttonPrimaryClass}
            onClick={handleSaveServicio}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <span className="animate-spin mr-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <circle 
                      className="opacity-25" 
                      cx="12" 
                      cy="12" 
                      r="10" 
                      stroke="currentColor" 
                      strokeWidth="4"
                    />
                    <path 
                      className="opacity-75" 
                      fill="currentColor" 
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                </span>
                <span>Guardando...</span>
              </>
            ) : (
              "Guardar"
            )}
          </Button>
          <HelpButton text="Ayuda para la creación de servicios" />
        </div>
      </div>
    </div>
  )
}
