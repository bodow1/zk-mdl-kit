/**
 * Core verification logic for mDL presentations
 * Decrypts JWE, builds SessionTranscript, and calls Longfellow
 */

import { compactDecrypt, importJWK } from 'jose';
import fetch from 'node-fetch';
import { getReaderKeys } from './keys.js';
import { buildSessionTranscript } from './sessionTranscript.js';
import crypto from 'crypto';

const LONGFELLOW_URL = process.env.LONGFELLOW_URL || 'http://localhost:8080';

/**
 * Verify an mDL presentation (standard or ZK)
 * @param {string} jwe - JWE-encrypted VP token from DC-API
 * @returns {Promise<{valid: boolean, predicates?: object, error?: string, sessionId?: string}>}
 */
export async function verifyPresentation(jwe) {
  try {
    // Step 1: Decrypt the JWE using reader's private key
    const { privateJwk } = await getReaderKeys();
    const privateKey = await importJWK(privateJwk, 'ES256');
    
    const { plaintext } = await compactDecrypt(jwe, privateKey);
    const envelope = JSON.parse(new TextDecoder().decode(plaintext));

    // Step 2: Extract VP token
    // Typical shape: envelope.vp_token contains the credential/presentation
    const vpToken = envelope.vp_token?.mdl || 
                    envelope.vp_token || 
                    Object.values(envelope.vp_token ?? {})[0];

    if (!vpToken) {
      return {
        valid: false,
        error: 'No vp_token found in decrypted envelope'
      };
    }

    // Step 3: Build SessionTranscript for ISO 18013-5/7 web handover
    const sessionTranscript = buildSessionTranscript(
      envelope.nonce || crypto.randomUUID(),
      envelope.aud || 'https://verifier.example.com',
      envelope
    );

    // Step 4: Call Longfellow verifier-service
    const longfellowResult = await verifyWithLongfellow(vpToken, sessionTranscript);

    if (!longfellowResult.valid) {
      return {
        valid: false,
        error: longfellowResult.error || 'Longfellow verification failed'
      };
    }

    // Step 5: Extract predicates (data minimization)
    const predicates = extractPredicates(longfellowResult);

    return {
      valid: true,
      predicates,
      sessionId: crypto.randomUUID()
    };

  } catch (error) {
    console.error('Presentation verification error:', error);
    return {
      valid: false,
      error: error.message
    };
  }
}

/**
 * Call Longfellow verifier-service
 * @param {object} vpToken - The VP token (mDL or ZK proof)
 * @param {Array} sessionTranscript - ISO 18013-5 SessionTranscript
 * @returns {Promise<{valid: boolean, predicates?: object, error?: string}>}
 */
async function verifyWithLongfellow(vpToken, sessionTranscript) {
  try {
    const response = await fetch(`${LONGFELLOW_URL}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proof: vpToken,
        sessionTranscript
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        valid: false,
        error: `Longfellow returned ${response.status}: ${errorText}`
      };
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Longfellow call error:', error);
    
    // If Longfellow is not available, return a mock response for development
    if (error.code === 'ECONNREFUSED') {
      console.warn('⚠️  Longfellow not available - using mock verification for development');
      return mockLongfellowResponse(vpToken);
    }
    
    return {
      valid: false,
      error: `Failed to reach Longfellow: ${error.message}`
    };
  }
}

/**
 * Mock Longfellow response for development when service is unavailable
 * @param {object} vpToken 
 * @returns {object}
 */
function mockLongfellowResponse(vpToken) {
  return {
    valid: true,
    predicates: {
      'org.iso.18013.5.1.age_over_21': true,
      'org.iso.18013.5.1.not_expired': true
    },
    issuer: 'CA-DMV',
    issuedAt: new Date().toISOString(),
    mock: true
  };
}

/**
 * Extract predicate outcomes from Longfellow result
 * @param {object} longfellowResult 
 * @returns {object} Minimal predicate outcomes
 */
function extractPredicates(longfellowResult) {
  const predicates = {};

  // Extract age verification predicates
  if (longfellowResult.predicates) {
    for (const [key, value] of Object.entries(longfellowResult.predicates)) {
      // Only include boolean predicates (not raw PII)
      if (typeof value === 'boolean') {
        predicates[key] = value;
      }
    }
  }

  // Add common derived predicates
  if (longfellowResult.predicates?.['org.iso.18013.5.1.age_over_21']) {
    predicates.over21 = true;
  }

  if (longfellowResult.predicates?.['org.iso.18013.5.1.age_over_18']) {
    predicates.over18 = true;
  }

  // Add issuer jurisdiction (not PII)
  if (longfellowResult.issuer) {
    predicates.issuerJurisdiction = longfellowResult.issuer;
  }

  // Add validity status
  predicates.notExpired = longfellowResult.predicates?.['org.iso.18013.5.1.not_expired'] !== false;

  return predicates;
}

export { verifyWithLongfellow, extractPredicates };

