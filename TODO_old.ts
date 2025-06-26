/**
 * ======================================
 *      Tareas Pendientes (TODO List)
 * ======================================
 *
 * Este archivo centraliza las tareas de desarrollo pendientes,
 * mejoras y refactorizaciones necesarias en el proyecto.
 */

// --- Generación Automática de Códigos --- 

// TODO: [Contexto Servicios] Implementar `getAllServicios` o `getAllServiceCodes`.
//  - Debe obtener y devolver todos los códigos de servicio existentes (string[]).
//  - Añadir la función al tipo `ServicioContextType` en `servicios-context.ts`.
//  - Proveer la función en `ServicioProvider`.
//  - Ubicación: `src/contexts/servicios-context.ts` (o ruta similar)

// TODO: [Utils] Implementar/Verificar `normalizeString`.
//  - Debe existir en `@/lib/utils` (o ruta similar) y estar exportada.
//  - Debe limpiar strings (quitar tildes, caracteres especiales, pasar a mayúsculas).
//  - Ubicación: `src/lib/utils.ts` (o ruta similar)

// TODO: [Servicio Page] Descomentar lógica de generación de código.
//  - Una vez implementados `getAllServicios` y `normalizeString`.
//  - Descomentar los dos bloques `useEffect` correspondientes.
//  - Ubicación: `app/configuracion/tarifas/[id]/servicio/[servicioId]/page.tsx`

// TODO: [Familias] Implementar generación automática de códigos.
//  - Crear lógica similar a la de servicios (iniciales del nombre + sufijo numérico).
//  - Necesitará obtener todos los códigos de familia existentes (modificar `family-context.ts`?).
//  - Aplicar en el formulario de creación/edición de familias.
//  - Ubicación: (Archivo de familias, p.ej., `app/configuracion/familias/...`)

// TODO: [Tipos IVA] Implementar generación automática de códigos.
//  - Crear lógica similar (basada en descripción/nombre + sufijo numérico).
//  - Necesitará obtener todos los códigos de tipos de IVA existentes (modificar `iva-context.ts`?).
//  - Aplicar en el formulario de creación/edición de tipos de IVA.
//  - Ubicación: (Archivo de tipos de IVA, p.ej., `app/configuracion/iva/...`)


// --- Persistencia de Datos / Backend --- 

// TODO: [General] Migrar persistencia de datos a Base de Datos.
//  - Reemplazar el uso actual de localStorage/mocks en los contextos (Servicios, Familias, IVA, etc.).
//  - Implementar llamadas a una API real o servicio de base de datos.
//  - Afecta a: `servicios-context.ts`, `family-context.ts`, `iva-context.ts`, `tarif-context.ts`, etc.


// --- Otras Tareas / Refactors --- 

// TODO: [Estilos Globales] Revisar y corregir estilos del anillo de foco (`focus ring`).
//  - Asegurar que las variables CSS `--ring` y `--ring-offset` estén definidas en `tailwind.config.js` o `globals.css`.
//  - El estilo debe ser coherente con el tema de la aplicación (no un borde negro por defecto).
//  - Ubicación: `tailwind.config.js`, `app/globals.css`

// TODO: [Revisar] Potenciales TODOs adicionales que hayan quedado comentados en el código.
//  - Buscar `// TODO:` o `console.warn` en el proyecto. 


// --- Habilidades Profesionales --- 

// TODO: [API] Implementar endpoints para habilidades profesionales.
//  - Crear endpoints REST para CRUD de habilidades profesionales.
//  - Incluir endpoints para obtener habilidades por usuario/empleado.
//  - Incluir endpoints para obtener habilidades por clínica.
//  - Ubicación: `app/api/habilidades/...` o similar.

// TODO: [Contexto Habilidades] Crear contexto para gestión de habilidades profesionales.
//  - Implementar un provider similar a otros contextos (ej: user-context).
//  - Incluir funciones para obtener y filtrar habilidades por diferentes criterios.
//  - Debe permitir consultas como: "¿Qué profesionales pueden realizar X servicio en Y clínica?".
//  - Ubicación: `contexts/habilidades-context.ts` o similar.

// TODO: [Base de Datos] Diseñar e implementar esquema para habilidades profesionales.
//  - Crear tabla/colección para almacenar las relaciones entre usuarios, clínicas, familias y servicios.
//  - Considerar índices para optimizar consultas frecuentes (por usuario, por clínica, por servicio).
//  - Ubicación: Esquema de base de datos / Migraciones.

// TODO: [Agenda] Integrar sistema de habilidades con el módulo de agenda.
//  - Al agendar un servicio, filtrar automáticamente los profesionales por sus habilidades.
//  - Solo mostrar profesionales que puedan realizar el servicio seleccionado.
//  - Considerar también disponibilidad horaria y clínica de trabajo.
//  - Ubicación: Componentes de agenda y reserva de citas.

// TODO: [Interfaz Usuario] Actualizar interfaz de tipo Usuario.
//  - Añadir las propiedades que faltan en la interfaz Usuario para evitar errores de tipado.
//  - Incluir campos como: dni, fechaNacimiento, sexo, telefono2, idioma, colegio, etc.
//  - Incluir campo para habilidades profesionales (con su estructura apropiada).
//  - Ubicación: `types/user.ts` o similar.

// TODO: [Interfaz Clínica] Actualizar interfaz de tipo Clínica.
//  - Añadir propiedad 'ciudad' que actualmente no existe en la interfaz.
//  - Revisar otros campos que puedan faltar para mantener consistencia.
//  - Ubicación: `types/clinic.ts` o similar.


// --- Sistema de Horarios ---

// TODO: [API] Implementar endpoints para gestión de horarios.
//  - Crear endpoints REST para CRUD de horarios de usuarios.
//  - Implementar endpoints para crear/modificar excepciones de horario.
//  - Incluir endpoints para consulta de disponibilidad en fechas específicas.
//  - Ubicación: `app/api/horarios/...` o similar.

// TODO: [Contexto Horarios] Crear contexto para gestión de horarios.
//  - Implementar funciones para obtener horarios de clínicas.
//  - Incluir funciones para comprobar si un horario está dentro del horario de una clínica.
//  - Crear métodos para verificar disponibilidad de un profesional en fechas/horas específicas.
//  - Ubicación: `contexts/horarios-context.ts` o similar.

// TODO: [Interfaz de Usuario] Implementar modal para añadir/editar franjas horarias.
//  - Crear un modal con selectores de hora de inicio y fin.
//  - Incluir validación de que la franja está dentro del horario de la clínica.
//  - Considerar implementar selectores tipo "time picker" para mejorar UX.
//  - Ubicación: En componente nuevo o como parte de la edición de usuario.

// TODO: [Interfaz de Usuario] Completar implementación de excepciones de horario.
//  - Crear formulario para añadir nuevas excepciones (nombre, fechas, horarios).
//  - Implementar vista detallada para modificar horarios dentro de la excepción.
//  - Desarrollar funcionalidad de edición de excepciones existentes.
//  - Ubicación: En componente nuevo o como parte de la edición de usuario.

// TODO: [Vista Calendario] Implementar vista de calendario para horarios.
//  - Crear visualización tipo calendario que muestre horarios normales y excepciones.
//  - Permitir navegación entre meses y días.
//  - Usar colores distintos para diferenciar horarios regulares y excepciones.
//  - Ubicación: Nueva sub-pestaña dentro de la sección de horarios.

// TODO: [Base de Datos] Diseñar e implementar esquema para horarios.
//  - Crear tablas/colecciones para almacenar horarios semanales y excepciones.
//  - Considerar optimización para consultas de disponibilidad rápidas.
//  - Implementar relaciones adecuadas con usuarios y clínicas.
//  - Ubicación: Esquema de base de datos / Migraciones.

// TODO: [Integración] Vincular sistema de horarios con la agenda.
//  - Al agendar un servicio, filtrar horas disponibles según horario del profesional.
//  - Considerar excepciones de horario al mostrar disponibilidad.
//  - Resperar horarios de clínicas al mostrar disponibilidad de profesionales.
//  - Ubicación: Componentes de agenda y reserva de citas. 