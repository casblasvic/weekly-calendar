# Cuentas Contables Requeridas para Mapeo Automático

## 🇪🇸 ESPAÑA (ES)

### Cuentas Obligatorias Base
| Cuenta | Nombre | Uso en Mapeo |
|--------|--------|--------------|
| **705** | Prestaciones de servicios | → Servicios |
| **700** | Ventas de mercaderías | → Productos |
| **600** | Compras de mercaderías | → Productos consumibles |
| **570** | Caja | → Métodos de pago efectivo |
| **572** | Bancos | → Métodos de pago tarjeta/transferencia |
| **665** | Descuentos sobre ventas por pronto pago | → Promociones y descuentos |
| **472** | IVA soportado | → Tipos de IVA (compras) |
| **477** | IVA repercutido | → Tipos de IVA (ventas) |

### Mapeos Automáticos por Tipo
- **Servicios**: Se crean subcuentas bajo 705
- **Productos**: Se crean subcuentas bajo 700 o 600 (según tipo)
- **Categorías**: Usa 705 o 700 según contenido
- **Métodos de pago**: Subcuentas bajo 570 (efectivo) o 572 (otros)
- **Cajas**: Cuenta base 570
- **Bancos**: Se crean subcuentas bajo 572

---

## 🇫🇷 FRANCIA (FR)

### Cuentas Obligatorias Base
| Cuenta | Nombre | Uso en Mapeo |
|--------|--------|--------------|
| **706** | Prestations de services | → Servicios |
| **707** | Ventes de marchandises | → Productos |
| **607** | Achats de marchandises | → Productos consumibles |
| **530** | Caisse | → Métodos de pago efectivo |
| **512** | Banques | → Métodos de pago tarjeta/transferencia |
| **709** | Rabais, remises et ristournes accordés | → Promociones y descuentos |
| **44566** | TVA déductible | → Tipos de IVA (compras) |
| **44571** | TVA collectée | → Tipos de IVA (ventas) |

---

## 🇲🇦 MARRUECOS (MA)

### Cuentas Obligatorias Base
| Cuenta | Nombre | Uso en Mapeo |
|--------|--------|--------------|
| **712** | Production vendue - services | → Servicios |
| **711** | Ventes de marchandises | → Productos |
| **611** | Achats revendus de marchandises | → Productos consumibles |
| **516** | Caisses | → Métodos de pago efectivo |
| **514** | Banques | → Métodos de pago tarjeta/transferencia |
| **7129** ⚠️ | Rabais, remises et ristournes accordés | → Promociones y descuentos |
| **3455** | État - TVA récupérable | → Tipos de IVA (compras) |
| **4455** | État - TVA facturée | → Tipos de IVA (ventas) |

⚠️ **NOTA**: La cuenta 7129 está FALTANDO en tu plan actual. NO usar 618 (es para descuentos sobre compras).

---

## 🇲🇽 MÉXICO (MX)

### Cuentas Obligatorias Base (SAT 2024)
| Cuenta | Nombre | Uso en Mapeo |
|--------|--------|--------------|
| **401** | Ingresos (ventas y/o servicios) | → Servicios Y Productos |
| **501** | Costo de venta y/o servicio | → Productos consumibles |
| **101** | Caja | → Métodos de pago efectivo |
| **102** | Bancos | → Métodos de pago tarjeta/transferencia |
| **402** | Devoluciones, descuentos o bonificaciones | → Promociones y descuentos |
| **118** | IVA acreditable pagado | → Tipos de IVA (compras) |
| **213** | IVA por pagar | → Tipos de IVA (ventas) |

---

## Proceso de Verificación

### 1. Verificar Cuentas Base
Antes de ejecutar el mapeo automático, asegúrate de que TODAS estas cuentas existan:

```bash
# Cuentas que el sistema verificará antes de mapear:
- Servicios: Cuenta base según país
- Productos: Cuenta base según país  
- Consumibles: Cuenta base según país
- Caja: Cuenta base según país
- Bancos: Cuenta base según país
- Descuentos: Cuenta base según país
- IVA Soportado: Cuenta base según país
- IVA Repercutido: Cuenta base según país
```

### 2. Cuentas Faltantes Detectadas
Según el error, te faltan estas cuentas en Marruecos:
- ❌ **7129** - Rabais, remises et ristournes accordés

### 3. Solución Inmediata

#### Opción A: Importar Plan Actualizado
1. Usa el botón "Reset Mapeos" para limpiar todo
2. Ve a "Plan Contable" → "Importar desde plantilla"
3. Selecciona Marruecos (MA)
4. Importa el plan actualizado que incluye la cuenta 7129

#### Opción B: Crear Cuenta Manualmente
1. Ve a "Plan Contable"
2. Click "Agregar cuenta"
3. Crea la cuenta 7129:
   - Número: 7129
   - Nombre: Rabais, remises et ristournes accordés
   - Tipo: REVENUE
   - Permite entradas: Sí

### 4. Tipos de Mapeo y sus Cuentas

| Tipo de Mapeo | Cuentas Utilizadas |
|---------------|-------------------|
| **Servicios** | Cuenta de servicios del país |
| **Productos** | Cuenta de productos o consumibles según tipo |
| **Categorías** | Servicios o productos según contenido |
| **Métodos de Pago** | Caja o bancos según tipo |
| **Tipos de IVA** | IVA soportado/repercutido |
| **Gastos** | Varias (no usa mapeo automático fijo) |
| **Cajas** | Cuenta de caja del país |
| **Promociones** | Cuenta de descuentos del país |
| **Bancos** | Cuenta de bancos del país |

---

## Notas Importantes

1. **Subcuentas**: El sistema crea automáticamente subcuentas para cada elemento mapeado
2. **Validación**: El mapeo automático NO funcionará si falta alguna cuenta base
3. **México**: Usa la misma cuenta 401 para servicios Y productos
4. **Gastos**: No tienen mapeo automático fijo, se configuran manualmente
