/**
 * Script de migración para transferir datos de Client a Person
 * Este script:
 * 1. Crea registros Person para cada Client existente
 * 2. Crea registros PersonClientData con todos los datos del cliente
 * 3. Actualiza todas las referencias de clientId a personId en los modelos relacionados
 */

import { prisma, Prisma } from '@/lib/db';
// const prisma = new PrismaClient(); // MIGRADO: usar singleton desde @/lib/db

async function main() {
  console.log('🚀 Iniciando migración de Client a Person...')

  try {
    // Obtener todos los clientes existentes
    const clients = await prisma.client.findMany({
      include: {
        company: true,
        system: true,
      }
    })

    console.log(`📊 Encontrados ${clients.length} clientes para migrar`)

    for (const client of clients) {
      console.log(`\n🔄 Migrando cliente: ${client.firstName} ${client.lastName} (${client.id})`)

      // Verificar si ya existe una Person para este cliente
      const existingPerson = await prisma.person.findFirst({
        where: {
          AND: [
            { firstName: client.firstName },
            { lastName: client.lastName },
            { email: client.email || undefined },
            { systemId: client.systemId }
          ]
        }
      })

      let personId: string

      if (existingPerson) {
        console.log(`   ✅ Person ya existe: ${existingPerson.id}`)
        personId = existingPerson.id
      } else {
        // Crear nuevo registro Person
        const person = await prisma.person.create({
          data: {
            firstName: client.firstName,
            lastName: client.lastName,
            middleName: client.middleName,
            email: client.email,
            phone: client.phone,
            birthDate: client.birthDate,
            gender: client.gender,
            systemId: client.systemId,
            functionalRoles: {
              create: {
                role: 'CLIENT',
                clientData: {
                  create: {
                    avatar: client.avatar,
                    referenceCode: client.referenceCode,
                    nationalId: client.nationalId,
                    nationalIdType: client.nationalIdType,
                    address: client.address,
                    city: client.city,
                    state: client.state,
                    country: client.country,
                    zipCode: client.zipCode,
                    occupation: client.occupation,
                    insuranceCompany: client.insuranceCompany,
                    insuranceNumber: client.insuranceNumber,
                    referredBy: client.referredBy,
                    referralDetails: client.referralDetails,
                    marketingConsent: client.marketingConsent,
                    medicalNotes: client.medicalNotes,
                    allergies: client.allergies,
                    companyId: client.companyId,
                    leadScore: client.leadScore,
                    emergencyContactName: client.emergencyContactName,
                    emergencyContactPhone: client.emergencyContactPhone,
                    emergencyContactRelation: client.emergencyContactRelation,
                    preferredContactMethod: client.preferredContactMethod,
                    howDidYouHearAboutUs: client.howDidYouHearAboutUs,
                    notes: client.notes,
                    source: client.source,
                    language: client.language,
                    timezone: client.timezone,
                    tags: client.tags,
                    accountBalance: client.accountBalance,
                    creditLimit: client.creditLimit,
                    paymentTerms: client.paymentTerms,
                    taxExempt: client.taxExempt,
                    taxExemptionNumber: client.taxExemptionNumber,
                    customFields: client.customFields,
                    metadata: client.metadata,
                    active: client.active
                  }
                }
              }
            }
          }
        })

        console.log(`   ✅ Person creada: ${person.id}`)
        personId = person.id
      }

      // Actualizar referencias en todos los modelos relacionados
      console.log('   📝 Actualizando referencias...')

      // Appointments
      const appointmentsUpdated = await prisma.appointment.updateMany({
        where: { clientId: client.id },
        data: { personId }
      })
      console.log(`      - Appointments: ${appointmentsUpdated.count}`)

      // Tickets
      const ticketsUpdated = await prisma.ticket.updateMany({
        where: { clientId: client.id },
        data: { personId }
      })
      console.log(`      - Tickets: ${ticketsUpdated.count}`)

      // Invoices
      const invoicesUpdated = await prisma.invoice.updateMany({
        where: { clientId: client.id },
        data: { personId }
      })
      console.log(`      - Invoices: ${invoicesUpdated.count}`)

      // TimeLogs
      const timeLogsUpdated = await prisma.timeLog.updateMany({
        where: { clientId: client.id },
        data: { personId }
      })
      console.log(`      - TimeLogs: ${timeLogsUpdated.count}`)

      // BonoInstances
      const bonoInstancesUpdated = await prisma.bonoInstance.updateMany({
        where: { clientId: client.id },
        data: { personId }
      })
      console.log(`      - BonoInstances: ${bonoInstancesUpdated.count}`)

      // PackageInstances
      const packageInstancesUpdated = await prisma.packageInstance.updateMany({
        where: { clientId: client.id },
        data: { personId }
      })
      console.log(`      - PackageInstances: ${packageInstancesUpdated.count}`)

      // LoyaltyLedgers
      const loyaltyLedgersUpdated = await prisma.loyaltyLedger.updateMany({
        where: { clientId: client.id },
        data: { personId }
      })
      console.log(`      - LoyaltyLedgers: ${loyaltyLedgersUpdated.count}`)

      // DebtLedgers
      const debtLedgersUpdated = await prisma.debtLedger.updateMany({
        where: { clientId: client.id },
        data: { personId }
      })
      console.log(`      - DebtLedgers: ${debtLedgersUpdated.count}`)

      // Payments (como pagador)
      const paymentsUpdated = await prisma.payment.updateMany({
        where: { payerClientId: client.id },
        data: { payerPersonId: personId }
      })
      console.log(`      - Payments (como pagador): ${paymentsUpdated.count}`)

      // ClientRelations (como persona A)
      const relationsAUpdated = await prisma.clientRelation.updateMany({
        where: { clientAId: client.id },
        data: { personAId: personId }
      })
      console.log(`      - ClientRelations (como persona A): ${relationsAUpdated.count}`)

      // ClientRelations (como persona B)
      const relationsBUpdated = await prisma.clientRelation.updateMany({
        where: { clientBId: client.id },
        data: { personBId: personId }
      })
      console.log(`      - ClientRelations (como persona B): ${relationsBUpdated.count}`)
    }

    console.log('\n✅ Migración completada exitosamente!')

  } catch (error) {
    console.error('❌ Error durante la migración:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar la migración
main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
