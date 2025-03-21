const fs = require('fs');
const path = require('path');

// Crear directorio de uploads si no existe
const uploadDir = path.join(process.cwd(), 'public', 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Directorio de uploads creado exitosamente');
} 