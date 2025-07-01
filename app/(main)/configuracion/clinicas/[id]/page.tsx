"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CabinEditDialog } from "@/components/cabin-edit-dialog"
import { useClinic } from "@/contexts/clinic-context"
import {
  // findActiveExceptions,
  // createExampleException,
  // applyExampleException
} from "@/services/clinic-schedule-service"
import type { WeekSchedule, DaySchedule, TimeRange } from "@/types/schedule"
import { saveToStorage } from "@/utils/storage-utils"
import { DebugStorage } from "@/components/debug-storage"
import { useEquipment } from "@/contexts/equipment-context"
import { useTarif } from "@/contexts/tarif-context"
import { UsuariosClinica } from "@/components/usuarios-clinica"
import { Prisma, DayOfWeek } from '@prisma/client'
import type { Cabin, Clinic as PrismaClinic } from '@prisma/client'
import { Skeleton } from "@/components/ui/skeleton"
import type { Tariff as PrismaTariff } from '@prisma/client';
import { SearchInput } from "@/components/SearchInput"
import { ScheduleConfig } from "@/components/schedule-config"
import { DEFAULT_SCHEDULE } from "@/types/schedule"
import { useTemplates } from "@/hooks/use-templates"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Building2, Bed, Cog, Users, CreditCard, 
  LinkIcon as LucideLinkIcon, Percent, MessageSquare, Mail, Phone, Globe, 
  ArrowLeft, HelpCircle, Save, MapPin, BarChart2, Search, Plus, 
  ChevronUp, ChevronDown, Trash2, Clock, Database, FolderOpen, Tag, 
  Settings2, LayoutGrid, Wrench, HardDrive, X, Calendar, AlertCircle, 
  AlertTriangle, PlusCircle, Loader2, ArrowUpDown
} from "lucide-react"
import { cn } from "@/lib/utils"
import { convertBlocksToWeekSchedule, createDefaultSchedule } from "@/utils/scheduleUtils"
import { debounce } from 'lodash';
import type { Equipment } from "@prisma/client";
import type { ClinicaApiOutput } from "@/lib/types/api-outputs";
import { CountryInfo } from "@prisma/client";
import { ActionButtons } from '@/app/components/ui/action-buttons';
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
// Importaciones para equipamiento de clínica específica
import { useEquipmentQuery, useEquipmentWithAssignmentsQuery, type EquipmentWithClinicAssignments } from "@/lib/hooks/use-equipment-query";
import { EquipmentModal } from "@/components/equipment";
import { useLegalEntitiesQuery } from "@/lib/hooks/use-legal-entity-query";
// Card components are already imported earlier, removing duplicate.
import type { ScheduleTemplateBlock as PrismaScheduleTemplateBlock, ClinicScheduleBlock as PrismaClinicScheduleBlock } from '@prisma/client';
import type { ScheduleTemplate } from '@prisma/client'; 
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { BankDataTable } from '@/app/(main)/configuracion/bancos/components/data-table';
import { type Bank } from '@/app/(main)/configuracion/bancos/components/columns';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
// <<< AÑADIR IMPORTACIONES FALTANTES >>>
import React from 'react'; // Importar React explícitamente
import { getClinicPaymentSettings } from "@/lib/api/clinicPaymentSettings";
import { getClinicPaymentSettingColumns } from "./components/clinic-payment-settings/columns";
import { ClinicPromotionsTabContent } from "@/app/(main)/configuracion/clinicas/[id]/components/clinic-promotions-tab" // <<< RUTA ABSOLUTA @/
// <<< ELIMINAR import de ClinicPaymentSettingsTable >>>
// import { ClinicPaymentSettingsTable } from "./components/clinic-payment-settings/data-table";
// <<< AÑADIR import de DataTable genérico >>>
//import { DataTable } from "@/components/ui/data-table";
import type { ClinicPaymentSettingWithRelations } from "@/lib/api/clinicPaymentSettings";
import { toast } from "sonner"
// <<< AÑADIR import del diálogo de edición (si existe) >>>
// import { ClinicPaymentSettingEditDialog } from "./components/clinic-payment-settings/edit-dialog"; 
// --- FIN IMPORTACIONES FALTANTES ---

// --- Tipos locales temporales para modal de excepciones (Refactorizar en el futuro) ---
interface FranjaHorariaLocal {
  id: string;
  inicio: string;
  fin: string;
}

interface HorarioDiaLocal {
  dia: 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';
  franjas: FranjaHorariaLocal[];
  activo: boolean;
}

interface ExcepcionHorariaLocal {
  id: string;
  clinicaId?: string; // Hacer opcional si no siempre se usa
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  dias: HorarioDiaLocal[];
}
// --- Fin Tipos locales temporales ---

// --- Función de utilidad Debounce ---
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<F>): void => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => func(...args), waitFor);
  };
}
// --- Fin Debounce ---

const menuItems = [
  { id: "datos", label: "Datos de la clínica", icon: Building2 },
  { id: "horarios", label: "Horarios", icon: Clock },
  { id: "excepciones", label: "Excepciones Horario", icon: Calendar },
  { id: "usuarios", label: "Usuarios", icon: Users },
  { id: "tarifa", label: "Tarifa", icon: Tag },
  { id: "entidades", label: "Entidades bancarias", icon: CreditCard },
  { id: "pagos", label: "Metodos de Pago", icon: CreditCard },
  { id: "integraciones", label: "Integraciones", icon: LucideLinkIcon }, // <<< USAR EL ALIAS
  { id: "descuentos", label: "Descuentos", icon: Percent },
  { id: "sms", label: "SMS/Push", icon: MessageSquare },
  { id: "email", label: "Notificaciones e-mail", icon: Mail },
  { id: "whatsapp", label: "Notificaciones WhatsApp", icon: Phone },
  { id: "otros", label: "Otros APIs", icon: Globe },
  { id: "sedes", label: "Sedes", icon: MapPin },
  { id: "cabinas", label: "Cabinas", icon: LayoutGrid },
  { id: "equipamiento", label: "Equipamiento", icon: Wrench },
  { id: "almacenamiento", label: "Almacenamiento", icon: HardDrive },
  { id: "depuracion", label: "Depuración", icon: Trash2 },
]

const SectionTitle = ({ icon: Icon, title, color }: { icon: any; title: string; color: string }) => (
  <div className={`flex items-center pb-2 mb-4 space-x-2 border-b ${color}`}>
    <Icon className="w-5 h-5" />
    <h3 className={`text-lg font-medium ${color}`}>{title}</h3>
  </div>
)

// <<< INICIO DATOS MOCK PAÍSES (Copiar de usuarios) >>>
const COUNTRIES_MOCK = [
  { isoCode: 'ES', name: 'España', phoneCode: '+34' },
  { isoCode: 'FR', name: 'Francia', phoneCode: '+33' },
  { isoCode: 'PT', name: 'Portugal', phoneCode: '+351' },
  { isoCode: 'GB', name: 'Reino Unido', phoneCode: '+44' },
  { isoCode: 'DE', name: 'Alemania', phoneCode: '+49' },
  { isoCode: 'IT', name: 'Italia', phoneCode: '+39' },
];
// <<< FIN DATOS MOCK PAÍSES >>>

// --- COPIAR/ADAPTAR fetchBanks ---
// (Podríamos mover esto a lib/api o un hook personalizado más adelante)
async function fetchBanks(clinicId?: string): Promise<Bank[]> {
  let apiUrl = '/api/banks';
  if (clinicId) {
    apiUrl += `?clinicId=${encodeURIComponent(clinicId)}`;
  }
  const response = await fetch(apiUrl);
  if (!response.ok) {
    let errorMsg = `Error ${response.status}: ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMsg = errorBody.message || errorMsg;
    } catch (e) { /* Ignorar */ }
    throw new Error(errorMsg);
  }
  return response.json() as Promise<Bank[]>;
}
// --- FIN fetchBanks ---

// --- NUEVO COMPONENTE PARA EL CONTENIDO DE LA PESTAÑA DE BANCOS ---
interface ClinicBanksTabContentProps {
  clinicId: string;
}

function ClinicBanksTabContent({ clinicId }: ClinicBanksTabContentProps) {
  const { t } = useTranslation();
  
  const { 
    data: banksData = [], 
    isLoading, 
    isError, 
    error 
  } = useQuery<Bank[], Error>({
    queryKey: ['banks', clinicId], 
    queryFn: () => fetchBanks(clinicId),
  });

  if (isError) {
    return (
      <Alert variant="destructive" className="mt-4">
        {/* Usar AlertCircle directamente */}
        <AlertCircle className="w-4 h-4" /> 
        <AlertTitle>{t('common.errors.loadingTitle')}</AlertTitle>
        <AlertDescription>
          {error?.message || t('common.errors.loadingDesc')}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="mt-4 space-y-4">
       <div className="flex justify-between items-center mb-4">
         {/* <h3 className="text-lg font-semibold">{t('config_clinics.banks.title')}</h3> */}
         <p className="text-sm text-muted-foreground">{t('config_clinics.banks.description')}</p>
         {/* Botón Añadir Banco */}
         {/* <<< MODIFICAR Link: quitar legacyBehavior, passHref y añadir asChild >>> */}
         {/* <<< QUITAR asChild para evitar error consola >>> */}
         <Link href="/configuracion/bancos/nuevo">
           <Button variant="default" size="sm" className="bg-purple-600 hover:bg-purple-700">
              {/* El contenido se queda igual, sin span extra */}
              <PlusCircle className="mr-2 w-4 h-4" />
              {t('config_clinics.banks.add_button')}
           </Button>
         </Link>
       </div>
      <BankDataTable data={banksData} isLoading={isLoading} showSelectionStatus={false} />
    </div>
  );
}
// --- FIN NUEVO COMPONENTE ---

// --- NUEVO COMPONENTE PARA PESTAÑA MÉTODOS DE PAGO ---
interface ClinicPaymentsTabContentProps {
  clinicId: string;
}

function ClinicPaymentsTabContent({ clinicId }: ClinicPaymentsTabContentProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient(); // Obtener instancia de QueryClient
  const router = useRouter(); // Hook para navegación
  // <<< ELIMINAR queryClient y estados del diálogo >>>
  // const queryClient = useQueryClient(); 
  // const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  // const [editingSetting, setEditingSetting] = useState<ClinicPaymentSettingWithRelations | null>(null);

  const {
    data: paymentSettings = [],
    isLoading,
    isError,
    error
  } = useQuery<ClinicPaymentSettingWithRelations[], Error>({
    queryKey: ['clinicPaymentSettings', clinicId],
    queryFn: () => getClinicPaymentSettings({ clinicId }),
    enabled: !!clinicId,
  });

  // <<< FUNCIÓN PARA MANEJAR LA EDICIÓN (Navegación) >>>
  const handleEdit = (setting: ClinicPaymentSettingWithRelations) => {
    // Navegar a la página de edición del MÉTODO DE PAGO, pasando el ID de la clínica
    // para que esa página filtre sus datos internos.
    const paymentMethodDefinitionId = setting.paymentMethodDefinitionId;
    if (!paymentMethodDefinitionId) {
        console.error("No paymentMethodDefinitionId found in setting:", setting);
        // Mostrar un toast de error?
        return;
    }
    // <<< CONSTRUIR Y CODIFICAR LA URL DE RETORNO >>>
    const returnUrl = encodeURIComponent(`/configuracion/clinicas/${clinicId}?tab=pagos`);
    // <<< AÑADIR returnTo A LA URL >>>
    router.push(`/configuracion/metodos-pago/${paymentMethodDefinitionId}?filterClinicId=${clinicId}&returnTo=${returnUrl}`);
  };

  // <<< ELIMINAR handleCloseEditDialog >>>
  // const handleCloseEditDialog = ...

  // <<< PASAR handleEdit (la nueva versión) a getClinicPaymentSettingColumns >>>
  const columns = React.useMemo(() => getClinicPaymentSettingColumns(t, handleEdit), [t, clinicId]); // Añadir clinicId como dependencia si se usa en handleEdit

  const redirectToUrl = useMemo(() => {
    if (!clinicId || typeof clinicId !== 'string') {
        console.warn('[ClinicPaymentsTabContent] clinicId no está disponible para crear redirectToUrl');
        return '/configuracion/metodos-pago';
    }
    return encodeURIComponent(`/configuracion/clinicas/${clinicId}?tab=pagos`);
  }, [clinicId]);

  if (isError) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertCircle className="w-4 h-4" />
        <AlertTitle>{t('common.errors.loadingTitle')}</AlertTitle>
        <AlertDescription>
          {error?.message || t('common.errors.loadingDesc')}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    // El div exterior ya tiene overflow-x-auto
    <div className="overflow-x-auto mt-4 space-y-4">
      <div className="flex justify-between items-center mb-4">
         <p className="text-sm text-muted-foreground">{t('config_clinics.payments.description')}</p>
         <Button
             variant="outline"
             size="sm"
             onClick={() => router.push(`/configuracion/metodos-pago/nuevo?redirectBackTo=${redirectToUrl}`)}
          >
              <PlusCircle className="mr-2 w-4 h-4" />
              {t('config_clinics.payments.add_button')}
          </Button>
      </div>

      {/* <<< Contenedor con overflow >>> */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="p-4 space-y-2 w-full">
            <Skeleton className="w-full h-10" />
            <Skeleton className="w-full h-10" />
            <Skeleton className="w-full h-10" />
          </div>
        ) : (
          <DataTable
              columns={columns}
              data={paymentSettings}
          />
        )}
       </div>
      {/* <<< FIN Contenedor con overflow >>> */}

      {/* <<< ELIMINAR RENDERIZADO DEL DIÁLOGO >>> */}
      {/* {editingSetting && ...} */}
    </div>
  );
}
// --- FIN COMPONENTE PESTAÑA MÉTODOS DE PAGO ---

// --- COMPONENTE TABLA DE EQUIPAMIENTO PARA CLÍNICA ESPECÍFICA ---
interface EquipmentTableForClinicProps {
  clinicId: string;
}

// Componente adaptado para mostrar solo asignaciones de la clínica actual
function ClinicSpecificAssignmentsCell({ equipment, clinicId }: { equipment: EquipmentWithClinicAssignments, clinicId: string }) {
  const queryClient = useQueryClient()
  const [assignments, setAssignments] = useState<any[]>([])
  
  // 🔥 ESCUCHAR CAMBIOS DEL CACHE PRINCIPAL (igual que EquipmentAssignmentsCell)
  React.useEffect(() => {
    const updateFromCache = () => {
      const mainCacheData = queryClient.getQueryData(['equipment-with-assignments']) as any[]
      if (mainCacheData) {
        const equipmentFromCache = mainCacheData.find(eq => eq.id === equipment.id)
        if (equipmentFromCache && equipmentFromCache.clinicAssignments) {
          setAssignments(equipmentFromCache.clinicAssignments)
          return
        }
      }
      // Fallback: usar datos de props si no hay cache
      setAssignments(equipment.clinicAssignments || [])
    }
    
    // Actualizar inmediatamente
    updateFromCache()
    
    // Suscribirse a cambios del cache
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      updateFromCache()
    })
    
    return unsubscribe
  }, [equipment.id, clinicId, queryClient, equipment.clinicAssignments])

  const clinicAssignments = assignments.filter(
    assignment => assignment.clinicId === clinicId && assignment.isActive
  )
  
  // Los logs de depuración se han eliminado - el sistema funciona correctamente

  if (clinicAssignments.length === 0) {
    return (
      <div className="text-xs text-gray-500">
        Sin asignación
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-1">
      {clinicAssignments.map((assignment) => (
        <Badge key={assignment.id} variant="secondary" className="text-xs">
          {assignment.deviceName || `Dispositivo ${assignment.serialNumber.slice(-3)}`}
          {assignment.cabin && (
            <span className="ml-1 text-gray-500">({assignment.cabin.name})</span>
          )}
        </Badge>
      ))}
      {clinicAssignments.length > 1 && (
        <div className="mt-1 text-xs text-gray-500">
          {clinicAssignments.length} dispositivos
        </div>
      )}
    </div>
  )
}

function EquipmentTableForClinic({ clinicId }: EquipmentTableForClinicProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentWithClinicAssignments | null>(null)
  
  // Estados para modal de creación
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  
  // Estados para selección múltiple y eliminación
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  
  const [sortColumn, setSortColumn] = useState<string>("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Usar el hook que incluye asignaciones de clínica
  const {
    data: equipmentList = [],
    isLoading: loadingEquipment,
    refetch: refetchEquipment,
  } = useEquipmentWithAssignmentsQuery()

  // Limpiar caché al montar el componente (similar a la página principal)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.includes('equipment') || key.includes('api:/api/equipment')) {
          sessionStorage.removeItem(key);
        }
      });
    }
  }, [clinicId]) // Limpiar cache cuando cambie la clínica

  // Mostrar TODOS los equipos (tabla general), el filtrado se hace en la columna de asignaciones
  const allEquipment = useMemo(() => {
    return equipmentList
  }, [equipmentList])

  // Función para contar asignaciones de esta clínica
  const getClinicAssignmentsCount = (equipment: EquipmentWithClinicAssignments) => {
    return equipment.clinicAssignments?.filter(
      assignment => assignment.clinicId === clinicId && assignment.isActive
    ).length || 0
  }

  // Función para verificar si hay asignaciones en otras clínicas
  const hasAssignmentsInOtherClinics = (equipment: EquipmentWithClinicAssignments) => {
    return equipment.clinicAssignments?.some(
      assignment => assignment.clinicId !== clinicId && assignment.isActive
    ) || false
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const filteredEquipment = allEquipment.filter((item) => {
    const searchLower = searchTerm.toLowerCase()
    
    // Buscar en campos del equipo
    const matchesEquipment = 
      item.name?.toLowerCase().includes(searchLower) ||
      item.description?.toLowerCase().includes(searchLower) ||
      (item.modelNumber?.toLowerCase() || "").includes(searchLower)
    
    // Buscar en asignaciones de esta clínica
    const clinicAssignments = item.clinicAssignments?.filter(a => a.clinicId === clinicId) || []
    const matchesAssignments = clinicAssignments.some(assignment =>
      assignment.deviceName?.toLowerCase().includes(searchLower) ||
      assignment.serialNumber?.toLowerCase().includes(searchLower)
    )
    
    return matchesEquipment || matchesAssignments
  }).sort((a, b) => {
    let aValue: any
    let bValue: any
    
    if (sortColumn === "assignments") {
      aValue = getClinicAssignmentsCount(a)
      bValue = getClinicAssignmentsCount(b)
      const comparison = aValue - bValue
      return sortDirection === "asc" ? comparison : -comparison
    } else {
      aValue = a[sortColumn as keyof typeof a]
      bValue = b[sortColumn as keyof typeof b]
      aValue = String(aValue ?? '').toLowerCase()
      bValue = String(bValue ?? '').toLowerCase()
      const comparison = aValue.localeCompare(bValue)
      return sortDirection === "asc" ? comparison : -comparison
    }
  })

  const openModal = (equipment: EquipmentWithClinicAssignments) => {
    setSelectedEquipment(equipment)
    setIsModalOpen(true)
  }

  const openCreateModal = () => {
    setIsCreateModalOpen(true)
  }

  const handleCreateSuccess = () => {
    // Invalidar cache para actualizar la tabla automáticamente
    refetchEquipment()
    setIsCreateModalOpen(false)
  }

  // Función para verificar si un equipamiento puede eliminarse (sin asignaciones)
  const canBeDeleted = (equipment: EquipmentWithClinicAssignments) => {
    return !equipment.clinicAssignments || equipment.clinicAssignments.length === 0
  }

  // Manejar selección individual
  const handleSelectItem = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(id)
      } else {
        newSet.delete(id)
      }
      return newSet
    })
  }

  // Manejar selección de todos los elementos eliminables
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const deletableIds = filteredEquipment
        .filter(item => canBeDeleted(item))
        .map(item => item.id)
      setSelectedIds(new Set(deletableIds))
    } else {
      setSelectedIds(new Set())
    }
  }

  // Manejar eliminación múltiple
  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return

    const confirmMessage = `¿Estás seguro de que quieres eliminar ${selectedIds.size} equipamiento${selectedIds.size > 1 ? 's' : ''}?`
    if (!confirm(confirmMessage)) return

    setIsDeleting(true)
    try {
      const promises = Array.from(selectedIds).map(id =>
        fetch(`/api/equipment/${id}`, { method: 'DELETE' })
      )
      
      const results = await Promise.all(promises)
      const failedDeletes = results.filter(result => !result.ok)
      
      if (failedDeletes.length > 0) {
        throw new Error(`Error al eliminar ${failedDeletes.length} equipamiento(s)`)
      }

      // Éxito: actualizar tabla y limpiar selección
      await refetchEquipment()
      setSelectedIds(new Set())
      
      if (selectedIds.size === 1) {
        toast("Equipamiento eliminado correctamente")
      } else {
        toast(`${selectedIds.size} equipamientos eliminados correctamente`)
      }
    } catch (error) {
      console.error('Error deleting equipment:', error)
      toast(`Error al eliminar: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setIsDeleting(false)
    }
  }

  // Filtrar equipos eliminables y seleccionados
  const deletableEquipment = filteredEquipment.filter(item => canBeDeleted(item))
  const selectedDeletableCount = Array.from(selectedIds).filter(id => 
    deletableEquipment.some(item => item.id === id)
  ).length
  const allDeletableSelected = deletableEquipment.length > 0 && 
    deletableEquipment.every(item => selectedIds.has(item.id))

  return (
    <>
      {/* Header con búsqueda y botones de acción */}
      <div className="flex flex-col gap-4 justify-between items-start mb-6 sm:flex-row sm:items-center">
        <div className="w-full sm:w-80">
          <SearchInput
            placeholder="Buscar equipamiento..."
            value={searchTerm}
            onChange={setSearchTerm}
          />
        </div>
        
        <div className="flex gap-2">
          {/* Botón Eliminar con contador */}
          <Button 
            onClick={handleDeleteSelected}
            disabled={selectedIds.size === 0 || isDeleting}
            variant="destructive"
            size="default"
            className="flex gap-2 items-center"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Eliminar {selectedIds.size > 0 && `(${selectedIds.size})`}
              </>
            )}
          </Button>

          {/* Botón Nuevo Equipamiento */}
          <Button 
            onClick={openCreateModal}
            className="flex gap-2 items-center text-white whitespace-nowrap bg-blue-600 hover:bg-blue-700"
            size="default"
          >
            <Plus className="w-4 h-4" />
            Nuevo Equipamiento
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allDeletableSelected}
                  onCheckedChange={handleSelectAll}
                  disabled={deletableEquipment.length === 0}
                />
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
                Equipamiento {sortColumn === "name" && <ArrowUpDown className={`ml-2 h-4 w-4 inline ${sortDirection === "asc" ? "" : "transform rotate-180"}`} />}
              </TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("modelNumber")}>
                Modelo {sortColumn === "modelNumber" && <ArrowUpDown className={`ml-2 h-4 w-4 inline ${sortDirection === "asc" ? "" : "transform rotate-180"}`} />}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("assignments")}>
                Dispositivos en esta Clínica {sortColumn === "assignments" && (
                  <ArrowUpDown className={`ml-2 h-4 w-4 inline ${sortDirection === "asc" ? "" : "transform rotate-180"}`} />
                )}
              </TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingEquipment ? (
              // Estados de carga
              [...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="w-4 h-4" /></TableCell>
                  <TableCell><Skeleton className="w-40 h-4" /></TableCell>
                  <TableCell><Skeleton className="w-60 h-4" /></TableCell>
                  <TableCell><Skeleton className="w-20 h-4" /></TableCell>
                  <TableCell><Skeleton className="w-32 h-4" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="inline-block w-8 h-8" /></TableCell>
                </TableRow>
              ))
            ) : filteredEquipment.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center">
                  {allEquipment.length === 0 ? (
                    <div className="space-y-2">
                      <p className="text-gray-500">No hay equipamiento registrado en el sistema.</p>
                      <p className="text-sm text-gray-400">
                        Ve a la gestión global de equipamientos para crear tipos de equipos.
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-500">No hay equipamiento que coincida con la búsqueda.</p>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filteredEquipment.map((item) => {
                const assignmentsCount = getClinicAssignmentsCount(item)
                const hasOtherClinics = hasAssignmentsInOtherClinics(item)
                const isDeletable = canBeDeleted(item)
                const isSelected = selectedIds.has(item.id)
                
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                        disabled={!isDeletable}
                        className={!isDeletable ? "opacity-30" : ""}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="max-w-xs truncate">{item.description || '-'}</TableCell>
                    <TableCell>{item.modelNumber || '-'}</TableCell>
                    <TableCell>
                      <ClinicSpecificAssignmentsCell equipment={item} clinicId={clinicId} />
                    </TableCell>
                    <TableCell className="space-x-1 text-right">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => openModal(item)}
                        className="w-8 h-8"
                        title={hasOtherClinics 
                          ? "Ver dispositivos (solo lectura - equipamiento usado en otras clínicas)"
                          : assignmentsCount > 0
                            ? "Gestionar dispositivos de esta clínica"
                            : "Ver equipamiento (sin asignaciones en esta clínica)"
                        }
                      >
                        <Search className={`w-4 h-4 ${assignmentsCount > 0 ? 'text-blue-600' : 'text-gray-400'}`} />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {isModalOpen && selectedEquipment && (
        <EquipmentModal
          isOpen={isModalOpen}
          onClose={() => { 
            setIsModalOpen(false); 
            setSelectedEquipment(null);
            // Refrescar datos cuando se cierre el modal
            refetchEquipment();
          }}
          initialEquipment={selectedEquipment}
          isEditMode={true}
          clinicFilter={clinicId}
          onRefreshData={refetchEquipment}
        />
      )}

      {/* Modal de creación de equipamiento */}
      {isCreateModalOpen && (
        <EquipmentModal
          isOpen={isCreateModalOpen}
          onClose={handleCreateSuccess}
          isEditMode={false}
          // Sin clinicFilter para crear equipamiento global
        />
      )}
    </>
  )
}
// --- FIN COMPONENTE TABLA DE EQUIPAMIENTO ---

const DEFAULT_GRANULARITIES: { [key: number]: number } = {
  15: 5,
  20: 5,
  30: 10,
  45: 15,
  60: 15
};

const getValidGranularities = (slot: number) => {
  const divisors = [];
  for (let i = 1; i <= slot; i++) {
    if (slot % i === 0) {
      divisors.push(i);
    }
  }
  return divisors;
};

export default function ClinicaDetailPage() {
  const clinicContext = useClinic()
  const { 
    clinics, 
    updateClinica, 
    getClinicaById, 
    refreshActiveClinicCabins, 
    activeClinic: clinicDataFromContext,
    isLoading: isLoadingContext, // <<< AÑADIR isLoading del contexto
    fetchCabinsForClinic,
    activeClinicCabins,
    isLoadingCabinsContext,
    isInitialized // <<< AGREGAR isInitialized
  } = clinicContext

  // Patrón isInitialized - No renderizar hasta que esté listo
  if (!isInitialized) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="mx-auto mb-4 w-8 h-8 rounded-full border-b-2 border-purple-600 animate-spin"></div>
          <p className="text-muted-foreground">Inicializando configuración de clínica...</p>
        </div>
      </div>
    )
  }

  // <<< CORREGIR: Usar clinicDataFromContext que está disponible desde el hook inicial >>>
  // <<< En lugar de clinicData que se declara después >>>
  if (!clinicDataFromContext && !clinics.length) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">No hay clínicas disponibles</p>
        </div>
      </div>
    )
  }

  const { templates } = useTemplates()
  const { getTarifaById, tarifas } = useTarif()
  // Obtener funciones y datos necesarios del contexto de equipamiento
  const { allEquipos, getClinicEquipos } = useEquipment() 
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams();
  const { data: legalEntitiesData, isLoading: isLoadingLegalEntities } = useLegalEntitiesQuery();
  
  // <<< MOVER AQUÍ EL NUEVO ESTADO >>>
  const [displayedCabins, setDisplayedCabins] = useState<Cabin[]>([]);
  // Estado de carga local para cabinas (evita usar el del contexto cuando editamos otra clínica)
  const [isLoadingCabinsLocal, setIsLoadingCabinsLocal] = useState<boolean>(false);
  
  // --- ESTADOS PARA PAÍSES (COLOCADOS AL PRINCIPIO) --- <<< NUEVO >>>
  const [countries, setCountries] = useState<CountryInfo[]>([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState<boolean>(true);
  const [countriesError, setCountriesError] = useState<string | null>(null);
  // --- FIN ESTADOS PAÍSES --- <<< NUEVO >>>

  // Usar clinicDataFromContext para inicializar el estado local
  const [clinicData, setClinicData] = useState<ClinicaApiOutput | null>(clinicDataFromContext)
  // Ajustar los fallbacks para horario simple
  // const defaultOpenTime = useMemo(() => clinicData?.openTime || "00:00", [clinicData]);
  // const defaultCloseTime = useMemo(() => clinicData?.closeTime || "23:59", [clinicData]);
  // const defaultSlotDuration = useMemo(() => clinicData?.slotDuration ?? 15, [clinicData]);
  // --- Fin Mover useMemo ---

  const [activeTab, setActiveTab] = useState("datos")
  const [isCabinDialogOpen, setIsCabinDialogOpen] = useState(false)
  const [editingCabin, setEditingCabin] = useState<Cabin | null>(null)
  const [isLoadingClinic, setIsLoadingClinic] = useState(true);
  const [cabinFilterText, setCabinFilterText] = useState("")
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [equipmentData, setEquipmentData] = useState<Equipment[]>([])
  // Cambiar tipo de Tarifa a PrismaTariff
  const [tarifaAplicada, setTarifaAplicada] = useState<PrismaTariff | null | undefined>(undefined)
  const [isLoadingTarifa, setIsLoadingTarifa] = useState(false)
  const [showNewUserDialog, setShowNewUserDialog] = useState(false)
  const [showExcepcionModal, setShowExcepcionModal] = useState(false)
  const [showHorarioModal, setShowHorarioModal] = useState(false)
  // Usar el tipo local ExcepcionHorariaLocal
  const [nuevaExcepcion, setNuevaExcepcion] = useState<Partial<ExcepcionHorariaLocal>>({
    nombre: "",
    fechaInicio: "",
    fechaFin: "",
    dias: []
  })
  // Usar el tipo local ExcepcionHorariaLocal
  const [editingExcepcion, setEditingExcepcion] = useState<ExcepcionHorariaLocal | null>(null)
  
  // Estados para el modal de equipamiento
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false)
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)
  const [editingFranja, setEditingFranja] = useState<{
    diaId: string;
    franjaId?: string;
    inicio: string;
    fin: string;
    excepcionDiaIndex?: number;
  } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  // <<< MODIFICAR: Inicializar formData directamente desde clinicData si es posible >>>
  const [formData, setFormData] = useState<Partial<ClinicaApiOutput>>(clinicData || {});
  // <<< ELIMINAR ESTADOS LOCALES DE PREFIJOS, se manejarán dentro de formData >>>
  // const [clinicPhone1Prefix, setClinicPhone1Prefix] = useState("ES"); 
  // const [clinicPhone2Prefix, setClinicPhone2Prefix] = useState("ES"); 
  
  // <<< NUEVOS ESTADOS PARA DISPLAY (con iniciales neutros) >>>
  const [displayOpenTime, setDisplayOpenTime] = useState<string>("--:--"); // <<< CAMBIAR INICIAL
  const [displayCloseTime, setDisplayCloseTime] = useState<string>("--:--"); // <<< CAMBIAR INICIAL
  const [displaySlotDuration, setDisplaySlotDuration] = useState(30) // Valor inicial por defecto
  const [displayCreateGranularity, setDisplayCreateGranularity] = useState<number>(10);

  // Estado para las opciones de granularidad válidas
  const [validGranularities, setValidGranularities] = useState<number[]>(getValidGranularities(displaySlotDuration));

  // Efecto para actualizar la granularidad cuando cambia el slot
  useEffect(() => {
    if (typeof displaySlotDuration === 'number') {
      const newValidGranularities = getValidGranularities(displaySlotDuration);
      setValidGranularities(newValidGranularities);

      // Si la granularidad actual no es válida para el nuevo slot, la reseteamos
      if (!newValidGranularities.includes(displayCreateGranularity)) {
        const newDefaultGranularity = DEFAULT_GRANULARITIES[displaySlotDuration] ?? newValidGranularities[0] ?? 5;
        setDisplayCreateGranularity(newDefaultGranularity);
      }
    }
  }, [displaySlotDuration]);

  // --- NUEVO ESTADO PARA HORARIO --- 
  const [useTemplateSchedule, setUseTemplateSchedule] = useState<boolean>(false);
  // Estado para gestionar el horario independiente cuando useTemplateSchedule es false
  const [independentSchedule, setIndependentSchedule] = useState<WeekSchedule | null>(null);
  // Estado para guardar la plantilla original al desmarcar el check
  const [idDePlantillaOriginalAlDesmarcar, setIdDePlantillaOriginalAlDesmarcar] = useState<string | null>(null);
  // Flag para saber si se ha editado el horario desde que se desmarcó
  const [haEditadoHorario, setHaEditadoHorario] = useState<boolean>(false);
  // --- FIN NUEVO ESTADO ---
  
  const diasSemana = [
    'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'
  ]

  const clinicId = typeof params?.id === 'string' ? params.id : ''
  
  // Hook para obtener datos de equipamiento
  const {
    data: equipmentList = [],
    isLoading: loadingEquipment,
    refetch: refetchEquipment,
  } = useEquipmentWithAssignmentsQuery()
  
  // <<< ELIMINAR LOG >>>
  // console.log("ClinicaDetailPage - Extracted clinicId from URL params:", clinicId, "(Type:", typeof clinicId, ")", "Raw params:", params);
  
  // <<< ELIMINAR LOG >>>
  // console.log("ClinicaDetailPage - Context Values: isLoadingContext=", isLoadingContext, "Has clinicDataFromContext=", !!clinicDataFromContext);

  const [isInitializing, setIsInitializing] = useState(true); // Flag para controlar la carga inicial

  // <<< useEffect PARA CARGAR PAÍSES (COLOCADO DESPUÉS DE LOS ESTADOS) >>> <<< NUEVO >>>
  useEffect(() => {
    const fetchCountries = async () => {
      // No resetear isLoading y error aquí para evitar re-renders innecesarios si ya se cargaron
      // setIsLoadingCountries(true); 
      // setCountriesError(null);
      try {
        const response = await fetch('/api/countries'); 
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        const data: CountryInfo[] = await response.json();
        setCountries(data);
      } catch (err) {
        console.error("Error fetching countries:", err);
        setCountriesError(err instanceof Error ? err.message : 'Error desconocido al cargar países');
        setCountries([]); 
      } finally {
        setIsLoadingCountries(false); // Marcar como finalizado aquí
      }
    };
    // Solo llamar si aún no se han cargado (o si queremos recargar)
    if (isLoadingCountries) {
       fetchCountries();
    }
  }, [isLoadingCountries]); // Dependencia en isLoadingCountries para reintentar si falla? O dejarla vacía []? -> Vacía es más seguro para evitar loops si falla. Ajustado a vacía.
  // Corregido: Usar dependencia vacía [] para que se ejecute solo una vez al montar.
  useEffect(() => {
    const fetchCountries = async () => {
      setIsLoadingCountries(true); // Marcar inicio de carga
      setCountriesError(null);     // Limpiar errores previos
      try {
        const response = await fetch('/api/countries'); 
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        const data: CountryInfo[] = await response.json();
        setCountries(data);
      } catch (err) {
        console.error("Error fetching countries:", err);
        setCountriesError(err instanceof Error ? err.message : 'Error desconocido al cargar países');
        setCountries([]); 
      } finally {
        setIsLoadingCountries(false); // Marcar fin de carga (éxito o error)
      }
    };
    fetchCountries(); // Llamar a la función
  }, []); // Array de dependencias vacío para ejecutar solo al montar.
  // --- FIN useEffect PAÍSES --- <<< NUEVO >>>

  // <<< NUEVO useEffect para cargar los datos de la clínica **sin** alterar el contexto >>>
  useEffect(() => {
    if (!clinicId) {
      console.error("[ClinicaDetail] No se encontró clinicId en la URL.");
      setIsInitializing(false);
      return;
    }

    // Evitar refetch si ya tenemos los datos correctos
    if (clinicData && clinicData.id === clinicId) {
      setIsInitializing(false);
      return;
    }

    const loadClinic = async () => {
      try {
        setIsLoadingClinic(true);
        const data = await getClinicaById(clinicId);
        setClinicData(data);
        if (data) {
          setFormData(data);
        }
      } catch (error) {
        console.error(`[ClinicaDetail] Error cargando datos de la clínica ${clinicId}:`, error);
      } finally {
        setIsLoadingClinic(false);
        setIsInitializing(false);
      }
    };

    loadClinic();
  }, [clinicId, getClinicaById]);

  // <<< NUEVO useEffect para cargar cabinas de la clínica editada sin tocar el contexto >>>
  useEffect(() => {
    const loadCabins = async () => {
      if (!clinicId) {
        setDisplayedCabins([]);
        setIsLoadingCabinsLocal(false);
        return;
      }
      setIsLoadingCabinsLocal(true);
      try {
        const res = await fetch(`/api/clinics/${clinicId}/cabins`);
        if (res.ok) {
          const cabins: Cabin[] = await res.json();
          const sorted = [...cabins].sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
          setDisplayedCabins(sorted);
        } else {
          console.warn(`[ClinicaDetail] No se pudieron obtener cabinas para la clínica ${clinicId}. Status: ${res.status}`);
          setDisplayedCabins([]);
        }
      } catch (error) {
        console.error(`[ClinicaDetail] Error obteniendo cabinas para la clínica ${clinicId}:`, error);
        setDisplayedCabins([]);
      } finally {
        setIsLoadingCabinsLocal(false);
      }
    };

    loadCabins();
  }, [clinicId]);

  // useEffect para sincronizar isLoadingClinic LOCAL con isLoadingContext GLOBAL
  useEffect(() => {
    // Solo actualizamos si NO estamos en la fase de inicialización de esta página
    if (!isInitializing) {
       setIsLoadingClinic(isLoadingContext);
    }
  }, [isLoadingContext, isInitializing]);

  // --- useEffect para sincronizar clinicData LOCAL con clinicDataFromContext
  useEffect(() => {
    // Solo sincronizar si ya hemos pasado la inicialización Y la clínica del contexto coincide con la URL
    if (!isInitializing && clinicDataFromContext && clinicDataFromContext.id === clinicId) {
      console.log(`[ClinicaDetail] useEffect[clinicDataFromContext] - Syncing local state with context for ID: ${clinicId}`);
      setClinicData(clinicDataFromContext);
      // <<< MODIFICAR: Sincronizar formData aquí >>>
      setFormData(clinicDataFromContext); 
      
      // <<< AÑADIR: Forzar recalculo de horarios cuando cambia la clínica del contexto >>>
      // Resetear estados de horario para forzar recalculo
      setUseTemplateSchedule(!!clinicDataFromContext.linkedScheduleTemplateId);
      setSelectedTemplateId(clinicDataFromContext.linkedScheduleTemplateId || null);
      
      // Si no usa plantilla, reconstruir el horario independiente
      if (!clinicDataFromContext.linkedScheduleTemplateId && clinicDataFromContext.independentScheduleBlocks) {
        const newIndependentSchedule = convertBlocksToWeekSchedule(
          clinicDataFromContext.independentScheduleBlocks, 
          "00:00", 
          "23:59"
        );
        setIndependentSchedule(newIndependentSchedule);
      }
    }
  }, [clinicDataFromContext, clinicId, isInitializing]); 

  useEffect(() => {
    // Cargar equipamiento específico de la clínica cuando el ID o la lista completa cambien
    if (clinicId && allEquipos) {
      const clinicEquipment = getClinicEquipos(clinicId);
      setEquipmentData(clinicEquipment);
    }
  }, [clinicId, allEquipos, getClinicEquipos]); // Dependencias actualizadas

  useEffect(() => {
    const tabParam = searchParams.get("tab")
    
    // Si el parámetro tab es 'usuarios', establecer la pestaña activa a 'usuarios'
    if (tabParam === "usuarios") {
      setActiveTab("usuarios");
    } 
    // Si no, verificar si el parámetro tab coincide con algún ID de los menuItems
    else if (tabParam && menuItems.some(item => item.id === tabParam)) {
      setActiveTab(tabParam);
    } else {
      // Si no hay parámetro o no es válido, asegurar que la pestaña por defecto sea 'datos'
      setActiveTab("datos"); 
    }
  }, [searchParams])

  useEffect(() => {
    const loadTarifaData = async () => {
      const tarifaIdAsignada = clinicData?.tariffId as string | undefined;

      if (tarifaIdAsignada) {
        setIsLoadingTarifa(true);
        setTarifaAplicada(undefined);
        try {
          // Usar el alias PrismaTariff
          const tarifa: PrismaTariff | null = await getTarifaById(tarifaIdAsignada);
          setTarifaAplicada(tarifa || null);
        } catch (error) {
          console.error("Error al cargar la tarifa plantilla:", error);
          setTarifaAplicada(null);
    } finally {
          setIsLoadingTarifa(false);
        }
      } else if (clinicData) {
         setTarifaAplicada(null);
      }
    };

    loadTarifaData();
  }, [clinicData, getTarifaById]);
    // --- HANDLER PARA CAMBIOS EN EL FORMULARIO ---
    const handleFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> | { target: { name: string; value: any; type: string } }) => {
      // Adaptado para aceptar también el formato que enviaremos desde onValueChange del Select
      const { name, value, type } = e.target;
      let processedValue: string | number | boolean | null = value;

      // Procesar tipos específicos
      if (type === 'checkbox') {
        processedValue = (e.target as HTMLInputElement).checked;
      } else if (type === 'number') {
        processedValue = value === '' ? null : Number(value);
      } else if (type === 'text' || type === 'textarea' || type === 'email' || type === 'select') { // Añadir 'select'
           // Para campos de texto/select opcionales, si el valor es vacío, lo consideramos null
           // Ajustar si se prefiere enviar string vacío ''
           if (value === '' || value === undefined) { // Añadir chequeo para undefined que puede venir del Select
               processedValue = null;
           }
      } else if (type === 'radio') { // Añadir manejo para radio
          processedValue = value; // El valor ya viene procesado (boolean en nuestro caso)
      }


      setFormData(prev => {
        // Evitar actualizar si el valor no ha cambiado
        if (prev && prev[name as keyof typeof prev] === processedValue) {
            return prev;
        }
        return {
          ...prev,
          [name]: processedValue,
        };
      });
    }, []); 
    // --- FIN HANDLER FORMULARIO ---

    // --- HANDLER ESPECÍFICO PARA CHECKBOX/SWITCH --- 
    const handleCheckboxSwitchChange = useCallback((checked: boolean | string, name: string) => {
        // El prop onCheckedChange puede devolver 'indeterminate', lo tratamos como false
        const processedValue = checked === true;
        setFormData(prev => ({
          ...prev,
          [name]: processedValue,
        }));
    }, []); // Dependencia vacía
    // --- FIN HANDLER CHECKBOX/SWITCH ---

  // --- NUEVO useEffect para inicializar useTemplateSchedule --- 
  useEffect(() => {
    if (clinicData) {
      // Inicializa el checkbox basado en si hay una plantilla vinculada al cargar
      setUseTemplateSchedule(!!clinicData.linkedScheduleTemplateId);
      console.log(`[ClinicaDetail] Initializing useTemplateSchedule based on linkedTemplateId (${clinicData.linkedScheduleTemplateId}): ${!!clinicData.linkedScheduleTemplateId}`);
    }
  }, [clinicData?.id, clinicData?.linkedScheduleTemplateId]); // Depender del ID y del linkedId
  // --- FIN NUEVO useEffect ---

  // --- useEffect para inicializar/actualizar independentSchedule --- 
  useEffect(() => {
    if (!useTemplateSchedule && clinicData) {
      // Si estamos en modo independiente, cargar los bloques independientes
      const blocks = clinicData.independentScheduleBlocks; // Acceder directamente
      // Verificar que blocks existe, es un array y no está vacío
      if (blocks && Array.isArray(blocks) && blocks.length > 0) { 
        console.log("[Schedule Init] Initializing independent schedule from loaded blocks:", blocks);
        // TODO: Obtener open/close time del propio horario derivado o usar fallbacks razonables
        const derivedSchedule = convertBlocksToWeekSchedule(blocks, "08:00", "20:00"); // PLACEHOLDER TIMES
        setIndependentSchedule(derivedSchedule);
      } else {
        // Si no hay bloques o el array está vacío, inicializar por defecto
        console.log("[Schedule Init] No independent blocks found or empty array, initializing empty independent schedule.");
        setIndependentSchedule(createDefaultSchedule());
      }
    } else if (useTemplateSchedule) {
      // Si usamos plantilla, limpiamos el horario independiente
      setIndependentSchedule(null);
    }
    // Actualizar dependencias
  }, [clinicData?.id, useTemplateSchedule, clinicData?.independentScheduleBlocks]); 
  // --- FIN useEffect Horario Independiente ---

  // --- useEffect para inicializar useTemplateSchedule y independentSchedule --- 
  useEffect(() => {
    if (clinicData) {
      console.log("[useEffect clinicData] Initializing schedule mode and display times...");
      const shouldUseTemplate = !!clinicData.linkedScheduleTemplateId;
      // Sincronizar el estado del toggle con los datos cargados
      if (useTemplateSchedule !== shouldUseTemplate) {
        setUseTemplateSchedule(shouldUseTemplate);
      }
      // Sincronizar el ID de plantilla seleccionado
      if (selectedTemplateId !== clinicData.linkedScheduleTemplateId) {
         setSelectedTemplateId(clinicData.linkedScheduleTemplateId);
      }

      let scheduleToUseForInit: WeekSchedule | null = null;
      // Determinar qué horario usar para inicializar los inputs open/close
      if (shouldUseTemplate && clinicData.linkedScheduleTemplate?.blocks) {
          console.log("[useEffect clinicData] Using template blocks for initial display times.");
          scheduleToUseForInit = convertBlocksToWeekSchedule(clinicData.linkedScheduleTemplate.blocks, "00:00", "23:59"); // Pasar defaults
      } else if (!shouldUseTemplate && clinicData.independentScheduleBlocks && clinicData.independentScheduleBlocks.length > 0) {
          console.log("[useEffect clinicData] Using independent blocks for initial display times.");
          scheduleToUseForInit = convertBlocksToWeekSchedule(clinicData.independentScheduleBlocks, "00:00", "23:59"); // Pasar defaults
           // Si no hay estado independentSchedule pero sí bloques, inicializarlo
           if (!independentSchedule) {
               setIndependentSchedule(scheduleToUseForInit);
           }
      } else if (!shouldUseTemplate && independentSchedule) {
          // Si no usa plantilla y no hay bloques PERO sí hay estado (p.ej. recién creado por defecto)
          console.log("[useEffect clinicData] Using existing independentSchedule state for initial display times.");
          scheduleToUseForInit = independentSchedule;
      } else if (!shouldUseTemplate && !independentSchedule) {
          // Caso final: no usa plantilla, no hay bloques, no hay estado -> crear por defecto
          console.log("[useEffect clinicData] No schedule data, creating default independent schedule for display times.");
          const defaultSchedule = createDefaultSchedule();
          setIndependentSchedule(defaultSchedule); // Guardar en estado
          scheduleToUseForInit = defaultSchedule;
      }

      // <<< Calcular y ACTUALIZAR ESTADOS DE DISPLAY basado en scheduleToUseForInit >>>
      let initialOpen = "09:00"; // Default si no hay horario
      let initialClose = "18:00"; // Default si no hay horario
      if (scheduleToUseForInit) {
           const { earliest, latest } = calcularBoundsSchedule(scheduleToUseForInit);
           initialOpen = earliest;
           initialClose = latest;
      }
      console.log(`[useEffect clinicData] Setting display times: Open=${initialOpen}, Close=${initialClose}`);
      setDisplayOpenTime(initialOpen);
      setDisplayCloseTime(initialClose);
      // TODO: Añadir lógica similar para displaySlotDuration si se usa ese estado
      // <<< AÑADIR LÓGICA PARA SLOT DURATION >>>
      let initialSlotDuration: number | string = 15; // Default
      if (shouldUseTemplate && clinicData.linkedScheduleTemplate?.slotDuration) {
          initialSlotDuration = clinicData.linkedScheduleTemplate.slotDuration;
      } 
      // Nota: Si no usa plantilla, mantenemos el valor que tuviera (podría venir de una captura anterior)
      console.log(`[useEffect clinicData] Setting display slot duration: ${initialSlotDuration}`);
      setDisplaySlotDuration(initialSlotDuration); 
      // <<< FIN LÓGICA SLOT DURATION >>>

    }
  // Dependencias ajustadas para reaccionar SOLO a cambios en los datos CARGADOS
  }, [clinicData?.id, clinicData?.linkedScheduleTemplateId, clinicData?.independentScheduleBlocks]); // <<< ELIMINAR independentSchedule de las dependencias
 // <<< NUEVO useEffect para sincronizar displayedCabins con el contexto >>>
  useEffect(() => {
    // Sincronizar solo si el contexto tiene cabinas y no está cargando
    if (activeClinicCabins && !isLoadingCabinsContext) {
       // Crear una copia para evitar mutaciones directas del estado del contexto
       // Ordenar por el campo 'order' existente al inicializar/sincronizar
       const sortedCabinsFromContext = [...activeClinicCabins].sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
       console.log("[Sync Cabins] Context cabins changed. Updating displayedCabins.", sortedCabinsFromContext);
       setDisplayedCabins(sortedCabinsFromContext); // <<< Aquí usamos la función setDisplayedCabins del hook declarado arriba (línea 190)
    } else if (!activeClinicCabins && !isLoadingCabinsContext) {
        // Si el contexto se vacía (ej. cambio de clínica), limpiar estado local
        console.log("[Sync Cabins] Context cabins are null/empty. Clearing displayedCabins.");
        setDisplayedCabins([]); // <<< Aquí usamos la función setDisplayedCabins del hook declarado arriba (línea 190)
    }
    // Depender de activeClinicCabins y isLoadingCabinsContext para reaccionar a cambios
  }, [activeClinicCabins, isLoadingCabinsContext]);
  // <<< FIN useEffect Sincronización Cabinas >>>
  // <<< INICIO NUEVA FUNCIÓN DE UTILIDAD >>>
  // Función para convertir bloques de PLANTILLA a formato WeekSchedule
  const convertTemplateBlocksToWeekSchedule = (templateBlocks: PrismaScheduleTemplateBlock[] | null | undefined): WeekSchedule => {
    const newSchedule = createDefaultSchedule(); // Empezar con todos los días cerrados
    if (!templateBlocks || templateBlocks.length === 0) {
      return newSchedule; // Devolver vacío si no hay bloques
    }

    templateBlocks.forEach(block => {
      const dayKey = block.dayOfWeek.toLowerCase() as keyof WeekSchedule;
      if (newSchedule[dayKey]) { 
        newSchedule[dayKey].isOpen = true; // Marcar día como abierto
        // Añadir la franja si existe
        if (!newSchedule[dayKey].ranges) {
          newSchedule[dayKey].ranges = [];
        }
        newSchedule[dayKey].ranges.push({ start: block.startTime, end: block.endTime });
        // Ordenar franjas por hora de inicio (opcional pero bueno)
        newSchedule[dayKey].ranges.sort((a, b) => a.start.localeCompare(b.start));
      }
    });

    return newSchedule;
  };
  // <<< FIN NUEVA FUNCIÓN DE UTILIDAD >>>

  const handleUpdateFranjaExcepcion = (diaIndex: number, franjaId: string, inicio: string, fin: string) => {
    if (!editingExcepcion) return
    
    const diasActualizados = [...editingExcepcion.dias]
    if (!diasActualizados[diaIndex]) {
      console.error(`Error: Índice de día ${diaIndex} fuera de rango en handleUpdateFranjaExcepcion`);
        return;
    }
    const franjas = [...(diasActualizados[diaIndex].franjas || [])];
    const franjaIndex = franjas.findIndex(f => f.id === franjaId)
  
    if (franjaIndex >= 0) {
      franjas[franjaIndex] = { ...franjas[franjaIndex], inicio, fin }
      diasActualizados[diaIndex] = { ...diasActualizados[diaIndex], franjas: franjas }; 
  
      setEditingExcepcion({
        ...editingExcepcion,
        dias: diasActualizados
      })
    } else {
      console.warn(`Franja con ID ${franjaId} no encontrada en el día ${diaIndex}`);
    }
  }

    // Eliminar useCallback y dependencias temporalmente para diagnóstico
    const handleClinicUpdate = (updatedFields: { schedule: WeekSchedule } | Record<string, any>) => {
      if (clinicData) {
        console.log("Updating clinic state with:", updatedFields);
        
        // --- Distinguir si es actualización de horario u otros campos ---
        if ('schedule' in updatedFields && typeof updatedFields.schedule === 'object') {
          console.log("Updating scheduleJson state...");
          // Aquí iría la lógica si se necesita actualizar algo relacionado con scheduleJson en formData
        } else {
          // Actualizar otros campos
          const { schedule, ...otherFields } = updatedFields;
           if (Object.keys(otherFields).length > 0) {
              console.log("Updating other fields:", otherFields);
              setFormData(prev => ({ ...prev, ...(otherFields as Partial<ClinicaApiOutput>) })); 
           }
        }
        // --- Fin distinción ---
      }
    }; // <<< Asegúrate de que termina con punto y coma ;

  // --- Versión Debounced de la actualización ---
  // Modificar para que solo actualice campos que NO sean de horario
  const handleOtherFieldUpdate = useCallback(
    (updatedFields: Partial<ClinicaApiOutput>) => {
      console.log("Updating formData state with:", updatedFields);
      setFormData(prev => ({ ...prev, ...(updatedFields as Partial<ClinicaApiOutput>) })); 
    },
    [] // Dependencia vacía ya que solo usa setFormData
  );

  // --- Modificar handleTemplateChange para usar el tipo importado ---
  const handleTemplateChange = (templateId: string) => {
    const selectedTemplate = templates.find((t) => t.id === templateId);
    const isDeselecting = templateId === "null" || templateId === "";
    
    if (isDeselecting) {
        console.log(`[Template Change] Deselecting template.`);
        setSelectedTemplateId(null); // <<< USAR NOMBRE CORRECTO
        setClinicData(prev => prev ? {
            ...prev,
            linkedScheduleTemplateId: null, // Desvincular en estado local
            linkedScheduleTemplate: null,
        } : null);
        setUseTemplateSchedule(false); // Pasar a modo independiente
    } else if (selectedTemplate) {
        console.log(`[Template Change] Template selected: ${templateId}. Linking in local state and enabling template mode.`);
        setSelectedTemplateId(templateId); // <<< USAR NOMBRE CORRECTO
        setClinicData(prev => prev ? {
            ...prev,
            linkedScheduleTemplateId: templateId,        
            linkedScheduleTemplate: selectedTemplate as unknown as ClinicaApiOutput['linkedScheduleTemplate'], 
        } : null);
        setUseTemplateSchedule(true); // Activar modo plantilla
    } else {
        console.warn(`Template with ID ${templateId} not found.`);
    }
  };

  const handleUseTemplateToggle = (checked: boolean) => {
    console.log(`[handleUseTemplateToggle] User clicked. Attempting to set useTemplateSchedule to: ${checked}`);
    setUseTemplateSchedule(checked);
    setHaEditadoHorario(false); // Resetear flag en cualquier cambio del toggle

    if (checked) {
      // --- Volviendo a usar Plantilla ---
      console.log("[handleUseTemplateToggle] Template usage ENABLED.");
      setIndependentSchedule(null); // Limpiar estado independiente
      setIdDePlantillaOriginalAlDesmarcar(null); // Limpiar ID original guardado

      // Restaurar la plantilla seleccionada si había una guardada al desmarcar
      // O si no había, mantener el selectedTemplateId actual (podría ser null)
      const templateToRestore = idDePlantillaOriginalAlDesmarcar || selectedTemplateId;
      console.log(`[handleUseTemplateToggle] Restoring selectedTemplateId to: ${templateToRestore}`);
      setSelectedTemplateId(templateToRestore);
      
      // <<< ACTUALIZAR DISPLAY SLOT DURATION AL MARCAR >>>
      const plantillaRestaurada = templates.find(t => t.id === templateToRestore);
      const slotDurationRestaurado = plantillaRestaurada?.slotDuration || 15; // Leer o usar default
      console.log(`[handleUseTemplateToggle] Restoring display slot duration: ${slotDurationRestaurado}`);
      setDisplaySlotDuration(slotDurationRestaurado);
      // <<< FIN ACTUALIZAR SLOT DURATION >>>

        } else {
      // --- Desmarcando - Pasando a modo potencialmente Independiente ---
      console.log("[handleUseTemplateToggle] Template usage DISABLED. Preparing for independent editing.");
      // Guardar el ID de la plantilla actual por si acaso el usuario se arrepiente
      setIdDePlantillaOriginalAlDesmarcar(selectedTemplateId);
      // <<< INTENTO DE CORRECCIÓN: Limpiar selectedTemplateId inmediatamente >>>
      console.log(`[handleUseTemplateToggle] Clearing selectedTemplateId state.`);
      setSelectedTemplateId(null); 

      // Preparar 'independentSchedule' para la edición, basándose en la plantilla actual si existe
      let scheduleBaseParaEdicion: WeekSchedule;
      // Usar idDePlantillaOriginalAlDesmarcar que acabamos de guardar
      // <<< AÑADIR ASERCIÓN DE TIPO AQUÍ >>>
      const plantillaOriginal = templates.find(t => t.id === idDePlantillaOriginalAlDesmarcar) as (ScheduleTemplate & { blocks: PrismaScheduleTemplateBlock[] }) | undefined;

      if (plantillaOriginal?.blocks) {
        console.log("[handleUseTemplateToggle] Initializing independentSchedule from original template:", idDePlantillaOriginalAlDesmarcar);
        scheduleBaseParaEdicion = convertBlocksToWeekSchedule(plantillaOriginal.blocks, "00:00", "23:59");
      } else if (independentSchedule) {
         console.log("[handleUseTemplateToggle] Using existing independentSchedule state as base (no original template found).");
         scheduleBaseParaEdicion = independentSchedule;
      } else {
        console.log("[handleUseTemplateToggle] No original template or existing state, initializing independentSchedule with default.");
        scheduleBaseParaEdicion = createDefaultSchedule();
      }
      setIndependentSchedule(scheduleBaseParaEdicion);

      // <<< ACTUALIZAR DISPLAY TIMES BASADO EN EL HORARIO QUE SE VA A EDITAR >>>
      const { earliest, latest } = calcularBoundsSchedule(scheduleBaseParaEdicion);
      console.log(`[handleUseTemplateToggle] Setting display times for independent mode: Open=${earliest}, Close=${latest}`);
      setDisplayOpenTime(earliest);
      setDisplayCloseTime(latest);
      // TODO: Actualizar displaySlotDuration si se usa
      // <<< ACTUALIZAR DISPLAY SLOT DURATION AL DESMARCAR >>>
      const slotDurationOriginal = plantillaOriginal?.slotDuration || 15; // Capturar o usar default
      console.log(`[handleUseTemplateToggle] Setting display slot duration for independent mode: ${slotDurationOriginal}`);
      setDisplaySlotDuration(slotDurationOriginal);
      // <<< FIN ACTUALIZAR SLOT DURATION >>>

      console.log(`[handleUseTemplateToggle] Original template ID stored: ${idDePlantillaOriginalAlDesmarcar}. Selector should show placeholder.`);

    }
  };

  // --- Helper para calcular bounds (evita duplicar código) ---
  const calcularBoundsSchedule = (schedule: WeekSchedule | null): { earliest: string, latest: string } => {
       let earliest = "09:00"; // Default
       let latest = "18:00";  // Default
       let foundRange = false;
       if (schedule) {
           earliest = "23:59";
           latest = "00:00";
           Object.values(schedule).forEach(day => {
               if (day.isOpen && day.ranges.length > 0) {
                   day.ranges.forEach(range => {
                       if (range.start && range.end && range.start < range.end) {
                           foundRange = true;
                           if (range.start < earliest) earliest = range.start;
                           if (range.end > latest) latest = range.end;
                       }
                   });
               }
           });
           if (!foundRange || latest <= earliest) {
               earliest = "09:00"; // Fallback si no hay rangos válidos
               latest = "18:00";
           }
       }
       return { earliest, latest };
   };

  // --- useEffect para inicializar/sincronizar estados del horario ---
  useEffect(() => {
      // ... (Lógica existente para sincronizar useTemplateSchedule, selectedTemplateId, 
      //      inicializar independentSchedule si aplica, y calcular/actualizar initialOpen/Close)
      // Asegurarse que se usan calcularBoundsSchedule y actualizarDisplayTimes
  }, [clinicData?.id, clinicData?.linkedScheduleTemplateId, clinicData?.independentScheduleBlocks, independentSchedule]); // Dependencias pueden necesitar ajuste

  // --- NUEVO Handler para aplicar horario general --- 
  const handleApplyGeneralTimesToAllDays = () => {
      if (useTemplateSchedule) { 
        toast("No se pueden aplicar horarios generales cuando se usa una plantilla.");
          return;
      }

      if (!independentSchedule) {
          toast("No hay un horario independiente para modificar.");
          return;
      }

      // 1. Obtener los tiempos generales del horario INDEPENDIENTE ACTUAL
      let earliest = "23:59";
      let latest = "00:00";
      let foundAnyRange = false;
      Object.values(independentSchedule).forEach(day => {
        if (day.isOpen && day.ranges.length > 0) {
          day.ranges.forEach(range => {
            if (range.start && range.end && range.start < range.end) {
              foundAnyRange = true;
              if (range.start < earliest) earliest = range.start;
              if (range.end > latest) latest = range.end;
            }
          });
        }
      });

      // Usar defaults si no se encontraron rangos válidos
      if (!foundAnyRange || latest <= earliest) {
        earliest = "09:00";
        latest = "18:00";
      }

      console.log(`[handleApplyGeneralTimes] Applying times: ${earliest} - ${latest} to independent schedule.`);

      // 2. Crear el nuevo WeekSchedule aplicando estos tiempos
      const newSchedule: WeekSchedule = { ...independentSchedule }; // Copiar estado actual
      const generalRange: TimeRange = { start: earliest, end: latest };

      for (const dayKey in newSchedule) {
              const key = dayKey as keyof WeekSchedule;
        // Aplicar solo a días laborables (L-V por defecto, podría ser configurable)
        if (key !== 'saturday' && key !== 'sunday') {
          newSchedule[key] = {
            isOpen: true,
            ranges: [generalRange] // Reemplazar rangos existentes con el general
          };
        } else {
          // Mantener Sáb/Dom como estaban o cerrarlos? Por ahora, mantenerlos.
          // newSchedule[key] = { isOpen: false, ranges: [] };
        }
      }

      // 3. Actualizar el estado local
      setIndependentSchedule(newSchedule);

      // 4. Opcional: Actualizar los inputs visuales openTime/closeTime locales
      setClinicData(prev => prev ? {
          ...prev,
          // @ts-ignore
          openTime: earliest,
          // @ts-ignore
          closeTime: latest
      } : null);

      toast(`Horario general ${earliest}-${latest} aplicado a días laborables.`);
  };
  // --- FIN Nuevo Handler ---

  const handleSaveCabin = useCallback(async (cabinDataFromDialog: Partial<Cabin>) => {
    console.log("handleSaveCabin - Datos recibidos:", cabinDataFromDialog);
    setIsSaving(true);
    try {
      let savedCabin: Cabin | null = null;
      let operationSuccess = false; // Flag para saber si la operación API tuvo éxito

      if (cabinDataFromDialog.id) {
        // --- Actualizar Cabina Existente ---
        console.log(`handleSaveCabin - Actualizando cabina ID: ${cabinDataFromDialog.id}`);
        const response = await fetch(`/api/cabins/${cabinDataFromDialog.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cabinDataFromDialog),
      });
      if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("API Error Data (PUT):", errorData);
          throw new Error(errorData.error || `Failed to update cabin (status ${response.status})`);
        }
        savedCabin = await response.json();
        console.log("handleSaveCabin - Cabina actualizada:", savedCabin);
        // setCabinsData(prev => prev.map(c => c.id === savedCabin?.id ? savedCabin : c)); // <<< ELIMINAR - Ya no hay estado local
        operationSuccess = true;

      } else {
        // --- Crear Nueva Cabina ---
        if (!clinicData?.id) {
          throw new Error("No se puede crear una cabina sin una clínica seleccionada.");
        }
        const dataToSend = {
          ...cabinDataFromDialog,
          clinicId: clinicData.id,
          systemId: clinicData.systemId // Asegurar que el systemId se envía
        };
        console.log("handleSaveCabin - Creando nueva cabina con datos:", dataToSend);
        const response = await fetch('/api/cabins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend),
        });
      if (!response.ok) {
          const errorData = await response.json().catch(() => ({})); // Catch si no hay JSON
          console.error("API Error Data (POST):", errorData);
          throw new Error(errorData.error || `Failed to create cabin (status ${response.status})`);
        }
        savedCabin = await response.json();
        console.log("handleSaveCabin - Nueva cabina creada:", savedCabin);
        // Actualizar estado local
        // setCabinsData(prev => [...prev, savedCabin!].sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))); // <<< ELIMINAR - Ya no hay estado local
        operationSuccess = true;
      }

      // --- Refrescar cabinas en el contexto SI la operación fue exitosa ---
      if (operationSuccess && typeof refreshActiveClinicCabins === 'function') {
        console.log("handleSaveCabin - Operation successful, calling refreshActiveClinicCabins...");
        await refreshActiveClinicCabins();
        console.log("handleSaveCabin - refreshActiveClinicCabins completed.");
      } else if (!operationSuccess) {
         console.warn("handleSaveCabin - API operation failed, skipping refresh.");
      } else {
         console.warn("handleSaveCabin - refreshActiveClinicCabins is not available.");
      }
      // -----------------------------------------------------------------

      toast(`Cabina "${savedCabin?.name}" guardada correctamente.`);
      setIsCabinDialogOpen(false);
      setEditingCabin(null);

    } catch (error) {
      console.error("Error guardando cabina:", error);
      toast(`Error: ${error instanceof Error ? error.message : "Error desconocido al guardar la cabina."}`);
    } finally {
      setIsSaving(false);
    }
    // Actualizar dependencias de useCallback
  }, [clinicData, updateClinica, refreshActiveClinicCabins]); 

  const handleDeleteCabin = useCallback(
    (cabinId: string) => {
      console.warn("handleDeleteCabin needs refactoring for API calls.")
    },
    [],
  )

  const handleReorderCabin = useCallback((cabinId: string, direction: 'up' | 'down') => {
    setDisplayedCabins(prevCabins => {
      const index = prevCabins.findIndex(c => c.id === cabinId);
      if (index === -1) {
        console.error("handleReorderCabin - Cabin not found in displayedCabins");
        return prevCabins; // No hacer cambios si no se encuentra
      }

      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prevCabins.length) {
        console.warn("handleReorderCabin - Cannot move cabin further");
        return prevCabins; // No se puede mover más, devolver estado sin cambios
      }

      // Crear el nuevo array reordenado basado en el estado local
      const reordered = [...prevCabins];
      const temp = reordered[index];
      reordered[index] = reordered[newIndex];
      reordered[newIndex] = temp;
      
      console.log(`[handleReorderCabin] Cabin ${cabinId} moved ${direction}. New local order:`, reordered.map(c => c.id));
      
      // Devolver el nuevo array reordenado para actualizar el estado local
      return reordered; 
    });

    // <<< ELIMINARADAS LLAMADAS A API Y refreshActiveClinicCabins >>>
    // Ya no llamamos a la API ni refrescamos el contexto aquí.
    // La persistencia se hará en handleSaveClick.

  }, []); // Dependencia vacía, ya que ahora solo usa setDisplayedCabins
  // --- FIN MODIFICACIÓN handleReorderCabin ---

  // La función handleApplyGeneralTimesToAllDays ya está definida más arriba (alrededor de la línea 998)
  // Se elimina esta segunda definición para evitar el error de redeclaración.

  // --- FIN Nuevo Handler ---

  const handleSaveClick = useCallback(async () => {
    if (!clinicData || !formData) { // <<< Añadir chequeo para formData
      toast("Datos de la clínica o formulario no disponibles.");
      return;
    }
    setIsSaving(true);
    let finalLinkedTemplateId: string | null = null;
    let finalIndependentBlocksData: any | null = null; // Usar any temporalmente para flexibilidad
    let finalDeleteIndependentBlocksFlag: boolean | undefined = undefined;

    try {
      // 1. Preparar payload base (usando formData para los campos editables)
      //    Asegurarse de que formData no sea null (ya chequeado arriba)
      const basePayload: Partial<Omit<ClinicaApiOutput, 'id' | 'createdAt' | 'updatedAt' | 'systemId' | 'linkedScheduleTemplate' | 'independentScheduleBlocks' | 'independentSchedule' | 'tariff' | 'cabins'> & { tariffId?: string | null }> = {
        name: formData.name, // <<< Usar formData
        address: formData.address, // <<< Usar formData
        city: formData.city, // <<< Usar formData
        legalEntityId: formData.legalEntityId, // Asegurarse de que se envía
        postalCode: formData.postalCode, // <<< Usar formData
        province: formData.province, // <<< Usar formData
        // countryCode: formData.countryCode, // <<< Usar formData <<<- REEMPLAZAR
        countryIsoCode: formData.countryIsoCode, // <<< REEMPLAZADO por countryIsoCode
        phone: formData.phone, // <<< Usar formData
        // --- AÑADIR PREFIJOS DESDE formData ---
        phone1CountryIsoCode: formData.phone1CountryIsoCode,
        phone2CountryIsoCode: formData.phone2CountryIsoCode,
        // --- FIN AÑADIR PREFIJOS ---
        email: formData.email, // <<< Usar formData
        currency: formData.currency, // <<< Usar formData
        // timezone: formData.timezone, // <<< Usar formData <<<- Se obtiene de CountryInfo
        isActive: formData.isActive, // <<< Usar formData
        prefix: formData.prefix, // <<< Usar formData
        commercialName: formData.commercialName, // <<< Usar formData
        businessName: formData.businessName, // <<< Usar formData
        cif: formData.cif, // <<< Usar formData
        // country: formData.country, // <<< Usar formData <<<- REEMPLAZAR si es redundante con countryIsoCode
        phone2: formData.phone2, // <<< Usar formData
        initialCash: formData.initialCash, // <<< Usar formData
        ticketSize: formData.ticketSize, // <<< Usar formData
        ip: formData.ip, // <<< Usar formData
        blockSignArea: formData.blockSignArea, // <<< Usar formData
        blockPersonalData: formData.blockPersonalData, // <<< Usar formData
        delayedPayments: formData.delayedPayments, // <<< Usar formData
        affectsStats: formData.affectsStats, // <<< Usar formData
        appearsInApp: formData.appearsInApp, // <<< Usar formData
        scheduleControl: formData.scheduleControl, // <<< Usar formData
        professionalSkills: formData.professionalSkills, // <<< Usar formData
        notes: formData.notes, // <<< Usar formData
        tariffId: formData.tariffId, // <<< Usar formData (asegurarse que Select actualiza formData)
        // linkedScheduleTemplateId se maneja después
      };

      // Limpiar propiedades undefined que podrían venir de Partial<ClinicaApiOutput>
      // La API podría fallar si se envían explícitamente como undefined.
      Object.keys(basePayload).forEach(key => {
         const typedKey = key as keyof typeof basePayload;
         if (basePayload[typedKey] === undefined) {
             delete basePayload[typedKey];
         }
      });

      // 2. Añadir lógica de horario (plantilla vs independiente) <<< ¡AÑADIR AQUÍ! >>>
      if (useTemplateSchedule) {
        // --- Guardando con Plantilla ---
        finalLinkedTemplateId = selectedTemplateId; // Asignar ID de plantilla
        // Asegurarse de no enviar datos independientes si usamos plantilla
        finalIndependentBlocksData = null; 
        // La API debería manejar deleteIndependentBlocks basado en linkedScheduleTemplateId no nulo
        finalDeleteIndependentBlocksFlag = true; // Ser explícito como en el contexto
        console.log(`[handleSaveClick] Modo Plantilla. Template ID: ${finalLinkedTemplateId}, Borrar bloques: ${finalDeleteIndependentBlocksFlag}`);
      } else {
        // --- Guardando con Horario Independiente ---
        finalLinkedTemplateId = null; // Desvincular plantilla
        finalIndependentBlocksData = independentSchedule; // Pasar el objeto WeekSchedule
        finalDeleteIndependentBlocksFlag = false; // No borrar bloques existentes si enviamos nuevos
        console.log(`[handleSaveClick] Modo Independiente. Template ID: ${finalLinkedTemplateId}, Borrar bloques: ${finalDeleteIndependentBlocksFlag}`);
        console.log(`[handleSaveClick] Datos horario independiente a enviar:`, finalIndependentBlocksData);
      }
      // <<< FIN LÓGICA DE HORARIO AÑADIDA >>>

      // 3. Construir el payload final que se envía a updateClinica
      //    updateClinica espera Partial<PrismaClinic> & { independentScheduleData?: any, deleteIndependentBlocks?: boolean }
      const finalPayload: Record<string, any> = { 
          ...basePayload, // Incluir los campos base de la clínica
          linkedScheduleTemplateId: finalLinkedTemplateId, // ID de plantilla (puede ser null)
      };

      // Añadir los bloques solo si existen
      if (finalIndependentBlocksData !== null) {
          // Usar la clave que espera la API (asumiendo 'independentScheduleData')
         finalPayload.independentScheduleData = finalIndependentBlocksData;
      }

      // Añadir el flag de borrado si se definió
      if (finalDeleteIndependentBlocksFlag !== undefined) {
         finalPayload.deleteIndependentBlocks = finalDeleteIndependentBlocksFlag;
      }

      // <<< INICIO: NUEVA LÓGICA PARA AÑADIR ORDEN DE CABINAS >>>
      // Crear el array 'cabinsOrder' a partir del estado 'displayedCabins'
      const cabinsOrderPayload = displayedCabins.map((cabin, index) => ({
          id: cabin.id,
          order: index // Usar el índice actual del array como el nuevo orden
      }));
      console.log("[handleSaveClick] Prepared cabinsOrder payload:", cabinsOrderPayload);
      // <<< FIN: NUEVA LÓGICA >>>

      // <<< AÑADIR explícitamente cabinsOrder si existe >>>
      if (cabinsOrderPayload && cabinsOrderPayload.length > 0) {
          finalPayload.cabinsOrder = cabinsOrderPayload;
          console.log("[handleSaveClick] Added cabinsOrder to finalPayload."); // Log de confirmación
      } else {
           console.log("[handleSaveClick] No cabinsOrder data to add."); // Log si no hay datos
      }
      // <<< FIN AÑADIR EXPLÍCITO >>>

      console.log("Datos finales enviados a updateClinica:", JSON.stringify(finalPayload, null, 2));

      // 4. Llamar a updateClinica con el payload final
      const clinicIdString = String(clinicData.id); 
      // Asegurar que el tipo de finalPayload sea compatible con lo que espera updateClinica
      // updateClinica espera Partial<PrismaClinic> pero acepta campos extra como vimos en el contexto
      const result = await updateClinica(clinicIdString, finalPayload as Partial<PrismaClinic> & { independentScheduleData?: any, deleteIndependentBlocks?: boolean });

      // 5. Procesar resultado (igual que antes, pero ajustando estados post-guardado)
      if (result) {
        toast("Configuración de la clínica guardada.");
        
        // FORZAR RECARGA DE DATOS para asegurar consistencia total post-guardado
        // Esto es más seguro que intentar sincronizar todos los estados manualmente.
        // await getClinicaById(clinicIdString); // <<< ELIMINAR ESTA LÍNEA >>>
        // La recarga del contexto debería actualizar `clinicData` y disparar los useEffects
        // para recalcular `useTemplateSchedule`, `selectedTemplateId`, `independentSchedule`, etc.
        
        /* // Alternativa: Sincronización manual (más propensa a errores) 
        setClinicData(result); // Actualizar con datos guardados
        const guardadoConPlantilla = !!result.linkedScheduleTemplateId;
        setUseTemplateSchedule(guardadoConPlantilla);
        setSelectedTemplateId(result.linkedScheduleTemplateId);
        setIdDePlantillaOriginalAlDesmarcar(null); // Limpiar
        setHaEditadoHorario(false);             // Limpiar
        if (guardadoConPlantilla) {
            setIndependentSchedule(null);
      } else {
            setIndependentSchedule(convertBlocksToWeekSchedule(result.independentScheduleBlocks, "00:00", "23:59"));
        }
         const finalScheduleForDisplay = guardadoConPlantilla
             ? convertBlocksToWeekSchedule(result.linkedScheduleTemplate?.blocks, "00:00", "23:59")
             : convertBlocksToWeekSchedule(result.independentScheduleBlocks, "00:00", "23:59");
         const { earliest, latest } = calcularBoundsSchedule(finalScheduleForDisplay);
         actualizarDisplayTimes(earliest, latest);
        */

      } else { 
         // ... (manejo de error igual que antes) ...
         toast("No se pudo guardar la configuración. Inténtalo de nuevo.");
      }
    } catch (error) {
       // ... (manejo de error igual que antes) ...
       console.error("Error detallado en handleSaveClick:", error);
       toast(`Error al guardar: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsSaving(false);
    }
  }, [
      clinicData, formData, updateClinica, useTemplateSchedule, independentSchedule, // <<< Añadir formData a dependencias
      selectedTemplateId, idDePlantillaOriginalAlDesmarcar, haEditadoHorario, 
      templates, // Quitar weekScheduleToPrismaBlocks si no se usa aquí
      getClinicaById, 
      displayedCabins // <<< AÑADIR displayedCabins a las dependencias de useCallback >>>
  ]);

  const handleExcepcionChange = (field: keyof ExcepcionHorariaLocal, value: any) => {
    if (editingExcepcion) {
      setEditingExcepcion({ ...editingExcepcion, [field]: value })
    } else {
      setNuevaExcepcion({ ...nuevaExcepcion, [field]: value })
    }
  }

  const handleCrearExcepcion = () => {
    // <<< INICIALIZAR CAMPOS FALTANTES PARA ExcepcionHorariaLocal >>>
    const nuevaExcepcionInicial: ExcepcionHorariaLocal = {
      id: Date.now().toString(),
      clinicaId: clinicId,
      nombre: "Nueva Excepción", // <<< VALOR POR DEFECTO >>>
      fechaInicio: "", // <<< VALOR POR DEFECTO >>>
      fechaFin: "", // <<< VALOR POR DEFECTO >>>
      dias: [], // <<< VALOR POR DEFECTO >>>
    };
    setEditingExcepcion({
      ...nuevaExcepcionInicial
    })
    setShowExcepcionModal(true)
  }

  const handleEditarExcepcion = (excepcionId: string) => {
    // const excepcion = scheduleExceptions.find(exc => exc.id === excepcionId); // << COMENTADO TEMPORALMENTE
    const excepcion = null; // Placeholder para evitar error
    if (excepcion) {
      console.warn("Editing exceptions needs mapping from Prisma structure.");
      // Usar el tipo local ExcepcionHorariaLocal
      setEditingExcepcion(excepcion as ExcepcionHorariaLocal);
      setShowExcepcionModal(true)
    }
  }

  const handleGuardarExcepcion = () => {
    if (!editingExcepcion) return

    console.warn("handleGuardarExcepcion needs refactoring for API calls and data mapping.");

    setShowExcepcionModal(false)
    setEditingExcepcion(null)

    toast("La excepción ha sido guardada correctamente")  }

  const handleEliminarExcepcion = (excepcionId: string) => {
    console.warn("handleEliminarExcepcion needs refactoring for API calls.");
    toast("La excepción ha sido eliminada exitosamente.")  }

  const handleToggleDiaExcepcion = (diaIndex: number, activo: boolean) => {
    if (!editingExcepcion) return
    
    const diasActualizados = [...editingExcepcion.dias]
    diasActualizados[diaIndex] = {
      ...diasActualizados[diaIndex],
      activo,
      franjas: activo ? diasActualizados[diaIndex].franjas : []
    }
    
    setEditingExcepcion({
      ...editingExcepcion,
      dias: diasActualizados
    })
  }

  const handleAddFranjaExcepcion = (diaIndex: number, inicio: string, fin: string) => {
    if (!editingExcepcion) return
    
    // Usar el tipo local FranjaHorariaLocal
    const nuevaFranja: FranjaHorariaLocal = {
      id: Date.now().toString(),
      inicio,
      fin
    }
    
    const diasActualizados = [...editingExcepcion.dias]
    diasActualizados[diaIndex] = {
      ...diasActualizados[diaIndex],
      franjas: [...diasActualizados[diaIndex].franjas, nuevaFranja]
    }
    
    setEditingExcepcion({
      ...editingExcepcion,
      dias: diasActualizados
    })
  }

  const handleRemoveFranjaExcepcion = (diaIndex: number, franjaId: string) => {
    if (!editingExcepcion) return
    
    const diasActualizados = [...editingExcepcion.dias]
    diasActualizados[diaIndex] = {
      ...diasActualizados[diaIndex],
      franjas: editingExcepcion.dias[diaIndex].franjas.filter(franja => franja.id !== franjaId)
    }
    
    setEditingExcepcion({
      ...editingExcepcion,
      dias: diasActualizados
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    // Simular una operación de guardado
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsSaving(false)
    // Aquí iría la lógica real de guardado
  }

  const { t } = useTranslation(); // <<< Asegurar que se llama >>>

  // <<< MOVER LA DEFINICIÓN DE TABS AQUÍ PARA PODER USAR t() >>>
  const clinicTabs = useMemo(() => [
    { id: "datos", label: t('config_clinics.tabs.datos'), icon: Building2 },
    { id: "horarios", label: t('config_clinics.tabs.horarios'), icon: Clock },
    { id: "usuarios", label: t('config_clinics.tabs.usuarios'), icon: Users },
    { id: "tarifa", label: t('config_clinics.tabs.tarifa'), icon: Tag },
    { id: "entidades", label: t('config_clinics.tabs.entidades'), icon: CreditCard },
    { id: "pagos", label: t('config_clinics.tabs.pagos'), icon: CreditCard },
    { id: "integraciones", label: t('config_clinics.tabs.integraciones'), icon: LucideLinkIcon }, // <<< USAR EL ALIAS
    { id: "descuentos", label: t('config_clinics.tabs.promotions', 'Promociones'), icon: Percent }, // Usar clave de promociones
    { id: "sms", label: t('config_clinics.tabs.sms'), icon: MessageSquare },
    { id: "email", label: t('config_clinics.tabs.email'), icon: Mail },
    { id: "whatsapp", label: t('config_clinics.tabs.whatsapp'), icon: Phone },
    { id: "otros", label: t('config_clinics.tabs.otros'), icon: Globe },
    { id: "sedes", label: t('config_clinics.tabs.sedes'), icon: MapPin },
    { id: "cabinas", label: t('config_clinics.tabs.cabinas'), icon: LayoutGrid },
    { id: "equipamiento", label: t('config_clinics.tabs.equipamiento'), icon: Wrench },
    { id: "almacenamiento", label: t('config_clinics.tabs.almacenamiento'), icon: HardDrive },
    { id: "depuracion", label: t('config_clinics.tabs.depuracion'), icon: Trash2 },
  ], [t]); // <<< Añadir t como dependencia >>>

  const [tarifaName, setTarifaName] = useState<string | null>(null);
  const [loadingTarifa, setLoadingTarifa] = useState<boolean>(false);
  const [currentScheduleConfig, setCurrentScheduleConfig] = useState<WeekSchedule | null>(null);

  useEffect(() => {
    if (clinicData) {
      const useTemplate = !!clinicData.linkedScheduleTemplateId;
      setUseTemplateSchedule(useTemplate);

      let schedule, openTime, closeTime, slotDuration, createGranularity;

      if (useTemplate && clinicData.linkedScheduleTemplate) {
        // Usar datos de la plantilla vinculada
        const template = clinicData.linkedScheduleTemplate;
        openTime = template.openTime;
        closeTime = template.closeTime;
        slotDuration = template.slotDuration;
        createGranularity = template.createGranularity;
        if (template.blocks) {
          schedule = convertBlocksToWeekSchedule(template.blocks, openTime || '00:00', closeTime || '23:59');
        }

      } else if (clinicData.independentSchedule) {
        // Usar datos del horario independiente
        const indSchedule = clinicData.independentSchedule;
        openTime = indSchedule.openTime;
        closeTime = indSchedule.closeTime;
        slotDuration = indSchedule.slotDuration;
        createGranularity = indSchedule.createGranularity;
        if (clinicData.independentScheduleBlocks) {
          schedule = convertBlocksToWeekSchedule(clinicData.independentScheduleBlocks, openTime || '00:00', closeTime || '23:59');
        }
      }

      // Establecer los estados de display
      setDisplayOpenTime(openTime || "09:00");
      setDisplayCloseTime(closeTime || "17:00");
      setDisplaySlotDuration(slotDuration || 30);
      setDisplayCreateGranularity(createGranularity || 5);
      setCurrentScheduleConfig(schedule || DEFAULT_SCHEDULE);

    }
  }, [clinicData]);

  const loadTarifaData = async () => {
    // ... existente ...
  };

  // <<< AJUSTAR onScheduleConfigChange para actualizar independentSchedule >>>
  const onScheduleConfigChange = useCallback((newSchedule: WeekSchedule) => {
    console.log("[Page] Schedule config changed by component:", newSchedule);
    // Solo actualizar el estado 'independentSchedule' si NO estamos usando plantilla
    if (!useTemplateSchedule) {
        console.log("[Page] Updating independentSchedule state...");
        setIndependentSchedule(newSchedule);
        setHaEditadoHorario(true); // Marcar que se ha editado desde que se desmarcó
    } else {
        console.log("[Page] In template mode, ignoring schedule change notification from component.");
    }
    // Ya no necesitamos setCurrentScheduleConfig aquí, lo quitamos
    // setCurrentScheduleConfig(newSchedule); 
  }, [useTemplateSchedule]); // Depender de useTemplateSchedule

  const selectedLegalEntityForDisplay = useMemo(() => {
    if (!formData?.legalEntityId || !Array.isArray(legalEntitiesData)) {
      return null;
    }
    // Assuming legalEntitiesData is an array of legal entity objects
    // @ts-ignore TS assumes legalEntitiesData is any[] so 'le' is any. Add specific type if available.
    return legalEntitiesData.find(le => le.id === formData.legalEntityId) || null;
  }, [formData?.legalEntityId, legalEntitiesData]);



  // ... useEffect para cargar datos de la clínica ...
  useEffect(() => {
    // ... existente ...
  }, [clinicId]);

  // ... handleSave, handleCancel, etc ...

  // NOTE: Linter error "No se encuentra el nombre 'crearExcepcionPorDefecto'." persiste.
  // Needs investigation to determine where this function should be defined or imported from.

  // ... return JSX ...

        return (
    <div className="container px-0 pt-4 pb-20"> {/* Añadir pb-20 para espacio footer */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Configuración de Clínica: {clinicData?.name}</h1>
                    </div>

      <div className="flex gap-6 items-start">
        <div className="w-64 shrink-0">
          <div className="sticky top-4 p-4 rounded-lg border shadow bg-card">
            <div className="flex flex-col space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      activeTab === item.id
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex-1">
          {clinicData && (
            <div className="space-y-6">
              <h2 className="mb-6 text-2xl font-semibold">{menuItems.find((item) => item.id === activeTab)?.label}</h2>

              {activeTab === "datos" && (
                <Card className="p-6">
                  <SectionTitle icon={Building2} title="Información general" color="text-blue-600 border-blue-600" />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="prefix" className="text-sm">
                        Prefijo
                      </Label>
                      <Input
                        id="prefix"
                        name="prefix" // <<< Añadir name
                        value={formData?.prefix || ''} // <<< Usar formData
                        className="h-9 text-sm"
                        onChange={handleFormChange} // <<< Usar handleFormChange
                      />
                        </div>
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm">
                        Nombre
                      </Label>
                      <Input
                        id="name"
                      name="name" // <<< AÑADIR O ASEGURAR ESTE ATRIBUTO
                      placeholder="Nombre de la clínica" // (Este ya debería estar)
                      required // (Este ya debería estar)
                      value={formData?.name || ''} // <<< CAMBIAR ESTE ATRIBUTO
                      onChange={handleFormChange} // <<< CAMBIAR ESTE ATRIBUTO
                      />
                        </div>
                    
                    <div className="space-y-2 md:col-span-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isActive"
                          name="isActive"
                          checked={formData?.isActive ?? false}
                          // onCheckedChange={handleFormChange} // <<< NO USAR handleFormChange directamente
                          onCheckedChange={(checked) => handleCheckboxSwitchChange(checked as boolean, 'isActive')} // <<< USAR NUEVO HANDLER
                        />
                        <Label htmlFor="isActive" className="text-sm font-medium cursor-pointer">
                          Clínica activa
                        </Label>
                        {/* Mantener el badge visual, leyendo de formData ahora */}
                        <div className={`ml-2 px-2 py-0.5 text-xs rounded-full ${formData?.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {formData?.isActive ? 'Activa' : 'Inactiva'}
                        </div>
                        </div>
                      <p className="ml-6 text-xs text-gray-500">
                        Las clínicas inactivas no aparecerán en los selectores por defecto,
                        pero sus datos se conservan y pueden reactivarse en cualquier momento.
                      </p>
                        </div>

                    <div className="space-y-2">
                      <Label htmlFor="commercialName" className="text-sm">
                        Nombre Comercial
                      </Label>
                      <Input
                        id="commercialName"
                        name="commercialName" // <<< Añadir name
                        value={formData?.commercialName || ''} // <<< Usar formData
                        className="h-9 text-sm"
                        onChange={handleFormChange} // <<< Usar handleFormChange
                      />
                      </div>
                    {/* 
                    <div className="space-y-2">
                      <Label htmlFor="businessName" className="text-sm">
                        Razón Social
                      </Label>
                      <Input
                        id="businessName"
                        name="businessName"
                        value={formData?.businessName || ''}
                        className="h-9 text-sm"
                        onChange={handleFormChange}
                      />
                    </div>
                    */}
                    {/* 
                    <div className="space-y-2">
                      <Label htmlFor="cif" className="text-sm">
                        CIF
                      </Label>
                      <Input
                        id="cif"
                        name="cif"
                        value={formData?.cif || ''}
                        className="h-9 text-sm"
                        onChange={handleFormChange}
                      />
                    </div>
                    */}
                    {/* FIN CIF Input div COMENTADO */} 

                    {/* Selector para Sociedad Mercantil Asociada (COMIENZO) */}
                    {/* Este div es un item del grid principal */}
                    <div className="space-y-2">
                      <Label htmlFor="legalEntityId" className="text-sm">
                        Sociedad Mercantil Asociada
                      </Label>
                      <Select
                        name="legalEntityId"
                        value={formData?.legalEntityId || ""} 
                        onValueChange={(value) => handleFormChange({ target: { name: 'legalEntityId', value: value === "NONE" ? null : value, type: 'select' } } as any)}
                        disabled={isLoadingLegalEntities}
                      >
                        <SelectTrigger className="h-9 text-sm" disabled={isLoadingLegalEntities}>
                          <SelectValue placeholder={isLoadingLegalEntities ? "Cargando sociedades..." : "Selecciona una sociedad"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">Ninguna</SelectItem>
                          {Array.isArray(legalEntitiesData) && legalEntitiesData.map((le: any) => (
                            <SelectItem key={le.id} value={le.id}>
                              {le.name} ({le.cif})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Selector para Sociedad Mercantil Asociada (FIN) */} 

                    {/* Tarjeta de Datos Fiscales de la Sociedad Mercantil Seleccionada (COMIENZO) */}
                    {selectedLegalEntityForDisplay && (
                      <div className="mt-1 md:col-span-1"> {/* Ajustado a md:col-span-1 */}
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="legal-entity-fiscal-data">
                            <AccordionTrigger className="py-3 text-sm">
                              Datos Fiscales Adicionales: {selectedLegalEntityForDisplay.name}
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="pt-2 pr-2 pb-1 pl-2 space-y-1 text-xs border-t">
                                {selectedLegalEntityForDisplay.taxIdentifierFields && typeof selectedLegalEntityForDisplay.taxIdentifierFields === 'object' && Object.keys(selectedLegalEntityForDisplay.taxIdentifierFields).length > 0 ? (
                                  Object.entries(selectedLegalEntityForDisplay.taxIdentifierFields).map(([key, value]) => (
                                    <div key={key} className="flex justify-between">
                                      <span className="font-semibold">{key}:</span>
                                      <span>{String(value)}</span>
                                    </div>
                                  ))
                                ) : (
                                  <p className="italic text-gray-500">No hay identificadores fiscales adicionales para esta sociedad.</p>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </div>
                    )}
                    {/* Tarjeta de Datos Fiscales (FIN) */} 
                  </div> {/* Este es el cierre del div className="grid gap-4 md:grid-cols-2" principal */}

                  {/* La sección Ubicación comienza DESPUÉS del grid principal de Info General */}
                  <SectionTitle icon={MapPin} title="Ubicación" color="text-green-600 border-green-600" />
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* ... resto de los campos de ubicación ... */}

                    <div className="space-y-2">
                      <Label htmlFor="countryIsoCode" className="text-sm"> {/* Cambiado htmlFor */}
                        País
                      </Label>
                      {/* <<< REEMPLAZO DEL INPUT POR SELECT >>> */}
                      <Select
                        name="countryIsoCode"
                        value={formData?.countryIsoCode || ""} // Usar "" como fallback para SelectTrigger
                        onValueChange={(value) => handleFormChange({ target: { name: 'countryIsoCode', value: value, type: 'select' } } as any)}
                        disabled={isLoadingCountries} // Deshabilitar mientras carga
                      >
                        <SelectTrigger className="h-9 text-sm" disabled={isLoadingCountries}>
                          <SelectValue placeholder={isLoadingCountries ? "Cargando países..." : "Selecciona un país"} />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingCountries ? (
                             <SelectItem value="loading" disabled>Cargando...</SelectItem>
                          ) : countriesError ? (
                             <SelectItem value="error" disabled>Error al cargar: {countriesError}</SelectItem>
                          ) : countries.length === 0 ? (
                             <SelectItem value="no-countries" disabled>No hay países disponibles</SelectItem>
                          ) : (
                            countries.map((country) => (
                              <SelectItem key={country.isoCode} value={country.isoCode}>
                                {country.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {/* <<< FIN REEMPLAZO >>> */}
                      </div>
                    <div className="space-y-2">
                      <Label htmlFor="province" className="text-sm">
                        Provincia
                      </Label>
                      <Input
                        id="province"
                        name="province" // <<< Añadir name
                        value={formData?.province || ''} // <<< Usar formData
                        className="h-9 text-sm"
                        onChange={handleFormChange} // <<< Usar handleFormChange
                      />
                      </div>
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-sm">
                        Ciudad
                      </Label>
                      <Input
                        id="city"
                        name="city" // <<< Añadir name
                        value={formData?.city || ''} // <<< Usar formData
                        className="h-9 text-sm"
                        onChange={handleFormChange} // <<< Usar handleFormChange
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postalCode" className="text-sm">
                        CP
                      </Label>
                      <Input
                        id="postalCode"
                        name="postalCode" // <<< Añadir name
                        value={formData?.postalCode || ''} // <<< Usar formData
                        className="h-9 text-sm"
                        onChange={handleFormChange} // <<< Usar handleFormChange
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address" className="text-sm">
                        Dirección
                      </Label>
                      <Input
                        id="address"
                        name="address" // <<< Añadir name
                        value={formData?.address || ''} // <<< Usar formData
                        className="h-9 text-sm"
                        onChange={handleFormChange} // <<< Usar handleFormChange
                      />
                    </div>
                  </div>

                  <SectionTitle icon={Phone} title="Contacto" color="text-orange-600 border-orange-600" />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm">
                        Teléfono
                      </Label>
                      {/* <<< ENVOLVER INPUT EN FLEX Y AÑADIR SELECT >>> */}
                      <div className="flex gap-2 items-center"> 
                        <Select
                          name="phone1CountryIsoCode" // Nombre para el handler
                          value={formData?.phone1CountryIsoCode || ""}
                          onValueChange={(value) => handleFormChange({ target: { name: 'phone1CountryIsoCode', value: value, type: 'select' } } as any)}
                          disabled={isLoadingCountries} // Deshabilitar mientras carga
                        >
                          <SelectTrigger id="clinic-phone1-prefix" className="h-9 w-auto min-w-[120px] text-sm"> {/* Ajustar ancho */}
                            <SelectValue placeholder={isLoadingCountries ? "Cargando..." : "Prefijo"} />
                          </SelectTrigger>
                          <SelectContent>
                            {isLoadingCountries ? (
                              <SelectItem value="loading" disabled>Cargando...</SelectItem>
                            ) : countriesError ? (
                              <SelectItem value="error" disabled>Error</SelectItem>
                            ) : countries.length === 0 ? (
                              <SelectItem value="no-countries" disabled>N/A</SelectItem>
                            ) : (
                              countries.map(country => (
                                <SelectItem key={country.isoCode} value={country.isoCode}>
                                  {country.phoneCode} ({country.isoCode})
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <Input 
                          id="phone" 
                          name="phone" // Asegurar que el input tiene nombre
                          value={formData.phone || ''} // Leer de formData
                          onChange={handleFormChange} // Usar handler general
                          className="flex-1 h-9 text-sm" // Ajustar clase
                        />
                      </div>
                      {/* Mostrar error si falla la carga de países */}
                      {countriesError && (
                        <p className="mt-1 text-xs text-red-500">Error al cargar prefijos: {countriesError}</p>
                      )}
                      {/* <<< FIN ENVOLVER Y AÑADIR SELECT >>> */}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone2" className="text-sm">
                        Teléfono 2
                      </Label>
                       {/* <<< ENVOLVER INPUT EN FLEX Y AÑADIR SELECT >>> */}
                       <div className="flex gap-2 items-center">
                         <Select
                           name="phone2CountryIsoCode" // Nombre para el handler
                           value={formData?.phone2CountryIsoCode || ""}
                           onValueChange={(value) => handleFormChange({ target: { name: 'phone2CountryIsoCode', value: value, type: 'select' } } as any)}
                           disabled={isLoadingCountries} // Deshabilitar mientras carga
                         >
                           <SelectTrigger id="clinic-phone2-prefix" className="h-9 w-auto min-w-[120px] text-sm"> {/* Ajustar ancho */}
                             <SelectValue placeholder={isLoadingCountries ? "Cargando..." : "Prefijo"} />
                           </SelectTrigger>
                           <SelectContent>
                             {isLoadingCountries ? (
                               <SelectItem value="loading" disabled>Cargando...</SelectItem>
                             ) : countriesError ? (
                               <SelectItem value="error" disabled>Error</SelectItem>
                             ) : countries.length === 0 ? (
                               <SelectItem value="no-countries" disabled>N/A</SelectItem>
                             ) : (
                               countries.map(country => (
                                 <SelectItem key={country.isoCode} value={country.isoCode}>
                                   {country.phoneCode} ({country.isoCode})
                                 </SelectItem>
                               ))
                             )}
                           </SelectContent>
                         </Select>
                         <Input 
                           id="phone2" 
                           name="phone2" // Asegurar que el input tiene nombre
                           value={formData.phone2 || ''} // Leer de formData
                           onChange={handleFormChange} // Usar handler general
                           className="flex-1 h-9 text-sm" // Ajustar clase
                         />
                       </div>
                       {/* Mostrar error si falla la carga de países */}
                       {countriesError && (
                         <p className="mt-1 text-xs text-red-500">Error al cargar prefijos: {countriesError}</p>
                       )}
                       {/* <<< FIN ENVOLVER Y AÑADIR SELECT >>> */}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="email" className="text-sm">
                        E-mail
                      </Label>
                      <Input
                        id="email"
                        name="email" // <<< Añadir name
                        type="email"
                        value={formData?.email || ''} // <<< Usar formData
                        className="h-9 text-sm"
                        onChange={handleFormChange} // <<< Usar handleFormChange
                      />
                    </div>
                  </div>

                  <SectionTitle icon={Settings2} title="Configuración" color="text-purple-600 border-purple-600" />
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Caja inicial</Label>
                      <Input
                        id="initialCash" // <<< Añadir id si falta
                        name="initialCash" // <<< Añadir name
                        type="number"
                        step="0.01"
                        value={formData?.initialCash ?? ''} // <<< Usar formData
                        className="h-9 text-sm"
                        onChange={handleFormChange} // <<< Usar handleFormChange
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Tamaño impresión ticket</Label>
                  <Select 
                        name="ticketSize" // <<< Añadir name
                        value={formData?.ticketSize || undefined} // <<< Usar formData
                        // onValueChange={(value) => debouncedHandleOtherFieldUpdate({ ticketSize: value })} // <<< Modificar
                        onValueChange={(value) => handleFormChange({ target: { name: 'ticketSize', value: value, type: 'select' } } as any)} // <<< Usar handleFormChange
                  >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Seleccionar tamaño" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="a5">Hoja A5</SelectItem>
                          <SelectItem value="a4">Hoja A4</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Tarifa</Label>
                      <Select
                        name="tariffId" // <<< Añadir name
                        value={formData?.tariffId || undefined} // <<< Usar formData
                        // onValueChange={(value) => debouncedHandleOtherFieldUpdate({ tariffId: value })} // <<< Modificar
                        onValueChange={(value) => handleFormChange({ target: { name: 'tariffId', value: value, type: 'select' } } as any)} // <<< Usar handleFormChange
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Seleccionar tarifa" />
                        </SelectTrigger>
                        <SelectContent>
                          {tarifas?.map((tarifa) => (
                            <SelectItem key={tarifa.id} value={tarifa.id}>
                              {tarifa.name}
                            </SelectItem>
                          ))}
                          {(!tarifas || tarifas.length === 0) && (
                            <SelectItem value="no-tarifs" disabled>
                              No hay tarifas disponibles
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">IP</Label>
                      <Input
                        id="ip" // <<< Añadir id si falta
                        name="ip" // <<< Añadir name
                        value={formData?.ip || ''} // <<< Usar formData
                        className="h-9 text-sm"
                        onChange={handleFormChange} // <<< Usar handleFormChange
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm">¿Desea bloquear el área de firma electrónica en Qleven?</Label>
                        <RadioGroup
                          name="blockSignArea" // <<< Añadir name
                          value={formData?.blockSignArea ? 'yes' : 'no'} // <<< Usar formData
                          // onValueChange={(value) => debouncedHandleOtherFieldUpdate({ blockSignArea: value === 'yes' })} // <<< Modificar
                          onValueChange={(value) => handleFormChange({ target: { name: 'blockSignArea', value: value === 'yes', type: 'radio' } } as any)} // <<< Usar handleFormChange
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="sign-no" />
                            <Label htmlFor="sign-no" className="text-sm">
                              No
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="sign-yes" />
                            <Label htmlFor="sign-yes" className="text-sm">
                              Sí, con la clave
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">¿Desea bloquear las áreas de datos personales en Qleven?</Label>
                        <RadioGroup
                          name="blockPersonalData" // <<< Añadir name
                          value={formData?.blockPersonalData ? 'yes' : 'no'} // <<< Usar formData
                          // onValueChange={(value) => debouncedHandleOtherFieldUpdate({ blockPersonalData: value === 'yes' })} // <<< Modificar
                          onValueChange={(value) => handleFormChange({ target: { name: 'blockPersonalData', value: value === 'yes', type: 'radio' } } as any)} // <<< Usar handleFormChange
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="personal-no" />
                            <Label htmlFor="personal-no" className="text-sm">
                              No
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="personal-yes" />
                            <Label htmlFor="personal-yes" className="text-sm">
                              Sí, con la clave
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Funcionalidades</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="delayed-payments"
                            checked={!!formData.delayedPayments} // <<< Usar formData
                            // onCheckedChange={(checked) => debouncedHandleOtherFieldUpdate({ delayedPayments: checked === true })} // <<< Modificar
                            onCheckedChange={(checked) => handleCheckboxSwitchChange(checked as boolean, 'delayedPayments')} // <<< Usar nuevo handler
                          />
                          <Label htmlFor="delayed-payments" className="text-sm">
                            Pagos aplazados
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="affects-stats"
                            checked={!!formData.affectsStats} // <<< Usar formData
                            // onCheckedChange={(checked) => debouncedHandleOtherFieldUpdate({ affectsStats: checked === true })} // <<< Modificar
                            onCheckedChange={(checked) => handleCheckboxSwitchChange(checked as boolean, 'affectsStats')} // <<< Usar nuevo handler
                          />
                          <Label htmlFor="affects-stats" className="text-sm">
                            Afecta estadísticas
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="appears-in-app"
                            checked={!!formData.appearsInApp} // <<< Usar formData
                            // onCheckedChange={(checked) => debouncedHandleOtherFieldUpdate({ appearsInApp: checked === true })} // <<< Modificar
                            onCheckedChange={(checked) => handleCheckboxSwitchChange(checked as boolean, 'appearsInApp')} // <<< Usar nuevo handler
                          />
                          <Label htmlFor="appears-in-app" className="text-sm">
                            Aparece en App / Self
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="schedule-control"
                            checked={!!formData.scheduleControl} // <<< Usar formData
                            // onCheckedChange={(checked) => debouncedHandleOtherFieldUpdate({ scheduleControl: checked === true })} // <<< Modificar
                            onCheckedChange={(checked) => handleCheckboxSwitchChange(checked as boolean, 'scheduleControl')} // <<< Usar nuevo handler
                          />
                          <Label htmlFor="schedule-control" className="text-sm">
                            Control de horarios
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="professional-skills"
                            checked={!!formData.professionalSkills} // <<< Usar formData
                            // onCheckedChange={(checked) => debouncedHandleOtherFieldUpdate({ professionalSkills: checked === true })} // <<< Modificar
                            onCheckedChange={(checked) => handleCheckboxSwitchChange(checked as boolean, 'professionalSkills')} // <<< Usar nuevo handler
                          />
                          <Label htmlFor="professional-skills" className="text-sm">
                            Control de habilidades profesionales
                          </Label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-sm">
                        Notas
                      </Label>
                      <Textarea
                        id="notes"
                        name="notes" // <<< Añadir name
                        value={formData?.notes || ''} // <<< Usar formData
                        className="h-20 text-sm"
                        onChange={handleFormChange} // <<< Usar handleFormChange
                      />
                    </div>
                  </div>
                </Card>
              )}

              {activeTab === "horarios" && (
                <Card className="p-6">
                  <Tabs defaultValue="general" className="w-full">
                    <TabsList className="mb-4">
                      <TabsTrigger value="general">Horario General</TabsTrigger>
                      <TabsTrigger value="excepciones">Excepciones</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="general">
                      <div className="space-y-4">
                        {/* <<< RESTAURAR INPUTS >>> */}
                        <div className="grid grid-cols-3 gap-4 mb-6">
                          <div className="space-y-2">
                            <Label>Horario Apertura</Label>
                            <Input
                              type="time"
                              // <<< LEER DIRECTAMENTE DEL ESTADO DE DISPLAY >>>
                              value={displayOpenTime} 
                              // --- El onChange actual probablemente cause error o no haga nada útil,
                              //     pero lo dejamos como está por ahora como pediste --- 
                              onChange={(e) => {
                                  if (!useTemplateSchedule) {
                                      // Esta lógica intenta actualizar una estructura que no existe así
                                      // handleOtherFieldUpdate({ independentSchedule: { ...clinicData?.independentSchedule, openTime: e.target.value } } as Partial<ClinicaApiOutput> )
                                      console.warn("onChange de Horario Apertura necesita revisión.")
                                  }
                              }}
                              disabled={useTemplateSchedule} // Mantener deshabilitado si usa plantilla
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Horario Cierre</Label>
                            <Input
                              type="time"
                              // <<< LEER DIRECTAMENTE DEL ESTADO DE DISPLAY >>>
                              value={displayCloseTime}
                              // --- El onChange actual probablemente cause error o no haga nada útil --- 
                              onChange={(e) => {
                                  if (!useTemplateSchedule) {
                                      // Esta lógica intenta actualizar una estructura que no existe así
                                      // handleOtherFieldUpdate({ independentSchedule: { ...clinicData?.independentSchedule, closeTime: e.target.value } } as Partial<ClinicaApiOutput> )
                                      console.warn("onChange de Horario Cierre necesita revisión.")
                                  }
                              }}
                              disabled={useTemplateSchedule}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Duración Slot (min)</Label>
                              <Input
                                type="number"
                                min="1"
                                max="60"
                                step="1"
                                value={displaySlotDuration}
                                onChange={(e) => {
                                  if (!useTemplateSchedule) {
                                    const value = Number.parseInt(e.target.value);
                                    const newValue = !isNaN(value) && value >= 1 && value <= 60 ? value : 30;
                                    setDisplaySlotDuration(newValue);
                                  }
                                }}
                                disabled={useTemplateSchedule}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Precisión al crear citas (minutos)</Label>
                              <Select
                                value={String(displayCreateGranularity)}
                                onValueChange={(value) => {
                                  if (!useTemplateSchedule) {
                                    setDisplayCreateGranularity(Number(value));
                                  }
                                }}
                                disabled={useTemplateSchedule}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                  {validGranularities.map((g) => (
                                    <SelectItem key={g} value={String(g)}>{g}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-gray-500">
                                Intervalos para crear citas. Debe ser divisor del slot.
                              </p>
                            </div>
                          </div>
                        </div>
                        {/* <<< FIN RESTAURAR >>> */}
                        
                        {/* Botón para aplicar horario general (condición revisada) */}
                        {!useTemplateSchedule && (
                            <div className="flex justify-end mb-4">
                                <Button 
                                    variant="outline"
                                    size="sm"
                                    onClick={handleApplyGeneralTimesToAllDays}
                                >
                                    Aplicar Horario General a Días Abiertos
                                </Button>
                            </div>
                        )}
                        {/* Fin Botón */}
                        <div className="space-y-2">
                          <Label>Seleccionar plantilla horaria</Label>
                          <Select 
                              value={clinicData.linkedScheduleTemplateId || ""} 
                              onValueChange={handleTemplateChange}
                              // Opcional: Deshabilitar el Select si useTemplateSchedule es true?
                              // disabled={useTemplateSchedule} // <-- Considerar si se debe poder cambiar plantilla mientras está bloqueado
                          >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar una plantilla"> {/* Placeholder si el valor es "" y no hay contenido */} 
                                    {/* CONTENIDO DINÁMICO AQUÍ */} 
                                    {clinicData.linkedScheduleTemplateId 
                                        ? (templates.find(t => t.id === clinicData.linkedScheduleTemplateId) as any)?.description || 
                                          (templates.find(t => t.id === clinicData.linkedScheduleTemplateId) as any)?.name || 
                                          `Plantilla ID: ${clinicData.linkedScheduleTemplateId}` // Fallback final al ID
                                        : <span className="text-muted-foreground">Horario personalizado</span>
                                    }
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {/* Opción para desvincular explícitamente? */} 
                                {/* 
                                <SelectItem value="__none__" onClick={() => handleUseTemplateToggle(false)}>
                                    -- Usar Horario Personalizado --
                                </SelectItem> 
                                */} 
                              {templates.map((template) => (
                                <SelectItem key={String(template.id)} value={String(template.id)}>
                                        {(template as any)?.description || `ID: ${template.id}`} {/* Usar descripción o ID */} 
                            </SelectItem>
                          ))}
                                {templates.length === 0 && <SelectItem value="_no_templates_" disabled>No hay plantillas</SelectItem>}
                        </SelectContent>
                      </Select>
                      </div>
                        {/* Checkbox Usar Plantilla (SIN disabled) */}
                        <div className="flex items-center mt-4 mb-4 space-x-2">
                            <Checkbox 
                                id="use-template-schedule"
                                checked={useTemplateSchedule}
                                onCheckedChange={handleUseTemplateToggle}
                                // disabled={!clinicData?.linkedScheduleTemplateId} // <-- ELIMINADO
                            />
                            <Label htmlFor="use-template-schedule" className="text-sm font-medium">
                                Usar horario de la plantilla vinculada (Bloquea edición)
                            </Label>
                  </div>
                        <Card className="mt-6">
                          <CardHeader>
                            <CardTitle>Configuración del Horario</CardTitle>
                            <CardDescription>
                              {useTemplateSchedule 
                                ? "El horario se basa en la plantilla seleccionada. Desmarca la opción anterior para editar manualmente."
                                : "Define los horarios de apertura por día. Haz clic en un día para expandir."
                              }
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            {isLoadingClinic || !clinicData ? (
                                <Skeleton className="w-full h-64" />
                            ) : (
                                <ScheduleConfig
                                    clinic={clinicData} 
                                    isReadOnly={useTemplateSchedule} 
                                    onChange={onScheduleConfigChange} // <<< Esta es la importante
                                    // schedule={currentScheduleConfig} // <<< ELIMINAR ESTA PROP >>>
                                    // showTemplateSelector={false} // Opcional: ocultar selector interno si se maneja fuera
                                    key={useTemplateSchedule ? `template-${selectedTemplateId}` : `independent-${clinicData.id}-${haEditadoHorario}`} // <<< Añadir haEditadoHorario a la key independiente para forzar re-render si cambia >>>
                            />
                            )}
                          </CardContent>
                        </Card>

                        {/* ... Sección Excepciones (si aplica) ... */}
                      </div>
                    </TabsContent>

                    <TabsContent value="excepciones" className="mt-4">
                      <Card>
                        <CardHeader>
                          <div className="flex justify-between items-center">
                            <div>
                              <CardTitle>Excepciones de Horario</CardTitle>
                              <CardDescription>
                                Define periodos específicos donde el horario general no aplica (ej. festivos, vacaciones).
                                Estos horarios especiales prevalecerán sobre el horario general de la clínica.
                              </CardDescription>
                            </div>
                            <Button size="sm" disabled>
                              <Plus className="mr-2 w-4 h-4" /> Añadir Nueva Excepción
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Fecha Inicio</TableHead>
                                <TableHead>Fecha Fin</TableHead>
                                <TableHead>Días Afectados</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground">
                                  No hay excepciones de horario definidas.
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </Card>
              )}

              {activeTab === "cabinas" && (
                <Card className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">Cabinas de la clínica: {clinicData?.name}</h3>
                      <Button onClick={() => {
                          setEditingCabin(null); // Asegurar que no hay cabina en edición
                          setIsCabinDialogOpen(true); // Abrir diálogo para nueva cabina
                        }}
                      >
                        <PlusCircle className="mr-2 w-4 h-4" /> Nueva cabina
                        </Button>
                    </div>
                    <SearchInput
                      placeholder="Buscar cabina por nombre o código"
                            value={cabinFilterText} 
                      onChange={setCabinFilterText}
                        />
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[100px]">Nº</TableHead>
                                <TableHead>Código</TableHead>
                            <TableHead>Nombre</TableHead>
                                <TableHead>Color</TableHead>
                            <TableHead className="text-center">Activo</TableHead>
                            <TableHead className="text-center">Subir</TableHead>
                            <TableHead className="text-center">Bajar</TableHead>
                            <TableHead className="text-center">Borrar</TableHead>
                            <TableHead className="text-center">Ver +</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoadingCabinsLocal ? ( // <<< Usar isLoadingCabinsLocal
                            <TableRow>
                              <TableCell colSpan={9} className="h-24 text-center">
                                Cargando cabinas...
                              </TableCell>
                            </TableRow>
                          ) : displayedCabins.length === 0 ? ( // <<< Usar displayedCabins
                            <TableRow>
                              <TableCell colSpan={9} className="h-24 text-center">
                                No se encontraron cabinas para esta clínica.
                              </TableCell>
                            </TableRow>
                          ) : (
                            displayedCabins // <<< Usar displayedCabins
                              .filter(
                                (cabin: Cabin) =>
                                  cabin.name.toLowerCase().includes(cabinFilterText.toLowerCase()) ||
                                  (cabin.code && cabin.code.toLowerCase().includes(cabinFilterText.toLowerCase()))
                              )
                              .map((cabin, index, filteredArray) => ( // <<< Añadir filteredArray para calcular último índice
                                <TableRow key={cabin.id} className={cabin.isActive ? "" : "opacity-50"}>
                                        <TableCell>{index + 1}</TableCell> 
                                  <TableCell>{cabin.code ?? '-'}</TableCell>
                                  <TableCell>{cabin.name}</TableCell>
                                  <TableCell>
                                    <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: cabin.color ?? '#ffffff' }}></div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Checkbox
                                      checked={cabin.isActive}
                                      // <<< TODO: Actualizar estado local Y luego guardar en handleSaveClick >>>
                                      onCheckedChange={(checked) => {
                                        console.warn("Checkbox change needs to update local state 'displayedCabins' first.");
                                        // setDisplayedCabins(prev => 
                                        //   prev.map(c => c.id === cabin.id ? {...c, isActive: checked as boolean} : c)
                                        // );
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="w-10 h-10 text-gray-600 hover:text-gray-800"
                                      onClick={() => handleReorderCabin(cabin.id, 'up')}
                                      // <<< DESHABILITAR SI ES EL PRIMERO DEL ARRAY FILTRADO >>>
                                      disabled={index === 0} 
                                    >
                                      <ChevronUp className="w-6 h-6 font-bold" />
                                </Button>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="w-10 h-10 text-gray-600 hover:text-gray-800"
                                      onClick={() => handleReorderCabin(cabin.id, 'down')}
                                      // <<< DESHABILITAR SI ES EL ÚLTIMO DEL ARRAY FILTRADO >>>
                                      disabled={index === filteredArray.length - 1}
                                    >
                                      <ChevronDown className="w-6 h-6 font-bold" />
                                </Button>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {/* ... (Botón Borrar - necesita lógica similar para estado local) ... */}
                                    <Button
                                       variant="ghost"
                                       size="sm"
                                       className="w-10 h-10 text-destructive hover:text-red-700"
                                       onClick={() => {
                                         console.warn("Delete cabin needs to update local state 'displayedCabins' first.");
                                         // setDisplayedCabins(prev => prev.filter(c => c.id !== cabin.id));
                                       }}
                                     >
                                       <Trash2 className="w-6 h-6 font-bold" /> 
                                     </Button>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {/* ... (Botón Ver +) ... */}
                                    <Button
                                       variant="ghost"
                                       size="sm"
                                       className="w-10 h-10 text-blue-600 hover:text-blue-800"
                                       onClick={() => {
                                         setEditingCabin(cabin);
                                         setIsCabinDialogOpen(true);
                                       }}
                                     >
                                       <Search className="w-6 h-6 font-bold" />
                                     </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </Card>
              )}

              {activeTab === "equipamiento" && (
                <Card className="p-6">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <h2 className="text-lg font-medium">Equipamiento de {clinicData?.name || 'la clínica'}</h2>
                      <p className="mt-1 text-sm text-gray-600">
                        Gestiona los equipamientos asignados a esta clínica específica.
                      </p>
                    </div>

                    {loadingEquipment ? (
                      <Card className="overflow-hidden p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead><Skeleton className="w-40 h-4" /></TableHead>
                              <TableHead><Skeleton className="w-60 h-4" /></TableHead>
                              <TableHead><Skeleton className="w-20 h-4" /></TableHead>
                              <TableHead><Skeleton className="w-32 h-4" /></TableHead>
                              <TableHead className="text-right"><Skeleton className="w-16 h-4" /></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {[...Array(3)].map((_, i) => (
                              <TableRow key={i}>
                                <TableCell><Skeleton className="w-full h-4" /></TableCell>
                                <TableCell><Skeleton className="w-full h-4" /></TableCell>
                                <TableCell><Skeleton className="w-full h-4" /></TableCell>
                                <TableCell><Skeleton className="w-full h-4" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="inline-block w-8 h-8" /></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Card>
                    ) : (
                      <EquipmentTableForClinic clinicId={clinicId} />
                    )}
                  </div>
                </Card>
              )}

              {activeTab === "almacenamiento" && (
                <Card className="p-6">
                  {/* <AlmacenamientoClinicaContent /> */} {/* Comentado temporalmente */}
                </Card>
              )}

              {activeTab === "usuarios" && (
                <Card className="p-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">Usuarios de la clínica: {clinicData.name}</h3>
                    </div>
                    
                    <UsuariosClinica 
                      clinicId={clinicId}
                      showNewUserDialog={showNewUserDialog}
                      onCloseNewUserDialog={() => setShowNewUserDialog(false)}
                    />
                  </div>
                </Card>
              )}

              {activeTab === "entidades" && (
                <Card className="p-6">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CreditCard className="mr-2 w-5 h-5 text-purple-600" />
                      {t('config_clinics.tabs.entidades')} 
                    </CardTitle>
                    {/* CardDescription eliminada */}
                  </CardHeader>
                  <CardContent>
                    {/* Renderizar el nuevo componente pasándole el clinicId */}
                    <ClinicBanksTabContent clinicId={clinicId} />
                  </CardContent>
                </Card>
              )}
              
              {activeTab === "pagos" && (
                <Card className="p-6">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CreditCard className="mr-2 w-5 h-5 text-orange-600" /> {/* Color opcional */}
                      {t('config_clinics.tabs.pagos')} 
                    </CardTitle>
                    <CardDescription>
                      {t('config_clinic_payment_settings.description')} {/* Añadir key traducción */}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* <<< RENDERIZAR EL NUEVO COMPONENTE >>> */}
                    <ClinicPaymentsTabContent clinicId={clinicId} />
                  </CardContent>
                </Card>
              )}
              
              {activeTab === "integraciones" && (
                <Card className="p-6">
                  <h3>Integraciones</h3>
                </Card>
              )}
              
              {activeTab === "descuentos" && (
                <Card className="p-6">
                  {/* <<< REEMPLAZAR CONTENIDO INTERNO >>> */}
                  {clinicId ? (
                      <ClinicPromotionsTabContent clinicId={clinicId} />
                   ) : (
                      <p>{t('common.loading', 'Cargando...')}</p> // O Skeleton
                   )}
                   {/* Antes probablemente había algo como <SectionTitle.../> y contenido de descuentos */}
                </Card>
              )}
              {/* <<< FIN MODIFICACIÓN >>> */}

              {activeTab === "sms" && (
                <Card className="p-6">
                  <SectionTitle icon={MessageSquare} title={t('config_clinics.tabs.sms')} color="text-blue-600 border-blue-600" />
                  {/* ... existing code ... */}
                </Card>
              )}
              
              {activeTab === "email" && (
                <Card className="p-6">
                  <h3>Notificaciones e-mail</h3>
                </Card>
              )}
              
              {activeTab === "whatsapp" && (
                <Card className="p-6">
                  <h3>Notificaciones WhatsApp</h3>
                </Card>
              )}
              
              {activeTab === "otros" && (
                <Card className="p-6">
                  <h3>Otros APIs</h3>
                </Card>
              )}

              {activeTab === "tarifa" && (
                <Card className="p-6">
                  <SectionTitle icon={Tag} title="Tarifa Aplicada" color="text-teal-600 border-teal-600" />
                  {isLoadingTarifa ? (
                    <p className="text-gray-500">Cargando información de la tarifa...</p>
                  ) : tarifaAplicada === null ? (
                    <p className="text-gray-500">
                      {clinicData?.tariffId ? 
                         `No se encontró la tarifa con ID: "${clinicData.tariffId}". Verifique la configuración.` : 
                         "Esta clínica no tiene una tarifa asignada."}
                    </p>
                  ) : tarifaAplicada ? (
                    <div className="space-y-4">
                       <div>
                          <Label className="block mb-1 text-sm font-medium text-gray-500">Nombre Tarifa</Label>
                          <p className="text-lg font-semibold">{tarifaAplicada.name}</p>
                       </div>
                       <Button onClick={() => router.push(`/configuracion/clinicas/${clinicId}/servicios`)} className="mt-4">
                          Configurar Servicios y Precios para esta Clínica
                       </Button>
                    </div>
                  ) : (
                     <p className="text-gray-500">Inicializando...</p>
                  )}
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
      
      <CabinEditDialog
        isOpen={isCabinDialogOpen}
        cabin={editingCabin}
        onClose={() => {
          setIsCabinDialogOpen(false)
          setEditingCabin(null)
        }}
        onSave={handleSaveCabin as any}
      />

      <div className="fixed z-50 flex flex-col items-start space-y-2 bottom-4 left-4 md:left-auto md:bottom-4 md:right-[calc(theme(spacing.4)+160px)] md:flex-row md:space-y-0 md:space-x-2">
        {/* Mover aquí los botones condicionales "Nuevo..." */}
        {activeTab === "cabinas" && (
          <Button
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md shadow-md hover:bg-blue-700"
            onClick={() => {
              setEditingCabin(null)
              setIsCabinDialogOpen(true)
            }}
          >
            <Plus className="mr-2 w-4 h-4" />
            Nueva cabina
          </Button>
        )}
{/* Botón "Nuevo equipamiento" eliminado - funcionalidad legacy */}
        {activeTab === "usuarios" && (
          <Button
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md shadow-md hover:bg-blue-700"
            onClick={() => setShowNewUserDialog(true)}
          >
            <Plus className="mr-2 w-4 h-4" />
            Nuevo usuario
          </Button>
        )}
      </div>

      <ActionButtons
        fixed={true}
        alignment="end" // Alinea los botones principales (Guardar/Ayuda) a la derecha
        onBack={() => router.push('/configuracion/clinicas')} // Define la acción de volver
        onSave={handleSaveClick} // Pasa la función de guardado
        isSaving={isSaving} // Pasa el estado de guardado
        saveText="Guardar Centro" // Texto específico para guardar
        // helpContent={<div>Contenido de ayuda aquí...</div>} // Descomentar para añadir ayuda
        className="space-x-2" // Añadir espacio entre grupos de botones si es necesario
      >
        {/* Botones adicionales (Nuevo...) se renderizan fuera de ActionButtons */}
      </ActionButtons>
    </div>
  )
}
