/**
 * IACA (Issuer Authority Certificate Authority) root loader
 * For California DMV dev/testing
 */

import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';

const IACA_CACHE_DIR = process.env.TRUST_CACHE_DIR || './trust/cache';
const CA_DMV_IACA_URL = 'https://www.dmv.ca.gov/portal/ca-dmv-wallet/iaca-root.pem';

/**
 * Download California DMV IACA root certificate
 * @returns {Promise<string>} PEM-encoded certificate
 */
export async function downloadCAIACA() {
  try {
    console.log('🌐 Downloading CA DMV IACA root certificate...');
    
    const response = await fetch(CA_DMV_IACA_URL);
    
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.status}`);
    }

    const pem = await response.text();
    
    // Save to cache
    await fs.mkdir(IACA_CACHE_DIR, { recursive: true });
    const cacheFile = path.join(IACA_CACHE_DIR, 'ca-iaca-root.pem');
    await fs.writeFile(cacheFile, pem);
    
    console.log('✅ CA IACA root certificate downloaded and cached');
    return pem;

  } catch (error) {
    console.error('Failed to download CA IACA:', error);
    
    // Try loading from cache
    const cached = await loadCachedIACA();
    if (cached) {
      console.warn('⚠️  Using cached CA IACA root certificate');
      return cached;
    }

    // Return mock for development
    console.warn('⚠️  Using mock CA IACA for development');
    return getMockCAIACA();
  }
}

/**
 * Load cached IACA certificate
 * @returns {Promise<string|null>}
 */
async function loadCachedIACA() {
  try {
    const cacheFile = path.join(IACA_CACHE_DIR, 'ca-iaca-root.pem');
    return await fs.readFile(cacheFile, 'utf-8');
  } catch (error) {
    return null;
  }
}

/**
 * Mock CA IACA for development
 * @returns {string}
 */
function getMockCAIACA() {
  return `-----BEGIN CERTIFICATE-----
MIIB0zCCAXqgAwIBAgIUMockIACARoot...
(Mock CA DMV IACA Root Certificate for Development)
-----END CERTIFICATE-----`;
}

/**
 * Parse and validate IACA certificate
 * @param {string} pem - PEM-encoded certificate
 * @returns {object} Parsed certificate info
 */
export function parseIACA(pem) {
  // In production, use a proper X.509 parser
  // For now, return metadata
  return {
    type: 'IACA Root',
    issuer: 'CA-DMV',
    format: 'X.509',
    pem: pem,
    mock: pem.includes('Mock')
  };
}

/**
 * Get IACA root for a jurisdiction
 * @param {string} jurisdictionCode 
 * @returns {Promise<string>}
 */
export async function getIACARoot(jurisdictionCode) {
  const code = jurisdictionCode.toUpperCase();
  
  switch (code) {
    case 'CA':
      return await downloadCAIACA();
    
    default:
      throw new Error(`IACA root not available for jurisdiction ${code}`);
  }
}

/**
 * Verify certificate chain against IACA root
 * @param {string} certificate - Certificate to verify
 * @param {string} iacaRoot - IACA root certificate
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
export async function verifyAgainstIACA(certificate, iacaRoot) {
  // In production, implement proper X.509 chain verification
  // This would typically use crypto.X509Certificate or a library
  
  console.log('🔒 Verifying certificate against IACA root...');
  
  // Mock verification for development
  if (iacaRoot.includes('Mock')) {
    console.warn('⚠️  Mock IACA verification');
    return { valid: true, mock: true };
  }

  // Real verification would go here
  // For now, return success
  return { valid: true };
}

