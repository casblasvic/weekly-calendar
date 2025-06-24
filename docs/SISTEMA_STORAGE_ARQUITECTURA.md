# 📁 SISTEMA DE STORAGE - ARQUITECTURA DEFINITIVA

## 🎯 OBJETIVO

Sistema híbrido de almacenamiento de archivos que permite:
- **Fase 1**: Storage local seguro y estructurado
- **Fase 2**: Migración transparente a storage externo (S3, Google Cloud)
- **Monetización**: Medición precisa de uso de espacio por clínica
- **Seguridad**: Control de acceso granular por entidad y clínica

---

## 📂 ESTRUCTURA DE CARPETAS

### **Ubicación Base**: `/storage/` (FUERA de public, protegido)

```
/storage/
├── clinicas/
│   ├── {clinicId}/                     # ID único de clínica
│   │   ├── services/                   # Servicios
│   │   │   └── {serviceId}/
│   │   │       ├── images/
│   │   │       │   ├── profile/        # Imagen principal
│   │   │       │   ├── gallery/        # Galería
│   │   │       │   └── thumbs/         # Miniaturas (auto-generadas)
│   │   │       └── documents/
│   │   │           ├── manuals/        # Manuales
│   │   │           ├── certificates/   # Certificados
│   │   │           └── general/        # Documentos generales
│   │   ├── clients/                    # Clientes/Pacientes
│   │   │   └── {personId}/
│   │   │       ├── photos/
│   │   │       │   ├── before/         # 🔒 Fotos "antes"
│   │   │       │   ├── after/          # 🔒 Fotos "después"
│   │   │       │   ├── progress/       # 🔒 Evolución tratamiento
│   │   │       │   └── thumbs/
│   │   │       ├── medical-docs/       # 🔒 ALTA CONFIDENCIALIDAD
│   │   │       │   ├── reports/        # Informes médicos
│   │   │       │   ├── prescriptions/  # Recetas
│   │   │       │   ├── consent/        # Consentimientos
│   │   │       │   └── history/        # Historial
│   │   │       └── general/            # Documentos generales
│   │   ├── products/                   # Productos
│   │   │   └── {productId}/
│   │   │       ├── images/
│   │   │       │   ├── catalog/        # Catálogo
│   │   │       │   ├── instructions/   # Instrucciones uso
│   │   │       │   └── thumbs/
│   │   │       └── documents/
│   │   │           ├── datasheets/     # Fichas técnicas
│   │   │           ├── safety/         # Seguridad
│   │   │           └── certificates/   # Certificaciones
│   │   ├── equipment/                  # Equipamiento
│   │   │   └── {equipmentId}/
│   │   │       ├── images/
│   │   │       │   ├── photos/         # Fotos del equipo
│   │   │       │   ├── installation/   # Instalación
│   │   │       │   └── thumbs/
│   │   │       └── documents/
│   │   │           ├── manuals/        # Manuales
│   │   │           ├── maintenance/    # Mantenimiento
│   │   │           ├── warranties/     # Garantías
│   │   │           └── certificates/   # Certificaciones
│   │   ├── appointments/               # Citas
│   │   │   └── {appointmentId}/
│   │   │       ├── photos/             # 🔒 Fotos durante cita
│   │   │       └── documents/          # Documentos de cita
│   │   ├── treatments/                 # Tratamientos
│   │   │   └── {treatmentId}/
│   │   │       ├── photos/             # 🔒 Evolución
│   │   │       └── documents/          # Protocolos
│   │   └── clinic/                     # Clínica general
│   │       ├── images/
│   │       │   ├── logo/               # Logotipos
│   │       │   ├── facilities/         # Instalaciones
│   │       │   ├── team/               # Equipo
│   │       │   └── thumbs/
│   │       └── documents/
│   │           ├── licenses/           # 🔒 Licencias
│   │           ├── insurance/          # 🔒 Seguros
│   │           ├── contracts/          # 🔒 Contratos
│   │           ├── protocols/          # Protocolos
│   │           └── marketing/          # Marketing
├── system/                             # Sistema global
│   ├── templates/                      # Plantillas
│   ├── backups/                        # Backups automáticos
│   └── logs/                           # Logs de acceso
└── temp/                               # Uploads temporales
    ├── processing/                     # En procesamiento
    └── quarantine/                     # Cuarentena (virus scan)
```

---

## 🏷️ CONVENCIÓN DE NAMING

### **Formato General**:
`{timestamp}_{entityType}_{entityId}_{category}_{originalName}`

### **Ejemplos**:
```
20241215_143022_service_clv123_gallery_laser-facial.jpg
20241215_143022_client_clv456_before_tratamiento-facial.jpg  
20241215_143022_product_clv789_catalog_crema-hidratante.jpg
20241215_143022_equipment_clv012_manual_laser-co2.pdf
```

### **Componentes**:
- **timestamp**: `YYYYMMDD_HHMMSS` (UTC)
- **entityType**: `service|client|product|equipment|appointment|treatment|clinic`
- **entityId**: CUID de la entidad  
- **category**: `profile|gallery|before|after|progress|manual|certificate|report|etc`
- **originalName**: Nombre original sanitizado (sin espacios, caracteres especiales)

---

## 📊 TIPOS DE ARCHIVO SOPORTADOS

### **🖼️ IMÁGENES**
```typescript
const IMAGE_TYPES = {
  'image/jpeg': { ext: 'jpg', maxSize: '10MB', thumbs: true },
  'image/png': { ext: 'png', maxSize: '10MB', thumbs: true },
  'image/webp': { ext: 'webp', maxSize: '10MB', thumbs: true },
  'image/heic': { ext: 'heic', maxSize: '15MB', thumbs: true }, // iPhone
  'image/raw': { ext: 'raw', maxSize: '50MB', thumbs: false }   // Profesional
}
```

### **📄 DOCUMENTOS**
```typescript
const DOCUMENT_TYPES = {
  'application/pdf': { ext: 'pdf', maxSize: '25MB', preview: true },
  'application/msword': { ext: 'doc', maxSize: '10MB', preview: false },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: 'docx', maxSize: '10MB', preview: false },
  'application/vnd.ms-excel': { ext: 'xls', maxSize: '15MB', preview: false },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { ext: 'xlsx', maxSize: '15MB', preview: false },
  'text/plain': { ext: 'txt', maxSize: '5MB', preview: true },
  'text/csv': { ext: 'csv', maxSize: '10MB', preview: true }
}
```

### **🎥 MULTIMEDIA** (Futuro)
```typescript
const MEDIA_TYPES = {
  'video/mp4': { ext: 'mp4', maxSize: '100MB', thumbs: true },
  'audio/mpeg': { ext: 'mp3', maxSize: '25MB', thumbs: false }
}
```

---

## 🔒 NIVELES DE SEGURIDAD

### **🟢 PÚBLICO** (Acceso libre dentro de clínica)
- Imágenes de productos (catálogo)
- Manuales generales
- Información de servicios

### **🟡 INTERNO** (Solo usuarios autenticados de la clínica)
- Documentos de equipamiento
- Protocolos internos
- Imágenes de instalaciones

### **🔴 CONFIDENCIAL** (Solo usuarios autorizados + auditoría)
- Fotos de pacientes
- Informes médicos
- Documentos legales/licencias
- Historiales clínicos

### **⚫ ULTRA-CONFIDENCIAL** (Acceso muy restringido + doble autenticación)
- Fotos médicas comprometidas
- Documentos financieros sensibles
- Datos de auditorías

---

## 🚀 API ENDPOINTS

### **📤 UPLOAD**
```
POST /api/storage/upload
Body: {
  entityType: 'service' | 'client' | 'product' | 'equipment' | 'appointment' | 'treatment' | 'clinic',
  entityId: string,
  category: string,
  securityLevel: 'public' | 'internal' | 'confidential' | 'ultra-confidential',
  file: File
}
```

### **📥 DOWNLOAD**
```
GET /api/storage/file/{fileId}
Query: ?thumb=true&size=small|medium|large
Headers: Authorization: Bearer {token}
```

### **📋 LISTADO**
```
GET /api/storage/files
Query: {
  entityType?: string,
  entityId?: string,
  category?: string,
  fileType?: string,
  dateFrom?: string,
  dateTo?: string,
  securityLevel?: string,
  page?: number,
  limit?: number
}
```

### **🗑️ DELETE**
```
DELETE /api/storage/file/{fileId}
Body: { permanent: boolean }
```

---

## 📊 METADATA Y TRACKING

### **EntityImage/EntityDocument** (Prisma)
```typescript
model EntityImage {
  id               String     @id @default(cuid())
  entityId         String     // ID de la entidad propietaria
  entityType       EntityType // Tipo de entidad
  imageUrl         String     // URL del archivo
  fileName         String     // Nombre original
  fileSize         Int        // Tamaño en bytes
  mimeType         String     // Tipo MIME
  category         String     // Categoría (profile, gallery, before, etc.)
  securityLevel    String     // Nivel de seguridad
  altText          String?    // Texto alternativo
  caption          String?    // Descripción
  order            Int?       // Orden en galería
  isProfilePic     Boolean    // ¿Es imagen principal?
  uploadedByUserId String?    // Usuario que subió
  systemId         String     // Sistema
  clinicId         String     // Clínica propietaria
  storageProvider  String     // 'local' | 's3' | 'gcloud'
  storagePath      String     // Ruta en storage
  metadata         Json?      // Metadata adicional (EXIF, etc.)
  createdAt        DateTime   @default(now())
  updatedAt        DateTime   @updatedAt
  
  // Tracking de acceso
  lastAccessedAt   DateTime?
  accessCount      Int        @default(0)
  
  // Soft delete
  deletedAt        DateTime?
  deletedBy        String?
}
```

---

## 🔄 MIGRACIÓN A STORAGE EXTERNO

### **Configuración por Clínica**
```typescript
interface StorageConfig {
  provider: 'local' | 's3' | 'gcloud' | 'azure'
  credentials: {
    bucket?: string
    region?: string
    accessKey?: string
    secretKey?: string
  }
  quota: {
    totalGB: number
    usedGB: number
    warningThreshold: number
  }
  backup: {
    enabled: boolean
    frequency: 'daily' | 'weekly' | 'monthly'
    retention: number // días
  }
}
```

### **Proceso de Migración**
1. **Upload Dual**: Subir a local + externo simultáneamente
2. **Verificación**: Comprobar integridad en ambos
3. **Switchover**: Cambiar URLs a externo
4. **Cleanup**: Limpiar archivos locales después de N días

---

## 📈 MONETIZACIÓN Y CUOTAS

### **Medición de Uso**
```typescript
interface StorageUsage {
  clinicId: string
  totalFiles: number
  totalSizeBytes: number
  byEntityType: {
    [key: string]: {
      count: number
      sizeBytes: number
    }
  }
  byFileType: {
    [key: string]: {
      count: number  
      sizeBytes: number
    }
  }
  bySecurityLevel: {
    [key: string]: {
      count: number
      sizeBytes: number
    }
  }
  monthlyGrowth: number
  lastCalculated: DateTime
}
```

### **Planes de Almacenamiento**
```typescript
interface StoragePlan {
  name: string
  maxSizeGB: number
  maxFiles: number
  pricePerGB: number
  features: {
    backup: boolean
    externalStorage: boolean
    advancedSecurity: boolean
    apiAccess: boolean
  }
}
```

---

## 🛠️ IMPLEMENTACIÓN EN CÓDIGO

### **Al crear campo de upload**:
```typescript
// 1. Definir categoría y nivel de seguridad
const uploadConfig = {
  entityType: 'service',
  category: 'gallery', 
  securityLevel: 'internal',
  allowedTypes: ['image/jpeg', 'image/png'],
  maxSize: '10MB'
}

// 2. Usar hook standardizado
const { uploadFiles, deleteFile, files } = useEntityStorage({
  entityType: 'service',
  entityId: serviceId,
  category: 'gallery'
})

// 3. Componente de upload
<StorageUploader 
  config={uploadConfig}
  onUpload={uploadFiles}
  onDelete={deleteFile}
  files={files}
  layout="gallery"
/>
```

### **Hooks Estandarizados**:
```typescript
// Para cualquier entidad
useEntityStorage(entityType, entityId, category?)
useStorageQuota(clinicId)
useStorageStats(clinicId, filters?)
```

---

## 🔍 FILTROS Y BÚSQUEDA

### **Filtros Disponibles**:
- **Entidad**: Tipo y ID de entidad
- **Fecha**: Rango de fechas de creación/modificación
- **Tipo de archivo**: MIME type o extensión
- **Categoría**: profile, gallery, manual, etc.
- **Seguridad**: Nivel de acceso
- **Usuario**: Quién subió el archivo
- **Tamaño**: Rango de tamaños
- **Estado**: Activo, eliminado, en cuarentena

### **Búsqueda de Texto**:
- Nombre de archivo
- Alt text / Caption
- Metadata
- Tags (futuro)

---

## 🚨 MONITOREO Y ALERTS

### **Alertas Automáticas**:
- ✅ Cuota al 80% del límite
- ✅ Archivos sospechosos (virus)
- ✅ Accesos no autorizados
- ✅ Fallos de backup
- ✅ Archivos huérfanos (sin entidad)

### **Logs de Auditoría**:
- Todos los accesos a archivos confidenciales
- Uploads y deletes
- Cambios de permisos
- Fallos de autenticación

---

## 📋 CHECKLIST PARA NUEVOS CAMPOS

Al agregar campo de upload de archivos:

1. **✅ Definir**: entityType, category, securityLevel
2. **✅ Configurar**: tipos permitidos, tamaño máximo  
3. **✅ Usar**: hooks estandarizados (`useEntityStorage`)
4. **✅ Implementar**: componente con `StorageUploader`
5. **✅ Validar**: permisos de acceso
6. **✅ Documentar**: en este archivo si es nueva categoría
7. **✅ Probar**: upload, download, delete, permisos

---

## 🎯 ROADMAP

### **✅ FASE 1: Local Storage (Actual)**
- Estructura de carpetas segura
- API básica CRUD
- Mappers Entity → File
- Control de acceso básico

### **🔄 FASE 2: Storage Externo**
- Integración S3/Google Cloud
- Migración transparente
- Backup automático

### **📊 FASE 3: Monetización**
- Sistema de cuotas
- Facturación automática
- Analytics de uso

### **🚀 FASE 4: Avanzado**
- CDN para optimización
- Compresión automática
- AI para categorización
- Búsqueda semántica

---

**Este documento debe actualizarse cada vez que se agreguen nuevas categorías, tipos de archivo o funcionalidades de storage.** 