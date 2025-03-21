// Este módulo solo debe ejecutarse en el servidor
// Utilizamos una verificación para garantizar que no se importe en el cliente

// Verificamos que estamos en el servidor antes de importar módulos de Node.js
const isServer = typeof window === 'undefined';

// Importaciones condicionales para evitar errores en el cliente
let fs: any;
let path: any;

if (isServer) {
  // Solo importamos estos módulos en el servidor
  fs = require('fs');
  path = require('path');
}

/**
 * Inicializa la estructura de carpetas para almacenamiento y crea el archivo de metadatos
 * si no existe. Esta función debe ejecutarse en tiempo de construcción o al inicio del servidor.
 */
export function initializeStorage() {
  // Verificar que estamos en el servidor
  if (!isServer) {
    console.warn('initializeStorage solo debe ejecutarse en el servidor');
    return {
      success: false,
      error: 'Esta función solo puede ejecutarse en el servidor'
    };
  }

  const storagePath = path.join(process.cwd(), 'storage');
  const metadataFile = path.join(storagePath, 'metadata.json');
  
  console.log("Inicializando sistema de almacenamiento...");
  
  // Asegurar que existe el directorio base de almacenamiento
  if (!fs.existsSync(storagePath)) {
    console.log("Creando directorio base de almacenamiento:", storagePath);
    fs.mkdirSync(storagePath, { recursive: true });
  }
  
  // Crear subdirectorios necesarios
  const directories = [
    path.join(storagePath, 'clinicas'),
    path.join(storagePath, 'global'),
    path.join(storagePath, 'global', 'templates'),
    path.join(storagePath, 'global', 'common'),
    path.join(storagePath, 'global', 'backup'),
    path.join(storagePath, 'temp')
  ];
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      console.log("Creando directorio:", dir);
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  
  // Crear archivo de metadatos si no existe
  if (!fs.existsSync(metadataFile)) {
    console.log("Creando archivo de metadatos:", metadataFile);
    fs.writeFileSync(metadataFile, JSON.stringify({}, null, 2));
  }
  
  console.log("Sistema de almacenamiento inicializado correctamente");
  
  return {
    success: true,
    metadataFile
  };
}

/**
 * Inicializa la estructura para una clínica específica
 */
export function initializeClinicStorage(clinicId: string) {
  // Verificar que estamos en el servidor
  if (!isServer) {
    console.warn('initializeClinicStorage solo debe ejecutarse en el servidor');
    return {
      success: false,
      error: 'Esta función solo puede ejecutarse en el servidor'
    };
  }

  const clinicPath = path.join(process.cwd(), 'storage', 'clinicas', clinicId);
  
  // Crear directorio de la clínica si no existe
  if (!fs.existsSync(clinicPath)) {
    console.log("Creando directorio para clínica:", clinicPath);
    fs.mkdirSync(clinicPath, { recursive: true });
  }
  
  return {
    success: true,
    clinicPath
  };
} 