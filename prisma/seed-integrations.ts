import { PrismaClient, IntegrationCategory } from '@prisma/client';

export async function seedIntegrations(prisma: PrismaClient) {
    console.log('Seeding integration modules...');

    const modules = [
        {
            name: 'Control Inteligente (Shelly)',
            description: 'Conecta y gestiona tus enchufes Shelly para monitorizar el consumo y uso de tus equipos.',
            logoUrl: '/integrations/shelly-logo.png',
            category: IntegrationCategory.IOT_DEVICES,
            isPaid: true,
        },
        {
            name: 'Sincronización con Google Calendar',
            description: 'Mantén tu agenda de la clínica sincronizada en tiempo real con tu calendario de Google.',
            logoUrl: '/integrations/google-calendar-logo.png',
            category: IntegrationCategory.AUTOMATION,
        },
        {
            name: 'Gestión de Marketing (Redes Sociales)',
            description: 'Conecta tus cuentas de Google Ads, Facebook Ads y TikTok para centralizar tus campañas.',
            logoUrl: '/integrations/social-media-logo.png',
            category: IntegrationCategory.MARKETING,
        },
        {
            name: 'Pasarelas de Pago (Stripe)',
            description: 'Acepta pagos online de forma segura a través de la plataforma líder en el mercado.',
            logoUrl: '/integrations/stripe-logo.png',
            category: IntegrationCategory.PAYMENTS,
            isPaid: true,
        },
        {
            name: 'Notificaciones Centralizadas',
            description: 'Envía recordatorios y comunicaciones a tus clientes vía SMS (Twilio) o WhatsApp.',
            logoUrl: '/integrations/communication-logo.png',
            category: IntegrationCategory.COMMUNICATION,
        },
        {
            name: 'Contabilidad Simplificada (Sage)',
            description: 'Exporta tus datos de facturación y gastos para una integración sencilla con Sage.',
            logoUrl: '/integrations/sage-logo.png',
            category: IntegrationCategory.ACCOUNTING,
        },
    ];

    for (const module of modules) {
        await prisma.integrationModule.upsert({
            where: { name: module.name },
            update: {},
            create: module,
        });
    }

    console.log('Integration modules seeded.');
} 