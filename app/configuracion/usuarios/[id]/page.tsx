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
import { Skeleton } from "@/components/ui/skeleton"

// Importación de contextos
import { useUser } from "@/contexts/user-context"
import { useClinic } from "@/contexts/clinic-context"
import { useService } from "@/contexts/service-context"
import { useRole } from "@/contexts/role-context"; // <-- AÑADIR IMPORTACIÓN

// Importación de tipos
import { 
  HorarioDia, 
  FranjaHoraria, 
  ExcepcionHoraria, // Asegurar que este es el tipo correcto
  HorarioSemanal,
  FamiliaTarifa, 
  FamiliaServicio,
  Servicio as ServicioInterface // Renombrar import para evitar conflicto con el del contexto
} from "@/services/data/models/interfaces"

// Importar el tipo Usuario directamente desde el contexto si no está ya
import type { Usuario } from "@/contexts/user-context";
// Importar Servicio del contexto (si es diferente al de interfaces)
import type { Servicio as ServicioContext } from "@/contexts/service-context";

// Tipos para el sistema de horarios

// NUEVA FUNCIÓN AUXILIAR
const arraysEqual = (a: string[], b: string[]): boolean => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  for (let i = 0; i < sortedA.length; ++i) {
    if (sortedA[i] !== sortedB[i]) return false;
  }
  return true;
};

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

// --- Placeholders para Mocks y Constantes (Reemplazar con datos reales) ---
const PERFILES_DISPONIBLES: string[] = ["Admin", "Editor", "Visor"]; // Ejemplo
const FAMILIAS_MOCK: FamiliaServicio[] = []; // Ejemplo vacío
const SERVICIOS_MOCK: Record<string, ServicioInterface[]> = {}; // Ejemplo vacío
// --- Fin Placeholders ---

// --- Componente Skeleton --- 
const UsuarioPageSkeleton = () => {
  return (
    <div className="container max-w-5xl p-6 mx-auto space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <Skeleton className="w-1/3 h-8" /> {/* Título */} 
      </div>
      
      {/* Skeleton para Tabs */}
      <Skeleton className="w-full h-10 mb-4" /> {/* TabsList */} 
      
      {/* Skeleton para Card de contenido */}
      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Columna Izquierda */} 
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="w-1/4 h-4" /> {/* Label */} 
              <Skeleton className="w-full h-9" /> {/* Input */} 
            </div>
            <div className="space-y-2">
              <Skeleton className="w-1/4 h-4" /> {/* Label */} 
              <Skeleton className="w-full h-9" /> {/* Input */} 
            </div>
            <div className="space-y-2">
              <Skeleton className="w-1/4 h-4" /> {/* Label */} 
              <Skeleton className="w-full h-9" /> {/* Input */} 
            </div>
             <div className="space-y-2">
              <Skeleton className="w-1/4 h-4" /> {/* Label */} 
              <Skeleton className="w-full h-9" /> {/* Input */} 
            </div>
            <div className="space-y-2">
              <Skeleton className="w-1/4 h-4" /> {/* Label */} 
              <Skeleton className="w-full h-9" /> {/* Input */} 
            </div>
          </div>
          {/* Columna Derecha */} 
          <div className="space-y-4">
             <div className="space-y-2">
              <Skeleton className="w-1/4 h-4" /> {/* Label */} 
              <Skeleton className="w-full h-9" /> {/* Input */} 
            </div>
             <div className="space-y-2">
              <Skeleton className="w-1/4 h-4" /> {/* Label */} 
              <Skeleton className="w-full h-9" /> {/* Input */} 
            </div>
             <div className="space-y-2">
              <Skeleton className="w-1/4 h-4" /> {/* Label */} 
              <Skeleton className="w-full h-9" /> {/* Input */} 
            </div>
            <div className="flex items-center pt-4 space-x-2">
               <Skeleton className="w-10 h-6" /> {/* Switch */} 
               <Skeleton className="w-1/5 h-4" /> {/* Label Switch */} 
            </div>
          </div>
        </div>
        {/* ... añadir más Skeletons si se quiere simular más detalle ... */} 
      </Card>
      
      {/* Skeleton para Botones Flotantes */}
       <div className="flex justify-end gap-2">
          <Skeleton className="w-24 h-9" /> {/* Botón Cancelar */} 
          <Skeleton className="w-28 h-9" /> {/* Botón Guardar */} 
       </div>
    </div>
  );
}
// --- Fin Componente Skeleton ---

// Componente principal
export default function EditarUsuarioPage(props: { params: Promise<{ id: string }> }) {
  // Desenvolver la promesa con React.use para obtener params
  const params = React.use(props.params);
  const userId = params.id; // Definir userId aquí

  const router = useRouter() // Definir router aquí
  const searchParams = useSearchParams()
  const { toast } = useToast() // CORREGIDO: Usar desestructuración

  // Obtener los parámetros de la URL
  const returnToBase = searchParams.get('returnTo') || "/configuracion/usuarios"
  const tabParam = searchParams.get('tab')

  // Construir la URL de retorno completa
  const returnTo = tabParam 
    ? returnToBase.includes('?') 
      ? `${returnToBase}&tab=${tabParam}` 
      : `${returnToBase}?tab=${tabParam}`
    : returnToBase

  // MODIFICADO: Añadir createUsuario a la desestructuración
  const { getUsuarioById, updateUsuario, createUsuario } = useUser() 
  const { clinics } = useClinic()
  const { familias, servicios } = useService() // Asumiendo que 'roles' no viene de aquí
  const { roles: availableRoles, isLoading: isLoadingRoles } = useRole(); // <-- OBTENER ROLES Y ESTADO DE CARGA

  // --- Estados del Componente ---
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('datos-personales')
  const [horarioSubTab, setHorarioSubTab] = useState('semanal') 

  // Estados para Datos del Usuario (Asegurarse que todos están declarados)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [confirmEmail, setConfirmEmail] = useState("")
  const [telefono, setTelefono] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [dni, setDni] = useState("")
  const [fechaNacimiento, setFechaNacimiento] = useState("")
  const [sexo, setSexo] = useState("")
  const [telefono2, setTelefono2] = useState("")
  const [idioma, setIdioma] = useState("")
  const [colegio, setColegio] = useState("")
  const [numeroColegiado, setNumeroColegiado] = useState("")
  const [especialidad, setEspecialidad] = useState("")
  const [universidad, setUniversidad] = useState("")
  const [direccion, setDireccion] = useState("")
  const [provincia, setProvincia] = useState("")
  const [pais, setPais] = useState("")
  const [localidad, setLocalidad] = useState("")
  const [cp, setCp] = useState("")
  const [exportCsv, setExportCsv] = useState("false") 
  const [indiceControl, setIndiceControl] = useState("")
  const [numeroPIN, setNumeroPIN] = useState("")
  const [notas, setNotas] = useState("")
  const [contrasena, setContrasena] = useState(""); 
  // AÑADIDOS estados para checkboxes de Configuración (si se usan en el formulario)
  const [mostrarDesplazados, setMostrarDesplazados] = useState(false);
  const [mostrarCitasPropias, setMostrarCitasPropias] = useState(false);
  const [restringirIP, setRestringirIP] = useState(false);
  const [deshabilitado, setDeshabilitado] = useState(false); // Relacionado con isActive? verificar

  // Estados para Permisos
  const [permisosClinicas, setPermisosClinicas] = useState<Map<string, string[]>>(new Map()); 
  // AÑADIDO: Estado para almacenar los permisos originales al cargar
  const [initialPermisosClinicas, setInitialPermisosClinicas] = useState<Map<string, string[]>>(new Map());
  const [selectedClinicas, setSelectedClinicas] = useState<string[]>([]); // IDs de clínicas asignadas
  const [nuevaClinicaId, setNuevaClinicaId] = useState<string>("");
  const [nuevoPerfilClinica, setNuevoPerfilClinica] = useState<string>("");
  const [showDisabledClinics, setShowDisabledClinics] = useState(false);

  // Estados para Horarios (Declaración ÚNICA aquí)
  const [horarioEditado, setHorarioEditado] = useState<Map<string, HorarioSemanal | null>>(new Map());
  const [horarioSemanal, setHorarioSemanal] = useState<Map<string, HorarioSemanal | null>>(new Map()); 
  const [excepcionesUsuario, setExcepcionesUsuario] = useState<ExcepcionHoraria[]>([]);
  const [excepcionEditada, setExcepcionEditada] = useState<ExcepcionHoraria | null>(null);
  const [mostrarModalExcepcion, setMostrarModalExcepcion] = useState(false);
  const [clinicaSeleccionadaHorario, setClinicaSeleccionadaHorario] = useState<string>(""); 
  const [selectedClinicaHorario, setSelectedClinicaHorario] = useState<string>(""); 
  const [isLoadingHorario, setIsLoadingHorario] = useState(false);
  const [isHorarioHeredado, setIsHorarioHeredado] = useState(false);

  // Estados para Habilidades
  const [habilidadesPorClinica, setHabilidadesPorClinica] = useState<Map<string, { familiaId: string, servicioId?: string, nivel: number }[]>>(new Map());
  const [clinicaSeleccionadaHabilidades, setClinicaSeleccionadaHabilidades] = useState<string>("");
  const [tipoSeleccion, setTipoSeleccion] = useState('familia');
  const [elementoSeleccionadoId, setElementoSeleccionadoId] = useState('');
  const [nivelHabilidad, setNivelHabilidad] = useState(3); // Nivel por defecto
  const [searchHabilidades, setSearchHabilidades] = useState("");
  const [nuevaClinicaHabilidad, setNuevaClinicaHabilidad] = useState("");
  const [nuevaFamilia, setNuevaFamilia] = useState("");
  const [nuevoServicio, setNuevoServicio] = useState("");
  const [todasLasHabilidadesAsignadas, setTodasLasHabilidadesAsignadas] = useState<[string, string][]>([]);


  // --- Fin Declaración de Estados ---

  // --- useEffect para cargar datos iniciales --- 
  useEffect(() => {
    const loadInitialData = async () => {
      if (userId === 'nuevo') {
        setLoading(false);
        // Setear estado inicial para 'nuevo' si es necesario
        setPermisosClinicas(new Map());
        setInitialPermisosClinicas(new Map());
        setSelectedClinicas([]);
        setIsActive(true); // Usuario nuevo activo por defecto
        // Inicializar otros campos si es necesario
        setFirstName("");
        setLastName("");
        setEmail("");
        setConfirmEmail("");
        setTelefono("");
        setContrasena("");
        setDni("");
        setFechaNacimiento("");
        setSexo("");
        setTelefono2("");
        setIdioma("");
        setColegio("");
        setNumeroColegiado("");
        setEspecialidad("");
        setUniversidad("");
        setDireccion("");
        setProvincia("");
        setPais("");
        setLocalidad("");
        setCp("");
        setExportCsv("false");
        setIndiceControl("");
        setNumeroPIN("");
        setNotas("");
        setMostrarDesplazados(false);
        setMostrarCitasPropias(false);
        setRestringirIP(false);
        setDeshabilitado(false);
        
        return; 
      }

      setLoading(true);
      try {
        const userData = await getUsuarioById(userId);
        if (userData) {
          console.log("[UsuarioPage] Datos iniciales recibidos para usuario:", userData);
          // Establecer datos básicos
          setFirstName(userData.firstName || "");
          setLastName(userData.lastName || "");
          setEmail(userData.email || "");
          setConfirmEmail(userData.email || "");
          setTelefono(userData.phone || "");
          setIsActive(userData.isActive);
          setContrasena(""); // NO setear contraseña al cargar

          // Establecer TODOS los campos adicionales desde userData
          setDni((userData as any).dni || ""); 
          // Asegurar que la fecha se formatea como yyyy-mm-dd si viene como Date
          const dob = (userData as any).fechaNacimiento;
          setFechaNacimiento(dob ? new Date(dob).toISOString().split('T')[0] : "");
          setSexo((userData as any).sexo || "");
          setTelefono2((userData as any).telefono2 || "");
          setIdioma((userData as any).idioma || "");
          setColegio((userData as any).colegio || "");
          setNumeroColegiado((userData as any).numeroColegiado || "");
          setEspecialidad((userData as any).especialidad || "");
          setUniversidad((userData as any).universidad || "");
          setDireccion((userData as any).direccion || "");
          setProvincia((userData as any).provincia || "");
          setPais((userData as any).pais || "");
          setLocalidad((userData as any).localidad || "");
          setCp((userData as any).cp || "");
          setExportCsv(String((userData as any).exportCsv || "false")); // Convertir boolean a string
          setIndiceControl((userData as any).indiceControl || "");
          setNumeroPIN((userData as any).numeroPIN || "");
          setNotas((userData as any).notas || "");
          // Setear checkboxes de configuración (ejemplo, ajustar nombres si son diferentes en userData)
          setMostrarDesplazados(Boolean((userData as any).mostrarDesplazados)); 
          setMostrarCitasPropias(Boolean((userData as any).mostrarCitasPropias)); 
          setRestringirIP(Boolean((userData as any).restringirIP)); 
          setDeshabilitado(Boolean((userData as any).deshabilitado)); // ¿O !userData.isActive? Revisar

          // Establecer permisos y guardar copia inicial
          const initialPermisos = new Map<string, string[]>();
          // Asegurarse que 'clinicAssignments' es el nombre correcto del campo en userData
          const assignments = (userData as any).clinicAssignments || []; 
          if (Array.isArray(assignments)) {
             assignments.forEach((asignacion: any) => {
                // Asumir que asignacion tiene clinicId y roleId
                const clinicId = asignacion.clinicId;
                const roleId = asignacion.roleId || asignacion.role?.id; // Intentar obtener roleId
                if(clinicId && roleId) {
                   const rolesClinica = initialPermisos.get(clinicId) || [];
                   if (!rolesClinica.includes(roleId)) {
                     rolesClinica.push(roleId);
                   }
                   initialPermisos.set(clinicId, rolesClinica);
                } else {
                   console.warn("Asignación incompleta o sin roleId encontrada:", asignacion);
                }
             });
          }
          setPermisosClinicas(initialPermisos); 
          setInitialPermisosClinicas(new Map(initialPermisos)); // Guardar copia inicial
          setSelectedClinicas(Array.from(initialPermisos.keys()));

          // Seleccionar la primera clínica asignada para la pestaña Horario (si existe)
          if (initialPermisos.size > 0) {
            const firstClinicId = initialPermisos.keys().next().value;
            setSelectedClinicaHorario(firstClinicId); 
          }

          // Cargar habilidades (si existen y adaptar a la estructura del estado)
          // ... (lógica para cargar habilidades) ...
          // Placeholder:
          setTodasLasHabilidadesAsignadas([]); // Resetear o calcular aquí

          } else {
          console.error(`Usuario con ID ${userId} no encontrado.`);
          toast({ title: "Error", description: "Usuario no encontrado.", variant: "destructive" }); 
          router.push('/configuracion/usuarios');
        }
      } catch (error) {
        console.error("Error cargando datos del usuario:", error);
        toast({ title: "Error", description: "No se pudieron cargar los datos del usuario.", variant: "destructive" }); 
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [userId, getUsuarioById, router, toast]); 

  // --- useEffect para cargar Horario (SIN DUPLICADOS) ---
  useEffect(() => {
    const cargarHorario = async () => {
      // Usar selectedClinicaHorario que se actualiza en el primer useEffect
      if (!userId || userId === 'nuevo' || !selectedClinicaHorario) { 
        setHorarioEditado(prev => {
          const nuevoMapa = new Map(prev);
          nuevoMapa.delete(selectedClinicaHorario); // Usar el estado correcto
          return nuevoMapa;
        });
        setHorarioSemanal(prev => { // Actualizar también si es necesario
          const nuevoMapa = new Map(prev);
          nuevoMapa.delete(selectedClinicaHorario);
          return nuevoMapa;
        });
        setIsHorarioHeredado(false);
        return;
      }
      setIsLoadingHorario(true);
      setIsHorarioHeredado(false);
      console.log(`[Horario useEffect] Cargando horario para Usuario: ${userId}, Clínica: ${selectedClinicaHorario}`); // Usar estado correcto
      try {
        const response = await fetch(`/api/users/${userId}/schedule?clinicId=${selectedClinicaHorario}`); // Usar estado correcto
        if (!response.ok) {
          if (response.status === 404) { 
             console.warn(`[Horario useEffect] API devolvió 404 para horario personalizado. Usuario: ${userId}, Clínica: ${selectedClinicaHorario}`); // Usar estado correcto
          } else {
             throw new Error(`Error ${response.status} al obtener horario personalizado`);
          }
        }
        const customScheduleData = response.status !== 404 ? await response.json() : null;
        if (customScheduleData) {
          console.log(`[Horario useEffect] Horario PERSONALIZADO encontrado para Clínica: ${selectedClinicaHorario}`);
          setHorarioEditado(prev => new Map(prev).set(selectedClinicaHorario, customScheduleData as HorarioSemanal));
        } else {
          console.log(`[Horario useEffect] No hay horario personalizado. Cargando horario HEREDADO de Clínica: ${selectedClinicaHorario}`);
          const clinicData = clinics.find(c => c.id === selectedClinicaHorario);
          if (!clinicData) {
            console.error(`[Horario useEffect] No se encontraron datos para la clínica ${selectedClinicaHorario} en el contexto.`);
            toast({ title: "Error", description: "No se encontraron datos de la clínica seleccionada.", variant: "destructive" });
            setHorarioEditado(prev => {
                const mapa = new Map(prev);
                mapa.delete(selectedClinicaHorario);
                return mapa;
            });
      return;
    }
          let horarioBaseClinica: HorarioSemanal | null = null;
          const templateBlocks = clinicData.linkedScheduleTemplate?.blocks;
          const independentBlocks = clinicData.independentScheduleBlocks;
          const defaultOpen = clinicData.openTime || "00:00";
          const defaultClose = clinicData.closeTime || "23:59";
          if (templateBlocks && templateBlocks.length > 0) {
            console.log(`[Horario useEffect] Clínica ${selectedClinicaHorario} usa plantilla. Convirtiendo bloques de plantilla.`);
            // CORREGIDO: Pasar clinicId a la función
            horarioBaseClinica = convertBlocksToWeekSchedule(selectedClinicaHorario, templateBlocks, defaultOpen, defaultClose);
          } else if (independentBlocks && independentBlocks.length > 0) {
            console.log(`[Horario useEffect] Clínica ${selectedClinicaHorario} usa bloques independientes. Convirtiendo bloques independientes.`);
            // CORREGIDO: Pasar clinicId a la función
            horarioBaseClinica = convertBlocksToWeekSchedule(selectedClinicaHorario, independentBlocks as any, defaultOpen, defaultClose);
          } else {
            console.log(`[Horario useEffect] Clínica ${selectedClinicaHorario} no tiene bloques definidos. Creando horario por defecto L-V ${defaultOpen}-${defaultClose}.`);
            // CORREGIDO: Pasar clinicId a la función
            horarioBaseClinica = createDefaultClinicSchedule(selectedClinicaHorario, defaultOpen, defaultClose);
          }
          if (horarioBaseClinica) {
            console.log(`[Horario useEffect] Estableciendo horario HEREDADO para Clínica: ${selectedClinicaHorario}`);
            setHorarioEditado(prev => new Map(prev).set(selectedClinicaHorario, horarioBaseClinica));
            setHorarioSemanal(prev => new Map(prev).set(selectedClinicaHorario, horarioBaseClinica));
            setIsHorarioHeredado(true);
          } else {
              console.error("[Horario useEffect] No se pudo determinar el horario base de la clínica.");
               setHorarioEditado(prev => {
                const mapa = new Map(prev);
                mapa.delete(selectedClinicaHorario);
                return mapa;
               });
          }
        }
      } catch (error) {
        console.error(`[Horario useEffect] Error al cargar horario para Usuario: ${userId}, Clínica: ${selectedClinicaHorario}:`, error); // Usar estado correcto
        toast({ title: "Error", description: "No se pudo cargar el horario para esta clínica.", variant: "destructive" }); // CORREGIDO: toast es ahora una función
        setHorarioEditado(prev => {
            const mapa = new Map(prev);
            mapa.delete(selectedClinicaHorario); // Usar estado correcto
            return mapa;
        });
        setHorarioSemanal(prev => { // Actualizar también si es necesario
            const mapa = new Map(prev);
            mapa.delete(selectedClinicaHorario);
            return mapa;
        });
      } finally {
        setIsLoadingHorario(false);
      }
    };
    cargarHorario();
  }, [userId, selectedClinicaHorario, clinics, toast]); // Depender de clinics por si cambian

  // --- Funciones auxiliares (DEFINICIÓN ÚNICA) ---

  // Placeholder para calcularHorasTotales
  const calcularHorasTotales = (horarios: Map<string, HorarioDia[]>) => {
      console.warn("calcularHorasTotales no implementada completamente");
      return { totalPorClinica: new Map(), totalGlobal: 0 };
  };

  // Placeholders para funciones handle... (Añadir lógica real)
  const handleRemoveClinica = (clinicId: string) => { 
      setPermisosClinicas(prev => {
          const newMap = new Map(prev);
          newMap.delete(clinicId);
          return newMap;
      });
      setSelectedClinicas(prev => prev.filter(id => id !== clinicId));
      if (selectedClinicaHorario === clinicId) {
          setSelectedClinicaHorario("");
      }
      console.log("handleRemoveClinica (UI)", clinicId); 
  };
  const handleAddClinica = (clinicId: string, perfilId: string) => { 
      if (!clinicId || !perfilId) return; 
      setPermisosClinicas(prev => {
          const newMap = new Map(prev);
          const rolesActuales = newMap.get(clinicId) || [];
          if (!rolesActuales.includes(perfilId)) { 
             newMap.set(clinicId, [...rolesActuales, perfilId]);
          }
          return newMap;
      });
      setSelectedClinicas(prev => Array.from(new Set([...prev, clinicId]))); 
      setNuevaClinicaId("");
      setNuevoPerfilClinica("");
      console.log("handleAddClinica (UI)", clinicId, perfilId); 
  };
  const handleToggleDia = (clinicId: string, dia: string, activo: boolean) => { console.log("handleToggleDia", clinicId, dia, activo); };
  const handleRemoveFranja = (clinicId: string, dia: string, franjaId: string) => { console.log("handleRemoveFranja", clinicId, dia, franjaId); };
  const handleRemoveExcepcion = (excepcionId: string) => { console.log("handleRemoveExcepcion", excepcionId); };
  const handleRemoveHabilidad = (clinicId: string, habilidadNombre: string) => { console.log("handleRemoveHabilidad", clinicId, habilidadNombre); };
  const handleAddHabilidad = () => { console.log("handleAddHabilidad"); };

  // Ajustar convertBlocksToWeekSchedule para que coincida con el tipo HorarioSemanal esperado
  // (Asumiendo que HorarioSemanal es un objeto con claves de día, no un array)
  // CORREGIDO: Función ahora devuelve HorarioSemanal { clinicaId, dias: HorarioDia[] }
  const convertBlocksToWeekSchedule = (
      clinicaId: string, // AÑADIDO clinicId
      blocks: any[] | undefined | null,
      defaultOpenTime: string, // Mantener parámetros originales
      defaultCloseTime: string
  ): HorarioSemanal | null => {
      if (!blocks || blocks.length === 0) {
          console.warn("[convertBlocksToWeekSchedule] No blocks provided for clinic", clinicaId, ", returning null schedule.");
          return null;
      }
      
      // CORREGIDO: Inicializar array de HorarioDia
      const diasSemana: HorarioDia[] = [
          { dia: 'lunes', franjas: [], activo: false },
          { dia: 'martes', franjas: [], activo: false },
          { dia: 'miercoles', franjas: [], activo: false },
          { dia: 'jueves', franjas: [], activo: false },
          { dia: 'viernes', franjas: [], activo: false },
          { dia: 'sabado', franjas: [], activo: false },
          { dia: 'domingo', franjas: [], activo: false }
      ];

      blocks.forEach((block) => {
          if (!block.dayOfWeek) {
              console.warn("[convertBlocksToWeekSchedule] Block is missing dayOfWeek:", block);
              return; // Saltar este bloque
          }
          const dayKey = block.dayOfWeek.toLowerCase() as HorarioDia['dia'];
          const diaIndex = diasSemana.findIndex(d => d.dia === dayKey);

          if (diaIndex !== -1) {
              if (block.startTime && block.endTime) {
                  // CORREGIDO: Usar 'franjas' y 'activo'
                  diasSemana[diaIndex].activo = true; 
                  // Crear FranjaHoraria - Asumir que block tiene id o generar uno?
                  // Por ahora usamos inicio+fin como ID improvisado si block.id no existe
                  const franja: FranjaHoraria = {
                      id: block.id || `${block.startTime}-${block.endTime}`, 
                      inicio: block.startTime, 
                      fin: block.endTime 
                  };
                  diasSemana[diaIndex].franjas.push(franja);
                  
      } else {
                  console.warn(`[convertBlocksToWeekSchedule] Block for ${dayKey} is missing start or end time:`, block);
              }
          } else {
              console.warn(`[convertBlocksToWeekSchedule] Invalid day key encountered: ${dayKey}`);
          }
      });

      // Ordenar franjas y asegurar estado 'activo'
      diasSemana.forEach(dia => {
          if (dia.franjas.length > 0) {
              dia.activo = true;
              dia.franjas.sort((a, b) => a.inicio.localeCompare(b.inicio));
          } else {
              dia.activo = false; // Asegurar que sea false si no hay franjas
          }
      });
      
      // CORREGIDO: Devolver estructura HorarioSemanal
      return { clinicaId, dias: diasSemana };
  };


  // Ajustar createDefaultClinicSchedule para que coincida con el tipo HorarioSemanal esperado
  // CORREGIDO: Función ahora devuelve HorarioSemanal { clinicaId, dias: HorarioDia[] }
  const createDefaultClinicSchedule = (
      clinicaId: string, // AÑADIDO clinicId
      openTime: string, 
      closeTime: string
  ): HorarioSemanal => {
      const defaultFranja: FranjaHoraria = { id: 'default', inicio: openTime, fin: closeTime };
      // CORREGIDO: Crear array de HorarioDia
      const diasSemana: HorarioDia[] = [
          { dia: 'lunes', franjas: [defaultFranja], activo: true },
          { dia: 'martes', franjas: [defaultFranja], activo: true },
          { dia: 'miercoles', franjas: [defaultFranja], activo: true },
          { dia: 'jueves', franjas: [defaultFranja], activo: true },
          { dia: 'viernes', franjas: [defaultFranja], activo: true },
          { dia: 'sabado', franjas: [], activo: false },
          { dia: 'domingo', franjas: [], activo: false },
      ];
      // CORREGIDO: Devolver estructura HorarioSemanal
      return { clinicaId, dias: diasSemana };
  }
  // --- Fin Funciones auxiliares ---

  // Memoizar opciones de clínicas para SelectClinica (si 'clinics' cambia frecuentemente)
  const opcionesClinicasAsignadas = useMemo(() => {
     return clinics
         .filter(c => selectedClinicas.includes(String(c.id))) // Filtrar por las asignadas
         .map(c => ({ 
            id: String(c.id), 
            label: `${c.prefix} - ${c.name}${c.isActive ? '' : ' (Inactiva)'}` 
         }));
  }, [clinics, selectedClinicas]);

  // Memoizar opciones para añadir clínica en Permisos
  const opcionesClinicasParaAnadir = useMemo(() => {
     return clinics
         .filter(c => showDisabledClinics ? true : c.isActive) // Filtrar por activas/todas
         .filter(c => !selectedClinicas.includes(String(c.id))) // Excluir ya asignadas
         .map(c => ({ 
            id: String(c.id), 
            label: `${c.prefix} - ${c.name}${c.isActive ? '' : ' (Inactiva)'}` 
         }));
  }, [clinics, selectedClinicas, showDisabledClinics]);

  // Memoizar opciones para añadir habilidad (reutiliza asignadas?)
   const opcionesClinicasHabilidad = useMemo(() => {
     // Usar las mismas que para horario o todas las disponibles? Por ahora usamos las asignadas.
     return opcionesClinicasAsignadas; 
   }, [opcionesClinicasAsignadas]);


  if (loading && userId !== 'nuevo') { // Añadir chequeo para 'nuevo'
    // Mostrar el Skeleton mientras carga
    return <UsuarioPageSkeleton />;
  }

  // --- NUEVA FUNCIÓN DE GUARDADO ---
  const handleGuardarUsuario = async () => {
    // --- Validaciones ---
    if (!firstName.trim()) {
      toast({ title: "Error", description: "El nombre es obligatorio.", variant: "destructive" });
      setActiveTab('datos-personales'); 
      return;
    }
    /* // COMENTADO TEMPORALMENTE hasta definir campos obligatorios
     if (!lastName.trim()) { 
      toast({ title: "Error", description: "El apellido es obligatorio.", variant: "destructive" });
      setActiveTab('datos-personales');
      return;
    }
    */
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) { 
      toast({ title: "Error", description: "El formato del email no es válido.", variant: "destructive" });
      setActiveTab('datos-personales');
      return;
    }
    if (email !== confirmEmail) {
      toast({ title: "Error", description: "Los emails no coinciden.", variant: "destructive" });
      setActiveTab('datos-personales');
      return;
    }
    if (userId === 'nuevo' && !contrasena) {
      toast({ title: "Error", description: "La contraseña es obligatoria para crear un nuevo usuario.", variant: "destructive" });
      setActiveTab('datos-personales');
      return;
    }

    setIsSaving(true);
    try {
      // --- Payload Base (Común para crear y actualizar, EXCEPTO contraseña) ---
      const basePayload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: telefono.trim() || null,
        isActive: isActive,
        dni: dni.trim() || null,
        // Enviar fecha como null si está vacía, o en formato yyyy-mm-dd
        fechaNacimiento: fechaNacimiento ? fechaNacimiento : null, 
        sexo: sexo || null,
        telefono2: telefono2.trim() || null,
        idioma: idioma || null,
        colegio: colegio.trim() || null,
        numeroColegiado: numeroColegiado.trim() || null,
        especialidad: especialidad.trim() || null,
        universidad: universidad.trim() || null,
        direccion: direccion.trim() || null,
        provincia: provincia.trim() || null,
        pais: pais.trim() || null,
        localidad: localidad.trim() || null,
        cp: cp.trim() || null,
        exportCsv: exportCsv === "true", // Convertir string a boolean
        indiceControl: indiceControl || null,
        numeroPIN: numeroPIN.trim() || null,
        notas: notas.trim() || null,
        // Añadir campos de checkboxes (ajustar nombres si es necesario)
        mostrarDesplazados: mostrarDesplazados,
        mostrarCitasPropias: mostrarCitasPropias,
        restringirIP: restringirIP,
        deshabilitado: deshabilitado, // ¿Relacionado con isActive? Verificar si API lo usa
      };

      if (userId === 'nuevo') {
        // --- Crear Usuario ---
        const newUserPayload = {
          ...basePayload,
          password: contrasena, // Añadir contraseña SOLO al crear
        };
        console.log("[handleGuardarUsuario] Creando usuario con payload:", newUserPayload);
        // ASUNCIÓN: createUsuario espera un objeto compatible con basePayload + password
        const createdUser = await createUsuario(newUserPayload as any); // Cast si es necesario

        if (createdUser) {
          toast({ title: "Éxito", description: "Usuario creado correctamente." });
          router.replace(`/configuracion/usuarios/${createdUser.id}?returnTo=${encodeURIComponent(returnToBase)}`); 
        } else {
          console.error("[handleGuardarUsuario] createUsuario retornó null o false.");
          // El toast de error debería venir del contexto
        }

      } else {
        // --- Actualizar Usuario ---
        
        // 1. Preparar asignaciones de clínicas/roles (igual que antes)
        let clinicAssignmentsPayload: { clinicId: string, roleId: string }[] | undefined = undefined;
        let permisosHanCambiado = false;

        // DEBUG: Log estados antes de comparar
        console.log("[handleGuardarUsuario] DEBUG: initialPermisosClinicas:", initialPermisosClinicas);
        console.log("[handleGuardarUsuario] DEBUG: permisosClinicas (actuales):", permisosClinicas);

        if (permisosClinicas.size !== initialPermisosClinicas.size) {
            permisosHanCambiado = true;
            console.log("[handleGuardarUsuario] DEBUG: Permisos cambiados (diferente tamaño)");
        } else {
            for (const [clinicId, roles] of permisosClinicas) {
                // DEBUG: Log comparación de roles para cada clínica
                const initialRoles = initialPermisosClinicas.get(clinicId);
                console.log(`[handleGuardarUsuario] DEBUG: Comparando roles para clínica ${clinicId}. Actual:`, roles, "Inicial:", initialRoles);
                if (!initialPermisosClinicas.has(clinicId) || !arraysEqual(roles, initialRoles!)) {
                    permisosHanCambiado = true;
                    console.log(`[handleGuardarUsuario] DEBUG: Permisos cambiados (diferencia detectada en clínica ${clinicId})`);
                    break;
                }
            }
        }
        console.log("[handleGuardarUsuario] DEBUG: ¿Permisos han cambiado?", permisosHanCambiado);

        if (permisosHanCambiado) {
            clinicAssignmentsPayload = [];
            permisosClinicas.forEach((roles, clinicId) => {
                if (roles && roles.length > 0) { 
                    // roles[0] ahora debería contener el CUID del rol gracias a la UI actualizada
                    const roleIdToSend = roles[0]; // <-- CONFIRMADO: esto es el ID (CUID)
                    clinicAssignmentsPayload?.push({ clinicId, roleId: roleIdToSend });
                } else {
                    // Si una clínica se queda sin roles, ¿deberíamos eliminar la asignación?
                    // La lógica actual de la API PUT (borrar todo y recrear) maneja esto,
                    // pero si la API cambiara, habría que enviar explícitamente la eliminación.
                    console.warn(`[handleGuardarUsuario] Clínica ${clinicId} no tiene roles, no se incluirá en payload.`);
                }
            });
            console.log("[handleGuardarUsuario] Permisos modificados. Enviando clinicAssignments:", clinicAssignmentsPayload);
        } else {
             console.log("[handleGuardarUsuario] Permisos no modificados. No se enviará clinicAssignments.");
        }

        // 2. Combinar payload base y asignaciones (si cambiaron)
        const finalUpdatePayload = { 
            ...basePayload, 
            ...(clinicAssignmentsPayload !== undefined && { clinicAssignments: clinicAssignmentsPayload })
        };

        // 3. Llamar a la API de actualización
        console.log(`[handleGuardarUsuario] Actualizando usuario ${userId} con payload:`, JSON.stringify(finalUpdatePayload, null, 2)); // Log formateado
        const updatedUser = await updateUsuario(userId, finalUpdatePayload as Partial<Omit<Usuario, 'id' | 'createdAt' | 'updatedAt' | 'systemId'>>); 

        // DEBUG: Log resultado de la actualización
        console.log("[handleGuardarUsuario] DEBUG: Resultado de updateUsuario:", updatedUser);

        if (updatedUser) {
          toast({ title: "Éxito", description: "Cambios guardados correctamente." });
          // Actualizar estado inicial de permisos
           if (clinicAssignmentsPayload !== undefined) {
                setInitialPermisosClinicas(new Map(permisosClinicas));
           }
        } else {
          console.error("[handleGuardarUsuario] updateUsuario retornó null o false.");
          // El toast de error debería venir del contexto
        }
      }
    } catch (error) {
      console.error("[handleGuardarUsuario] Error:", error);
      toast({ title: "Error", description: `Ocurrió un error inesperado: ${error instanceof Error ? error.message : String(error)}`, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  // --- Fin NUEVA FUNCIÓN DE GUARDADO ---

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
                    value={contrasena} // AÑADIDO value
                    onChange={(e) => setContrasena(e.target.value)} // AÑADIDO onChange
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
                  {/* CORREGIDO: Usar string "true"/"false" para value y onValueChange */}
                  <Select value={exportCsv} onValueChange={setExportCsv}>
                    <SelectTrigger id="exportCsv" className="h-9">
                      <SelectValue placeholder="Seleccione una opción" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Sí</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                      {/* Mantener opción original si es necesaria */}
                      {/* <SelectItem value=":">:</SelectItem>  */}
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
                      checked={mostrarDesplazados} // AÑADIDO estado
                      onCheckedChange={(checked) => setMostrarDesplazados(checked === true)} // AÑADIDO estado
                    />
                    <Label htmlFor="mostrarDesplazados" className="text-sm">No mostrar en desplazados</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="mostrarCitasPropias"
                      checked={mostrarCitasPropias} // AÑADIDO estado
                      onCheckedChange={(checked) => setMostrarCitasPropias(checked === true)} // AÑADIDO estado
                    />
                    <Label htmlFor="mostrarCitasPropias" className="text-sm">Mostrar únicamente las citas propias</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="restringirIP"
                      checked={restringirIP} // AÑADIDO estado
                      onCheckedChange={(checked) => setRestringirIP(checked === true)} // AÑADIDO estado
                    />
                    <Label htmlFor="restringirIP" className="text-sm">Restringir IP</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="deshabilitado" 
                      checked={deshabilitado} // AÑADIDO estado (conectar con isActive?)
                      onCheckedChange={(checked) => setDeshabilitado(checked === true)} // AÑADIDO estado
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
                  // Modificar opciones para filtrar y mostrar inactivas
                  options={clinics
                    .filter(c => showDisabledClinics ? true : c.isActive) // Filtrar por activas/todas
                    .filter(c => !selectedClinicas.includes(String(c.id))) // Excluir ya asignadas
                    .map(c => ({ 
                       id: String(c.id), 
                       label: `${c.prefix} - ${c.name}${c.isActive ? '' : ' (Inactiva)'}` // Añadir indicador
                    }))}
                  placeholder="Seleccionar clínica"
                />
                {/* Checkbox para mostrar inactivas */}
                <div className="flex items-center pt-1 space-x-2">
                  <Checkbox 
                    id="show-disabled-clinics-perms" 
                    checked={showDisabledClinics}
                    onCheckedChange={(checked) => setShowDisabledClinics(checked === true)}
                  />
                  <Label htmlFor="show-disabled-clinics-perms" className="text-xs text-gray-600 cursor-pointer">
                    Mostrar clínicas desactivadas
                  </Label>
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Seleccionar Perfil</Label>
                <MemoizedSelect 
                  value={nuevoPerfilClinica} // <-- Almacenará el ID del rol
                  onChange={setNuevoPerfilClinica} // <-- Guarda el ID del rol
                  placeholder="Seleccionar perfil"
                  disabled={isLoadingRoles} // Deshabilitar si los roles están cargando
                >
                   {/* Iterar sobre availableRoles obtenidos del contexto */}
                   {availableRoles.map(role => (
                    // El value es el ID (CUID), el texto es el nombre
                    <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                  ))}
                  {/* Mostrar mensaje si no hay roles o están cargando */} 
                  {isLoadingRoles && <SelectItem value="loading" disabled>Cargando roles...</SelectItem>}
                  {!isLoadingRoles && availableRoles.length === 0 && <SelectItem value="no_roles" disabled>No hay roles disponibles</SelectItem>}
                </MemoizedSelect>
              </div>
              <Button 
                size="sm" 
                onClick={() => handleAddClinica(nuevaClinicaId, nuevoPerfilClinica)} // handleAddClinica ahora recibe ID de rol
                disabled={!nuevaClinicaId || !nuevoPerfilClinica || isLoadingRoles} // Deshabilitar si falta algo o cargando roles
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
            <Label className="block mb-2 text-sm font-medium">Seleccionar Clínica para ver/editar horario</Label>
            <SelectClinica
              value={selectedClinicaHorario}
              onChange={(value) => {
                setSelectedClinicaHorario(value);
                // Opcional: Resetear sub-pestaña al cambiar de clínica?
                // setHorarioSubTab('semanal'); 
              }}
              // Modificar opciones para usar solo clínicas asignadas
              options={clinics
                 .filter(c => selectedClinicas.includes(String(c.id))) // Filtrar por las asignadas
                 .map(c => ({ 
                    id: String(c.id), 
                    label: `${c.prefix} - ${c.name}${c.isActive ? '' : ' (Inactiva)'}` // Mantener indicador
                 }))
              }
              placeholder="Seleccione una clínica asignada"
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
                  { (horarioEditado.get(selectedClinicaHorario)?.dias || []).map((dia) => (
                      <div key={dia.dia} className="pb-3 mb-3 border-b last:border-b-0 last:pb-0">
                          <div className="flex items-center justify-between mb-2">
                              <span className="font-medium capitalize">{traducirDia(dia.dia)}</span>
                              <Switch
                                  checked={dia.activo} // CORREGIDO: usar dia.activo
                                  onCheckedChange={(checked) => {
                                      handleToggleDia(selectedClinicaHorario, dia.dia, checked) // Usar placeholder
                                  }}
                              />
                          </div>
                          {dia.activo && ( // CORREGIDO: usar dia.activo
                              <div className="pl-4 space-y-2">
                                  {dia.franjas.length === 0 && <p className="text-xs text-gray-500">Día cerrado. Añade una franja horaria.</p>}
                                  {dia.franjas.map((franja) => ( // CORREGIDO: usar dia.franjas
                                      <div key={franja.id} className="flex items-center gap-2 p-2 text-sm border rounded bg-gray-50/50">
                                          {/* CORREGIDO: usar franja.inicio / franja.fin */}
                                          <Input type="time" value={franja.inicio || ''} disabled className="h-8 text-xs w-28"/>
                                          <span>-</span>
                                          <Input type="time" value={franja.fin || ''} disabled className="h-8 text-xs w-28"/>
                                          <div className="ml-auto">
                                              <Button variant="ghost" size="sm" className="p-0 text-blue-600 h-7 w-7 hover:bg-blue-100 hover:text-blue-700" onClick={() => { 
                                                  console.log("Editar franja", dia.dia, franja.id); // Placeholder
                                                  // setEditingFranja({ diaId: dia.dia, franjaId: franja.id, inicio: franja.inicio, fin: franja.fin }); // Adaptar
                                                  // setShowHorarioModal(true); 
                                              }}>
                                                  <Pencil className="w-4 h-4" />
                                              </Button>
                                              <Button variant="ghost" size="sm" className="p-0 text-red-600 h-7 w-7 hover:bg-red-100 hover:text-red-700" onClick={() => { 
                                                  handleRemoveFranja(selectedClinicaHorario, dia.dia, franja.id) // Usar placeholder
                                              }}>
                                                  <Trash className="w-4 h-4" />
                                              </Button>
                                          </div>
                                      </div>
                                  ))}
                                  <Button variant="outline" size="sm" className="w-full text-xs h-7" onClick={() => { 
                                       console.log("Añadir franja", dia.dia); // Placeholder
                                      // setEditingFranja({ diaId: dia.dia, inicio: '09:00', fin: '17:00' }); // Adaptar
                                      // setShowHorarioModal(true); 
                                  }}>
                                      <PlusCircle className="w-3 h-3 mr-1" />
                                      Añadir Franja
                                  </Button>
                              </div>
                          )}
                      </div>
                  )) }
                  {/* FIN Renderizado Horario Semanal */}
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
                  {excepcionesUsuario.length === 0 ? (
                    <p className="text-sm text-center text-gray-500">No hay excepciones definidas para este usuario.</p>
                  ) : (
                    excepcionesUsuario.map(exc => (
                      <div key={exc.id} className="p-3 mb-3 border rounded-md">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                             <p className="font-medium">{exc.nombre || "Excepción sin nombre"}</p>
                             <p className="text-xs text-gray-500">
                               {formatFecha(exc.fechaInicio)} - {formatFecha(exc.fechaFin)}
                             </p>
                          </div>
                          <div>
                            <Button variant="ghost" size="icon" className="w-8 h-8 text-blue-600 hover:bg-blue-100" onClick={() => { 
                              // setEditingExcepcion(exc); // Descomentar
                              // setShowExcepcionModal(true); // Descomentar
                            }}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="w-8 h-8 text-red-600 hover:bg-red-100" onClick={() => { 
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
                  <h4 className="mb-4 text-base font-medium">Vista Consolidada del Horario</h4>
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
                // Pasar un Map vacío temporalmente a calcularHorasTotales para evitar error de tipo
                // La lógica real necesitará adaptar `calcularHorasTotales` o los datos pasados.
                const { totalPorClinica, totalGlobal } = calcularHorasTotales(new Map<string, HorarioDia[]>()); 
                const totalHorasRecomendadas = 40;
                // Usar horarioEditado para obtener datos Clinica (si existe)
                const horarioActualClinica = horarioEditado.get(selectedClinicaHorario);
                // Extraer datos para cálculo (aún necesita la lógica real de calcularHorasTotales)
                const datosClinica = { totalMinutos: 0, diasActivos: 0, porDia: {} as Record<string, number> }; // Placeholder
                
                if (horarioActualClinica && horarioActualClinica.dias) { // CORREGIDO: Acceder a .dias
                    horarioActualClinica.dias.forEach((diaData) => { // CORREGIDO: Iterar sobre .dias
                       if (diaData.activo) { // CORREGIDO: Usar diaData.activo
                           datosClinica.diasActivos++;
                           // Lógica para calcular minutos por día (ejemplo simple)
                           let minutosDia = 0;
                           diaData.franjas.forEach(franja => { // CORREGIDO: Usar diaData.franjas
                               try {
                                   const [hInicio, mInicio] = (franja.inicio || "00:00").split(':').map(Number); // CORREGIDO: franja.inicio
                                   const [hFin, mFin] = (franja.fin || "00:00").split(':').map(Number); // CORREGIDO: franja.fin
                                   minutosDia += (hFin * 60 + mFin) - (hInicio * 60 + mInicio);
                               } catch { /* Ignorar franja inválida */ }
                           });
                           datosClinica.porDia[diaData.dia] = minutosDia; // CORREGIDO: usar diaData.dia como clave
                           datosClinica.totalMinutos += minutosDia;
                       } else {
                            datosClinica.porDia[diaData.dia] = 0; // CORREGIDO: usar diaData.dia como clave
                       }
                    });
                }
                
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
                         {['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].map(dia => ( // Usar claves reales
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
                         className="w-full mt-3 text-xs h-7"
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
                 value={searchHabilidades} // AÑADIDO estado
                 onChange={(e) => setSearchHabilidades(e.target.value)} // AÑADIDO estado
                 className="max-w-xs h-9"
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
                   value={nuevaClinicaHabilidad} // AÑADIDO estado
                   onChange={setNuevaClinicaHabilidad} // AÑADIDO estado
                   options={opcionesClinicasHabilidad} // Usar opciones memoizadas
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
                   // CORREGIDO: Usar estados nuevaFamilia/nuevoServicio
                   value={tipoSeleccion === 'familia' ? nuevaFamilia : nuevoServicio} 
                   // CORREGIDO: Usar estados setNuevaFamilia/setNuevoServicio
                   onChange={tipoSeleccion === 'familia' ? setNuevaFamilia : setNuevoServicio} 
                   placeholder={tipoSeleccion === 'familia' ? 'Seleccionar familia' : 'Seleccionar servicio'}
                   disabled={!nuevaClinicaHabilidad} // CORREGIDO: Usar estado
                 >
                   {tipoSeleccion === 'familia' 
                     // CORREGIDO: Usar placeholder FAMILIAS_MOCK
                     ? (FAMILIAS_MOCK.map((familia: FamiliaServicio) => ( 
                         <SelectItem key={String(familia.id)} value={String(familia.id)}> 
                           {familia.name} {/* <-- Usar 'name' */}
                         </SelectItem>
                       )))
                       // CORREGIDO: Usar placeholder SERVICIOS_MOCK y adaptar a su estructura
                     : (Object.values(SERVICIOS_MOCK).flat().map((servicio: ServicioInterface) => ( 
                          <SelectItem key={servicio.id} value={String(servicio.id)}>{servicio.name}</SelectItem> // Asumir id y name en ServicioInterface
                        )))
                   }
                   {/* Mensaje si no hay opciones? */}
                 </MemoizedSelect>
               </div>
               
               {/* Botón Añadir */}
               <Button 
                 size="sm" 
                 onClick={handleAddHabilidad} // CORREGIDO: Usar placeholder
                 // CORREGIDO: Usar estados
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
                    {/* Datos de ejemplo - Reemplazar con datos reales */}
                    <TableRow>
                      <TableCell className="py-2 font-medium">--/--/----</TableCell>
                      <TableCell className="py-2">--:--</TableCell>
                      <TableCell className="py-2">--:--</TableCell>
                      <TableCell className="py-2">--</TableCell>
                      <TableCell className="py-2">--</TableCell>
                      <TableCell className="py-2">-</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              
              <div className="p-3 rounded-md bg-gray-50">
                <h4 className="mb-2 text-sm font-medium">Resumen del mes</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                   {/* Datos de ejemplo - Reemplazar con datos reales */}
                  <div>
                    <p className="text-gray-500">Días trabajados</p>
                    <p className="font-medium">0</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Total horas</p>
                    <p className="font-medium">0h 0m</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Media diaria</p>
                    <p className="font-medium">0h 0m</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs> {/* <- CIERRE CORRECTO DE Tabs PRINCIPAL */}
      
      {/* Botones flotantes de acción */}
      <div className="fixed bottom-0 left-0 right-0 z-10 p-4 bg-white border-t shadow-lg md:sticky md:bottom-auto md:left-auto md:right-auto md:z-auto md:p-0 md:bg-transparent md:border-none md:shadow-none md:mt-6">
        <div className="container flex justify-end max-w-5xl gap-2 mx-auto">
          <Button 
            variant="outline" 
            onClick={() => router.push(returnTo)} // Usar returnTo calculado
            disabled={isSaving} // Deshabilitar cancelar mientras guarda? Opcional
            className="flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Cancelar
          </Button>
          <Button 
             // MODIFICADO: Llamar a handleGuardarUsuario
             onClick={handleGuardarUsuario} 
             disabled={isSaving || loading || isLoadingRoles} // Deshabilitar si carga datos iniciales, roles, o está guardando
             className="flex items-center gap-1"
          >
            {isSaving ? (
                <svg className="w-4 h-4 mr-1 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
             ) : <Save className="w-4 h-4" />}
             {isSaving ? "Guardando..." : (userId === 'nuevo' ? "Crear Usuario" : "Guardar Cambios")}
          </Button>
        </div>
      </div>

      {/* Modales (Definición y lógica comentada o como placeholders) */}
      {/* Modal para editar/añadir franja horaria */}
      {/* {showHorarioModal && ( ... )} */}

      {/* Modal para editar/añadir excepción horaria */}
      {/* {showExcepcionModal && ( ... )} */}

    </div>
  )
} 