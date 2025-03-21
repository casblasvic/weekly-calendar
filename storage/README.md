# Sistema de Almacenamiento de Archivos

Este directorio contiene el sistema de almacenamiento local para la aplicación. Los archivos subidos por los usuarios se guardan aquí siguiendo una estructura organizada.

## Estructura de Carpetas

La estructura de carpetas se organiza de la siguiente manera:

```
storage/
├── clinicas/
│   ├── [clinicId]/
│   │   ├── [entityType]/
│   │   │   ├── [entityId]/
│   │   │   │   ├── images/
│   │   │   │   │   ├── [fileId].[ext]
│   │   │   │   ├── documents/
│   │   │   │   │   ├── [fileId].[ext]
│   │   │   │   ├── other/
│   │   │   │   │   ├── [fileId].[ext]
├── global/
│   ├── templates/
│   ├── common/
│   ├── backup/
└── temp/
```

Donde:
- `[clinicId]`: ID de la clínica
- `[entityType]`: Tipo de entidad (equipment, client, treatment, etc.)
- `[entityId]`: ID de la entidad específica
- `[fileId]`: ID único del archivo
- `[ext]`: Extensión del archivo (jpg, png, pdf, etc.)

## Cómo funciona

### Subida de archivos

1. El cliente llama a la función `uploadImage` o similar del contexto
2. La función prepara y envía el archivo al endpoint `/api/storage/upload`
3. El endpoint `/api/storage/upload` guarda el archivo en la estructura de carpetas

### Acceso a archivos

Los archivos se acceden a través del endpoint `/api/storage/file` con una URL como:

```
/api/storage/file?path=clinicas/[clinicId]/[entityType]/[entityId]/images/[fileId].[ext]
```

## Ejemplos de uso

### Subir una imagen para un cliente

```typescript
const { uploadImage } = useImages();

// En un manejador de evento
const handleImageUpload = async (file) => {
  const image = await uploadImage(
    file,
    'client',
    clientId,
    clinicId,
    { isPrimary: true }
  );
  
  // Ahora image.url contiene la URL para acceder a la imagen
  console.log(image.url);
};
```

### Acceder a una imagen

Una vez obtenida la URL, se puede usar directamente en un componente de imagen:

```jsx
<Image 
  src={image.url} 
  alt="Imagen de cliente" 
  width={200} 
  height={200} 
/>
```

## Permisos

Este directorio debe tener permisos de escritura para el usuario que ejecuta la aplicación. 