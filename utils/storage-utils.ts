/**
 * Saves data to localStorage with error handling
 * @param key The key to store the data under
 * @param data The data to store
 * @returns boolean indicating success or failure
 */
export function saveToStorage(key: string, data: any): boolean {
  try {
    if (typeof window === "undefined") return false

    const serializedData = JSON.stringify(data)
    localStorage.setItem(key, serializedData)

    // Dispatch a custom event to notify other components of the change
    window.dispatchEvent(
      new CustomEvent("storage-updated", {
        detail: { key, data },
      }),
    )

    return true
  } catch (error) {
    console.error(`Error saving to localStorage (key: ${key}):`, error)
    return false
  }
}

/**
 * Retrieves data from localStorage with error handling
 * @param key The key to retrieve data from
 * @param defaultValue Default value to return if key doesn't exist or on error
 * @returns The retrieved data or defaultValue
 */
export function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    if (typeof window === "undefined") return defaultValue

    const serializedData = localStorage.getItem(key)
    if (serializedData === null) {
      return defaultValue
    }
    return JSON.parse(serializedData) as T
  } catch (error) {
    console.error(`Error retrieving from localStorage (key: ${key}):`, error)
    return defaultValue
  }
}

/**
 * Removes data from localStorage with error handling
 * @param key The key to remove
 * @returns boolean indicating success or failure
 */
export function removeFromStorage(key: string): boolean {
  try {
    if (typeof window === "undefined") return false

    localStorage.removeItem(key)

    // Dispatch a custom event to notify other components of the change
    window.dispatchEvent(
      new CustomEvent("storage-updated", {
        detail: { key, removed: true },
      }),
    )

    return true
  } catch (error) {
    console.error(`Error removing from localStorage (key: ${key}):`, error)
    return false
  }
}

/**
 * Clears all data from localStorage with error handling
 * @returns boolean indicating success or failure
 */
export function clearStorage(): boolean {
  try {
    if (typeof window === "undefined") return false

    localStorage.clear()

    // Dispatch a custom event to notify other components of the change
    window.dispatchEvent(new CustomEvent("storage-cleared"))

    return true
  } catch (error) {
    console.error("Error clearing localStorage:", error)
    return false
  }
}

// Solo importar fs y path en el servidor
let fs: any;
let path: any;
let STORAGE_DIR: string = '';

// Verificamos si estamos en el servidor
if (typeof window === 'undefined') {
  // Importación dinámica solo en el servidor
  import('fs').then(module => {
    fs = module.default;
  });
  import('path').then(module => {
    path = module.default;
    STORAGE_DIR = path.join(process.cwd(), 'storage');
  });
}

// Asegurar que existe la estructura base
export const initializeStorageStructure = async (clinicId?: string) => {
  // Si estamos en el cliente, llamar a la API
  if (typeof window !== 'undefined') {
    try {
      const response = await fetch('/api/storage/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clinicId }),
      });
      
      if (!response.ok) {
        throw new Error('Error al inicializar estructura de almacenamiento');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error llamando a la API de inicialización:', error);
      return { success: false, error };
    }
  } else {
    // En el servidor, importar y usar la función de inicialización
    try {
      const { initializeServerStorage } = await import('../lib/init-storage');
      return initializeServerStorage(clinicId);
    } catch (error) {
      console.error('Error al importar función de inicialización:', error);
      return { success: false, error };
    }
  }
};

// Generar ruta para un archivo según su tipo y entidad
export const getStoragePath = (
  entityType: string,
  entityId: string,
  clinicId: string,
  fileType: 'images' | 'documents' | 'other' = 'other'
): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  // Si estamos en el cliente, solo devolvemos la ruta virtual
  if (typeof window !== 'undefined' || !fs || !path) {
    return `/clinicas/${clinicId}/${entityType}/${year}/${month}/${entityId}/${fileType}`;
  }
  
  const dirPath = path.join(
    STORAGE_DIR,
    'clinicas',
    clinicId,
    entityType,
    year.toString(),
    month,
    entityId,
    fileType
  );
  
  // Crear estructura si no existe
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  return dirPath;
};

// Guardar un archivo en el sistema de archivos o localStorage
export const saveFile = async (
  file: File,
  entityType: string,
  entityId: string,
  clinicId: string,
  fileId: string
): Promise<{ localPath: string, publicUrl: string }> => {
  const fileType = file.type.startsWith('image/') 
    ? 'images' 
    : file.type.includes('pdf') || file.type.includes('word') || file.type.includes('excel')
      ? 'documents'
      : 'other';
  
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  // Determinar extensión
  const extension = file.name.split('.').pop() || '';
  const fileName = `${fileId}.${extension}`;
  
  // URL pública para acceder al archivo
  const virtualPath = `/clinicas/${clinicId}/${entityType}/${year}/${month}/${entityId}/${fileType}/${fileName}`;
  
  // Si estamos en el cliente
  if (typeof window !== 'undefined') {
    try {
      console.log("Subiendo archivo desde el cliente:", { 
        entityType, 
        entityId, 
        clinicId, 
        fileId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });
      
      // Verificar parámetros
      if (!entityType || !entityId || !clinicId || !fileId) {
        console.error("Faltan parámetros obligatorios:", { entityType, entityId, clinicId, fileId });
        throw new Error("Faltan parámetros obligatorios para subir archivo");
      }
      
      // SIEMPRE usar el almacenamiento del servidor, ignorando la configuración
      // Esto garantiza que los archivos sean persistentes
      
      // Preparar FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', entityType);
      formData.append('entityId', entityId);
      formData.append('clinicId', clinicId);
      formData.append('fileId', fileId);
      
      console.log("Enviando archivo al servidor. URL:", '/api/storage/upload');
      
      // Enviar al endpoint de carga directamente
      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData
      });
      
      // Verificar respuesta
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error en la respuesta del servidor:", response.status, errorText);
        throw new Error(`Error al subir archivo al servidor: ${errorText}`);
      }
      
      const result = await response.json();
      console.log("Respuesta exitosa del servidor:", result);
      
      if (result.success) {
        console.log("Archivo guardado correctamente en el servidor:", {
          localPath: result.localPath,
          publicUrl: result.publicUrl
        });
        
        // También almacenar en localStorage para caché local
        if (file.type.startsWith('image/')) {
          console.log("Guardando en localStorage para caché local");
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
            try {
              const base64Data = reader.result as string;
              localStorage.setItem(`file_${virtualPath}`, base64Data);
              console.log("Imagen guardada en localStorage como caché");
              
              // También guardar un índice de archivos
              const pathIndex = JSON.parse(localStorage.getItem('filePathIndex') || '{}');
              if (!pathIndex[entityType]) pathIndex[entityType] = {};
              if (!pathIndex[entityType][entityId]) pathIndex[entityType][entityId] = {};
              if (!pathIndex[entityType][entityId][clinicId]) pathIndex[entityType][entityId][clinicId] = [];
              
              // Comprobar si ya existe este archivo en el índice
              const existingIndex = pathIndex[entityType][entityId][clinicId].findIndex(
                (item: any) => item.id === fileId
              );
              
              const fileInfo = {
                id: fileId,
                path: virtualPath,
                localPath: result.localPath,
                publicUrl: result.publicUrl,
                date: new Date().toISOString()
              };
              
              if (existingIndex >= 0) {
                // Actualizar entrada existente
                pathIndex[entityType][entityId][clinicId][existingIndex] = fileInfo;
              } else {
                // Añadir nueva entrada
                pathIndex[entityType][entityId][clinicId].push(fileInfo);
              }
              
              localStorage.setItem('filePathIndex', JSON.stringify(pathIndex));
              console.log("Índice actualizado en localStorage");
            } catch (error) {
              console.error("Error al guardar en localStorage:", error);
            }
          };
        }
        
        return {
          localPath: result.localPath,
          publicUrl: result.publicUrl
        };
      } else {
        console.error("Error reportado por el servidor:", result.error);
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error al guardar archivo:', error);
      throw error;
    }
  }
  
  // En servidor, usar la implementación con fs
  if (!fs || !path) {
    throw new Error('No se pudo acceder al sistema de archivos del servidor');
  }
  
  const dirPath = getStoragePath(entityType, entityId, clinicId, fileType as any);
  const filePath = path.join(dirPath, fileName);
  
  // Implementar escritura de archivo en el servidor
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);
    
    console.log(`Archivo guardado en el servidor: ${filePath}`);
    
    return {
      localPath: filePath,
      publicUrl: virtualPath
    };
  } catch (error) {
    console.error('Error al escribir archivo en el servidor:', error);
    throw error;
  }
};

// Funciones de utilidad para manejar el almacenamiento de datos en el cliente

import { COOKIE_KEYS } from "./cookie-utils"

// Función para verificar si hay datos de clínicas almacenados
export function hasClinics(): boolean {
  try {
    // Verificar localStorage
    const localStorageData = localStorage.getItem("clinics")
    if (localStorageData && JSON.parse(localStorageData).length > 0) {
      return true
    }
    
    // Verificar cookies
    const cookieData = getCookie(COOKIE_KEYS.CLINICS)
    if (cookieData && cookieData.length > 5) { // Valor mínimo para datos válidos
      return true
    }
    
    return false
  } catch (error) {
    console.error("Error al verificar clínicas:", error)
    return false
  }
}

// Función para cargar datos de clínicas desde almacenamiento
export function loadClinicData(): void {
  try {
    // Esta función solo asegura que los datos estén disponibles
    // La lógica de hidratación real está en el contexto de la clínica
    const localData = localStorage.getItem("clinics")
    const cookieData = getCookie(COOKIE_KEYS.CLINICS)
    
    // Verificar si tenemos datos
    if (!localData && !cookieData) {
      console.log("No se encontraron datos de clínicas en el almacenamiento")
    } else {
      console.log("Datos de clínicas disponibles para hidratación")
    }
  } catch (error) {
    console.error("Error al cargar datos de clínicas:", error)
  }
}

// Función para cargar datos del tema
export function loadThemeData(): void {
  try {
    // Similar a la función anterior, asegura que los datos estén disponibles
    const themeMode = localStorage.getItem("theme-mode")
    if (!themeMode) {
      console.log("No se encontró configuración de tema, usando predeterminado")
    }
  } catch (error) {
    console.error("Error al cargar datos de tema:", error)
  }
}

// Función auxiliar para obtener una cookie por nombre
function getCookie(name: string): string | null {
  try {
    if (typeof document === "undefined") return null
    
    const cookies = document.cookie.split(";")
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim()
      if (cookie.startsWith(name + "=")) {
        return decodeURIComponent(cookie.substring(name.length + 1))
      }
    }
    return null
  } catch (error) {
    console.error("Error al leer cookie:", error)
    return null
  }
}

/**
 * Lee y analiza de forma segura un valor JSON de localStorage
 * @param key Clave para buscar en localStorage
 * @param defaultValue Valor por defecto si no existe o hay error
 */
export function getStorageItemSafe<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    
    try {
      return JSON.parse(item) as T;
    } catch (parseError) {
      console.warn(`Error analizando JSON de localStorage para la clave ${key}:`, parseError);
      // Si hay error de análisis, limpiar el valor corrupto
      localStorage.removeItem(key);
      return defaultValue;
    }
  } catch (error) {
    console.warn(`Error al leer de localStorage:`, error);
    return defaultValue;
  }
}


