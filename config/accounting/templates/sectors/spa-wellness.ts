/**
 * Plantilla de personalización contable para SPAS Y CENTROS DE BIENESTAR
 * 
 * Esta plantilla añade cuentas específicas para servicios de spa,
 * tratamientos de bienestar, terapias holísticas y productos wellness.
 */

import { SectorTemplate, BusinessSector } from '@/types/accounting';

export const SPA_WELLNESS_TEMPLATE: SectorTemplate = {
  sector: BusinessSector.SPA_WELLNESS,
  names: {
    es: "Spa y Centro de Bienestar",
    fr: "Spa et Centre de Bien-être", 
    en: "Spa and Wellness Center"
  },
  description: {
    es: "Personalización contable para spas, centros de bienestar y terapias holísticas",
    fr: "Personnalisation comptable pour spas, centres de bien-être et thérapies holistiques",
    en: "Accounting customization for spas, wellness centers and holistic therapies"
  },
  accountCustomizations: {
    // Cuentas adicionales específicas para spas y centros de bienestar
    additionalAccounts: [
      // === INGRESOS POR TIPO DE SERVICIO WELLNESS ===
      {
        accountNumber: "4131",
        names: {
          es: "Ingresos Tratamientos de Spa",
          fr: "Revenus Soins de Spa",
          en: "Spa Treatments Revenue"
        },
        type: "REVENUE",
        description: {
          es: "Ingresos por circuitos termales, hidroterapia y tratamientos de spa",
          fr: "Revenus des circuits thermaux, hydrothérapie et soins de spa",
          en: "Revenue from thermal circuits, hydrotherapy and spa treatments"
        },
        level: 3,
        parentNumber: "413",
        isMonetary: true,
        allowsDirectEntry: true,
        serviceCategories: ["SPA_CIRCUIT", "HYDROTHERAPY", "THERMAL_TREATMENT", "BODY_WRAP"],
        defaultForServices: false
      },
      {
        accountNumber: "4132", 
        names: {
          es: "Ingresos Terapias Holísticas",
          fr: "Revenus Thérapies Holistiques",
          en: "Holistic Therapies Revenue"
        },
        type: "REVENUE",
        description: {
          es: "Ingresos por reiki, reflexología, acupuntura y terapias alternativas",
          fr: "Revenus de reiki, réflexologie, acupuncture et thérapies alternatives",
          en: "Revenue from reiki, reflexology, acupuncture and alternative therapies"
        },
        level: 3,
        parentNumber: "413",
        isMonetary: true,
        allowsDirectEntry: true,
        serviceCategories: ["REIKI", "REFLEXOLOGY", "ACUPUNCTURE", "ALTERNATIVE_THERAPY"],
        defaultForServices: false
      },
      {
        accountNumber: "4133",
        names: {
          es: "Ingresos Masajes Terapéuticos",
          fr: "Revenus Massages Thérapeutiques",
          en: "Therapeutic Massage Revenue"
        },
        type: "REVENUE",
        description: {
          es: "Ingresos por masajes terapéuticos, deportivos y técnicas especializadas",
          fr: "Revenus des massages thérapeutiques, sportifs et techniques spécialisées",
          en: "Revenue from therapeutic, sports and specialized massage techniques"
        },
        level: 3,
        parentNumber: "413",
        isMonetary: true,
        allowsDirectEntry: true,
        serviceCategories: ["THERAPEUTIC_MASSAGE", "SPORTS_MASSAGE", "HOT_STONE", "THAI_MASSAGE"],
        defaultForServices: false
      },
      {
        accountNumber: "4134",
        names: {
          es: "Ingresos Programas de Bienestar",
          fr: "Revenus Programmes de Bien-être",
          en: "Wellness Programs Revenue"
        },
        type: "REVENUE",
        description: {
          es: "Ingresos por retiros, programas detox y planes de bienestar integral",
          fr: "Revenus des retraites, programmes détox et plans de bien-être intégral",
          en: "Revenue from retreats, detox programs and integral wellness plans"
        },
        level: 3,
        parentNumber: "413",
        isMonetary: true,
        allowsDirectEntry: true,
        serviceCategories: ["WELLNESS_RETREAT", "DETOX_PROGRAM", "MEDITATION", "YOGA"],
        defaultForServices: false
      },
      {
        accountNumber: "4135",
        names: {
          es: "Ingresos Membresías y Bonos Spa",
          fr: "Revenus Adhésions et Forfaits Spa",
          en: "Spa Memberships and Packages Revenue"
        },
        type: "REVENUE",
        description: {
          es: "Ingresos por membresías, bonos y paquetes de servicios wellness",
          fr: "Revenus des adhésions, forfaits et packages de services bien-être",
          en: "Revenue from memberships, vouchers and wellness service packages"
        },
        level: 3,
        parentNumber: "413",
        isMonetary: true,
        allowsDirectEntry: true,
        serviceCategories: ["SPA_MEMBERSHIP", "WELLNESS_PACKAGE", "SPA_VOUCHER"],
        defaultForServices: false
      },

      // === GASTOS ESPECÍFICOS DE PRODUCTOS Y MATERIALES WELLNESS ===
      {
        accountNumber: "6041",
        names: {
          es: "Compras Aceites Esenciales y Aromaterapia",
          fr: "Achats Huiles Essentielles et Aromathérapie",
          en: "Essential Oils and Aromatherapy Purchases"
        },
        type: "EXPENSE",
        description: {
          es: "Compras de aceites esenciales, productos de aromaterapia y esencias",
          fr: "Achats d'huiles essentielles, produits d'aromathérapie et essences",
          en: "Purchases of essential oils, aromatherapy products and essences"
        },
        level: 3,
        parentNumber: "604",
        isMonetary: true,
        allowsDirectEntry: true,
        productCategories: ["ESSENTIAL_OILS", "AROMATHERAPY", "MASSAGE_OILS"],
        defaultForProducts: false
      },
      {
        accountNumber: "6042",
        names: {
          es: "Compras Productos Spa y Termalismo",
          fr: "Achats Produits Spa et Thermalisme",
          en: "Spa and Thermal Products Purchases"
        },
        type: "EXPENSE",
        description: {
          es: "Productos para tratamientos termales, sales, barros y algas",
          fr: "Produits pour soins thermaux, sels, boues et algues",
          en: "Products for thermal treatments, salts, muds and seaweeds"
        },
        level: 3,
        parentNumber: "604",
        isMonetary: true,
        allowsDirectEntry: true,
        productCategories: ["BATH_SALTS", "THERMAL_MUD", "SEAWEED_PRODUCTS", "SPA_PRODUCTS"],
        defaultForProducts: false
      },
      {
        accountNumber: "6043",
        names: {
          es: "Compras Material Terapias Holísticas",
          fr: "Achats Matériel Thérapies Holistiques",
          en: "Holistic Therapies Materials Purchases"
        },
        type: "EXPENSE",
        description: {
          es: "Material para acupuntura, piedras calientes, cuencos tibetanos",
          fr: "Matériel pour acupuncture, pierres chaudes, bols tibétains",
          en: "Materials for acupuncture, hot stones, Tibetan bowls"
        },
        level: 3,
        parentNumber: "604",
        isMonetary: true,
        allowsDirectEntry: true,
        productCategories: ["ACUPUNCTURE_SUPPLIES", "HOT_STONES", "THERAPY_TOOLS"],
        defaultForProducts: false
      },

      // === GASTOS OPERATIVOS ESPECÍFICOS ===
      {
        accountNumber: "6281",
        names: {
          es: "Suministros Agua Termal y Tratamientos",
          fr: "Fournitures Eau Thermale et Traitements",
          en: "Thermal Water and Treatment Supplies"
        },
        type: "EXPENSE",
        description: {
          es: "Costes de agua termal, mantenimiento de piscinas y circuitos",
          fr: "Coûts d'eau thermale, entretien des piscines et circuits",
          en: "Thermal water costs, pool and circuit maintenance"
        },
        level: 3,
        parentNumber: "628",
        isMonetary: true,
        allowsDirectEntry: true
      },
      {
        accountNumber: "6282",
        names: {
          es: "Lavandería y Textiles Spa",
          fr: "Blanchisserie et Textiles Spa",
          en: "Spa Laundry and Textiles"
        },
        type: "EXPENSE",
        description: {
          es: "Servicios de lavandería, toallas, albornoces y textiles spa",
          fr: "Services de blanchisserie, serviettes, peignoirs et textiles spa",
          en: "Laundry services, towels, robes and spa textiles"
        },
        level: 3,
        parentNumber: "628",
        isMonetary: true,
        allowsDirectEntry: true
      },

      // === ACTIVOS - INSTALACIONES Y EQUIPAMIENTO SPA ===
      {
        accountNumber: "2151",
        names: {
          es: "Instalaciones Termales y Piscinas",
          fr: "Installations Thermales et Piscines",
          en: "Thermal Facilities and Pools"
        },
        type: "ASSET",
        description: {
          es: "Jacuzzis, saunas, baños turcos, piscinas termales",
          fr: "Jacuzzis, saunas, hammams, piscines thermales",
          en: "Jacuzzis, saunas, Turkish baths, thermal pools"
        },
        level: 3,
        parentNumber: "215",
        isMonetary: true,
        allowsDirectEntry: true
      },
      {
        accountNumber: "2152",
        names: {
          es: "Equipamiento de Terapias Wellness",
          fr: "Équipement de Thérapies Bien-être",
          en: "Wellness Therapy Equipment"
        },
        type: "ASSET",
        description: {
          es: "Camillas especializadas, equipos de presoterapia, aparatos wellness",
          fr: "Tables spécialisées, équipements de pressothérapie, appareils bien-être",
          en: "Specialized tables, pressotherapy equipment, wellness devices"
        },
        level: 3,
        parentNumber: "215",
        isMonetary: true,
        allowsDirectEntry: true
      },
      {
        accountNumber: "2153",
        names: {
          es: "Mobiliario y Ambientación Spa",
          fr: "Mobilier et Ambiance Spa",
          en: "Spa Furniture and Ambiance"
        },
        type: "ASSET",
        description: {
          es: "Mobiliario relajación, sistemas de sonido ambiental, iluminación",
          fr: "Mobilier de relaxation, systèmes de son ambiant, éclairage",
          en: "Relaxation furniture, ambient sound systems, lighting"
        },
        level: 3,
        parentNumber: "215",
        isMonetary: true,
        allowsDirectEntry: true
      }
    ],

    // Modificaciones a cuentas existentes para adaptarlas al sector wellness
    accountModifications: {
      "700": {
        names: {
          es: "Ventas de Servicios de Bienestar",
          fr: "Ventes de Services de Bien-être",
          en: "Wellness Services Sales"
        }
      },
      "701": {
        names: {
          es: "Ventas de Productos Wellness",
          fr: "Ventes de Produits Bien-être",
          en: "Wellness Products Sales"
        }
      },
      "430": {
        names: {
          es: "Clientes - Servicios Spa y Bienestar",
          fr: "Clients - Services Spa et Bien-être",
          en: "Customers - Spa and Wellness Services"
        }
      },
      "629": {
        names: {
          es: "Otros Servicios Wellness",
          fr: "Autres Services Bien-être",
          en: "Other Wellness Services"
        }
      }
    },

    // Mapeos predeterminados para categorías de servicios/productos
    defaultMappings: {
      services: {
        // Tratamientos de spa
        "SPA_CIRCUIT": "4131",
        "HYDROTHERAPY": "4131",
        "THERMAL_TREATMENT": "4131",
        "BODY_WRAP": "4131",
        "BALNEOTHERAPY": "4131",
        // Terapias holísticas
        "REIKI": "4132",
        "REFLEXOLOGY": "4132",
        "ACUPUNCTURE": "4132",
        "ALTERNATIVE_THERAPY": "4132",
        "ENERGY_HEALING": "4132",
        // Masajes terapéuticos
        "THERAPEUTIC_MASSAGE": "4133",
        "SPORTS_MASSAGE": "4133",
        "HOT_STONE": "4133",
        "THAI_MASSAGE": "4133",
        "DEEP_TISSUE": "4133",
        // Programas de bienestar
        "WELLNESS_RETREAT": "4134",
        "DETOX_PROGRAM": "4134",
        "MEDITATION": "4134",
        "YOGA": "4134",
        "MINDFULNESS": "4134",
        // Membresías y paquetes
        "SPA_MEMBERSHIP": "4135",
        "WELLNESS_PACKAGE": "4135",
        "SPA_VOUCHER": "4135"
      },
      products: {
        // Aceites y aromaterapia
        "ESSENTIAL_OILS": "6041",
        "AROMATHERAPY": "6041",
        "MASSAGE_OILS": "6041",
        // Productos spa
        "BATH_SALTS": "6042",
        "THERMAL_MUD": "6042",
        "SEAWEED_PRODUCTS": "6042",
        "SPA_PRODUCTS": "6042",
        // Material terapias
        "ACUPUNCTURE_SUPPLIES": "6043",
        "HOT_STONES": "6043",
        "THERAPY_TOOLS": "6043",
        // Productos para venta
        "WELLNESS_PRODUCTS": "300",
        "RELAXATION_PRODUCTS": "300",
        "ORGANIC_COSMETICS": "300"
      }
    }
  }
}; 