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