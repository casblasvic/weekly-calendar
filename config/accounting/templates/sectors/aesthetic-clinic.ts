/**
 * Plantilla de personalización contable para CLÍNICAS ESTÉTICAS
 * 
 * Esta plantilla añade cuentas específicas para tratamientos estéticos,
 * equipamiento médico-estético, y categorías de servicios típicos.
 */

import { SectorTemplate, BusinessSector } from '@/types/accounting';

export const AESTHETIC_CLINIC_TEMPLATE: SectorTemplate = {
  sector: BusinessSector.AESTHETIC_CLINIC,
  names: {
    es: "Clínica Estética",
    fr: "Clinique Esthétique", 
    en: "Aesthetic Clinic"
  },
  description: {
    es: "Personalización contable especializada para clínicas de medicina estética",
    fr: "Personnalisation comptable spécialisée pour les cliniques de médecine esthétique",
    en: "Specialized accounting customization for aesthetic medicine clinics"
  },
  accountCustomizations: {
    // Cuentas adicionales específicas para clínicas estéticas
    additionalAccounts: [
      // === INGRESOS POR TIPO DE TRATAMIENTO ===
      {
        accountNumber: "4111",
        names: {
          es: "Ingresos Tratamientos Faciales",
          fr: "Revenus Soins du Visage",
          en: "Facial Treatments Revenue"
        },
        type: "REVENUE",
        description: {
          es: "Ingresos por tratamientos faciales (botox, ácido hialurónico, etc.)",
          fr: "Revenus des soins du visage (botox, acide hyaluronique, etc.)",
          en: "Revenue from facial treatments (botox, hyaluronic acid, etc.)"
        },
        level: 3,
        parentNumber: "411",
        isMonetary: true,
        allowsDirectEntry: true,
        serviceCategories: ["FACIAL_AESTHETICS", "FACIAL_TREATMENTS", "BOTOX", "FILLERS"],
        defaultForServices: false
      },
      {
        accountNumber: "4112", 
        names: {
          es: "Ingresos Tratamientos Corporales",
          fr: "Revenus Soins Corporels",
          en: "Body Treatments Revenue"
        },
        type: "REVENUE",
        description: {
          es: "Ingresos por tratamientos corporales (liposucción, mesoterapia, etc.)",
          fr: "Revenus des soins corporels (liposuccion, mésothérapie, etc.)",
          en: "Revenue from body treatments (liposuction, mesotherapy, etc.)"
        },
        level: 3,
        parentNumber: "411",
        isMonetary: true,
        allowsDirectEntry: true,
        serviceCategories: ["BODY_TREATMENTS", "LIPOSUCTION", "BODY_CONTOURING"],
        defaultForServices: false
      },
      {
        accountNumber: "4113",
        names: {
          es: "Ingresos Depilación Láser",
          fr: "Revenus Épilation Laser",
          en: "Laser Hair Removal Revenue"
        },
        type: "REVENUE",
        description: {
          es: "Ingresos por servicios de depilación láser",
          fr: "Revenus des services d'épilation au laser",
          en: "Revenue from laser hair removal services"
        },
        level: 3,
        parentNumber: "411",
        isMonetary: true,
        allowsDirectEntry: true,
        serviceCategories: ["LASER_HAIR_REMOVAL", "DEPILATION"],
        defaultForServices: false
      },
      {
        accountNumber: "4114",
        names: {
          es: "Ingresos Tratamientos Antienvejecimiento",
          fr: "Revenus Soins Anti-âge",
          en: "Anti-aging Treatments Revenue"
        },
        type: "REVENUE",
        description: {
          es: "Ingresos por tratamientos antienvejecimiento y rejuvenecimiento",
          fr: "Revenus des soins anti-âge et rajeunissement",
          en: "Revenue from anti-aging and rejuvenation treatments"
        },
        level: 3,
        parentNumber: "411",
        isMonetary: true,
        allowsDirectEntry: true,
        serviceCategories: ["ANTI_AGING", "REJUVENATION", "SKIN_TIGHTENING"],
        defaultForServices: false
      },

      // === GASTOS ESPECÍFICOS DE MATERIAL MÉDICO-ESTÉTICO ===
      {
        accountNumber: "6021",
        names: {
          es: "Compras Material Inyectable",
          fr: "Achats Matériel Injectable",
          en: "Injectable Materials Purchases"
        },
        type: "EXPENSE",
        description: {
          es: "Compras de botox, ácido hialurónico y otros materiales inyectables",
          fr: "Achats de botox, acide hyaluronique et autres matériaux injectables",
          en: "Purchases of botox, hyaluronic acid and other injectable materials"
        },
        level: 3,
        parentNumber: "602",
        isMonetary: true,
        allowsDirectEntry: true,
        productCategories: ["INJECTABLES", "BOTOX", "FILLERS"],
        defaultForProducts: false
      },
      {
        accountNumber: "6022",
        names: {
          es: "Compras Material Láser y Consumibles",
          fr: "Achats Matériel Laser et Consommables",
          en: "Laser Materials and Consumables"
        },
        type: "EXPENSE",
        description: {
          es: "Material y consumibles para equipos láser",
          fr: "Matériel et consommables pour équipements laser",
          en: "Materials and consumables for laser equipment"
        },
        level: 3,
        parentNumber: "602",
        isMonetary: true,
        allowsDirectEntry: true,
        productCategories: ["LASER_CONSUMABLES", "LASER_MATERIALS"],
        defaultForProducts: false
      },

      // === ACTIVOS - EQUIPAMIENTO MÉDICO-ESTÉTICO ===
      {
        accountNumber: "2131",
        names: {
          es: "Equipos Láser Médico",
          fr: "Équipements Laser Médical",
          en: "Medical Laser Equipment"
        },
        type: "ASSET",
        description: {
          es: "Equipamiento láser para tratamientos médico-estéticos",
          fr: "Équipement laser pour traitements médico-esthétiques",
          en: "Laser equipment for medical-aesthetic treatments"
        },
        level: 3,
        parentNumber: "213",
        isMonetary: true,
        allowsDirectEntry: true
      },
      {
        accountNumber: "2132",
        names: {
          es: "Equipos de Radiofrecuencia y Ultrasonido",
          fr: "Équipements Radiofréquence et Ultrasons",
          en: "Radiofrequency and Ultrasound Equipment"
        },
        type: "ASSET",
        description: {
          es: "Equipos de radiofrecuencia, HIFU y ultrasonido",
          fr: "Équipements de radiofréquence, HIFU et ultrasons",
          en: "Radiofrequency, HIFU and ultrasound equipment"
        },
        level: 3,
        parentNumber: "213",
        isMonetary: true,
        allowsDirectEntry: true
      }
    ],

    // Modificaciones a cuentas existentes para mayor claridad en clínicas estéticas
    accountModifications: {
      "700": {
        names: {
          es: "Ventas de Tratamientos Estéticos",
          fr: "Ventes de Soins Esthétiques",
          en: "Aesthetic Treatment Sales"
        }
      },
      "701": {
        names: {
          es: "Ventas de Productos Cosméticos",
          fr: "Ventes de Produits Cosmétiques",
          en: "Cosmetic Product Sales"
        }
      }
    },

    // Mapeos predeterminados para categorías de servicios/productos
    defaultMappings: {
      services: {
        "FACIAL_AESTHETICS": "4111",
        "FACIAL_TREATMENTS": "4111",
        "BOTOX": "4111",
        "FILLERS": "4111",
        "BODY_TREATMENTS": "4112",
        "LIPOSUCTION": "4112",
        "BODY_CONTOURING": "4112",
        "LASER_HAIR_REMOVAL": "4113",
        "DEPILATION": "4113",
        "ANTI_AGING": "4114",
        "REJUVENATION": "4114",
        "SKIN_TIGHTENING": "4114",
        "MEDICAL_CONSULTATION": "411"  // Consultas médicas van a la cuenta general
      },
      products: {
        "INJECTABLES": "6021",
        "BOTOX": "6021",
        "FILLERS": "6021",
        "LASER_CONSUMABLES": "6022",
        "COSMETICS": "300",  // Productos cosméticos para venta van a inventario
        "SKINCARE": "300",
        "MEDICAL_SUPPLIES": "603"  // Material médico general
      }
    }
  }
}; 