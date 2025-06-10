---
description: Cómo implementar traducciones de ayuda y guías explicativas
---

# Sistema de Traducciones de Ayuda

## Estructura de Archivos

1. Los archivos de traducciones de ayuda se ubican en:
   ```
   /locales/ayuda/[módulo]/[archivo].json
   ```

2. Formato del archivo JSON:
   ```json
   {
     "es": {
       "title": "Título en español",
       "sections": {...}
     },
     "en": {
       "title": "Title in English",
       "sections": {...}
     }
   }
   ```

## Cómo Usar el Hook

1. Importar el hook:
   ```typescript
   import { useHelpTranslations } from '@/hooks/useHelpTranslations';
   ```

2. Usar en el componente:
   ```typescript
   const { translations: helpText, loading: helpLoading } = useHelpTranslations('contabilidad/mapeo_help');
   ```

3. Renderizar textos:
   ```typescript
   <h2>{helpText.title}</h2>
   <p>{helpText.description}</p>
   ```

## Añadir Nuevas Traducciones

1. Crear carpeta si no existe:
   ```bash
   mkdir -p locales/ayuda/[módulo]
   ```

2. Crear archivo JSON con estructura multiidioma

3. Usar el hook en el componente correspondiente

## Convenciones

- Usar claves descriptivas en inglés
- Agrupar textos relacionados en objetos
- Incluir siempre español como idioma base
- Mantener consistencia en la estructura
