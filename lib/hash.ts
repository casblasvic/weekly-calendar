// lib/hash.ts

let bcrypt: any;

// Función para inicializar bcrypt
async function initBcrypt() {
  if (bcrypt) return bcrypt;
  
  try {
    bcrypt = await import('bcrypt'); // Intenta usar el módulo nativo (más seguro)
    console.log('[HASH] bcrypt nativo cargado');
  } catch (error) {
    bcrypt = await import('bcryptjs'); // Fallback si falla
    console.warn('[HASH] bcryptjs en uso como fallback');
  }
  
  return bcrypt;
}

// Función para hashear contraseñas
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  const bcryptLib = await initBcrypt();
  return await bcryptLib.hash(password, saltRounds);
}

// Función para comparar contraseñas
export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  const bcryptLib = await initBcrypt();
  return await bcryptLib.compare(password, hashedPassword);
}
