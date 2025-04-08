"use client"

import React, { useState, useEffect, useMemo, useCallback, use } from "react";
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
  HorarioDia, 
  FranjaHoraria, 
  ExcepcionHoraria, 
  ExcepcionHorariaUsuario, // <-- Añadir esta importación
  HorarioSemanal,
  FamiliaTarifa, 
  FamiliaServicio // <-- Añadir FamiliaServicio
} from "@/services/data/models/interfaces"

// Importar el tipo Usuario directamente desde el contexto si no está ya
import type { Usuario } from "@/contexts/user-context";
import type { PerfilEmpleado } from "@/contexts/role-context"; // Importar PerfilEmpleado si no está ya
import type { Servicio } from "@/contexts/service-context"; // Importar Servicio si no está ya

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

// Función para formatear fecha (copiada de clinicas/[id]/page.tsx)
const formatFecha = (fecha: string): string => {
  if (!fecha) return '';
  try {
    const date = new Date(fecha);
    // Asegurarse de que la fecha es válida
    if (isNaN(date.getTime())) {
      return 'Fecha inválida';
    }
    // Usar toLocaleDateString para formato local amigable
    return date.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch (error) {
    console.error("Error formateando fecha:", fecha, error);
    return 'Error fecha';
  }
};

// Función para traducir día (si no existe ya)
const traducirDia = (dia: string): string => {
  const traducciones: Record<string, string> = {
    'lunes': 'Lunes',
    'martes': 'Martes',
    'miercoles': 'Miércoles',
    'jueves': 'Jueves',
    'viernes': 'Viernes',
    'sabado': 'Sábado',
    'domingo': 'Domingo',
  }
  return traducciones[dia.toLowerCase()] || dia;
}

// Indicar que params es una Promise y usar React.use para desenvolverla
export default function EditarUsuarioPage(props: { params: Promise<{ id: string }> }) { 
  // Desenvolver la promesa con React.use
  const params = React.use(props.params);
  const userId = params.id; // Acceder al id del objeto desenvuelto

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

  // Estados básicos refactorizados
  // const [nombre, setNombre] = useState("") // <- Eliminar
  const [firstName, setFirstName] = useState("") // <- Añadir
  const [lastName, setLastName] = useState("") // <- Añadir
  const [email, setEmail] = useState("")
  const [confirmEmail, setConfirmEmail] = useState("")
  const [prefijo, setPrefijo] = useState("") // Mantener? O usar 'phone'? Revisar modelo Prisma
  const [telefono, setTelefono] = useState("") // Asumiendo que 'phone' en Prisma es esto
  // const [perfil, setPerfil] = useState("") // <- Eliminar? El perfil/rol ahora podría estar en UserRole o similar
  const [isActive, setIsActive] = useState(true)

  // Estructura para almacenar permisos más detallados: Map<clinicaId, string[]>
  // Descomentar useState
  const [permisosClinicas, setPermisosClinicas] = useState<Map<string, string[]>>(new Map())

  // Convertir Map a array usando useMemo para estabilizar la referencia
  // Descomentar useMemo
  const selectedClinicas = React.useMemo(() => 
    Array.from(permisosClinicas.keys()), 
    [permisosClinicas] // Dependencia
  );
  // Eliminar array temporal
  // const selectedClinicas: string[] = []
  // Eliminar Map temporal
  // const permisosClinicas: Map<string, string[]> = new Map() // Temporalmente vacío

  const [loading, setLoading] = useState(true)
  const [showDisabledClinics, setShowDisabledClinics] = useState(false)

  // Nuevos estados para campos adicionales (mantener, revisar si existen en Prisma User)
  const [dni, setDni] = useState("")
  const [fechaNacimiento, setFechaNacimiento] = useState("")
  const [sexo, setSexo] = useState("")
  const [telefono2, setTelefono2] = useState("") // Existe en Prisma?
  const [contrasena, setContrasena] = useState("") // Se maneja en creación/edición?
  const [idioma, setIdioma] = useState("") // Existe en Prisma?

  // Estados para los datos de colegiado (mantener, revisar si existen en Prisma User)
  const [colegio, setColegio] = useState("")
  const [numeroColegiado, setNumeroColegiado] = useState("")
  const [especialidad, setEspecialidad] = useState("")
  const [universidad, setUniversidad] = useState("")

  // Estados para dirección (mantener, revisar si existen en Prisma User)
  const [direccion, setDireccion] = useState("")
  const [provincia, setProvincia] = useState("")
  const [pais, setPais] = useState("")
  const [localidad, setLocalidad] = useState("")
  const [cp, setCp] = useState("")

  // Estados para configuración (mantener, revisar si existen en Prisma User o modelo relacionado)
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
  // **COMENTADO TEMPORALMENTE - Requiere API y posible refactor de modelo**
  // const [showExcepcionModal, setShowExcepcionModal] = useState(false);
  // const [editingExcepcion, setEditingExcepcion] = useState<{\n    id?: string;\n    nombre: string;\n    fechaInicio: string;\n    fechaFin: string;\n    dias: HorarioDia[];\n  } | null>(null);
  const showExcepcionModal = false; // Temporal
  const editingExcepcion = null; // Temporal

  // Función para crear una excepción por defecto
  // **COMENTADO TEMPORALMENTE**
  /*
  const crearExcepcionPorDefecto = () => {
    // ... (código existente)
  };
  */

  // Función para añadir una excepción (MANUAL del usuario)
  // **COMENTADO TEMPORALMENTE**
  /*
  const handleAddExcepcion = (excepcionData: Omit<ExcepcionHorariaUsuario, \'id\' | \'userId\' | \'generadaAutomaticamente\'>) => {
    // ... (código existente)
  };
  */

  // Función para añadir franja a un día en una excepción
  // **COMENTADO TEMPORALMENTE**
  /*
  const handleAddFranjaExcepcion = (diaIndex: number, inicio: string, fin: string) => {
    // ... (código existente)
  };
  */

  // Función para eliminar franja de un día en una excepción
  // **COMENTADO TEMPORALMENTE**
  /*
  const handleRemoveFranjaExcepcion = (diaIndex: number, franjaId: string) => {
    // ... (código existente)
  };
  */

  // Función para activar/desactivar un día en una excepción
  // **COMENTADO TEMPORALMENTE**
  /*
  const handleToggleDiaExcepcion = (diaIndex: number, activo: boolean) => {
    // ... (código existente)
  };
  */

  // Función para eliminar una excepción
  // **COMENTADO TEMPORALMENTE**
  /*
  const handleRemoveExcepcion = (excepcionId: string) => {
    // ... (código existente)
  };
  */

  // Filtrar las clínicas activas
  const activeClinicas = clinics.filter(clinic => clinic.isActive)

  // Clínicas a mostrar en el selector (según el filtro)
  const clinicasToShow = showDisabledClinics ? clinics : activeClinicas

  // Lista de todos los perfiles disponibles en el sistema
  // **COMENTADO TEMPORALMENTE - Usar roles del contexto useRole**
  /*
  const PERFILES_DISPONIBLES = [
    // ... (perfiles existentes)
  ];
  */
  // Usar roles del contexto
  // const PERFILES_DISPONIBLES = roles.map(r => r.name) ?? []; // Error: name no existe en PerfilEmpleado
  // Asumiendo que el tipo PerfilEmpleado tiene un campo 'nombre' o similar
  const PERFILES_DISPONIBLES = roles.map(r => r.nombre) ?? []; // <- Usar 'nombre' (o el campo correcto)

  // Estado para la asignación de habilidades profesionales
  // Descomentar useState
  const [habilidadesProfesionales, setHabilidadesProfesionales] = useState<Map<string, string[]>>(new Map())
  // Eliminar Map temporal
  // const habilidadesProfesionales: Map<string, string[]> = new Map() // Temporalmente vacío
  const [nuevaClinicaHabilidad, setNuevaClinicaHabilidad] = useState("")
  const [nuevaFamilia, setNuevaFamilia] = useState("")
  const [nuevoServicio, setNuevoServicio] = useState("")
  const [tipoSeleccion, setTipoSeleccion] = useState<"familia" | "servicio">("familia")
  const [searchHabilidades, setSearchHabilidades] = useState("")

  // Datos mock para las familias y servicios (estos vendrían de una API real)
  // **PENDIENTE - Mover a contexto/API useService**
  const FAMILIAS_MOCK = familias ?? []; // Usar datos del contexto si existen

  // **PENDIENTE - Mover a contexto/API useService**
  // Reconstruir SERVICIOS_MOCK basado en servicios del contexto
  const SERVICIOS_MOCK: Record<string, { id: string, nombre: string, duracion?: string | null }[]> = {};
  // servicios.forEach(servicio => { // Asumir que servicio es de tipo Servicio
  servicios.forEach((servicio: Servicio) => { // Especificar tipo
    const familiaId = servicio.familiaId; // Asumiendo que servicio tiene familiaId
    if (familiaId) {
      if (!SERVICIOS_MOCK[familiaId]) {
        SERVICIOS_MOCK[familiaId] = [];
      }
      SERVICIOS_MOCK[familiaId].push({
                id: servicio.id,
        // nombre: servicio.name, // Error: name no existe en ServicioBase (o Servicio)
        nombre: servicio.nombre, // <- Usar 'nombre' (o el campo correcto)
        // duracion: servicio.duration ? `${servicio.duration} min` : null // Error: duration no existe, ¿quizás 'duracion'?
        duracion: servicio.duracion ? `${servicio.duracion} min` : null // <- Usar 'duracion'
      });
    }
  });


  // Obtener todas las habilidades asignadas (para filtrado y visualización)
  // Descomentar useMemo
  const todasLasHabilidadesAsignadas = React.useMemo(() => {
    // Crear un array plano de [clinicaId, habilidad]
    const result: [string, string][] = [];
    habilidadesProfesionales.forEach((habilidades, clinicaId) => {
      habilidades.forEach(habilidad => {
        result.push([clinicaId, habilidad]);
      });
    });
    return result;
  }, [habilidadesProfesionales]); // Quitar dependencia comentada

  // **COMENTADO TEMPORALMENTE**
  // Descomentar handleAddHabilidad
  const handleAddHabilidad = () => {
    const itemToAdd = tipoSeleccion === 'familia' ? nuevaFamilia : nuevoServicio;
    const itemLabel = tipoSeleccion === 'familia' 
      ? FAMILIAS_MOCK.find(f => f.id === itemToAdd)?.nombre 
      : servicios.find(s => s.id === itemToAdd)?.nombre; // Usar servicios del contexto
      
    if (!nuevaClinicaHabilidad || !itemToAdd || !itemLabel) {
      toast({ title: "Error", description: "Seleccione clínica, tipo y elemento.", variant: "destructive" });
      return;
    }
    
    setHabilidadesProfesionales(prevMap => {
      const newMap = new Map(prevMap);
      const currentHabilidades = (newMap.get(nuevaClinicaHabilidad) as string[] | undefined) || [];
      // Usar itemLabel para evitar duplicados basados en el nombre mostrado
      if (!currentHabilidades.includes(itemLabel)) {
        newMap.set(nuevaClinicaHabilidad, [...currentHabilidades, itemLabel]);
      }
      return newMap;
    });
    
    // Limpiar selects
    // setNuevaClinicaHabilidad(""); // No limpiar clínica necesariamente
    setNuevaFamilia("");
    setNuevoServicio("");
    
    toast({ title: "Habilidad añadida", description: `Habilidad "${itemLabel}" lista para guardar.` });
  };
  

  // **COMENTADO TEMPORALMENTE**
  // Descomentar handleRemoveHabilidad
  const handleRemoveHabilidad = (clinicaId: string, itemToRemove: string) => {
    setHabilidadesProfesionales(prevMap => {
      const newMap = new Map(prevMap);
      const currentHabilidades = (newMap.get(clinicaId) as string[] | undefined) || [];
      const updatedHabilidades = currentHabilidades.filter(h => h !== itemToRemove);
      
      if (updatedHabilidades.length > 0) {
        newMap.set(clinicaId, updatedHabilidades);
      } else {
        newMap.delete(clinicaId); // Eliminar si no quedan habilidades para esa clínica
      }
      return newMap;
    });
    toast({ title: "Habilidad eliminada", description: `Habilidad "${itemToRemove}" eliminada localmente.` });
  };
  

  useEffect(() => {
    // **COMENTADO TEMPORALMENTE - Carga de habilidades mock**
    /*
    const cargarHabilidadesMock = () => {
      // ... (código existente)
    };
    
    if (!loading) {
      cargarHabilidadesMock();
    }
    */
  }, [loading, clinics]);

  useEffect(() => {
    const loadUsuario = async () => {
      if (!userId || userId === 'nuevo') { // Evitar carga si es 'nuevo' o no hay ID
          setLoading(false);
          return;
      }
      setLoading(true); // Asegurar que loading sea true al iniciar
      try {
        // Envolver todo en un try/catch para evitar que errores en la carga
        // causen ciclos
        try {
          const usuario = await getUsuarioById(userId); // No castear aquí, usar tipo Usuario del contexto
          
          // --- DIAGNÓSTICO --- 
          console.log(`[UsuarioPage] Datos cargados para usuario ${userId}:`, JSON.stringify(usuario, null, 2));
          // --- FIN DIAGNÓSTICO ---\n          
          if (!usuario) {
            toast({
              title: "Error",
              description: "No se pudo encontrar el usuario",
              variant: "destructive",
            })
            router.push(returnTo)
            return
          }
          
          // Datos básicos refactorizados
          // setNombre(usuario.nombre || "") // <- Eliminar
          setFirstName(usuario.firstName || "") // <- Usar firstName
          setLastName(usuario.lastName || "")   // <- Usar lastName
          setEmail(usuario.email || "")
          setConfirmEmail(usuario.email || "") // Para el campo de confirmación
          // setPrefijo(usuario.prefijoTelefonico || "") // <- Eliminar si no existe
          // setTelefono(usuario.phone || "") // Error: phone no existe en Usuario. Asumir que existe un campo 'telefono' o similar
          setTelefono(usuario.phone || "") // <- Usar 'phone' (o el campo correcto del tipo Usuario)
          // setPerfil(usuario.perfil || "") // <- Eliminar (manejar roles por separado)
          setIsActive(usuario.isActive ?? true) // Usar el valor de isActive, default a true si no existe
          
          // Cargar permisos de clínicas
          // **COMENTADO TEMPORALMENTE - Requiere API/Modelo UserRole/UserClinic**
          /*
            const permisosMap = new Map<string, string[]>();
          if (usuario.perfilesClinica) { // Usar el campo correcto del tipo UsuarioEmpleado
            // Suponiendo que perfilesClinica es un Record<string, string[]>
            Object.entries(usuario.perfilesClinica).forEach(([clinicaId, perfiles]) => {
              permisosMap.set(clinicaId, perfiles);
            });
          } else if (usuario.clinicasIds && Array.isArray(usuario.clinicasIds)) {
            // Fallback si perfilesClinica no existe pero sí clinicasIds
            usuario.clinicasIds.forEach(clinicaId => {
              permisosMap.set(clinicaId, ["Personal"]); // Perfil por defecto
            });
          }
            setPermisosClinicas(permisosMap);
          */
          
          // Cargar Horarios
          // **COMENTADO TEMPORALMENTE - Requiere API/Modelo**
          /*
          if (usuario.horarios instanceof Map) {
            setHorarioSemanal(new Map(usuario.horarios));
          } else if (typeof usuario.horarios === \'object\' && usuario.horarios !== null) {
            // Intentar convertir de objeto si no es Map
            try {
              const horariosMap = new Map<string, HorarioDia[]>(Object.entries(usuario.horarios));
              setHorarioSemanal(horariosMap);
            } catch (mapError) {
              console.error("Error al convertir horarios a Map:", mapError);
              setHorarioSemanal(new Map()); // Fallback a mapa vacío
            }
          } else {
            console.warn("Formato de horarios inesperado:", usuario.horarios);
            setHorarioSemanal(new Map()); // Fallback a mapa vacío
          }
          */

          // Cargar Excepciones del Usuario
          // **COMENTADO TEMPORALMENTE - Requiere API/Modelo**
          // setExcepciones(usuario.excepciones || []);

          // Datos adicionales (Revisar si estos campos existen en el modelo Prisma User)
          // Si no existen, comentar o eliminar
          setDni((usuario as any).dni || ""); // Ejemplo: castear si no está en el tipo base
          setFechaNacimiento((usuario as any).fechaNacimiento || "");
          setSexo((usuario as any).sexo || "");
          setTelefono2((usuario as any).telefono2 || "");
          setIdioma((usuario as any).idioma || "");
          setColegio((usuario as any).colegio || "");
          setNumeroColegiado((usuario as any).numeroColegiado || "");
          setEspecialidad((usuario as any).especialidad || "");
          setUniversidad((usuario as any).universidad || "");
          setDireccion((usuario as any).direccion || "");
          setProvincia((usuario as any).provincia || "");
          setPais((usuario as any).pais || "");
          setLocalidad((usuario as any).localidad || "");
          setCp((usuario as any).cp || "");
          setExportCsv((usuario as any).exportCsv || "");
          setIndiceControl((usuario as any).indiceControl || "");
          setNumeroPIN((usuario as any).numeroPIN || "");
          setNotas((usuario as any).notas || "");
          
          // Configuración (Revisar si existe en Prisma o modelo relacionado)
          const config = (usuario as any).configuracion || {};
          setMostrarDesplazados(config.mostrarDesplazados || false);
          setMostrarCitasPropias(config.mostrarCitasPropias || false);
          setRestringirIP(config.restringirIP || false);
          setDeshabilitado(config.deshabilitado || false);
          
          // Cargar Habilidades Profesionales
          // **COMENTADO TEMPORALMENTE - Requiere API/Modelo**
          /*
          if (usuario.habilidadesProfesionales instanceof Map) {
            setHabilidadesProfesionales(new Map(usuario.habilidadesProfesionales));
          } else if (typeof usuario.habilidadesProfesionales === \'object\' && usuario.habilidadesProfesionales !== null) {
            // Intentar convertir de objeto si no es Map
            try {
              const habilidadesMap = new Map<string, string[]>(Object.entries(usuario.habilidadesProfesionales));
              setHabilidadesProfesionales(habilidadesMap);
            } catch (mapError) {
              console.error("Error al convertir habilidades a Map:", mapError);
              setHabilidadesProfesionales(new Map());
            }
          } else {
             console.warn("Formato de habilidades inesperado:", usuario.habilidadesProfesionales);
             setHabilidadesProfesionales(new Map());
          }
          */
          
        } catch (innerError) {
          console.error("Error interno al cargar datos del usuario:", innerError)
          toast({
            title: "Error",
            description: "No se pudieron procesar los datos del usuario.",
            variant: "destructive",
          })
          // No redirigir aquí necesariamente, podría ser un error parcial
        } finally { // Asegurarse de quitar el loading incluso si hay error interno
        setLoading(false)
        }
       
      } catch (error) {
        console.error("Error al llamar a getUsuarioById:", error)
        toast({
          title: "Error de Carga",
          description: "No se pudo cargar la información del usuario desde el servidor.",
          variant: "destructive",
        })
        router.push(returnTo)
      }
    }
    
    loadUsuario()
  // }, [userId, getUsuarioById, router, returnTo]); // Dependencias originales
  }, [userId, getUsuarioById, router, returnTo, toast]); // Añadir toast a dependencias si se usa dentro


  // **COMENTADO TEMPORALMENTE - Lógica de permisos/clínicas**
  // Descomentar handleAddClinica
  const handleAddClinica = (clinicaId: string, perfilClinica: string) => {
    if (!clinicaId || !perfilClinica) return; // Evitar añadir si falta algo
    
    // Actualizar el Map de permisosClinicas (estado local)
    setPermisosClinicas(prevMap => {
      const newMap = new Map(prevMap);
      // Asegurar tipo al obtener del Map
      const currentPerfiles = (newMap.get(clinicaId) as string[] | undefined) || [];
      // Evitar duplicados (aunque la UI de perfiles podría ser múltiple más adelante)
      if (!currentPerfiles.includes(perfilClinica)) {
        newMap.set(clinicaId, [...currentPerfiles, perfilClinica]);
      }
      return newMap;
    });
    
    // Limpiar los selects después de añadir
    setNuevaClinicaId("");
    setNuevoPerfilClinica("");
    
    toast({ title: "Asignación añadida", description: `Clínica y perfil listos para guardar.` });
  }
  

  // **COMENTADO TEMPORALMENTE - Lógica de permisos/clínicas**
  // Descomentar handleRemoveClinica
  const handleRemoveClinica = (clinicaId: string, perfilToRemove?: string) => {
    setPermisosClinicas(prevMap => {
      const newMap = new Map(prevMap);
      if (perfilToRemove) {
        // Eliminar un perfil específico si se proporciona
        // Asegurar tipo al obtener del Map
        const currentPerfiles = (newMap.get(clinicaId) as string[] | undefined) || [];
        const updatedPerfiles = currentPerfiles.filter(p => p !== perfilToRemove);
        if (updatedPerfiles.length > 0) {
          newMap.set(clinicaId, updatedPerfiles);
        } else {
          newMap.delete(clinicaId); // Eliminar la clínica si no quedan perfiles
        }
      } else {
        // Eliminar la clínica entera si no se especifica perfil
        newMap.delete(clinicaId);
      }
      return newMap;
    });
    toast({ title: "Asignación eliminada", description: "La asignación ha sido eliminada de la lista local." });
  }
  

  const handleSave = async () => {
    // Validaciones básicas refactorizadas
    // if (!nombre.trim()) { // <- Eliminar
    if (!firstName.trim()) { // <- Usar firstName
      toast({
        title: "Error",
        description: "El nombre es obligatorio",
        variant: "destructive",
      })
      return
    }
    if (!lastName.trim()) { // <- Añadir validación para lastName
      toast({
        title: "Error",
        description: "El apellido es obligatorio",
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
    if (email !== confirmEmail) { // Añadir validación de confirmación de email
      toast({ title: "Error", description: "Los emails no coinciden", variant: "destructive" });
      return;
    }
    
    // **COMENTADO TEMPORALMENTE - Validación de perfil y clínicas**
    /*
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
    */
    
    // **COMENTADO TEMPORALMENTE - Validación y ajuste de horarios**
    /*
    const horariosValidados = new Map<string, HorarioDia[]>();
    let haAjustadoHorarios = false;
    // ... (lógica de validación de horarios existente)
    */
    
    try {
      // **COMENTADO TEMPORALMENTE - Conversión de permisos, habilidades, horarios**
      /*
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
      */
      
      // Construir payload refactorizado para updateUsuario
      // Usar Omit<Usuario, 'id' | 'createdAt' | 'updatedAt' | 'password'> ya que password no se actualiza aquí normalmente
      // Y el contexto/API debe manejar la actualización de updatedAt
      const updatedUserData: Omit<Usuario, 'id' | 'createdAt' | 'updatedAt' | 'password' | 'emailVerified' | 'roles' | 'clinicas'> = {
        // nombre, // <- Eliminar
        firstName, // <- Usar firstName
        lastName, // <- Usar lastName
        email,
        // prefijoTelefonico: prefijo, // <- Eliminar si no existe
        // phone: telefono, // Error: phone no existe. Usar el campo correcto si existe, ej. 'telefono'
        phone: telefono, // <- Usar 'phone' si existe en el tipo Usuario
        // perfil, // <- Eliminar (manejar roles por separado)
        // clinicasIds: selectedClinicas, // <- Eliminar (manejar relaciones por separado)
        // perfilesClinica, // **COMENTADO**
        // habilidadesProfesionales: habilidadesPorClinica, // **COMENTADO**
        // horarios: horariosSerializables, // **COMENTADO**
        isActive,
        profileImageUrl: null, // Añadir explícitamente como null
        // fechaModificacion: new Date().toISOString(), // <- Esto debería manejarlo el backend/Prisma
        
        // Otros campos (revisar si existen en el modelo User y si son editables aquí)
        // Asegurarse de castear a 'any' si no están en el tipo Usuario base importado
        ...(dni && { dni }), // Incluir solo si tiene valor
        ...(fechaNacimiento && { fechaNacimiento }),
        ...(sexo && { sexo }),
        ...(telefono2 && { telefono2 }),
        // contrasena: contrasena ? contrasena : undefined, // No enviar contraseña en actualización normal
        ...(idioma && { idioma }),
        
        // Datos de colegiado
        ...(colegio && { colegio }),
        ...(numeroColegiado && { numeroColegiado }),
        ...(especialidad && { especialidad }),
        ...(universidad && { universidad }),
        
        // Dirección
        ...(direccion && { direccion }),
        ...(provincia && { provincia }),
        ...(pais && { pais }),
        ...(localidad && { localidad }),
        ...(cp && { cp }),
        
        // Configuración (si estos campos existen directamente en User)
        ...(exportCsv && { exportCsv }),
        ...(indiceControl && { indiceControl }),
        ...(numeroPIN && { numeroPIN }),
        ...(notas && { notas }),
        // configuracion: { // Si configuración es un objeto JSON en Prisma
        //   mostrarDesplazados,
        //   mostrarCitasPropias,
        //   restringirIP,
        //   deshabilitado
        // }
      }
      
      // Filtrar propiedades undefined antes de enviar
      const cleanPayload = Object.fromEntries(
        Object.entries(updatedUserData).filter(([_, v]) => v !== undefined)
      );

      console.log("[UsuarioPage] Payload para updateUsuario:", cleanPayload); // Diagnóstico

      const success = await updateUsuario(userId, cleanPayload as Partial<Usuario>) // Castear a Partial para flexibilidad
      
      if (success) {
        toast({
          title: "Usuario actualizado",
          description: "El usuario ha sido actualizado correctamente",
        })
        // Eliminar la redirección para permanecer en la misma página
        // router.push(returnTo)
      } else {
        throw new Error("No se pudo actualizar el usuario desde el contexto/API") // Mensaje más específico
      }
    } catch (error) {
      console.error("Error al actualizar usuario:", error)
      const errorMessage = error instanceof Error ? error.message : "No se pudo actualizar el usuario";
      toast({
        title: "Error al Guardar",
        description: errorMessage,
        variant: "destructive",
      })
    }
  };

  // Estado para horarios
  const [selectedClinicaHorario, setSelectedClinicaHorario] = useState<string>("");
  // **COMENTADO TEMPORALMENTE - Requiere API/Modelo**
  const [horarioSemanal, setHorarioSemanal] = useState<Map<string, HorarioDia[]>>(new Map());
  const [excepciones, setExcepciones] = useState<ExcepcionHorariaUsuario[]>([]);
  // CORREGIR TIPO: Definir explícitamente como string
  const [horarioSubTab, setHorarioSubTab] = useState<string>("semanal");
  // const [horarioSubTab, setHorarioSubTab] = useState<"semanal" | "excepciones" | "vista">("semanal"); // <- Tipo anterior incorrecto

  // Estado para modal de edición de franjas horarias
  // **COMENTADO TEMPORALMENTE - Requiere API/Modelo**
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
  // **COMENTADO TEMPORALMENTE - Depende de selectedClinicas**
  const opcionesClinicasHorario = React.useMemo(() => 
    selectedClinicas // Usar la variable temporal vacía
    .map(clinicaId => {
      const clinica = clinics.find(c => String(c.id) === clinicaId);
      return {
        id: clinicaId,
        label: clinica ? `${clinica.prefix} - ${clinica.name}` : "Clínica desconocida"
      };
    }
  ), [selectedClinicas, clinics]); // Mantener dependencias

  // Horarios mock de clínicas (esto vendría de un contexto real)
  // **PENDIENTE - Mover a contexto/API useClinic**
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
  // **COMENTADO TEMPORALMENTE - Requiere API/Modelo y selectedClinicas**
  /*
  useEffect(() => {
    if (!loading && clinics.length > 0) {
      // ... (lógica existente comentada)
    }
  }, [loading, clinics, selectedClinicas]);
  */

  // Función para distribuir proporcionalmente los horarios
  // **COMENTADO TEMPORALMENTE - Requiere API/Modelo y selectedClinicas**
  /*
  const distribuirHorariosMultiplesClinicas = (clinicaIds: string[]) => {
    // ... (lógica existente comentada)
  };
  */

  // Función para verificar si una franja horaria está dentro del horario de la clínica
  // **COMENTADO TEMPORALMENTE - Depende de HORARIOS_CLINICA_MOCK y lógica interna**
  /*
  const esFranjaValida = (clinicaId: string, inicio: string, fin: string, dia: string): boolean => {
    // ... (lógica existente comentada)
    return true; // Temporalmente permitir todo
  };
  */
  // Placeholder mientras está comentado
  const esFranjaValida = (clinicaId: string, inicio: string, fin: string, dia: string): boolean => true;


  // Función para añadir franja horaria
  // **COMENTADO TEMPORALMENTE - Requiere API/Modelo**
  /*
  const handleAddFranja = (clinicaId: string, dia: string, inicio: string, fin: string) => {
    // ... (lógica existente comentada)
  };
  */

  // Función para eliminar franja horaria
  // **COMENTADO TEMPORALMENTE - Requiere API/Modelo**
  /*
  const handleRemoveFranja = (clinicaId: string, dia: string, franjaId: string) => {
    // ... (lógica existente comentada)
  };
  */

  // Traducción de días de la semana (Mantener)
  // ... (código existente)

  // Función para verificar si una franja horaria se superpone con otras existentes
  // **COMENTADO TEMPORALMENTE - Depende de horarioSemanal**
  /*
  const hayFranjasSuperpuestas = (
    clinicaId: string, 
    dia: string, 
    inicio: string, 
    fin: string, 
    franjaIdActual?: string
  ): boolean => {
    // ... (lógica existente comentada)
    return false; // Temporalmente no hay superposición
  };
  */
  // Placeholder mientras está comentado
  const hayFranjasSuperpuestas = (clinicaId: string, dia: string, inicio: string, fin: string, franjaIdActual?: string): boolean => false;


  // Función para calcular las horas totales por clínica y por día
  // **COMENTADO TEMPORALMENTE - Depende de horarioSemanal**
  /*
  const calcularHorasTotales = (horarioSemanal: Map<string, HorarioDia[]>) => {
    // ... (lógica existente comentada)
    return { totalPorClinica: {}, totalGlobal: 0 }; // Temporal
  };
  */
  // Placeholder mientras está comentado
  const calcularHorasTotales = (horarioSemanal: Map<string, HorarioDia[]>) => ({ totalPorClinica: {}, totalGlobal: 0 });

  // Convierte un string de hora (HH:MM) a minutos (Mantener)
  // ... (código existente)

  // Convierte minutos a formato de hora legible (Mantener)
  // ... (código existente)

  if (loading && userId !== 'nuevo') { // Añadir chequeo para 'nuevo'
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
          {/* Quitar el disabled */}
          <TabsTrigger value="permisos">Permisos</TabsTrigger>
          <TabsTrigger value="horario">Horario</TabsTrigger>
          <TabsTrigger value="habilidades">Habilidades profesionales</TabsTrigger>
          <TabsTrigger value="condiciones">Condiciones laborales</TabsTrigger> {/* Mantener */}
          <TabsTrigger value="fichajes">Control de Presencia</TabsTrigger> {/* Mantener */}
        </TabsList>
        
        {/* Pestaña de Datos Personales (VISIBLE) */}
        <TabsContent value="datos-personales" className="space-y-4">
          <Card className="p-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-3">
                {/* Campo Nombre Refactorizado */}
                <div>
                  <Label htmlFor="firstName" className="text-sm font-medium">Nombre</Label> 
                  <Input 
                    id="firstName" 
                    value={firstName} // <- Usar firstName
                    onChange={(e) => setFirstName(e.target.value)} // <- Usar setFirstName
                    className="h-9"
                  />
                </div>
                {/* Campo Apellidos Añadido */}
                 <div>
                  <Label htmlFor="lastName" className="text-sm font-medium">Apellidos</Label>
                  <Input
                    id="lastName"
                    value={lastName} // <- Usar lastName
                    onChange={(e) => setLastName(e.target.value)} // <- Usar setLastName
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
                  {/* Quitar Prefijo si no se usa 'phone' directamente */}
                  {/* 
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
                   */}
                  {/* Usar todo el ancho para Teléfono */}
                  <div className="w-full"> 
                    <Label htmlFor="telefono" className="text-sm font-medium">Teléfono</Label>
                    <Input 
                      id="telefono" 
                      value={telefono} // <- Mapea a 'phone'
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
                
                {/* Campo Perfil (deshabilitado/informativo por ahora) */}
                <div>
                  <Label htmlFor="perfil" className="text-sm font-medium">Perfil (Gestión en Permisos)</Label>
                  <Input 
                    id="perfil" 
                    value="Gestión en pestaña Permisos" 
                    disabled 
                    className="h-9" 
                  />
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
                    placeholder="Dejar en blanco para no cambiar"
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
            
            {/* Sección de Datos del colegiado (Mantener si campos existen) */}
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
            
            {/* Sección de Dirección (Mantener si campos existen) */}
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
            
            {/* Sección de Configuración (Mantener si campos existen) */}
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
          {/* Eliminar placeholder y buscar/descomentar código original */}
          {/* <Card className="p-4"><p className="text-center text-gray-500">Gestión de permisos y roles estará disponible aquí.</p></Card> */}
          
          {/* >>> INICIO CÓDIGO DESCOMENTADO/RESTAURADO PARA PERMISOS (SI SE ENCUENTRA) <<< */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-medium">Asignación de clínicas y perfiles</h3>
              {/* Botón para mostrar/ocultar inactivas? */}
            </div>
            {/* Tabla de asignaciones existentes */}
            <div className="mb-4 border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Clínica</TableHead>
                    <TableHead>Perfil(es)</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedClinicas.map(clinicaId => {
                    const clinica = clinics.find(c => String(c.id) === clinicaId);
                    const perfiles = permisosClinicas.get(clinicaId) || []; // Usar la variable temporal
                    if (!clinica) return null; // No renderizar si la clínica no se encuentra
                    return (
                      <TableRow key={clinicaId}>
                        <TableCell>{clinica.prefix} - {clinica.name}</TableCell>
                        <TableCell>
                          {perfiles.map(perfil => (
                            <Badge key={perfil} variant="secondary" className="mr-1">{perfil}</Badge>
                          ))}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleRemoveClinica(clinicaId)} // Descomentar llamada
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {selectedClinicas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-gray-500">No hay clínicas asignadas</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Sección para añadir nueva asignación */}
            <div className="flex items-end gap-2 p-3 border rounded-md bg-gray-50">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Añadir Clínica</Label>
                <SelectClinica 
                  value={nuevaClinicaId}
                  onChange={setNuevaClinicaId}
                  options={clinicasToShow.filter(c => !selectedClinicas.includes(String(c.id))).map(c => ({ id: String(c.id), label: `${c.prefix} - ${c.name}` }))}
                  placeholder="Seleccionar clínica"
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Seleccionar Perfil</Label>
                <MemoizedSelect 
                  value={nuevoPerfilClinica}
                  onChange={setNuevoPerfilClinica} 
                  placeholder="Seleccionar perfil"
                >
                   {PERFILES_DISPONIBLES.map(perfil => (
                    <SelectItem key={perfil} value={perfil}>{perfil}</SelectItem>
                  ))}
                </MemoizedSelect>
              </div>
              <Button 
                size="sm" 
                onClick={() => handleAddClinica(nuevaClinicaId, nuevoPerfilClinica)} // Descomentar llamada
                disabled={!nuevaClinicaId || !nuevoPerfilClinica} 
                className="h-9"
              >
                Añadir
              </Button>
            </div>
          </Card>
          {/* >>> FIN CÓDIGO DESCOMENTADO/RESTAURADO PARA PERMISOS <<< */}
        </TabsContent>
        
        {/* Pestaña de Horario */}
        <TabsContent value="horario" className="space-y-4">
          {/* Eliminar placeholder */}
          {/* <Card className="p-4"><p className="text-center text-gray-500">La configuración del horario estará disponible aquí.</p></Card> */}
          
          {/* >>> INICIO CÓDIGO DESCOMENTADO/RESTAURADO PARA HORARIO <<< */}
          {/* Sección Selección Clínica */}
          <Card className="p-4">
            <Label className="mb-2 block text-sm font-medium">Seleccionar Clínica para ver/editar horario</Label>
            <SelectClinica
              value={selectedClinicaHorario}
              onChange={(value) => {
                setSelectedClinicaHorario(value);
                // Opcional: Resetear sub-pestaña al cambiar de clínica?
                // setHorarioSubTab('semanal'); 
              }}
              options={opcionesClinicasHorario} // Usar opciones memoizadas
              placeholder="Seleccione una clínica"
              disabled={selectedClinicas.length === 0} // Deshabilitar si no hay clínicas asignadas
            />
            {selectedClinicas.length === 0 && (
              <p className="mt-2 text-xs text-red-600">Asigne al menos una clínica en la pestaña 'Permisos' para configurar horarios.</p>
            )}
          </Card>
          
          {/* Sub-pestañas Horario Semanal / Excepciones / Vista Consolidada */}
          {selectedClinicaHorario && (
            <Tabs value={horarioSubTab} onValueChange={setHorarioSubTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="semanal">Horario Semanal</TabsTrigger>
                <TabsTrigger value="excepciones">Excepciones</TabsTrigger>
                <TabsTrigger value="vista">Vista Consolidada</TabsTrigger>
              </TabsList>
              
              {/* Sub-Pestaña: Horario Semanal */}
              <TabsContent value="semanal">
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-base font-medium">Horario Semanal Base</h4>
                    {/* Botón para aplicar horario de clínica? */}
                  </div>
                  {/* Descomentar renderizado de horario semanal */}
                  {(horarioSemanal.get(selectedClinicaHorario) || []).map((dia, diaIndex) => (
                    <div key={dia.dia} className="mb-3 border-b pb-3 last:border-b-0 last:pb-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium capitalize">{traducirDia(dia.dia)}</span>
                        <Switch
                          checked={dia.activo}
                          onCheckedChange={(checked) => {
                            // handleToggleDia(selectedClinicaHorario, dia.dia, checked) // Descomentar llamada
                          }}
                        />
                      </div>
                      {dia.activo && (
                        <div className="space-y-2 pl-4">
                          {dia.franjas.length === 0 && <p className="text-xs text-gray-500">Día cerrado. Añade una franja horaria.</p>}
                          {dia.franjas.map((franja, franjaIndex) => (
                            <div key={franja.id} className="flex items-center gap-2 p-2 text-sm border rounded bg-gray-50/50">
                              <Input type="time" value={franja.inicio} disabled className="h-8 text-xs w-28"/>
                              <span>-</span>
                              <Input type="time" value={franja.fin} disabled className="h-8 text-xs w-28"/>
                              <div className="ml-auto">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-100 hover:text-blue-700" onClick={() => { 
                                  // setEditingFranja({ diaId: dia.dia, franjaId: franja.id, inicio: franja.inicio, fin: franja.fin }); // Descomentar
                                  // setShowHorarioModal(true); // Descomentar
                                }}>
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 hover:bg-red-100 hover:text-red-700" onClick={() => { 
                                  // handleRemoveFranja(selectedClinicaHorario, dia.dia, franja.id) // Descomentar
                                }}>
                                  <Trash className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          <Button variant="outline" size="sm" className="w-full text-xs h-7" onClick={() => { 
                            // setEditingFranja({ diaId: dia.dia, inicio: '09:00', fin: '17:00' }); // Descomentar
                            // setShowHorarioModal(true); // Descomentar
                          }}>
                            <PlusCircle className="w-3 h-3 mr-1" />
                            Añadir Franja
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </Card>
              </TabsContent>
              
              {/* Sub-Pestaña: Excepciones */}
              <TabsContent value="excepciones">
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-base font-medium">Excepciones Horarias</h4>
                    <Button size="sm" onClick={() => { 
                      // setEditingExcepcion(crearExcepcionPorDefecto()); // Descomentar
                      // setShowExcepcionModal(true); // Descomentar
                     }} className="h-9">
                      <Plus className="w-4 h-4 mr-1" /> Nueva Excepción
                    </Button>
                  </div>
                  {/* Descomentar renderizado de excepciones */}
                  {excepciones.length === 0 ? (
                    <p className="text-sm text-center text-gray-500">No hay excepciones definidas para este usuario.</p>
                  ) : (
                    excepciones.map(exc => (
                      <div key={exc.id} className="p-3 mb-3 border rounded-md">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                             <p className="font-medium">{exc.nombre || "Excepción sin nombre"}</p>
                             <p className="text-xs text-gray-500">
                               {formatFecha(exc.fechaInicio)} - {formatFecha(exc.fechaFin)}
                             </p>
                          </div>
                          <div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-100" onClick={() => { 
                              // setEditingExcepcion(exc); // Descomentar
                              // setShowExcepcionModal(true); // Descomentar
                            }}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-100" onClick={() => { 
                              // handleRemoveExcepcion(exc.id) // Descomentar
                             }}>
                              <Trash className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </Card>
              </TabsContent>
              
              {/* Sub-Pestaña: Vista Consolidada */}
              <TabsContent value="vista">
                <Card className="p-4">
                  <h4 className="text-base font-medium mb-4">Vista Consolidada del Horario</h4>
                  {/* Aquí iría la lógica para mostrar el horario base + excepciones */}
                  <p className="text-sm text-center text-gray-500">Vista consolidada aún no implementada.</p>
                </Card>
              </TabsContent>
            </Tabs>
          )}
          
          {/* Resumen de Horas (Restaurar lógica JS también) */}
          {selectedClinicaHorario && (
             <Card className="p-4 mb-5 bg-white border rounded-lg shadow-sm">
              <h4 className="mb-3 text-sm font-medium">Resumen de horas configuradas para {clinics.find(c => c.id === selectedClinicaHorario)?.name}</h4>
              {(() => {
                const { totalPorClinica, totalGlobal } = calcularHorasTotales(horarioSemanal); // Descomentar
                // const { totalPorClinica, totalGlobal } = { totalPorClinica: {}, totalGlobal: 0 }; // Placeholder
                const totalHorasRecomendadas = 40;
                const datosClinica = totalPorClinica[selectedClinicaHorario] || { totalMinutos: 0, diasActivos: 0, porDia: {} };
                
                return (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Total semanal calculado:</span>
                      <span className={`font-bold ${datosClinica.totalMinutos > totalHorasRecomendadas * 60 ? 'text-red-600' : ''}`}>
                         {/* {minutosAHoraLegible(datosClinica.totalMinutos)}h */} {/* Descomentar si existe */} 
                         {`${(datosClinica.totalMinutos / 60).toFixed(1)}h`} / {totalHorasRecomendadas}h recomendadas
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Días activos:</span>
                      <span>{datosClinica.diasActivos} / 7</span>
                    </div>
                    <div className="pt-2 mt-2 border-t">
                       <h5 className="mb-1 text-xs font-medium text-gray-600">Detalle por día:</h5>
                       <div className="grid grid-cols-3 gap-1 text-xs">
                         {['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].map(dia => (
                           <div key={dia} className="flex justify-between px-1 py-0.5 rounded bg-gray-100/50">
                             <span className="capitalize">{traducirDia(dia)}:</span>
                             {/* <span>{minutosAHoraLegible(datosClinica.porDia?.[dia] || 0)}h</span> */} {/* Descomentar si existe */} 
                             <span>{`${((datosClinica.porDia?.[dia] || 0) / 60).toFixed(1)}h`}</span>
                           </div>
                         ))}
                       </div>
                    </div>
                     {selectedClinicas.length > 1 && (
                       <Button 
                         variant="outline" 
                         size="sm"
                         className="w-full text-xs h-7 mt-3"
                         // onClick={() => distribuirHorariosMultiplesClinicas(selectedClinicas)} // Descomentar
                         onClick={() => { /* Placeholder */ }}
                         disabled // Deshabilitar temporalmente
                       >
                         <PlusCircle className="w-3 h-3 mr-1" />
                         Equilibrar carga entre clínicas
                       </Button>
                     )}
                  </div>
                );
              })()}
            </Card>
          )}
          {/* >>> FIN CÓDIGO DESCOMENTADO/RESTAURADO PARA HORARIO <<< */}
        </TabsContent>
        
        {/* Pestaña de Habilidades Profesionales */}
        <TabsContent value="habilidades" className="space-y-4">
           {/* Eliminar placeholder */}
           {/* <Card className="p-4"><p className="text-center text-gray-500">Gestión de habilidades profesionales estará disponible aquí.</p></Card> */}
           
           {/* >>> INICIO CÓDIGO DESCOMENTADO/RESTAURADO PARA HABILIDADES <<< */}
           <Card className="p-4">
             <div className="flex items-center justify-between mb-4">
               <h3 className="text-base font-medium">Habilidades Profesionales Asignadas</h3>
               {/* Filtro o búsqueda? */}
               <Input 
                 placeholder="Buscar por clínica, familia o servicio..." 
                 value={searchHabilidades}
                 onChange={(e) => setSearchHabilidades(e.target.value)}
                 className="h-9 max-w-xs"
               />
             </div>
             
             {/* Tabla de habilidades existentes */}
             <div className="mb-4 border rounded-md">
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead>Clínica</TableHead>
                     <TableHead>Familia / Servicio</TableHead>
                     <TableHead className="text-right">Acciones</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {todasLasHabilidadesAsignadas // Usar el array memoizado
                     .filter(([clinicaId, habilidad]) => { // Filtrar según búsqueda
                       const clinica = clinics.find(c => String(c.id) === clinicaId);
                       const searchLower = searchHabilidades.toLowerCase();
                       return (
                         clinica?.name.toLowerCase().includes(searchLower) ||
                         habilidad.toLowerCase().includes(searchLower)
                       );
                     })
                     .map(([clinicaId, habilidad], index) => {
                       const clinica = clinics.find(c => String(c.id) === clinicaId);
                       return (
                         <TableRow key={`${clinicaId}-${habilidad}-${index}`}> {/* Añadir index para key única si habilidad puede repetirse */}
                           <TableCell>{clinica ? `${clinica.prefix} - ${clinica.name}` : "Clínica Desconocida"}</TableCell>
                           <TableCell>{habilidad}</TableCell>
                           <TableCell className="text-right">
                             <Button 
                               variant="ghost" 
                               size="sm" 
                               onClick={() => handleRemoveHabilidad(clinicaId, habilidad)} // Descomentar
                             >
                               <Trash className="w-4 h-4" />
                             </Button>
                           </TableCell>
                         </TableRow>
                       );
                   })} 
                   {todasLasHabilidadesAsignadas.length === 0 && (
                     <TableRow>
                       <TableCell colSpan={3} className="text-center text-gray-500">No hay habilidades asignadas</TableCell>
                     </TableRow>
                   )}
                 </TableBody>
               </Table>
             </div>
             
             {/* Sección para añadir nueva habilidad */}
             <div className="flex items-end gap-2 p-3 border rounded-md bg-gray-50">
               {/* Select Clínica */}
               <div className="flex-1 space-y-1">
                 <Label className="text-xs">Clínica</Label>
                 <SelectClinica 
                   value={nuevaClinicaHabilidad}
                   onChange={setNuevaClinicaHabilidad}
                   options={opcionesClinicasHorario} // Reutilizar opciones de horario?
                   placeholder="Seleccionar clínica"
                 />
               </div>
               
               {/* Select Tipo (Familia/Servicio) */}
               <div className="w-40 space-y-1 shrink-0">
                 <Label className="text-xs">Tipo</Label>
                 <SelectTipo value={tipoSeleccion} onChange={setTipoSeleccion} />
               </div>
               
               {/* Select Familia o Servicio (Condicional) */}
               <div className="flex-1 space-y-1">
                 <Label className="text-xs">{tipoSeleccion === 'familia' ? 'Familia' : 'Servicio'}</Label>
                 <MemoizedSelect 
                   value={tipoSeleccion === 'familia' ? nuevaFamilia : nuevoServicio}
                   onChange={tipoSeleccion === 'familia' ? setNuevaFamilia : setNuevoServicio} 
                   placeholder={tipoSeleccion === 'familia' ? 'Seleccionar familia' : 'Seleccionar servicio'}
                   disabled={!nuevaClinicaHabilidad} // Deshabilitar si no hay clínica
                 >
                   {tipoSeleccion === 'familia' 
                     // CORREGIDO: Usar tipo FamiliaServicio y acceder a 'name'
                     ? (FAMILIAS_MOCK.map((familia: FamiliaServicio) => ( 
                         <SelectItem key={String(familia.id)} value={String(familia.id)}> 
                           {familia.name} {/* <-- Usar 'name' */}
                         </SelectItem>
                       )))
                     : (Object.values(SERVICIOS_MOCK).flat().map(servicio => (
                         <SelectItem key={servicio.id} value={servicio.id}>{servicio.nombre}</SelectItem>
                       )))
                   }
                   {/* Mensaje si no hay opciones? */}
                 </MemoizedSelect>
               </div>
               
               {/* Botón Añadir */}
               <Button 
                 size="sm" 
                 onClick={handleAddHabilidad} // Descomentar
                 disabled={!nuevaClinicaHabilidad || (tipoSeleccion === 'familia' ? !nuevaFamilia : !nuevoServicio)}
                 className="h-9"
               >
                 Añadir Habilidad
               </Button>
             </div>
           </Card>
           {/* >>> FIN CÓDIGO DESCOMENTADO/RESTAURADO PARA HABILIDADES <<< */}
        </TabsContent>
        
        {/* Pestaña de Condiciones Laborales (VISIBLE) */}
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
        
        {/* Pestaña de Control de Presencia (VISIBLE) */}
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
      </Tabs> {/* <- CIERRE CORRECTO DE Tabs PRINCIPAL */}
      
      {/* Modales comentados y botones flotantes */}
      {/* ... (contenido existente) ... */}
    </div>
  )
} 