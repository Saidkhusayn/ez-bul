const crypto = require('crypto');
require('dotenv').config(); // For loading environment variables

// AES-256 requires a 32-byte (256-bit) key
const KEY_LENGTH = 32; // 32 bytes = 256 bits

// Use a stable secret key from environment variables
// IMPORTANT: Set this in your .env file
const SECRET_KEY = process.env.ENCRYPTION_SECRET || 'your-fallback-secret-key-at-least-32-chars';

// Create a 32-byte key using PBKDF2 derivation from your secret
const ENCRYPTION_KEY = crypto.pbkdf2Sync(
  SECRET_KEY,
  'salt', // You can use a fixed salt or store this in env variables too
  10000,  // Number of iterations
  KEY_LENGTH,
  'sha256'
);

const IV_LENGTH = 16; // AES block size

/**
 * Encrypts a message using AES-256-CBC.
 * @param {string} text - The message to encrypt.
 * @returns {string} - The encrypted message in hex format.
 */
function encrypt(text) {
  try {
    const iv = crypto.randomBytes(IV_LENGTH); // Generate a random IV
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`; // Prepend IV to encrypted message
  } catch (error) {
    console.error('Encryption error:', error.message);
    // In case of error, return the original text
    // This prevents the application from breaking completely
    return text;
  }
}

/**
 * Decrypts a message using AES-256-CBC.
 * @param {string} text - The encrypted message in hex format.
 * @returns {string} - The decrypted message.
 */
function decrypt(text) {
  try {
    // Check if the text is in the encrypted format
    if (!text.includes(':')) {
      // Not in the expected format, might be plain text
      return text;
    }
    
    const [ivHex, encryptedText] = text.split(':');
    if (!ivHex || !encryptedText) {
      return text; // Not a valid format, return as is
    }
    
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error.message);
    // In case of error, return the original text
    return text;
  }
}

module.exports = { encrypt, decrypt };