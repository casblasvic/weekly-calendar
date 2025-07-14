/**
 * 📚 EJEMPLO: SISTEMA DE PROXIES DE CONTACTO
 * =========================================
 * 
 * Ejemplos de uso del sistema de proxies para casos como:
 * - Madre que actúa como contacto para su hija menor
 * - Hermanas donde una es el contacto para ambas
 * - Amigas donde una gestiona las citas de todas
 * 
 * 🎯 CASOS DE USO REALES:
 * 1. Menor de edad sin datos de contacto
 * 2. Personas sin email/teléfono
 * 3. Grupos familiares o de amigas
 * 4. Representantes legales
 */

const { PrismaClient } = require('@prisma/client')
const { 
  validatePersonUniqueness, 
  createContactProxy, 
  getEffectiveContactData,
  getPersonsUnderProxy,
  createPersonWithValidation
} = require('../lib/person-validation')

const prisma = new PrismaClient()

async function exampleUsage() {
  console.log('📚 [EXAMPLE] Iniciando ejemplos de uso del sistema de proxies...')
  
  const systemId = 'cmcrzqlis0006y23ao160z5rb' // Usar systemId real
  
  try {
    // ============================================================================
    // 🎯 CASO 1: MADRE E HIJA MENOR DE EDAD
    // ============================================================================
    
    console.log('\n👩‍👧 [CASO 1] Madre e hija menor de edad')
    
    // 1. Crear la madre (con datos de contacto completos)
    const madreData = {
      systemId,
      firstName: 'Carmen',
      lastName: 'González',
      email: 'carmen.gonzalez@email.com',
      phone: '+34666123456',
      birthDate: new Date('1985-03-15'),
      address: 'Calle Mayor 123',
      city: 'Madrid'
    }
    
    const madre = await createPersonWithValidation(madreData)
    console.log(`✅ [MADRE] Creada: ${madre.firstName} ${madre.lastName}`)
    
    // 2. Crear la hija (SIN datos de contacto)
    const hijaData = {
      systemId,
      firstName: 'Sofía',
      lastName: 'González',
      birthDate: new Date('2010-08-20'),
      gender: 'female',
      // NO tiene email, phone, ni ningún dato de contacto
    }
    
    const hija = await createPersonWithValidation(hijaData)
    console.log(`✅ [HIJA] Creada: ${hija.firstName} ${hija.lastName}`)
    
    // 3. Crear proxy: Madre como contacto para hija
    const proxyMadreHija = await createContactProxy({
      personId: hija.id,
      contactPersonId: madre.id,
      systemId,
      proxyType: 'parent',
      canSchedule: true,
      canPayment: true,
      canMedicalInfo: true,
      notes: 'Madre autorizada para gestionar citas de depilación láser'
    })
    
    console.log(`🤝 [PROXY] Creado: ${madre.firstName} → ${hija.firstName}`)
    
    // 4. Obtener datos de contacto efectivos para la hija
    const contactoHija = await getEffectiveContactData(hija.id)
    console.log(`📞 [CONTACTO] Hija usa contacto de:`, contactoHija)
    
    // ============================================================================
    // 🎯 CASO 2: HERMANAS (UNA ES EL CONTACTO PARA AMBAS)
    // ============================================================================
    
    console.log('\n👭 [CASO 2] Hermanas - una es el contacto')
    
    // 1. Crear hermana mayor (con datos de contacto)
    const hermana1Data = {
      systemId,
      firstName: 'Ana',
      lastName: 'Martín',
      email: 'ana.martin@email.com',
      phone: '+34666789012',
      birthDate: new Date('1995-06-10')
    }
    
    const hermana1 = await createPersonWithValidation(hermana1Data)
    console.log(`✅ [HERMANA1] Creada: ${hermana1.firstName} ${hermana1.lastName}`)
    
    // 2. Crear hermana menor (sin datos de contacto)
    const hermana2Data = {
      systemId,
      firstName: 'María',
      lastName: 'Martín',
      birthDate: new Date('1998-11-25')
      // NO tiene email ni phone
    }
    
    const hermana2 = await createPersonWithValidation(hermana2Data)
    console.log(`✅ [HERMANA2] Creada: ${hermana2.firstName} ${hermana2.lastName}`)
    
    // 3. Crear proxy: Hermana mayor como contacto
    const proxyHermanas = await createContactProxy({
      personId: hermana2.id,
      contactPersonId: hermana1.id,
      systemId,
      proxyType: 'sibling',
      canSchedule: true,
      canPayment: true,
      canMedicalInfo: false,
      notes: 'Hermana mayor gestiona citas para ambas'
    })
    
    console.log(`🤝 [PROXY] Creado: ${hermana1.firstName} → ${hermana2.firstName}`)
    
    // ============================================================================
    // 🎯 CASO 3: GRUPO DE AMIGAS
    // ============================================================================
    
    console.log('\n👯‍♀️ [CASO 3] Grupo de amigas')
    
    // 1. Crear amiga organizadora (con datos de contacto)
    const organizadoraData = {
      systemId,
      firstName: 'Laura',
      lastName: 'Pérez',
      email: 'laura.perez@email.com',
      phone: '+34666345678',
      birthDate: new Date('1992-04-18')
    }
    
    const organizadora = await createPersonWithValidation(organizadoraData)
    console.log(`✅ [ORGANIZADORA] Creada: ${organizadora.firstName} ${organizadora.lastName}`)
    
    // 2. Crear amigas (sin datos de contacto)
    const amigasData = [
      {
        systemId,
        firstName: 'Cristina',
        lastName: 'López',
        birthDate: new Date('1993-07-22')
      },
      {
        systemId,
        firstName: 'Elena',
        lastName: 'Ruiz',
        birthDate: new Date('1991-12-03')
      }
    ]
    
    const amigas = []
    for (const amigaData of amigasData) {
      const amiga = await createPersonWithValidation(amigaData)
      amigas.push(amiga)
      console.log(`✅ [AMIGA] Creada: ${amiga.firstName} ${amiga.lastName}`)
      
      // Crear proxy para cada amiga
      await createContactProxy({
        personId: amiga.id,
        contactPersonId: organizadora.id,
        systemId,
        proxyType: 'friend',
        canSchedule: true,
        canPayment: false, // Solo puede agendar, no pagar
        canMedicalInfo: false,
        notes: 'Amiga organizadora del grupo'
      })
      
      console.log(`🤝 [PROXY] Creado: ${organizadora.firstName} → ${amiga.firstName}`)
    }
    
    // ============================================================================
    // 🎯 CONSULTAS Y VERIFICACIONES
    // ============================================================================
    
    console.log('\n📊 [VERIFICACIONES] Consultando proxies creados')
    
    // Ver todas las personas bajo el proxy de la madre
    const personasBajoMadre = await getPersonsUnderProxy(madre.id)
    console.log(`👩‍👧 [MADRE] Gestiona ${personasBajoMadre.length} personas:`, 
      personasBajoMadre.map(p => `${p.firstName} ${p.lastName}`))
    
    // Ver todas las personas bajo el proxy de la hermana mayor
    const personasBajoHermana = await getPersonsUnderProxy(hermana1.id)
    console.log(`👭 [HERMANA] Gestiona ${personasBajoHermana.length} personas:`, 
      personasBajoHermana.map(p => `${p.firstName} ${p.lastName}`))
    
    // Ver todas las personas bajo el proxy de la organizadora
    const personasBajoOrganizadora = await getPersonsUnderProxy(organizadora.id)
    console.log(`👯‍♀️ [ORGANIZADORA] Gestiona ${personasBajoOrganizadora.length} personas:`, 
      personasBajoOrganizadora.map(p => `${p.firstName} ${p.lastName}`))
    
    // ============================================================================
    // 🎯 EJEMPLO DE USO EN CITAS
    // ============================================================================
    
    console.log('\n📅 [EJEMPLO] Simulando agendamiento de cita')
    
    // Cuando se agenda una cita para la hija menor...
    const datosContactoCita = await getEffectiveContactData(hija.id)
    
    console.log(`📞 [CITA] Para agendar cita de ${hija.firstName}:`)
    console.log(`   - Email: ${datosContactoCita.email}`)
    console.log(`   - Teléfono: ${datosContactoCita.phone}`)
    console.log(`   - Es proxy: ${datosContactoCita.isProxy}`)
    
    if (datosContactoCita.isProxy) {
      console.log(`   - Contacto: ${datosContactoCita.contactPerson.firstName} ${datosContactoCita.contactPerson.lastName}`)
    }
    
    // ============================================================================
    // 🎯 VALIDACIÓN DE DUPLICADOS
    // ============================================================================
    
    console.log('\n🔍 [VALIDACIÓN] Probando detección de duplicados')
    
    // Intentar crear persona duplicada por email
    try {
      await createPersonWithValidation({
        systemId,
        firstName: 'Carmen',
        lastName: 'González Duplicada',
        email: 'carmen.gonzalez@email.com', // Email duplicado
        phone: '+34666999999'
      })
    } catch (error) {
      console.log(`✅ [DUPLICADO] Email duplicado detectado correctamente: ${error.message}`)
    }
    
    // Intentar crear persona duplicada por teléfono
    try {
      await createPersonWithValidation({
        systemId,
        firstName: 'Ana',
        lastName: 'Martín Duplicada',
        phone: '+34666789012' // Teléfono duplicado
      })
    } catch (error) {
      console.log(`✅ [DUPLICADO] Teléfono duplicado detectado correctamente: ${error.message}`)
    }
    
    console.log('\n🎉 [SUCCESS] Todos los ejemplos ejecutados correctamente!')
    
  } catch (error) {
    console.error('❌ [ERROR] Error en ejemplos:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// ============================================================================
// 🎯 EJEMPLO DE INTEGRACIÓN CON SISTEMA DE CITAS
// ============================================================================

async function ejemploIntegracionCitas() {
  console.log('\n📅 [INTEGRACIÓN] Ejemplo de integración con sistema de citas')
  
  // Función que se ejecutaría al crear una cita
  async function crearCitaConProxy(personId, serviceId, appointmentData) {
    // 1. Obtener datos de contacto efectivos
    const contactData = await getEffectiveContactData(personId)
    
    // 2. Crear la cita
    const cita = await prisma.appointment.create({
      data: {
        ...appointmentData,
        personId: personId,
        // Usar datos de contacto del proxy si es necesario
        contactEmail: contactData.email,
        contactPhone: contactData.phone,
        // Marcar si se usa proxy
        usesContactProxy: contactData.isProxy,
        contactProxyPersonId: contactData.contactPerson?.id
      }
    })
    
    // 3. Si usa proxy, enviar notificaciones al contacto proxy
    if (contactData.isProxy) {
      console.log(`📧 [NOTIFICACIÓN] Enviando confirmación a ${contactData.contactPerson.firstName} ${contactData.contactPerson.lastName}`)
      console.log(`   - Email: ${contactData.email}`)
      console.log(`   - Mensaje: Cita confirmada para ${personId}`)
    }
    
    return cita
  }
  
  console.log('✅ [INTEGRACIÓN] Ejemplo de función de integración creado')
}

// Ejecutar ejemplos
if (require.main === module) {
  exampleUsage()
    .then(() => ejemploIntegracionCitas())
    .catch(console.error)
}

module.exports = {
  exampleUsage,
  ejemploIntegracionCitas
} 