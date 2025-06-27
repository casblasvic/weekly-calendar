const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupShellyModule() {
    try {
        console.log('🔧 Configurando módulo Shelly...');

        // Verificar si ya existe
        const existingModule = await prisma.integrationModule.findFirst({
            where: { name: 'Shelly' }
        });

        if (existingModule) {
            console.log('✅ Módulo Shelly ya existe:', existingModule.id);
            return existingModule;
        }

        // Crear módulo Shelly
        const shellyModule = await prisma.integrationModule.create({
            data: {
                name: 'Shelly',
                description: 'Integración con dispositivos IoT Shelly para control de enchufes inteligentes, switches y sensores',
                logoUrl: 'https://shelly.cloud/images/shelly_logo.png',
                category: 'IOT_DEVICES',
                isPaid: false
            }
        });

        console.log('✅ Módulo Shelly creado exitosamente:', shellyModule.id);
        return shellyModule;

    } catch (error) {
        console.error('❌ Error configurando módulo Shelly:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    setupShellyModule()
        .then(() => {
            console.log('🎉 Configuración completada');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Error:', error);
            process.exit(1);
        });
}

module.exports = { setupShellyModule }; 