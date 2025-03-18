# Estructura del Proyecto

Este proyecto está diseñado para ser completamente responsivo y accesible, adaptándose a diferentes tamaños de pantalla (móvil, tablet y escritorio) mientras mantiene una funcionalidad consistente.

## Separación de Estilos y Lógica

Hemos separado la estética de la funcionalidad para facilitar el mantenimiento y la adaptabilidad del proyecto:

1. **Lógica de Negocio**: 
   - La lógica principal de la aplicación se mantiene constante en todas las versiones.
   - Los servicios, hooks y utilidades son compartidos entre versiones.
   - Las interfaces y tipos son reutilizados para garantizar consistencia.

2. **Estilos y Presentación**: 
   - **Versión Móvil**: 
     - Utiliza componentes específicos en `/components/mobile-views/`
     - Implementa `MobileBottomSheet` para diálogos y formularios
     - Diseño optimizado para pantallas táctiles
   - **Versión Tablet**: 
     - Hereda de la versión móvil o escritorio según el contexto
     - Adaptaciones específicas para tamaños intermedios
   - **Versión Escritorio**: 
     - Componentes base en `/components/`
     - Utiliza diálogos modales y layouts más amplios
     - Optimizado para uso con teclado y ratón

## Estructura de Carpetas

