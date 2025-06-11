// lib/hash.ts

let bcrypt: typeof import('bcrypt') | typeof import('bcryptjs');

// Selección dinámica
try {
  bcrypt = require('bcrypt'); // Intenta usar el módulo nativo (más seguro)
  console.log('[HASH] bcrypt nativo cargado');
} catch (error) {
  bcrypt = require('bcryptjs'); // Fallback si falla
  console.warn('[HASH] bcryptjs en uso como fallback');
}

// Función para hashear contraseñas
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

// Función para comparar contraseñas
export async function comparePassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return await bcrypt.compare(plainPassword, hashedPassword);
}
