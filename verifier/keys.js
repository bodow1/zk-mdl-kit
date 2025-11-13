/**
 * Key management for reader (verifier) keys
 * P-256 key pair for JWE decryption
 */

import { generateKeyPair, exportJWK } from 'jose';
import fs from 'fs/promises';
import path from 'path';

const KEY_FILE = '.reader-keys.json';

/**
 * Get or generate reader key pair
 * @returns {Promise<{publicJwk: object, privateJwk: object}>}
 */
export async function getReaderKeys() {
  // Try loading from environment first
  if (process.env.READER_PUBLIC_JWK && process.env.READER_PRIVATE_JWK) {
    try {
      return {
        publicJwk: JSON.parse(process.env.READER_PUBLIC_JWK),
        privateJwk: JSON.parse(process.env.READER_PRIVATE_JWK)
      };
    } catch (error) {
      console.error('Failed to parse reader keys from environment:', error);
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
  console.log('🔑 Generating new reader key pair (P-256)...');
  const keyPair = await generateKeyPair('ES256');
  const publicJwk = await exportJWK(keyPair.publicKey);
  const privateJwk = await exportJWK(keyPair.privateKey);

  const keys = { publicJwk, privateJwk };

  // Save to file for persistence
  try {
    await fs.writeFile(KEY_FILE, JSON.stringify(keys, null, 2));
    console.log(`✅ Reader keys saved to ${KEY_FILE}`);
    console.log('⚠️  For production, move these keys to environment variables or secure storage');
  } catch (error) {
    console.error('Failed to save keys to file:', error);
  }

  return keys;
}

/**
 * Generate and display new reader keys
 * Utility function for setup
 */
export async function generateAndDisplayKeys() {
  const { publicJwk, privateJwk } = await getReaderKeys();
  
  console.log('\n📋 Add these to your .env file:\n');
  console.log(`READER_PUBLIC_JWK='${JSON.stringify(publicJwk)}'`);
  console.log(`READER_PRIVATE_JWK='${JSON.stringify(privateJwk)}'`);
  console.log('\n');
}

