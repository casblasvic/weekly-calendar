import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.SHELLY_ENCRYPTION_KEY || 'default-32-char-encryption-key!!';
const IV_LENGTH = 16;
const ALGORITHM = 'aes-256-cbc';

// Asegurar que la clave tenga exactamente 32 caracteres
const getKey = () => {
    const key = ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32);
    return Buffer.from(key, 'utf-8');
};

export function encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(text: string): string {
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift()!, 'hex');
    const encryptedText = parts.join(':');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
} 