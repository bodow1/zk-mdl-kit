/**
 * Key management for issuer keys
 * P-256 key pair for SD-JWT VC signing
 */

import { generateKeyPair, exportJWK } from 'jose';
import fs from 'fs/promises';

const KEY_FILE = '.issuer-keys.json';

/**
 * Get or generate issuer key pair
 * @returns {Promise<{publicJwk: object, privateJwk: object}>}
 */
export async function getIssuerKeys() {
  // Try loading from environment first
  if (process.env.ISSUER_PUBLIC_JWK && process.env.ISSUER_PRIVATE_JWK) {
    try {
      return {
        publicJwk: JSON.parse(process.env.ISSUER_PUBLIC_JWK),
        privateJwk: JSON.parse(process.env.ISSUER_PRIVATE_JWK)
      };
    } catch (error) {
      console.error('Failed to parse issuer keys from environment:', error);
    }
  }

  // Try loading from file
  try {
    const keysJson = await fs.readFile(KEY_FILE, 'utf-8');
    const keys = JSON.parse(keysJson);
    
    if (keys.publicJwk && keys.privateJwk) {
      return keys;
    }
  } catch (error) {
    // File doesn't exist or is invalid, generate new keys
  }

  // Generate new key pair
  console.log('🔑 Generating new issuer key pair (P-256)...');
  const keyPair = await generateKeyPair('ES256');
  const publicJwk = await exportJWK(keyPair.publicKey);
  const privateJwk = await exportJWK(keyPair.privateKey);

  // Add key ID
  publicJwk.kid = 'issuer-key-1';
  privateJwk.kid = 'issuer-key-1';

  const keys = { publicJwk, privateJwk };

  // Save to file for persistence
  try {
    await fs.writeFile(KEY_FILE, JSON.stringify(keys, null, 2));
    console.log(`✅ Issuer keys saved to ${KEY_FILE}`);
    console.log('⚠️  For production, move these keys to environment variables or secure storage');
  } catch (error) {
    console.error('Failed to save keys to file:', error);
  }

  return keys;
}

