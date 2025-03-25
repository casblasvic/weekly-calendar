# TIM-CONTEXT: Guía para el Desarrollo de Componentes

## Descripción General de la Aplicación

Esta aplicación es un sistema de gestión para clínicas que permite administrar agendas, clientes, servicios, equipamiento y más. Está desarrollada con Next.js utilizando React y TypeScript, siguiendo una arquitectura basada en contextos para la gestión de estado y acceso a datos.

## Arquitectura de Datos

La aplicación utiliza una arquitectura en capas para el manejo de datos:

1. **Capa de Presentación**: Componentes React que renderizan la interfaz de usuario.
2. **Capa de Contexto**: Proveedores de contexto React que encapsulan la lógica de acceso a datos.
3. **Capa de Servicios**: Servicios que abstraen el acceso a las fuentes de datos.
4. **Capa de Datos**: Implementaciones concretas para acceder a los datos (local o remoto).

### Flujo de Datos

```
Componente → useContexto() → DataService → LocalDataService/SupabaseDataService
```

En desarrollo, los datos se almacenan localmente usando `LocalDataService`.
En producción, se utilizará `SupabaseDataService` para acceder a bases de datos remotas.

## Uso de Contextos

Los contextos son la pieza fundamental para que los componentes accedan a los datos. Cada entidad principal del sistema tiene su propio contexto que proporciona funciones CRUD y otras operaciones específicas.

### Contexto Principal: InterfazContext

El `InterfazContext` es el contexto central que proporciona acceso a todas las entidades y funciones del sistema. Es recomendable usar este contexto para operaciones generales o cuando necesites acceder a múltiples tipos de entidades.

```tsx
import { useInterfaz } from "@/contexts/interfaz-Context";

function MiComponente() {
  const {
    getAllClinicas,
    getClientById,
    createServicio,
    // etc...
  } = useInterfaz();
  
  // Usar estas funciones para acceder o modificar datos
}
```

### Contextos Específicos

Para entidades específicas, es recomendable utilizar sus contextos dedicados:

```tsx
import { useClinic } from "@/contexts/clinic-context";
import { useTarif } from "@/contexts/tarif-context";
import { useCabins } from "@/contexts/CabinContext";

function MiComponente() {
  const { getAllClinics, getClinicById } = useClinic();
  const { getAllTarifas } = useTarif();
  const { getCabinsByClinic } = useCabins();
  
  // Usar estas funciones para acceder o modificar datos
}
```

## Estructura de un Nuevo Componente

Cuando desarrolles un nuevo componente, debes seguir esta estructura:

```tsx
"use client"

import { useState, useEffect } from "react"
// Importar hooks de contexto necesarios
import { useInterfaz } from "@/contexts/interfaz-Context"
// Importar componentes UI
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface MiComponenteProps {
  // Definir props del componente
  entidadId: string;
  // Otras props según sea necesario
}

export default function MiComponente({ entidadId }: MiComponenteProps) {
  // Obtener funciones del contexto
  const { getEntidadById, updateEntidad } = useInterfaz();
  
  // Estados locales
  const [datos, setDatos] = useState<TipoEntidad | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Cargar datos iniciales
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setCargando(true);
        const datosEntidad = await getEntidadById(entidadId);
        setDatos(datosEntidad);
        setError(null);
      } catch (error) {
        console.error("Error al cargar datos:", error);
        setError("Error al cargar los datos");
      } finally {
        setCargando(false);
      }
    };
    
    cargarDatos();
  }, [entidadId, getEntidadById]);
  
  // Funciones de manejo de eventos
  const handleSubmit = async () => {
    try {
      await updateEntidad(entidadId, datos);
      // Notificar cambios a otros componentes
      window.dispatchEvent(
        new CustomEvent("data-change", {
          detail: { entityType: "entidad", entityId: entidadId },
        })
      );
    } catch (error) {
      console.error("Error al actualizar:", error);
      setError("Error al guardar los cambios");
    }
  };
  
  // Renderizar componente
  return (
    <div>
      {/* Contenido del componente */}
    </div>
  );
}
```

## Notificación de Cambios entre Componentes

Para mantener la coherencia de datos entre componentes, utilizamos eventos personalizados:

```tsx
// Al modificar datos
window.dispatchEvent(
  new CustomEvent("data-change", {
    detail: { entityType: "entidadModificada", entityId: idEntidad },
  })
);

// Para escuchar cambios en otro componente
useEffect(() => {
  const handleDataChange = (e: CustomEvent) => {
    const { entityType, entityId } = e.detail;
    if (entityType === "entidadQueObservo" && entityId === idQueObservo) {
      // Recargar datos
    }
  };

  window.addEventListener("data-change" as any, handleDataChange);
  return () => {
    window.removeEventListener("data-change" as any, handleDataChange);
  };
}, [idQueObservo]);
```

## Modelos de Datos Disponibles

La aplicación gestiona los siguientes modelos de datos principales:

### Entidades Principales

- **Clinica**: Representa una clínica física con sus configuraciones.
- **Client**: Información de clientes que reciben servicios.
- **Tarifa**: Tarifas que aplican a servicios.
- **FamiliaTarifa**: Agrupaciones de tarifas.
- **Servicio**: Servicios ofrecidos por las clínicas.
- **Equipo**: Equipamiento disponible en las clínicas.
- **Cabin**: Cabinas o habitaciones dentro de una clínica.
- **ScheduleBlock**: Bloques de horario en la agenda.
- **Producto**: Productos disponibles para venta o uso.
- **Consumo**: Registro de consumos de productos asociados a servicios.

### Tipos de Datos Comunes

```tsx
// Ejemplo de entidad con campos básicos
interface BaseEntity {
  id: string | number;
}

// Entidades que pueden activarse/desactivarse
interface Activable {
  isActive: boolean;
}

// Entidades que pueden deshabilitarse
interface Deshabilitada {
  deshabilitada: boolean;
}
```

## Funciones Disponibles en la Interfaz

El contexto principal `InterfazContext` proporciona las siguientes categorías de funciones:

### Funciones de Clínicas
- `getAllClinicas`: Obtiene todas las clínicas
- `getClinicaById`: Obtiene una clínica por su ID
- `createClinica`: Crea una nueva clínica
- `updateClinica`: Actualiza una clínica existente
- `deleteClinica`: Elimina una clínica
- `getActiveClinicas`: Obtiene solo las clínicas activas

### Funciones de Clientes
- `getAllClients`: Obtiene todos los clientes
- `getClientById`: Obtiene un cliente por su ID
- `createClient`: Crea un nuevo cliente
- `updateClient`: Actualiza un cliente existente
- `deleteClient`: Elimina un cliente
- `getClientsByClinicId`: Obtiene clientes de una clínica específica

### Funciones de Tarifas
- `getAllTarifas`: Obtiene todas las tarifas
- `getTarifaById`: Obtiene una tarifa por su ID
- `createTarifa`: Crea una nueva tarifa
- `updateTarifa`: Actualiza una tarifa existente
- `deleteTarifa`: Elimina una tarifa
- `getTarifasByClinicaId`: Obtiene tarifas asociadas a una clínica

### Funciones de Servicios
- `getAllServicios`: Obtiene todos los servicios
- `getServicioById`: Obtiene un servicio por su ID
- `createServicio`: Crea un nuevo servicio
- `updateServicio`: Actualiza un servicio existente
- `deleteServicio`: Elimina un servicio
- `getServiciosByTarifaId`: Obtiene servicios de una tarifa específica

### Funciones de Equipos
- `getAllEquipos`: Obtiene todos los equipos
- `getEquipoById`: Obtiene un equipo por su ID
- `createEquipo`: Crea un nuevo equipo
- `updateEquipo`: Actualiza un equipo existente
- `deleteEquipo`: Elimina un equipo
- `getEquiposByClinicaId`: Obtiene equipos de una clínica específica

### Funciones de Bloques de Agenda
- `getAllScheduleBlocks`: Obtiene todos los bloques de agenda
- `getScheduleBlockById`: Obtiene un bloque de agenda por su ID
- `createScheduleBlock`: Crea un nuevo bloque de agenda
- `updateScheduleBlock`: Actualiza un bloque de agenda existente
- `deleteScheduleBlock`: Elimina un bloque de agenda
- `getBlocksByDateRange`: Obtiene bloques en un rango de fechas para una clínica

### Funciones de Imágenes y Documentos
- `getEntityImages`: Obtiene imágenes asociadas a una entidad
- `saveEntityImages`: Guarda imágenes para una entidad
- `deleteEntityImages`: Elimina imágenes de una entidad
- `getEntityDocuments`: Obtiene documentos asociados a una entidad
- `saveEntityDocuments`: Guarda documentos para una entidad
- `deleteEntityDocuments`: Elimina documentos de una entidad

## Consideraciones de Desarrollo

### Compatibilidad con Datos Mock

Durante el desarrollo se utiliza `mockData.ts` como adaptador para mantener compatibilidad con código existente. Este archivo redirige las llamadas a los nuevos métodos en los contextos.

Si necesitas acceder a datos en componentes antiguos, puedes usar las funciones exportadas por `mockData.ts`:

```tsx
import { getClinics, getClinic, updateClinic } from "@/mockData";
```

Sin embargo, para nuevos componentes, es recomendable utilizar directamente los contextos:

```tsx
import { useInterfaz } from "@/contexts/interfaz-Context";
```

### Transición a Base de Datos

El sistema está diseñado para funcionar con datos locales durante el desarrollo y con Supabase en producción. Esta transición es manejada automáticamente por el servicio de datos.

## Ejemplo Completo: Desarrollo de un Nuevo Componente

Veamos paso a paso cómo desarrollar un nuevo componente que muestre servicios de una clínica específica:

```tsx
"use client"

import { useState, useEffect } from "react"
import { useInterfaz } from "@/contexts/interfaz-Context"
import { Servicio } from "@/services/data/models/interfaces"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ServiciosClinicaProps {
  clinicaId: string;
}

export default function ServiciosClinica({ clinicaId }: ServiciosClinicaProps) {
  // Usar contexto para acceder a datos
  const { getClinicaById, getTarifasByClinicaId, getServiciosByTarifaId } = useInterfaz();
  
  // Estados locales
  const [clinica, setClinica] = useState<any>(null);
  const [tarifas, setTarifas] = useState<any[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [tarifaActiva, setTarifaActiva] = useState<string>("");
  const [cargando, setCargando] = useState(true);
  const [filtroNombre, setFiltroNombre] = useState("");
  
  // Cargar datos de la clínica
  useEffect(() => {
    const cargarClinica = async () => {
      try {
        const datosClinica = await getClinicaById(clinicaId);
        setClinica(datosClinica);
      } catch (error) {
        console.error("Error al cargar clínica:", error);
      }
    };
    
    cargarClinica();
  }, [clinicaId, getClinicaById]);
  
  // Cargar tarifas de la clínica
  useEffect(() => {
    const cargarTarifas = async () => {
      if (!clinicaId) return;
      
      try {
        const tarifasClinica = await getTarifasByClinicaId(clinicaId);
        setTarifas(tarifasClinica);
        
        // Seleccionar primera tarifa por defecto
        if (tarifasClinica.length > 0 && !tarifaActiva) {
          setTarifaActiva(tarifasClinica[0].id);
        }
      } catch (error) {
        console.error("Error al cargar tarifas:", error);
      }
    };
    
    cargarTarifas();
  }, [clinicaId, getTarifasByClinicaId, tarifaActiva]);
  
  // Cargar servicios de la tarifa seleccionada
  useEffect(() => {
    const cargarServicios = async () => {
      if (!tarifaActiva) {
        setServicios([]);
        setCargando(false);
        return;
      }
      
      try {
        setCargando(true);
        const serviciosTarifa = await getServiciosByTarifaId(tarifaActiva);
        setServicios(serviciosTarifa);
      } catch (error) {
        console.error("Error al cargar servicios:", error);
      } finally {
        setCargando(false);
      }
    };
    
    cargarServicios();
  }, [tarifaActiva, getServiciosByTarifaId]);
  
  // Escuchar cambios de datos
  useEffect(() => {
    const handleDataChange = (e: CustomEvent) => {
      const { entityType, entityId } = e.detail;
      
      if (entityType === "servicio" && servicios.some(s => s.id === entityId)) {
        // Recargar servicios si se modificó uno existente
        getServiciosByTarifaId(tarifaActiva)
          .then(serviciosTarifa => setServicios(serviciosTarifa))
          .catch(error => console.error("Error al recargar servicios:", error));
      }
    };
    
    window.addEventListener("data-change" as any, handleDataChange);
    return () => {
      window.removeEventListener("data-change" as any, handleDataChange);
    };
  }, [tarifaActiva, servicios, getServiciosByTarifaId]);
  
  // Filtrar servicios por nombre
  const serviciosFiltrados = servicios.filter(servicio => 
    servicio.nombre.toLowerCase().includes(filtroNombre.toLowerCase())
  );
  
  // Cambiar tarifa activa
  const cambiarTarifa = (tarifaId: string) => {
    setTarifaActiva(tarifaId);
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          Servicios de {clinica?.name || "Clínica"}
        </CardTitle>
        <div className="flex space-x-2 mt-2">
          {tarifas.map(tarifa => (
            <Button 
              key={tarifa.id}
              variant={tarifaActiva === tarifa.id ? "default" : "outline"}
              onClick={() => cambiarTarifa(tarifa.id)}
            >
              {tarifa.nombre}
            </Button>
          ))}
        </div>
        <Input
          placeholder="Filtrar por nombre..."
          value={filtroNombre}
          onChange={(e) => setFiltroNombre(e.target.value)}
          className="mt-2"
        />
      </CardHeader>
      <CardContent>
        {cargando ? (
          <div className="text-center py-4">Cargando servicios...</div>
        ) : serviciosFiltrados.length === 0 ? (
          <div className="text-center py-4">No hay servicios disponibles</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Duración</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {serviciosFiltrados.map(servicio => (
                <TableRow key={servicio.id}>
                  <TableCell>{servicio.codigo}</TableCell>
                  <TableCell>{servicio.nombre}</TableCell>
                  <TableCell>{servicio.precioConIVA}</TableCell>
                  <TableCell>{servicio.duracion} min</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
```

Este ejemplo muestra:
1. Cómo importar y usar los contextos
2. Cómo cargar datos iniciales
3. Cómo manejar estados de carga y errores
4. Cómo escuchar cambios en los datos
5. Cómo aplicar filtros y transformaciones a los datos

## Mejores Prácticas

1. **Usa los contextos específicos** cuando trabajas principalmente con una entidad.
2. **Usa InterfazContext** cuando necesites acceder a múltiples tipos de entidades.
3. **Maneja estados de carga y error** para mejorar la experiencia del usuario.
4. **Utiliza eventos de cambio de datos** para mantener la sincronización entre componentes.
5. **Separa la lógica de negocio** de los componentes visuales cuando sea posible.
6. **Implementa validación de datos** antes de enviarlos al servicio.
7. **Usa tipos TypeScript** para mejorar la calidad del código y la experiencia de desarrollo.
8. **Documenta tus componentes** con comentarios y tipos claros.

## Resolución de Problemas

### Datos no Actualizados
Si los datos no se actualizan después de modificaciones:
1. Verifica que estás disparando el evento `data-change` correctamente.
2. Asegúrate de que los componentes que necesitan actualizar sus datos están escuchando el evento.
3. Verifica las dependencias de los `useEffect` para asegurarte de que se ejecutan cuando cambian los datos relevantes.

### Errores de Tipo
Si encuentras errores de tipo:
1. Verifica las interfaces en `services/data/models/interfaces.ts`.
2. Utiliza casting de tipos con precaución cuando sea necesario.
3. Actualiza las interfaces si necesitas extender funcionalidades.

### Rendimiento
Si experimentas problemas de rendimiento:
1. Implementa memoización con `useMemo` y `useCallback`.
2. Evita consultas innecesarias a los servicios de datos.
3. Optimiza las operaciones de filtrado y transformación de datos.

## Lista de Todos los Contextos Disponibles

Aquí tienes una lista de todos los contextos disponibles y su propósito:

1. **interfaz-Context**: Contexto principal que proporciona acceso a todas las entidades y operaciones.
2. **clinic-context**: Manejo de clínicas y sus configuraciones.
3. **client-context**: Gestión de clientes y sus datos.
4. **tarif-context**: Administración de tarifas.
5. **servicios-context**: Gestión de servicios ofrecidos.
6. **iva-context**: Manejo de tipos de IVA.
7. **equipment-context**: Administración de equipamiento.
8. **CabinContext**: Gestión de cabinas en clínicas.
9. **schedule-blocks-context**: Bloques de horario en agenda.
10. **schedule-templates-context**: Plantillas de horario.
11. **image-context**: Manejo de imágenes para entidades.
12. **file-context**: Gestión de archivos y documentos.
13. **storage-context**: Administración del almacenamiento.
14. **producto-contexto**: Gestión de productos.
15. **consumo-servicio-context**: Registro de consumos de servicios.
16. **family-context**: Gestión de familias (agrupaciones).
17. **document-context**: Administración de documentos.
18. **database-context**: Acceso a base de datos (uso interno).
19. **theme-context**: Configuración de temas de la aplicación.
20. **auth-context**: Autenticación de usuarios.

## Conclusión

Siguiendo esta guía, podrás desarrollar componentes que se integren perfectamente con la arquitectura de la aplicación, manteniendo una estructura coherente y facilitando el trabajo en equipo.

Recuerda que la clave para un desarrollo exitoso es comprender cómo fluyen los datos a través de la aplicación y utilizar las herramientas apropiadas para cada tarea.

Para cualquier duda o sugerencia sobre esta documentación, contacta al equipo de desarrollo. 

## Nota Importante para el Equipo de Desarrollo

**Este documento debe ser actualizado obligatoriamente cada vez que un miembro del equipo desarrolle una nueva interfaz o añada nuevas funciones a los contextos existentes**. 

El objetivo es mantener un catálogo completo, actualizado y accesible de todas las funciones disponibles en el sistema para que cualquier desarrollador, ya sea del equipo o una inteligencia artificial, pueda conocer rápidamente las capacidades del sistema y cómo integrar correctamente nuevos componentes.

La documentación completa y actualizada es fundamental para:
1. Facilitar la incorporación de nuevos miembros al equipo
2. Reducir errores de integración entre componentes
3. Mantener la coherencia en el diseño y arquitectura
4. Proporcionar un punto de referencia único para todo el equipo

Al añadir una nueva funcionalidad, asegúrate de:
- Documentar las nuevas funciones con sus parámetros y valores de retorno
- Actualizar la lista de contextos si has creado uno nuevo
- Incluir ejemplos de uso si la funcionalidad es compleja
- Informar al resto del equipo sobre las actualizaciones realizadas 