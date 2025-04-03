"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Search, MoreHorizontal, Save, ArrowLeft, HelpCircle, X } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { toast } from "@/components/ui/use-toast"
import { CalendarIcon, Clock, Pencil, Plus, Settings, Trash, Eye, AlertCircle, Calendar, PlusCircle, CheckCircle, Fingerprint, Briefcase } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

// Importación de contextos
import { useUser } from "@/contexts/user-context"
import { useClinic } from "@/contexts/clinic-context"
import { useRole } from "@/contexts/role-context"
import { useService } from "@/contexts/service-context"

// Importación de tipos
import { 
  UsuarioEmpleado,
  HorarioDia, 
  FranjaHoraria, 
  ExcepcionHoraria, 
  HorarioClinica,
  HorarioSemanal
} from "@/services/data/models/interfaces"

// Tipos para el sistema de horarios

// Creamos componentes memoizados para evitar renderizados innecesarios
const SelectClinica = React.memo(({ 
  value, 
  onChange, 
  disabled, 
  options, 
  placeholder 
}: { 
  value: string, 
  onChange: (value: string) => void, 
  disabled?: boolean, 
  options: { id: string, label: string }[], 
  placeholder: string 
}) => {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-9">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.length === 0 ? (
          <SelectItem value="no_selection" disabled>No hay opciones disponibles</SelectItem>
        ) : (
          options.map(option => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
});

SelectClinica.displayName = "SelectClinica";

// Componente memoizado para select de tipo
const SelectTipo = React.memo(({ 
  value, 
  onChange
}: { 
  value: string, 
  onChange: (value: any) => void
}) => {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9">
        <SelectValue placeholder="Seleccione tipo" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="familia">Familia completa</SelectItem>
        <SelectItem value="servicio">Servicio específico</SelectItem>
      </SelectContent>
    </Select>
  );
});

SelectTipo.displayName = "SelectTipo";

// Componente memoizado para selects genéricos
const MemoizedSelect = React.memo(({ 
  value, 
  onChange, 
  disabled,
  placeholder,
  children 
}: { 
  value?: string, 
  onChange?: (value: string) => void, 
  disabled?: boolean, 
  placeholder: string,
  children: React.ReactNode
}) => {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-9">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {children}
      </SelectContent>
    </Select>
  );
});

MemoizedSelect.displayName = "MemoizedSelect";

// Agregar la función isWithinClinicHours que falta
function isWithinClinicHours(clinicaId: string, dia: string, inicio: string, fin: string): boolean {
  try {
    // Validaciones básicas
    if (!inicio || !fin || inicio >= fin) return false;
    
    // Mock data para validar horarios (esto vendría del contexto real en producción)
    const HORARIOS_CLINICA_MOCK: Record<string, any> = {
      "1": {
        horarioGeneral: { apertura: "09:00", cierre: "20:00" },
        excepciones: [
          { dia: "lunes", apertura: "10:00", cierre: "19:00" },
          { dia: "sabado", apertura: "10:00", cierre: "14:00" },
          { dia: "domingo", apertura: "", cierre: "" } // Cerrado
        ]
      },
      "2": {
        horarioGeneral: { apertura: "08:30", cierre: "21:00" },
        excepciones: [
          { dia: "sabado", apertura: "09:00", cierre: "15:00" },
          { dia: "domingo", apertura: "", cierre: "" } // Cerrado
        ]
      }
    };
    
    // Obtener el horario de la clínica
    const horarioClinica = HORARIOS_CLINICA_MOCK[clinicaId];
    if (!horarioClinica) return true; // Si no hay datos, permitimos cualquier horario (desarrollo)
    
    // Buscar si hay excepción para este día
    const excepcion = horarioClinica.excepciones.find((exc: any) => 
      exc.dia.toLowerCase() === dia.toLowerCase()
    );
    
    // Si el día está cerrado, ninguna franja es válida
    if (excepcion && (!excepcion.apertura || !excepcion.cierre)) {
      return false;
    }
    
    // Validar contra el horario específico del día o el general
    const horaApertura = excepcion ? excepcion.apertura : horarioClinica.horarioGeneral.apertura;
    const horaCierre = excepcion ? excepcion.cierre : horarioClinica.horarioGeneral.cierre;
    
    // Validar que la franja esté dentro del horario de apertura y cierre
    return inicio >= horaApertura && fin <= horaCierre;
  } catch (error) {
    console.error("Error al validar horario:", error);
    return false;
  }
}

export default function EditarUsuarioPage({ params }: { params: { id: string } }) {
  // Utilizamos React.use para desenvolver params (recomendación de Next.js)
  // y forzamos el tipo correcto con una doble aserción
  const paramsUnwrapped = React.use(params as any) as { id: string };
  const userId = paramsUnwrapped.id;
  
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Obtener los parámetros de la URL
  const returnToBase = searchParams.get('returnTo') || "/configuracion/usuarios"
  const tabParam = searchParams.get('tab')
  
  // Construir la URL de retorno completa
  // Si returnToBase ya contiene un signo de interrogación, usamos & para añadir el parámetro tab
  // Si no, usamos ? para iniciar los parámetros de consulta
  const returnTo = tabParam 
    ? returnToBase.includes('?') 
      ? `${returnToBase}&tab=${tabParam}` 
      : `${returnToBase}?tab=${tabParam}`
    : returnToBase
  
  const { getUsuarioById, updateUsuario } = useUser()
  const { clinics } = useClinic()
  const { roles } = useRole()
  const { familias, servicios } = useService()
  
  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [confirmEmail, setConfirmEmail] = useState("")
  const [prefijo, setPrefijo] = useState("")
  const [telefono, setTelefono] = useState("")
  const [perfil, setPerfil] = useState("")
  const [isActive, setIsActive] = useState(true)
  
  // Estructura para almacenar permisos más detallados: Map<clinicaId, string[]>
  const [permisosClinicas, setPermisosClinicas] = useState<Map<string, string[]>>(new Map())
  
  // Convertir Map a array usando useMemo para estabilizar la referencia
  const selectedClinicas = React.useMemo(() => 
    Array.from(permisosClinicas.keys()), 
    [permisosClinicas] // Dependencia
  );
  
  const [loading, setLoading] = useState(true)
  const [showDisabledClinics, setShowDisabledClinics] = useState(false)
  
  // Nuevos estados para campos adicionales
  const [dni, setDni] = useState("")
  const [fechaNacimiento, setFechaNacimiento] = useState("")
  const [sexo, setSexo] = useState("")
  const [telefono2, setTelefono2] = useState("")
  const [contrasena, setContrasena] = useState("")
  const [idioma, setIdioma] = useState("")
  
  // Estados para los datos de colegiado
  const [colegio, setColegio] = useState("")
  const [numeroColegiado, setNumeroColegiado] = useState("")
  const [especialidad, setEspecialidad] = useState("")
  const [universidad, setUniversidad] = useState("")
  
  // Estados para dirección
  const [direccion, setDireccion] = useState("")
  const [provincia, setProvincia] = useState("")
  const [pais, setPais] = useState("")
  const [localidad, setLocalidad] = useState("")
  const [cp, setCp] = useState("")
  
  // Estados para configuración
  const [exportCsv, setExportCsv] = useState("")
  const [indiceControl, setIndiceControl] = useState("")
  const [numeroPIN, setNumeroPIN] = useState("")
  const [notas, setNotas] = useState("")
  const [mostrarDesplazados, setMostrarDesplazados] = useState(false)
  const [mostrarCitasPropias, setMostrarCitasPropias] = useState(false)
  const [restringirIP, setRestringirIP] = useState(false)
  const [deshabilitado, setDeshabilitado] = useState(false)
  
  // Estado para la pestaña actual
  const [activeTab, setActiveTab] = useState("datos-personales")
  
  // Estado para la búsqueda en permisos
  const [searchPermisos, setSearchPermisos] = useState("")
  
  // Estado para añadir nueva clínica y perfil
  const [nuevaClinicaId, setNuevaClinicaId] = useState("")
  const [nuevoPerfilClinica, setNuevoPerfilClinica] = useState("")
  
  // Estado para manejo de excepciones
  const [showExcepcionModal, setShowExcepcionModal] = useState(false);
  const [editingExcepcion, setEditingExcepcion] = useState<{
    id?: string;
    nombre: string;
    fechaInicio: string;
    fechaFin: string;
    dias: HorarioDia[];
  } | null>(null);
  
  // Función para crear una excepción por defecto
  const crearExcepcionPorDefecto = () => {
    // Crear todos los días de la semana para la excepción
    const diasSemana: HorarioDia[] = [
      { dia: 'lunes', franjas: [], activo: true },
      { dia: 'martes', franjas: [], activo: true },
      { dia: 'miercoles', franjas: [], activo: true },
      { dia: 'jueves', franjas: [], activo: true },
      { dia: 'viernes', franjas: [], activo: true },
      { dia: 'sabado', franjas: [], activo: false },
      { dia: 'domingo', franjas: [], activo: false }
    ];
    
    // Fecha de inicio por defecto (hoy)
    const fechaHoy = new Date();
    const fechaInicio = fechaHoy.toISOString().split('T')[0];
    
    // Fecha de fin por defecto (15 días después)
    const fechaFin = new Date(fechaHoy);
    fechaFin.setDate(fechaFin.getDate() + 15);
    const fechaFinStr = fechaFin.toISOString().split('T')[0];
    
    return {
      nombre: "Nueva excepción",
      fechaInicio,
      fechaFin: fechaFinStr,
      dias: diasSemana
    };
  };
  
  // Función para añadir una excepción
  const handleAddExcepcion = (excepcion: ExcepcionHoraria) => {
    // Validar todas las franjas horarias antes de guardar
    let hayAjustes = false;
    const diasValidados = excepcion.dias.map(dia => {
      // Si el día no está activo, lo dejamos como está
      if (!dia.activo) return dia;
      
      // Obtener el horario de la clínica
      const horarioClinica = HORARIOS_CLINICA_MOCK[selectedClinicaHorario] || 
                            HORARIOS_CLINICA_MOCK["1"];
      
      // Buscar si hay excepción para este día
      const excepcionClinica = horarioClinica.excepciones.find(exc => 
        exc.dia.toLowerCase() === dia.dia.toLowerCase()
      );
      
      // Si el día está cerrado según la excepción, desactivamos el día
      if (excepcionClinica && (!excepcionClinica.apertura || !excepcionClinica.cierre)) {
        hayAjustes = true;
        return {
          ...dia,
          activo: false,
          franjas: []
        };
      }
      
      // Determinar el horario permitido para este día
      const horaApertura = excepcionClinica && excepcionClinica.apertura 
        ? excepcionClinica.apertura 
        : horarioClinica.horarioGeneral.apertura;
      
      const horaCierre = excepcionClinica && excepcionClinica.cierre 
        ? excepcionClinica.cierre 
        : horarioClinica.horarioGeneral.cierre;
      
      // Ajustar las franjas
      const franjasAjustadas = dia.franjas.map(franja => {
        let inicioAjustado = franja.inicio;
        let finAjustado = franja.fin;
        let ajustado = false;
        
        // Ajustamos el inicio si está fuera de los límites
        if (inicioAjustado < horaApertura) {
          inicioAjustado = horaApertura;
          ajustado = true;
        }
        
        // Ajustamos el fin si está fuera de los límites
        if (finAjustado > horaCierre) {
          finAjustado = horaCierre;
          ajustado = true;
        }
        
        // Verificamos que inicio sea anterior a fin
        if (inicioAjustado >= finAjustado) {
          // En este caso, usamos el horario completo de la clínica
          inicioAjustado = horaApertura;
          finAjustado = horaCierre;
          ajustado = true;
        }
        
        if (ajustado) hayAjustes = true;
        
        return {
          ...franja,
          inicio: inicioAjustado,
          fin: finAjustado
        };
      });
      
      // Agrupamos franjas superpuestas
      const franjasAgrupadas: FranjaHoraria[] = [];
      franjasAjustadas.forEach(franja => {
        // Buscamos si hay solapamiento con alguna franja existente
        const franjasSolapadas = franjasAgrupadas.filter(f => 
          (franja.inicio >= f.inicio && franja.inicio < f.fin) || // Inicio dentro de otra franja
          (franja.fin > f.inicio && franja.fin <= f.fin) || // Fin dentro de otra franja
          (franja.inicio <= f.inicio && franja.fin >= f.fin) // Contiene completamente a otra franja
        );
        
        if (franjasSolapadas.length > 0) {
          // Agrupamos todas las franjas solapadas
          const todasLasFranjas = [...franjasSolapadas, franja];
          
          // Encontramos el mínimo inicio y el máximo fin
          const minInicio = todasLasFranjas.reduce((min, f) => 
            f.inicio < min ? f.inicio : min, todasLasFranjas[0].inicio);
          
          const maxFin = todasLasFranjas.reduce((max, f) => 
            f.fin > max ? f.fin : max, todasLasFranjas[0].fin);
          
          // Eliminamos las franjas solapadas
          franjasSolapadas.forEach(f => {
            const index = franjasAgrupadas.findIndex(existente => existente.id === f.id);
            if (index >= 0) franjasAgrupadas.splice(index, 1);
          });
          
          // Añadimos la nueva franja agrupada
          franjasAgrupadas.push({
            id: `franja_agrupada_${Date.now()}_${Math.random()}`,
            inicio: minInicio,
            fin: maxFin
          });
          
          hayAjustes = true;
        } else {
          // Si no hay solapamiento, añadimos la franja tal cual
          franjasAgrupadas.push(franja);
        }
      });
      
      return {
        ...dia,
        franjas: franjasAgrupadas
      };
    });
    
    // Actualizamos el objeto de excepción con los días validados
    const excepcionValidada = {
      ...excepcion,
      dias: diasValidados
    };
    
    // Si hubo ajustes, notificamos al usuario
    if (hayAjustes) {
      toast({
        title: "Horarios ajustados",
        description: "Se han ajustado algunos horarios para cumplir con las restricciones de la clínica",
        variant: "default",
      });
    }
    
    setExcepciones(prev => [
      ...prev.filter(e => e.id !== excepcionValidada.id), // Eliminar si ya existe
      excepcionValidada
    ]);
    
    setShowExcepcionModal(false);
    setEditingExcepcion(null);
    
    toast({
      title: "Excepción guardada",
      description: "La excepción ha sido guardada correctamente",
    });
  };
  
  // Función para añadir franja a un día en una excepción
  const handleAddFranjaExcepcion = (diaIndex: number, inicio: string, fin: string) => {
    if (!editingExcepcion) return;
    
    // Obtener el horario específico del día
    const horarioClinica = HORARIOS_CLINICA_MOCK[selectedClinicaHorario] || 
                          HORARIOS_CLINICA_MOCK["1"];
    
    const diaId = editingExcepcion.dias[diaIndex]?.dia || "lunes";
    
    // Buscar si hay excepción para este día
    const excepcion = horarioClinica.excepciones.find(exc => 
      exc.dia.toLowerCase() === diaId.toLowerCase()
    );
    
    // Determinar los límites horarios para este día
    const horaApertura = excepcion && excepcion.apertura ? excepcion.apertura : horarioClinica.horarioGeneral.apertura;
    const horaCierre = excepcion && excepcion.cierre ? excepcion.cierre : horarioClinica.horarioGeneral.cierre;
    
    // Ajustar las horas para que estén dentro del rango permitido
    let inicioAjustado = inicio;
    let finAjustado = fin;
    
    // Si la hora de inicio es anterior a la apertura, ajustarla silenciosamente
    if (inicioAjustado < horaApertura) {
      inicioAjustado = horaApertura;
    }
    
    // Si la hora de fin es posterior al cierre, ajustarla silenciosamente
    if (finAjustado > horaCierre) {
      finAjustado = horaCierre;
    }
    
    // Verificar que inicio sea anterior a fin
    if (inicioAjustado >= finAjustado) {
      toast({
        title: "Error en la franja horaria",
        description: "La hora de fin debe ser posterior a la de inicio",
        variant: "destructive",
      });
      return;
    }
    
    setEditingExcepcion(prev => {
      if (!prev) return prev;
      
      const newDias = [...prev.dias];
      if (diaIndex >= 0 && diaIndex < newDias.length) {
        newDias[diaIndex] = {
          ...newDias[diaIndex],
          franjas: [
            ...newDias[diaIndex].franjas,
            {
              id: `franja_excepcion_${Date.now()}_${Math.random()}`,
              inicio: inicioAjustado,
              fin: finAjustado
            }
          ]
        };
      }
      
      return {
        ...prev,
        dias: newDias
      };
    });
  };
  
  // Función para eliminar franja de un día en una excepción
  const handleRemoveFranjaExcepcion = (diaIndex: number, franjaId: string) => {
    if (!editingExcepcion) return;
    
    setEditingExcepcion(prev => {
      if (!prev) return prev;
      
      const newDias = [...prev.dias];
      if (diaIndex >= 0 && diaIndex < newDias.length) {
        newDias[diaIndex] = {
          ...newDias[diaIndex],
          franjas: newDias[diaIndex].franjas.filter(f => f.id !== franjaId)
        };
      }
      
      return {
        ...prev,
        dias: newDias
      };
    });
  };
  
  // Función para activar/desactivar un día en una excepción
  const handleToggleDiaExcepcion = (diaIndex: number, activo: boolean) => {
    if (!editingExcepcion) return;
    
    setEditingExcepcion(prev => {
      if (!prev) return prev;
      
      const newDias = [...prev.dias];
      if (diaIndex >= 0 && diaIndex < newDias.length) {
        newDias[diaIndex] = {
          ...newDias[diaIndex],
          activo
        };
      }
      
      return {
        ...prev,
        dias: newDias
      };
    });
  };
  
  // Función para eliminar una excepción
  const handleRemoveExcepcion = (excepcionId: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta excepción? Esta acción no se puede deshacer.")) {
      setExcepciones(prev => prev.filter(e => e.id !== excepcionId));
      
      toast({
        title: "Excepción eliminada",
        description: "La excepción ha sido eliminada correctamente",
      });
    }
  };
  
  // Filtrar las clínicas activas
  const activeClinicas = clinics.filter(clinic => clinic.isActive)
  
  // Clínicas a mostrar en el selector (según el filtro)
  const clinicasToShow = showDisabledClinics ? clinics : activeClinicas
  
  // Lista de todos los perfiles disponibles en el sistema
  const PERFILES_DISPONIBLES = [
    "Administrador", 
    "Central", 
    "Contabilidad", 
    "Doctor Administrador", 
    "Encargado", 
    "Gerente de zona", 
    "Marketing", 
    "Operador Call Center", 
    "Personal sin acceso", 
    "Personal", 
    "Profesional", 
    "Recepción", 
    "Supervisor Call Center"
  ];
  
  // Estado para la asignación de habilidades profesionales
  const [habilidadesProfesionales, setHabilidadesProfesionales] = useState<Map<string, string[]>>(new Map())
  const [nuevaClinicaHabilidad, setNuevaClinicaHabilidad] = useState("")
  const [nuevaFamilia, setNuevaFamilia] = useState("")
  const [nuevoServicio, setNuevoServicio] = useState("")
  const [tipoSeleccion, setTipoSeleccion] = useState<"familia" | "servicio">("familia")
  const [searchHabilidades, setSearchHabilidades] = useState("")
  
  // Datos mock para las familias y servicios (estos vendrían de una API real)
  const FAMILIAS_MOCK = [
    { id: "fam1", nombre: "Tratamientos faciales" },
    { id: "fam2", nombre: "Tratamientos corporales" },
    { id: "fam3", nombre: "Depilación" },
    { id: "fam4", nombre: "Masajes" },
    { id: "fam5", nombre: "Manicura y pedicura" },
    { id: "fam6", nombre: "Tratamientos capilares" },
  ];
  
  const SERVICIOS_MOCK = {
    "fam1": [
      { id: "serv1", nombre: "Limpieza facial", duracion: "60 min" },
      { id: "serv2", nombre: "Tratamiento anti-edad", duracion: "90 min" },
      { id: "serv3", nombre: "Hidratación profunda", duracion: "45 min" },
    ],
    "fam2": [
      { id: "serv4", nombre: "Exfoliación corporal", duracion: "60 min" },
      { id: "serv5", nombre: "Tratamiento reafirmante", duracion: "90 min" },
      { id: "serv6", nombre: "Masaje anticelulítico", duracion: "60 min" },
    ],
    "fam3": [
      { id: "serv7", nombre: "Depilación láser", duracion: "30 min" },
      { id: "serv8", nombre: "Depilación con cera", duracion: "45 min" },
    ],
    "fam4": [
      { id: "serv9", nombre: "Masaje relajante", duracion: "60 min" },
      { id: "serv10", nombre: "Masaje descontracturante", duracion: "60 min" },
      { id: "serv11", nombre: "Masaje deportivo", duracion: "90 min" },
    ],
    "fam5": [
      { id: "serv12", nombre: "Manicura simple", duracion: "30 min" },
      { id: "serv13", nombre: "Pedicura completa", duracion: "45 min" },
      { id: "serv14", nombre: "Esmaltado permanente", duracion: "60 min" },
    ],
    "fam6": [
      { id: "serv15", nombre: "Corte de pelo", duracion: "30 min" },
      { id: "serv16", nombre: "Tinte", duracion: "90 min" },
      { id: "serv17", nombre: "Tratamiento hidratante", duracion: "45 min" },
    ],
  };

  // Obtener todas las habilidades asignadas (para filtrado y visualización)
  const todasLasHabilidadesAsignadas = React.useMemo(() => {
    const habilidades: {
      clinicaId: string,
      tipoHabilidad: "familia" | "servicio",
      id: string,
      nombre: string,
      familiaNombre?: string,
      duracion?: string
    }[] = [];
    
    habilidadesProfesionales.forEach((items, clinicaId) => {
      items.forEach(item => {
        if (item.startsWith("fam_")) {
          // Es una familia
          const familiaId = item.replace("fam_", "");
          const familia = FAMILIAS_MOCK.find(f => f.id === familiaId);
          if (familia) {
            habilidades.push({
              clinicaId,
              tipoHabilidad: "familia",
              id: familia.id,
              nombre: familia.nombre
            });
          }
        } else if (item.startsWith("serv_")) {
          // Es un servicio
          const servicioId = item.replace("serv_", "");
          // Buscar en todas las familias
          for (const [familiaId, servicios] of Object.entries(SERVICIOS_MOCK)) {
            const servicio = servicios.find(s => s.id === servicioId);
            if (servicio) {
              const familia = FAMILIAS_MOCK.find(f => f.id === familiaId);
              habilidades.push({
                clinicaId,
                tipoHabilidad: "servicio",
                id: servicio.id,
                nombre: servicio.nombre,
                familiaNombre: familia?.nombre,
                duracion: servicio.duracion
              });
              break;
            }
          }
        }
      });
    });
    
    return habilidades;
  }, [habilidadesProfesionales]);
  
  const handleAddHabilidad = () => {
    if (!nuevaClinicaHabilidad) return;
    
    let itemToAdd = "";
    
    if (tipoSeleccion === "familia" && nuevaFamilia) {
      itemToAdd = `fam_${nuevaFamilia}`;
    } else if (tipoSeleccion === "servicio" && nuevoServicio) {
      itemToAdd = `serv_${nuevoServicio}`;
    } else {
      return; // No hay selección
    }
    
    setHabilidadesProfesionales(prev => {
      const newHabilidades = new Map(prev);
      
      // Si la clínica ya existe, añadir la habilidad si no está ya
      if (newHabilidades.has(nuevaClinicaHabilidad)) {
        const habilidadesActuales = newHabilidades.get(nuevaClinicaHabilidad) || [];
        if (!habilidadesActuales.includes(itemToAdd)) {
          newHabilidades.set(nuevaClinicaHabilidad, [...habilidadesActuales, itemToAdd]);
        }
      } else {
        // Si es una nueva clínica
        newHabilidades.set(nuevaClinicaHabilidad, [itemToAdd]);
      }
      
      return newHabilidades;
    });
    
    // Resetear selecciones
    setNuevaFamilia("");
    setNuevoServicio("");
  };
  
  const handleRemoveHabilidad = (clinicaId: string, itemToRemove: string) => {
    setHabilidadesProfesionales(prev => {
      const newHabilidades = new Map(prev);
      
      const habilidadesActuales = newHabilidades.get(clinicaId) || [];
      const habilidadesActualizadas = habilidadesActuales.filter(item => item !== itemToRemove);
      
      // Si quedan habilidades, actualizar. Si no, eliminar la clínica
      if (habilidadesActualizadas.length > 0) {
        newHabilidades.set(clinicaId, habilidadesActualizadas);
      } else {
        newHabilidades.delete(clinicaId);
      }
      
      return newHabilidades;
    });
  };
  
  useEffect(() => {
    // Aquí cargaríamos las habilidades profesionales del usuario
    // desde el backend cuando implementemos la API
    // Por ahora usamos datos de ejemplo
    const cargarHabilidadesMock = () => {
      const habilidadesMock = new Map<string, string[]>();
      
      // Ejemplo: asignamos algunas habilidades a una clínica
      if (clinics.length > 0) {
        habilidadesMock.set(String(clinics[0].id), ["fam_fam1", "serv_serv9"]);
        if (clinics.length > 1) {
          habilidadesMock.set(String(clinics[1].id), ["serv_serv12", "serv_serv13"]);
        }
      }
      
      setHabilidadesProfesionales(habilidadesMock);
    };
    
    if (!loading) {
      cargarHabilidadesMock();
    }
  }, [loading, clinics]);
  
  useEffect(() => {
    const loadUsuario = async () => {
      try {
        // Envolver todo en un try/catch para evitar que errores en la carga
        // causen ciclos
        try {
          const usuario = await getUsuarioById(userId)
          
          if (!usuario) {
            toast({
              title: "Error",
              description: "No se pudo encontrar el usuario",
              variant: "destructive",
            })
            router.push(returnTo)
            return
          }
          
          // Datos básicos
          setNombre(usuario.nombre || "")
          setEmail(usuario.email || "")
          setConfirmEmail(usuario.email || "")
          setPrefijo(usuario.prefijoTelefonico || "")
          setTelefono(usuario.telefono || "")
          setPerfil(usuario.perfil || "")
          setIsActive(usuario.isActive)
          
          // Cargar permisos de clínicas
          if (usuario.clinicasIds && Array.isArray(usuario.clinicasIds)) {
            const permisosMap = new Map<string, string[]>();
            
            // Convertir array simple a Map con perfiles por defecto
            usuario.clinicasIds.forEach(clinicaId => {
              // Acceso seguro usando casting tipado para añadir la propiedad opcional
              const perfilesUsuario = (usuario as any).perfilesClinica?.[clinicaId] || ["Personal"];
              permisosMap.set(clinicaId, perfilesUsuario);
            });
            
            setPermisosClinicas(permisosMap);
          }
          
          // Datos adicionales omitidos para simplificar
          // ...
          
        } catch (innerError) {
          console.error("Error interno al cargar datos:", innerError)
        }
        
        setLoading(false)
      } catch (error) {
        console.error("Error al cargar usuario:", error)
        toast({
          title: "Error",
          description: "No se pudo cargar la información del usuario",
          variant: "destructive",
        })
        router.push(returnTo)
      }
    }
    
    loadUsuario()
  }, [userId, getUsuarioById, router, returnTo])
  
  const handleAddClinica = (clinicaId: string, perfilClinica: string) => {
    setPermisosClinicas(prev => {
      const newPermisos = new Map(prev);
      
      // Si la clínica ya existe, añadir el perfil si no está ya
      if (newPermisos.has(clinicaId)) {
        const perfilesActuales = newPermisos.get(clinicaId) || [];
        if (!perfilesActuales.includes(perfilClinica)) {
          newPermisos.set(clinicaId, [...perfilesActuales, perfilClinica]);
        }
      } else {
        // Si es una nueva clínica
        newPermisos.set(clinicaId, [perfilClinica]);
      }
      
      return newPermisos;
    });
  }
  
  const handleRemoveClinica = (clinicaId: string, perfilToRemove?: string) => {
    setPermisosClinicas(prev => {
      const newPermisos = new Map(prev);
      
      // Si se especifica un perfil, solo eliminar ese perfil
      if (perfilToRemove) {
        const perfilesActuales = newPermisos.get(clinicaId) || [];
        const perfilesActualizados = perfilesActuales.filter(p => p !== perfilToRemove);
        
        // Si quedan perfiles, actualizar. Si no, eliminar la clínica
        if (perfilesActualizados.length > 0) {
          newPermisos.set(clinicaId, perfilesActualizados);
        } else {
          newPermisos.delete(clinicaId);
        }
      } else {
        // Si no se especifica perfil, eliminar toda la clínica
        newPermisos.delete(clinicaId);
      }
      
      return newPermisos;
    });
  }
  
  const handleSave = async () => {
    // Validaciones básicas
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
    
    // Validar y ajustar todas las franjas horarias antes de guardar
    const horariosValidados = new Map<string, HorarioDia[]>();
    let haAjustadoHorarios = false;
    
    // Recorremos todas las clínicas asignadas
    horarioSemanal.forEach((diasHorario, clinicaId) => {
      // Obtenemos el horario de la clínica
      const horarioClinica = HORARIOS_CLINICA_MOCK[clinicaId] || 
                           HORARIOS_CLINICA_MOCK["1"] || 
                           { 
                             horarioGeneral: { apertura: "09:00", cierre: "20:00" },
                             excepciones: []
                           };
      
      // Ajustamos cada día
      const diasAjustados = diasHorario.map(diaHorario => {
        // Si el día no está activo, lo dejamos como está
        if (!diaHorario.activo) return diaHorario;
        
        // Obtenemos las excepciones del día
        const excepcion = horarioClinica.excepciones.find(exc => 
          exc.dia.toLowerCase() === diaHorario.dia.toLowerCase()
        );
        
        // Si el día está cerrado según la excepción, desactivamos el día
        if (excepcion && (!excepcion.apertura || !excepcion.cierre)) {
          haAjustadoHorarios = true;
          return {
            ...diaHorario,
            activo: false,
            franjas: []
          };
        }
        
        // Determinamos el horario permitido para este día
        const horaApertura = excepcion && excepcion.apertura 
          ? excepcion.apertura 
          : horarioClinica.horarioGeneral.apertura;
        
        const horaCierre = excepcion && excepcion.cierre 
          ? excepcion.cierre 
          : horarioClinica.horarioGeneral.cierre;
        
        // Ajustamos las franjas
        const franjasAjustadas = diaHorario.franjas.map(franja => {
          let inicioAjustado = franja.inicio;
          let finAjustado = franja.fin;
          let ajustado = false;
          
          // Ajustamos el inicio si está fuera de los límites
          if (inicioAjustado < horaApertura) {
            inicioAjustado = horaApertura;
            ajustado = true;
          }
          
          // Ajustamos el fin si está fuera de los límites
          if (finAjustado > horaCierre) {
            finAjustado = horaCierre;
            ajustado = true;
          }
          
          // Verificamos que inicio sea anterior a fin
          if (inicioAjustado >= finAjustado) {
            // En este caso, usamos el horario completo de la clínica
            inicioAjustado = horaApertura;
            finAjustado = horaCierre;
            ajustado = true;
          }
          
          if (ajustado) haAjustadoHorarios = true;
          
          return {
            ...franja,
            inicio: inicioAjustado,
            fin: finAjustado
          };
        });
        
        // Agrupamos franjas superpuestas
        const franjasAgrupadas: FranjaHoraria[] = [];
        franjasAjustadas.forEach(franja => {
          // Buscamos si hay solapamiento con alguna franja existente
          const franjasSolapadas = franjasAgrupadas.filter(f => 
            (franja.inicio >= f.inicio && franja.inicio < f.fin) || // Inicio dentro de otra franja
            (franja.fin > f.inicio && franja.fin <= f.fin) || // Fin dentro de otra franja
            (franja.inicio <= f.inicio && franja.fin >= f.fin) // Contiene completamente a otra franja
          );
          
          if (franjasSolapadas.length > 0) {
            // Agrupamos todas las franjas solapadas
            const todasLasFranjas = [...franjasSolapadas, franja];
            
            // Encontramos el mínimo inicio y el máximo fin
            const minInicio = todasLasFranjas.reduce((min, f) => 
              f.inicio < min ? f.inicio : min, todasLasFranjas[0].inicio);
            
            const maxFin = todasLasFranjas.reduce((max, f) => 
              f.fin > max ? f.fin : max, todasLasFranjas[0].fin);
            
            // Eliminamos las franjas solapadas
            franjasSolapadas.forEach(f => {
              const index = franjasAgrupadas.findIndex(existente => existente.id === f.id);
              if (index >= 0) franjasAgrupadas.splice(index, 1);
            });
            
            // Añadimos la nueva franja agrupada
            franjasAgrupadas.push({
              id: `franja_agrupada_${Date.now()}_${Math.random()}`,
              inicio: minInicio,
              fin: maxFin
            });
            
            haAjustadoHorarios = true;
          } else {
            // Si no hay solapamiento, añadimos la franja tal cual
            franjasAgrupadas.push(franja);
          }
        });
        
        return {
          ...diaHorario,
          franjas: franjasAgrupadas
        };
      });
      
      horariosValidados.set(clinicaId, diasAjustados);
    });
    
    // Actualizamos el estado con los horarios validados
    if (haAjustadoHorarios) {
      setHorarioSemanal(horariosValidados);
      toast({
        title: "Horarios ajustados",
        description: "Se han ajustado algunos horarios para cumplir con las restricciones de las clínicas",
        variant: "default",
      });
    }
    
    try {
      // Convertir el Map a un formato serializable para el API
      const perfilesClinica: Record<string, string[]> = {};
      permisosClinicas.forEach((perfiles, clinicaId) => {
        perfilesClinica[clinicaId] = perfiles;
      });
      
      // Convertir el Map de habilidades a formato serializable
      const habilidadesPorClinica: Record<string, string[]> = {};
      habilidadesProfesionales.forEach((habilidades, clinicaId) => {
        habilidadesPorClinica[clinicaId] = habilidades;
      });
      
      // Convertir los horarios a formato serializable
      const horariosSerializables: Record<string, any> = {};
      horariosValidados.forEach((diasHorario, clinicaId) => {
        horariosSerializables[clinicaId] = diasHorario;
      });
      
      const updatedUser = {
        nombre,
        email,
        prefijoTelefonico: prefijo,
        telefono,
        perfil,
        clinicasIds: selectedClinicas,
        perfilesClinica, // Nuevo formato con perfiles por clínica
        habilidadesProfesionales: habilidadesPorClinica, // Habilidades profesionales
        horarios: horariosSerializables, // Horarios validados por clínica
        isActive,
        fechaModificacion: new Date().toISOString(),
        
        // Nuevos campos
        dni,
        fechaNacimiento,
        sexo,
        telefono2,
        contrasena: contrasena ? contrasena : undefined, // Solo enviar si se modificó
        idioma,
        
        // Datos de colegiado
        colegio,
        numeroColegiado,
        especialidad,
        universidad,
        
        // Dirección
        direccion,
        provincia,
        pais,
        localidad,
        cp,
        
        // Configuración
        exportCsv,
        indiceControl,
        numeroPIN,
        notas,
        configuracion: {
          mostrarDesplazados,
          mostrarCitasPropias,
          restringirIP,
          deshabilitado
        }
      }
      
      const success = await updateUsuario(userId, updatedUser)
      
      if (success) {
        toast({
          title: "Usuario actualizado",
          description: "El usuario ha sido actualizado correctamente",
        })
        // Eliminar la redirección para permanecer en la misma página
        // router.push(returnTo)
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
  };
  
  // Estado para horarios
  const [selectedClinicaHorario, setSelectedClinicaHorario] = useState<string>("");
  const [horarioSemanal, setHorarioSemanal] = useState<Map<string, HorarioDia[]>>(new Map());
  const [excepciones, setExcepciones] = useState<ExcepcionHoraria[]>([]);
  const [horarioSubTab, setHorarioSubTab] = useState<"semanal" | "excepciones" | "vista">("semanal");
  
  // Estado para modal de edición de franjas horarias
  const [showHorarioModal, setShowHorarioModal] = useState(false);
  const [editingFranja, setEditingFranja] = useState<{
    diaId: string;
    franjaId?: string;  // Si está definido, estamos editando una franja existente
    inicio: string;
    fin: string;
    isExcepcion?: boolean; // Indica si estamos editando una franja de excepción
    excepcionDiaIndex?: number; // Índice del día en el array de días de la excepción
  } | null>(null);
  
  // Memoizar las opciones de clínicas para el selector de horarios
  const opcionesClinicasHorario = React.useMemo(() => 
    selectedClinicas.map(clinicaId => {
      const clinica = clinics.find(c => String(c.id) === clinicaId);
      return {
        id: clinicaId,
        label: clinica ? `${clinica.prefix} - ${clinica.name}` : "Clínica desconocida"
      };
    }
  ), [selectedClinicas, clinics]);
  
  // Horarios mock de clínicas (esto vendría de un contexto real)
  const HORARIOS_CLINICA_MOCK: Record<string, { 
    horarioGeneral: { apertura: string, cierre: string },
    excepciones: { dia: string, apertura: string, cierre: string }[]
  }> = {
    "1": {
      horarioGeneral: { apertura: "09:00", cierre: "20:00" },
      excepciones: [
        { dia: "lunes", apertura: "10:00", cierre: "19:00" },
        { dia: "sabado", apertura: "10:00", cierre: "14:00" },
        { dia: "domingo", apertura: "", cierre: "" } // Cerrado
      ]
    },
    "2": {
      horarioGeneral: { apertura: "08:30", cierre: "21:00" },
      excepciones: [
        { dia: "sabado", apertura: "09:00", cierre: "15:00" },
        { dia: "domingo", apertura: "", cierre: "" } // Cerrado
      ]
    }
  };
  
  // Inicialización de horarios cuando se carga el usuario o cambia la clínica seleccionada
  useEffect(() => {
    if (!loading && clinics.length > 0) {
      // Inicializar horario semanal por defecto para cada clínica
      const horariosMock = new Map<string, HorarioDia[]>();
      
      selectedClinicas.forEach(clinicaId => {
        // Obtener el horario de la clínica actual (de los datos mock)
        const horarioClinica = HORARIOS_CLINICA_MOCK[clinicaId] || 
                             HORARIOS_CLINICA_MOCK["1"] || 
                             { 
                               horarioGeneral: { apertura: "09:00", cierre: "20:00" },
                               excepciones: []
                             };
        
        // Crear un horario por defecto para cada día de la semana
        const diasSemana = [
          'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'
        ];
        
        // Por defecto, los días laborables (lunes a viernes) están activos
        const diasActivos: Record<string, boolean> = {
          'lunes': true, 'martes': true, 'miercoles': true, 
          'jueves': true, 'viernes': true, 'sabado': false, 'domingo': false
        };
        
        // Crear los horarios específicos para cada día
        const diasHorario: HorarioDia[] = diasSemana.map(dia => {
          // Asegurarnos que 'dia' es del tipo correcto usando type assertion
          const tipoDia = dia as 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';
          
          // Buscar si hay excepción para este día
          const excepcion = horarioClinica.excepciones.find(exc => 
            exc.dia.toLowerCase() === tipoDia.toLowerCase()
          );
          
          // Si hay excepción para el día, usar esos horarios
          // Si el día está cerrado, no crear franjas
          if (excepcion && (!excepcion.apertura || !excepcion.cierre)) {
            return {
              dia: tipoDia,
              franjas: [],
              activo: false // Si la clínica está cerrada ese día, marcar como inactivo
            };
          }
          
          // Determinar horario de apertura y cierre para este día
          const horaApertura = excepcion && excepcion.apertura 
            ? excepcion.apertura 
            : horarioClinica.horarioGeneral.apertura;
          
          const horaCierre = excepcion && excepcion.cierre 
            ? excepcion.cierre 
            : horarioClinica.horarioGeneral.cierre;
          
          // Crear una única franja con todo el horario de la clínica
          const franja = {
            id: `franja_${tipoDia}_${Date.now()}_${Math.random()}`,
            inicio: horaApertura,
            fin: horaCierre
          };
          
          // Verificar si el día debe estar activo o no
          const esActivo: boolean = excepcion 
            ? !!(excepcion.apertura && excepcion.cierre) // Forzar a booleano
            : !!diasActivos[tipoDia]; // Forzar a booleano
          
          return {
            dia: tipoDia,
            franjas: [franja], // Una sola franja para todo el día
            activo: esActivo
          };
        });
        
        horariosMock.set(clinicaId, diasHorario);
      });
      
      setHorarioSemanal(horariosMock);
      
      // Inicializar con excepciones de ejemplo
      if (clinics.length > 0) {
        const excepcionesMock: ExcepcionHoraria[] = [
          {
            id: "exc_1",
            clinicaId: String(clinics[0].id),
            nombre: "Horario de verano",
            fechaInicio: "2023-07-01",
            fechaFin: "2023-08-31",
            dias: [
              { dia: 'lunes', franjas: [{ id: "fs_1", inicio: "08:00", fin: "15:00" }], activo: true },
              { dia: 'martes', franjas: [{ id: "fs_2", inicio: "08:00", fin: "15:00" }], activo: true },
              { dia: 'miercoles', franjas: [{ id: "fs_3", inicio: "08:00", fin: "15:00" }], activo: true },
              { dia: 'jueves', franjas: [{ id: "fs_4", inicio: "08:00", fin: "15:00" }], activo: true },
              { dia: 'viernes', franjas: [{ id: "fs_5", inicio: "08:00", fin: "15:00" }], activo: true },
              { dia: 'sabado', franjas: [], activo: false },
              { dia: 'domingo', franjas: [], activo: false }
            ]
          }
        ];
        
        setExcepciones(excepcionesMock);
      }
      
      // Seleccionar la primera clínica por defecto
      if (selectedClinicas.length > 0) {
        setSelectedClinicaHorario(selectedClinicas[0]);
        
        // Si hay más de una clínica, ofrecemos distribuir los horarios
        if (selectedClinicas.length > 1) {
          distribuirHorariosMultiplesClinicas(selectedClinicas);
        }
      }
    }
  }, [loading, clinics, selectedClinicas]);
  
  // Función para distribuir proporcionalmente los horarios cuando un usuario
  // está asignado a múltiples clínicas
  const distribuirHorariosMultiplesClinicas = (clinicaIds: string[]) => {
    if (clinicaIds.length <= 1) return; // No es necesario si solo hay una clínica

    // Solo activamos esta funcionalidad si el usuario está editando y
    // decide seleccionar esta opción
    if (!confirm(`Has asignado al usuario a ${clinicaIds.length} clínicas. ¿Quieres distribuir automáticamente sus horarios de forma proporcional entre ellas?`)) {
      return;
    }

    // Obtenemos los horarios actuales
    const horariosActuales = new Map(horarioSemanal);
    
    // Asumimos una jornada laboral estándar de 40 horas semanales
    const horasSemanalesTotal = 40;
    
    // Calculamos cuántas horas asignar a cada clínica
    const horasPorClinica = Math.floor(horasSemanalesTotal / clinicaIds.length);
    
    // Para cada clínica, ajustamos su horario
    clinicaIds.forEach((clinicaId, index) => {
      // Obtenemos el horario actual de esta clínica
      const diasHorario = horariosActuales.get(clinicaId) || [];
      
      // Obtenemos el horario de la clínica (datos mock)
      const horarioClinica = HORARIOS_CLINICA_MOCK[clinicaId] || 
                            HORARIOS_CLINICA_MOCK["1"] || 
                            { 
                              horarioGeneral: { apertura: "09:00", cierre: "20:00" },
                              excepciones: []
                            };
      
      // Calculamos cuántas horas ya están asignadas
      let horasAsignadas = 0;
      diasHorario.forEach(dia => {
        if (dia.activo) {
          dia.franjas.forEach(franja => {
            // Convertimos el formato HH:MM a minutos para calcular la duración
            const inicioMinutos = parseInt(franja.inicio.split(':')[0]) * 60 + parseInt(franja.inicio.split(':')[1]);
            const finMinutos = parseInt(franja.fin.split(':')[0]) * 60 + parseInt(franja.fin.split(':')[1]);
            horasAsignadas += (finMinutos - inicioMinutos) / 60;
          });
        }
      });
      
      // Si ya tenemos suficientes horas asignadas, no hacemos nada
      if (horasAsignadas >= horasPorClinica) return;
      
      // Si faltan horas, vamos a ajustar los horarios de los días activos
      // Primero, creamos una distribución por día
      const diasLaborables = diasHorario.filter(dia => dia.activo);
      if (diasLaborables.length === 0) return; // No hay días activos
      
      // Calculamos horas por día
      const horasPorDia = horasPorClinica / diasLaborables.length;
      
      // Ajustamos cada día
      diasLaborables.forEach(diaHorario => {
        // Obtenemos las excepciones del día
        const excepcion = horarioClinica.excepciones.find(exc => 
          exc.dia.toLowerCase() === diaHorario.dia.toLowerCase()
        );
        
        // Determinamos el horario de este día
        const horaApertura = excepcion && excepcion.apertura 
          ? excepcion.apertura 
          : horarioClinica.horarioGeneral.apertura;
        
        const horaCierre = excepcion && excepcion.cierre 
          ? excepcion.cierre 
          : horarioClinica.horarioGeneral.cierre;
        
        // Convertimos a minutos
        const aperturaMinutos = parseInt(horaApertura.split(':')[0]) * 60 + parseInt(horaApertura.split(':')[1]);
        const cierreMinutos = parseInt(horaCierre.split(':')[0]) * 60 + parseInt(horaCierre.split(':')[1]);
        
        // Calculamos la duración total disponible
        const duracionDisponible = cierreMinutos - aperturaMinutos;
        
        // Convertimos horasPorDia a minutos
        const minutosPorDia = horasPorDia * 60;
        
        // Calculamos el nuevo horario
        // Si la clínica abre más de lo que necesitamos, dividimos el tiempo
        if (duracionDisponible > minutosPorDia) {
          // Aplicamos una política simple: trabajamos al inicio del día
          const nuevaHoraFinMinutos = aperturaMinutos + minutosPorDia;
          
          // Convertimos a formato HH:MM
          const nuevaHoraFinHoras = Math.floor(nuevaHoraFinMinutos / 60);
          const nuevaHoraFinMinutosRestantes = nuevaHoraFinMinutos % 60;
          const nuevaHoraFin = `${nuevaHoraFinHoras.toString().padStart(2, '0')}:${nuevaHoraFinMinutosRestantes.toString().padStart(2, '0')}`;
          
          // Actualizamos la franja
          diaHorario.franjas = [{
            id: `franja_${diaHorario.dia}_${Date.now()}_${Math.random()}`,
            inicio: horaApertura,
            fin: nuevaHoraFin
          }];
        } else {
          // Si necesitamos todo el tiempo disponible de la clínica
          diaHorario.franjas = [{
            id: `franja_${diaHorario.dia}_${Date.now()}_${Math.random()}`,
            inicio: horaApertura,
            fin: horaCierre
          }];
        }
      });
      
      // Actualizamos el horario de esta clínica
      horariosActuales.set(clinicaId, diasHorario);
    });
    
    // Actualizamos el estado con los nuevos horarios
    setHorarioSemanal(horariosActuales);
  };
  
  // Función para verificar si una franja horaria está dentro del horario de la clínica
  const esFranjaValida = (clinicaId: string, inicio: string, fin: string, dia: string): boolean => {
    // Validaciones básicas
    if (!inicio || !fin || inicio >= fin) return false;
    
    // Usar nuestra implementación local en lugar del contexto
    return isWithinClinicHours(clinicaId, dia, inicio, fin);
  };
  
  // Función para añadir franja horaria
  const handleAddFranja = (clinicaId: string, dia: string, inicio: string, fin: string) => {
    // Obtener el horario específico del día
    const horarioClinica = HORARIOS_CLINICA_MOCK[clinicaId] || 
                          HORARIOS_CLINICA_MOCK["1"];
    
    // Buscar si hay excepción para este día
    const excepcion = horarioClinica.excepciones.find(exc => 
      exc.dia.toLowerCase() === dia.toLowerCase()
    );
    
    // Determinar los límites horarios para este día
    const horaApertura = excepcion && excepcion.apertura ? excepcion.apertura : horarioClinica.horarioGeneral.apertura;
    const horaCierre = excepcion && excepcion.cierre ? excepcion.cierre : horarioClinica.horarioGeneral.cierre;
    
    // Ajustar las horas para que estén dentro del rango permitido
    let inicioAjustado = inicio;
    let finAjustado = fin;
    
    // Si la hora de inicio es anterior a la apertura, ajustarla silenciosamente
    if (inicioAjustado < horaApertura) {
      inicioAjustado = horaApertura;
    }
    
    // Si la hora de fin es posterior al cierre, ajustarla silenciosamente
    if (finAjustado > horaCierre) {
      finAjustado = horaCierre;
    }
    
    // Verificar si la franja está dentro del horario permitido
    if (!esFranjaValida(clinicaId, inicioAjustado, finAjustado, dia)) {
      // En teoría esto no debería ocurrir gracias a los ajustes, pero lo mantenemos por seguridad
      return;
    }
    
    // Validar que no haya superposición con franjas existentes sin mostrar toast
    const hayOverlap = hayFranjasSuperpuestas(clinicaId, dia, inicioAjustado, finAjustado);
    
    setHorarioSemanal(prevHorario => {
      const newHorario = new Map(prevHorario);
      const diasClinica = newHorario.get(clinicaId) || [];
      
      const diaIndex = diasClinica.findIndex(d => d.dia === dia);
      if (diaIndex >= 0) {
        const updatedDias = [...diasClinica];
        updatedDias[diaIndex] = {
          ...updatedDias[diaIndex],
          franjas: [
            ...updatedDias[diaIndex].franjas,
            {
              id: `franja_${Date.now()}`,
              inicio: inicioAjustado,
              fin: finAjustado
            }
          ]
        };
        
        newHorario.set(clinicaId, updatedDias);
      }
      
      return newHorario;
    });
  };
  
  // Función para eliminar franja horaria
  const handleRemoveFranja = (clinicaId: string, dia: string, franjaId: string) => {
    setHorarioSemanal(prevHorario => {
      const newHorario = new Map(prevHorario);
      const diasClinica = newHorario.get(clinicaId) || [];
      
      const diaIndex = diasClinica.findIndex(d => d.dia === dia);
      if (diaIndex >= 0) {
        const updatedDias = [...diasClinica];
        updatedDias[diaIndex] = {
          ...updatedDias[diaIndex],
          franjas: updatedDias[diaIndex].franjas.filter(f => f.id !== franjaId)
        };
        
        newHorario.set(clinicaId, updatedDias);
      }
      
      return newHorario;
    });
  };
  
  // Traducción de días de la semana
  const traducirDia = (dia: string): string => {
    const traducciones: Record<string, string> = {
      'lunes': 'Lunes',
      'martes': 'Martes',
      'miercoles': 'Miércoles',
      'jueves': 'Jueves',
      'viernes': 'Viernes', 
      'sabado': 'Sábado',
      'domingo': 'Domingo'
    };
    
    return traducciones[dia] || dia;
  };
  
  // Función para verificar si una franja horaria se superpone con otras existentes
  const hayFranjasSuperpuestas = (
    clinicaId: string, 
    dia: string, 
    inicio: string, 
    fin: string, 
    franjaIdActual?: string
  ): boolean => {
    const diasHorario = horarioSemanal.get(clinicaId) || [];
    const diaHorario = diasHorario.find(d => d.dia === dia);
    
    if (!diaHorario) return false;
    
    return diaHorario.franjas.some(franja => {
      // Si estamos editando una franja existente, ignorarla en la validación
      if (franjaIdActual && franja.id === franjaIdActual) return false;
      
      // Verificar si hay superposición
      return (
        (inicio >= franja.inicio && inicio < franja.fin) || // El inicio está dentro de otra franja
        (fin > franja.inicio && fin <= franja.fin) || // El fin está dentro de otra franja
        (inicio <= franja.inicio && fin >= franja.fin) // La nueva franja contiene completamente a otra
      );
    });
  };
  
  // Función para calcular las horas totales por clínica y por día
  const calcularHorasTotales = (horarioSemanal: Map<string, HorarioDia[]>) => {
    const totalPorClinica: Record<string, { 
      totalMinutos: number, 
      porDia: Record<string, number>,
      diasActivos: number
    }> = {};
    
    let totalGlobal = 0;
    
    // Recorrer cada clínica
    horarioSemanal.forEach((diasHorario, clinicaId) => {
      let totalMinutosClinica = 0;
      const porDia: Record<string, number> = {};
      let diasActivosCount = 0;
      
      // Recorrer cada día
      diasHorario.forEach(dia => {
        if (!dia.activo) return;
        diasActivosCount++;
        
        let totalMinutosDia = 0;
        
        // Sumar duración de cada franja
        dia.franjas.forEach(franja => {
          const inicioMinutos = convertirHoraAMinutos(franja.inicio);
          const finMinutos = convertirHoraAMinutos(franja.fin);
          
          if (finMinutos > inicioMinutos) {
            totalMinutosDia += (finMinutos - inicioMinutos);
          }
        });
        
        porDia[dia.dia] = totalMinutosDia;
        totalMinutosClinica += totalMinutosDia;
      });
      
      totalPorClinica[clinicaId] = { 
        totalMinutos: totalMinutosClinica, 
        porDia,
        diasActivos: diasActivosCount
      };
      
      totalGlobal += totalMinutosClinica;
    });
    
    return { totalPorClinica, totalGlobal };
  };
  
  // Convierte un string de hora (HH:MM) a minutos
  const convertirHoraAMinutos = (hora: string): number => {
    if (!hora) return 0;
    const [horas, minutos] = hora.split(':').map(Number);
    return (horas * 60) + minutos;
  };
  
  // Convierte minutos a formato de hora legible
  const minutosAHoraLegible = (minutos: number): string => {
    const horas = Math.floor(minutos / 60);
    const minutosRestantes = minutos % 60;
    
    if (minutosRestantes === 0) {
      return `${horas}h`;
    }
    
    return `${horas}h ${minutosRestantes}min`;
  };
  
  if (loading) {
    return (
      <div className="container p-6 mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Cargando información del usuario...</h1>
        </div>
      </div>
    )
  }
  
  return (
    <div className="container max-w-5xl p-6 mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Editar usuario</h1>
      </div>
      
      <Tabs 
        defaultValue="datos-personales" 
        className="w-full" 
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="mb-4">
          <TabsTrigger value="datos-personales">Datos personales</TabsTrigger>
          <TabsTrigger value="permisos">Permisos</TabsTrigger>
          <TabsTrigger value="horario">Horario</TabsTrigger>
          <TabsTrigger value="habilidades">Habilidades profesionales</TabsTrigger>
          <TabsTrigger value="condiciones">Condiciones laborales</TabsTrigger>
          <TabsTrigger value="fichajes">Control de Presencia</TabsTrigger>
        </TabsList>
        
        {/* Pestaña de Datos Personales */}
        <TabsContent value="datos-personales" className="space-y-4">
          <Card className="p-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="nombre" className="text-sm font-medium">Nombre</Label>
                  <Input 
                    id="nombre" 
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="h-9"
                  />
                </div>
                
                <div>
                  <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
                  <Input 
                    id="email" 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-9"
                  />
                </div>
                
                <div>
                  <Label htmlFor="confirmEmail" className="text-sm font-medium">Confirma e-mail</Label>
                  <Input 
                    id="confirmEmail" 
                    type="email"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    className="h-9"
                  />
                </div>
                
                <div className="flex gap-4">
                  <div className="w-1/3">
                    <Label htmlFor="prefijo" className="text-sm font-medium">Prefijo</Label>
                    <MemoizedSelect 
                      value={prefijo} 
                      onChange={setPrefijo} 
                      placeholder="Seleccione una opción"
                    >
                      <SelectItem value="ES">ES (+34)</SelectItem>
                      <SelectItem value="MA">MA (+212)</SelectItem>
                    </MemoizedSelect>
                  </div>
                  
                  <div className="w-2/3">
                    <Label htmlFor="telefono" className="text-sm font-medium">Teléfono</Label>
                    <Input 
                      id="telefono" 
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
                
                {/* Campos adicionales para datos personales */}
                <div>
                  <Label htmlFor="dni" className="text-sm font-medium">DNI</Label>
                  <Input 
                    id="dni" 
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    className="h-9"
                  />
                </div>
                
                <div>
                  <Label htmlFor="fechaNacimiento" className="text-sm font-medium">Fecha nacimiento</Label>
                  <Input 
                    id="fechaNacimiento" 
                    type="date" 
                    placeholder="dd/mm/yyyy"
                    value={fechaNacimiento}
                    onChange={(e) => setFechaNacimiento(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="sexo" className="text-sm font-medium">Sexo</Label>
                  <MemoizedSelect 
                    value={sexo} 
                    onChange={setSexo} 
                    placeholder="Seleccione una opción"
                  >
                    <SelectItem value="mujer">Mujer</SelectItem>
                    <SelectItem value="hombre">Hombre</SelectItem>
                  </MemoizedSelect>
                </div>
                
                <div>
                  <Label htmlFor="perfil" className="text-sm font-medium">Perfil</Label>
                  <MemoizedSelect 
                    value={perfil} 
                    onChange={setPerfil} 
                    placeholder="Seleccione una opción"
                  >
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
                  </MemoizedSelect>
                </div>
                
                <div>
                  <Label htmlFor="telefono2" className="text-sm font-medium">Teléfono 2</Label>
                  <Input 
                    id="telefono2"
                    value={telefono2}
                    onChange={(e) => setTelefono2(e.target.value)}
                    className="h-9"
                  />
                </div>
                
                <div>
                  <Label htmlFor="login" className="text-sm font-medium">Login</Label>
                  <Input id="login" value={email} disabled className="h-9" />
                </div>
                
                <div>
                  <Label htmlFor="contrasena" className="text-sm font-medium">Contraseña</Label>
                  <Input 
                    id="contrasena" 
                    type="password"
                    value={contrasena}
                    onChange={(e) => setContrasena(e.target.value)}
                    className="h-9"
                  />
                </div>
                
                <div>
                  <Label htmlFor="idioma" className="text-sm font-medium">Idioma</Label>
                  <Select value={idioma} onValueChange={setIdioma}>
                    <SelectTrigger id="idioma" className="h-9">
                      <SelectValue placeholder="Seleccione una opción" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="fr">Francés</SelectItem>
                      <SelectItem value="en">Inglés</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center pt-4 space-x-2">
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
            
            {/* Sección de Datos del colegiado */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1 bg-purple-100 rounded">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-700">
                    <path d="M15 7v1a3 3 0 0 1-3 3h0a3 3 0 0 1-3-3V7m3-3h0a9 9 0 0 1 9 9v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 9-9h0Z" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold text-gray-700">Datos del colegiado</h2>
              </div>
              
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="colegio" className="text-sm font-medium">Colegio</Label>
                  <Input 
                    id="colegio"
                    value={colegio}
                    onChange={(e) => setColegio(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label htmlFor="numeroColegiado" className="text-sm font-medium">Número de colegiado</Label>
                  <Input 
                    id="numeroColegiado"
                    value={numeroColegiado}
                    onChange={(e) => setNumeroColegiado(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4 mt-3 md:grid-cols-2">
                <div>
                  <Input 
                    placeholder="Especialidad"
                    value={especialidad}
                    onChange={(e) => setEspecialidad(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Input 
                    placeholder="Universidad"
                    value={universidad}
                    onChange={(e) => setUniversidad(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            </div>
            
            {/* Sección de Dirección */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1 bg-purple-100 rounded">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-700">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold text-gray-700">Dirección</h2>
              </div>
              
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="direccion" className="text-sm font-medium">Dirección</Label>
                  <Input 
                    id="direccion"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label htmlFor="provincia" className="text-sm font-medium">Provincia</Label>
                  <Input 
                    id="provincia"
                    value={provincia}
                    onChange={(e) => setProvincia(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label htmlFor="pais" className="text-sm font-medium">País</Label>
                  <Input 
                    id="pais" 
                    placeholder="(Usa uno)"
                    value={pais}
                    onChange={(e) => setPais(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label htmlFor="localidad" className="text-sm font-medium">Localidad</Label>
                  <Input 
                    id="localidad"
                    value={localidad}
                    onChange={(e) => setLocalidad(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label htmlFor="cp" className="text-sm font-medium">CP</Label>
                  <Input 
                    id="cp"
                    value={cp}
                    onChange={(e) => setCp(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            </div>
            
            {/* Sección de Configuración */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1 bg-purple-100 rounded">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-700">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold text-gray-700">Configuración</h2>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="exportCsv" className="text-sm font-medium">Export CSV</Label>
                  <Select value={exportCsv} onValueChange={setExportCsv}>
                    <SelectTrigger id="exportCsv" className="h-9">
                      <SelectValue placeholder="Seleccione una opción" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=":">:</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="indiceControl" className="text-sm font-medium">Índice control de presencia</Label>
                  <Select value={indiceControl} onValueChange={setIndiceControl}>
                    <SelectTrigger id="indiceControl" className="h-9">
                      <SelectValue placeholder="Seleccione una opción" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="000001-Markeiser-Catherine">000001-Markeiser-Catherine</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="numeroPIN" className="text-sm font-medium">Número de identificación personal (PIN)</Label>
                  <Input 
                    id="numeroPIN"
                    value={numeroPIN}
                    onChange={(e) => setNumeroPIN(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label htmlFor="notas" className="text-sm font-medium">Notas</Label>
                  <textarea 
                    id="notas"
                    className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="mostrarDesplazados" 
                      checked={mostrarDesplazados}
                      onCheckedChange={(checked) => setMostrarDesplazados(checked === true)}
                    />
                    <Label htmlFor="mostrarDesplazados" className="text-sm">No mostrar en desplazados</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="mostrarCitasPropias"
                      checked={mostrarCitasPropias}
                      onCheckedChange={(checked) => setMostrarCitasPropias(checked === true)}
                    />
                    <Label htmlFor="mostrarCitasPropias" className="text-sm">Mostrar únicamente las citas propias</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="restringirIP"
                      checked={restringirIP}
                      onCheckedChange={(checked) => setRestringirIP(checked === true)}
                    />
                    <Label htmlFor="restringirIP" className="text-sm">Restringir IP</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="deshabilitado" 
                      checked={deshabilitado}
                      onCheckedChange={(checked) => setDeshabilitado(checked === true)}
                    />
                    <Label htmlFor="deshabilitado" className="text-sm">Deshabilitado</Label>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
        
        {/* Pestaña de Permisos */}
        <TabsContent value="permisos" className="space-y-4">
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-base font-medium">Acceso a clínicas</h3>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="clinica" className="text-sm font-medium">Clínica</Label>
                  <MemoizedSelect
                    value={nuevaClinicaId}
                    onChange={setNuevaClinicaId}
                    placeholder="Seleccione una clínica"
                  >
                    {clinicasToShow.map((clinic) => (
                      <SelectItem key={clinic.id} value={String(clinic.id)}>
                        {clinic.prefix} - {clinic.name}
                        {!clinic.isActive && <span className="ml-2 text-xs text-red-500">(inactiva)</span>}
                      </SelectItem>
                    ))}
                  </MemoizedSelect>
                </div>
                <div>
                  <Label htmlFor="perfilUsuario" className="text-sm font-medium">Perfil de usuario en esta clínica</Label>
                  <MemoizedSelect 
                    value={nuevoPerfilClinica} 
                    onChange={setNuevoPerfilClinica}
                    disabled={!nuevaClinicaId}
                    placeholder={!nuevaClinicaId ? "Seleccione primero una clínica" : "Seleccione un perfil"}
                  >
                    {!nuevaClinicaId ? (
                      <SelectItem value="no_selection" disabled>Seleccione primero una clínica</SelectItem>
                    ) : (
                      // Lista de perfiles disponibles, filtrando los ya asignados a esta clínica
                      PERFILES_DISPONIBLES
                        .filter(perfil => {
                          // Si la clínica ya tiene perfiles asignados, filtrar los existentes
                          const perfilesExistentes = permisosClinicas.get(nuevaClinicaId) || [];
                          return !perfilesExistentes.includes(perfil);
                        })
                        .map(perfil => (
                          <SelectItem key={perfil} value={perfil}>{perfil}</SelectItem>
                        ))
                    )}
                  </MemoizedSelect>
                </div>
              </div>
              
              <div className="flex items-center mt-3 space-x-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="showDisabledClinicsPermisos" 
                    checked={showDisabledClinics} 
                    onCheckedChange={(checked) => setShowDisabledClinics(checked === true)}
                  />
                  <Label htmlFor="showDisabledClinicsPermisos" className="text-sm">Ver clínicas desactivadas</Label>
                </div>
                
                <Button 
                  className="px-5 ml-auto bg-purple-600 hover:bg-purple-700"
                  onClick={() => {
                    if (nuevaClinicaId && nuevoPerfilClinica) {
                      handleAddClinica(nuevaClinicaId, nuevoPerfilClinica);
                      // No reseteamos la clínica seleccionada para facilitar añadir múltiples perfiles
                      setNuevoPerfilClinica("");
                    }
                  }}
                  disabled={!nuevaClinicaId || !nuevoPerfilClinica}
                >
                  Añadir
                </Button>
              </div>
              
              <div className="mt-6">
                <h4 className="mb-3 text-sm font-medium">Listado de permisos de acceso sobre clínicas: {nombre}</h4>
                
                <div className="relative mb-4">
                  <Search className="absolute w-4 h-4 text-gray-500 -translate-y-1/2 left-3 top-1/2" />
                  <Input
                    placeholder="Buscador"
                    className="pl-10 h-9"
                    value={searchPermisos}
                    onChange={(e) => setSearchPermisos(e.target.value)}
                  />
                </div>
                
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="py-2 h-9">Prefijo</TableHead>
                        <TableHead className="py-2 h-9">Nombre</TableHead>
                        <TableHead className="py-2 h-9">Ciudad</TableHead>
                        <TableHead className="py-2 h-9">Perfiles</TableHead>
                        <TableHead className="w-[100px] text-center h-9 py-2">Estado</TableHead>
                        <TableHead className="w-[100px] text-right h-9 py-2">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedClinicas.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-4 text-center text-gray-500">
                            No hay permisos de acceso asignados
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedClinicas
                          .filter(clinicaId => {
                            if (!searchPermisos) return true;
                            const clinica = clinics.find(c => String(c.id) === clinicaId);
                            if (!clinica) return false;
                            return (
                              clinica.prefix.toLowerCase().includes(searchPermisos.toLowerCase()) ||
                              clinica.name.toLowerCase().includes(searchPermisos.toLowerCase()) ||
                              (clinica.city && clinica.city.toLowerCase().includes(searchPermisos.toLowerCase()))
                            );
                          })
                          .map((clinicaId) => {
                            const clinica = clinics.find(c => String(c.id) === clinicaId);
                            if (!clinica) return null;
                            
                            const perfiles = permisosClinicas.get(clinicaId) || [];
                            
                            return (
                              <TableRow key={clinicaId}>
                                <TableCell>{clinica.prefix}</TableCell>
                                <TableCell>{clinica.name}</TableCell>
                                <TableCell>{clinica.city || '-'}</TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {perfiles.map(perfil => (
                                      <Badge 
                                        key={`${clinicaId}-${perfil}`} 
                                        variant="outline"
                                        className="flex items-center gap-1 bg-purple-50"
                                      >
                                        {perfil}
                                        {perfiles.length > 1 && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-4 h-4 p-0 ml-1 text-gray-500 rounded-full hover:text-red-500 hover:bg-transparent"
                                            onClick={() => handleRemoveClinica(clinicaId, perfil)}
                                          >
                                            ×
                                          </Button>
                                        )}
                                      </Badge>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className={`px-2 py-1 text-xs rounded-full ${clinica.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {clinica.isActive ? 'Activo' : 'Inactivo'}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="w-8 h-8 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                                      onClick={() => handleRemoveClinica(clinicaId)}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                      </svg>
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
        
        {/* Pestaña de Horario */}
        <TabsContent value="horario" className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-medium">Horario</h3>
            </div>
            
            <div className="space-y-5">
              <div className="p-3 mb-4 rounded-md bg-purple-50">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1 bg-purple-100 rounded">
                    <Clock className="w-4 h-4 text-purple-700" />
                  </div>
                  <p className="text-sm font-medium text-purple-700">
                    Configure el horario de trabajo de este profesional para cada clínica
                  </p>
                </div>
                <div className="space-y-2 text-sm text-gray-600 ml-7">
                  <p>
                    El horario debe respetar los horarios de apertura y cierre de cada clínica.
                  </p>
                  <p>
                    <span className="font-medium">Asignación automática:</span> Al asignar una clínica, se crea automáticamente una franja horaria para cada día que abarca todo el horario de la clínica.
                  </p>
                  {selectedClinicas.length > 1 && (
                    <p>
                      <span className="font-medium">Múltiples clínicas:</span> Se puede distribuir la jornada laboral entre varias clínicas pulsando el botón "Distribuir horario proporcionalmente".
                    </p>
                  )}
                  <p>
                    <span className="text-amber-600">Nota:</span> Las franjas en rojo indican que están fuera del horario permitido y serán ajustadas automáticamente al guardar.
                  </p>
                </div>
              </div>
              
              {selectedClinicas.length > 1 && (
                <div className="mb-4">
                  <Button 
                    onClick={() => distribuirHorariosMultiplesClinicas(selectedClinicas)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Distribuir horario proporcionalmente
                  </Button>
                  <p className="mt-2 text-xs text-gray-500">
                    Esta acción ajustará automáticamente los horarios para distribuir la carga de trabajo entre todas las clínicas asignadas.
                  </p>
                </div>
              )}
              
              <div>
                <Label htmlFor="clinicaHorario" className="text-sm font-medium">Clínica</Label>
                <SelectClinica 
                  value={selectedClinicaHorario} 
                  onChange={setSelectedClinicaHorario}
                  disabled={selectedClinicas.length === 0}
                  options={opcionesClinicasHorario}
                  placeholder="Seleccione una clínica"
                />
                
                {selectedClinicas.length === 0 && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-amber-600">
                    <AlertCircle className="w-4 h-4" />
                    <span>Debe asignar primero al menos una clínica en la pestaña de "Permisos"</span>
                  </div>
                )}
              </div>
              
              {selectedClinicaHorario && (
                <div className="mt-4">
                  {/* Resumen de horas configuradas */}
                  <div className="p-4 mb-5 bg-white border rounded-lg shadow-sm">
                    <h4 className="mb-3 text-sm font-medium">Resumen de horas configuradas</h4>
                    
                    {(() => {
                      const { totalPorClinica, totalGlobal } = calcularHorasTotales(horarioSemanal);
                      const totalHorasRecomendadas = 40; // 40 horas semanales es lo estándar
                      
                      return (
                        <div className="space-y-4">
                          {/* Total global */}
                          <div className="flex flex-col">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">Total configurado:</span>
                              <span className={`text-sm font-bold ${
                                totalGlobal > (totalHorasRecomendadas * 60 * 1.1) ? 'text-red-600' : 
                                totalGlobal < (totalHorasRecomendadas * 60 * 0.9) ? 'text-amber-600' : 
                                'text-green-600'
                              }`}>
                                {minutosAHoraLegible(totalGlobal)} / {totalHorasRecomendadas}h
                              </span>
                            </div>
                            <div className="w-full h-3 overflow-hidden bg-gray-200 rounded-full">
                              <div 
                                className={`h-full ${
                                  totalGlobal > (totalHorasRecomendadas * 60 * 1.1) ? 'bg-red-500' : 
                                  totalGlobal < (totalHorasRecomendadas * 60 * 0.9) ? 'bg-amber-500' : 
                                  'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(100, (totalGlobal / (totalHorasRecomendadas * 60)) * 100)}%` }}
                              ></div>
                            </div>
                          </div>
                          
                          <hr />
                          
                          {/* Por clínica */}
                          <div className="space-y-3">
                            {Object.entries(totalPorClinica).map(([clinicaId, datos]) => {
                              const clinica = clinics.find(c => String(c.id) === clinicaId);
                              const porcentajeDeTotalRecomendado = (datos.totalMinutos / (totalHorasRecomendadas * 60)) * 100;
                              
                              return (
                                <div key={clinicaId} className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">
                                      {clinica ? `${clinica.prefix} - ${clinica.name}` : clinicaId}
                                      <span className="ml-2 text-xs text-gray-500">({datos.diasActivos} días activos)</span>
                                    </span>
                                    <span className="text-sm font-medium">{minutosAHoraLegible(datos.totalMinutos)}</span>
                                  </div>
                                  <div className="flex items-center">
                                    {/* Barras por día */}
                                    <div className="grid flex-grow h-5 grid-cols-7 gap-1">
                                      {['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].map(dia => {
                                        const minutosDelDia = datos.porDia[dia] || 0;
                                        const porcentaje = minutosDelDia > 0 
                                          ? Math.max(5, (minutosDelDia / (12 * 60)) * 100) // Max 12h por día para calcular porcentaje
                                          : 0;
                                        
                                        return (
                                          <div key={`${clinicaId}-${dia}`} className="relative h-full">
                                            <div
                                              className={`absolute bottom-0 w-full rounded-sm ${
                                                minutosDelDia > 0 ? 'bg-purple-500' : 'bg-gray-200'
                                              }`}
                                              style={{ height: `${porcentaje}%` }}
                                            ></div>
                                            <div className="absolute bottom-0 w-full text-center text-[9px] font-medium text-gray-600">
                                              {minutosDelDia > 0 ? (minutosDelDia / 60).toFixed(1) : '-'}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                    
                                    {/* Porcentaje del total */}
                                    <div className="w-12 ml-3 text-xs font-medium text-right">
                                      {porcentajeDeTotalRecomendado.toFixed(0)}%
                                    </div>
                                  </div>
                                  <div className="flex text-[9px] text-gray-500 justify-between px-1">
                                    <span>L</span>
                                    <span>M</span>
                                    <span>X</span>
                                    <span>J</span>
                                    <span>V</span>
                                    <span>S</span>
                                    <span>D</span>
                                  </div>
                                </div>
                              );
                            })}
                            
                            {selectedClinicas.length > 1 && (
                              <div className="pt-2 mt-2 border-t">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="w-full text-xs h-7"
                                  onClick={() => distribuirHorariosMultiplesClinicas(selectedClinicas)}
                                >
                                  <PlusCircle className="w-3 h-3 mr-1" />
                                  Equilibrar carga entre clínicas
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  
                  <Tabs 
                    value={horarioSubTab} 
                    onValueChange={(value: any) => setHorarioSubTab(value)}
                    className="w-full"
                  >
                    <TabsList className="grid grid-cols-3 mb-4">
                      <TabsTrigger value="semanal" className="text-sm">
                        <Calendar className="w-4 h-4 mr-2" />
                        Horario semanal
                      </TabsTrigger>
                      <TabsTrigger value="excepciones" className="text-sm">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Excepciones
                      </TabsTrigger>
                      <TabsTrigger value="vista" className="text-sm">
                        <Eye className="w-4 h-4 mr-2" />
                        Vista general
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="semanal" className="space-y-4">
                      <div className="p-3 mb-4 text-sm border border-blue-100 rounded-md bg-blue-50">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-blue-100 rounded">
                            <Clock className="w-4 h-4 text-blue-700" />
                          </div>
                          <p className="font-medium text-blue-700">
                            Horario de la clínica seleccionada
                          </p>
                        </div>
                        <div className="mt-1 ml-7">
                          {(() => {
                            // Obtener el horario de la clínica seleccionada o usar uno por defecto
                            const horarioClinica = HORARIOS_CLINICA_MOCK[selectedClinicaHorario] || 
                                                  HORARIOS_CLINICA_MOCK["1"] || 
                                                  { 
                                                    horarioGeneral: { apertura: "09:00", cierre: "20:00" },
                                                    excepciones: []
                                                  };
                            
                            return (
                              <>
                                <p className="text-gray-600">
                                  <span className="font-medium">Apertura general:</span> {horarioClinica.horarioGeneral.apertura} - {horarioClinica.horarioGeneral.cierre}
                                </p>
                                
                                {horarioClinica.excepciones.map((exc, index) => (
                                  <p key={`exc-${index}`} className="text-gray-600">
                                    <span className="font-medium">{traducirDia(exc.dia)}:</span> {exc.apertura ? `${exc.apertura} - ${exc.cierre}` : "Cerrado"}
                                  </p>
                                ))}
                              </>
                            );
                          })()}
                          <p className="mt-1 text-xs italic text-gray-500">
                            Las franjas horarias del usuario deben estar dentro del horario de apertura de la clínica.
                          </p>
                        </div>
                      </div>
                      
                      <div className="overflow-hidden border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="w-[100px] h-9 py-2">Día</TableHead>
                              <TableHead className="py-2 h-9">Franjas horarias</TableHead>
                              <TableHead className="py-2 h-9">Estado</TableHead>
                              <TableHead className="w-[100px] text-right h-9 py-2">Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {horarioSemanal.get(selectedClinicaHorario)?.map((dia) => {
                              // Comprobar si la clínica está cerrada este día
                              const horarioClinica = HORARIOS_CLINICA_MOCK[selectedClinicaHorario] || 
                                                     HORARIOS_CLINICA_MOCK["1"];
                              
                              // Buscar si hay excepción para este día
                              const excepcion = horarioClinica.excepciones.find(exc => 
                                exc.dia.toLowerCase() === dia.dia.toLowerCase()
                              );
                              
                              // Comprobar si la clínica está cerrada este día
                              const clinicaCerrada = excepcion && (!excepcion.apertura || !excepcion.cierre);
                              
                              return (
                                <TableRow key={dia.dia}>
                                  <TableCell className="font-medium">{traducirDia(dia.dia)}</TableCell>
                                  <TableCell>
                                    {clinicaCerrada ? (
                                      <div className="flex items-center text-sm text-red-600">
                                        <AlertCircle className="w-4 h-4 mr-1" />
                                        Clínica cerrada este día
                                      </div>
                                    ) : (
                                      <div className="flex flex-wrap gap-2">
                                        {dia.franjas.length === 0 ? (
                                          <span className="text-sm italic text-gray-500">Sin horario definido</span>
                                        ) : (
                                          dia.franjas.map((franja) => (
                                            <Badge 
                                              key={franja.id} 
                                              variant="outline"
                                              className={`flex items-center gap-1 cursor-pointer hover:bg-blue-100 
                                                ${esFranjaValida(selectedClinicaHorario, franja.inicio, franja.fin, dia.dia) 
                                                  ? "bg-blue-50 text-blue-700 border-blue-200" 
                                                  : "bg-red-50 text-red-700 border-red-200"
                                                }`}
                                              onClick={() => {
                                                // Obtener el horario específico del día
                                                const horarioClinica = HORARIOS_CLINICA_MOCK[selectedClinicaHorario] || 
                                                                      HORARIOS_CLINICA_MOCK["1"];
                                                
                                                // Buscar si hay excepción para este día
                                                const excepcion = horarioClinica.excepciones.find(exc => 
                                                  exc.dia.toLowerCase() === dia.dia.toLowerCase()
                                                );
                                                
                                                // Determinar los límites horarios para este día
                                                const horaApertura = excepcion && excepcion.apertura ? excepcion.apertura : horarioClinica.horarioGeneral.apertura;
                                                const horaCierre = excepcion && excepcion.cierre ? excepcion.cierre : horarioClinica.horarioGeneral.cierre;
                                                
                                                // Ajustar las horas para que estén dentro del rango permitido
                                                let inicioAjustado = franja.inicio;
                                                let finAjustado = franja.fin;
                                                
                                                // Si la hora de inicio es anterior a la apertura, ajustarla silenciosamente
                                                if (inicioAjustado < horaApertura) {
                                                  inicioAjustado = horaApertura;
                                                }
                                                
                                                // Si la hora de fin es posterior al cierre, ajustarla silenciosamente
                                                if (finAjustado > horaCierre) {
                                                  finAjustado = horaCierre;
                                                }
                                                
                                                // Configurar los datos para editar esta franja con valores ajustados
                                                setEditingFranja({
                                                  diaId: dia.dia,
                                                  franjaId: franja.id,
                                                  inicio: inicioAjustado,
                                                  fin: finAjustado
                                                });
                                                
                                                setShowHorarioModal(true);
                                              }}
                                            >
                                              {esFranjaValida(selectedClinicaHorario, franja.inicio, franja.fin, dia.dia)
                                                ? <Clock className="w-3 h-3 mr-1" />
                                                : <AlertCircle className="w-3 h-3 mr-1" />
                                              }
                                              {franja.inicio} - {franja.fin}
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="w-4 h-4 p-0 ml-1 text-gray-500 rounded-full hover:text-red-500 hover:bg-transparent"
                                                onClick={(e) => {
                                                  e.stopPropagation(); // Evitar que se abra el diálogo de edición
                                                  handleRemoveFranja(selectedClinicaHorario, dia.dia, franja.id);
                                                }}
                                              >
                                                ×
                                              </Button>
                                            </Badge>
                                          ))
                                        )}
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          className="h-6 text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200"
                                          onClick={() => {
                                            // Determinar los valores por defecto según el horario del día específico
                                            const horaInicioPorDefecto = excepcion && excepcion.apertura ? excepcion.apertura : horarioClinica.horarioGeneral.apertura;
                                            const horaFinPorDefecto = excepcion && excepcion.cierre ? excepcion.cierre : horarioClinica.horarioGeneral.cierre;
                                            
                                            // Configurar datos para añadir una nueva franja con valores apropiados
                                            setEditingFranja({
                                              diaId: dia.dia,
                                              inicio: horaInicioPorDefecto,
                                              fin: horaFinPorDefecto
                                            });
                                            setShowHorarioModal(true);
                                          }}
                                        >
                                          <Plus className="w-3 h-3 mr-1" />
                                          Añadir
                                        </Button>
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <div className="flex justify-center">
                                      <Switch 
                                        checked={dia.activo} 
                                        onCheckedChange={(checked) => {
                                          // Si la clínica está cerrada, mostrar un mensaje y no permitir activar
                                          if (checked && clinicaCerrada) {
                                            toast({
                                              title: "Clínica cerrada",
                                              description: `La clínica está cerrada los ${traducirDia(dia.dia).toLowerCase()}.`,
                                              variant: "destructive",
                                            });
                                            return;
                                          }
                                          
                                          setHorarioSemanal(prev => {
                                            const newHorario = new Map(prev);
                                            const diasClinica = [...(newHorario.get(selectedClinicaHorario) || [])];
                                            const diaIndex = diasClinica.findIndex(d => d.dia === dia.dia);
                                            
                                            if (diaIndex >= 0) {
                                              diasClinica[diaIndex] = {
                                                ...diasClinica[diaIndex],
                                                activo: checked
                                              };
                                              newHorario.set(selectedClinicaHorario, diasClinica);
                                            }
                                            
                                            return newHorario;
                                          });
                                        }}
                                        disabled={clinicaCerrada && dia.activo === false}
                                      />
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button 
                                          variant="ghost"
                                          size="icon"
                                          className="w-8 h-8 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                                        >
                                          <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                          onClick={() => {
                                            // Copiar horario para todos los días laborables
                                            setHorarioSemanal(prev => {
                                              const newHorario = new Map(prev);
                                              const diasClinica = [...(newHorario.get(selectedClinicaHorario) || [])];
                                              const diaActual = diasClinica.find(d => d.dia === dia.dia);
                                              
                                              if (diaActual) {
                                                const diasLaborables = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
                                                diasLaborables.forEach(diaLaboral => {
                                                  if (diaLaboral !== dia.dia) {
                                                    const indexDia = diasClinica.findIndex(d => d.dia === diaLaboral);
                                                    if (indexDia >= 0) {
                                                      diasClinica[indexDia] = {
                                                        ...diasClinica[indexDia],
                                                        franjas: [...diaActual.franjas.map(f => ({ ...f, id: `franja_${Date.now()}_${Math.random()}` }))],
                                                        activo: diaActual.activo
                                                      };
                                                    }
                                                  }
                                                });
                                                newHorario.set(selectedClinicaHorario, diasClinica);
                                              }
                                              
                                              return newHorario;
                                            });
                                          }}
                                        >
                                          Aplicar a días laborables
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => {
                                            // Limpiar horario de este día
                                            setHorarioSemanal(prev => {
                                              const newHorario = new Map(prev);
                                              const diasClinica = [...(newHorario.get(selectedClinicaHorario) || [])];
                                              const diaIndex = diasClinica.findIndex(d => d.dia === dia.dia);
                                              
                                              if (diaIndex >= 0) {
                                                diasClinica[diaIndex] = {
                                                  ...diasClinica[diaIndex],
                                                  franjas: []
                                                };
                                                newHorario.set(selectedClinicaHorario, diasClinica);
                                              }
                                              
                                              return newHorario;
                                            });
                                          }}
                                        >
                                          Limpiar horario
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                      
                      <div className="flex justify-end mt-4">
                        <Button 
                          className="px-4 bg-purple-600 hover:bg-purple-700"
                          onClick={() => {
                            // Por ahora, sólo mostrar un mensaje de éxito
                            toast({
                              title: "Horario guardado",
                              description: "El horario semanal ha sido guardado correctamente",
                            });
                          }}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Guardar horario
                        </Button>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="excepciones" className="space-y-4">
                      <div className="p-3 mb-4 rounded-md bg-purple-50">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="p-1 bg-purple-100 rounded">
                            <AlertCircle className="w-4 h-4 text-purple-700" />
                          </div>
                          <p className="text-sm font-medium text-purple-700">
                            Configure excepciones en el horario habitual del profesional
                          </p>
                        </div>
                        <p className="text-sm text-gray-600 ml-7">
                          Las excepciones le permiten establecer horarios diferentes para períodos específicos, como vacaciones, formaciones o eventos especiales.
                        </p>
                      </div>

                      <div className="mb-4">
                        <Button 
                          variant="outline"
                          className="bg-white border-gray-300"
                          onClick={() => {
                            setEditingExcepcion(crearExcepcionPorDefecto());
                            setShowExcepcionModal(true);
                          }}
                        >
                          <PlusCircle className="w-4 h-4 mr-2" />
                          Nueva excepción de horario
                        </Button>
                      </div>
                      
                      <div className="border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="py-2 h-9">Nombre</TableHead>
                              <TableHead className="py-2 h-9">Período</TableHead>
                              <TableHead className="py-2 h-9">Días afectados</TableHead>
                              <TableHead className="w-[100px] text-right h-9 py-2">Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {excepciones.filter(e => e.clinicaId === selectedClinicaHorario).length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} className="py-4 text-center text-gray-500">
                                  No hay excepciones de horario configuradas
                                </TableCell>
                              </TableRow>
                            ) : (
                              excepciones
                                .filter(e => e.clinicaId === selectedClinicaHorario)
                                .map((excepcion) => (
                                  <TableRow key={excepcion.id}>
                                    <TableCell className="font-medium">{excepcion.nombre}</TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-gray-500" />
                                        <span>
                                          {new Date(excepcion.fechaInicio).toLocaleDateString()} - {new Date(excepcion.fechaFin).toLocaleDateString()}
                                        </span>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex flex-wrap gap-1">
                                        {excepcion.dias
                                          .filter(d => d.activo)
                                          .map((dia) => (
                                            <Badge 
                                              key={dia.dia} 
                                              variant="outline"
                                              className="bg-amber-50 text-amber-700 border-amber-200"
                                            >
                                              {traducirDia(dia.dia)}
                                              {dia.franjas.length > 0 && (
                                                <span className="ml-1 text-xs">
                                                  ({dia.franjas.length})
                                                </span>
                                              )}
                                            </Badge>
                                          ))}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-2">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="w-8 h-8 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                                          onClick={() => {
                                            // Convertir la excepción al formato del state
                                            setEditingExcepcion({
                                              id: excepcion.id,
                                              nombre: excepcion.nombre,
                                              fechaInicio: excepcion.fechaInicio,
                                              fechaFin: excepcion.fechaFin,
                                              dias: [...excepcion.dias] // Clonar para evitar modificaciones directas
                                            });
                                            setShowExcepcionModal(true);
                                          }}
                                        >
                                          <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="w-8 h-8 text-purple-600 hover:text-red-700 hover:bg-red-100"
                                          onClick={() => handleRemoveExcepcion(excepcion.id)}
                                        >
                                          <Trash className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="vista" className="space-y-4">
                      <div className="p-3 mb-4 rounded-md bg-purple-50">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="p-1 bg-purple-100 rounded">
                            <Eye className="w-4 h-4 text-purple-700" />
                          </div>
                          <p className="text-sm font-medium text-purple-700">
                            Vista general de horarios
                          </p>
                        </div>
                        <p className="text-sm text-gray-600 ml-7">
                          Visualiza el horario completo del profesional, incluyendo períodos con excepciones.
                        </p>
                      </div>
                      
                      <div className="border rounded-lg">
                        {/* Cabecera del calendario */}
                        <div className="grid grid-cols-7 font-medium text-center border-b rounded-t-lg bg-gray-50">
                          {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((dia, index) => (
                            <div key={index} className="py-3">
                              {dia}
                            </div>
                          ))}
                        </div>
                        
                        {/* Días del calendario */}
                        <div className="grid grid-cols-7 text-center">
                          {(() => {
                            // Obtener los días de la semana
                            const diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
                            
                            // Obtener los horarios de la clínica actual
                            const horariosDia = horarioSemanal.get(selectedClinicaHorario) || [];
                            
                            // Obtener las excepciones válidas actualmente
                            const fechaActual = new Date();
                            const excepcionesActivas = excepciones
                              .filter(e => 
                                e.clinicaId === selectedClinicaHorario && 
                                new Date(e.fechaInicio) <= fechaActual && 
                                new Date(e.fechaFin) >= fechaActual
                              );
                            
                            // Determinar para cada día si hay excepciones activas
                            const tieneExcepcion = (dia: string) => 
                              excepcionesActivas.some(e => 
                                e.dias.some(d => d.dia === dia && d.activo)
                              );
                            
                            return diasSemana.map(dia => {
                              const diaHorario = horariosDia.find(d => d.dia === dia);
                              const hayExcepcion = tieneExcepcion(dia);
                              const esActivo = diaHorario?.activo || false;
                              
                              // Calcular horas totales
                              let horasTotales = 0;
                              diaHorario?.franjas.forEach(franja => {
                                const inicioMinutos = convertirHoraAMinutos(franja.inicio);
                                const finMinutos = convertirHoraAMinutos(franja.fin);
                                if (finMinutos > inicioMinutos) {
                                  horasTotales += (finMinutos - inicioMinutos) / 60;
                                }
                              });
                              
                              return (
                                <div 
                                  key={dia} 
                                  className={`p-4 border-b border-r min-h-[150px] ${!esActivo ? 'bg-gray-50' : ''}`}
                                >
                                  <div className="flex justify-between">
                                    <span className={`text-sm font-medium ${!esActivo ? 'text-gray-400' : ''}`}>
                                      {traducirDia(dia)}
                                    </span>
                                    {hayExcepcion && (
                                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                        Excepción
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  {esActivo ? (
                                    <div className="mt-3 space-y-2">
                                      {diaHorario?.franjas.map((franja, idx) => (
                                        <div 
                                          key={idx} 
                                          className={`text-xs p-1.5 rounded ${
                                            esFranjaValida(selectedClinicaHorario, franja.inicio, franja.fin, dia)
                                              ? 'bg-blue-50 text-blue-700'
                                              : 'bg-red-50 text-red-700'
                                          }`}
                                        >
                                          <div className="flex items-center">
                                            <Clock className="w-3 h-3 mr-1" />
                                            {franja.inicio} - {franja.fin}
                                          </div>
                                        </div>
                                      ))}
                                      
                                      {diaHorario?.franjas.length === 0 && (
                                        <div className="mt-4 text-sm italic text-center text-gray-400">
                                          Sin franjas configuradas
                                        </div>
                                      )}
                                      
                                      {diaHorario?.franjas.length > 0 && (
                                        <div className="pt-2 mt-2 text-xs font-medium text-right border-t">
                                          {horasTotales.toFixed(1)}h
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center h-16 text-sm italic text-gray-400">
                                      Día no laborable
                                    </div>
                                  )}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                      
                      {/* Resumen semanal */}
                      <div className="mt-6">
                        <h4 className="mb-3 text-sm font-medium">Resumen semanal</h4>
                        
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          {/* Gráfico de horas por día */}
                          <div className="p-4 border rounded-lg">
                            <h5 className="mb-3 text-sm font-medium">Horas por día</h5>
                            <div className="grid items-end grid-cols-7 gap-3 h-36">
                              {(() => {
                                // Calcular horas por día
                                const diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
                                const horariosDia = horarioSemanal.get(selectedClinicaHorario) || [];
                                
                                const horasPorDia = diasSemana.map(dia => {
                                  const diaHorario = horariosDia.find(d => d.dia === dia);
                                  if (!diaHorario?.activo) return 0;
                                  
                                  let minutos = 0;
                                  diaHorario.franjas.forEach(franja => {
                                    const inicioMinutos = convertirHoraAMinutos(franja.inicio);
                                    const finMinutos = convertirHoraAMinutos(franja.fin);
                                    if (finMinutos > inicioMinutos) {
                                      minutos += (finMinutos - inicioMinutos);
                                    }
                                  });
                                  
                                  return minutos / 60; // Convertir a horas
                                });
                                
                                // Encontrar el máximo para normalizar
                                const maxHoras = Math.max(...horasPorDia, 8); // Mínimo 8h para escala
                                
                                // Renderizar barras
                                return horasPorDia.map((horas, index) => {
                                  const altura = horas > 0 ? Math.max(15, (horas / maxHoras) * 100) : 0;
                                  const diaSemana = diasSemana[index];
                                  const diaTraducido = traducirDia(diaSemana).substring(0, 1);
                                  
                                  return (
                                    <div key={index} className="flex flex-col items-center">
                                      <div className="flex items-end flex-grow w-full">
                                        <div 
                                          className={`w-full rounded-t ${
                                            horas > 0 
                                              ? horas > 8 ? 'bg-amber-400' : 'bg-green-400' 
                                              : 'bg-gray-200'
                                          }`}
                                          style={{ height: `${altura}%` }}
                                        ></div>
                                      </div>
                                      <div className="mt-2 text-xs font-medium">
                                        {diaTraducido}
                                      </div>
                                      <div className="text-[10px] text-gray-500">
                                        {horas > 0 ? horas.toFixed(1) : "-"}
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                          
                          {/* Lista de excepciones activas */}
                          <div className="p-4 border rounded-lg">
                            <h5 className="mb-3 text-sm font-medium">Excepciones activas o próximas</h5>
                            
                            <div className="space-y-3">
                              {(() => {
                                // Obtener la fecha actual
                                const fechaActual = new Date();
                                
                                // Calcular fecha límite (30 días en el futuro)
                                const fechaLimite = new Date(fechaActual);
                                fechaLimite.setDate(fechaLimite.getDate() + 30);
                                
                                // Filtrar excepciones que estén activas o próximas (30 días)
                                const excepcionesFiltradas = excepciones
                                  .filter(e => 
                                    e.clinicaId === selectedClinicaHorario && 
                                    new Date(e.fechaFin) >= fechaActual &&
                                    new Date(e.fechaInicio) <= fechaLimite
                                  )
                                  .sort((a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime());
                                
                                if (excepcionesFiltradas.length === 0) {
                                  return (
                                    <div className="py-6 text-sm italic text-center text-gray-500">
                                      No hay excepciones activas o próximas
                                    </div>
                                  );
                                }
                                
                                return excepcionesFiltradas.map(excepcion => {
                                  // Determinar si está activa o es próxima
                                  const esActiva = new Date(excepcion.fechaInicio) <= fechaActual;
                                  
                                  return (
                                    <div key={excepcion.id} className="p-3 border rounded-md">
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">{excepcion.nombre}</span>
                                        <Badge 
                                          variant="outline" 
                                          className={
                                            esActiva 
                                              ? "bg-green-50 text-green-700 border-green-200" 
                                              : "bg-blue-50 text-blue-700 border-blue-200"
                                          }
                                        >
                                          {esActiva ? "Activa" : "Próxima"}
                                        </Badge>
                                      </div>
                                      <div className="mt-1 text-xs text-gray-500">
                                        {new Date(excepcion.fechaInicio).toLocaleDateString()} - {new Date(excepcion.fechaFin).toLocaleDateString()}
                                      </div>
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {excepcion.dias
                                          .filter(d => d.activo)
                                          .map(dia => (
                                            <Badge 
                                              key={dia.dia} 
                                              variant="outline" 
                                              className="text-xs text-gray-700 border-gray-200 bg-gray-50"
                                            >
                                              {traducirDia(dia.dia).substring(0, 2)}
                                            </Badge>
                                          ))
                                        }
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
        
        {/* Pestaña de Habilidades Profesionales */}
        <TabsContent value="habilidades" className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-medium">Habilidades profesionales</h3>
            </div>
            
            <div className="space-y-4">
              <div className="p-3 mb-4 rounded-md bg-purple-50">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1 bg-purple-100 rounded">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-700">
                      <circle cx="12" cy="12" r="10" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-purple-700">
                    Asigne familias o servicios específicos que este profesional puede realizar en cada clínica
                  </p>
                </div>
                <p className="text-sm text-gray-600 ml-7">
                  Las habilidades asignadas permitirán que este profesional pueda ser seleccionado al agendar estos servicios
                </p>
              </div>
              
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="clinicaHabilidad" className="text-sm font-medium">Clínica</Label>
                  <MemoizedSelect
                    value={nuevaClinicaHabilidad}
                    onChange={setNuevaClinicaHabilidad}
                    placeholder="Seleccione una clínica"
                  >
                    {clinicasToShow.map((clinic) => (
                      <SelectItem key={clinic.id} value={String(clinic.id)}>
                        {clinic.prefix} - {clinic.name}
                      </SelectItem>
                    ))}
                  </MemoizedSelect>
                </div>
                
                <div>
                  <Label htmlFor="tipoHabilidad" className="text-sm font-medium">Asignar por</Label>
                  <SelectTipo 
                    value={tipoSeleccion} 
                    onChange={(value: any) => {
                      setTipoSeleccion(value);
                      setNuevaFamilia("");
                      setNuevoServicio("");
                    }}
                  />
                </div>
              </div>
              
              {tipoSeleccion === "familia" ? (
                <div>
                  <Label htmlFor="familia" className="text-sm font-medium">Familia de servicios</Label>
                  <Select 
                    value={nuevaFamilia} 
                    onValueChange={setNuevaFamilia}
                    disabled={!nuevaClinicaHabilidad}
                  >
                    <SelectTrigger id="familia" className="h-9">
                      <SelectValue placeholder={!nuevaClinicaHabilidad ? "Seleccione primero una clínica" : "Seleccione una familia"} />
                    </SelectTrigger>
                    <SelectContent>
                      {!nuevaClinicaHabilidad ? (
                        <SelectItem value="no_selection" disabled>Seleccione primero una clínica</SelectItem>
                      ) : (
                        FAMILIAS_MOCK.map(familia => (
                          <SelectItem key={familia.id} value={familia.id}>
                            {familia.nombre}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="familiaServicio" className="text-sm font-medium">Familia</Label>
                    <Select 
                      value={nuevaFamilia} 
                      onValueChange={setNuevaFamilia}
                      disabled={!nuevaClinicaHabilidad}
                    >
                      <SelectTrigger id="familiaServicio" className="h-9">
                        <SelectValue placeholder={!nuevaClinicaHabilidad ? "Seleccione primero una clínica" : "Seleccione una familia"} />
                      </SelectTrigger>
                      <SelectContent>
                        {!nuevaClinicaHabilidad ? (
                          <SelectItem value="no_selection" disabled>Seleccione primero una clínica</SelectItem>
                        ) : (
                          FAMILIAS_MOCK.map(familia => (
                            <SelectItem key={familia.id} value={familia.id}>
                              {familia.nombre}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="servicio" className="text-sm font-medium">Servicio</Label>
                    <Select 
                      value={nuevoServicio} 
                      onValueChange={setNuevoServicio}
                      disabled={!nuevaFamilia}
                    >
                      <SelectTrigger id="servicio" className="h-9">
                        <SelectValue placeholder={!nuevaFamilia ? "Seleccione primero una familia" : "Seleccione un servicio"} />
                      </SelectTrigger>
                      <SelectContent>
                        {!nuevaFamilia ? (
                          <SelectItem value="no_selection" disabled>Seleccione primero una familia</SelectItem>
                        ) : (
                          SERVICIOS_MOCK[nuevaFamilia]?.map(servicio => (
                            <SelectItem key={servicio.id} value={servicio.id}>
                              {servicio.nombre} ({servicio.duracion})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end mt-3">
                <Button 
                  className="px-5 bg-purple-600 hover:bg-purple-700"
                  onClick={handleAddHabilidad}
                  disabled={!nuevaClinicaHabilidad || (tipoSeleccion === "familia" && !nuevaFamilia) || (tipoSeleccion === "servicio" && !nuevoServicio)}
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Añadir habilidad
                </Button>
              </div>
              
              <div className="mt-6">
                <h4 className="mb-3 text-sm font-medium">Habilidades asignadas: {nombre}</h4>
                
                <div className="relative mb-4">
                  <Search className="absolute w-4 h-4 text-gray-500 -translate-y-1/2 left-3 top-1/2" />
                  <Input
                    placeholder="Buscar habilidades"
                    className="pl-10 h-9"
                    value={searchHabilidades}
                    onChange={(e) => setSearchHabilidades(e.target.value)}
                  />
                </div>
                
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="py-2 h-9">Clínica</TableHead>
                        <TableHead className="py-2 h-9">Tipo</TableHead>
                        <TableHead className="py-2 h-9">Habilidad</TableHead>
                        <TableHead className="py-2 h-9">Detalles</TableHead>
                        <TableHead className="w-[100px] text-right h-9 py-2">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {todasLasHabilidadesAsignadas.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="py-4 text-center text-gray-500">
                            No hay habilidades profesionales asignadas
                          </TableCell>
                        </TableRow>
                      ) : (
                        todasLasHabilidadesAsignadas
                          .filter(habilidad => {
                            if (!searchHabilidades) return true;
                            const clinica = clinics.find(c => String(c.id) === habilidad.clinicaId);
                            const searchLower = searchHabilidades.toLowerCase();
                            
                            return (
                              habilidad.nombre.toLowerCase().includes(searchLower) ||
                              (habilidad.familiaNombre && habilidad.familiaNombre.toLowerCase().includes(searchLower)) ||
                              (clinica && (
                                clinica.name.toLowerCase().includes(searchLower) ||
                                clinica.prefix.toLowerCase().includes(searchLower)
                              ))
                            );
                          })
                          .map((habilidad, index) => {
                            const clinica = clinics.find(c => String(c.id) === habilidad.clinicaId);
                            if (!clinica) return null;
                            
                            const itemId = habilidad.tipoHabilidad === "familia" 
                              ? `fam_${habilidad.id}` 
                              : `serv_${habilidad.id}`;
                            
                            return (
                              <TableRow key={`${habilidad.clinicaId}-${itemId}-${index}`}>
                                <TableCell>{clinica.prefix} - {clinica.name}</TableCell>
                                <TableCell>
                                  <Badge 
                                    variant="outline" 
                                    className={`
                                      ${habilidad.tipoHabilidad === "familia" 
                                        ? "bg-blue-50 text-blue-700 border-blue-200" 
                                        : "bg-green-50 text-green-700 border-green-200"}
                                    `}
                                  >
                                    {habilidad.tipoHabilidad === "familia" ? "Familia" : "Servicio"}
                                  </Badge>
                                </TableCell>
                                <TableCell>{habilidad.nombre}</TableCell>
                                <TableCell>
                                  {habilidad.tipoHabilidad === "servicio" && (
                                    <>
                                      <span className="text-xs text-gray-500">Familia:</span> {habilidad.familiaNombre}
                                      {habilidad.duracion && (
                                        <span className="ml-2 text-xs text-gray-500">({habilidad.duracion})</span>
                                      )}
                                    </>
                                  )}
                                  {habilidad.tipoHabilidad === "familia" && (
                                    <span className="text-xs text-gray-500">Todos los servicios</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex justify-end">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="w-8 h-8 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                                      onClick={() => handleRemoveHabilidad(habilidad.clinicaId, itemId)}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                      </svg>
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
        
        {/* Pestaña de Condiciones Laborales */}
        <TabsContent value="condiciones" className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-medium">Condiciones laborales</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="tipoContrato" className="text-sm font-medium">Tipo de contrato</Label>
                  <Select>
                    <SelectTrigger id="tipoContrato" className="h-9">
                      <SelectValue placeholder="Seleccione una opción" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indefinido">Indefinido</SelectItem>
                      <SelectItem value="temporal">Temporal</SelectItem>
                      <SelectItem value="practicas">Prácticas</SelectItem>
                      <SelectItem value="formacion">Formación</SelectItem>
                      <SelectItem value="obrayservicio">Obra y servicio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="jornada" className="text-sm font-medium">Jornada laboral</Label>
                  <Select>
                    <SelectTrigger id="jornada" className="h-9">
                      <SelectValue placeholder="Seleccione una opción" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completa">Completa</SelectItem>
                      <SelectItem value="parcial">Parcial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="fechaInicio" className="text-sm font-medium">Fecha de inicio</Label>
                  <Input id="fechaInicio" type="date" className="h-9" />
                </div>
                
                <div>
                  <Label htmlFor="fechaFin" className="text-sm font-medium">Fecha de fin (si aplica)</Label>
                  <Input id="fechaFin" type="date" className="h-9" />
                </div>
                
                <div>
                  <Label htmlFor="salarioBruto" className="text-sm font-medium">Salario bruto anual</Label>
                  <Input id="salarioBruto" type="number" placeholder="0.00" className="h-9" />
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="convenioColectivo" />
                    <Label htmlFor="convenioColectivo" className="text-sm">Sujeto a convenio colectivo</Label>
                  </div>
                </div>
              </div>
              
              <div>
                <Label htmlFor="observaciones" className="text-sm font-medium">Observaciones</Label>
                <textarea 
                  id="observaciones"
                  className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Añadir observaciones sobre condiciones laborales..."
                />
              </div>
            </div>
          </Card>
        </TabsContent>
        
        {/* Pestaña de Control de Presencia */}
        <TabsContent value="fichajes" className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-medium">Control de Presencia</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="filtroMes" className="text-sm font-medium">Filtrar por mes</Label>
                  <Select>
                    <SelectTrigger id="filtroMes" className="w-40 h-9">
                      <SelectValue placeholder="Este mes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="actual">Este mes</SelectItem>
                      <SelectItem value="1">Enero</SelectItem>
                      <SelectItem value="2">Febrero</SelectItem>
                      <SelectItem value="3">Marzo</SelectItem>
                      <SelectItem value="4">Abril</SelectItem>
                      <SelectItem value="5">Mayo</SelectItem>
                      <SelectItem value="6">Junio</SelectItem>
                      <SelectItem value="7">Julio</SelectItem>
                      <SelectItem value="8">Agosto</SelectItem>
                      <SelectItem value="9">Septiembre</SelectItem>
                      <SelectItem value="10">Octubre</SelectItem>
                      <SelectItem value="11">Noviembre</SelectItem>
                      <SelectItem value="12">Diciembre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button className="bg-purple-600 hover:bg-purple-700 h-9">
                  Exportar registro
                </Button>
              </div>
              
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="py-2 h-9">Fecha</TableHead>
                      <TableHead className="py-2 h-9">Entrada</TableHead>
                      <TableHead className="py-2 h-9">Salida</TableHead>
                      <TableHead className="py-2 h-9">Descanso</TableHead>
                      <TableHead className="py-2 h-9">Total horas</TableHead>
                      <TableHead className="py-2 h-9">Observaciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="py-2 font-medium">05/09/2023</TableCell>
                      <TableCell className="py-2">08:30</TableCell>
                      <TableCell className="py-2">17:30</TableCell>
                      <TableCell className="py-2">1h</TableCell>
                      <TableCell className="py-2">8h</TableCell>
                      <TableCell className="py-2">-</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="py-2 font-medium">04/09/2023</TableCell>
                      <TableCell className="py-2">08:25</TableCell>
                      <TableCell className="py-2">17:45</TableCell>
                      <TableCell className="py-2">1h</TableCell>
                      <TableCell className="py-2">8h 20m</TableCell>
                      <TableCell className="py-2">-</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="py-2 font-medium">01/09/2023</TableCell>
                      <TableCell className="py-2">08:15</TableCell>
                      <TableCell className="py-2">17:15</TableCell>
                      <TableCell className="py-2">1h</TableCell>
                      <TableCell className="py-2">8h</TableCell>
                      <TableCell className="py-2">-</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              
              <div className="p-3 rounded-md bg-gray-50">
                <h4 className="mb-2 text-sm font-medium">Resumen del mes</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Días trabajados</p>
                    <p className="font-medium">15</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Total horas</p>
                    <p className="font-medium">120h 20m</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Media diaria</p>
                    <p className="font-medium">8h 01m</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Modal para editar franjas horarias */}
      {showHorarioModal && editingFranja && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg">
            <h3 className="mb-4 text-lg font-semibold">
              {editingFranja.franjaId ? "Editar franja horaria" : "Añadir franja horaria"}
            </h3>
            
            <div className="space-y-4">
              {/* Información del horario de la clínica para este día */}
              {(() => {
                // Obtener el horario de la clínica para este día
                const horarioClinica = HORARIOS_CLINICA_MOCK[selectedClinicaHorario] || 
                                     HORARIOS_CLINICA_MOCK["1"] || 
                                     { 
                                       horarioGeneral: { apertura: "09:00", cierre: "20:00" },
                                       excepciones: []
                                     };
                
                // Buscar si hay excepción para este día
                const excepcion = horarioClinica.excepciones.find(exc => 
                  exc.dia.toLowerCase() === editingFranja.diaId.toLowerCase()
                );
                
                const horaApertura = excepcion ? excepcion.apertura : horarioClinica.horarioGeneral.apertura;
                const horaCierre = excepcion ? excepcion.cierre : horarioClinica.horarioGeneral.cierre;
                
                // Si está cerrado ese día
                if (excepcion && (!excepcion.apertura || !excepcion.cierre)) {
                  return (
                    <div className="p-3 mb-4 text-red-700 rounded-md bg-red-50">
                      <AlertCircle className="inline-block w-5 h-5 mr-2" />
                      La clínica está cerrada este día. No se puede asignar horario.
                    </div>
                  );
                }
                
                return (
                  <div className="p-3 mb-4 text-sm text-blue-700 rounded-md bg-blue-50">
                    <p className="font-medium">Horario permitido para {traducirDia(editingFranja.diaId)}:</p>
                    <p>{horaApertura} - {horaCierre}</p>
                  </div>
                );
              })()}
              
              <div>
                <Label htmlFor="inicio" className="text-sm font-medium">Hora de inicio</Label>
                <Input 
                  id="inicio" 
                  type="time"
                  value={editingFranja.inicio}
                  onChange={(e) => {
                    // Validar que el valor no sea menor que el mínimo ni mayor que el máximo
                    const minTime = (() => {
                      const horarioClinica = HORARIOS_CLINICA_MOCK[selectedClinicaHorario] || 
                                            HORARIOS_CLINICA_MOCK["1"];
                      if (!horarioClinica) return "00:00";
                      
                      const excepcion = horarioClinica.excepciones.find(exc => 
                        exc.dia.toLowerCase() === editingFranja.diaId.toLowerCase()
                      );
                      
                      return excepcion && excepcion.apertura ? excepcion.apertura : horarioClinica.horarioGeneral.apertura;
                    })();
                    
                    const maxTime = (() => {
                      const horarioClinica = HORARIOS_CLINICA_MOCK[selectedClinicaHorario] || 
                                            HORARIOS_CLINICA_MOCK["1"];
                      if (!horarioClinica) return "23:59";
                      
                      const excepcion = horarioClinica.excepciones.find(exc => 
                        exc.dia.toLowerCase() === editingFranja.diaId.toLowerCase()
                      );
                      
                      return excepcion && excepcion.cierre ? excepcion.cierre : horarioClinica.horarioGeneral.cierre;
                    })();
                    
                    let newValue = e.target.value;
                    
                    // Aplicar restricciones silenciosamente
                    if (newValue < minTime) {
                      newValue = minTime;
                    } 
                    else if (newValue > maxTime) {
                      newValue = maxTime;
                    }
                    
                    setEditingFranja({...editingFranja, inicio: newValue});
                  }}
                  className={`h-9 ${
                    !esFranjaValida(selectedClinicaHorario, editingFranja.inicio, editingFranja.fin, editingFranja.diaId) 
                      ? "border-red-300" 
                      : hayFranjasSuperpuestas(selectedClinicaHorario, editingFranja.diaId, editingFranja.inicio, editingFranja.fin, editingFranja.franjaId)
                        ? "border-amber-300"
                        : ""
                  }`}
                  min={(() => {
                    const horarioClinica = HORARIOS_CLINICA_MOCK[selectedClinicaHorario] || 
                                          HORARIOS_CLINICA_MOCK["1"];
                    if (!horarioClinica) return "00:00";
                    
                    const excepcion = horarioClinica.excepciones.find(exc => 
                      exc.dia.toLowerCase() === editingFranja.diaId.toLowerCase()
                    );
                    
                    return excepcion && excepcion.apertura ? excepcion.apertura : horarioClinica.horarioGeneral.apertura;
                  })()}
                  max={(() => {
                    const horarioClinica = HORARIOS_CLINICA_MOCK[selectedClinicaHorario] || 
                                         HORARIOS_CLINICA_MOCK["1"];
                    if (!horarioClinica) return "23:59";
                    
                    const excepcion = horarioClinica.excepciones.find(exc => 
                      exc.dia.toLowerCase() === editingFranja.diaId.toLowerCase()
                    );
                    
                    return excepcion && excepcion.cierre ? excepcion.cierre : horarioClinica.horarioGeneral.cierre;
                  })()}
                />
              </div>
              
              <div>
                <Label htmlFor="fin" className="text-sm font-medium">Hora de fin</Label>
                <Input 
                  id="fin" 
                  type="time"
                  value={editingFranja.fin}
                  onChange={(e) => {
                    // Validar que el valor no sea menor que el mínimo ni mayor que el máximo
                    const minTime = editingFranja.inicio || "00:00";
                    
                    const maxTime = (() => {
                      const horarioClinica = HORARIOS_CLINICA_MOCK[selectedClinicaHorario] || 
                                            HORARIOS_CLINICA_MOCK["1"];
                      if (!horarioClinica) return "23:59";
                      
                      const excepcion = horarioClinica.excepciones.find(exc => 
                        exc.dia.toLowerCase() === editingFranja.diaId.toLowerCase()
                      );
                      
                      return excepcion && excepcion.cierre ? excepcion.cierre : horarioClinica.horarioGeneral.cierre;
                    })();
                    
                    let newValue = e.target.value;
                    
                    // Aplicar restricciones silenciosamente
                    if (newValue < minTime) {
                      newValue = minTime;
                    } 
                    else if (newValue > maxTime) {
                      newValue = maxTime;
                    }
                    
                    setEditingFranja({...editingFranja, fin: newValue});
                  }}
                  className={`h-9 ${
                    !esFranjaValida(selectedClinicaHorario, editingFranja.inicio, editingFranja.fin, editingFranja.diaId) 
                      ? "border-red-300" 
                      : hayFranjasSuperpuestas(selectedClinicaHorario, editingFranja.diaId, editingFranja.inicio, editingFranja.fin, editingFranja.franjaId)
                        ? "border-amber-300"
                        : ""
                  }`}
                  min={editingFranja.inicio || (() => {
                    const horarioClinica = HORARIOS_CLINICA_MOCK[selectedClinicaHorario] || 
                                          HORARIOS_CLINICA_MOCK["1"];
                    if (!horarioClinica) return "00:00";
                    
                    const excepcion = horarioClinica.excepciones.find(exc => 
                      exc.dia.toLowerCase() === editingFranja.diaId.toLowerCase()
                    );
                    
                    return excepcion && excepcion.apertura ? excepcion.apertura : horarioClinica.horarioGeneral.apertura;
                  })()}
                  max={(() => {
                    const horarioClinica = HORARIOS_CLINICA_MOCK[selectedClinicaHorario] || 
                                         HORARIOS_CLINICA_MOCK["1"];
                    if (!horarioClinica) return "23:59";
                    
                    const excepcion = horarioClinica.excepciones.find(exc => 
                      exc.dia.toLowerCase() === editingFranja.diaId.toLowerCase()
                    );
                    
                    return excepcion && excepcion.cierre ? excepcion.cierre : horarioClinica.horarioGeneral.cierre;
                  })()}
                />
              </div>
              
              {/* Mensajes de validación */}
              {editingFranja.inicio && editingFranja.fin && (
                <>
                  {editingFranja.inicio >= editingFranja.fin && (
                    <div className="flex items-center gap-1 text-sm text-red-500">
                      <AlertCircle className="w-4 h-4" />
                      La hora de fin debe ser posterior a la de inicio
                    </div>
                  )}
                  
                  {!esFranjaValida(selectedClinicaHorario, editingFranja.inicio, editingFranja.fin, editingFranja.diaId) && (
                    <div className="flex items-center gap-1 text-sm text-red-500">
                      <AlertCircle className="w-4 h-4" />
                      La franja seleccionada está fuera del horario de la clínica para este día
                    </div>
                  )}
                  
                  {esFranjaValida(selectedClinicaHorario, editingFranja.inicio, editingFranja.fin, editingFranja.diaId) && 
                    hayFranjasSuperpuestas(selectedClinicaHorario, editingFranja.diaId, editingFranja.inicio, editingFranja.fin, editingFranja.franjaId) && (
                    <div className="flex items-center gap-1 text-sm text-amber-500">
                      <AlertCircle className="w-4 h-4" />
                      Esta franja se superpone con otras franjas existentes
                    </div>
                  )}
                </>
              )}
              
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowHorarioModal(false);
                    setEditingFranja(null);
                  }}
                  className="h-9"
                >
                  Cancelar
                </Button>
                <Button
                  className="bg-purple-600 h-9 hover:bg-purple-700"
                  onClick={() => {
                    // Obtener el horario específico del día
                    const horarioClinica = HORARIOS_CLINICA_MOCK[selectedClinicaHorario] || 
                                          HORARIOS_CLINICA_MOCK["1"];
                    
                    // Buscar si hay excepción para este día
                    const excepcion = horarioClinica.excepciones.find(exc => 
                      exc.dia.toLowerCase() === editingFranja.diaId.toLowerCase()
                    );
                    
                    // Determinar los límites horarios para este día
                    const horaApertura = excepcion && excepcion.apertura ? excepcion.apertura : horarioClinica.horarioGeneral.apertura;
                    const horaCierre = excepcion && excepcion.cierre ? excepcion.cierre : horarioClinica.horarioGeneral.cierre;
                    
                    // Ajustar las horas para que estén dentro del rango permitido
                    let inicioAjustado = editingFranja.inicio;
                    let finAjustado = editingFranja.fin;
                    
                    // Ajustes automáticos silenciosos
                    if (inicioAjustado < horaApertura) inicioAjustado = horaApertura;
                    if (finAjustado > horaCierre) finAjustado = horaCierre;
                    if (inicioAjustado >= finAjustado) {
                      toast({
                        title: "Error en el rango horario",
                        description: "La hora de fin debe ser posterior a la de inicio",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    // Si es una excepción, manejamos de forma diferente
                    if (editingFranja.isExcepcion && editingFranja.excepcionDiaIndex !== undefined && editingExcepcion) {
                      // Validar superposición de franjas (solo mostrar confirmación si hay superposición)
                      const diasExcepcion = [...editingExcepcion.dias];
                      const diaActual = diasExcepcion[editingFranja.excepcionDiaIndex];
                      
                      // Comprobar si hay franjas superpuestas
                      const hayOverlap = diaActual.franjas.some(franja => {
                        if (editingFranja.franjaId && franja.id === editingFranja.franjaId) {
                          return false; // Ignoramos la franja que estamos editando
                        }
                        
                        return (
                          (inicioAjustado >= franja.inicio && inicioAjustado < franja.fin) || // Inicio dentro de otra franja
                          (finAjustado > franja.inicio && finAjustado <= franja.fin) || // Fin dentro de otra franja
                          (inicioAjustado <= franja.inicio && finAjustado >= franja.fin) // Contiene a otra franja
                        );
                      });
                      
                      if (hayOverlap) {
                        if (!confirm("Esta franja se superpone con otras franjas existentes. ¿Deseas continuar?")) {
                          return;
                        }
                      }
                      
                      // Actualizar el state 
                      setEditingExcepcion(prevExcepcion => {
                        if (!prevExcepcion) return prevExcepcion;
                        
                        const newDias = [...prevExcepcion.dias];
                        
                        if (editingFranja.franjaId) {
                          // Estamos editando una franja existente
                          const franjaIndex = newDias[editingFranja.excepcionDiaIndex].franjas.findIndex(f => f.id === editingFranja.franjaId);
                          
                          if (franjaIndex >= 0) {
                            newDias[editingFranja.excepcionDiaIndex].franjas[franjaIndex] = {
                              ...newDias[editingFranja.excepcionDiaIndex].franjas[franjaIndex],
                              inicio: inicioAjustado,
                              fin: finAjustado
                            };
                          }
                        } else {
                          // Estamos añadiendo una nueva franja
                          newDias[editingFranja.excepcionDiaIndex].franjas.push({
                            id: `franja_excepcion_${Date.now()}_${Math.random()}`,
                            inicio: inicioAjustado,
                            fin: finAjustado
                          });
                        }
                        
                        return {
                          ...prevExcepcion,
                          dias: newDias
                        };
                      });
                    } else {
                      // Es horario normal semanal
                      // Validar superposición de franjas (solo mostrar confirmación si hay superposición)
                      const hayOverlap = hayFranjasSuperpuestas(
                        selectedClinicaHorario, 
                        editingFranja.diaId, 
                        inicioAjustado, 
                        finAjustado, 
                        editingFranja.franjaId
                      );
                      
                      if (hayOverlap) {
                        if (!confirm("Esta franja se superpone con otras franjas existentes. ¿Deseas continuar?")) {
                          return;
                        }
                      }
                      
                      // Si estamos editando una franja existente
                      if (editingFranja.franjaId) {
                        setHorarioSemanal(prevHorario => {
                          const newHorario = new Map(prevHorario);
                          const diasClinica = [...(newHorario.get(selectedClinicaHorario) || [])];
                          const diaIndex = diasClinica.findIndex(d => d.dia === editingFranja.diaId);
                          
                          if (diaIndex >= 0) {
                            const franjaIndex = diasClinica[diaIndex].franjas.findIndex(f => f.id === editingFranja.franjaId);
                            if (franjaIndex >= 0) {
                              diasClinica[diaIndex].franjas[franjaIndex] = {
                                ...diasClinica[diaIndex].franjas[franjaIndex],
                                inicio: inicioAjustado,
                                fin: finAjustado
                              };
                              newHorario.set(selectedClinicaHorario, diasClinica);
                            }
                          }
                          
                          return newHorario;
                        });
                      } else {
                        // Si estamos añadiendo una nueva franja
                        handleAddFranja(selectedClinicaHorario, editingFranja.diaId, inicioAjustado, finAjustado);
                      }
                    }
                    
                    // Cerrar el modal
                    setShowHorarioModal(false);
                    setEditingFranja(null);
                  }}
                  disabled={
                    !editingFranja.inicio || 
                    !editingFranja.fin || 
                    editingFranja.inicio >= editingFranja.fin
                  }
                >
                  Guardar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal para editar excepciones de horario */}
      {showExcepcionModal && editingExcepcion && !showHorarioModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl p-6 bg-white rounded-lg shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingExcepcion.id ? "Editar excepción de horario" : "Nueva excepción de horario"}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 rounded-full"
                onClick={() => {
                  setShowExcepcionModal(false);
                  setEditingExcepcion(null);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="nombreExcepcion">Nombre de la excepción</Label>
                  <Input 
                    id="nombreExcepcion" 
                    value={editingExcepcion.nombre}
                    onChange={(e) => setEditingExcepcion({...editingExcepcion, nombre: e.target.value})}
                    placeholder="Ej: Vacaciones, Formación, etc."
                  />
                </div>
                
                <div className="flex items-end gap-2">
                  <div className="flex-grow">
                    <Label htmlFor="fechaInicioExcepcion">Fecha inicio</Label>
                    <Input 
                      id="fechaInicioExcepcion" 
                      type="date"
                      value={editingExcepcion.fechaInicio}
                      onChange={(e) => setEditingExcepcion({...editingExcepcion, fechaInicio: e.target.value})}
                    />
                  </div>
                  <div className="flex-grow">
                    <Label htmlFor="fechaFinExcepcion">Fecha fin</Label>
                    <Input 
                      id="fechaFinExcepcion" 
                      type="date"
                      value={editingExcepcion.fechaFin}
                      min={editingExcepcion.fechaInicio}
                      onChange={(e) => setEditingExcepcion({...editingExcepcion, fechaFin: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              
              <div className="p-3 mb-4 text-sm text-blue-700 rounded-md bg-blue-50">
                <p className="font-medium">Horario de la clínica seleccionada:</p>
                {(() => {
                  // Obtener el horario de la clínica seleccionada o usar uno por defecto
                  const horarioClinica = HORARIOS_CLINICA_MOCK[selectedClinicaHorario] || 
                                        HORARIOS_CLINICA_MOCK["1"] || 
                                        { 
                                          horarioGeneral: { apertura: "09:00", cierre: "20:00" },
                                          excepciones: []
                                        };
                  
                  return (
                    <>
                      <p className="text-gray-600">
                        <span className="font-medium">Apertura general:</span> {horarioClinica.horarioGeneral.apertura} - {horarioClinica.horarioGeneral.cierre}
                      </p>
                      
                      {horarioClinica.excepciones.map((exc, index) => (
                        <p key={`exc-${index}`} className="text-gray-600">
                          <span className="font-medium">{traducirDia(exc.dia)}:</span> {exc.apertura ? `${exc.apertura} - ${exc.cierre}` : "Cerrado"}
                        </p>
                      ))}
                    </>
                  );
                })()}
                <p className="mt-1 text-xs italic text-gray-500">
                  Las franjas horarias de la excepción deben estar dentro del horario de apertura de la clínica.
                </p>
              </div>
              
              <div className="mt-5">
                <h4 className="mb-3 text-sm font-medium">Configuración por día</h4>
                
                <div className="overflow-hidden border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="py-2 h-9 w-[100px]">Día</TableHead>
                        <TableHead className="py-2 h-9">Franjas horarias</TableHead>
                        <TableHead className="py-2 h-9 w-[100px] text-center">Activo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editingExcepcion.dias.map((dia, index) => {
                        // Obtener el horario de la clínica para este día
                        const horarioClinica = HORARIOS_CLINICA_MOCK[selectedClinicaHorario] || 
                                              HORARIOS_CLINICA_MOCK["1"];
                        
                        // Buscar si hay excepción para este día
                        const excepcion = horarioClinica.excepciones.find(exc => 
                          exc.dia.toLowerCase() === dia.dia.toLowerCase()
                        );
                        
                        // Comprobar si la clínica está cerrada este día
                        const clinicaCerrada = excepcion && (!excepcion.apertura || !excepcion.cierre);
                        
                        return (
                          <TableRow key={dia.dia}>
                            <TableCell className="font-medium">{traducirDia(dia.dia)}</TableCell>
                            <TableCell>
                              {clinicaCerrada ? (
                                <div className="flex items-center text-sm text-red-600">
                                  <AlertCircle className="w-4 h-4 mr-1" />
                                  Clínica cerrada este día
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {dia.franjas.length === 0 ? (
                                    <span className="text-sm italic text-gray-500">Sin horario definido</span>
                                  ) : (
                                    dia.franjas.map((franja) => {
                                      // Comprobar si la franja está dentro del horario de la clínica
                                      const fueraDeHorario = !esFranjaValida(selectedClinicaHorario, franja.inicio, franja.fin, dia.dia);
                                      
                                      return (
                                        <Badge 
                                          key={franja.id} 
                                          variant="outline"
                                          className={`flex items-center gap-1 cursor-pointer hover:bg-blue-100 ${
                                            fueraDeHorario
                                              ? "bg-red-50 text-red-700 border-red-200"
                                              : "bg-blue-50 text-blue-700 border-blue-200"
                                          }`}
                                          onClick={() => {
                                            // Obtener el horario específico del día
                                            const horarioClinica = HORARIOS_CLINICA_MOCK[selectedClinicaHorario] || 
                                                                HORARIOS_CLINICA_MOCK["1"];
                                            
                                            // Buscar si hay excepción para este día
                                            const excepcion = horarioClinica.excepciones.find(exc => 
                                              exc.dia.toLowerCase() === dia.dia.toLowerCase()
                                            );
                                            
                                            // Determinar los límites horarios para este día
                                            const horaApertura = excepcion && excepcion.apertura ? excepcion.apertura : horarioClinica.horarioGeneral.apertura;
                                            const horaCierre = excepcion && excepcion.cierre ? excepcion.cierre : horarioClinica.horarioGeneral.cierre;
                                            
                                            // Ajustar las horas para que estén dentro del rango permitido
                                            let inicioAjustado = franja.inicio;
                                            let finAjustado = franja.fin;
                                            
                                            // Si la hora de inicio es anterior a la apertura, ajustarla silenciosamente
                                            if (inicioAjustado < horaApertura) {
                                              inicioAjustado = horaApertura;
                                            }
                                            
                                            // Si la hora de fin es posterior al cierre, ajustarla silenciosamente
                                            if (finAjustado > horaCierre) {
                                              finAjustado = horaCierre;
                                            }
                                            
                                            // Abrir el modal de edición de franja horaria
                                            setEditingFranja({
                                              diaId: dia.dia,
                                              franjaId: franja.id,
                                              inicio: inicioAjustado,
                                              fin: finAjustado,
                                              isExcepcion: true,
                                              excepcionDiaIndex: index
                                            });
                                            
                                            setShowHorarioModal(true);
                                          }}
                                        >
                                          {fueraDeHorario
                                            ? <AlertCircle className="w-3 h-3 mr-1" />
                                            : <Clock className="w-3 h-3 mr-1" />
                                          }
                                          {franja.inicio} - {franja.fin}
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-4 h-4 p-0 ml-1 text-gray-500 rounded-full hover:text-red-500 hover:bg-transparent"
                                            onClick={(e) => {
                                              e.stopPropagation(); // Evitar que se abra el modal de edición
                                              handleRemoveFranjaExcepcion(index, franja.id);
                                            }}
                                          >
                                            ×
                                          </Button>
                                        </Badge>
                                      );
                                    })
                                  )}
                                  {dia.activo && !clinicaCerrada && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="h-6 text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200"
                                      onClick={() => {
                                        // Obtener el horario específico del día
                                        const horarioClinica = HORARIOS_CLINICA_MOCK[selectedClinicaHorario] || 
                                                             HORARIOS_CLINICA_MOCK["1"];
                                        
                                        // Buscar si hay excepción para este día
                                        const excepcion = horarioClinica.excepciones.find(exc => 
                                          exc.dia.toLowerCase() === dia.dia.toLowerCase()
                                        );
                                        
                                        // Determinar los valores por defecto
                                        const horaInicioPorDefecto = excepcion && excepcion.apertura 
                                          ? excepcion.apertura 
                                          : horarioClinica.horarioGeneral.apertura;
                                        
                                        const horaFinPorDefecto = excepcion && excepcion.cierre 
                                          ? excepcion.cierre 
                                          : horarioClinica.horarioGeneral.cierre;
                                        
                                        // Añadir franja con valores por defecto
                                        handleAddFranjaExcepcion(
                                          index,
                                          horaInicioPorDefecto,
                                          horaFinPorDefecto
                                        );
                                      }}
                                    >
                                      <Plus className="w-3 h-3 mr-1" />
                                      Añadir
                                    </Button>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch 
                                checked={dia.activo} 
                                onCheckedChange={(checked) => {
                                  // Si la clínica está cerrada, mostrar un mensaje y no permitir activar
                                  if (checked && clinicaCerrada) {
                                    toast({
                                      title: "Clínica cerrada",
                                      description: `La clínica está cerrada los ${traducirDia(dia.dia).toLowerCase()}.`,
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  
                                  handleToggleDiaExcepcion(index, checked === true);
                                }}
                                disabled={clinicaCerrada && dia.activo === false}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowExcepcionModal(false);
                    setEditingExcepcion(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  className="bg-purple-600 hover:bg-purple-700"
                  onClick={() => {
                    // Validaciones
                    if (!editingExcepcion.nombre.trim()) {
                      toast({
                        title: "Nombre requerido",
                        description: "Debes proporcionar un nombre para la excepción",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    if (!editingExcepcion.fechaInicio || !editingExcepcion.fechaFin) {
                      toast({
                        title: "Fechas requeridas",
                        description: "Debes especificar las fechas de inicio y fin",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    if (new Date(editingExcepcion.fechaInicio) > new Date(editingExcepcion.fechaFin)) {
                      toast({
                        title: "Fechas inválidas",
                        description: "La fecha de fin debe ser posterior a la fecha de inicio",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    // Verificar que al menos un día esté activo
                    if (!editingExcepcion.dias.some(d => d.activo)) {
                      toast({
                        title: "Sin días activos",
                        description: "Debes activar al menos un día para la excepción",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    // Crear o actualizar la excepción
                    const excepcion: ExcepcionHoraria = {
                      id: editingExcepcion.id || `excepcion_${Date.now()}`,
                      clinicaId: selectedClinicaHorario,
                      nombre: editingExcepcion.nombre,
                      fechaInicio: editingExcepcion.fechaInicio,
                      fechaFin: editingExcepcion.fechaFin,
                      dias: editingExcepcion.dias
                    };
                    
                    handleAddExcepcion(excepcion);
                  }}
                >
                  Guardar excepción
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Botones flotantes */}
      <div className="fixed z-10 flex items-center gap-2 bottom-16 md:bottom-8 right-6">
        <Button 
          variant="outline" 
          onClick={() => {
            if (confirm("¿Estás seguro de que quieres salir sin guardar los cambios?")) {
              router.push(returnTo)
            }
          }} 
          className="transition-all bg-white shadow-md hover:shadow-lg"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <Button 
          onClick={handleSave} 
          className="transition-all bg-purple-600 shadow-md hover:bg-purple-700 hover:shadow-lg"
        >
          <Save className="w-4 h-4 mr-2" />
          Guardar
        </Button>
        <Button 
          variant="outline" 
          className="w-10 h-10 p-0 transition-all bg-white rounded-full shadow-md hover:shadow-lg"
        >
          <HelpCircle className="w-4 h-4" />
          <span className="sr-only">Ayuda</span>
        </Button>
      </div>
    </div>
  )
} 