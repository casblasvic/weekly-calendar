export interface Equipment {
  id: string;
  name: string;
  description?: string | null;
  modelNumber?: string | null;
  powerThreshold: number;
  purchaseDate?: Date | null;
  warrantyEndDate?: Date | null;
  isActive: boolean;
  systemId: string;
  createdAt: Date;
  updatedAt: Date;
  images?: EquipmentImage[];  // Array de imágenes asociadas
}

export interface EquipmentImage {
  id: string;
  url: string;  // URL pública para acceder a la imagen
  path: string; // Ruta relativa para el sistema
  isPrimary: boolean;
  // ... otros campos ...
} 