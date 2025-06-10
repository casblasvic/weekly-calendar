/**
 * Generador de subcuentas contables basado en patrones
 * 
 * Permite generar automáticamente subcuentas contables usando patrones
 * con variables que se reemplazan dinámicamente.
 * 
 * Ejemplos de patrones:
 * - "{base}.{clinic}" -> "700.001" (700 + código clínica 001)
 * - "{base}.{category}.{clinic}" -> "700.01.001"
 * - "{base}_{service}" -> "705_001"
 */

import { prisma } from '@/lib/db';

export interface SubaccountContext {
  baseAccount: string;
  clinicId?: string;
  categoryId?: string;
  serviceId?: string;
  productId?: string;
  paymentMethodId?: string;
  vatId?: string;
  expenseTypeId?: string;
  legalEntityId: string;
  systemId: string;
  usage?: string;
  additionalContext?: {
    usage?: string;
  };
}

export interface AnalyticalDimension {
  code: string;
  value: string;
}

/**
 * Genera una subcuenta basada en un patrón y contexto
 */
export async function generateSubaccount(
  pattern: string | null | undefined,
  context: SubaccountContext
): Promise<string> {
  // Si no hay patrón, devolver la cuenta base
  if (!pattern) {
    return context.baseAccount;
  }

  let result = pattern;

  // Reemplazar {base} con la cuenta base
  result = result.replace(/{base}/g, context.baseAccount);

  // Reemplazar {clinic} con el código de la clínica
  if (context.clinicId && result.includes('{clinic}')) {
    const clinic = await prisma.clinic.findUnique({
      where: { id: context.clinicId },
      select: { id: true, name: true }
    });
    if (clinic?.id) {
      // Usar los últimos 3 caracteres del ID como código
      const clinicCode = clinic.id.slice(-3).toUpperCase();
      result = result.replace(/{clinic}/g, clinicCode);
    }
  } else if (context.clinicId) {
    result = result.replace(/{clinic}/g, context.clinicId.slice(-3).toUpperCase());
  }

  // Reemplazar {category} con el código de la categoría
  if (context.categoryId && result.includes('{category}')) {
    const category = await prisma.category.findUnique({
      where: { id: context.categoryId },
      select: { id: true, name: true }
    });
    if (category?.id) {
      // Usar los últimos 3 caracteres del ID como código
      const categoryCode = category.id.slice(-3).toUpperCase();
      result = result.replace(/{category}/g, categoryCode);
    }
  } else if (context.categoryId) {
    result = result.replace(/{category}/g, context.categoryId.slice(-3).toUpperCase());
  }

  // Reemplazar {service} con el código del servicio
  if (context.serviceId && result.includes('{service}')) {
    const service = await prisma.service.findUnique({
      where: { id: context.serviceId },
      select: { id: true, name: true }
    });
    if (service?.id) {
      // Usar los primeros 4 caracteres del nombre en mayúsculas
      const serviceName = service.name.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const serviceCode = serviceName.slice(0, 4) || service.id.slice(-3).toUpperCase();
      result = result.replace(/{service}/g, serviceCode);
    }
  } else if (context.serviceId) {
    result = result.replace(/{service}/g, context.serviceId.slice(-3).toUpperCase());
  }

  // Reemplazar {product} con el código del producto
  if (context.productId && result.includes('{product}')) {
    const product = await prisma.product.findUnique({
      where: { id: context.productId },
      select: { id: true, name: true, sku: true }
    });
    if (product) {
      // Usar SKU si existe, si no usar los primeros caracteres del nombre
      const productCode = product.sku || 
        product.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || 
        product.id.slice(-3).toUpperCase();
      result = result.replace(/{product}/g, productCode);
    }
  } else if (context.productId) {
    result = result.replace(/{product}/g, context.productId.slice(-3).toUpperCase());
  }

  // Reemplazar {paymentMethod} con el código del método de pago
  if (context.paymentMethodId && result.includes('{paymentMethod}')) {
    const paymentMethod = await prisma.paymentMethodDefinition.findUnique({
      where: { id: context.paymentMethodId },
      select: { id: true }
    });
    if (paymentMethod?.id) {
      result = result.replace(/{paymentMethod}/g, paymentMethod.id);
    }
  } else if (context.paymentMethodId) {
    result = result.replace(/{paymentMethod}/g, context.paymentMethodId);
  }

  // Reemplazar {vat} con el código del tipo de IVA
  if (context.vatId && result.includes('{vat}')) {
    const vat = await prisma.vATType.findUnique({
      where: { id: context.vatId },
      select: { id: true }
    });
    if (vat?.id) {
      result = result.replace(/{vat}/g, vat.id);
    }
  } else if (context.vatId) {
    result = result.replace(/{vat}/g, context.vatId);
  }

  // Reemplazar {expenseType} con el código del tipo de gasto
  if (context.expenseTypeId && result.includes('{expenseType}')) {
    const expenseType = await prisma.expenseType.findUnique({
      where: { id: context.expenseTypeId },
      select: { id: true }
    });
    if (expenseType?.id) {
      result = result.replace(/{expenseType}/g, expenseType.id);
    }
  } else if (context.expenseTypeId) {
    result = result.replace(/{expenseType}/g, context.expenseTypeId);
  }

  // Reemplazar {usage} con el código de uso (V=Venta, C=Consumible)
  if (context.usage && result.includes('{usage}')) {
    result = result.replace(/{usage}/g, context.usage);
  }

  // Reemplazar otros placeholders del contexto adicional
  if (context.additionalContext) {
    // Si viene un usage en el contexto adicional
    if (context.additionalContext.usage && result.includes('{usage}')) {
      result = result.replace(/{usage}/g, context.additionalContext.usage);
    }
  }

  return result;
}

/**
 * Parsea las dimensiones analíticas desde JSON
 */
export function parseAnalyticalDimensions(
  dimensionsJson: any
): AnalyticalDimension[] {
  if (!dimensionsJson) return [];

  try {
    if (typeof dimensionsJson === 'string') {
      dimensionsJson = JSON.parse(dimensionsJson);
    }

    if (Array.isArray(dimensionsJson)) {
      return dimensionsJson.filter(
        dim => dim.code && dim.value
      ) as AnalyticalDimension[];
    }

    return [];
  } catch (error) {
    console.error('Error parsing analytical dimensions:', error);
    return [];
  }
}

/**
 * Valida que las dimensiones analíticas cumplan con la configuración
 */
export async function validateAnalyticalDimensions(
  dimensions: AnalyticalDimension[],
  systemId: string
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Obtener las dimensiones configuradas para el sistema
  const configuredDimensions = await prisma.analyticalDimension.findMany({
    where: { systemId }
  });

  for (const dimension of dimensions) {
    const config = configuredDimensions.find(d => d.code === dimension.code);
    
    if (!config) {
      errors.push(`Dimensión '${dimension.code}' no está configurada`);
      continue;
    }

    // Validar tipo de dato
    if (config.dataType === 'NUMBER' && isNaN(Number(dimension.value))) {
      errors.push(`Dimensión '${dimension.code}' debe ser numérica`);
    }

    // Validar valores permitidos si están configurados
    if (config.allowedValues) {
      const allowedValues = config.allowedValues as string[];
      if (!allowedValues.includes(dimension.value)) {
        errors.push(
          `Valor '${dimension.value}' no permitido para dimensión '${dimension.code}'`
        );
      }
    }
  }

  // Validar dimensiones requeridas
  const requiredDimensions = configuredDimensions.filter(d => d.isRequired);
  for (const required of requiredDimensions) {
    if (!dimensions.find(d => d.code === required.code)) {
      errors.push(`Dimensión requerida '${required.code}' no proporcionada`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
