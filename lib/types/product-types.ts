import { Prisma } from '@prisma/client';

// Define las relaciones a incluir para Product
const productIncludes = {
  category: true,
  vatType: true,      // Asegúrate de que 'vatType' es la relación correcta en tu schema Product
  settings: true,     // Si Product tiene una relación directa a ProductSetting
  productPrices: {   // Si Product tiene una relación a ProductPrice
    include: {
      tariff: true, // Y ProductPrice tiene una relación a Tariff
    },
  },
} satisfies Prisma.ProductInclude;

// Exporta el tipo ProductWithIncludes generado por Prisma
export type ProductWithIncludes = Prisma.ProductGetPayload<{
  include: typeof productIncludes
}>; 