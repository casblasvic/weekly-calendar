---
description: Como implementar las traducciones
---

Esta es una guia de como se configuran las traducciones. 


**Guía Detallada para Traducciones (i18n) con `react-i18next`**

**1. Archivos Clave:**

*   **Configuración (`lib/i18n-config.ts`):** Define cómo se inicializa y comporta `i18next`. Es el cerebro de la traducción.
*   **Archivos de Idioma (`locales/es.json`, `locales/en.json`, etc.):** Contienen las claves y sus traducciones correspondientes para cada idioma soportado.

**2. Configuración Actual (`lib/i18n-config.ts`) - La Base Estable**

Nuestra configuración actual y **recomendada** para tu proyecto es la siguiente:

```typescript
// lib/i18n-config.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Importar los archivos de traducción JSON
import esTranslations from '../locales/es.json';
import enTranslations from '../locales/en.json';
import frTranslations from '../locales/fr.json';

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      debug: process.env.NODE_ENV === 'development',
      fallbackLng: 'es', // Idioma por defecto si falta una traducción
      interpolation: {
        escapeValue: false, // React ya lo hace
      },
      // <<< --- PUNTO CLAVE --- >>>
      resources: {
        es: {
          // Carga TODO el contenido de es.json bajo el namespace "translation"
          translation: esTranslations, 
        },
        en: {
          translation: enTranslations,
        },
        fr: {
          translation: frTranslations,
        },
      },
      // <<< --- FIN PUNTO CLAVE --- >>>
      // No necesitamos defaultNS con esta estructura
    });
}

export default i18n;
```

**¿Qué significa esto?**

*   `resources`: Define qué traducciones cargar.
*   `es: { translation: esTranslations }`: Le dice a `i18next` que para el idioma español (`es`), cargue **todo** el contenido del archivo `es.json` (importado como `esTranslations`) dentro de un *único* contenedor (namespace) llamado `"translation"`. Este es el namespace **por defecto** que `i18next` usará si no le indicamos otro.
*   **Ventaja:** Es la forma más simple y compatible con el uso más común de `useTranslation()`. Todos los componentes acceden al mismo "diccionario" grande.

**3. Estructura del Archivo de Traducciones (`locales/es.json`)**

Tu archivo `es.json` organiza las traducciones usando objetos anidados. **Con la configuración actual, estas claves de nivel superior (`common`, `promotions`, `sidebar`, etc.) NO son namespaces separados, sino simplemente "grupos" dentro del gran namespace `"translation"`.**

```json
// locales/es.json
{
  "common": { // Grupo "common"
    "loading": "Cargando...",
    "save": "Guardar",
    "cancel": "Volver",
    "actions": "Acciones",
    // ... otras claves comunes
  },
  "sidebar": { // Grupo "sidebar"
    "dashboard": "Inicio",
    "calendar": "Agenda",
    // ...
  },
  "promotions": { // Grupo "promotions"
    "title": "Promociones",
    "page_title": "Promociones",
    "promotion_singular": "Promoción",
    "table": { // Subgrupo dentro de "promotions"
      "name": "Nombre",
      "code": "Código",
      // ...
    },
    // ...
  },
  "enums": { // Grupo "enums"
    "PromotionType": { // Subgrupo
        "PERCENTAGE_DISCOUNT": "Descuento Porcentual",
        // ...
    }
    // ...
  }
  // ... otros grupos ...
}
```

**Reglas Importantes para JSON:**

*   Debe ser un objeto JSON válido.
*   **NO** uses comentarios (`//` o `/* */`).
*   Las claves y los strings deben ir entre comillas dobles (`"`).
*   Coma (`,`) al final de cada par clave-valor, excepto el último dentro de un objeto.

**4. Uso en Componentes React (`useTranslation`)**

La forma estándar y **recomendada** para acceder a las traducciones en tus componentes es:

```typescript
import React from 'react';
import { useTranslation } from 'react-i18next';

function MiComponente() {
  // 1. Llama a useTranslation SIN argumentos.
  //    Esto le dice que use el namespace por defecto ("translation").
  const { t } = useTranslation();

  return (
    <div>
      {/* 2. Usa la función `t` con la CLAVE COMPLETA usando puntos */}
      {/*    para navegar por la estructura de tu JSON. */}

      {/* Accede a common.save */}
      <button>{t('common.save')}</button>

      {/* Accede a promotions.page_title */}
      <h1>{t('promotions.page_title')}</h1>

      {/* Accede a promotions.table.name */}
      <th>{t('promotions.table.name')}</th>
      
      {/* Accede a sidebar.dashboard */}
      <p>{t('sidebar.dashboard')}</p>

      {/* Accede a enums.PromotionType.PERCENTAGE_DISCOUNT */}
      <span>{t('enums.PromotionType.PERCENTAGE_DISCOUNT')}</span>
    </div>
  );
}
```

**Resumen del Uso en Componentes:**

*   **Importa `useTranslation`:** `import { useTranslation } from 'react-i18next';`
*   **Llama al Hook:** `const { t } = useTranslation();` (¡Sin argumentos!)
*   **Usa la Función `t`:** Llama a `t()` con la clave completa, usando **puntos (`.`)** para representar la jerarquía de tu archivo JSON. `t('grupo.subgrupo.clave')`.

**¿Por Qué NO Especificar Namespaces en `useTranslation` (con esta configuración)?**

*   Como todo está cargado en `"translation"`, no necesitas especificar `useTranslation(['promotions', 'common'])`.
*   Si lo hicieras, `i18next` buscaría namespaces *separados* llamados "promotions" y "common", que *no existen* en la configuración actual, y volverías a tener errores `missingKey`.

**5. Formateo, Plurales y Otras Funcionalidades**

`i18next` es muy potente:

*   **Interpolación:** Puedes pasar variables a tus traducciones:
    ```json
    // es.json
    "common": {
      "welcome": "Bienvenido, {{userName}}!"
    }
    ```
    ```typescript
  