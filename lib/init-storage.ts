import fs from 'fs';
import path from 'path';

/**
 * Versión simple para verificar si estamos en el servidor
 * Esta función se usa para determinar si podemos usar fs y path
 */
function isServer() {
  return typeof window === 'undefined';
}

/**
 * Inicialización de la estructura de carpetas para el almacenamiento.
 * Esta función se llama desde diferentes puntos para garantizar que
 * la estructura exista cuando sea necesaria.
 */
export function initializeServerStorage(clinicId?: string) {
  // Verificar que estamos en el servidor
  if (!isServer()) {
    console.warn('initializeServerStorage solo debe ejecutarse en el servidor');
    return {
      success: false,
      message: 'No en servidor'
    };
  }

  // Verificar si hay acceso a fs y path
  if (!fs || !path) {
    console.warn('Módulos fs y path no disponibles');
    return {
      success: false,
      message: 'Módulos del sistema de archivos no disponibles'
    };
  }

  try {
    console.log("Inicializando estructura de almacenamiento en el servidor", clinicId ? `para clínica ${clinicId}` : "global");
    
    // Obtener la ruta base de almacenamiento (por defecto o desde variable de entorno)
    const storagePath = process.env.STORAGE_PATH || './storage';
    const baseDir = path.resolve(process.cwd(), storagePath);
    
    console.log("Ruta base de almacenamiento:", baseDir);
    
    // Comprobar si existe la carpeta base
    if (!fs.existsSync(baseDir)) {
      console.log(`Creando directorio base: ${baseDir}`);
      try {
        fs.mkdirSync(baseDir, { recursive: true });
      } catch (error) {
        console.error(`Error al crear directorio base ${baseDir}:`, error);
        throw error;
      }
    }
    
    // Estructura base global
    const globalDirs = [
      path.join(baseDir, 'global'),
      path.join(baseDir, 'global', 'templates'),
      path.join(baseDir, 'global', 'common'),
      path.join(baseDir, 'global', 'backup'),
    ];
    
    // Crear directorios globales
    for (const dir of globalDirs) {
      if (!fs.existsSync(dir)) {
        try {
          console.log(`Creando directorio global: ${dir}`);
          fs.mkdirSync(dir, { recursive: true });
          console.log(`Directorio creado: ${dir}`);
        } catch (error) {
          console.error(`Error al crear directorio ${dir}:`, error);
          throw error;
        }
      }
    }
    
    // Crear directorio base de clínicas
    const clinicBaseDir = path.join(baseDir, 'clinicas');
    if (!fs.existsSync(clinicBaseDir)) {
      try {
        console.log(`Creando directorio base de clínicas: ${clinicBaseDir}`);
        fs.mkdirSync(clinicBaseDir, { recursive: true });
        console.log(`Directorio creado: ${clinicBaseDir}`);
      } catch (error) {
        console.error(`Error al crear directorio ${clinicBaseDir}:`, error);
        throw error;
      }
    }
    
    // Si hay clinicId, crear estructura para esa clínica
    if (clinicId) {
      console.log(`Creando estructura para clínica específica: ${clinicId}`);
      
      const clinicDirs = [
        path.join(baseDir, 'clinicas', clinicId),
        path.join(baseDir, 'clinicas', clinicId, 'equipamiento'),
        path.join(baseDir, 'clinicas', clinicId, 'clientes'),
        path.join(baseDir, 'clinicas', clinicId, 'tratamientos'),
        path.join(baseDir, 'clinicas', clinicId, 'servicios'),
        path.join(baseDir, 'clinicas', clinicId, 'personal'),
        path.join(baseDir, 'clinicas', clinicId, 'documentos'),
      ];
      
      for (const dir of clinicDirs) {
        if (!fs.existsSync(dir)) {
          try {
            console.log(`Creando directorio para clínica: ${dir}`);
            fs.mkdirSync(dir, { recursive: true });
            console.log(`Directorio creado: ${dir}`);
            
            // Verificar que se creó correctamente
            if (!fs.existsSync(dir)) {
              console.error(`¡Error! El directorio no existe después de crearlo: ${dir}`);
              throw new Error(`No se pudo crear el directorio: ${dir}`);
            }
          } catch (error) {
            console.error(`Error al crear directorio ${dir}:`, error);
            throw error;
          }
        } else {
          console.log(`El directorio ya existe: ${dir}`);
        }
      }
    }
    
    // Verificar permisos de escritura
    try {
      const testFile = path.join(baseDir, '.test-write');
      console.log(`Verificando permisos de escritura en: ${testFile}`);
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log("Permisos de escritura verificados correctamente");
    } catch (permError) {
      console.error("Error de permisos al intentar escribir:", permError);
      return {
        success: false,
        error: 'Error de permisos al escribir en el directorio de almacenamiento'
      };
    }
    
    console.log("Estructura de almacenamiento inicializada correctamente");
    
    return {
      success: true,
      message: clinicId 
        ? `Estructura creada para clínica ${clinicId}` 
        : 'Estructura base creada'
    };
  } catch (error: any) {
    console.error('Error al crear estructura de carpetas:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
