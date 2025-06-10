# Propuesta de Sistema de Mapeo Contable Exhaustivo

## 1. Estructura General del Sistema de Mapeo

### 1.1 Principios Fundamentales

1. **Mapeo Base Único por Sociedad**: Cada elemento (servicio, producto, etc.) tiene UN mapeo base a nivel de sociedad
2. **Subcuentas Automáticas**: Se generan automáticamente para análisis detallado
3. **Compatibilidad Multi-PGC**: Un flujo lógico adaptable a España, Francia, Marruecos, México
4. **Trazabilidad Total**: Cada movimiento contable debe ser rastreable hasta su origen

### 1.2 Niveles de Análisis Contable

```
Cuenta Principal (3 dígitos) → Subcuenta Tipo (4-5 dígitos) → Subcuenta Analítica (6+ dígitos)
    700 (Ventas)                 7001 (Servicios)              700101 (Servicios Médicos Madrid)
                                 7002 (Productos)              700201 (Productos Cosmética Barcelona)
```

## 2. Lógica de Mapeo por Tipo de Operación

### 2.1 VENTAS (Facturas de Venta)

#### Servicios
```
Base: 705 (España) / 706 (Francia) / 712 (Marruecos) / 400 (México)
Subcuentas automáticas:
- Por categoría: 7051XX (XX = código categoría)
- Por clínica: 70510X (X = código clínica)
- Por tipo servicio:
  * 705101 - Servicios médicos con prescripción
  * 705102 - Servicios estéticos sin prescripción
  * 705103 - Servicios diagnóstico
  * 705104 - Servicios quirúrgicos
```

#### Productos
```
Base: 701 (España) / 707 (Francia) / 711 (Marruecos) / 401 (México)
Subcuentas automáticas:
- Por categoría producto:
  * 701001 - Productos farmacéuticos
  * 701002 - Productos cosmética
  * 701003 - Material sanitario venta
  * 701004 - Productos nutricionales
- Por marca/proveedor: 7010XX1 (XX = código proveedor)
- Por clínica: 701XXXY (Y = código clínica)
```

### 2.2 COMPRAS (Futuras Facturas de Proveedores)

#### Productos de Compra/Consumo
```
Base: 600 (España) / 601 (Francia) / 611 (Marruecos) / 500 (México)
Subcuentas automáticas:
- Por tipo producto:
  * 600001 - Material sanitario consumible
  * 600002 - Productos inyectables
  * 600003 - Material quirúrgico
  * 600004 - Productos limpieza/desinfección
- Por proveedor: 6000XX (XX = código proveedor)
- Por centro consumo: 600XXXY (Y = código clínica)
```

#### Servicios Externos
```
Base: 620 (España) / 622 (Francia) / 613 (Marruecos) / 520 (México)
Subcuentas:
- 621001 - Servicios profesionales médicos externos
- 621002 - Laboratorios externos
- 621003 - Mantenimiento equipos médicos
```

### 2.3 COBROS (Métodos de Pago)

```
Mapeo actual mejorado con subcuentas:
- CASH: 570 → 570001 (Caja clínica 1), 570002 (Caja clínica 2)
- CARD: 572 → 572001 (TPV 1), 572002 (TPV 2), 572003 (Pagos online)
- BANK_TRANSFER: 572 → 572100 (Transferencias nacionales), 572200 (SEPA)
- DEFERRED_PAYMENT: 430 → 430001 (Clientes 30 días), 430002 (Clientes 60 días)
- FINANCING: 170 → 170001 (Financiera A), 170002 (Financiera B)
```

### 2.4 IVA/IMPUESTOS

```
Estructura de subcuentas para IVA:
- 477000 - IVA repercutido general
  * 477001 - IVA repercutido 21%
  * 477002 - IVA repercutido 10%
  * 477003 - IVA repercutido 4%
  * 477004 - IVA repercutido exento
- 472000 - IVA soportado general
  * 472001 - IVA soportado 21%
  * 472002 - IVA soportado 10%
```

## 3. Uso de Categorías para Generación de Subcuentas

### 3.1 Mapeo Automático por Categoría

```javascript
// Ejemplo de lógica mejorada
const CATEGORY_SUBCUENTA_RULES = {
  // Servicios médicos
  'CONSULTA_MEDICA': {
    subcuentaSuffix: '01',
    requiereAnalisis: ['medico', 'especialidad', 'duracion']
  },
  'CIRUGIA': {
    subcuentaSuffix: '02',
    requiereAnalisis: ['cirujano', 'quirofano', 'complejidad']
  },
  'TRATAMIENTO_ESTETICO': {
    subcuentaSuffix: '03',
    requiereAnalisis: ['tipo_tratamiento', 'zona_corporal']
  },
  
  // Productos
  'FARMACIA': {
    subcuentaSuffix: '11',
    requiereAnalisis: ['tipo_medicamento', 'prescripcion']
  },
  'COSMETICA': {
    subcuentaSuffix: '12',
    requiereAnalisis: ['marca', 'linea_producto']
  }
};
```

### 3.2 Generación Dinámica de Subcuentas

```
Cuenta Base (705) + Categoría (01) + Clínica (1) + Análisis (01) = 70501101
                                                    └─ Subcategoría específica
```

## 4. Análisis Contable Exhaustivo

### 4.1 Dimensiones de Análisis

1. **Por Centro de Coste** (Clínica/Departamento)
2. **Por Línea de Negocio** (Médico/Estético/Productos)
3. **Por Profesional** (Doctor/Terapeuta)
4. **Por Tipo de Cliente** (Particular/Aseguradora/Empresa)
5. **Por Canal de Venta** (Presencial/Online/Telefónico)
6. **Por Campaña/Promoción**
7. **Por Franja Horaria** (Mañana/Tarde/Urgencias)

### 4.2 KPIs Automáticos por Subcuenta

- **Rentabilidad por servicio/producto**
- **Margen por categoría**
- **Rotación de inventario** (productos)
- **Productividad por profesional**
- **Análisis ABC de servicios/productos**
- **Estacionalidad por línea de negocio**

## 5. Implementación Técnica Propuesta

### 5.1 Estructura de Datos Mejorada

```typescript
interface AccountingMapping {
  // Mapeo base
  baseAccountId: string;
  baseAccountCode: string;
  
  // Subcuentas automáticas
  subaccounts: {
    analytic: {
      clinicCode?: string;      // 01, 02, 03...
      categoryCode?: string;    // 001, 002, 003...
      subcategoryCode?: string; // 0001, 0002...
    };
    
    // Metadatos para análisis
    dimensions: {
      costCenter?: string;
      businessLine?: string;
      professional?: string;
      customerType?: string;
      salesChannel?: string;
    };
  };
  
  // Reglas de generación
  rules: {
    autoCreateSubaccount: boolean;
    subaccountPattern: string; // ej: "{base}{category}{clinic}"
    analyticsRequired: string[];
  };
}
```

### 5.2 Flujo de Mapeo Mejorado

```
Elemento a Mapear
    ↓
Identificar Tipo (Servicio/Producto/Pago)
    ↓
Obtener Categoría/Características
    ↓
Aplicar Mapeo Base según PGC
    ↓
Generar Subcuenta Automática
    ↓
Añadir Dimensiones Analíticas
    ↓
Guardar Mapeo Completo
    ↓
Disponible para Asientos Contables
```

## 6. Mejoras sobre Sistema Actual

### Cambios Necesarios:

1. **Añadir campo `subcuentaPattern` en `LegalEntity`**
   - Permite personalizar formato subcuentas por sociedad
   
2. **Crear tabla `AccountingDimensions`**
   - Almacena dimensiones analíticas configurables

3. **Extender `AccountMapping` tables**
   - Añadir campos para subcuentas y dimensiones

4. **API de generación de subcuentas**
   - Endpoint que genera subcuentas según reglas

5. **Vista de análisis multidimensional**
   - Dashboard con análisis por todas las dimensiones

### Ventajas:

- ✅ Análisis exhaustivo sin configuración manual
- ✅ Compatible con múltiples PGCs
- ✅ Escalable para nuevas dimensiones
- ✅ Trazabilidad completa
- ✅ Preparado para BI/Analytics
- ✅ Facilita auditorías
- ✅ Optimiza gestión de inventario
- ✅ Permite análisis de rentabilidad real

## 7. Casos de Uso Específicos

### 7.1 Reaprovisionamiento Automático
- Las subcuentas de productos permiten:
  - Análisis de consumo por clínica
  - Predicción de necesidades
  - Alertas de stock mínimo
  - Optimización de pedidos

### 7.2 Análisis de Rentabilidad
- Cruce automático de:
  - Ingresos por servicio/producto
  - Costes directos (materiales)
  - Costes indirectos (tiempo profesional)
  - Margen real por tratamiento

### 7.3 Control de Desviaciones
- Comparativa automática:
  - Presupuesto vs Real por subcuenta
  - Alertas de desviación
  - Análisis de tendencias

## 8. Configuración por País

### España (PGC)
```
Ventas Servicios: 705.XX.YY
Ventas Productos: 701.XX.YY
Compras: 600.XX.YY
```

### Francia (PCG)
```
Ventas Servicios: 706.XX.YY
Ventas Productos: 707.XX.YY
Compras: 601.XX.YY
```

### Marruecos (CGNC)
```
Ventas Servicios: 712.4X.YY
Ventas Productos: 711.1X.YY
Compras: 611.XX.YY
```

### México (NIF)
```
Ventas Servicios: 400.XX.YY
Ventas Productos: 401.XX.YY
Compras: 500.XX.YY
```

## 9. Próximos Pasos

1. **Fase 1**: Implementar generación automática de subcuentas
2. **Fase 2**: Añadir dimensiones analíticas
3. **Fase 3**: Dashboard de análisis
4. **Fase 4**: Integración con BI tools
5. **Fase 5**: Machine Learning para sugerencias

Esta propuesta permite un análisis contable exhaustivo manteniendo la simplicidad de configuración para el usuario.
