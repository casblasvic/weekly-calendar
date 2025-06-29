const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupShellyModule() {
    try {
        console.log('🔧 Configurando módulo Shelly...');

        // Verificar si ya existe cualquier módulo con "Shelly" en el nombre
        const existingModules = await prisma.integrationModule.findMany({
            where: { 
                name: {
                    contains: 'Shelly',
                    mode: 'insensitive'
                }
            }
        });

        if (existingModules.length > 0) {
            console.log(`✅ Módulos Shelly encontrados: ${existingModules.length}`);
            existingModules.forEach((module, index) => {
                console.log(`   ${index + 1}. "${module.name}" (${module.id})`);
            });
            
            // Si existe "Control Inteligente (Shelly)", usarlo
            const originalModule = existingModules.find(m => 
                m.name.includes('Control Inteligente') || 
                m.name.includes('Control inteligente')
            );
            
            if (originalModule) {
                console.log(`✅ Usando módulo original: "${originalModule.name}" (${originalModule.id})`);
                return originalModule;
            } else {
                console.log(`✅ Usando primer módulo encontrado: "${existingModules[0].name}"`);
                return existingModules[0];
            }
        }

        // Solo crear si NO existe ningún módulo Shelly
        const shellyModule = await prisma.integrationModule.create({
            data: {
                name: 'Control Inteligente (Shelly)',
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