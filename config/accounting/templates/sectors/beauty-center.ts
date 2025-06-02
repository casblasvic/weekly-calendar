/**
 * Plantilla de personalización contable para CENTROS DE BELLEZA Y PELUQUERÍA
 * 
 * Esta plantilla añade cuentas específicas para servicios de peluquería,
 * tratamientos de belleza no médicos, y productos cosméticos.
 */

import { SectorTemplate, BusinessSector } from '@/types/accounting';

export const BEAUTY_CENTER_TEMPLATE: SectorTemplate = {
  sector: BusinessSector.BEAUTY_CENTER,
  names: {
    es: "Centro de Belleza y Peluquería",
    fr: "Centre de Beauté et Coiffure", 
    en: "Beauty Center and Hair Salon"
  },
  description: {
    es: "Personalización contable para centros de belleza, peluquerías y salones",
    fr: "Personnalisation comptable pour centres de beauté, salons de coiffure",
    en: "Accounting customization for beauty centers, hair salons"
  },
  accountCustomizations: {
    // Cuentas adicionales específicas para centros de belleza
    additionalAccounts: [
      // === INGRESOS POR TIPO DE SERVICIO ===
      {
        accountNumber: "4121",
        names: {
          es: "Ingresos Servicios de Peluquería",
          fr: "Revenus Services de Coiffure",
          en: "Hair Services Revenue"
        },
        type: "REVENUE",
        description: {
          es: "Ingresos por cortes, peinados, coloración y tratamientos capilares",
          fr: "Revenus des coupes, coiffures, colorations et soins capillaires",
          en: "Revenue from haircuts, styling, coloring and hair treatments"
        },
        level: 3,
        parentNumber: "412",
        isMonetary: true,
        allowsDirectEntry: true,
        serviceCategories: ["HAIR_CUT", "HAIR_COLOR", "HAIR_STYLING", "HAIR_TREATMENT"],
        defaultForServices: false
      },
      {
        accountNumber: "4122", 
        names: {
          es: "Ingresos Servicios de Estética",
          fr: "Revenus Services d'Esthétique",
          en: "Beauty Services Revenue"
        },
        type: "REVENUE",
        description: {
          es: "Ingresos por manicura, pedicura, maquillaje y tratamientos de belleza",
          fr: "Revenus de manucure, pédicure, maquillage et soins de beauté",
          en: "Revenue from manicure, pedicure, makeup and beauty treatments"
        },
        level: 3,
        parentNumber: "412",
        isMonetary: true,
        allowsDirectEntry: true,
        serviceCategories: ["MANICURE", "PEDICURE", "MAKEUP", "BEAUTY_TREATMENT"],
        defaultForServices: false
      },
      {
        accountNumber: "4123",
        names: {
          es: "Ingresos Servicios de Bienestar",
          fr: "Revenus Services Bien-être",
          en: "Wellness Services Revenue"
        },
        type: "REVENUE",
        description: {
          es: "Ingresos por masajes relajantes, aromaterapia y servicios wellness",
          fr: "Revenus des massages relaxants, aromathérapie et services bien-être",
          en: "Revenue from relaxing massages, aromatherapy and wellness services"
        },
        level: 3,
        parentNumber: "412",
        isMonetary: true,
        allowsDirectEntry: true,
        serviceCategories: ["MASSAGE", "AROMATHERAPY", "WELLNESS"],
        defaultForServices: false
      },
      {
        accountNumber: "4124",
        names: {
          es: "Ingresos Venta Productos Cosméticos",
          fr: "Revenus Vente Produits Cosmétiques",
          en: "Cosmetic Products Sales Revenue"
        },
        type: "REVENUE",
        description: {
          es: "Ingresos por venta de productos de belleza y cosméticos",
          fr: "Revenus de la vente de produits de beauté et cosmétiques",
          en: "Revenue from beauty and cosmetic products sales"
        },
        level: 3,
        parentNumber: "412",
        isMonetary: true,
        allowsDirectEntry: true,
        productCategories: ["COSMETICS", "HAIR_PRODUCTS", "SKINCARE", "MAKEUP_PRODUCTS"],
        defaultForProducts: false
      },

      // === GASTOS ESPECÍFICOS DE MATERIAL DE BELLEZA ===
      {
        accountNumber: "6031",
        names: {
          es: "Compras Productos Capilares",
          fr: "Achats Produits Capillaires",
          en: "Hair Products Purchases"
        },
        type: "EXPENSE",
        description: {
          es: "Compras de tintes, champús profesionales y productos capilares",
          fr: "Achats de teintures, shampooings professionnels et produits capillaires",
          en: "Purchases of dyes, professional shampoos and hair products"
        },
        level: 3,
        parentNumber: "603",
        isMonetary: true,
        allowsDirectEntry: true,
        productCategories: ["HAIR_DYE", "PROFESSIONAL_SHAMPOO", "HAIR_TREATMENT_PRODUCTS"],
        defaultForProducts: false
      },
      {
        accountNumber: "6032",
        names: {
          es: "Compras Material Estética y Uñas",
          fr: "Achats Matériel Esthétique et Ongles",
          en: "Beauty and Nail Materials Purchases"
        },
        type: "EXPENSE",
        description: {
          es: "Material para manicura, pedicura, maquillaje y tratamientos estéticos",
          fr: "Matériel pour manucure, pédicure, maquillage et soins esthétiques",
          en: "Materials for manicure, pedicure, makeup and beauty treatments"
        },
        level: 3,
        parentNumber: "603",
        isMonetary: true,
        allowsDirectEntry: true,
        productCategories: ["NAIL_SUPPLIES", "MAKEUP_SUPPLIES", "BEAUTY_TOOLS"],
        defaultForProducts: false
      },
      {
        accountNumber: "6033",
        names: {
          es: "Compras Productos para Reventa",
          fr: "Achats Produits pour Revente",
          en: "Products for Resale Purchases"
        },
        type: "EXPENSE",
        description: {
          es: "Productos cosméticos y de belleza comprados para su reventa",
          fr: "Produits cosmétiques et de beauté achetés pour la revente",
          en: "Cosmetic and beauty products purchased for resale"
        },
        level: 3,
        parentNumber: "603",
        isMonetary: true,
        allowsDirectEntry: true,
        productCategories: ["RESALE_COSMETICS", "RESALE_HAIR_PRODUCTS"],
        defaultForProducts: false
      },

      // === GASTOS ESPECÍFICOS DEL SECTOR ===
      {
        accountNumber: "6291",
        names: {
          es: "Formación y Cursos de Belleza",
          fr: "Formation et Cours de Beauté",
          en: "Beauty Training and Courses"
        },
        type: "EXPENSE",
        description: {
          es: "Gastos en formación continua, cursos y certificaciones de belleza",
          fr: "Dépenses en formation continue, cours et certifications beauté",
          en: "Expenses in continuous training, courses and beauty certifications"
        },
        level: 3,
        parentNumber: "629",
        isMonetary: true,
        allowsDirectEntry: true
      },

      // === ACTIVOS - EQUIPAMIENTO ESPECÍFICO ===
      {
        accountNumber: "2141",
        names: {
          es: "Mobiliario de Peluquería",
          fr: "Mobilier de Coiffure",
          en: "Hair Salon Furniture"
        },
        type: "ASSET",
        description: {
          es: "Sillones de peluquería, lavacabezas y mobiliario específico",
          fr: "Fauteuils de coiffure, bacs à shampoing et mobilier spécifique",
          en: "Hair salon chairs, wash basins and specific furniture"
        },
        level: 3,
        parentNumber: "214",
        isMonetary: true,
        allowsDirectEntry: true
      },
      {
        accountNumber: "2142",
        names: {
          es: "Equipos de Estética y Belleza",
          fr: "Équipements d'Esthétique et Beauté",
          en: "Beauty and Aesthetic Equipment"
        },
        type: "ASSET",
        description: {
          es: "Aparatología estética, lámparas UV, equipos de manicura",
          fr: "Appareils esthétiques, lampes UV, équipements de manucure",
          en: "Aesthetic devices, UV lamps, manicure equipment"
        },
        level: 3,
        parentNumber: "214",
        isMonetary: true,
        allowsDirectEntry: true
      }
    ],

    // Modificaciones a cuentas existentes para adaptarlas al sector
    accountModifications: {
      "700": {
        names: {
          es: "Ventas de Servicios de Belleza",
          fr: "Ventes de Services de Beauté",
          en: "Beauty Services Sales"
        }
      },
      "701": {
        names: {
          es: "Ventas de Productos de Belleza",
          fr: "Ventes de Produits de Beauté",
          en: "Beauty Products Sales"
        }
      },
      "430": {
        names: {
          es: "Clientes - Servicios de Belleza",
          fr: "Clients - Services de Beauté",
          en: "Customers - Beauty Services"
        }
      }
    },

    // Mapeos predeterminados para categorías de servicios/productos
    defaultMappings: {
      services: {
        // Servicios de peluquería
        "HAIR_CUT": "4121",
        "HAIR_COLOR": "4121",
        "HAIR_STYLING": "4121",
        "HAIR_TREATMENT": "4121",
        "HAIR_EXTENSIONS": "4121",
        // Servicios de estética
        "MANICURE": "4122",
        "PEDICURE": "4122",
        "MAKEUP": "4122",
        "BEAUTY_TREATMENT": "4122",
        "FACIAL_BEAUTY": "4122",
        "WAX_DEPILATION": "4122",
        // Servicios de bienestar
        "MASSAGE": "4123",
        "AROMATHERAPY": "4123",
        "WELLNESS": "4123",
        "RELAXATION": "4123"
      },
      products: {
        // Productos capilares
        "HAIR_DYE": "6031",
        "PROFESSIONAL_SHAMPOO": "6031",
        "HAIR_TREATMENT_PRODUCTS": "6031",
        // Material de estética
        "NAIL_SUPPLIES": "6032",
        "MAKEUP_SUPPLIES": "6032",
        "BEAUTY_TOOLS": "6032",
        // Productos para reventa
        "COSMETICS": "6033",
        "HAIR_PRODUCTS": "6033",
        "SKINCARE": "6033",
        "MAKEUP_PRODUCTS": "6033",
        // Inventario para venta
        "RESALE_COSMETICS": "300",
        "RESALE_HAIR_PRODUCTS": "300"
      }
    }
  }
}; 