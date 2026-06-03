import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const SECRET_STRING = process.env.PAYMENT_ENCRYPTION_KEY || 'default-spreadb-super-secret-key-32-chars-long';

// Ensure the key is exactly 32 bytes by hashing the secret string
const KEY = crypto.createHash('sha256').update(SECRET_STRING).digest();

/**
 * Encrypts a payment metadata payload (amount, userId, sticksAmount, type, etc.)
 * @param {Object} payload 
 * @returns {string} Encrypted token in 'iv:ciphertext' format
 */
export const encryptPaymentPayload = (payload) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(JSON.stringify(payload), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

/**
 * Decrypts a payment token and returns the parsed payload
 * @param {string} token 
 * @returns {Object} Decrypted payload
 */
export const decryptPaymentPayload = (token) => {
  try {
    const parts = token.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid token format');
    }
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error.message);
    throw new Error('Payment token verification failed. Payload is corrupted or tampered.');
  }
};
