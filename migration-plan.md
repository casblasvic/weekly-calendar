# Plan de Migración Arquitectónica

## Objetivo
Migrar la arquitectura de la aplicación para seguir un patrón coherente donde:
1. Cada contexto especializado use exclusivamente la interfaz centralizada para acceder a datos
2. Los componentes usen exclusivamente los contextos especializados
3. Eliminar todas las referencias directas a datos locales (mockData)

## Principios Clave
1. La interfaz (`interfaz-Context`) actúa como la capa de abstracción única para todas las operaciones de datos
2. Los contextos especializados exponen APIs específicas para cada dominio
3. Los componentes consumen solo los contextos especializados, nunca la interfaz directamente
4. Todo acceso a datos pasa por la interfaz, que decide si usar datos locales o remotos

## Contextos Migrados y Pendientes
1. ✅ iva-context.tsx (migrado)
2. ✅ family-context.tsx (migrado)
3. ✅ image-context.tsx (migrado y armonizado)
4. ✅ document-context.tsx (migrado)
5. ✅ servicios-context.tsx (migrado)
6. ✅ tarif-context.tsx (migrado)
7. ✅ clinic-context.tsx (migrado)
8. ✅ client-context.tsx (migrado)
9. ✅ file-context.tsx (migrado)
10. ✅ storage-context.tsx (migrado)
11. ✅ schedule-templates-context.tsx (migrado)
12. ✅ equipment-context.tsx (migrado y armonizado)
13. ✅ producto-contexto.tsx (migrado)
14. ✅ consumo-servicio-context.tsx (migrado)
15. ✅ schedule-blocks-context.tsx (migrado - nuevo)
16. ✅ CabinContext.tsx (migrado)

## Componentes a Migrar
Los siguientes componentes acceden directamente a la interfaz centralizada y deben migrar a usar contextos especializados:

1. ✅ components/clinic-selector.tsx (migrado)
2. ✅ components/block-schedule-modal.tsx (migrado)
3. ✅ components/weekly-view.tsx (migrado)
4. ✅ components/cabin-configuration.tsx (migrado)
5. ✅ components/image-uploader.tsx (migrado)
6. ✅ components/weekly-agenda.tsx (migrado)
7. ✅ components/storage/storage-quota-settings.tsx (migrado)
8. ✅ components/storage/files-explorer.tsx (migrado)
9. ✅ components/storage/enhanced-files-table.tsx (migrado)
10. ✅ components/week-view.tsx (migrado)
11. ✅ components/day-view.tsx (migrado)
12. ✅ app/configuracion/clinicas/[id]/page.tsx (migrado)
13. ✅ app/configuracion/clinicas/[id]/equipamiento/[deviceId]/page.tsx (migrado)
14. ✅ app/configuracion/clinicas/[id]/datos/layout.tsx (migrado)
15. ✅ app/configuracion/clinicas/[id]/almacenamiento/page.tsx (migrado y corregido)
16. ✅ app/configuracion/tarifas/[id]/page.tsx (migrado)
17. ✅ app/configuracion/almacenamiento/configuracion/page.tsx (migrado y corregido)
18. ✅ app/configuracion/equipamiento/page.tsx (migrado y corregido)
19. ✅ app/configuracion/clinicas/[id]/equipamiento/page.tsx (migrado y corregido)

## Proceso de Migración para cada Contexto
1. **Importar tipos del modelo central**:
```typescript
import { TipoRelevante } from "@/services/data/models/interfaces";
export type TipoLocal = TipoRelevante;
```

2. **Usar la interfaz para todas las operaciones de datos**:
```typescript
const interfaz = useInterfaz();

// Ejemplo
useEffect(() => {
  const fetchData = async () => {
    if (interfaz.initialized && !dataFetched) {
      try {
        const data = await interfaz.getRelevantData();
        setLocalData(data);
        setDataFetched(true);
      } catch (error) {
        console.error("Error al cargar datos:", error);
      }
    }
  };
  
  fetchData();
}, [interfaz.initialized, dataFetched]);
```

3. **Garantizar manejo adecuado de estados y errores**:
```typescript
const someOperation = async (id: string): Promise<ResultType> => {
  try {
    const result = await interfaz.relevantOperation(id);
    if (result) {
      // Actualizar estado local
      setLocalData(prev => prev.map(item => 
        item.id === id ? { ...item, ...result } : item
      ));
      return result;
    } else {
      throw new Error("Operación no pudo completarse");
    }
  } catch (error) {
    console.error("Error en la operación:", error);
    throw error; // Propagar el error para manejo en componentes
  }
};
```

## Proceso de Migración para Componentes
1. **Eliminar importaciones directas de la interfaz**:
```typescript
// ANTES
import { useInterfaz } from "@/contexts/interfaz-Context";

// DESPUÉS
import { useContextoEspecializado } from "@/contexts/contexto-especializado";
```

2. **Usar solo métodos de contextos especializados**:
```typescript
// ANTES
const interfaz = useInterfaz();
const data = await interfaz.getSpecificData();

// DESPUÉS
const { getSpecificData } = useContextoEspecializado();
const data = await getSpecificData();
```

## Próximos Pasos
1. **Completar la consistencia de tipos**: 
   - Revisar todas las interfaces para garantizar que todas las propiedades ID sean del mismo tipo (preferiblemente string)
   - Actualizar las firmas de métodos para que acepten el mismo tipo de ID en toda la aplicación
   - Validar que los datos manipulados por los contextos especializados cumplan exactamente con los tipos definidos

2. **Realizar una revisión exhaustiva de errores de inicialización**:
   - Auditar los servicios para identificar variables utilizadas antes de ser inicializadas
   - Implementar un patrón coherente para la inicialización de datos de ejemplo
   - Añadir validaciones para prevenir errores similares en el futuro

3. **Implementar pruebas automatizadas**:
   - Crear pruebas unitarias para cada contexto especializado
   - Incluir pruebas específicas para validar la correcta inicialización y tipos de datos
   - Automatizar la verificación de consistencia de tipos entre contextos

## Impacto de la Corrección de Errores
La corrección de las variables no definidas (currentYear, currentMonth, currentDate) en `local-data-service.ts` ha resuelto un error crítico que impedía la correcta inicialización de la aplicación. Este tipo de errores, aunque aparentemente simples, ilustra la importancia de:

1. **Validación estática de código**: Configurar herramientas como ESLint con reglas estrictas para detectar variables no declaradas
2. **Revisión de inicialización**: Garantizar que la capa de datos tenga una inicialización adecuada antes de ser utilizada
3. **Coherencia en la manipulación de datos**: Implementar patrones consistentes para la creación y manipulación de datos

Estos problemas son particularmente relevantes en el contexto de nuestra migración arquitectónica, ya que resaltan la necesidad de una capa de abstracción robusta y bien tipada.

## Problemas Pendientes
1. ⚠️ Inconsistencia en las APIs de los contextos especializados que aún no se han armonizado
2. ⚠️ Algunos contextos no exportan los mismos tipos que utilizan internamente
3. ⚠️ Verificar consistencia de tipos en métodos de consulta (algunos métodos aceptan 'number' y otros 'string' para IDs)

## Recomendaciones para el Futuro
1. **Estandarizar APIs de contextos**: Definir un patrón común para todos los contextos especializados:
   - Prefijos claros para los métodos (get, update, delete, create)
   - Convención de nombres consistente en español vs inglés
   - Manejo de errores unificado
2. **Documentar contextos**: Añadir JSDoc a cada método exportado para mejorar la autocompletación
3. **Automatizar pruebas**: Crear pruebas unitarias para cada contexto especializado
4. **Revisar rendimiento**: Analizar si la arquitectura de contextos anidados puede causar re-renderizados innecesarios
5. **Estandarizar tipos de datos**: Utilizar tipos consistentes para IDs y referencias entre entidades (siempre string o siempre number)

## Beneficios de la Migración Completa
1. **Mejor separación de responsabilidades**: Cada contexto maneja exclusivamente su dominio
2. **Código más mantenible**: Cambios en la capa de datos solo afectan a la interfaz
3. **Mayor flexibilidad**: Facilita cambiar entre implementaciones locales o remotas
4. **Mejor manejo de errores**: Implementación consistente de recuperación y fallbacks
5. **Sistema más robusto**: Los componentes no dependen de detalles de implementación de datos

## Verificación de Cumplimiento
Para cada contexto y componente migrado:
1. ✅ ¿El contexto utiliza exclusivamente la interfaz para datos?
2. ✅ ¿Los componentes usan exclusivamente los contextos especializados?
3. ✅ ¿Se han eliminado todas las referencias directas a mockData?
4. ✅ ¿El manejo de errores es adecuado y consistente?
5. ✅ ¿Los tipos de datos son coherentes entre contextos?

## Problemas Resueltos
1. ✅ Conversión adecuada de Promises a valores en componentes:
   - Se ha implementado un patrón basado en `useEffect` + estados locales para manejar las respuestas asíncronas de los contextos
   - Se han evitado las llamadas directas a métodos asíncronos sin await, usando funciones asíncronas dentro de useEffect
   - Se ha mejorado el manejo de errores en operaciones asíncronas

2. ✅ Armonización de APIs en contextos especializados:
   - Se han agregado alias para métodos con nombres inconsistentes (getEntityImages/getImagesByEntity)
   - Se han implementado métodos faltantes en contexto de equipment (getEquiposByClinicaId, createEquipo)
   - Se han corregido tipos incorrectos o faltantes (ExtendedImageFile, EquipoWithImages)

3. ✅ Corrección de errores de tiempo de ejecución:
   - Se ha armonizado el uso de nombres de métodos y propiedades en el contexto de equipment (allEquipment → allEquipos)
   - Se ha mejorado la gestión de nulos en propiedades de objetos para evitar operaciones sobre undefined
   - Se han corregido tipos de parámetros que no coincidían (id: number → id: string)

4. ✅ Integración de datos de ejemplo:
   - Se han creado datos de ejemplo para clínicas con configuraciones completas
   - Se han creado datos de ejemplo para equipamiento asociado a las clínicas
   - Se ha asegurado que los datos de ejemplo cumplan con los tipos definidos en las interfaces

5. ✅ Corrección de variables no definidas:
   - Se ha solucionado un error en `local-data-service.ts` donde las variables `currentYear`, `currentMonth` y `currentDate` se utilizaban sin declaración previa
   - Se ha definido estas variables antes de su uso en la inicialización de datos de clientes
   - Este error causaba problemas al intentar crear fechas para las visitas de los clientes

## Conclusiones y Estado Actual

La migración arquitectónica ha avanzado significativamente, logrando implementar la mayoría de los componentes y contextos planificados. La nueva arquitectura proporciona una separación clara de responsabilidades y mejora la mantenibilidad del código. Sin embargo, todavía existen áreas de mejora:

1. **Estandarización completa**: Se ha logrado gran parte de la estandarización de APIs y patrones, pero aún quedan inconsistencias por resolver.

2. **Calidad del código**: Se han corregido errores críticos como variables no definidas y problemas de tipado, pero se requiere una revisión más exhaustiva.

3. **Documentación**: Es necesario mejorar la documentación de los contextos y sus APIs para facilitar su uso por parte del equipo.

4. **Pruebas**: La implementación de pruebas unitarias y de integración es una prioridad para garantizar la estabilidad de la aplicación.

### Próximos Pasos Inmediatos

1. Corregir las inconsistencias de tipos en interfaces y métodos
2. Completar la documentación de los contextos especializados
3. Implementar pruebas automatizadas
4. Realizar una revisión de rendimiento

Con estas mejoras, la arquitectura estará lista para escalar y mantener a largo plazo, facilitando la incorporación de nuevas características y la corrección de errores existentes.