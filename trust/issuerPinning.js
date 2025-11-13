/**
 * Issuer pinning policy
 * Controls which jurisdictions/issuers are trusted
 */

import { getIssuerCertificates } from './vicalFetcher.js';

// Configurable list of accepted jurisdictions
const ACCEPTED_JURISDICTIONS = process.env.ACCEPTED_JURISDICTIONS
  ? process.env.ACCEPTED_JURISDICTIONS.split(',')
  : ['CA', 'NY', 'FL'];

/**
 * Check if a jurisdiction is accepted
 * @param {string} jurisdictionCode 
 * @returns {boolean}
 */
export function isJurisdictionAccepted(jurisdictionCode) {
  return ACCEPTED_JURISDICTIONS.includes(jurisdictionCode.toUpperCase());
}

/**
 * Get all accepted issuers with their certificates
 * @returns {Promise<Array<{code: string, name: string, certificates: Array}>>}
 */
export async function getAcceptedIssuers() {
  const issuers = [];

  for (const jurisdictionCode of ACCEPTED_JURISDICTIONS) {
    try {
      const certificates = await getIssuerCertificates(jurisdictionCode);
      issuers.push({
        code: jurisdictionCode,
        certificates
      });
    } catch (error) {
      console.error(`Failed to get certificates for ${jurisdictionCode}:`, error.message);
    }
  }

  return issuers;
}

/**
 * Verify issuer against pinning policy
 * @param {string} issuerCode - e.g., 'CA-DMV'
 * @param {string} kid - Key ID from the credential
 * @returns {Promise<{accepted: boolean, reason?: string}>}
 */
export async function verifyIssuer(issuerCode, kid) {
  // Extract jurisdiction code from issuer (e.g., 'CA-DMV' -> 'CA')
  const jurisdictionCode = issuerCode.split('-')[0].toUpperCase();

  // Check if jurisdiction is in accepted list
  if (!isJurisdictionAccepted(jurisdictionCode)) {
    return {
      accepted: false,
      reason: `Jurisdiction ${jurisdictionCode} not in accepted list`
    };
  }

  try {
    // Get certificates for this jurisdiction
    const certificates = await getIssuerCertificates(jurisdictionCode);

    // Check if the kid matches any certificate
    const cert = certificates.find(c => c.kid === kid);

    if (!cert) {
      return {
        accepted: false,
        reason: `Key ID ${kid} not found in trusted certificates for ${jurisdictionCode}`
      };
    }

    // Check certificate validity
    const now = new Date();
    const validFrom = new Date(cert.validFrom);
    const validUntil = new Date(cert.validUntil);

    if (now < validFrom || now > validUntil) {
      return {
        accepted: false,
        reason: `Certificate ${kid} is not currently valid`
      };
    }

    return {
      accepted: true,
      certificate: cert
    };

  } catch (error) {
    return {
      accepted: false,
      reason: `Error verifying issuer: ${error.message}`
    };
  }
}

/**
 * Get trust policy configuration
 * @returns {object}
 */
export function getTrustPolicy() {
  return {
    acceptedJurisdictions: ACCEPTED_JURISDICTIONS,
    policyType: 'jurisdiction-based',
    dataMinimization: true,
    description: 'Only accepts mDL from configured jurisdictions'
  };
}

/**
 * Add jurisdiction to accepted list (for dynamic configuration)
 * @param {string} jurisdictionCode 
 */
export function addAcceptedJurisdiction(jurisdictionCode) {
  const code = jurisdictionCode.toUpperCase();
  if (!ACCEPTED_JURISDICTIONS.includes(code)) {
    ACCEPTED_JURISDICTIONS.push(code);
    console.log(`✅ Added ${code} to accepted jurisdictions`);
  }
}

/**
 * Remove jurisdiction from accepted list
 * @param {string} jurisdictionCode 
 */
export function removeAcceptedJurisdiction(jurisdictionCode) {
  const code = jurisdictionCode.toUpperCase();
  const index = ACCEPTED_JURISDICTIONS.indexOf(code);
  if (index > -1) {
    ACCEPTED_JURISDICTIONS.splice(index, 1);
    console.log(`❌ Removed ${code} from accepted jurisdictions`);
  }
}

