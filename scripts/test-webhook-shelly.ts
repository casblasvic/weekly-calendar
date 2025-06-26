import fetch from 'node-fetch'

// Datos del webhook de Shelly que acabamos de crear
const WEBHOOK_URL = 'http://localhost:3000/api/webhooks/cmccb694h0000y2h3wrrruukn/shelly-device-usage'
const WEBHOOK_TOKEN = 'wh_cmccb694h0000y2h3wrrruukn_shelly_up3xpgw0w'

// Función para enviar datos de prueba al webhook
async function testShellyWebhook() {
  console.log('🧪 Testing Shelly webhook for device usage mapping...')
  
  try {
    // Simulamos datos que enviaría un enchufe Shelly cuando se enciende un equipo
    const shellyPowerOnData = {
      device_id: 'shelly_laser_001', // Este ID debe coincidir con deviceIdProvider
      event_type: 'power_on',
      timestamp: new Date().toISOString(),
      power_consumption: 850.5, // 850W
      total_energy: 0.0, // Inicialmente 0
      voltage: 230.2,
      current: 3.7,
      temperature: 45.3,
      device_name: 'Shelly Plug S - Láser',
      // Datos que deberían venir del sistema de citas
      appointment_id: 'APPOINTMENT_ID_PLACEHOLDER', // Necesitarás poner un ID real
      service_id: 'SERVICE_ID_PLACEHOLDER', // ID del servicio (opcional)
      user_id: 'USER_ID_PLACEHOLDER' // ID del usuario que inició
    }

    console.log('📤 Sending power_on event data:')
    console.log(JSON.stringify(shellyPowerOnData, null, 2))

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WEBHOOK_TOKEN}`,
        'X-Webhook-Source': 'shelly-cloud'
      },
      body: JSON.stringify(shellyPowerOnData)
    })

    console.log(`📥 Response status: ${response.status}`)
    
    if (response.ok) {
      const result = await response.json()
      console.log('✅ Webhook processed successfully:')
      console.log(JSON.stringify(result, null, 2))
    } else {
      const error = await response.text()
      console.log('❌ Webhook failed:')
      console.log(error)
    }

    // Esperar un poco y simular que se apaga el equipo
    console.log('\n⏳ Waiting 5 seconds before sending power_off event...')
    await new Promise(resolve => setTimeout(resolve, 5000))

    const shellyPowerOffData = {
      device_id: 'shelly_laser_001',
      event_type: 'power_off',
      timestamp: new Date().toISOString(),
      power_consumption: 0,
      total_energy: 2.1, // 2.1 kWh consumidos
      voltage: 230.1,
      current: 0,
      temperature: 38.7,
      device_name: 'Shelly Plug S - Láser',
      appointment_id: 'APPOINTMENT_ID_PLACEHOLDER',
      service_id: 'SERVICE_ID_PLACEHOLDER',
      user_id: 'USER_ID_PLACEHOLDER'
    }

    console.log('📤 Sending power_off event data:')
    console.log(JSON.stringify(shellyPowerOffData, null, 2))

    const response2 = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WEBHOOK_TOKEN}`,
        'X-Webhook-Source': 'shelly-cloud'
      },
      body: JSON.stringify(shellyPowerOffData)
    })

    console.log(`📥 Response status: ${response2.status}`)
    
    if (response2.ok) {
      const result = await response2.json()
      console.log('✅ Power off webhook processed successfully:')
      console.log(JSON.stringify(result, null, 2))
    } else {
      const error = await response2.text()
      console.log('❌ Power off webhook failed:')
      console.log(error)
    }

  } catch (error) {
    console.error('❌ Error testing webhook:', error)
  }
}

// Función para obtener IDs reales de la base de datos
async function getRealTestIds() {
  console.log('🔍 Getting real IDs from database for testing...')
  
  try {
    // Obtener datos reales de appointments, users, etc.
    const response = await fetch('http://localhost:3000/api/internal/test-data-for-webhooks', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const data = await response.json()
      console.log('✅ Test data retrieved:')
      console.log(JSON.stringify(data, null, 2))
      return data
    } else {
      console.log('⚠️ Could not retrieve test data, using placeholders')
      return null
    }
  } catch (error) {
    console.log('⚠️ Could not retrieve test data, using placeholders')
    return null
  }
}

// Ejecutar prueba
async function runTest() {
  console.log('🚀 Starting Shelly webhook test...\n')
  
  // Intentar obtener IDs reales
  const testData = await getRealTestIds()
  
  if (testData) {
    console.log('📋 Using real test data for webhook test')
    // Aquí podrías reemplazar los placeholders con datos reales
  } else {
    console.log('⚠️ Using placeholder data - webhook will process but may not create database records')
  }
  
  console.log('\n--- TESTING SHELLY WEBHOOK ---\n')
  await testShellyWebhook()
  
  console.log('\n🎯 Test completed!')
  console.log('\n📝 Next steps:')
  console.log('1. Check the webhook logs in the admin panel')
  console.log('2. Verify if AppointmentDeviceUsage records were created')
  console.log('3. Test with real appointment/user IDs')
  console.log('4. Configure your actual Shelly devices to use this webhook URL')
}

runTest() 