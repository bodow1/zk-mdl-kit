/**
 * SD-JWT VC issuance logic
 * Creates selective disclosure JWT VCs with holder binding
 */

import { SignJWT, importJWK } from 'jose';
import { getIssuerKeys } from './keys.js';
import crypto from 'crypto';

const DERIVED_VC_TTL = parseInt(process.env.DERIVED_VC_TTL || '86400'); // 24 hours

/**
 * Issue an SD-JWT VC
 * @param {object} options
 * @param {object} options.holderPublicKey - Holder's public key (JWK)
 * @param {string} options.verificationSessionId - Reference to mDL verification
 * @param {object} options.claims - Claims to include
 * @returns {Promise<{sdJwt: string, disclosures: Array, kbJwt?: string}>}
 */
export async function issueCredential({ holderPublicKey, verificationSessionId, claims }) {
  try {
    const { privateJwk, publicJwk } = await getIssuerKeys();
    const issuerKey = await importJWK(privateJwk, 'ES256');

    // 1. Create disclosures for selective disclosure
    const { disclosures, disclosureDigests } = createDisclosures(claims);

    // 2. Build SD-JWT payload
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      // Standard VC claims
      iss: `http://localhost:${process.env.ISSUER_PORT || 3001}`,
      sub: holderPublicKey.kid || crypto.createHash('sha256')
        .update(JSON.stringify(holderPublicKey))
        .digest('hex').substring(0, 16),
      iat: now,
      exp: now + DERIVED_VC_TTL,
      
      // VC type
      vct: 'https://example.com/derived-mdl-vc',
      
      // Selective disclosure digests
      _sd: disclosureDigests,
      
      // Holder binding
      cnf: {
        jwk: holderPublicKey
      },
      
      // Metadata
      _sd_alg: 'sha-256',
      derivedFrom: {
        type: 'mDL-verification',
        sessionId: verificationSessionId
      }
    };

    // 3. Sign the JWT
    const jwt = await new SignJWT(payload)
      .setProtectedHeader({ 
        alg: 'ES256',
        typ: 'vc+sd-jwt',
        kid: publicJwk.kid || 'issuer-key-1'
      })
      .sign(issuerKey);

    // 4. Combine JWT with disclosures
    // Format: <JWT>~<disclosure1>~<disclosure2>~...~
    const sdJwt = `${jwt}~${disclosures.join('~')}~`;

    return {
      sdJwt,
      disclosures,
      format: 'vc+sd-jwt'
    };

  } catch (error) {
    console.error('Credential issuance error:', error);
    throw new Error(`Failed to issue credential: ${error.message}`);
  }
}

/**
 * Create selective disclosures for claims
 * @param {object} claims 
 * @returns {{disclosures: Array<string>, disclosureDigests: Array<string>}}
 */
function createDisclosures(claims) {
  const disclosures = [];
  const disclosureDigests = [];

  for (const [key, value] of Object.entries(claims)) {
    // Create disclosure: [salt, claim_name, claim_value]
    const salt = crypto.randomBytes(16).toString('base64url');
    const disclosure = [salt, key, value];
    
    // Base64url encode the disclosure
    const disclosureString = Buffer.from(JSON.stringify(disclosure))
      .toString('base64url');
    
    disclosures.push(disclosureString);
    
    // Create digest for the JWT payload
    const digest = crypto.createHash('sha256')
      .update(disclosureString, 'utf-8')
      .digest('base64url');
    
    disclosureDigests.push(digest);
  }

  return { disclosures, disclosureDigests };
}

/**
 * Verify an SD-JWT VC
 * @param {string} sdJwt - The SD-JWT VC string
 * @param {object} issuerPublicKey - Issuer's public key (JWK)
 * @returns {Promise<{valid: boolean, claims?: object, error?: string}>}
 */
export async function verifyCredential(sdJwt, issuerPublicKey) {
  try {
    // Parse SD-JWT
    const parts = sdJwt.split('~');
    const jwt = parts[0];
    const disclosures = parts.slice(1, -1); // Last part is empty

    // Verify JWT signature
    const { jwtVerify } = await import('jose');
    const issuerKey = await importJWK(issuerPublicKey, 'ES256');
    
    const { payload } = await jwtVerify(jwt, issuerKey, {
      algorithms: ['ES256']
    });

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return {
        valid: false,
        error: 'Credential expired'
      };
    }

    // Decode disclosures
    const claims = {};
    for (const disclosure of disclosures) {
      const [salt, key, value] = JSON.parse(
        Buffer.from(disclosure, 'base64url').toString('utf-8')
      );
      
      // Verify digest
      const digest = crypto.createHash('sha256')
        .update(disclosure, 'utf-8')
        .digest('base64url');
      
      if (payload._sd && payload._sd.includes(digest)) {
        claims[key] = value;
      }
    }

    return {
      valid: true,
      claims,
      holder: payload.cnf?.jwk,
      issuer: payload.iss,
      issuedAt: payload.iat,
      expiresAt: payload.exp
    };

  } catch (error) {
    console.error('Credential verification error:', error);
    return {
      valid: false,
      error: error.message
    };
  }
}

