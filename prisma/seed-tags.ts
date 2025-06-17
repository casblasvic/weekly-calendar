import pkg from '@prisma/client';
const { PrismaClient } = pkg;

export async function seedTags(prisma: InstanceType<typeof PrismaClient>, systemId: string) {
  console.log('Creating default appointment tags...');
  
  const defaultTags = [
    { name: 'En Salle D\'attente', color: '#E040FB', description: 'Paciente en sala de espera' },
    { name: 'Il ne répond pas', color: '#FBC02D', description: 'El paciente no responde' },
    { name: 'Rendez-vous annulé', color: '#EF5350', description: 'Cita cancelada' },
    { name: 'Rendez-vous confirmé', color: '#66BB6A', description: 'Cita confirmada' },
    { name: 'Rendez-vous en retard', color: '#42A5F5', description: 'Cita con retraso' },
    { name: 'Rendez-vous reporté', color: '#FF9800', description: 'Cita reprogramada' },
  ];

  for (const tagData of defaultTags) {
    try {
      await prisma.tag.upsert({
        where: { 
          systemId_name: { 
            systemId: systemId, 
            name: tagData.name 
          } 
        },
        update: { 
          color: tagData.color,
          description: tagData.description,
          isActive: true
        },
        create: {
          name: tagData.name,
          color: tagData.color,
          description: tagData.description,
          isActive: true,
          systemId: systemId
        }
      });
      console.log(`  -> Ensured tag: ${tagData.name}`);
    } catch (error) {
      console.error(`Error creating/updating tag ${tagData.name}:`, error);
      // Continuar con el siguiente tag si hay un error
    }
  }
  
  console.log('Default appointment tags created.');
}
