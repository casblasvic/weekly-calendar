# Plan de Integración IA - Sistema Contable

## Visión General
Crear un sistema contable inteligente que automatice progresivamente las tareas manuales mediante IA, manteniendo siempre el control y validación humana.

## Fases de Implementación

### Fase 1: Infraestructura Manual (ACTUAL)
- ✅ Importación de plantillas contables
- 🔄 UI de mapeo manual categorías → cuentas
- 🔄 Configuración manual de reglas contables
- 🔄 Gestión de documentos adjuntos

### Fase 2: IA Asistida (3-6 meses)
#### 2.1 Mapeo Inteligente
- **Tecnología**: OpenAI GPT-4 / Claude API
- **Funcionalidad**: 
  - Analizar nombres de servicios/productos/categorías
  - Sugerir cuenta contable más apropiada
  - Basarse en contexto del país y sector
- **UI**: Sugerencias con nivel de confianza

#### 2.2 Extracción de Documentos
- **Tecnología**: OCR (Tesseract/Cloud Vision) + LLM
- **Funcionalidad**:
  - Extraer datos de facturas PDF/imágenes
  - Identificar: emisor, receptor, items, IVA, totales
  - Pre-llenar formularios de entrada
- **Validación**: Siempre requiere confirmación humana

### Fase 3: Automatización Avanzada (6-12 meses)
#### 3.1 Contabilización Automática
- Generar asientos contables automáticamente
- Aplicar reglas fiscales del país
- Detectar anomalías y alertar

#### 3.2 Actualización de Normativa
- Monitorear cambios en planes contables
- Actualizar automáticamente con validación
- Mantener histórico de versiones

## Arquitectura Técnica Propuesta

### Opción 1: MCP (Model Context Protocol) - RECOMENDADA
```typescript
// Servidor MCP local para IA contable
const accountingMCP = {
  tools: [
    {
      name: "suggest_account_mapping",
      description: "Sugiere mapeo de categoría/servicio a cuenta contable",
      parameters: {
        itemName: string,
        itemType: "service" | "product" | "category",
        countryCode: string,
        chartOfAccounts: ChartEntry[]
      }
    },
    {
      name: "extract_invoice_data",
      description: "Extrae datos de factura desde imagen/PDF",
      parameters: {
        documentUrl: string,
        documentType: "invoice" | "ticket" | "expense"
      }
    }
  ]
};
```

### Opción 2: API Gateway + Servicios IA
```typescript
// Servicio centralizado de IA
class AIAccountingService {
  async suggestMapping(params: MappingParams): Promise<MappingSuggestion[]> {
    // Llamar a OpenAI/Claude con contexto específico
    const prompt = buildAccountingPrompt(params);
    const suggestions = await llm.complete(prompt);
    return parseSuggestions(suggestions);
  }
}
```

## Implementación Fase 1 - Configurador Manual

### Flujo después de importar plantilla:
1. **Dashboard Contable** → "Configurar Mapeos"
2. **Pestañas de configuración**:
   - Categorías → Cuentas
   - Métodos de Pago → Cuentas
   - Tipos de IVA → Cuentas
   - Reglas especiales

### UI Propuesta:
```
┌─────────────────────────────────────────┐
│ Configuración de Mapeos Contables       │
├─────────────────────────────────────────┤
│ [Categorías] [Pagos] [IVA] [Reglas]     │
├─────────────────────────────────────────┤
│ Categorías sin mapear (3)               │
│                                         │
│ ┌─────────────────┬──────────────────┐ │
│ │ Tratamientos    │ [Seleccionar...▼] │ │
│ │ Faciales        │                   │ │
│ ├─────────────────┼──────────────────┤ │
│ │ Productos       │ [701 - Ventas  ▼] │ │
│ │ Cosméticos      │                   │ │
│ ├─────────────────┼──────────────────┤ │
│ │ Servicios       │ [700 - Ventas  ▼] │ │
│ │ Médicos         │                   │ │
│ └─────────────────┴──────────────────┘ │
│                                         │
│ [✓] Aplicar a subcategorías             │
│                                         │
│ [Guardar] [Aplicar plantilla sugerida]  │
└─────────────────────────────────────────┘
```

## Consideraciones de Seguridad
- Todos los documentos sensibles encriptados
- Logs de auditoría para cambios contables
- Validación humana obligatoria para movimientos
- Cumplimiento GDPR/LOPD para datos fiscales

## ROI Esperado
- Fase 1: Base sólida, 0% automatización
- Fase 2: 60% reducción tiempo configuración
- Fase 3: 90% automatización con supervisión

## Próximos Pasos
1. Completar UI de mapeo manual
2. Implementar almacenamiento seguro de PDFs
3. POC de integración con OpenAI/Claude
4. Definir prompts especializados por país 