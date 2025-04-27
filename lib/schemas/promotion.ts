import { z } from 'zod';
import { PromotionType, PromotionTargetScope, PromotionAccumulationMode } from '@prisma/client';

// Esquema Zod más completo y con enums
export const PromotionSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().nullish(),
  code: z.string().nullish(), // Código opcional
  isActive: z.boolean().optional().default(true),

  // --- Tipo y Valor ---
  type: z.nativeEnum(PromotionType), // Usar enum de Prisma
  value: z.number().positive('El valor debe ser positivo').optional().nullable(), // Permitir null explícitamente
  bogoBuyQuantity: z.number().int().positive('La cantidad debe ser positiva').optional().nullable(),

  // --- Objetivo --- 
  targetScope: z.nativeEnum(PromotionTargetScope), // Usar enum de Prisma
  targetServiceId: z.string().cuid().optional().nullable(), // Permitir null
  targetProductId: z.string().cuid().optional().nullable(),
  targetBonoDefinitionId: z.string().cuid().optional().nullable(),
  targetPackageDefinitionId: z.string().cuid().optional().nullable(),
  targetCategoryId: z.string().cuid().optional().nullable(),
  targetTariffId: z.string().cuid().optional().nullable(),

  // --- Beneficio BOGO ---
  bogoGetServiceId: z.string().cuid().optional().nullable(),
  bogoGetProductId: z.string().cuid().optional().nullable(),
  bogoGetQuantity: z.number().int().positive('La cantidad debe ser positiva').optional().nullable(),
  bogoGetValue: z.number().optional().nullable(), // Puede ser 0 para gratis

  // --- Condiciones ---
  minPurchaseAmount: z.number().nonnegative('El importe mínimo no puede ser negativo').optional().nullable(),
  maxDiscountAmount: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
    z.union([
      z.null(),
      z.number().refine(val => val > 0, { message: "El descuento máximo debe ser positivo" })
    ])
  ).optional(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  maxTotalUses: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
    z.union([
      z.null(),
      z.number().int({ message: "Los usos totales deben ser un número entero" }).refine(val => val > 0, { message: "Los usos totales deben ser positivos" })
    ])
  ).optional(),
  maxUsesPerClient: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
    z.union([
      z.null(),
      z.number().int({ message: "Los usos por cliente deben ser un número entero" }).refine(val => val > 0, { message: "Los usos por cliente deben ser positivos" })
    ])
  ).optional(),

  // --- Alcance ---
  applicableClinicIds: z.array(z.string().cuid()).optional().default([]), // Default a array vacío

  // --- Acumulación ---
  accumulationMode: z.nativeEnum(PromotionAccumulationMode).default(PromotionAccumulationMode.EXCLUSIVE),
  compatiblePromotionIds: z.array(z.string().cuid()).optional().default([]),
  // --- Fin Acumulación ---

}).superRefine((data, ctx) => {
  // --- 1. Validación: Incompatibilidad de Target IDs --- 
  const targetIdFields: (keyof typeof data)[] = [
    'targetServiceId', 'targetProductId', 'targetBonoDefinitionId',
    'targetPackageDefinitionId', 'targetCategoryId', 'targetTariffId'
  ];
  targetIdFields.forEach(field => {
    const scopeForField: PromotionTargetScope | null =
      field === 'targetServiceId' ? PromotionTargetScope.SPECIFIC_SERVICE :
      field === 'targetProductId' ? PromotionTargetScope.SPECIFIC_PRODUCT :
      field === 'targetBonoDefinitionId' ? PromotionTargetScope.SPECIFIC_BONO :
      field === 'targetPackageDefinitionId' ? PromotionTargetScope.SPECIFIC_PACKAGE :
      field === 'targetCategoryId' ? PromotionTargetScope.CATEGORY :
      field === 'targetTariffId' ? PromotionTargetScope.TARIFF :
      null;

    if (scopeForField && data.targetScope !== scopeForField && data[field]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Este campo es incompatible con el Tipo de Objetivo '${data.targetScope}' seleccionado.`,
        path: [field],
      });
    }
  });

  // --- 2. Validación: Target ID Requerido según Scope --- 
  const requiredTargetScopes = [
    PromotionTargetScope.SPECIFIC_SERVICE,
    PromotionTargetScope.SPECIFIC_PRODUCT,
    PromotionTargetScope.SPECIFIC_BONO,
    PromotionTargetScope.SPECIFIC_PACKAGE,
    PromotionTargetScope.CATEGORY,
    PromotionTargetScope.TARIFF,
  ];
  if (requiredTargetScopes.includes(data.targetScope)) {
    const expectedField: keyof typeof data | null =
      data.targetScope === PromotionTargetScope.SPECIFIC_SERVICE ? 'targetServiceId' :
      data.targetScope === PromotionTargetScope.SPECIFIC_PRODUCT ? 'targetProductId' :
      data.targetScope === PromotionTargetScope.SPECIFIC_BONO ? 'targetBonoDefinitionId' :
      data.targetScope === PromotionTargetScope.SPECIFIC_PACKAGE ? 'targetPackageDefinitionId' :
      data.targetScope === PromotionTargetScope.CATEGORY ? 'targetCategoryId' :
      data.targetScope === PromotionTargetScope.TARIFF ? 'targetTariffId' :
      null;

    // Si el campo esperado no tiene valor (es null o undefined)
    if (expectedField && (data[expectedField] === null || data[expectedField] === undefined)) {
      const scopeName = data.targetScope.replace('SPECIFIC_', '').replace(/_/g, ' ').toLowerCase();
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Debe seleccionar un ${scopeName} específico.`, // Mensaje más claro
        path: [expectedField],
      });
    }
  }

  // --- 3. Validación: Campo 'value' requerido según 'type' --- 
  const typeRequiresValue = 
    data.type === PromotionType.PERCENTAGE_DISCOUNT ||
    data.type === PromotionType.FIXED_AMOUNT_DISCOUNT ||
    data.type === PromotionType.POINTS_MULTIPLIER;

  if (typeRequiresValue && (data.value === null || data.value === undefined)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Se requiere un valor para este tipo de promoción.",
      path: ["value"],
    });
  }

  // --- 4. Validación: Campos BOGO requeridos según 'type' --- 
  if (data.type === PromotionType.BUY_X_GET_Y_SERVICE) {
    if (!data.bogoBuyQuantity) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Cantidad requerida.", path: ["bogoBuyQuantity"] });
    if (!data.bogoGetQuantity) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Cantidad de regalo requerida.", path: ["bogoGetQuantity"] });
    if (!data.bogoGetServiceId) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Debe seleccionar el servicio de regalo.", path: ["bogoGetServiceId"] });
  } else if (data.type === PromotionType.BUY_X_GET_Y_PRODUCT) {
    if (!data.bogoBuyQuantity) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Cantidad requerida.", path: ["bogoBuyQuantity"] });
    if (!data.bogoGetQuantity) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Cantidad de regalo requerida.", path: ["bogoGetQuantity"] });
    if (!data.bogoGetProductId) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Debe seleccionar el producto de regalo.", path: ["bogoGetProductId"] });
  }

  // --- 5. Validación: Coherencia de Fechas --- 
  if (data.startDate && data.endDate && data.endDate < data.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La fecha de fin no puede ser anterior a la fecha de inicio.",
      path: ["endDate"],
    });
  }

  // --- 6. Validación: Acumulación Específica ---
  if (data.accumulationMode === PromotionAccumulationMode.SPECIFIC && data.compatiblePromotionIds.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Debe seleccionar al menos una promoción compatible cuando el modo es 'Específico'.",
      path: ["compatiblePromotionIds"],
    });
  } else if (data.accumulationMode !== PromotionAccumulationMode.SPECIFIC && data.compatiblePromotionIds.length > 0) {
    // Asegurar que el array esté vacío si el modo no es SPECIFIC (opcional, pero buena práctica)
    // Opcionalmente, podrías limpiar el array aquí si prefieres en lugar de mostrar error.
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Las promociones compatibles solo aplican en modo 'Específico'.",
      path: ["compatiblePromotionIds"],
    });
    // data.compatiblePromotionIds = []; // Alternativa: limpiar en lugar de error
  }
});

// PODRÍAMOS AÑADIR UN superRefine después si queremos validar que el campo REQUERIDO
// (basado en targetScope) no esté vacío al enviar, pero por ahora esto debería desbloquear. 