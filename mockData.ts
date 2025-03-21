export interface Clinica {
  id: string
  nombre: string
  direccion?: string
  telefono?: string
  email?: string
  openTime?: string
  closeTime?: string
  deshabilitada?: boolean
}

export interface Tarifa {
  id: string
  nombre: string
  clinicaId: string
  deshabilitada: boolean
}

export interface Servicio {
  id: string
  nombre: string
  familia: string
  precio: number
  iva: string
}

export interface ScheduleBlock {
  id: string
  clinicId: number
  date: string
  startTime: string
  endTime: string
  roomIds: string[]
  description: string
  recurring: boolean
  recurrencePattern?: {
    frequency: "daily" | "weekly" | "monthly"
    endDate?: string
    daysOfWeek?: number[]
  }
  createdAt: string
}

export interface Cabin {
  id: number
  clinicId: number
  code: string
  name: string
  color: string
  isActive: boolean
  order: number
}

export interface ClinicConfig {
  openTime: string
  closeTime: string
  weekendOpenTime: string
  weekendCloseTime: string
  saturdayOpen: boolean
  sundayOpen: boolean
  slotDuration: number
  cabins: Cabin[]
  schedule: any
  initialCash?: number
  ticketSize?: string
  rate?: string
  ip?: string
  blockSignArea?: string
  blockPersonalData?: string
  delayedPayments?: boolean
  affectsStats?: boolean
  appearsInApp?: boolean
  scheduleControl?: boolean
  professionalSkills?: boolean
  notes?: string
  country?: string
  province?: string
  postalCode?: string
  address?: string
  phone2?: string
}

export interface Clinic {
  id: number
  prefix: string
  name: string
  city: string
  config: ClinicConfig
}

interface Equipment {
  id: number
  code: string
  name: string
  description: string
  serialNumber: string
  clinicId: number
  images?: DeviceImage[]
}

interface DeviceImage {
  id: string
  url: string
  isPrimary: boolean
  path?: string
}

// Definición de DocumentFile para manejar documentos
interface DocumentFile {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  url: string
  path?: string
  entityType: string
  entityId: string
  category?: string
  createdAt: string
  updatedAt?: string
}

// Objeto global para almacenar datos mock
export const MockData: {
  clinicas?: Clinic[]
  tarifas?: Tarifa[]
  servicios?: Servicio[]
  scheduleBlocks?: ScheduleBlock[]
  equipment?: Equipment[]
  equipmentImages?: Record<string, DeviceImage[]>
  serviceImages?: Record<string, DeviceImage[]>
  tarifaImages?: Record<string, DeviceImage[]>
  clientImages?: Record<string, DeviceImage[]>
  entityDocuments?: Record<string, DocumentMap>
  [key: string]: any
} = {
  clinicas: [
    {
      id: 1,
      prefix: "000001",
      name: "Californie Multilaser - Organicare",
      city: "Casablanca",
      config: {
        openTime: "10:00",
        closeTime: "19:30",
        weekendOpenTime: "10:00",
        weekendCloseTime: "15:00",
        saturdayOpen: true,
        sundayOpen: false,
        cabins: [
          { id: 1, clinicId: 1, code: "Con", name: "Consultation", color: "#ff0000", isActive: true, order: 1 },
          { id: 2, clinicId: 1, code: "Con", name: "Consultation2", color: "#00ff00", isActive: true, order: 2 },
          { id: 3, clinicId: 1, code: "Lun", name: "Lunula", color: "#0000ff", isActive: true, order: 3 },
          { id: 4, clinicId: 1, code: "For", name: "Forte/Bal", color: "#ff0000", isActive: true, order: 4 },
          { id: 5, clinicId: 1, code: "Ski", name: "SkinShape", color: "#ff0000", isActive: false, order: 5 },
          { id: 6, clinicId: 1, code: "WB", name: "Won/Bal", color: "#ff0000", isActive: true, order: 6 },
          { id: 7, clinicId: 1, code: "Ver", name: "Verju/Bal", color: "#ff0000", isActive: true, order: 7 },
          { id: 8, clinicId: 1, code: "WB", name: "Won/Bal", color: "#ff0000", isActive: false, order: 8 },
          { id: 9, clinicId: 1, code: "Eme", name: "Emerald", color: "#ff0000", isActive: true, order: 9 },
        ],
        schedule: {},
        slotDuration: 15,
      },
    },
    {
      id: 2,
      prefix: "Cafc",
      name: "Cafc Multilaser",
      city: "Casablanca",
      config: {
        openTime: "09:00",
        closeTime: "18:00",
        weekendOpenTime: "09:00",
        weekendCloseTime: "14:00",
        saturdayOpen: true,
        sundayOpen: false,
        cabins: [
          { id: 1, clinicId: 2, code: "Con", name: "Consultation", color: "#0000ff", isActive: true, order: 1 },
          { id: 2, clinicId: 2, code: "Tre", name: "Treatment", color: "#00ff00", isActive: true, order: 2 },
        ],
        schedule: {},
        slotDuration: 15,
      },
    },
    {
      id: 3,
      prefix: "TEST",
      name: "CENTRO TEST",
      city: "Casablanca",
      config: {
        openTime: "08:00",
        closeTime: "20:00",
        weekendOpenTime: "10:00",
        weekendCloseTime: "16:00",
        saturdayOpen: true,
        sundayOpen: false,
        cabins: [{ id: 1, clinicId: 3, code: "Tes", name: "Test Cabin", color: "#00ff00", isActive: true, order: 1 }],
        schedule: {},
        slotDuration: 15,
      },
    },
  ],
  tarifas: [],
  servicios: [],
  scheduleBlocks: [],
  equipment: [
    { id: 1, code: "BALLA-1", name: "Ballancer 1", description: "Pressotherapie", serialNumber: "BL-2023-001", clinicId: 1 },
    { id: 2, code: "BALLA-2", name: "Ballancer 2", description: "Pressotherapie", serialNumber: "BL-2023-002", clinicId: 1 },
    { id: 3, code: "EVRL-1", name: "Evrl 1", description: "EVRL", serialNumber: "EV-2022-453", clinicId: 1 },
    { id: 4, code: "FORTE-1", name: "Forte Gem 1", description: "Forte Gem", serialNumber: "FG-2021-789", clinicId: 1 },
    { id: 5, code: "JFL-1", name: "JETPEEL 1", description: "JETPEEL", serialNumber: "JP-2023-344", clinicId: 1 },
    { id: 6, code: "LUNUL-1", name: "Lunula Laser 1", description: "Lunula Laser", serialNumber: "LL-2022-567", clinicId: 1 },
    { id: 7, code: "MICRO-1", name: "MicroMotor 1", description: "MicroMotor", serialNumber: "MM-2023-123", clinicId: 1 },
    { id: 8, code: "SKNS-1", name: "Skinshape R 1", description: "Skinshape Radiofrequence", serialNumber: "SR-2021-456", clinicId: 1 },
    { id: 9, code: "VERJU-1", name: "VERJU LASER 1", description: "VERJU LASER", serialNumber: "VL-2022-789", clinicId: 1 },
    { id: 10, code: "JFL-2", name: "JETPEEL", description: "JETPEEL", serialNumber: "JP-2023-345", clinicId: 2 },
    { id: 11, code: "LUNUL-2", name: "Lunula Laser", description: "Lunula Laser", serialNumber: "LL-2022-568", clinicId: 2 },
    { id: 12, code: "MICRO-2", name: "MicroMotor", description: "MicroMotor", serialNumber: "MM-2023-124", clinicId: 3 },
    { id: 13, code: "SKNS-2", name: "Skinshape R", description: "Skinshape Radiofrequence", serialNumber: "SR-2021-457", clinicId: 3 },
  ],
  equipmentImages: {},
  serviceImages: {},
  tarifaImages: {},
  clientImages: {},
  entityDocuments: {}
}

export const updateClinic = (updatedClinic: Clinic): boolean => {
  const index = MockData.clinicas?.findIndex((clinic) => clinic.id === updatedClinic.id)
  if (index === undefined || index === -1) return false

  MockData.clinicas = [
    ...(MockData.clinicas || []).slice(0, index),
    updatedClinic,
    ...(MockData.clinicas || []).slice(index + 1),
  ]
  window.dispatchEvent(new CustomEvent("storage-updated"))
  return true
}

export const deleteEquipment = (id: number): boolean => {
  MockData.equipment = (MockData.equipment || []).filter((item) => item.id !== id)
  window.dispatchEvent(new CustomEvent("storage-updated"))
  return true
}

let nextEquipmentId = 100 // Start from a high number to avoid conflicts

export const addEquipment = (equipmentData: Equipment): number => {
  const newId = nextEquipmentId++
  const newEquipment = { 
    ...equipmentData, 
    id: newId
  }
  
  // Si no existe el array equipment, lo creamos
  if (!MockData.equipment) {
    MockData.equipment = [];
  }
  
  // Añadir el nuevo equipment
  MockData.equipment = [...MockData.equipment, newEquipment]
  
  // Si tiene imágenes, guardarlas
  if (equipmentData.images && equipmentData.images.length > 0) {
    saveEquipmentImages(newId, equipmentData.images);
  }
  
  // Disparar evento para notificar cambio en datos
  window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT, {
    detail: { dataType: 'equipment' }
  }))
  
  console.log(`Equipo añadido con ID ${newId} y ${equipmentData.images?.length || 0} imágenes`);
  
  return newId
}

export const updateEquipment = (equipmentData: Equipment): boolean => {
  if (!MockData.equipment) {
    console.error("No hay equipamiento para actualizar");
    return false;
  }
  
  const index = MockData.equipment.findIndex((item) => item.id === equipmentData.id)
  if (index === -1) {
    console.error(`No se encontró equipamiento con ID ${equipmentData.id}`);
    return false;
  }

  // Obtener equipamiento actual
  const currentEquipment = MockData.equipment[index];
  
  // Extraer las imágenes para guardarlas separadamente
  const images = equipmentData.images || [];
  
  // Eliminar las imágenes del objeto para no duplicar datos
  const equipmentWithoutImages = {
    ...equipmentData,
    images: undefined
  };
  
  // Actualizar equipamiento en MockData
  MockData.equipment = [
    ...MockData.equipment.slice(0, index),
    equipmentWithoutImages,
    ...MockData.equipment.slice(index + 1),
  ];
  
  // Si hay imágenes, guardarlas separadamente
  if (images.length > 0) {
    saveEquipmentImages(equipmentData.id, images);
  }
  
  // Notificar cambio
  window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT, {
    detail: { dataType: 'equipment' }
  }))
  
  console.log(`Equipamiento ${equipmentData.id} actualizado con ${images.length} imágenes`);
  
  return true
}

export const getEquipment = (clinicId: number): Equipment[] => {
  return (MockData.equipment || []).filter((item) => item.clinicId === clinicId)
}

export const getScheduleBlocks = (clinicId: number): ScheduleBlock[] => {
  return (MockData.scheduleBlocks || []).filter((block) => block.clinicId === clinicId)
}

export const createScheduleBlock = (blockData: Omit<ScheduleBlock, "id" | "createdAt">): string => {
  const newId = Date.now().toString()
  const newBlock: ScheduleBlock = {
    id: newId,
    clinicId: blockData.clinicId,
    date: blockData.date,
    startTime: blockData.startTime,
    endTime: blockData.endTime,
    roomIds: blockData.roomIds,
    description: blockData.description,
    recurring: blockData.recurring,
    recurrencePattern: blockData.recurrencePattern,
    createdAt: new Date().toISOString(),
  }
  MockData.scheduleBlocks = [...(MockData.scheduleBlocks || []), newBlock]
  window.dispatchEvent(new CustomEvent("storage-updated"))
  return newId
}

export const updateScheduleBlock = (id: string, blockData: Omit<ScheduleBlock, "id" | "createdAt">): boolean => {
  const index = (MockData.scheduleBlocks || []).findIndex((block) => block.id === id)
  if (index === -1) return false

  MockData.scheduleBlocks = [
    ...(MockData.scheduleBlocks || []).slice(0, index),
    { id, ...blockData, createdAt: new Date().toISOString() },
    ...(MockData.scheduleBlocks || []).slice(index + 1),
  ]
  window.dispatchEvent(new CustomEvent("storage-updated"))
  return true
}

export const deleteScheduleBlock = (id: string): boolean => {
  MockData.scheduleBlocks = (MockData.scheduleBlocks || []).filter((block) => block.id !== id)
  window.dispatchEvent(new CustomEvent("storage-updated"))
  return true
}

export const updateCabin = (clinicId: number, updatedCabin: Cabin): boolean => {
  const clinicIndex = MockData.clinicas?.findIndex((clinic) => clinic.id === clinicId)
  if (clinicIndex === undefined || clinicIndex === -1) return false

  const clinic = MockData.clinicas?.[clinicIndex]
  if (!clinic) return false

  const cabinIndex = clinic.config.cabins.findIndex((cabin) => cabin.id === updatedCabin.id)
  if (cabinIndex === -1) return false
  clinic.config.cabins[cabinIndex] = updatedCabin
  MockData.clinicas![clinicIndex] = clinic

  window.dispatchEvent(new CustomEvent("storage-updated"))
  return true
}

export const deleteCabin = (clinicId: number, cabinId: number): boolean => {
  const clinicIndex = MockData.clinicas?.findIndex((clinic) => clinic.id === clinicId)
  if (clinicIndex === undefined || clinicIndex === -1) return false

  const clinic = MockData.clinicas?.[clinicIndex]
  if (!clinic) return false
  
  clinic.config.cabins = clinic.config.cabins.filter((cabin: { id: number }) => cabin.id !== cabinId)
  MockData.clinicas![clinicIndex] = clinic

  window.dispatchEvent(new CustomEvent("storage-updated"))
  return true
}

export const getClinic = (clinicId: number): Clinic | undefined => {
  return MockData.clinicas?.find((clinic) => clinic.id === clinicId)
}

export const getClinics = (): Clinic[] => {
  return MockData.clinicas || []
}

export const mockClinics = MockData.clinicas || []

export const DATA_CHANGE_EVENT = "data-change"

// Obtener imágenes de un equipamiento específico
export const getEquipmentImages = (equipmentId: number): DeviceImage[] => {
  const images = MockData.equipmentImages?.[equipmentId.toString()] || [];
  console.log(`Obteniendo ${images.length} imágenes para equipamiento ${equipmentId} desde MockData`);
  return images;
}

// Guardar imágenes para un equipamiento
export const saveEquipmentImages = (equipmentId: number, images: DeviceImage[]): boolean => {
  try {
    if (!MockData.equipmentImages) {
      MockData.equipmentImages = {};
    }
    
    // Guardar las imágenes en el objeto MockData
    MockData.equipmentImages[equipmentId.toString()] = images;
    
    console.log(`Guardadas ${images.length} imágenes para equipamiento ${equipmentId} en MockData`);
    
    // Notificar cambio
    window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT, {
      detail: { dataType: 'equipment' }
    }));
    
    return true;
  } catch (error) {
    console.error(`Error al guardar imágenes para equipamiento ${equipmentId}:`, error);
    return false;
  }
}

// Funciones genéricas para obtener imágenes por entidad y ID
export const getEntityImages = (entityType: string, entityId: string | number): DeviceImage[] => {
  const imagesStore = `${entityType}Images` as keyof typeof MockData;
  const strEntityId = entityId.toString();
  
  // Verificar que el store existe
  if (!MockData[imagesStore]) {
    console.warn(`El almacén de imágenes para ${entityType} no existe, creándolo`);
    MockData[imagesStore] = {};
  }
  
  // Obtener las imágenes desde la memoria
  const imagesMap = MockData[imagesStore] as Record<string, DeviceImage[]>;
  let images = imagesMap[strEntityId] || [];
  
  // Si no hay imágenes en memoria, intentar cargar desde localStorage
  if (images.length === 0) {
    const storedImages = localStorage.getItem(`${entityType}Images_${strEntityId}`);
    if (storedImages) {
      try {
        images = JSON.parse(storedImages);
        console.log(`Recuperadas ${images.length} imágenes desde localStorage para ${entityType}/${strEntityId}`);
        
        // Guardar en memoria para futuros accesos
        imagesMap[strEntityId] = images;
      } catch (error) {
        console.error(`Error al parsear imágenes desde localStorage:`, error);
      }
    }
  }
  
  console.log(`[DETALLE] Obteniendo imágenes para ${entityType}/${strEntityId}:`, {
    storeKeys: Object.keys(imagesMap),
    imagesFound: images.length,
    storeExists: !!MockData[imagesStore],
    storedData: imagesMap[strEntityId]
  });
  
  return images;
}

// Guardar imágenes para cualquier entidad
export const saveEntityImages = (entityType: string, entityId: string | number, images: DeviceImage[]): boolean => {
  try {
    const imagesStore = `${entityType}Images` as keyof typeof MockData;
    const strEntityId = entityId.toString();
    
    // Asegurarnos de que existe el almacén de imágenes para esta entidad
    if (!MockData[imagesStore]) {
      console.log(`Creando almacén de imágenes para ${entityType}`);
      MockData[imagesStore] = {};
    }
    
    // Asegurarnos de que las imágenes tengan el entityId correcto
    const validatedImages = images.map(img => ({
      ...img,
      entityId: strEntityId
    }));
    
    // Guardar las imágenes en el objeto MockData
    (MockData[imagesStore] as Record<string, DeviceImage[]>)[strEntityId] = validatedImages;
    
    console.log(`[DETALLE] Guardadas ${images.length} imágenes para ${entityType}/${strEntityId}:`, {
      storeKeys: Object.keys(MockData[imagesStore] as Record<string, DeviceImage[]>),
      savedImages: validatedImages
    });
    
    // Guardar en localStorage para persistencia
    localStorage.setItem(`${entityType}Images_${strEntityId}`, JSON.stringify(validatedImages));
    
    // Notificar cambio
    window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT, {
      detail: { dataType: entityType }
    }));
    
    return true;
  } catch (error) {
    console.error(`Error al guardar imágenes para ${entityType} ${entityId}:`, error);
    return false;
  }
}

// Funciones específicas para servicios
export const getServiceImages = (serviceId: string): DeviceImage[] => {
  return getEntityImages('service', serviceId);
}

export const saveServiceImages = (serviceId: string, images: DeviceImage[]): boolean => {
  return saveEntityImages('service', serviceId, images);
}

// Funciones específicas para tarifas
export const getTarifaImages = (tarifaId: string): DeviceImage[] => {
  return getEntityImages('tarifa', tarifaId);
}

export const saveTarifaImages = (tarifaId: string, images: DeviceImage[]): boolean => {
  return saveEntityImages('tarifa', tarifaId, images);
}

// Funciones específicas para clientes
export const getClientImages = (clientId: string): DeviceImage[] => {
  return getEntityImages('client', clientId);
}

export const saveClientImages = (clientId: string, images: DeviceImage[]): boolean => {
  return saveEntityImages('client', clientId, images);
}

// Función genérica para eliminar imágenes de una entidad
export const deleteEntityImages = (entityType: string, entityId: string | number): boolean => {
  try {
    const imagesStore = `${entityType}Images` as keyof typeof MockData;
    const strEntityId = entityId.toString();
    
    // Verificar que el store existe
    if (!MockData[imagesStore]) {
      console.warn(`El almacén de imágenes para ${entityType} no existe`);
      return false;
    }
    
    // Eliminar las imágenes de la memoria
    const imagesMap = MockData[imagesStore] as Record<string, DeviceImage[]>;
    
    if (imagesMap[strEntityId]) {
      delete imagesMap[strEntityId];
      
      // Eliminar también de localStorage
      localStorage.removeItem(`${entityType}Images_${strEntityId}`);
      
      console.log(`Eliminadas imágenes para ${entityType}/${strEntityId}`);
      
      // Notificar cambio
      window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT, {
        detail: { dataType: entityType }
      }));
      
      return true;
    } else {
      console.log(`No hay imágenes para eliminar de ${entityType}/${strEntityId}`);
      return false;
    }
  } catch (error) {
    console.error(`Error al eliminar imágenes para ${entityType}/${entityId}:`, error);
    return false;
  }
}

// Funciones específicas para eliminar imágenes por tipo de entidad
export const deleteServiceImages = (serviceId: string): boolean => {
  return deleteEntityImages('service', serviceId);
}

export const deleteTarifaImages = (tarifaId: string): boolean => {
  return deleteEntityImages('tarifa', tarifaId);
}

export const deleteClientImages = (clientId: string): boolean => {
  return deleteEntityImages('client', clientId);
}

export const deleteEquipmentImages = (equipmentId: string | number): boolean => {
  return deleteEntityImages('equipment', equipmentId);
}

// ---- Funciones para manejar documentos ----

// Almacenamiento de documentos en MockData
interface DocumentMap {
  [entityId: string]: {
    [category: string]: DocumentFile[]
  }
}

// Obtener documentos por entidad
export const getEntityDocuments = (
  entityType: string, 
  entityId: string, 
  category?: string
): DocumentFile[] => {
  try {
    // Asegurarse de que entityDocuments existe
    if (!MockData.entityDocuments) {
      MockData.entityDocuments = {};
    }
    
    const docsStore = MockData.entityDocuments[entityType] as DocumentMap | undefined;
    
    if (!docsStore || !docsStore[entityId]) {
      return [];
    }
    
    // Si se especifica una categoría, filtrar por ella
    if (category) {
      return docsStore[entityId][category] || [];
    }
    
    // Si no hay categoría, combinar todos los documentos
    return Object.values(docsStore[entityId]).flat();
  } catch (error) {
    console.error(`Error al obtener documentos de ${entityType}/${entityId}:`, error);
    return [];
  }
};

// Guardar documentos para una entidad
export const saveEntityDocuments = (
  entityType: string,
  entityId: string,
  documents: DocumentFile[],
  category: string = 'default'
): boolean => {
  try {
    // Asegurarse de que existe entityDocuments
    if (!MockData.entityDocuments) {
      MockData.entityDocuments = {};
    }
    
    // Asegurarse de que exista el almacenamiento para este tipo de entidad
    if (!MockData.entityDocuments[entityType]) {
      MockData.entityDocuments[entityType] = {};
    }
    
    // Asegurarse de que exista el almacenamiento para esta entidad
    if (!MockData.entityDocuments[entityType][entityId]) {
      MockData.entityDocuments[entityType][entityId] = {};
    }
    
    // Guardar los documentos en la categoría especificada
    MockData.entityDocuments[entityType][entityId][category] = documents;
    
    // Guardar en localStorage para persistencia
    localStorage.setItem(
      `${entityType}_docs_${entityId}_${category}`,
      JSON.stringify(documents)
    );
    
    console.log(`Guardados ${documents.length} documentos para ${entityType}/${entityId}/${category}`);
    
    return true;
  } catch (error) {
    console.error(`Error al guardar documentos para ${entityType}/${entityId}:`, error);
    return false;
  }
};

// Eliminar documentos de una entidad
export const deleteEntityDocuments = (
  entityType: string,
  entityId: string,
  category?: string
): boolean => {
  try {
    // Verificar si entityDocuments existe
    if (!MockData.entityDocuments) {
      return false;
    }
    
    const docsStore = MockData.entityDocuments[entityType] as DocumentMap | undefined;
    
    if (!docsStore || !docsStore[entityId]) {
      return false;
    }
    
    if (category) {
      // Eliminar solo una categoría
      if (docsStore[entityId][category]) {
        delete docsStore[entityId][category];
        localStorage.removeItem(`${entityType}_docs_${entityId}_${category}`);
      }
    } else {
      // Eliminar todos los documentos de la entidad
      delete MockData.entityDocuments[entityType][entityId];
      
      // Buscar y eliminar todas las claves en localStorage que coincidan
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${entityType}_docs_${entityId}_`)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
    
    console.log(`Eliminados documentos para ${entityType}/${entityId}${category ? '/' + category : ''}`);
    return true;
  } catch (error) {
    console.error(`Error al eliminar documentos de ${entityType}/${entityId}:`, error);
    return false;
  }
};

// Funciones específicas para cada tipo de entidad
export const getServiceDocuments = (serviceId: string, category?: string): DocumentFile[] => {
  console.log(`[mockData] Solicitando documentos para servicio ${serviceId} ${category ? `en categoría ${category}` : ''}`);
  
  // Verificar si existen las estructuras necesarias
  if (!MockData.entityDocuments) {
    console.log('[mockData] No hay entityDocuments en MockData');
    return [];
  }
  
  if (!MockData.entityDocuments['service']) {
    console.log('[mockData] No hay documentos para tipo "service" en MockData');
    return [];
  }
  
  if (!MockData.entityDocuments['service'][serviceId]) {
    console.log(`[mockData] No hay documentos para servicio ID: ${serviceId}`);
    return [];
  }
  
  const docs = getEntityDocuments('service', serviceId, category);
  console.log(`[mockData] Encontrados ${docs.length} documentos para servicio ${serviceId}`);
  return docs;
};

export const saveServiceDocuments = (
  serviceId: string, 
  documents: DocumentFile[], 
  category: string = 'default'
): boolean => {
  console.log(`[mockData] Guardando ${documents.length} documentos para servicio ${serviceId} en categoría ${category}`);
  
  // Verificar si hay datos para guardar
  if (!documents || documents.length === 0) {
    console.log('[mockData] No hay documentos para guardar');
    return false;
  }
  
  // Depuración de los documentos
  documents.forEach((doc, index) => {
    console.log(`[mockData] Documento ${index + 1}:`, {
      id: doc.id,
      fileName: doc.fileName,
      entityType: doc.entityType,
      entityId: doc.entityId,
      path: doc.path
    });
  });
  
  const result = saveEntityDocuments('service', serviceId, documents, category);
  console.log(`[mockData] Resultado de guardar documentos: ${result ? 'Éxito' : 'Fallo'}`);
  
  // Verificar que se guardaron correctamente
  const savedDocs = getEntityDocuments('service', serviceId, category);
  console.log(`[mockData] Verificación: Se guardaron ${savedDocs.length} documentos`);
  
  return result;
};

export const deleteServiceDocuments = (
  serviceId: string,
  category?: string
): boolean => {
  return deleteEntityDocuments('service', serviceId, category);
};

