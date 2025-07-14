/**
 * 🏢 SEED DE COMPANIES
 * Datos de empresas de ejemplo para desarrollo y testing.
 * 
 * IMPORTANTE: Todas las empresas incluyen systemId para multi-tenant
 * y datos fiscales completos para facturación.
 * 
 * @see docs/PERSON_IDENTITY_MANAGEMENT.md
 */

import { prisma } from '@/lib/db';
import { createId } from '@paralleldrive/cuid2';

export async function seedCompanies(systemId: string) {
  console.log('🏢 Seeding companies...');

  const companies = [
    {
      id: createId(),
      fiscalName: 'Estética Avanzada Madrid S.L.',
      taxId: 'B12345678',
      address: 'Calle Serrano, 45',
      city: 'Madrid',
      postalCode: '28001',
      countryIsoCode: 'ES',
      phone: '+34 91 123 45 67',
      email: 'info@esteticamadrid.com',
      website: 'https://www.esteticamadrid.com',
      notes: 'Centro de estética y belleza especializado en tratamientos faciales',
      systemId
    },
    {
      id: createId(),
      fiscalName: 'Clínica Dental Barcelona S.L.',
      taxId: 'B87654321',
      address: 'Passeig de Gràcia, 123',
      city: 'Barcelona',
      postalCode: '08008',
      countryIsoCode: 'ES',
      phone: '+34 93 987 65 43',
      email: 'contacto@dentalbcn.com',
      website: 'https://www.dentalbcn.com',
      notes: 'Clínica dental con servicios de odontología general y estética',
      systemId
    },
    {
      id: createId(),
      fiscalName: 'Belleza Integral Valencia S.L.',
      taxId: 'B11223344',
      address: 'Avenida del Puerto, 78',
      city: 'Valencia',
      postalCode: '46021',
      countryIsoCode: 'ES',
      phone: '+34 96 321 54 87',
      email: 'hola@bellezavalencia.com',
      website: 'https://www.bellezavalencia.com',
      notes: 'Centro integral de belleza y bienestar',
      systemId
    },
    {
      id: createId(),
      fiscalName: 'Spa Wellness Sevilla S.L.',
      taxId: 'B55667788',
      address: 'Calle Betis, 34',
      city: 'Sevilla',
      postalCode: '41010',
      countryIsoCode: 'ES',
      phone: '+34 95 456 78 90',
      email: 'reservas@spawellness.com',
      website: 'https://www.spawellness.com',
      notes: 'Spa y centro de wellness con tratamientos relajantes',
      systemId
    },
    {
      id: createId(),
      fiscalName: 'Centro Médico Estético Bilbao S.L.',
      taxId: 'B99887766',
      address: 'Gran Vía, 12',
      city: 'Bilbao',
      postalCode: '48001',
      countryIsoCode: 'ES',
      phone: '+34 94 123 45 67',
      email: 'info@medicoestetico.com',
      website: 'https://www.medicoestetico.com',
      notes: 'Centro médico especializado en medicina estética',
      systemId
    },
    {
      id: createId(),
      fiscalName: 'Laboratorios Cosméticos Naturales S.A.',
      taxId: 'A12398765',
      address: 'Polígono Industrial Las Rosas, Nave 15',
      city: 'Getafe',
      postalCode: '28906',
      countryIsoCode: 'ES',
      phone: '+34 91 654 32 10',
      email: 'ventas@cosmeticosnaturales.com',
      website: 'https://www.cosmeticosnaturales.com',
      notes: 'Proveedor de productos cosméticos naturales y orgánicos',
      systemId
    },
    {
      id: createId(),
      fiscalName: 'Equipos Médicos Profesionales S.L.',
      taxId: 'B45612378',
      address: 'Calle de la Industria, 89',
      city: 'Zaragoza',
      postalCode: '50014',
      countryIsoCode: 'ES',
      phone: '+34 976 543 21 09',
      email: 'comercial@equiposmedicos.com',
      website: 'https://www.equiposmedicos.com',
      notes: 'Distribuidor de equipamiento médico y estético',
      systemId
    },
    {
      id: createId(),
      fiscalName: 'Formación Estética Avanzada S.L.',
      taxId: 'B78945612',
      address: 'Calle Alcalá, 567',
      city: 'Madrid',
      postalCode: '28028',
      countryIsoCode: 'ES',
      phone: '+34 91 789 45 61',
      email: 'cursos@formacionestetica.com',
      website: 'https://www.formacionestetica.com',
      notes: 'Academia especializada en formación para profesionales de la estética',
      systemId
    }
  ];

  for (const companyData of companies) {
    try {
      // Verificar si ya existe una empresa con el mismo taxId
      const existingCompany = await prisma.company.findFirst({
        where: {
          taxId: companyData.taxId,
          systemId
        }
      });

      if (!existingCompany) {
        await prisma.company.create({
          data: companyData
        });
        console.log(`✅ Company created: ${companyData.fiscalName}`);
      } else {
        console.log(`⚠️  Company already exists: ${companyData.fiscalName}`);
      }
    } catch (error) {
      console.error(`❌ Error creating company ${companyData.fiscalName}:`, error);
    }
  }

  console.log('🏢 Companies seeding completed');
} 