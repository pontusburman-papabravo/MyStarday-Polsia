const crypto = require('crypto');

const SCRYPT_KEYLEN = 64;
const SCRYPT_COST = 16384; // N
const SCRYPT_BLOCK_SIZE = 8; // r
const SCRYPT_PARALLELIZATION = 1; // p

/**
 * Hash a password using Node.js built-in crypto.scrypt.
 * Returns format: salt:hash (both hex-encoded).
 */
function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(32).toString('hex');
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, {
      N: SCRYPT_COST,
      r: SCRYPT_BLOCK_SIZE,
      p: SCRYPT_PARALLELIZATION,
    }, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Compare a password against a hash.
 * @param {string} password - Plain text password
 * @param {string} stored - Hash in format salt:hash
 * @returns {Promise<boolean>}
 */
function comparePassword(password, stored) {
  return new Promise((resolve, reject) => {
    if (!stored || typeof stored !== 'string' || stored.indexOf(':') === -1) {
      return resolve(false);
    }
    const [salt, hash] = stored.split(':');
    if (!salt || !hash) return resolve(false);

    crypto.scrypt(password, salt, SCRYPT_KEYLEN, {
      N: SCRYPT_COST,
      r: SCRYPT_BLOCK_SIZE,
      p: SCRYPT_PARALLELIZATION,
    }, (err, derivedKey) => {
      if (err) return reject(err);
      try {
        const storedBuf = Buffer.from(hash, 'hex');
        if (storedBuf.length !== derivedKey.length) return resolve(false);
        resolve(crypto.timingSafeEqual(storedBuf, derivedKey));
      } catch {
        resolve(false);
      }
    });
  });
}

/**
 * Create a deterministic fingerprint of a PIN for global uniqueness checks.
 * Uses HMAC-SHA256 with the JWT secret as key.
 * Unlike scrypt hashes (random salt → different hash per call),
 * this always produces the same output for the same PIN.
 */
function pinFingerprint(pin) {
  const config = require('./config');
  const key = config.pin.fingerprintSecret;
  return crypto.createHmac('sha256', key).update(pin).digest('hex');
}

module.exports = { hashPassword, comparePassword, pinFingerprint };
