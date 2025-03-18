const crypto = require('crypto');

// Encryption key (must be 32 bytes for AES-256)
const ENCRYPTION_KEY = crypto.randomBytes(32); // Store this securely!
const IV_LENGTH = 16; // AES block size

/**
 * Encrypts a message using AES-256-CBC.
 * @param {string} text - The message to encrypt.
 * @returns {string} - The encrypted message in hex format.
 */
function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH); // Generate a random IV
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`; // Prepend IV to encrypted message
}

/**
 * Decrypts a message using AES-256-CBC.
 * @param {string} text - The encrypted message in hex format.
 * @returns {string} - The decrypted message.
 */
function decrypt(text) {
  const [ivHex, encryptedText] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = { encrypt, decrypt };