const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Verificar si la columna existe
    const result = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'saasavatar' 
        AND table_name = 'WebSocketConnection'
        AND column_name = 'loggingEnabled'
      ) as column_exists
    `;
    
    console.log('Resultado de verificación:', result);
    
    if (!result[0].column_exists) {
      console.log('La columna no existe, intentando agregar...');
      
      // Intentar agregar la columna con un timeout más corto
      await prisma.$executeRaw`
        ALTER TABLE "saasavatar"."WebSocketConnection" 
        ADD COLUMN "loggingEnabled" BOOLEAN DEFAULT true
      `;
      
      console.log('✅ Columna agregada exitosamente');
    } else {
      console.log('✅ La columna ya existe');
    }
    
    // Verificar la estructura final
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_schema = 'saasavatar' 
      AND table_name = 'WebSocketConnection'
      ORDER BY ordinal_position
    `;
    
    console.log('\nEstructura de la tabla WebSocketConnection:');
    columns.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (default: ${col.column_default || 'none'})`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.code === 'P2010') {
      console.log('\n⚠️  Parece que hay un problema con el timeout.');
      console.log('Esto puede deberse a:');
      console.log('1. La tabla tiene muchos registros');
      console.log('2. Hay bloqueos en la base de datos');
      console.log('3. La conexión es lenta');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
