---
description: Precauciones y notas generales del desarrollo 
---

Precauciones Completas (Actualizadas):
Usa siempre el mcp Context7 para tener actalizada toda la coumentacion de NextJs de shadcn etc usando use context7 usa tambien sequential-thinking y si es necesario usa browser-tools para revisar errores
Aquí está la lista consolidada de precauciones y principios que guiaremos nuestro trabajo:
Micro-Pasos: Realizar cambios pequeños, enfocados y bien definidos en cada paso.
Validación Continua: Requerir tu confirmación explícita ("OK", "Procede", "Adelante") antes de aplicar cambios significativos en el schema Prisma o lógica compleja.
Prisma Schema como Fuente de Verdad: Todas las definiciones de modelos de datos y relaciones deben residir y validarse primero en prisma/schema.prisma.
Tipado Estricto: Utilizar TypeScript rigurosamente para detectar errores en tiempo de compilación y mejorar la mantenibilidad.
Seguridad API:
Autenticación requerida en endpoints sensibles.
Autorización basada en SystemId en todas las queries/mutaciones para asegurar aislamiento de datos.
Validación estricta de entradas (payloads) usando Zod en los endpoints de la API.
Internacionalización (i18n): Utilizar el sistema react-i18next y las claves definidas en locales/*.json para todos los textos visibles por el usuario en la UI.
Ediciones Atómicas de Código: Realizar modificaciones precisas y mínimas en los archivos al aplicar cambios, usando comentarios // ... existing code ... si es necesario.
Manejo de Linter: Ejecutar el linter (implícita o explícitamente) después de las ediciones y corregir cualquier error o advertencia introducida inmediatamente. No dejar errores de linter pendientes.
Migraciones Prisma: Ejecutar prisma migrate dev (para crear/actualizar migraciones SQL) y prisma generate (para actualizar Prisma Client) después de cada cambio validado y aplicado en prisma/schema.prisma.
Foreign Keys (FKs) / Índices: Definir cuidadosamente las relaciones, las reglas onDelete/onUpdate, y añadir índices (@@index) explícitos en las FKs y campos frecuentemente consultados. Realizar una revisión final antes de considerar completa la fase de schema.
Seed File (prisma/seed.ts): Verificar si los cambios en el schema (campos obligatorios, relaciones nuevas/modificadas) requieren ajustes en el archivo de seed para evitar errores durante el sembrado. Proponer y validar estos ajustes contigo.
No Asumir Existencia: Verificar siempre que las variables, funciones, datos o elementos de UI referenciados existan y estén disponibles en el contexto actual antes de intentar usarlos.
Limpieza de Código (ts-prune): Planificar una fase posterior (FLC.5) dedicada a ejecutar ts-prune, revisar sus resultados y eliminar código (exportaciones, funciones, tipos, componentes) no utilizado de forma segura y validada.
Securizacion de las apis , se obtiene el systemId de la sesion securizada con getServerAuthSession de lib/auth.ts
Recuerda ejecutar tu los comandos por terminal para que puedas seguir la traza
Revisa siempre el esquema de base de datos @schema.prisma y el archivo seed si hay que actualizar algo @seed.ts
Estamos usando shadcn-ui  y radix-ui  por lo que intenta usar siempre componenetes ya creados que nos ayudara al manteniemiento futuro de la apicacion por ejemplo las tablas usamos dataTable , manten siempre en las tablas el boton para configruar las columnas que se quieren mostrar , configura siepre onhover esteticos en lastablas segun los colores globales definidos.
Lo sbotones de creacion denuevos elmenetos siempre se ponene abajo a la derecha y fijos y encima la tabla que muestra los elementos disposnible s, siempre añadiras a la izquierda del boton un volver que vuelve a la pagina de la que se vienen navegando anterior y ala derecha el boton ayuda que configuraremos en el futuro los botone ssiempre fijos en el footer del contenedor principal sin sobrepasar la barra lateral @main-sidebar.tsx

Esta instalda la libreria @tanstack/react-query para gestion de datos asincronos
usamos los componentes importados en @components/ui/ no lo olvides para evitar duplicidades , instala los componenetes que se necesiten globalmente en esta ruta y verifica siempre antes i alguno ya esta instalado.

En las navegacines no usamos breadCrumbs si estan presentes elimnalos usamos la navegacion sin breadcrumbs

Todos los diseños deben de ser resonsivos
las paginas que se habran en los contextos principales deben de estar bien ajustados no a todo el ancho del contenedor principal de la derecha sino correctamente ajustado.

Skeleton : implementa siempre skeletons para cuando se espera que se cargue una pagina mostrando un diseño similar al que va a ser mostrado , 
implementa skeleton a nivel de componente si una pagina tiene varios componenetes y puede darse el caso de que unos carguen antes que otros se mostrara un skeleton en cada componenete qu etenga un async 

Formularios : cuando haya qu ehacer formularios utiliza la misma estructura que la que hasusado en app/(main)/configuracion/promociones/nuevo/page.tsx y en paquetes app/(main)/configuracion/paquetes/nuevo/page.tsx

JSON: cuidado no aadir comentarios en archivos JSON qu egenera muchos problemas . 
un dato en cuanto al uso de prisma : prisma/schema.prisma: Es el archivo de definición del modelo, como sabemos.
lib/db.ts: Este es el archivo crucial donde exportas la instancia de PrismaClient (export const prisma = ...).
Cuidado que A partir de Next.js 14 (App Router), el objeto params que recibe un Route Handler en una ruta dinámica ya no se entrega al instante: se convierte en una promesa que Next resuelve cuando dispone de la información completa del segmento.