/**
 * Verifier Server - OID4VP endpoint with DC-API handover
 * Handles mDL verification via Longfellow adapter
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { verifyPresentation } from './verifyPresentation.js';
import { getReaderKeys } from './keys.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

/**
 * POST /api/verify
 * Accepts DC-API response containing JWE-encrypted VP token
 */
app.post('/api/verify', async (req, res) => {
  try {
    const { response: jwe } = req.body;
    
    if (!jwe) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Missing response (JWE) in request body' 
      });
    }

    // Verify the presentation via Longfellow
    const result = await verifyPresentation(jwe);

    if (!result.valid) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Verification failed',
        details: result.error 
      });
    }

    // Return minimal predicate outcomes (not raw PII)
    return res.json({
      ok: true,
      predicates: result.predicates,
      sessionId: result.sessionId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({ 
      ok: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/reader-jwks
 * Returns the reader's public JWK for embedding in DC-API requests
 */
app.get('/api/reader-jwks', async (req, res) => {
  try {
    const { publicJwk } = await getReaderKeys();
    return res.json({
      keys: [publicJwk]
    });
  } catch (error) {
    console.error('Error retrieving reader keys:', error);
    return res.status(500).json({ 
      error: 'Failed to retrieve reader keys' 
    });
  }
});

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'zk-mdl-kit-verifier',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🔐 Verifier service running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🔑 Reader JWKS: http://localhost:${PORT}/api/reader-jwks`);
  console.log(`✅ Verify endpoint: POST http://localhost:${PORT}/api/verify`);
});

export default app;

