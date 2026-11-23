import crypto from 'crypto';

// Der Key aus deiner .env.local Datei
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY as string;
const ALGORITHM = 'aes-256-gcm';

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
  throw new Error("ENCRYPTION_KEY in .env.local muss exakt 32 Zeichen lang sein!");
}

/**
 * Verschlüsselt einen Text (z.B. den Google Token)
 */
export function encrypt(text: string): string {
  // Generiert einen zufälligen Initialisierungsvektor
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Der Auth-Tag stellt sicher, dass die Daten nicht manipuliert wurden
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Wir packen alles in einen einzigen String, getrennt durch Doppelpunkte
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Entschlüsselt den String wieder zurück in den Klartext
 */
export function decrypt(hash: string): string {
  const parts = hash.split(':');
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  
  // parts[2] bleibt ein String, wir wandeln es NICHT vorher in einen Buffer um
  const encryptedHexString = parts[2]; 
  
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  decipher.setAuthTag(authTag);
  
  // Jetzt können wir die Signatur (String, 'hex', 'utf8') sauber nutzen, ohne dass TypeScript meckert
  let decrypted = decipher.update(encryptedHexString, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}