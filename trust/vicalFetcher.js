/**
 * VICAL (Verified Issuer Certificate Authority List) fetcher
 * Retrieves and caches issuer public key material from AAMVA
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const VICAL_URL = process.env.VICAL_URL || 'https://vical.dts.aamva.org';
const CACHE_DIR = process.env.TRUST_CACHE_DIR || './trust/cache';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch VICAL data and cache it locally
 * @returns {Promise<{jurisdictions: object[], timestamp: string}>}
 */
export async function fetchVical() {
  try {
    // Ensure cache directory exists
    await fs.mkdir(CACHE_DIR, { recursive: true });

    // Check cache first
    const cachedData = await loadFromCache();
    if (cachedData && !isCacheExpired(cachedData.timestamp)) {
      console.log('✅ Using cached VICAL data');
      return cachedData;
    }

    console.log('🌐 Fetching fresh VICAL data from AAMVA...');
    
    // In production, this would fetch from actual VICAL endpoint
    // For now, we'll create a mock structure
    const response = await fetchVicalData();
    
    const vicalData = {
      jurisdictions: response.jurisdictions || [],
      timestamp: new Date().toISOString(),
      version: response.version || '1.0'
    };

    // Cache the data
    await saveToCache(vicalData);
    console.log(`✅ VICAL data cached (${vicalData.jurisdictions.length} jurisdictions)`);

    return vicalData;

  } catch (error) {
    console.error('Failed to fetch VICAL:', error);
    
    // Try to use stale cache as fallback
    const cachedData = await loadFromCache();
    if (cachedData) {
      console.warn('⚠️  Using stale VICAL cache as fallback');
      return cachedData;
    }

    throw new Error(`VICAL fetch failed and no cache available: ${error.message}`);
  }
}

/**
 * Fetch VICAL data from the endpoint
 * @returns {Promise<object>}
 */
async function fetchVicalData() {
  try {
    // Note: Real VICAL requires enrollment and authentication
    // This is a mock for development
    const response = await fetch(VICAL_URL, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`VICAL returned ${response.status}`);
    }

    return await response.json();

  } catch (error) {
    // If VICAL is not accessible, return mock data for development
    console.warn('⚠️  VICAL not accessible - using mock data for development');
    return getMockVicalData();
  }
}

/**
 * Mock VICAL data for development
 * @returns {object}
 */
function getMockVicalData() {
  return {
    version: '1.0',
    timestamp: new Date().toISOString(),
    jurisdictions: [
      {
        code: 'CA',
        name: 'California',
        issuer: 'CA-DMV',
        certificates: [
          {
            kid: 'ca-dmv-2024-01',
            type: 'IACA',
            algorithm: 'ES256',
            publicKey: 'mock-public-key-ca',
            validFrom: '2024-01-01T00:00:00Z',
            validUntil: '2025-12-31T23:59:59Z'
          }
        ]
      },
      {
        code: 'NY',
        name: 'New York',
        issuer: 'NY-DMV',
        certificates: [
          {
            kid: 'ny-dmv-2024-01',
            type: 'IACA',
            algorithm: 'ES256',
            publicKey: 'mock-public-key-ny',
            validFrom: '2024-01-01T00:00:00Z',
            validUntil: '2025-12-31T23:59:59Z'
          }
        ]
      },
      {
        code: 'FL',
        name: 'Florida',
        issuer: 'FL-DMV',
        certificates: [
          {
            kid: 'fl-dmv-2024-01',
            type: 'IACA',
            algorithm: 'ES256',
            publicKey: 'mock-public-key-fl',
            validFrom: '2024-01-01T00:00:00Z',
            validUntil: '2025-12-31T23:59:59Z'
          }
        ]
      }
    ]
  };
}

/**
 * Load VICAL data from cache
 * @returns {Promise<object|null>}
 */
async function loadFromCache() {
  try {
    const cacheFile = path.join(CACHE_DIR, 'vical.json');
    const data = await fs.readFile(cacheFile, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

/**
 * Save VICAL data to cache
 * @param {object} data 
 */
async function saveToCache(data) {
  try {
    const cacheFile = path.join(CACHE_DIR, 'vical.json');
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(cacheFile, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Failed to save VICAL cache:', error);
  }
}

/**
 * Check if cache is expired
 * @param {string} timestamp 
 * @returns {boolean}
 */
function isCacheExpired(timestamp) {
  const age = Date.now() - new Date(timestamp).getTime();
  return age > CACHE_TTL;
}

/**
 * Get issuer certificate by jurisdiction code
 * @param {string} jurisdictionCode - e.g., 'CA', 'NY'
 * @returns {Promise<object[]>} Array of certificates
 */
export async function getIssuerCertificates(jurisdictionCode) {
  const vicalData = await fetchVical();
  
  const jurisdiction = vicalData.jurisdictions.find(
    j => j.code === jurisdictionCode.toUpperCase()
  );

  if (!jurisdiction) {
    throw new Error(`Jurisdiction ${jurisdictionCode} not found in VICAL`);
  }

  return jurisdiction.certificates;
}

/**
 * Refresh VICAL cache
 * Call this periodically (e.g., daily cron job)
 */
export async function refreshVicalCache() {
  console.log('🔄 Refreshing VICAL cache...');
  const cacheFile = path.join(CACHE_DIR, 'vical.json');
  
  try {
    // Delete existing cache
    await fs.unlink(cacheFile);
  } catch (error) {
    // Ignore if file doesn't exist
  }

  return await fetchVical();
}

