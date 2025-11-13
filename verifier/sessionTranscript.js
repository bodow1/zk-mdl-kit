/**
 * SessionTranscript builder for ISO 18013-5/7 web handover
 * Required for binding mDL presentation to the session
 */

import crypto from 'crypto';

/**
 * Build ISO 18013-5 SessionTranscript for OID4VP web handover
 * @param {string} nonce - Session nonce from OID4VP request
 * @param {string} audience - Verifier audience/client_id
 * @param {object} envelope - Decrypted envelope for additional context
 * @returns {Array} SessionTranscript array
 */
export function buildSessionTranscript(nonce, audience, envelope = {}) {
  // ISO 18013-5 SessionTranscript for web handover mode
  // Format: [DeviceEngagementBytes, EReaderKeyBytes, Handover]
  
  // For OID4VP DC-API handover, the structure is:
  // [null, null, ["OpenID4VPDCAPIHandover", clientIdHash, nonceHash, responseUriHash]]
  
  const handover = [
    "OpenID4VPDCAPIHandover",
    hashValue(audience), // client_id hash
    hashValue(nonce),    // nonce hash
    null                 // response_uri hash (optional)
  ];

  return [
    null,    // DeviceEngagementBytes (null for web)
    null,    // EReaderKeyBytes (null for web)
    handover
  ];
}

/**
 * Hash a value for SessionTranscript
 * @param {string} value 
 * @returns {string} Base64-encoded SHA-256 hash
 */
function hashValue(value) {
  if (!value) return null;
  return crypto.createHash('sha256')
    .update(value, 'utf-8')
    .digest('base64');
}

/**
 * Validate SessionTranscript structure
 * @param {Array} sessionTranscript 
 * @returns {boolean}
 */
export function validateSessionTranscript(sessionTranscript) {
  if (!Array.isArray(sessionTranscript)) {
    return false;
  }

  if (sessionTranscript.length !== 3) {
    return false;
  }

  const [deviceEngagement, readerKey, handover] = sessionTranscript;

  // For web handover, first two should be null
  if (deviceEngagement !== null || readerKey !== null) {
    console.warn('SessionTranscript: unexpected non-null values for web handover');
  }

  // Handover should be an array
  if (!Array.isArray(handover)) {
    return false;
  }

  return true;
}

