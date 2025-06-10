# API de Dimensiones Analíticas para Entidades

Este documento describe el endpoint `/api/accounting/entity-dimensions` para gestionar las dimensiones analíticas de entidades relacionadas (clientes, proveedores, empleados).

## GET /api/accounting/entity-dimensions

Obtiene la configuración actual de dimensiones analíticas y estadísticas de entidades.

### Parámetros de consulta

- `legalEntityId` (requerido): ID de la entidad legal

### Respuesta exitosa (200)

```json
{
  "dimensions": [
    {
      "id": "cuid",
      "systemId": "string",
      "code": "client",
      "name": "Cliente",
      "isRequired": false,
      "dataType": "STRING"
    }
  ],
  "entityCounts": {
    "clients": 150,
    "suppliers": 0,
    "employees": 25,
    "professionals": 25
  },
  "segmentConfigs": [
    {
      "id": "cuid",
      "systemId": "string",
      "entityType": "client",
      "segments": [
        {
          "code": "VIP",
          "name": "Clientes VIP",
          "criteria": "Más de 1000€ en últimos 6 meses"
        }
      ]
    }
  ],
  "recommendedAccounts": {
    "clients": {
      "base": "430",
      "name": "Clientes",
      "pattern": "{base}.{segment}",
      "segments": [
        {
          "code": "VIP",
          "name": "Clientes VIP",
          "criteria": "Más de 1000€ en últimos 6 meses"
        },
        {
          "code": "REG",
          "name": "Clientes regulares",
          "criteria": "Entre 100€ y 1000€"
        },
        {
          "code": "OCA",
          "name": "Clientes ocasionales",
          "criteria": "Menos de 100€"
        }
      ]
    },
    "suppliers": {
      "base": "400",
      "name": "Proveedores",
      "pattern": "{base}.{category}",
      "segments": [
        {
          "code": "PRO",
          "name": "Productos",
          "criteria": "Proveedores de productos"
        },
        {
          "code": "SER",
          "name": "Servicios",
          "criteria": "Proveedores de servicios"
        },
        {
          "code": "OTR",
          "name": "Otros",
          "criteria": "Otros proveedores"
        }
      ]
    },
    "employees": {
      "base": "640",
      "name": "Gastos de personal",
      "pattern": "{base}.{role}",
      "segments": [
        {
          "code": "DOC",
          "name": "Médicos",
          "criteria": "Personal médico"
        },
        {
          "code": "AUX",
          "name": "Auxiliares",
          "criteria": "Personal auxiliar"
        },
        {
          "code": "ADM",
          "name": "Administrativos",
          "criteria": "Personal administrativo"
        },
        {
          "code": "OTR",
          "name": "Otros",
          "criteria": "Otro personal"
        }
      ]
    }
  }
}
```

## POST /api/accounting/entity-dimensions

Configura los segmentos para un tipo de entidad específico.

### Cuerpo de la petición

```json
{
  "entityType": "client",
  "segments": [
    {
      "code": "VIP",
      "name": "Clientes VIP",
      "criteria": "Más de 1000€ en últimos 6 meses"
    },
    {
      "code": "REG",
      "name": "Clientes regulares",
      "criteria": "Entre 100€ y 1000€"
    },
    {
      "code": "OCA",
      "name": "Clientes ocasionales",
      "criteria": "Menos de 100€"
    }
  ]
}
```

### Tipos de entidad válidos

- `client`: Clientes
- `supplier`: Proveedores
- `employee`: Empleados
- `professional`: Profesionales

### Respuesta exitosa (200)

```json
{
  "success": true,
  "segmentConfig": {
    "id": "cuid",
    "systemId": "string",
    "entityType": "client",
    "segments": [
      {
        "code": "VIP",
        "name": "Clientes VIP",
        "criteria": "Más de 1000€ en últimos 6 meses"
      }
    ],
    "createdAt": "2025-06-05T14:00:00Z",
    "updatedAt": "2025-06-05T14:00:00Z"
  }
}
```

## Ejemplos de uso

### Configurar segmentos de clientes

```bash
curl -X POST http://localhost:3000/api/accounting/entity-dimensions \
  -H "Content-Type: application/json" \
  -H "Cookie: $AUTH_COOKIE" \
  -d '{
    "entityType": "client",
    "segments": [
      {"code": "VIP", "name": "Clientes VIP", "criteria": ">1000€"},
      {"code": "REG", "name": "Regulares", "criteria": "100-1000€"},
      {"code": "NEW", "name": "Nuevos", "criteria": "<3 meses"}
    ]
  }'
```

### Configurar segmentos de proveedores

```bash
curl -X POST http://localhost:3000/api/accounting/entity-dimensions \
  -H "Content-Type: application/json" \
  -H "Cookie: $AUTH_COOKIE" \
  -d '{
    "entityType": "supplier",
    "segments": [
      {"code": "MED", "name": "Material médico", "criteria": "Productos médicos"},
      {"code": "COS", "name": "Cosmética", "criteria": "Productos cosméticos"},
      {"code": "SER", "name": "Servicios", "criteria": "Proveedores de servicios"}
    ]
  }'
```

### Configurar roles de empleados

```bash
curl -X POST http://localhost:3000/api/accounting/entity-dimensions \
  -H "Content-Type: application/json" \
  -H "Cookie: $AUTH_COOKIE" \
  -d '{
    "entityType": "employee",
    "segments": [
      {"code": "DOC", "name": "Médicos", "criteria": "Personal médico"},
      {"code": "ENF", "name": "Enfermería", "criteria": "Personal enfermería"},
      {"code": "EST", "name": "Esteticistas", "criteria": "Personal estética"},
      {"code": "ADM", "name": "Administrativos", "criteria": "Personal administrativo"}
    ]
  }'
```

## Integración con el sistema contable

Cuando se configuren estos segmentos, el sistema generará automáticamente las subcuentas apropiadas:

- **Clientes**: `430.VIP`, `430.REG`, `430.OCA`
- **Proveedores**: `400.MED`, `400.COS`, `400.SER`
- **Empleados**: `640.DOC`, `640.ENF`, `640.EST`, `640.ADM`

Estas subcuentas se utilizarán junto con las dimensiones analíticas para proporcionar un análisis detallado sin comprometer la privacidad de los datos individuales.

## Notas importantes

1. **Privacidad**: Los nombres individuales no aparecen en el plan de cuentas, solo en las dimensiones analíticas
2. **Escalabilidad**: Este sistema puede manejar millones de entidades sin crear cuentas individuales
3. **Análisis**: Permite consultas SQL complejas usando JSON_EXTRACT sobre las dimensiones analíticas
4. **Auditoría**: Toda la información detallada se preserva en las transacciones contables
