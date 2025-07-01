import type { Equipment } from "@prisma/client"

// Tipos base de equipamiento
export type { Equipment }

// Props para el modal de equipamiento
export interface EquipmentModalProps {
  isOpen: boolean
  onClose: () => void
  clinics?: { id: string; name: string; city?: string }[]
  initialEquipment?: Equipment | null
  isEditMode?: boolean
}

// Props para formularios de equipamiento
export interface EquipmentFormProps {
  onSubmit: (data: Partial<Equipment>) => Promise<void>
  initialData?: Partial<Equipment>
  isLoading?: boolean
}

// Props para detalles de equipamiento
export interface EquipmentDetailProps {
  equipment: Equipment
  onEdit?: () => void
  onDelete?: (id: string) => void
}

// Tipos para recambios
export interface Product {
  id: string
  name: string
  sku?: string
  settings?: {
    currentStock: number
  }
  category?: {
    name: string
  }
}

export interface Installation {
  id: string
  installedAt: string
  isActive: boolean
  serialNumber?: string
  costPrice?: number
  condition: string
  currentUsageHours: number
  estimatedEndOfLife?: string
  installedByUser: {
    firstName: string
    lastName?: string
  }
}

export interface SparePart {
  id: string
  partName: string
  partNumber?: string
  recommendedLifespan?: number
  warningThreshold?: number
  criticalThreshold?: number
  isRequired: boolean
  category?: string
  product: Product
  installations: Installation[]
  _count: {
    installations: number
  }
}

export interface SparePartsTabProps {
  equipmentId: string
}

// Estados de recambios
export type SparePartStatus = 'not-installed' | 'ok' | 'warning' | 'critical'

export interface SparePartStatusInfo {
  status: SparePartStatus
  label: string
  color: string
} 