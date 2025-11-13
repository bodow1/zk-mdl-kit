/**
 * Issuer Server - OID4VCI endpoint for SD-JWT VC issuance
 * Issues short-lived derived VCs after mDL verification
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { issueCredential } from './issueCredential.js';
import { getIssuerKeys } from './keys.js';
import crypto from 'crypto';

dotenv.config();

const app = express();
const PORT = process.env.ISSUER_PORT || 3001;

app.use(cors());
app.use(express.json());

// In-memory session store (use Redis/DB in production)
const sessions = new Map();

/**
 * POST /authorize
 * Initial authorization for credential issuance
 * Client provides proof of mDL verification
 */
app.post('/authorize', async (req, res) => {
  try {
    const { verificationSessionId, holderPublicKey } = req.body;

    if (!verificationSessionId || !holderPublicKey) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing verificationSessionId or holderPublicKey'
      });
    }

    // In production, verify the session with the verifier service
    // For now, accept any session

    // Generate authorization code
    const authCode = crypto.randomUUID();
    const sessionData = {
      authCode,
      holderPublicKey,
      verificationSessionId,
      timestamp: new Date().toISOString()
    };

    sessions.set(authCode, sessionData);

    // Auto-expire after 10 minutes
    setTimeout(() => sessions.delete(authCode), 10 * 60 * 1000);

    return res.json({
      authorization_code: authCode,
      expires_in: 600
    });

  } catch (error) {
    console.error('Authorization error:', error);
    return res.status(500).json({
      error: 'server_error',
      error_description: error.message
    });
  }
});

/**
 * POST /token
 * Exchange authorization code for access token
 */
app.post('/token', async (req, res) => {
  try {
    const { grant_type, code } = req.body;

    if (grant_type !== 'authorization_code') {
      return res.status(400).json({
        error: 'unsupported_grant_type',
        error_description: 'Only authorization_code grant type is supported'
      });
    }

    const session = sessions.get(code);
    if (!session) {
      return res.status(400).json({
        error: 'invalid_grant',
        error_description: 'Invalid or expired authorization code'
      });
    }

    // Generate access token
    const accessToken = crypto.randomUUID();
    session.accessToken = accessToken;
    sessions.set(accessToken, session);

    return res.json({
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: 3600,
      c_nonce: crypto.randomUUID(),
      c_nonce_expires_in: 300
    });

  } catch (error) {
    console.error('Token error:', error);
    return res.status(500).json({
      error: 'server_error',
      error_description: error.message
    });
  }
});

/**
 * POST /credential
 * Issue the actual SD-JWT VC
 */
app.post('/credential', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'invalid_token',
        error_description: 'Missing or invalid access token'
      });
    }

    const accessToken = authHeader.substring(7);
    const session = sessions.get(accessToken);

    if (!session) {
      return res.status(401).json({
        error: 'invalid_token',
        error_description: 'Invalid or expired access token'
      });
    }

    const { format, proof } = req.body;

    // Validate format
    if (format && format !== 'vc+sd-jwt') {
      return res.status(400).json({
        error: 'unsupported_credential_format',
        error_description: 'Only vc+sd-jwt format is supported'
      });
    }

    // Validate proof (KB-JWT for holder binding)
    // In production, verify the proof signature
    if (proof && proof.proof_type !== 'jwt') {
      return res.status(400).json({
        error: 'invalid_proof',
        error_description: 'Only jwt proof type is supported'
      });
    }

    // Issue the credential
    const credential = await issueCredential({
      holderPublicKey: session.holderPublicKey,
      verificationSessionId: session.verificationSessionId,
      claims: {
        over21: true,
        notExpired: true
      }
    });

    return res.json({
      format: 'vc+sd-jwt',
      credential: credential.sdJwt,
      c_nonce: crypto.randomUUID(),
      c_nonce_expires_in: 300
    });

  } catch (error) {
    console.error('Credential issuance error:', error);
    return res.status(500).json({
      error: 'server_error',
      error_description: error.message
    });
  }
});

/**
 * GET /.well-known/openid-credential-issuer
 * OID4VCI discovery endpoint
 */
app.get('/.well-known/openid-credential-issuer', async (req, res) => {
  const { publicJwk } = await getIssuerKeys();
  
  res.json({
    credential_issuer: `http://localhost:${PORT}`,
    credential_endpoint: `http://localhost:${PORT}/credential`,
    token_endpoint: `http://localhost:${PORT}/token`,
    authorization_endpoint: `http://localhost:${PORT}/authorize`,
    jwks: {
      keys: [publicJwk]
    },
    credentials_supported: [
      {
        format: 'vc+sd-jwt',
        id: 'derived-mdl-vc',
        cryptographic_binding_methods_supported: ['jwk'],
        cryptographic_suites_supported: ['ES256'],
        display: [
          {
            name: 'Derived mDL Credential',
            locale: 'en-US',
            description: 'Short-lived derived credential from mDL verification'
          }
        ],
        claims: {
          over21: {
            display: [{ name: 'Over 21', locale: 'en-US' }]
          },
          notExpired: {
            display: [{ name: 'Not Expired', locale: 'en-US' }]
          }
        }
      }
    ]
  });
});

/**
 * GET /health
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'zk-mdl-kit-issuer',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🎫 Issuer service running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🔍 Discovery: http://localhost:${PORT}/.well-known/openid-credential-issuer`);
});

export default app;

