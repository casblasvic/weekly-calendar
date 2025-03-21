export interface Equipment {
  id: number;
  name: string;
  // ... otros campos ...
  images?: EquipmentImage[];  // Array de imágenes asociadas
}

export interface EquipmentImage {
  id: string;
  url: string;  // URL pública para acceder a la imagen
  path: string; // Ruta relativa para el sistema
  isPrimary: boolean;
  // ... otros campos ...
} 