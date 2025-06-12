import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Datos de países con información completa
const countriesData = [
  // Europa
  { isoCode: 'ES', name: 'España', timezone: 'Europe/Madrid', phoneCode: '+34', languageCode: 'es', languageName: 'Español', currencyCode: 'EUR', currencyName: 'Euro', currencySymbol: '€' },
  { isoCode: 'FR', name: 'Francia', timezone: 'Europe/Paris', phoneCode: '+33', languageCode: 'fr', languageName: 'Francés', currencyCode: 'EUR', currencyName: 'Euro', currencySymbol: '€' },
  { isoCode: 'DE', name: 'Alemania', timezone: 'Europe/Berlin', phoneCode: '+49', languageCode: 'de', languageName: 'Alemán', currencyCode: 'EUR', currencyName: 'Euro', currencySymbol: '€' },
  { isoCode: 'IT', name: 'Italia', timezone: 'Europe/Rome', phoneCode: '+39', languageCode: 'it', languageName: 'Italiano', currencyCode: 'EUR', currencyName: 'Euro', currencySymbol: '€' },
  { isoCode: 'GB', name: 'Reino Unido', timezone: 'Europe/London', phoneCode: '+44', languageCode: 'en', languageName: 'Inglés', currencyCode: 'GBP', currencyName: 'Pound Sterling', currencySymbol: '£' },
  { isoCode: 'PT', name: 'Portugal', timezone: 'Europe/Lisbon', phoneCode: '+351', languageCode: 'pt', languageName: 'Portugués', currencyCode: 'EUR', currencyName: 'Euro', currencySymbol: '€' },
  { isoCode: 'IE', name: 'Irlanda', timezone: 'Europe/Dublin', phoneCode: '+353', languageCode: 'en', languageName: 'Inglés', currencyCode: 'EUR', currencyName: 'Euro', currencySymbol: '€' },
  { isoCode: 'NL', name: 'Países Bajos', timezone: 'Europe/Amsterdam', phoneCode: '+31', languageCode: 'nl', languageName: 'Neerlandés', currencyCode: 'EUR', currencyName: 'Euro', currencySymbol: '€' },
  { isoCode: 'BE', name: 'Bélgica', timezone: 'Europe/Brussels', phoneCode: '+32', languageCode: 'nl', languageName: 'Neerlandés', currencyCode: 'EUR', currencyName: 'Euro', currencySymbol: '€' }, // Note: Multiple official languages
  { isoCode: 'LU', name: 'Luxemburgo', timezone: 'Europe/Luxembourg', phoneCode: '+352', languageCode: 'lb', languageName: 'Luxemburgués', currencyCode: 'EUR', currencyName: 'Euro', currencySymbol: '€' }, // Note: Multiple languages
  { isoCode: 'CH', name: 'Suiza', timezone: 'Europe/Zurich', phoneCode: '+41', languageCode: 'de', languageName: 'Alemán', currencyCode: 'CHF', currencyName: 'Swiss Franc', currencySymbol: 'CHF' }, // Note: Multiple languages
  { isoCode: 'AT', name: 'Austria', timezone: 'Europe/Vienna', phoneCode: '+43', languageCode: 'de', languageName: 'Alemán', currencyCode: 'EUR', currencyName: 'Euro', currencySymbol: '€' },
  { isoCode: 'PL', name: 'Polonia', timezone: 'Europe/Warsaw', phoneCode: '+48', languageCode: 'pl', languageName: 'Polaco', currencyCode: 'PLN', currencyName: 'Polish Złoty', currencySymbol: 'zł' },
  { isoCode: 'SE', name: 'Suecia', timezone: 'Europe/Stockholm', phoneCode: '+46', languageCode: 'sv', languageName: 'Sueco', currencyCode: 'SEK', currencyName: 'Swedish Krona', currencySymbol: 'kr' },
  { isoCode: 'NO', name: 'Noruega', timezone: 'Europe/Oslo', phoneCode: '+47', languageCode: 'no', languageName: 'Noruego', currencyCode: 'NOK', currencyName: 'Norwegian Krone', currencySymbol: 'kr' },
  { isoCode: 'DK', name: 'Dinamarca', timezone: 'Europe/Copenhagen', phoneCode: '+45', languageCode: 'da', languageName: 'Danés', currencyCode: 'DKK', currencyName: 'Danish Krone', currencySymbol: 'kr' },
  { isoCode: 'FI', name: 'Finlandia', timezone: 'Europe/Helsinki', phoneCode: '+358', languageCode: 'fi', languageName: 'Finlandés', currencyCode: 'EUR', currencyName: 'Euro', currencySymbol: '€' },
  { isoCode: 'GR', name: 'Grecia', timezone: 'Europe/Athens', phoneCode: '+30', languageCode: 'el', languageName: 'Griego', currencyCode: 'EUR', currencyName: 'Euro', currencySymbol: '€' },

  // América del Norte
  { isoCode: 'US', name: 'Estados Unidos', timezone: 'America/New_York', phoneCode: '+1', languageCode: 'en', languageName: 'Inglés', currencyCode: 'USD', currencyName: 'US Dollar', currencySymbol: '$' }, // Note: Multiple timezones
  { isoCode: 'CA', name: 'Canadá', timezone: 'America/Toronto', phoneCode: '+1', languageCode: 'en', languageName: 'Inglés', currencyCode: 'CAD', currencyName: 'Canadian Dollar', currencySymbol: '$' }, // Note: Multiple timezones, bilingual
  { isoCode: 'MX', name: 'México', timezone: 'America/Mexico_City', phoneCode: '+52', languageCode: 'es', languageName: 'Español', currencyCode: 'MXN', currencyName: 'Mexican Peso', currencySymbol: '$' }, // Note: Multiple timezones

  // América Latina
  { isoCode: 'BR', name: 'Brasil', timezone: 'America/Sao_Paulo', phoneCode: '+55', languageCode: 'pt', languageName: 'Portugués', currencyCode: 'BRL', currencyName: 'Brazilian Real', currencySymbol: 'R$' }, // Note: Multiple timezones
  { isoCode: 'AR', name: 'Argentina', timezone: 'America/Argentina/Buenos_Aires', phoneCode: '+54', languageCode: 'es', languageName: 'Español', currencyCode: 'ARS', currencyName: 'Argentine Peso', currencySymbol: '$' },
  { isoCode: 'CO', name: 'Colombia', timezone: 'America/Bogota', phoneCode: '+57', languageCode: 'es', languageName: 'Español', currencyCode: 'COP', currencyName: 'Colombian Peso', currencySymbol: '$' },
  { isoCode: 'CL', name: 'Chile', timezone: 'America/Santiago', phoneCode: '+56', languageCode: 'es', languageName: 'Español', currencyCode: 'CLP', currencyName: 'Chilean Peso', currencySymbol: '$' },
  { isoCode: 'PE', name: 'Perú', timezone: 'America/Lima', phoneCode: '+51', languageCode: 'es', languageName: 'Español', currencyCode: 'PEN', currencyName: 'Peruvian Sol', currencySymbol: 'S/' },
  { isoCode: 'VE', name: 'Venezuela', timezone: 'America/Caracas', phoneCode: '+58', languageCode: 'es', languageName: 'Español', currencyCode: 'VES', currencyName: 'Venezuelan Bolívar Soberano', currencySymbol: 'Bs.' }, // Official VES
  { isoCode: 'EC', name: 'Ecuador', timezone: 'America/Guayaquil', phoneCode: '+593', languageCode: 'es', languageName: 'Español', currencyCode: 'USD', currencyName: 'US Dollar', currencySymbol: '$' }, // Ecuador uses USD
  { isoCode: 'UY', name: 'Uruguay', timezone: 'America/Montevideo', phoneCode: '+598', languageCode: 'es', languageName: 'Español', currencyCode: 'UYU', currencyName: 'Uruguayan Peso', currencySymbol: '$U' },
  { isoCode: 'PY', name: 'Paraguay', timezone: 'America/Asuncion', phoneCode: '+595', languageCode: 'es', languageName: 'Español', currencyCode: 'PYG', currencyName: 'Paraguayan Guaraní', currencySymbol: '₲' }, // Note: Guarani also official
  { isoCode: 'BO', name: 'Bolivia', timezone: 'America/La_Paz', phoneCode: '+591', languageCode: 'es', languageName: 'Español', currencyCode: 'BOB', currencyName: 'Bolivian Boliviano', currencySymbol: 'Bs.' }, // Note: Multiple indigenous languages
  { isoCode: 'CR', name: 'Costa Rica', timezone: 'America/Costa_Rica', phoneCode: '+506', languageCode: 'es', languageName: 'Español', currencyCode: 'CRC', currencyName: 'Costa Rican Colón', currencySymbol: '₡' },
  { isoCode: 'PA', name: 'Panamá', timezone: 'America/Panama', phoneCode: '+507', languageCode: 'es', languageName: 'Español', currencyCode: 'USD', currencyName: 'US Dollar', currencySymbol: '$' }, // Panama uses USD primarily
  { isoCode: 'DO', name: 'República Dominicana', timezone: 'America/Santo_Domingo', phoneCode: '+1-809', languageCode: 'es', languageName: 'Español', currencyCode: 'DOP', currencyName: 'Dominican Peso', currencySymbol: 'RD$' }, // Shared code
  { isoCode: 'GT', name: 'Guatemala', timezone: 'America/Guatemala', phoneCode: '+502', languageCode: 'es', languageName: 'Español', currencyCode: 'GTQ', currencyName: 'Guatemalan Quetzal', currencySymbol: 'Q' }, // Note: Multiple Mayan languages

  // Oceanía
  { isoCode: 'AU', name: 'Australia', timezone: 'Australia/Sydney', phoneCode: '+61', languageCode: 'en', languageName: 'Inglés', currencyCode: 'AUD', currencyName: 'Australian Dollar', currencySymbol: '$' }, // Note: Multiple timezones
  { isoCode: 'NZ', name: 'Nueva Zelanda', timezone: 'Pacific/Auckland', phoneCode: '+64', languageCode: 'en', languageName: 'Inglés', currencyCode: 'NZD', currencyName: 'New Zealand Dollar', currencySymbol: '$' }, // Note: Maori also official

  // Asia (Ejemplos)
  { isoCode: 'JP', name: 'Japón', timezone: 'Asia/Tokyo', phoneCode: '+81', languageCode: 'ja', languageName: 'Japonés', currencyCode: 'JPY', currencyName: 'Japanese Yen', currencySymbol: '¥' },
  { isoCode: 'KR', name: 'Corea del Sur', timezone: 'Asia/Seoul', phoneCode: '+82', languageCode: 'ko', languageName: 'Coreano', currencyCode: 'KRW', currencyName: 'South Korean Won', currencySymbol: '₩' },
  { isoCode: 'SG', name: 'Singapur', timezone: 'Asia/Singapore', phoneCode: '+65', languageCode: 'en', languageName: 'Inglés', currencyCode: 'SGD', currencyName: 'Singapore Dollar', currencySymbol: '$' }, // Note: Multiple languages
  { isoCode: 'AE', name: 'Emiratos Árabes Unidos', timezone: 'Asia/Dubai', phoneCode: '+971', languageCode: 'ar', languageName: 'Árabe', currencyCode: 'AED', currencyName: 'UAE Dirham', currencySymbol: 'د.إ' },

  // África (Ejemplos)
  { isoCode: 'ZA', name: 'Sudáfrica', timezone: 'Africa/Johannesburg', phoneCode: '+27', languageCode: 'en', languageName: 'Inglés', currencyCode: 'ZAR', currencyName: 'South African Rand', currencySymbol: 'R' }, // Note: Multiple languages
  { isoCode: 'MA', name: 'Marruecos', timezone: 'Africa/Casablanca', phoneCode: '+212', languageCode: 'ar', languageName: 'Árabe', currencyCode: 'MAD', currencyName: 'Moroccan Dirham', currencySymbol: 'د.م.' },
];

/**
 * Puebla la tabla CountryInfo con datos de países
 * @param systemId ID del sistema al que pertenecen los países (opcional para CountryInfo)
 */
export async function seedCountries() {
  console.log('🌍 Iniciando población de países...');
  
  let createdCount = 0;
  let updatedCount = 0;
  let errorCount = 0;

  for (const country of countriesData) {
    try {
      const existingCountry = await prisma.countryInfo.findUnique({
        where: { isoCode: country.isoCode },
      });

      if (existingCountry) {
        await prisma.countryInfo.update({
          where: { isoCode: country.isoCode },
          data: country,
        });
        updatedCount++;
        console.log(`  ✓ Actualizado país: ${country.name} (${country.isoCode})`);
      } else {
        await prisma.countryInfo.create({
          data: country,
        });
        createdCount++;
        console.log(`  ✓ Creado país: ${country.name} (${country.isoCode})`);
      }
    } catch (error) {
      errorCount++;
      console.error(`  ✗ Error con país ${country.name} (${country.isoCode}):`, error);
    }
  }

  console.log('\n📊 Resumen de países:');
  console.log(`  - Países creados: ${createdCount}`);
  console.log(`  - Países actualizados: ${updatedCount}`);
  console.log(`  - Errores: ${errorCount}`);
  console.log(`  - Total procesados: ${countriesData.length}`);
  
  return {
    created: createdCount,
    updated: updatedCount,
    errors: errorCount,
    total: countriesData.length
  };
}
