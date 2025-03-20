"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { FileQuestion, Plus, Minus, ChevronUp, ChevronDown, MessageSquare, Users, HelpCircle, X, Send, ShoppingCart, AlertCircle, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useTarif } from "@/contexts/tarif-context"
import { useIVA } from "@/contexts/iva-context"
import { useFamily } from "@/contexts/family-context"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { HelpButton } from "@/components/ui/help-button"
import React from "react"
import { useServicio } from "@/contexts/servicios-context"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"

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
  const tarifaId = params.id
  const searchParams = useSearchParams();
  const servicioId = searchParams.get('servicioId');
  
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
  
  // Estado para guardar el servicioId para navegación
  const [currentServicioId, setCurrentServicioId] = useState<string | null>(null);
  
  const [servicio, setServicio] = useState({
    id: "",
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

  // Mantener handleInputChange para inputs normales
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    setServicio({
      ...servicio,
      [name]: type === 'number' ? Number(value) : value
    })
  }

  // Función específica para los componentes Select
  const handleSelectChange = (name: string, value: string) => {
    // Si recibimos "placeholder", lo convertimos a cadena vacía internamente
    const valueToStore = value === "placeholder" ? "" : value;
    
    setServicio({
      ...servicio,
      [name]: valueToStore
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

  // Manejar cambios en los checkboxes
  const handleCheckboxChange = (id: string, checked: boolean) => {
    setServicio({
      ...servicio,
      [id]: checked
    })
  }
  
  // Estados para modales
  const [mostrarModalCamposObligatorios, setMostrarModalCamposObligatorios] = useState(false);
  const [mostrarModalConfirmacion, setMostrarModalConfirmacion] = useState(false);
  const [camposFaltantes, setCamposFaltantes] = useState<string[]>([]);
  const [rutaDestino, setRutaDestino] = useState<string | null>(null);
  
  // Obtener servicioActual del contexto (no crear uno local)
  const { 
    validarCamposObligatorios, 
    servicioActual, 
    crearServicio, 
    actualizarServicio, 
    setServicioActual,
    getServicioById
  } = useServicio();
  
  // AHORA es seguro usar servicioActual
  const servicioGuardado = Boolean(servicioActual?.id);

  // Función para verificar campos obligatorios localmente
  const verificarCamposObligatoriosLocal = () => {
    const camposFaltantes = [];
    
    // Verificar campos obligatorios
    if (!servicio.nombre || servicio.nombre.trim() === '') {
      camposFaltantes.push('Nombre');
    }
    
    if (!servicio.codigo || servicio.codigo.trim() === '') {
      camposFaltantes.push('Código');
    }
    
    if (!servicio.familiaId || servicio.familiaId === '') {
      camposFaltantes.push('Familia');
    }
    
    return camposFaltantes;
  };

  // Cargar el servicio existente si hay un ID
  useEffect(() => {
    if (servicioId) {
      setCurrentServicioId(servicioId);
      const servicioExistente = getServicioById(servicioId);
      if (servicioExistente) {
        setServicioActual(servicioExistente);
        setServicio({
          ...servicioExistente,
          tarifaBase: tarifa?.nombre || "Tarifa Base",
          consumos: servicioExistente.consumos || [{
            id: generateId(),
            cantidad: 1,
            tipoConsumo: "Unidades"
          }]
        });
      }
    }
  }, [servicioId, getServicioById, setServicioActual, tarifa?.nombre]);

  // Añadir depuración de familias
  useEffect(() => {
    if (familias && familias.length > 0) {
      console.log("Familias disponibles:", familias);
      console.log("Primera familia:", familias[0]);
      // Comprueba si las familias tienen la propiedad name
      console.log("Nombre de la familia:", familias[0].name);
    }
  }, [familias]);

  // Función para navegar manteniendo el ID del servicio
  const handleNavigation = (ruta: string) => {
    const servicioId = servicioActual?.id || currentServicioId;
    
    // Verificar campos obligatorios antes de navegar
    const camposFaltantes = verificarCamposObligatoriosLocal();
    
    console.log("Campos faltantes:", camposFaltantes);
    
    // Si faltan campos obligatorios, mostramos el modal de aviso
    if (camposFaltantes.length > 0) {
      setCamposFaltantes(camposFaltantes);
      setMostrarModalCamposObligatorios(true);
      return;
    }
    
    // Solo si todos los campos obligatorios están completos,
    // comprobamos si el servicio está guardado
    if (!servicioGuardado) {
      setRutaDestino(`/configuracion/tarifas/${tarifaId}/nuevo-servicio/${ruta}`);
      setMostrarModalConfirmacion(true);
      return;
    }
    
    // Si todo está completo y guardado, navegamos manteniendo el ID
    router.push(`/configuracion/tarifas/${tarifaId}/nuevo-servicio/${ruta}?servicioId=${servicioId}`);
  };
  
  // Función verificarCamposYNavegar actualizada
  const verificarCamposYNavegar = (ruta: string) => {
    const camposFaltantes = verificarCamposObligatoriosLocal();
    
    console.log("Campos faltantes:", camposFaltantes);
    
    // Si faltan campos obligatorios, mostramos el modal de aviso
    if (camposFaltantes.length > 0) {
      setCamposFaltantes(camposFaltantes);
      setMostrarModalCamposObligatorios(true);
      return;
    }
    
    // Solo si todos los campos obligatorios están completos,
    // comprobamos si el servicio está guardado
    if (!servicioGuardado) {
      setRutaDestino(ruta);
      setMostrarModalConfirmacion(true);
      return;
    }
    
    // Si todo está completo y guardado, navegamos directamente incluyendo el ID
    const servicioId = servicioActual?.id || currentServicioId;
    if (servicioId) {
      router.push(`${ruta}?servicioId=${servicioId}`);
    } else {
      router.push(ruta);
    }
  };
  
  // Mejorar la función de guardar servicio
  const handleGuardarServicio = () => {
    // Validar que los campos obligatorios estén completos
    if (!servicio.nombre) {
      alert("Por favor ingresa un nombre para el servicio");
      return;
    }

    if (!servicio.ivaId || servicio.ivaId === "") {
      alert("Por favor selecciona un tipo de IVA");
      return;
    }

    // Mostrar estado de guardado
    setIsSaving(true);

    // Asegurarse de que el servicio tenga todos los datos necesarios
    const servicioCompleto = {
      ...servicio,
      tarifaId: tarifaId,
      // Asegurarse de que los campos críticos estén presentes
      ivaId: servicio.ivaId,
      familiaId: servicio.familiaId || "",
      precioSinIVA: calcularPrecioSinIVA(parseFloat(servicio.precioConIVA), servicio.ivaId),
    };

    // Log para debug
    console.log("Guardando servicio:", servicioCompleto);

    // Guardar usando el contexto
    if (servicio.id) {
      // Editar existente
      actualizarServicio(servicio.id, servicioCompleto);
    } else {
      // Crear nuevo
      crearServicio(servicioCompleto);
    }

    // Esperar para simular guardado
    setTimeout(() => {
      setIsSaving(false);
      // Redirigir a la página de tarifas
      router.push(`/configuracion/tarifas/${tarifaId}`);
    }, 500);
  };

  // Función auxiliar para calcular el precio sin IVA
  const calcularPrecioSinIVA = (precioConIVA: number, ivaId: string) => {
    const tipoIVA = tiposIVA?.find(t => t.id === ivaId);
    if (!tipoIVA) return precioConIVA;
    
    const porcentajeIVA = tipoIVA.porcentaje || 0;
    return precioConIVA / (1 + (porcentajeIVA / 100));
  };

  // Función para renderizar el agente con tooltip
  const renderAgente = (agente: typeof agentesSoporte[0]) => {
    return (
      <div key={agente.id} className="relative">
        <TooltipProvider>
          <Tooltip
            content={
              <div>
                <p>{agente.nombre}</p>
                <p className="text-xs">{agente.estado === 'disponible' ? 'Disponible' : 'Ocupado'}</p>
              </div>
            }
          >
            <Avatar 
              className={`cursor-pointer ${agenteSeleccionado === agente.id ? 'ring-2 ring-purple-500' : ''} ${agente.estado === 'disponible' ? '' : 'opacity-50'}`}
              onClick={() => agente.estado === 'disponible' && setAgenteSeleccionado(agente.id)}
            >
              <AvatarImage src={agente.avatar} alt={agente.nombre} />
              <AvatarFallback>{agente.nombre.substring(0, 2)}</AvatarFallback>
            </Avatar>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  };

  // Estado para controlar el panel lateral
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');

  // Función para guardar el servicio en el contexto y navegar
  const guardarServicioYNavegar = async () => {
    setIsSaving(true);
    
    try {
      // Preparamos los datos del servicio para guardarlo
      const nuevoServicio = {
        ...servicio,
        tarifaId,
        // Otros campos necesarios
      };
      
      // Crear o actualizar el servicio en el contexto
      let servicioId;
      
      if (servicioActual?.id) {
        // Si ya existe, actualizamos
        await actualizarServicio(servicioActual.id, nuevoServicio);
        servicioId = servicioActual.id;
      } else {
        // Si no existe, creamos uno nuevo
        servicioId = await crearServicio(nuevoServicio);
      }
      
      // Navegar a la ruta de destino incluyendo tanto el ID de tarifa como el ID de servicio
      if (rutaDestino) {
        const rutaCompleta = rutaDestino.includes('?') 
          ? `${rutaDestino}&servicioId=${servicioId}` 
          : `${rutaDestino}?servicioId=${servicioId}`;
        
        router.push(rutaCompleta);
      }
    } catch (error) {
      console.error("Error al guardar el servicio:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar el servicio. Inténtelo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      setMostrarModalConfirmacion(false);
    }
  };

  // Función para navegar a la página anterior
  const handleCancel = () => {
    router.push(`/configuracion/tarifas/${tarifaId}`);
  };
  
  // Agregar la función handleFileUpload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Para simplicidad, solo guardamos el nombre del archivo
      setServicio({
        ...servicio,
        archivoAyuda: file.name
      });
    }
  };
  
  // Referencia para el input de archivo
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="max-w-5xl px-4 py-8 mx-auto">
      <h1 className="mb-6 text-xl font-semibold">Datos del servicio</h1>
      
      <Card>
        <CardContent className="pt-6 pb-6">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            {/* Columna Izquierda */}
            <div>
              <div className="mb-4">
                <div className="mb-1 text-sm text-gray-500">Tarifa</div>
                <div className="text-sm font-medium">{servicio.tarifaBase}</div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="nombre" className="block mb-1 text-sm font-medium text-gray-700">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <Input
                  id="nombre"
                  name="nombre"
                  value={servicio.nombre}
                  onChange={handleInputChange}
                  placeholder="Nombre del servicio"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="codigo" className="block mb-1 text-sm font-medium text-gray-700">
                  Código <span className="text-red-500">*</span>
                </label>
                <Input
                  id="codigo"
                  name="codigo"
                  value={servicio.codigo}
                  onChange={handleInputChange}
                  placeholder="Ej: SRV001"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="familia" className="block text-sm font-medium text-gray-700">
                  Familia <span className="text-red-500">*</span>
                </label>
                <Select
                  value={servicio.familiaId || "placeholder"}
                  onValueChange={(value) => handleSelectChange('familiaId', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar familia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="placeholder">Seleccionar...</SelectItem>
                    {familias.map((familia) => (
                      <SelectItem key={familia.id} value={familia.id}>
                        {familia.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="mb-4">
                <label htmlFor="precioConIVA" className="block mb-1 text-sm font-medium text-gray-700">
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
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="iva" className="block mb-1 text-sm font-medium text-gray-700">
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
                <label className="block mb-1 text-sm font-medium text-gray-700">
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
                  <label htmlFor="consumo" className="block mb-1 text-sm font-medium text-gray-700">
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
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="tipoConsumo" className="block mb-1 text-sm font-medium text-gray-700">
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
                <label htmlFor="precioCoste" className="block mb-1 text-sm font-medium text-gray-700">
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
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
            
            {/* Columna Derecha */}
            <div>
              <div className="mb-4">
                <label htmlFor="colorAgenda" className="block mb-1 text-sm font-medium text-gray-700">
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
                <label htmlFor="duracion" className="block mb-1 text-sm font-medium text-gray-700">
                  Duración
                </label>
                <div className="flex rounded-md">
                  <div className="relative flex items-stretch flex-grow focus-within:z-10">
                    <Input
                      id="duracion"
                      name="duracion"
                      value={formatearDuracion(servicio.duracion)}
                      readOnly
                      placeholder="00:00 (hh:mm)"
                      className="border-gray-300 rounded-md rounded-r-none shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                    <div className="absolute inset-y-0 right-0 flex flex-col">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center flex-1 px-1 text-gray-500 border border-transparent hover:text-gray-700"
                        onClick={() => handleDuracionChange(5)}
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center flex-1 px-1 text-gray-500 border border-transparent hover:text-gray-700"
                        onClick={() => handleDuracionChange(-5)}
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-3 text-sm text-gray-500 border border-l-0 border-gray-300 rounded-r-md bg-gray-50">
                    Minutos
                  </span>
                </div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="equipo" className="block mb-1 text-sm font-medium text-gray-700">
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
                  <label htmlFor="tipoComision" className="block mb-1 text-sm font-medium text-gray-700">
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
                  <label htmlFor="comision" className="block mb-1 text-sm font-medium text-gray-700">
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
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>
              
              <div className="mb-4 space-y-2">
                <div className="flex items-center">
                  <Checkbox
                    id="requiereParametros"
                    checked={servicio.requiereParametros}
                    onCheckedChange={(checked) => handleCheckboxChange("requiereParametros", !!checked)}
                    className="text-indigo-600 border-gray-300 focus:ring-indigo-500"
                  />
                  <label htmlFor="requiereParametros" className="ml-2 text-sm">Requiere parámetros</label>
                </div>
                
                <div className="flex items-center">
                  <Checkbox
                    id="visitaValoracion"
                    checked={servicio.visitaValoracion}
                    onCheckedChange={(checked) => handleCheckboxChange("visitaValoracion", !!checked)}
                    className="text-indigo-600 border-gray-300 focus:ring-indigo-500"
                  />
                  <label htmlFor="visitaValoracion" className="ml-2 text-sm">Visita de valoración</label>
                </div>
                
                <div className="flex items-center">
                  <Checkbox
                    id="apareceEnApp"
                    checked={servicio.apareceEnApp}
                    onCheckedChange={(checked) => handleCheckboxChange("apareceEnApp", !!checked)}
                    className="text-indigo-600 border-gray-300 focus:ring-indigo-500"
                  />
                  <label htmlFor="apareceEnApp" className="ml-2 text-sm">Aparece en App / Self</label>
                </div>
                
                <div className="flex items-center">
                  <Checkbox
                    id="descuentosAutomaticos"
                    checked={servicio.descuentosAutomaticos}
                    onCheckedChange={(checked) => handleCheckboxChange("descuentosAutomaticos", !!checked)}
                    className="text-indigo-600 border-gray-300 focus:ring-indigo-500"
                  />
                  <label htmlFor="descuentosAutomaticos" className="ml-2 text-sm">Descuentos automáticos</label>
                </div>
                
                <div className="flex items-center">
                  <Checkbox
                    id="descuentosManuales"
                    checked={servicio.descuentosManuales}
                    onCheckedChange={(checked) => handleCheckboxChange("descuentosManuales", !!checked)}
                    className="text-indigo-600 border-gray-300 focus:ring-indigo-500"
                  />
                  <label htmlFor="descuentosManuales" className="ml-2 text-sm">Descuentos manuales</label>
                </div>
                
                <div className="flex items-center">
                  <Checkbox
                    id="aceptaPromociones"
                    checked={servicio.aceptaPromociones}
                    onCheckedChange={(checked) => handleCheckboxChange("aceptaPromociones", !!checked)}
                    className="text-indigo-600 border-gray-300 focus:ring-indigo-500"
                  />
                  <label htmlFor="aceptaPromociones" className="ml-2 text-sm">Acepta promociones</label>
                </div>
                
                <div className="flex items-center">
                  <Checkbox
                    id="aceptaEdicionPVP"
                    checked={servicio.aceptaEdicionPVP}
                    onCheckedChange={(checked) => handleCheckboxChange("aceptaEdicionPVP", !!checked)}
                    className="text-indigo-600 border-gray-300 focus:ring-indigo-500"
                  />
                  <label htmlFor="aceptaEdicionPVP" className="ml-2 text-sm">Acepta edición PVP</label>
                </div>
                
                <div className="flex items-center">
                  <Checkbox
                    id="afectaEstadisticas"
                    checked={servicio.afectaEstadisticas}
                    onCheckedChange={(checked) => handleCheckboxChange("afectaEstadisticas", !!checked)}
                    className="text-indigo-600 border-gray-300 focus:ring-indigo-500"
                  />
                  <label htmlFor="afectaEstadisticas" className="ml-2 text-sm">Afecta estadísticas</label>
                </div>
                
                <div className="flex items-center">
                  <Checkbox
                    id="deshabilitado"
                    checked={servicio.deshabilitado}
                    onCheckedChange={(checked) => handleCheckboxChange("deshabilitado", !!checked)}
                    className="text-indigo-600 border-gray-300 focus:ring-indigo-500"
                  />
                  <label htmlFor="deshabilitado" className="ml-2 text-sm">Deshabilitado</label>
                </div>
              </div>
              
              <div className="mt-6">
                <Button
                  type="button"
                  className="text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  onClick={() => {}}
                >
                  <FileQuestion className="w-4 h-4 mr-2" />
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
            onClick={() => verificarCamposYNavegar(`/configuracion/tarifas/${tarifaId}/nuevo-servicio/consumos`)}
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
            onClick={handleGuardarServicio}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <span className="mr-2 animate-spin">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
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
          <HelpButton content="Ayuda para la creación de servicios" />
        </div>
      </div>

      {/* Modal de error para campos obligatorios - mejorado */}
      <Dialog
        open={mostrarModalCamposObligatorios}
        onOpenChange={setMostrarModalCamposObligatorios}
      >
        <DialogContent className="text-center sm:max-w-md">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center justify-center text-red-600">
              <AlertCircle className="w-6 h-6 mr-2" />
              Datos incompletos
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="mb-4 text-sm text-muted-foreground">
              <span className="block mb-3">Debe completar los siguientes campos obligatorios antes de configurar consumos:</span>
              <ul className="inline-block pl-5 mb-3 text-left list-disc">
                {camposFaltantes.map((campo, index) => (
                  <li key={index} className="text-red-600">{campo}</li>
                ))}
              </ul>
            </div>
          </div>
          <DialogFooter className="flex justify-center pt-2">
            <Button
              className="w-32"
              onClick={() => setMostrarModalCamposObligatorios(false)}
            >
              Aceptar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación para guardar servicio */}
      <Dialog open={mostrarModalConfirmacion} onOpenChange={setMostrarModalConfirmacion}>
        <DialogContent className="p-6 sm:max-w-md">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center text-xl">
              <Save className="w-5 h-5 mr-2" />
              Guardar servicio
            </DialogTitle>
          </DialogHeader>
          <div className="px-2 py-4">
            <p className="mb-3 text-gray-700">
              El servicio no ha sido guardado. Se creará automáticamente para poder continuar.
            </p>
            <p className="font-medium text-gray-800">
              ¿Desea continuar?
            </p>
          </div>
          <DialogFooter className="pt-2 space-x-3">
            <Button 
              variant="outline" 
              onClick={() => setMostrarModalConfirmacion(false)}
            >
              Cancelar
            </Button>
            <Button 
              className="text-white bg-indigo-600 hover:bg-indigo-700"
              onClick={guardarServicioYNavegar}
              disabled={isSaving}
            >
              {isSaving ? 'Guardando...' : 'Guardar y continuar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
