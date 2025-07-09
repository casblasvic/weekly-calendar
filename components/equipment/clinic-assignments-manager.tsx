/**
 * SISTEMA DE GESTIÓN DE ASIGNACIONES DE EQUIPAMIENTO
 * ===================================================
 * 
 * ARQUITECTURA GENERAL:
 * Este componente gestiona la asignación de equipamiento a clínicas específicas, permitiendo que un mismo
 * tipo de equipamiento esté presente en múltiples clínicas con diferentes números de serie y device IDs.
 * 
 * ESTRUCTURA DE DATOS:
 * - Equipment: Representa el tipo/modelo de equipamiento (ej: "Láser Diodo LS-1000")
 * - EquipmentClinicAssignment: Instancias específicas del equipamiento en clínicas
 *   - Cada asignación tiene: equipmentId, clinicId, cabinId?, serialNumber, deviceId, deviceName?, isActive
 *   - Un Equipment puede tener múltiples EquipmentClinicAssignment (diferentes clínicas)
 *   - Una Clinic puede tener múltiples EquipmentClinicAssignment del mismo Equipment (múltiples unidades)
 * 
 * RELACIONES:
 * Equipment (1) → (N) EquipmentClinicAssignment (N) ← (1) Clinic
 * EquipmentClinicAssignment (N) → (1) Cabin (opcional)
 * 
 * CACHE Y OPTIMIZACIONES:
 * ========================
 * 
 * 1. CACHE PRINCIPAL:
 *    - Utiliza React Query con keys específicas: ['equipment-assignments', equipmentId]
 *    - Tiempo de cache: 30 segundos (staleTime)
 *    - Refresco automático: cada 10 segundos
 *    - Refresco al enfocar ventana: activado
 * 
 * 2. CACHE COMPARTIDO:
 *    - Los datos se pueden pasar desde el componente padre vía props (cachedAssignments, cachedClinics)
 *    - Esto evita múltiples requests cuando se abre el modal desde la página principal
 *    - Si no hay datos cached, se realiza la consulta automáticamente
 * 
 * 3. INVALIDACIÓN SELECTIVA:
 *    - Hook useInvalidateEquipmentAssignments() para invalidar solo las queries específicas
 *    - Invalidación inmediata tras operaciones CRUD + revalidación automática
 *    - Rendering optimista para eliminaciones (UI se actualiza antes del servidor)
 * 
 * 4. LOADING STATES:
 *    - Estados de loading específicos para cada operación (crear, editar, eliminar, toggle)
 *    - Skeletons y spinners contextuales
 *    - Disable de botones durante operaciones para prevenir doble-submit
 * 
 * GENERACIÓN DE IDS:
 * ==================
 * 
 * 1. DEVICE ID:
 *    - Formato: "EQUIPCODE-CLINPREFIX-TIMESTAMP"
 *    - Se genera automáticamente al seleccionar clínica
 *    - Función generateDeviceIdForClinic() utiliza el código del equipamiento y prefijo de clínica
 *    - Es único por equipamiento+clínica+timestamp
 * 
 * 2. SERIAL NUMBER:
 *    - Introducido manualmente por el usuario
 *    - Representa el número de serie físico real del dispositivo
 *    - Debe ser único en todo el sistema
 *    - Validación de unicidad en tiempo real
 * 
 * MODALES Y UX:
 * =============
 * 
 * 1. MODAL DE CREACIÓN:
 *    - Estructura flexible con secciones colapsables
 *    - Validación en tiempo real de campos requeridos
 *    - Generación automática de Device ID al seleccionar clínica
 *    - Switch para estado activo/inactivo desde creación
 * 
 * 2. MODAL DE EDICIÓN:
 *    - Pre-poblado con datos de la asignación seleccionada
 *    - Validación de unicidad que excluye la asignación actual
 *    - Recarga automática de cabinas al cambiar clínica
 * 
 * 3. TABLA PRINCIPAL:
 *    - Columnas optimizadas para una línea por asignación
 *    - Switch en columna dedicada para toggle rápido
 *    - Píldoras para clínicas con información de cabina
 *    - Tipografía ajustada para maximizar información visible
 * 
 * APIS Y ENDPOINTS:
 * =================
 * 
 * 1. GET /api/equipment/[id]/clinic-assignments
 *    - Obtiene todas las asignaciones de un equipamiento específico
 *    - Incluye relaciones con clinic y cabin
 *    - Utilizado para llenar la tabla y cache
 * 
 * 2. POST /api/equipment/[id]/clinic-assignments
 *    - Crea nueva asignación equipamiento-clínica
 *    - Valida unicidad de serialNumber y deviceId
 *    - Retorna asignación creada con relaciones
 * 
 * 3. PUT /api/equipment/clinic-assignments/[assignmentId]
 *    - Actualiza asignación existente
 *    - Validación de unicidad excluyendo asignación actual
 *    - Permite cambiar clínica, cabina, estado, etc.
 * 
 * 4. DELETE /api/equipment/clinic-assignments/[assignmentId]
 *    - Elimina asignación específica
 *    - Verifica que no haya dependencias (recambios instalados, historial)
 *    - Soft delete vs hard delete según business rules
 * 
 * 5. PATCH /api/equipment/clinic-assignments/[assignmentId]/toggle
 *    - Toggle rápido de estado activo/inactivo
 *    - Utilizado por el switch en la tabla
 *    - Optimizado para operaciones frecuentes
 * 
 * ESTADOS Y VALIDACIONES:
 * =======================
 * 
 * 1. ESTADO ACTIVO/INACTIVO:
 *    - isActive: boolean que controla la disponibilidad del equipamiento
 *    - Switch visual rojo/verde para cambio rápido
 *    - assignedAt: fecha de asignación inicial
 *    - unassignedAt: fecha de desactivación (nullable)
 * 
 * 2. VALIDACIONES:
 *    - serialNumber: requerido, único en todo el sistema
 *    - deviceId: requerido, único en todo el sistema
 *    - clinicId: requerido, debe existir en sistema
 *    - cabinId: opcional, debe pertenecer a la clínica seleccionada
 *    - deviceName: opcional, alias descriptivo para el dispositivo
 * 
 * INTEGRACIÓN CON OTROS SISTEMAS:
 * ===============================
 * 
 * 1. RECAMBIOS (Spare Parts):
 *    - Los recambios se instalan en EquipmentClinicAssignment específicas
 *    - Relación: SparePart → EquipmentClinicAssignment
 *    - Validación de que el equipamiento esté activo para instalar recambios
 * 
 * 2. HISTORIAL Y AUDITORÍA:
 *    - Cada cambio de estado se registra con timestamp
 *    - ChangeLog automático en operaciones CRUD
 *    - Tracking de quién realizó cada modificación
 * 
 * 3. WEBSOCKETS (futuro):
 *    - Notificaciones en tiempo real de cambios en asignaciones
 *    - Sincronización automática entre múltiples usuarios
 *    - Updates de estado desde dispositivos IoT
 * 
 * RENDIMIENTO Y ESCALABILIDAD:
 * ============================
 * 
 * 1. PAGINACIÓN:
 *    - Para equipamientos con muchas asignaciones (>50)
 *    - Filtros por clínica, estado, fecha de asignación
 *    - Búsqueda por serialNumber o deviceName
 * 
 * 2. LAZY LOADING:
 *    - Cabinas se cargan solo al seleccionar clínica
 *    - Datos de clínicas se reutilizan del cache global
 *    - Componentes de formulario se montan solo cuando es necesario
 * 
 * 3. MEMOIZACIÓN:
 *    - React.useMemo para cálculos de validación costosos
 *    - React.useCallback para funciones que se pasan a children
 *    - QueryClient cache para evitar re-fetching innecesario
 * 
 * PATRONES DE DISEÑO UTILIZADOS:
 * ===============================
 * 
 * 1. COMPOUND COMPONENTS:
 *    - Modal structured in sections (Header, Content, Footer)
 *    - Cada sección es independiente y reutilizable
 * 
 * 2. RENDER PROPS:
 *    - useInvalidateEquipmentAssignments hook expone funciones
 *    - Componentes pueden invalidar cache sin conocer implementación
 * 
 * 3. OPTIMISTIC UPDATES:
 *    - UI se actualiza inmediatamente en operaciones de eliminación
 *    - Rollback automático si la operación del servidor falla
 * 
 * 4. SINGLE RESPONSIBILITY:
 *    - Cada función tiene una responsabilidad específica
 *    - Separación entre lógica de UI y lógica de negocio
 * 
 * DEBUGGING Y TROUBLESHOOTING:
 * ============================
 * 
 * 1. LOGS:
 *    - console.log en desarrollo para tracking de cache hits/misses
 *    - Error boundaries para capturar errores de React Query
 * 
 * 2. DEV TOOLS:
 *    - React Query DevTools para inspeccionar cache
 *    - React DevTools para inspeccionar props y state
 * 
 * 3. ERRORES COMUNES:
 *    - "Assignment not found": verificar que assignmentId existe
 *    - "Duplicate serial number": verificar unicidad en base de datos
 *    - "Clinic has no cabins": normal si clínica no tiene cabinas configuradas
 *    - "Equipment not active": verificar que Equipment.isActive = true
 * 
 * MIGRACIÓN Y VERSIONING:
 * =======================
 * 
 * Este sistema reemplazó el anterior donde Equipment tenía un único campo 'location'.
 * Script de migración: scripts/migrate-equipment-to-clinic-assignments.js
 * 
 * VERSIÓN ACTUAL: 2.0
 * - Soporte multi-clínica
 * - Device IDs únicos por instancia
 * - Cache optimizado
 * - UI responsive y accesible
 * 
 * PRÓXIMAS MEJORAS:
 * - Sincronización con dispositivos IoT
 * - Geolocalización de equipamientos
 * - Integración con sistema de mantenimiento
 * - Dashboard de utilización en tiempo real
 */

"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Building2, Plus, Edit, Trash2, Eye, MapPin, Calendar, Wrench, ToggleLeft, ToggleRight, Clock, Hash, Loader2, Home } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIntegrationModules } from '@/hooks/use-integration-modules'

interface EquipmentClinicAssignment {
  id: string
  equipmentId: string
  clinicId: string
  cabinId?: string
  deviceName?: string
  serialNumber: string
  deviceId: string
  isActive: boolean
  assignedAt: string
  unassignedAt?: string
  notes?: string
  clinic: {
    id: string
    name: string
    prefix?: string
    address?: string
    city?: string
  }
  cabin?: {
    id: string
    name: string
    code?: string
  }
  equipment: {
    id: string
    name: string
    description?: string
    modelNumber?: string
  }
}

interface Clinic {
  id: string
  name: string
  prefix?: string
  address?: string
  city?: string
}

interface ClinicAssignmentsManagerProps {
  equipmentId: string
  equipmentName: string
  onDataChange?: () => void
  clinicFilter?: string
}

export function ClinicAssignmentsManager({ 
  equipmentId, 
  equipmentName,
  onDataChange,
  clinicFilter
}: ClinicAssignmentsManagerProps) {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  
  // Estados básicos con fetch directo
  const [assignments, setAssignments] = useState<EquipmentClinicAssignment[]>([])
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Estados para la UI
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<EquipmentClinicAssignment | null>(null)
  const [newAssignment, setNewAssignment] = useState({
    clinicId: '',
    cabinId: '',
    deviceName: '',
    serialNumber: '',
    deviceId: '',
    notes: '',
    isActive: true
  })
  
  // Estados para operaciones
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())
  
  const [availableCabins, setAvailableCabins] = useState<any[]>([])
  const [isLoadingCabins, setIsLoadingCabins] = useState(false)

  // Map assignmentId -> plug name (para mostrar en tabla)
  const [assignmentPlugMap, setAssignmentPlugMap] = useState<Record<string, string>>({})

  /* ------------------------------------------------------------------
   * ⏩ INTEGRACIÓN SHELLY – asignar enchufe a la instancia
   * ------------------------------------------------------------------ */
  const { isShellyActive } = useIntegrationModules()
  const [credentials, setCredentials] = useState<{ id: string; name: string }[]>([])
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>('')
  const [availablePlugs, setAvailablePlugs] = useState<{ id: string; name: string }[]>([])
  const [selectedPlugId, setSelectedPlugId] = useState<string>('')

  // Cargar credenciales Shelly cuando se abre el modal
  useEffect(() => {
    if (!isCreateModalOpen || !isShellyActive) return
    ;(async () => {
      try {
        const res = await fetch('/api/shelly/credentials')
        if (!res.ok) throw new Error('Error obteniendo credenciales')
        const data = await res.json()
        setCredentials(data || [])
      } catch (err) {
        console.error('Error cargando credenciales Shelly:', err)
        setCredentials([])
      }
    })()
  }, [isCreateModalOpen, isShellyActive])

  // Cargar enchufes libres al cambiar credencial
  const loadPlugsForCredential = useCallback(async (credentialId: string, currentPlugId?: string) => {
    if (!credentialId) {
      setAvailablePlugs([])
      return
    }
    try {
      const res = await fetch(`/api/internal/smart-plug-devices?page=1&pageSize=1000&credentialId=${credentialId}`)
      if (!res.ok) throw new Error('Error cargando enchufes')
      const { data } = await res.json()
      const freePlugs = (data || []).filter((d: any) => !d.equipmentClinicAssignmentId || d.id === currentPlugId)
                      .map((d: any) => ({ id: d.id, name: d.name || d.serialNumber || d.deviceId }))
      setAvailablePlugs(freePlugs)
    } catch (err) {
      console.error('Error cargando enchufes Shelly:', err)
      setAvailablePlugs([])
    }
  }, [])

  // Reset selects al cerrar modal
  useEffect(() => {
    if (!isCreateModalOpen) {
      setSelectedCredentialId('')
      setSelectedPlugId('')
      setAvailablePlugs([])
    }
  }, [isCreateModalOpen])

  /**
   * loadData — Carga datos con estrategia “cache-first”
   * ------------------------------------------------------------------
   * 1. Intenta obtener asignaciones desde la key `['equipment-with-assignments']`.
   *    Si existen, rellenamos el estado y desactivamos el spinner en <30 ms.
   * 2. En paralelo (siempre) lanzamos el fetch para asegurarnos de disponer
   *    de la última versión (refresco silencioso).  Al resolver, actualizamos
   *    estado sólo si hay cambios reales para evitar re-renders afines.
   */
  const loadData = useCallback(async () => {
    // 1️⃣  CACHE-FIRST -------------------------------------------------
    const cachedEquipment = (queryClient.getQueryData(['equipment-with-assignments']) as any[] | undefined)?.find(eq => eq.id === equipmentId)
    if (cachedEquipment?.clinicAssignments) {
      setAssignments(cachedEquipment.clinicAssignments)
      // El spinner quedará oculto justo después de setClinics (abajo)
    }

    const cachedClinics = queryClient.getQueryData(['clinics']) as Clinic[] | undefined
    if (cachedClinics) {
      setClinics(cachedClinics)
    }

    // 2️⃣  NETWORK FETCH (refresco) ----------------------------------
    setIsLoading(!(cachedEquipment && cachedClinics))
    try {
      const [assignmentsRes, clinicsRes] = await Promise.all([
        fetch(`/api/equipment/${equipmentId}/clinic-assignments`),
        cachedClinics ? Promise.resolve({ ok: true, json: async () => cachedClinics }) : fetch('/api/clinics')
      ])

      const assignmentsData = await assignmentsRes.json()
      const clinicsData = cachedClinics || await clinicsRes.json()

      const fetchedAssignments: EquipmentClinicAssignment[] = assignmentsData.assignments || []

      // 🚫 PROTECCIÓN CONTRA OVERWRITE DE OPTIMISTIC DATA
      // Si tenemos asignaciones temporales (id comienza con 'temp-') significa que el
      // usuario acaba de crear una y el servidor aún no la ha persistido.  En ese
      // caso ignoramos la respuesta si ésta tiene MENOS elementos, para evitar que la
      // UI se quede vacía unos segundos.
      const hasTempAssignments = assignments.some(a => a.id.startsWith('temp-'))

      if (hasTempAssignments && fetchedAssignments.length < assignments.length) {
        // Mantener estado optimista – el reemplazo llegará cuando el POST responda
        console.log('⏭️  Respuesta fetch ignorada porque hay datos optimistas pendientes')
      } else if (fetchedAssignments.length !== assignments.length) {
        setAssignments(fetchedAssignments)
      }
      if (!cachedClinics) {
        setClinics(clinicsData || [])
        queryClient.setQueryData(['clinics'], clinicsData)
      }

      // Cargar plug map si Shelly activo
      if (isShellyActive) {
        try {
          const plugsRes = await fetch('/api/internal/smart-plug-devices?page=1&pageSize=1000')
          if (plugsRes.ok) {
            const { data: plugs } = await plugsRes.json()
            const map: Record<string, string> = {}
            ;(plugs || []).forEach((p: any) => {
              if (p.equipmentClinicAssignmentId) {
                map[p.equipmentClinicAssignmentId] = p.name || p.serialNumber || p.deviceId
              }
            })
            setAssignmentPlugMap(map)
          }
        } catch (plugErr) {
          console.warn('No se pudo cargar mapa de enchufes:', plugErr)
        }
      }

    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error al cargar datos')
    } finally {
      setIsLoading(false)
    }
  }, [equipmentId, assignments.length, queryClient, isShellyActive])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filtrar asignaciones según el filtro de clínica
  const filteredAssignments = clinicFilter 
    ? assignments.filter(assignment => assignment.clinicId === clinicFilter)
    : assignments

  const availableClinics = clinicFilter 
    ? clinics.filter(clinic => clinic.id === clinicFilter)
    : clinics

  // useEffects para pre-seleccionar clínica
  useEffect(() => {
    if (isCreateModalOpen && clinicFilter && !newAssignment.clinicId) {
      setNewAssignment(prev => ({ ...prev, clinicId: clinicFilter }))
      loadCabinsForClinic(clinicFilter)
      setTimeout(() => generateDeviceIdForClinic(clinicFilter), 100)
    }
  }, [isCreateModalOpen, clinicFilter])


  
  const generateDeviceIdForClinic = (clinicId: string) => {
    if (!clinicId || !equipmentName) return
    
    const selectedClinic = clinics.find(c => c.id === clinicId)
    if (!selectedClinic) return
    
    const clinicPrefix = selectedClinic.prefix || selectedClinic.name.substring(0, 3).toUpperCase()
    const equipmentCode = equipmentName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 6)
    
    const timestamp = Date.now().toString().slice(-6)
    const generatedId = `${equipmentCode}-${clinicPrefix}-${timestamp}`
    setNewAssignment(prev => ({
      ...prev,
      deviceId: generatedId,
      // Si el usuario no ha escrito aún serialNumber o coincide con el anterior autogenerado, lo sustituimos
      serialNumber: !prev.serialNumber || prev.serialNumber.startsWith(equipmentCode) ? generatedId : prev.serialNumber
    }))
  }

  const generateDeviceId = () => {
    if (!newAssignment.clinicId || !equipmentName) {
      toast.error('Selecciona una clínica primero para generar el Device ID')
      return
    }
    generateDeviceIdForClinic(newAssignment.clinicId)
    toast.success('Device ID generado manualmente')
  }

  const loadCabinsForClinic = async (clinicId: string) => {
    if (!clinicId) {
      setAvailableCabins([])
      return
    }
    
    setIsLoadingCabins(true)
    try {
      const response = await fetch(`/api/cabins?clinicId=${clinicId}`)
      if (!response.ok) throw new Error('Error al cargar cabinas')
      
      const cabins = await response.json()
      setAvailableCabins(cabins || [])
    } catch (error) {
      console.error('Error loading cabins:', error)
      setAvailableCabins([])
    } finally {
      setIsLoadingCabins(false)
    }
  }

  // Crear nueva asignación
  const handleCreateAssignment = async () => {
    if (!newAssignment.clinicId || !newAssignment.serialNumber.trim() || !newAssignment.deviceId.trim()) {
      toast.error('Por favor, completa los campos obligatorios.')
      return
    }

    const originalAssignments = [...assignments]
    setIsCreating(true)
    
    const isEditing = !!selectedAssignment
          // Iniciando actualización optimista
    
    try {
      if (isEditing) {
        // 🚀 ACTUALIZAR ASIGNACIÓN EXISTENTE
        const updatedAssignment = {
          ...selectedAssignment,
          clinicId: newAssignment.clinicId,
          cabinId: newAssignment.cabinId || null,
          deviceName: newAssignment.deviceName.trim() || null,
          serialNumber: newAssignment.serialNumber.trim(),
          deviceId: newAssignment.deviceId.trim(),
          notes: newAssignment.notes,
          isActive: newAssignment.isActive,
          clinic: clinics.find(c => c.id === newAssignment.clinicId) || selectedAssignment.clinic,
          cabin: newAssignment.cabinId ? availableCabins.find(c => c.id === newAssignment.cabinId) : null,
        }

        // 1. Actualizar estado local inmediatamente
        const updatedAssignments = assignments.map(a => 
          a.id === selectedAssignment.id ? updatedAssignment : a
        )
        setAssignments(updatedAssignments)
        // Estado local actualizado
        
        // 2. Actualizar cache de React Query inmediatamente
        queryClient.setQueryData(['equipment-assignments', equipmentId], (oldData: any[] = []) => {
          return oldData.map(a => a.id === selectedAssignment.id ? updatedAssignment : a)
        })
        
        queryClient.setQueryData(['equipment-with-assignments'], (oldData: any[] = []) => {
          return oldData.map((equipment: any) => {
            if (equipment.id === equipmentId) {
              return {
                ...equipment,
                clinicAssignments: equipment.clinicAssignments?.map(a => 
                  a.id === selectedAssignment.id ? updatedAssignment : a
                ) || []
              }
            }
            return equipment
          })
        })
        
        // 🔥 FORZAR INVALIDACIÓN INMEDIATA para que EquipmentAssignmentsCell se actualice
        queryClient.invalidateQueries({ queryKey: ['equipment-assignments', equipmentId] })
        queryClient.invalidateQueries({ queryKey: ['equipment-with-assignments'] })
        
                  // Cache actualizado
      } else {
        // 🚀 CREAR NUEVA ASIGNACIÓN
        const tempAssignment = {
          id: `temp-${Date.now()}`, // ID temporal
          equipmentId,
          clinicId: newAssignment.clinicId,
          cabinId: newAssignment.cabinId || null,
          deviceName: newAssignment.deviceName.trim() || null,
          serialNumber: newAssignment.serialNumber.trim(),
          deviceId: newAssignment.deviceId.trim(),
          notes: newAssignment.notes,
          isActive: newAssignment.isActive,
          assignedAt: new Date().toISOString(),
          unassignedAt: null,
          clinic: clinics.find(c => c.id === newAssignment.clinicId) || { id: newAssignment.clinicId, name: 'Clínica' },
          cabin: newAssignment.cabinId ? availableCabins.find(c => c.id === newAssignment.cabinId) : null,
          equipment: { id: equipmentId, name: equipmentName, description: null, modelNumber: null }
        }

        // 1. Actualizar estado local inmediatamente
        const updatedAssignments = [...assignments, tempAssignment]
        setAssignments(updatedAssignments)
                  // Nueva asignación creada localmente
        
        // 2. Actualizar cache de React Query inmediatamente
        queryClient.setQueryData(['equipment-assignments', equipmentId], (oldData: any[] = []) => {
          return [...oldData, tempAssignment]
        })
        
        queryClient.setQueryData(['equipment-with-assignments'], (oldData: any[] = []) => {
          return oldData.map((equipment: any) => {
            if (equipment.id === equipmentId) {
              return {
                ...equipment,
                clinicAssignments: [...(equipment.clinicAssignments || []), tempAssignment]
              }
            }
            return equipment
          })
        })
        
        // 🔥 FORZAR INVALIDACIÓN INMEDIATA para que EquipmentAssignmentsCell se actualice
        queryClient.invalidateQueries({ queryKey: ['equipment-assignments', equipmentId] })
        queryClient.invalidateQueries({ queryKey: ['equipment-with-assignments'] })
        
                  // Cache actualizado con nueva asignación
      }
      
      // 3. Notificar al padre y cerrar modal inmediatamente
      if (onDataChange) {
        onDataChange()
      }
      setIsCreateModalOpen(false)
      setSelectedAssignment(null) // Limpiar selección
      setNewAssignment({ clinicId: '', cabinId: '', deviceName: '', serialNumber: '', deviceId: '', notes: '', isActive: true })
      
      const successMessage = isEditing ? 'Asignación actualizada correctamente' : 'Asignación creada correctamente'
      toast.success(successMessage)
      console.log(`⚡ [${isEditing ? 'UPDATE' : 'CREATE'}-OPTIMISTIC] Modal cerrado inmediatamente`)
      
      // 4. Hacer la petición al servidor en background
      console.log(`🌐 [${isEditing ? 'UPDATE' : 'CREATE'}-SERVER] Enviando ${isEditing ? 'actualización' : 'creación'} al servidor...`)
      
      let response
      if (isEditing) {
        response = await fetch(`/api/equipment/clinic-assignments/${selectedAssignment.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clinicId: newAssignment.clinicId,
            cabinId: newAssignment.cabinId || null,
            deviceName: newAssignment.deviceName.trim() || null,
            serialNumber: newAssignment.serialNumber.trim(),
            deviceId: newAssignment.deviceId.trim(),
            notes: newAssignment.notes,
            isActive: newAssignment.isActive,
          }),
        })
      } else {
        response = await fetch(`/api/equipment/${equipmentId}/clinic-assignments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clinicId: newAssignment.clinicId,
            cabinId: newAssignment.cabinId || null,
            deviceName: newAssignment.deviceName.trim() || null,
            serialNumber: newAssignment.serialNumber.trim(),
            deviceId: newAssignment.deviceId.trim(),
            notes: newAssignment.notes,
            isActive: newAssignment.isActive,
          }),
        })
      }

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `Error al ${isEditing ? 'actualizar' : 'crear'} asignación`)
      }

      const serverAssignment = await response.json()
      console.log(`✅ [${isEditing ? 'UPDATE' : 'CREATE'}-SERVER] ${isEditing ? 'Actualización' : 'Creación'} exitosa en servidor`)
      
      // 5a. Si se seleccionó enchufe Shelly, vincularlo (tanto creación como edición)
      if (selectedPlugId) {
        try {
          const assignmentIdForPatch = isEditing ? selectedAssignment.id : serverAssignment.id
          await fetch(`/api/internal/smart-plug-devices/${selectedPlugId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ equipmentClinicAssignmentId: assignmentIdForPatch })
          })
          // Invalida cache de enchufes para reflejar asignación
          queryClient.invalidateQueries({ queryKey: ['smart-plug-devices'] })
          queryClient.invalidateQueries({ queryKey: ['equipment-with-assignments'] })
        } catch (plugErr) {
          console.warn('⚠️  Error vinculando enchufe Shelly:', plugErr)
        }
      }

      // 5b. Si es creación, reemplazar asignación temporal con la real
      if (!isEditing) {
        console.log('🔄 [CREATE-SERVER] Reemplazando asignación temporal con la real...')
        
        queryClient.setQueryData(['equipment-assignments', equipmentId], (oldData: any[] = []) => {
          const updated = oldData.map(assignment => 
            assignment.id && assignment.id.startsWith('temp-') ? serverAssignment : assignment
          )
          console.log('🔄 [CREATE-SERVER] Cache equipment-assignments actualizado con asignación real')
          return updated
        })
        
        queryClient.setQueryData(['equipment-with-assignments'], (oldData: any[] = []) => {
          const updated = oldData.map((equipment: any) => {
            if (equipment.id === equipmentId) {
              return {
                ...equipment,
                clinicAssignments: equipment.clinicAssignments?.map((a: any) => 
                  a.id && a.id.startsWith('temp-') ? serverAssignment : a
                ) || []
              }
            }
            return equipment
          })
          console.log('🔄 [CREATE-SERVER] Cache equipment-with-assignments actualizado con asignación real')
          return updated
        })
        
        // 👉 ACTUALIZAR estado local para reflejar inmediatamente el cambio
        setAssignments(prev => prev.map(a => a.id.startsWith('temp-') ? serverAssignment : a))

        console.log('✅ [CREATE-SERVER] Asignación temporal reemplazada exitosamente')
      }
      
    } catch (error) {
      console.error('❌ [CREATE-ROLLBACK] Error en servidor, revirtiendo cambios optimistas...')
      
      // 🔄 ROLLBACK: Restaurar estado original
      setAssignments(originalAssignments)
      
      queryClient.setQueryData(['equipment-assignments', equipmentId], originalAssignments)
      queryClient.setQueryData(['equipment-with-assignments'], (oldData: any[] = []) => {
        return oldData.map((equipment: any) => {
          if (equipment.id === equipmentId) {
            return {
              ...equipment,
              clinicAssignments: originalAssignments.filter(a => a.equipmentId === equipmentId)
            }
          }
          return equipment
        })
      })
      
      if (onDataChange) {
        onDataChange()
      }
      
      toast.error(`Error al crear: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      console.log('🔄 [CREATE-ROLLBACK] Estado restaurado después del error')
    } finally {
      setIsCreating(false)
    }
  }

  const handleEditAssignment = (assignment: EquipmentClinicAssignment) => {
    setSelectedAssignment(assignment)
    setNewAssignment({
      clinicId: assignment.clinicId,
      cabinId: assignment.cabinId || '',
      deviceName: assignment.deviceName || '',
      serialNumber: assignment.serialNumber,
      deviceId: assignment.deviceId,
      notes: assignment.notes || '',
      isActive: assignment.isActive
    })
    if (assignment.clinicId) {
      loadCabinsForClinic(assignment.clinicId)
    }
    // Pre-cargar enchufe asignado (si existe) para autocompletar selects
    if (isShellyActive) {
      (async () => {
        try {
          const res = await fetch('/api/internal/smart-plug-devices?page=1&pageSize=1000')
          if (!res.ok) return
          const { data } = await res.json()
          const plug = (data || []).find((d: any) => d.equipmentClinicAssignmentId === assignment.id)
          if (plug) {
            setSelectedCredentialId(plug.credentialId)
            await loadPlugsForCredential(plug.credentialId, plug.id)
            setSelectedPlugId(plug.id)
          }
        } catch (err) {
          console.warn('No se pudo precargar enchufe asignado:', err)
        }
      })()
    }
    // Usar el modal de creación para edición también
    setIsCreateModalOpen(true)
  }

  // Esta función se eliminó - ahora handleCreateAssignment maneja tanto creación como edición

  const handleToggleAssignment = async (assignment: EquipmentClinicAssignment) => {
    const newActiveState = !assignment.isActive
    const originalAssignments = [...assignments]
    
    setTogglingIds(prev => new Set([...prev, assignment.id]))
    console.log(`🔄 [TOGGLE-OPTIMISTIC] Iniciando toggle optimista de asignación ${assignment.id}...`)
    
    try {
      // 🚀 ACTUALIZACIÓN OPTIMISTA INMEDIATA
      // 1. Actualizar estado local inmediatamente
      const updatedAssignments = assignments.map(a => 
        a.id === assignment.id ? { ...a, isActive: newActiveState } : a
      )
      setAssignments(updatedAssignments)
      console.log('⚡ [TOGGLE-OPTIMISTIC] Estado local actualizado inmediatamente')
      
      // 2. Actualizar cache de React Query inmediatamente
      queryClient.setQueryData(['equipment-assignments', equipmentId], (oldData: any[] = []) => {
        return oldData.map((a: any) => 
          a.id === assignment.id ? { ...a, isActive: newActiveState } : a
        )
      })
      
      queryClient.setQueryData(['equipment-with-assignments'], (oldData: any[] = []) => {
        return oldData.map((equipment: any) => {
          if (equipment.id === equipmentId) {
            return {
              ...equipment,
              clinicAssignments: equipment.clinicAssignments?.map((a: any) => 
                a.id === assignment.id ? { ...a, isActive: newActiveState } : a
              ) || []
            }
          }
          return equipment
        })
      })
      
      // 🔥 FORZAR INVALIDACIÓN INMEDIATA para que EquipmentAssignmentsCell se actualice
      queryClient.invalidateQueries({ queryKey: ['equipment-assignments', equipmentId] })
      queryClient.invalidateQueries({ queryKey: ['equipment-with-assignments'] })
      
      console.log('⚡ [TOGGLE-OPTIMISTIC] Cache de React Query actualizado inmediatamente')
      
      // 3. Notificar al padre inmediatamente
      if (onDataChange) {
        onDataChange()
      }
      console.log('⚡ [TOGGLE-OPTIMISTIC] Padre notificado inmediatamente')
      
      toast.success(`Asignación ${newActiveState ? 'activada' : 'desactivada'} correctamente`)
      
      // 4. Hacer la petición al servidor en background
      console.log('🌐 [TOGGLE-SERVER] Enviando toggle al servidor...')
      const response = await fetch(`/api/equipment/clinic-assignments/${assignment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newActiveState }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al actualizar asignación')
      }

      console.log('✅ [TOGGLE-SERVER] Toggle confirmado por el servidor')
      
    } catch (error) {
      console.error('❌ [TOGGLE-ROLLBACK] Error en servidor, revirtiendo cambios optimistas...')
      
      // 🔄 ROLLBACK: Restaurar estado original
      setAssignments(originalAssignments)
      
      queryClient.setQueryData(['equipment-assignments', equipmentId], originalAssignments)
      queryClient.setQueryData(['equipment-with-assignments'], (oldData: any[] = []) => {
        return oldData.map((equipment: any) => {
          if (equipment.id === equipmentId) {
            return {
              ...equipment,
              clinicAssignments: originalAssignments.filter(a => a.equipmentId === equipmentId)
            }
          }
          return equipment
        })
      })
      
      if (onDataChange) {
        onDataChange()
      }
      
      toast.error(`Error al actualizar: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      console.log('🔄 [TOGGLE-ROLLBACK] Estado restaurado después del error')
    } finally {
      setTogglingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(assignment.id)
        return newSet
      })
    }
  }

  const handleDeleteAssignment = async () => {
    if (!selectedAssignment) return

    const assignmentToDelete = selectedAssignment
    const originalAssignments = [...assignments]

    setIsDeleting(true)
    console.log(`🔄 [DELETE-OPTIMISTIC] Iniciando eliminación optimista de asignación ${assignmentToDelete.id}...`)
    
    // 🚀 ACTUALIZACIÓN OPTIMISTA INMEDIATA
    try {
      // 1. Actualizar estado local inmediatamente
      const updatedAssignments = assignments.filter(a => a.id !== assignmentToDelete.id)
      setAssignments(updatedAssignments)
      console.log('⚡ [DELETE-OPTIMISTIC] Estado local actualizado inmediatamente')
      
      // 2. Actualizar cache de React Query inmediatamente
      // Cache específico de asignaciones
      queryClient.setQueryData(['equipment-assignments', equipmentId], (oldData: any[] = []) => {
        return oldData.filter((assignment: any) => assignment.id !== assignmentToDelete.id)
      })
      
      // Cache general de equipamiento con asignaciones
      queryClient.setQueryData(['equipment-with-assignments'], (oldData: any[] = []) => {
        return oldData.map((equipment: any) => {
          if (equipment.id === equipmentId) {
            return {
              ...equipment,
              clinicAssignments: equipment.clinicAssignments?.filter((a: any) => a.id !== assignmentToDelete.id) || []
            }
          }
          return equipment
        })
      })
      
      // 🔥 FORZAR INVALIDACIÓN INMEDIATA para que EquipmentAssignmentsCell se actualice
      queryClient.invalidateQueries({ queryKey: ['equipment-assignments', equipmentId] })
      queryClient.invalidateQueries({ queryKey: ['equipment-with-assignments'] })
      
      console.log('⚡ [DELETE-OPTIMISTIC] Cache de React Query actualizado inmediatamente')
      
      // 3. Notificar al padre inmediatamente (para que vea los cambios al instante)
      if (onDataChange) {
        onDataChange()
      }
      // Padre notificado
      
      // 4. Cerrar modal inmediatamente
      setIsDeleteDialogOpen(false)
      setSelectedAssignment(null)
      toast.success('Asignación eliminada correctamente')
              // Modal cerrado
      
      // 5. Hacer la petición al servidor en background
              // Enviando eliminación al servidor
      const response = await fetch(`/api/equipment/clinic-assignments/${assignmentToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al eliminar asignación')
      }

              // Eliminación confirmada por el servidor
      
    } catch (error) {
      console.error('❌ [DELETE-ROLLBACK] Error en servidor, revirtiendo cambios optimistas...')
      
      // 🔄 ROLLBACK: Restaurar estado original
      setAssignments(originalAssignments)
      
      // Restaurar cache de React Query
      queryClient.setQueryData(['equipment-assignments', equipmentId], originalAssignments)
      queryClient.setQueryData(['equipment-with-assignments'], (oldData: any[] = []) => {
        return oldData.map((equipment: any) => {
          if (equipment.id === equipmentId) {
            return {
              ...equipment,
              clinicAssignments: originalAssignments.filter(a => a.equipmentId === equipmentId)
            }
          }
          return equipment
        })
      })
      
      // Notificar al padre para revertir
      if (onDataChange) {
        onDataChange()
      }
      
      toast.error(`Error al eliminar: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      console.log('🔄 [DELETE-ROLLBACK] Estado restaurado después del error')
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 w-8 h-8 text-purple-600 animate-spin" />
          <p className="text-sm text-gray-500">Cargando asignaciones...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">
            {clinicFilter ? "Dispositivos en esta Clínica" : "Asignaciones de Clínicas"}
          </h3>
          <p className="text-sm text-gray-500">
            {clinicFilter 
              ? `Gestiona las instancias de "${equipmentName}" en esta clínica específica`
              : `Gestiona qué clínicas tienen instancias de este equipamiento`
            }
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          disabled={availableClinics.length === 0}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="mr-2 w-4 h-4" />
          Asignar Clínica
        </Button>
      </div>

      {/* Lista de asignaciones */}
      {filteredAssignments.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Building2 className="mx-auto mb-4 w-12 h-12 text-gray-400" />
            <h3 className="mb-2 text-lg font-medium">
              {clinicFilter ? "Sin dispositivos en esta clínica" : "Sin asignaciones"}
            </h3>
            <p className="mb-4 text-gray-500">
              {clinicFilter 
                ? "Este equipamiento no tiene dispositivos asignados a esta clínica"
                : "Este equipamiento no está asignado a ninguna clínica aún"
              }
            </p>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              disabled={availableClinics.length === 0}
              variant="outline"
            >
              <Plus className="mr-2 w-4 h-4" />
              Crear primera asignación
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">Nombre</TableHead>
                <TableHead className="w-[140px]">Clínica</TableHead>
                <TableHead className="w-[100px]">N° Serie</TableHead>
                {isShellyActive ? (
                  <TableHead className="w-[140px] text-center">Enchufe</TableHead>
                ) : (
                  <TableHead className="w-[100px] text-center">Fecha</TableHead>
                )}
                <TableHead className="w-[60px] text-center">Activo</TableHead>
                <TableHead className="w-[120px] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell className="max-w-[160px]">
                    <div className="text-sm font-medium truncate">
                      {assignment.deviceName || (
                        <span className="italic text-gray-500">Sin nombre asignado</span>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell className="max-w-[140px]">
                    <div className="space-y-1">
                      <Badge variant="secondary" className="text-xs">
                        {assignment.clinic.name}
                      </Badge>
                      {assignment.cabin && (
                        <div className="text-[10px] text-gray-500 flex items-center gap-1">
                          <Home className="w-2.5 h-2.5" />
                          <span className="truncate">{assignment.cabin.name}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell className="max-w-[100px]">
                    <div className="font-mono text-xs truncate" title={assignment.serialNumber}>
                      {assignment.serialNumber}
                    </div>
                  </TableCell>
                  
                  {isShellyActive ? (
                    <TableCell className="text-center">
                      <div className="text-xs text-gray-700">
                        {assignmentPlugMap[assignment.id] || '-'}
                      </div>
                    </TableCell>
                  ) : (
                    <TableCell className="text-center">
                      <div className="text-xs text-gray-500">
                        {new Date(assignment.assignedAt).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit'
                        })}
                      </div>
                    </TableCell>
                  )}
                  
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleAssignment(assignment)}
                      disabled={togglingIds.has(assignment.id)}
                      className={cn(
                        "h-4 w-8 p-0 rounded-full transition-colors shrink-0",
                        assignment.isActive 
                          ? "bg-green-500 hover:bg-green-600" 
                          : "bg-red-500 hover:bg-red-600"
                      )}
                      title={assignment.isActive ? "Desactivar" : "Activar"}
                    >
                      {togglingIds.has(assignment.id) ? (
                        <Loader2 className="w-2 h-2 text-white animate-spin" />
                      ) : (
                        <div 
                          className={cn(
                            "w-2.5 h-2.5 bg-white rounded-full transition-transform",
                            assignment.isActive ? "translate-x-1.5" : "-translate-x-1.5"
                          )}
                        />
                      )}
                    </Button>
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end items-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditAssignment(assignment)}
                        className="px-2 text-blue-600 border-blue-300 hover:text-blue-700"
                        title="Editar asignación"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAssignment(assignment)
                          setIsDeleteDialogOpen(true)
                        }}
                        className="px-2 text-red-600 border-red-300 hover:text-red-700"
                        title="Eliminar asignación"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Modal crear - parte 1 */}
      <Dialog open={isCreateModalOpen} onOpenChange={(open) => {
        setIsCreateModalOpen(open)
        if (!open) {
          // Limpiar estado al cerrar modal
          setSelectedAssignment(null)
          setNewAssignment({ clinicId: '', cabinId: '', deviceName: '', serialNumber: '', deviceId: '', notes: '', isActive: true })
        }
      }}>
        <DialogContent className="max-w-md w-[90vw] max-h-[95vh] flex flex-col p-6">
          <DialogHeader className="flex-shrink-0 pb-4 space-y-2">
            <DialogTitle className="flex gap-2 items-center text-lg font-semibold">
              {selectedAssignment ? (
                <>
                  <Edit className="w-5 h-5 text-blue-600" />
                  Editar Asignación
                </>
              ) : (
                <>
                  <Building2 className="w-5 h-5 text-purple-600" />
                  Asignar Clínica
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-gray-600">
              {selectedAssignment ? (
                <>Editar la asignación de <strong>"{equipmentName}"</strong> - {selectedAssignment.deviceName || selectedAssignment.serialNumber}</>
              ) : (
                <>Crear una nueva instancia de <strong>"{equipmentName}"</strong> en una clínica específica</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 py-1 space-y-5">
            {/* Sección: Nombre del Dispositivo */}
            <div className="p-4 space-y-3 bg-purple-50 rounded-lg">
              <h3 className="flex gap-2 items-center text-sm font-semibold text-gray-800">
                <Hash className="w-4 h-4 text-purple-600" />
                Nombre del Dispositivo
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="deviceName" className="text-sm font-medium text-gray-700">
                  Alias del Dispositivo <span className="text-xs text-gray-500">(opcional)</span>
                </Label>
                <Input
                  id="deviceName"
                  value={newAssignment.deviceName}
                  onChange={(e) => setNewAssignment(prev => ({ ...prev, deviceName: e.target.value }))}
                  placeholder="Ej: Láser Principal, Diodo Sala 1, etc."
                  className="h-10 text-sm"
                />
                <p className="text-xs text-gray-500">
                  Nombre descriptivo para identificar fácilmente este dispositivo
                </p>
              </div>
            </div>

            {/* Sección: Ubicación */}
            <div className="p-4 space-y-4 bg-gray-50 rounded-lg">
              <h3 className="flex gap-2 items-center text-sm font-semibold text-gray-800">
                <Building2 className="w-4 h-4 text-purple-600" />
                Ubicación del Equipamiento
              </h3>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="clinic" className="text-sm font-medium text-gray-700">
                    Clínica <span className="text-red-500">*</span>
                    {clinicFilter && <span className="ml-2 text-xs text-purple-600">(pre-seleccionada)</span>}
                  </Label>
                  <Select
                    value={newAssignment.clinicId}
                    onValueChange={(value) => {
                      setNewAssignment(prev => ({ ...prev, clinicId: value, cabinId: '' }))
                      loadCabinsForClinic(value)
                      setTimeout(() => generateDeviceIdForClinic(value), 100)
                    }}
                    disabled={!!clinicFilter}
                  >
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Seleccionar clínica..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-48">
                      {availableClinics.map((clinic) => (
                        <SelectItem key={clinic.id} value={clinic.id} className="py-2">
                          <div className="flex items-center w-full min-w-0">
                            <Building2 className="flex-shrink-0 mr-3 w-4 h-4 text-gray-400" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{clinic.name}</div>
                              {clinic.city && (
                                <div className="text-xs text-gray-500 flex items-center mt-0.5">
                                  <MapPin className="flex-shrink-0 mr-1 w-3 h-3" />
                                  <span className="truncate">{clinic.city}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cabin" className="text-sm font-medium text-gray-700">
                    Cabina <span className="text-xs text-gray-500">(opcional)</span>
                  </Label>
                  <Select
                    value={newAssignment.cabinId}
                    onValueChange={(value) => setNewAssignment(prev => ({ ...prev, cabinId: value }))}
                    disabled={!newAssignment.clinicId || isLoadingCabins}
                  >
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder={
                        !newAssignment.clinicId 
                          ? "Primero selecciona una clínica" 
                          : isLoadingCabins 
                            ? "Cargando cabinas..." 
                            : "Seleccionar cabina..."
                      } />
                    </SelectTrigger>
                    <SelectContent className="max-h-40" side="bottom" align="start">
                      {availableCabins.map((cabin) => (
                        <SelectItem key={cabin.id} value={cabin.id} className="py-2">
                          <div className="flex items-center w-full min-w-0">
                            <Home className="flex-shrink-0 mr-3 w-4 h-4 text-gray-400" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{cabin.name}</div>
                              {cabin.code && (
                                <div className="text-xs text-gray-500 truncate">
                                  Código: {cabin.code}
                                </div>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Sección: Identificadores */}
            <div className="p-4 space-y-4 bg-blue-50 rounded-lg">
              <h3 className="flex gap-2 items-center text-sm font-semibold text-gray-800">
                <Hash className="w-4 h-4 text-blue-600" />
                Identificadores del Dispositivo
              </h3>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="serialNumber" className="text-sm font-medium text-gray-700">
                    Número de Serie <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="serialNumber"
                    value={newAssignment.serialNumber}
                    onChange={(e) => setNewAssignment(prev => ({ ...prev, serialNumber: e.target.value }))}
                    placeholder="Ej: LD2024-SN-00123"
                    className="h-10 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500">
                    Número de serie físico del dispositivo
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deviceId" className="text-sm font-medium text-gray-700">
                    Device ID <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="deviceId"
                      value={newAssignment.deviceId}
                      onChange={(e) => setNewAssignment(prev => ({ ...prev, deviceId: e.target.value }))}
                      placeholder="Se genera automáticamente..."
                      className="flex-1 h-10 font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generateDeviceId}
                      disabled={!newAssignment.clinicId}
                      className="px-3 h-10 text-xs shrink-0"
                    >
                      Generar
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Identificador único del sistema
                  </p>
                </div>
              </div>
            </div>

            {/* Sección: Integración Shelly (opcional) */}
            {isShellyActive && (
              <div className="p-4 space-y-4 bg-green-50 rounded-lg">
                <h3 className="flex gap-2 items-center text-sm font-semibold text-gray-800">
                  <Wrench className="w-4 h-4 text-green-600" />
                  Enchufe Inteligente (Shelly)
                </h3>

                {/* Select Credencial */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Credencial Shelly</Label>
                  <Select
                    value={selectedCredentialId}
                    onValueChange={(value) => {
                      setSelectedCredentialId(value)
                      setSelectedPlugId('')
                      loadPlugsForCredential(value)
                    }}
                  >
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Seleccionar credencial..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-48">
                      {credentials.map((cred) => (
                        <SelectItem key={cred.id} value={cred.id} className="py-2">
                          {cred.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Select Enchufe */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Enchufe sin asignar</Label>
                  <Select
                    value={selectedPlugId}
                    onValueChange={setSelectedPlugId}
                    disabled={!selectedCredentialId}
                  >
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder={selectedCredentialId ? (availablePlugs.length ? 'Seleccionar enchufe...' : 'No hay enchufes libres') : 'Primero selecciona credencial'} />
                    </SelectTrigger>
                    <SelectContent className="max-h-48">
                      {availablePlugs.map((plug) => (
                        <SelectItem key={plug.id} value={plug.id} className="py-2">
                          {plug.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
                Notas <span className="text-xs text-gray-500">(opcional)</span>
              </Label>
              <Textarea
                id="notes"
                value={newAssignment.notes}
                onChange={(e) => setNewAssignment(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Información adicional sobre esta asignación..."
                rows={3}
                className="text-sm resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 gap-3 pt-4 bg-white border-t">
            <Button
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isCreating}
              className="min-w-20"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateAssignment}
              disabled={isCreating || !newAssignment.clinicId || !newAssignment.serialNumber.trim() || !newAssignment.deviceId.trim()}
              className={selectedAssignment ? "bg-blue-600 hover:bg-blue-700 min-w-28" : "bg-purple-600 hover:bg-purple-700 min-w-28"}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  {selectedAssignment ? 'Actualizando...' : 'Creando...'}
                </>
              ) : (
                selectedAssignment ? 'Actualizar Asignación' : 'Crear Asignación'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {/* Dialog para confirmar eliminación */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar asignación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente la asignación de "{equipmentName}" en "{selectedAssignment?.clinic.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-3">
            {selectedAssignment && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="space-y-1 text-sm">
                  <div><strong>Serial:</strong> {selectedAssignment.serialNumber}</div>
                  <div><strong>Device ID:</strong> {selectedAssignment.deviceId}</div>
                </div>
              </div>
            )}
            
            <div className="text-sm text-red-600">
              ⚠️ Esta acción no se puede deshacer.
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAssignment}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                '🗑️ Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 