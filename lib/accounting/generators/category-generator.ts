import { 
  BusinessFeatures, 
  ServiceCategory, 
  ProductFamily 
} from './types';

export class CategoryGenerator {
  generateServiceCategories(features: BusinessFeatures): ServiceCategory[] {
    const categories: ServiceCategory[] = [];

    // Siempre añadir categorías base
    categories.push({
      code: 'CONSULTAS',
      name: {
        es: 'Consultas',
        fr: 'Consultations',
        en: 'Consultations'
      },
      description: {
        es: 'Consultas generales y asesoramiento',
        fr: 'Consultations générales et conseils',
        en: 'General consultations and advice'
      },
      isActive: true
    });

    // Si tiene consultas médicas
    if (features.hasConsultationServices) {
      categories.push({
        code: 'CONSULTAS_MED',
        name: {
          es: 'Consultas médicas',
          fr: 'Consultations médicales',
          en: 'Medical consultations'
        },
        description: {
          es: 'Consultas médicas especializadas',
          fr: 'Consultations médicales spécialisées',
          en: 'Specialized medical consultations'
        },
        isActive: true
      });
    }

    // Si tiene tratamientos médicos
    if (features.hasMedicalTreatments) {
      categories.push(
        {
          code: 'TRAT_MED',
          name: {
            es: 'Tratamientos médicos',
            fr: 'Traitements médicaux',
            en: 'Medical treatments'
          },
          description: {
            es: 'Tratamientos médicos generales',
            fr: 'Traitements médicaux généraux',
            en: 'General medical treatments'
          },
          isActive: true
        },
        {
          code: 'MED_EST',
          name: {
            es: 'Medicina estética',
            fr: 'Médecine esthétique',
            en: 'Aesthetic medicine'
          },
          description: {
            es: 'Tratamientos de medicina estética',
            fr: 'Traitements de médecine esthétique',
            en: 'Aesthetic medicine treatments'
          },
          isActive: true
        }
      );
    }

    // Tratamientos estéticos generales (siempre)
    categories.push(
      {
        code: 'TRAT_FACIAL',
        name: {
          es: 'Tratamientos faciales',
          fr: 'Soins du visage',
          en: 'Facial treatments'
        },
        description: {
          es: 'Tratamientos faciales y cuidado de la piel',
          fr: 'Soins du visage et de la peau',
          en: 'Facial treatments and skin care'
        },
        isActive: true
      },
      {
        code: 'TRAT_CORPORAL',
        name: {
          es: 'Tratamientos corporales',
          fr: 'Soins du corps',
          en: 'Body treatments'
        },
        description: {
          es: 'Tratamientos corporales y modelado',
          fr: 'Soins du corps et modelage',
          en: 'Body treatments and shaping'
        },
        isActive: true
      }
    );

    // Depilación (siempre)
    categories.push({
      code: 'DEPILACION',
      name: {
        es: 'Depilación',
        fr: 'Épilation',
        en: 'Hair removal'
      },
      description: {
        es: 'Servicios de depilación láser y convencional',
        fr: 'Services d\'épilation laser et conventionnelle',
        en: 'Laser and conventional hair removal services'
      },
      isActive: true
    });

    // Servicios de uñas (siempre)
    categories.push({
      code: 'MANICURA',
      name: {
        es: 'Manicura y pedicura',
        fr: 'Manucure et pédicure',
        en: 'Manicure and pedicure'
      },
      description: {
        es: 'Servicios de manicura, pedicura y nail art',
        fr: 'Services de manucure, pédicure et nail art',
        en: 'Manicure, pedicure and nail art services'
      },
      isActive: true
    });

    // Si tiene peluquería
    if (features.hasHairSalon) {
      categories.push(
        {
          code: 'CORTE_PELO',
          name: {
            es: 'Corte de pelo',
            fr: 'Coupe de cheveux',
            en: 'Haircut'
          },
          description: {
            es: 'Corte y peinado de cabello',
            fr: 'Coupe et coiffure',
            en: 'Haircut and styling'
          },
          isActive: true
        },
        {
          code: 'COLOR_PELO',
          name: {
            es: 'Coloración',
            fr: 'Coloration',
            en: 'Hair coloring'
          },
          description: {
            es: 'Coloración, mechas y tratamientos capilares',
            fr: 'Coloration, mèches et soins capillaires',
            en: 'Hair coloring, highlights and treatments'
          },
          isActive: true
        }
      );
    }

    // Si tiene spa
    if (features.hasSpa) {
      categories.push(
        {
          code: 'MASAJES',
          name: {
            es: 'Masajes',
            fr: 'Massages',
            en: 'Massages'
          },
          description: {
            es: 'Masajes relajantes y terapéuticos',
            fr: 'Massages relaxants et thérapeutiques',
            en: 'Relaxing and therapeutic massages'
          },
          isActive: true
        },
        {
          code: 'CIRCUITOS',
          name: {
            es: 'Circuitos spa',
            fr: 'Circuits spa',
            en: 'Spa circuits'
          },
          description: {
            es: 'Circuitos de spa, saunas y aguas',
            fr: 'Circuits spa, saunas et eaux',
            en: 'Spa circuits, saunas and waters'
          },
          isActive: true
        }
      );
    }

    return categories;
  }

  generateProductFamilies(features: BusinessFeatures): ProductFamily[] {
    const families: ProductFamily[] = [];

    // Siempre añadir cosmética básica
    families.push(
      {
        code: 'COSM_FACIAL',
        name: {
          es: 'Cosmética facial',
          fr: 'Cosmétique visage',
          en: 'Facial cosmetics'
        },
        description: {
          es: 'Productos de cosmética facial',
          fr: 'Produits cosmétiques pour le visage',
          en: 'Facial cosmetic products'
        },
        isForSale: features.sellsProducts,
        isConsumable: true,
        isActive: true
      },
      {
        code: 'COSM_CORPORAL',
        name: {
          es: 'Cosmética corporal',
          fr: 'Cosmétique corps',
          en: 'Body cosmetics'
        },
        description: {
          es: 'Productos de cosmética corporal',
          fr: 'Produits cosmétiques pour le corps',
          en: 'Body cosmetic products'
        },
        isForSale: features.sellsProducts,
        isConsumable: true,
        isActive: true
      }
    );

    // Si tiene peluquería
    if (features.hasHairSalon) {
      families.push({
        code: 'PROD_CAPILAR',
        name: {
          es: 'Productos capilares',
          fr: 'Produits capillaires',
          en: 'Hair products'
        },
        description: {
          es: 'Champús, acondicionadores y tratamientos',
          fr: 'Shampooings, après-shampooings et soins',
          en: 'Shampoos, conditioners and treatments'
        },
        isForSale: features.sellsProducts,
        isConsumable: true,
        isActive: true
      });
    }

    // Si tiene tratamientos médicos, añadir aparatología
    if (features.hasMedicalTreatments) {
      families.push({
        code: 'APARATOLOGIA',
        name: {
          es: 'Aparatología',
          fr: 'Appareils',
          en: 'Equipment'
        },
        description: {
          es: 'Equipos médico-estéticos',
          fr: 'Équipements médico-esthétiques',
          en: 'Medical-aesthetic equipment'
        },
        isForSale: false,
        isConsumable: false,
        isActive: true
      });
    }

    // Material sanitario (siempre para consumibles)
    families.push({
      code: 'MAT_SANITARIO',
      name: {
        es: 'Material sanitario',
        fr: 'Matériel sanitaire',
        en: 'Sanitary material'
      },
      description: {
        es: 'Material desechable y sanitario',
        fr: 'Matériel jetable et sanitaire',
        en: 'Disposable and sanitary material'
      },
      isForSale: false,
      isConsumable: true,
      isActive: true
    });

    // Otros productos (siempre por flexibilidad)
    families.push({
      code: 'OTROS_PROD',
      name: {
        es: 'Otros productos',
        fr: 'Autres produits',
        en: 'Other products'
      },
      description: {
        es: 'Otros productos y accesorios',
        fr: 'Autres produits et accessoires',
        en: 'Other products and accessories'
      },
      isForSale: features.sellsProducts,
      isConsumable: false,
      isActive: true
    });

    // Si vende productos, añadir categorías adicionales
    if (features.sellsProducts) {
      families.push(
        {
          code: 'PERFUMERIA',
          name: {
            es: 'Perfumería',
            fr: 'Parfumerie',
            en: 'Perfumery'
          },
          description: {
            es: 'Perfumes y fragancias',
            fr: 'Parfums et fragrances',
            en: 'Perfumes and fragrances'
          },
          isForSale: true,
          isConsumable: false,
          isActive: true
        },
        {
          code: 'ACCESORIOS',
          name: {
            es: 'Accesorios',
            fr: 'Accessoires',
            en: 'Accessories'
          },
          description: {
            es: 'Accesorios de belleza y bienestar',
            fr: 'Accessoires de beauté et bien-être',
            en: 'Beauty and wellness accessories'
          },
          isForSale: true,
          isConsumable: false,
          isActive: true
        }
      );
    }

    return families;
  }
}

export function generateCategories(features: BusinessFeatures): {
  serviceCategories: ServiceCategory[];
  productFamilies: ProductFamily[];
} {
  const generator = new CategoryGenerator();
  return {
    serviceCategories: generator.generateServiceCategories(features),
    productFamilies: generator.generateProductFamilies(features)
  };
}
