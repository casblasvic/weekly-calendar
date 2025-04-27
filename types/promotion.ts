import { 
  Promotion, 
  PromotionAccumulationMode, 
  Clinic, 
  PromotionCompatibility, 
  Service, 
  Product, 
  Category, 
  Tariff, 
  BonoDefinition, 
  PackageDefinition 
} from '@prisma/client';

// Tipo auxiliar para simplificar relaciones con solo nombre
type NameOnlyRelation = { name: string } | null | undefined;

// Definición para la relación de clínicas aplicables (como devuelve la API)
type ApplicableClinicInfo = {
  clinic: {
    name: string;
  };
};

// Definición para la relación de compatibilidades definidas (como devuelve la API)
type DefinedCompatibilityInfo = {
  compatiblePromotion: {
    name: string;
  };
};

// Definición centralizada del tipo Promotion con relaciones comunes
export type PromotionWithRelations = Promotion & {
  // <<< ELIMINAR: Relación clinic antigua (si existía) >>>
  // clinic?: Pick<Clinic, 'name'> | null; 
  
  // <<< AÑADIR: Lista de clínicas aplicables >>>
  applicableClinics?: ApplicableClinicInfo[];

  // <<< AÑADIR: Lista de compatibilidades definidas >>>
  definedCompatibilities?: DefinedCompatibilityInfo[];
  
  // Asegurarse de que el modo de acumulación está presente (ya debería estar en Promotion)
  accumulationMode: PromotionAccumulationMode | null; // O el tipo exacto si no puede ser null

  // <<< AÑADIDO: Tipos para los objetivos con solo nombre >>>
  targetService?: NameOnlyRelation;
  targetProduct?: NameOnlyRelation;
  targetCategory?: NameOnlyRelation;
  targetTariff?: NameOnlyRelation;
  targetBonoDefinition?: NameOnlyRelation;
  targetPackageDefinition?: NameOnlyRelation;
  // bogoGetService?: NameOnlyRelation;
  // bogoGetProduct?: NameOnlyRelation;

  // Añadir otras relaciones aquí si son necesarias frecuentemente
  // targetService?: Pick<Service, 'name'> | null;
  // targetProduct?: Pick<Product, 'name'> | null;
}; 