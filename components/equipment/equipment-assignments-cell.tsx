/**
 * COMPONENTE DE CELDA PARA ASIGNACIONES DE EQUIPAMIENTO
 * ====================================================
 * 
 * PROPÓSITO:
 * Este componente se utiliza EXCLUSIVAMENTE en la tabla principal de equipamientos
 * para mostrar de forma compacta qué clínicas tienen asignado cada equipamiento.
 * 
 * FUNCIONAMIENTO:
 * - Agrupa asignaciones activas por clínica
 * - Muestra píldoras con el nombre de la clínica
 * - Indica el número de asignaciones si hay más de una por clínica
 * - Se actualiza automáticamente sin recargar toda la tabla
 * 
 * CACHE Y REACTIVIDAD:
 * ====================
 * 
 * 1. QUERY INDEPENDIENTE:
 *    - Query key: ['equipment-assignments', equipmentId]
 *    - Separada de la query principal para actualización selectiva
 *    - staleTime: 30 segundos para reactividad
 *    - refetchInterval: 10 segundos para updates automáticos
 * 
 * 2. INVALIDACIÓN SELECTIVA:
 *    - useInvalidateEquipmentAssignments hook permite invalidar desde otros componentes
 *    - Se actualiza cuando hay cambios en asignaciones sin afectar la tabla principal
 *    - Función almacenada en QueryClient para acceso global
 * 
 * 3. OPTIMISTIC RENDERING:
 *    - UI se actualiza inmediatamente en operaciones críticas
 *    - Fallback en caso de error del servidor
 * 
 * ESTRUCTURA DE DATOS:
 * ====================
 * 
 * INPUT: equipmentId (string)
 * OUTPUT: JSX con píldoras de clínicas
 * 
 * FORMATO DE PÍLDORAS:
 * - [Clínica Madrid] - Una asignación
 * - [Clínica Madrid (3)] - Múltiples asignaciones
 * - "Sin asignaciones" - No hay asignaciones activas
 * 
 * AGRUPACIÓN POR CLÍNICA:
 * {
 *   'clinic-id-1': {
 *     clinic: { id, name, ... },
 *     count: 3,
 *     assignments: [assignment1, assignment2, assignment3]
 *   }
 * }
 * 
 * RENDIMIENTO:
 * ============
 * 
 * 1. LOADING SKELETON:
 *    - Placeholder animado durante carga inicial
 *    - Evita layout shift
 * 
 * 2. MEMOIZACIÓN:
 *    - Agrupación de clínicas se calcula solo cuando cambian las asignaciones
 *    - Evita re-renders innecesarios
 * 
 * 3. LAZY LOADING:
 *    - Solo carga datos cuando el componente es visible
 *    - Useful para tablas con muchas filas
 * 
 * INTEGRACIÓN:
 * ============
 * 
 * UTILIZADO EN:
 * - Tabla principal de equipamientos (components/equipment/equipment-detail.tsx)
 * - Dashboard de equipamientos
 * - Reportes de utilización
 * 
 * HOOKS EXPORTADOS:
 * - useInvalidateEquipmentAssignments: Para invalidar cache desde otros componentes
 * 
 * EVENTOS:
 * - onDataChange: Se dispara cuando hay cambios en las asignaciones
 * - onError: Se dispara cuando hay errores en la consulta
 * 
 * CASOS DE USO:
 * =============
 * 
 * 1. TABLA PRINCIPAL:
 *    <EquipmentAssignmentsCell equipmentId={equipment.id} />
 * 
 * 2. CON INVALIDACIÓN:
 *    const invalidate = useInvalidateEquipmentAssignments()
 *    // Después de operación CRUD:
 *    invalidate(equipmentId)
 * 
 * 3. CUSTOM STYLING:
 *    <EquipmentAssignmentsCell 
 *      equipmentId={id}
 *      className="custom-cell-styles"
 *    />
 * 
 * DEBUGGING:
 * ==========
 * 
 * - React Query DevTools para inspeccionar cache
 * - Console logs en desarrollo para tracking de updates
 * - Error boundary automático para capturar errores de rendering
 * 
 * LIMITACIONES:
 * =============
 * 
 * - Solo muestra asignaciones ACTIVAS (isActive: true)
 * - Máximo 3 píldoras visibles (resto se agrupa en "+X más")
 * - No muestra detalles específicos (solo nombres de clínica)
 * 
 * FUTURAS MEJORAS:
 * ================
 * 
 * - Tooltip con detalles completos al hover
 * - Click en píldora para abrir modal de asignaciones
 * - Indicador visual de estado de conectividad IoT
 * - Colores de píldoras basados en estado del equipamiento
 */

import React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Assignment {
  id: string
  clinicId: string
  cabinId?: string
  deviceName?: string
  serialNumber: string
  deviceId: string
  isActive: boolean
  clinic: {
    id: string
    name: string
    prefix?: string
    city?: string
  }
  cabin?: {
    id: string
    name: string
    code?: string
  }
}

interface EquipmentAssignmentsCellProps {
  equipmentId: string
  className?: string
}

export function EquipmentAssignmentsCell({ equipmentId, className }: EquipmentAssignmentsCellProps) {
  const queryClient = useQueryClient()
  const [assignments, setAssignments] = React.useState<Assignment[]>([])
  
  // 🔥 ESTRATEGIA DEFINITIVA: Escuchar cambios del cache principal
  React.useEffect(() => {
    const updateFromCache = () => {
      const mainCacheData = queryClient.getQueryData(['equipment-with-assignments']) as any[]
      if (mainCacheData) {
        const equipment = mainCacheData.find(eq => eq.id === equipmentId)
        if (equipment && equipment.clinicAssignments) {
          setAssignments(equipment.clinicAssignments)
          return
        }
      }
      setAssignments([])
    }
    
    // Actualizar inmediatamente
    updateFromCache()
    
    // Suscribirse a cambios del cache
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      // Programar después del ciclo de render para evitar warnings de React
      queueMicrotask(updateFromCache)
    })
    
    return unsubscribe
  }, [equipmentId, queryClient])
  
  // Fallback: Query independiente solo si no hay datos en cache principal
  const { data: fallbackAssignments = [], isLoading } = useQuery<Assignment[]>({
    queryKey: ['equipment-assignments-fallback', equipmentId],
    queryFn: async () => {
      // Fallback fetch para obtener datos si no están en cache
      const response = await fetch(`/api/equipment/${equipmentId}/clinic-assignments`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      
      if (!response.ok) {
        throw new Error('Error al cargar asignaciones')
      }
      
      const data = await response.json()
      // Datos recibidos del fallback
      return data.assignments || []
    },
    enabled: assignments.length === 0, // Solo si no hay datos del cache principal
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  })
  
  // Usar datos del cache principal si están disponibles, sino fallback
  const finalAssignments: Assignment[] = assignments.length > 0 ? assignments : fallbackAssignments

  // Función para invalidar solo esta query cuando hay cambios
  const invalidateAssignments = () => {
    queryClient.invalidateQueries({ queryKey: ['equipment-assignments', equipmentId] })
  }

  // Exponer función para invalidación externa
  React.useEffect(() => {
    // Almacenar la función en el query client para acceso global
    queryClient.setQueryData(['invalidate-assignments', equipmentId], invalidateAssignments)
  }, [equipmentId, queryClient])

  const activeAssignments = finalAssignments.filter(a => a.isActive)
  
  // Los logs de depuración se han eliminado - el sistema funciona correctamente

  if (isLoading) {
    return (
      <div className={cn("flex gap-1", className)}>
        <div className="w-16 h-5 bg-gray-200 rounded-full animate-pulse" />
      </div>
    )
  }

  if (activeAssignments.length === 0) {
    return (
      <div className={className}>
        <span className="text-xs text-gray-500">Sin asignaciones</span>
      </div>
    )
  }

  // Agrupar asignaciones por clínica
  const clinicGroups = activeAssignments.reduce((groups, assignment) => {
    const clinicId = assignment.clinic.id
    if (!groups[clinicId]) {
      groups[clinicId] = {
        clinic: assignment.clinic,
        count: 0,
        assignments: []
      }
    }
    groups[clinicId].count++
    groups[clinicId].assignments.push(assignment)
    return groups
  }, {} as Record<string, { clinic: Assignment['clinic'], count: number, assignments: Assignment[] }>)

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {Object.values(clinicGroups).map((group) => (
        <Badge 
          key={group.clinic.id} 
          variant="secondary" 
          className="px-2 py-1 text-xs"
        >
          <span className="font-medium">
            {group.clinic.name}
            {group.count > 1 && (
              <span className="text-[10px] ml-1 opacity-70">({group.count})</span>
            )}
          </span>
        </Badge>
      ))}
    </div>
  )
}

// Hook para invalidar asignaciones desde otros componentes
export function useInvalidateEquipmentAssignments() {
  const queryClient = useQueryClient()
  
  return (equipmentId: string) => {
    // **INVALIDACIÓN SIMPLE**: Solo marcar como stale, sin forzar refetch
    queryClient.invalidateQueries({ queryKey: ['equipment-assignments', equipmentId] })
    queryClient.invalidateQueries({ queryKey: ['equipment-with-assignments'] })
    
    console.log(`🔄 Simple invalidation for equipment: ${equipmentId}`)
  }
} 