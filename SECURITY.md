# Security Best Practices

## Overview

This document outlines security considerations for deploying and operating zk-mdl-kit.

## Key Management

### Development

In development, keys are auto-generated and stored in local files:
- `.reader-keys.json` - Reader (verifier) key pair
- `.issuer-keys.json` - Issuer signing key pair

⚠️ **Never commit these files to version control**

### Production

For production deployment:

1. **Generate keys offline** in a secure environment
2. **Store in secrets management**:
   - AWS Secrets Manager
   - HashiCorp Vault
   - Azure Key Vault
   - Google Secret Manager

3. **Use environment variables** to inject keys:
   ```bash
   READER_PRIVATE_JWK='{"kty":"EC","crv":"P-256",...}'
   READER_PUBLIC_JWK='{"kty":"EC","crv":"P-256",...}'
   ISSUER_PRIVATE_JWK='{"kty":"EC","crv":"P-256",...}'
   ISSUER_PUBLIC_JWK='{"kty":"EC","crv":"P-256",...}'
   ```

4. **Rotate keys regularly** (every 90 days recommended)

5. **Use Hardware Security Modules (HSM)** for high-security deployments

### Key Rotation

When rotating keys:

1. Generate new key pair
2. Add new public key to JWKS with new `kid`
3. Keep old key for verification during transition (7-day overlap)
4. Update environment variables
5. Restart services
6. Remove old key after transition period

## Transport Security

### HTTPS Requirement

Digital Credentials API requires secure context:

- ✅ Production must use HTTPS
- ✅ Development can use `localhost` (HTTP allowed)
- ❌ Never use plain HTTP in production

### TLS Configuration

Recommended TLS settings:

```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;
ssl_prefer_server_ciphers on;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
```

### Certificate Pinning

For mobile apps, implement certificate pinning:

```javascript
// React Native example
const config = {
  certificatePinning: {
    certs: ["sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="]
  }
};
```

## Authentication & Authorization

### Verifier API

- No authentication required for `/api/verify` (public endpoint)
- Consider API keys for abuse prevention
- Implement rate limiting (see below)

### Issuer API

- Authorization code flow prevents unauthorized issuance
- Access tokens should be short-lived (1 hour)
- Validate session IDs against verifier records
- In production, implement proper OAuth 2.0 client authentication

## Rate Limiting

Implement rate limiting to prevent abuse:

### Recommended Limits

```javascript
// Rate limit configuration
const rateLimits = {
  '/api/verify': {
    windowMs: 60 * 1000,  // 1 minute
    max: 10               // 10 requests per minute
  },
  '/authorize': {
    windowMs: 60 * 1000,
    max: 5
  },
  '/token': {
    windowMs: 60 * 1000,
    max: 5
  },
  '/credential': {
    windowMs: 60 * 1000,
    max: 5
  }
};
```

### Implementation

Using express-rate-limit:

```javascript
import rateLimit from 'express-rate-limit';

const verifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many verification requests, please try again later'
});

app.post('/api/verify', verifyLimiter, verifyHandler);
```

## Data Protection

### Privacy by Design

1. **Request minimum data**
   - Only request necessary claims (age_over_21, not birth_date)
   - Use predicates instead of raw values

2. **Store minimum data**
   - Only store predicate outcomes
   - Never store PII from credentials
   - Log only anonymized data

3. **Retain minimum time**
   - Session data: 10 minutes
   - Derived VCs: 24 hours (max)
   - Logs: 30 days (anonymized)

### Logging

Safe logging practices:

```javascript
// ❌ NEVER log sensitive data
logger.info('User verified', { 
  birthDate: '1990-01-01',      // PII
  fullName: 'John Doe'          // PII
});

// ✅ Log only predicates and metadata
logger.info('User verified', {
  sessionId: 'abc123',
  predicates: { over21: true },
  issuerJurisdiction: 'CA',
  timestamp: new Date().toISOString()
});
```

### Database Security

If using persistent storage:

1. **Encrypt at rest**
   - Database-level encryption
   - Application-level encryption for sensitive fields

2. **Encrypt in transit**
   - TLS for all database connections
   - VPN or private network

3. **Access control**
   - Principle of least privilege
   - Database user per service
   - Read-only replicas where possible

## Trust & Certificate Verification

### VICAL Security

1. **Verify VICAL signatures**
   ```javascript
   // Verify VICAL data signature before use
   const isValid = await verifyVicalSignature(vicalData);
   if (!isValid) {
     throw new Error('VICAL signature invalid');
   }
   ```

2. **Pin VICAL certificate**
   - Don't trust arbitrary VICAL endpoints
   - Only use official AAMVA endpoint
   - Consider certificate pinning

3. **Validate certificate chains**
   - Verify IACA → DS cert → IssuerAuth
   - Check validity periods
   - Verify revocation status (OCSP/CRL)

### Issuer Pinning

Only accept credentials from trusted jurisdictions:

```javascript
// Strict allowlist
const ACCEPTED_JURISDICTIONS = ['CA', 'NY', 'FL'];

// Reject others
if (!ACCEPTED_JURISDICTIONS.includes(jurisdiction)) {
  return { accepted: false, reason: 'Jurisdiction not trusted' };
}
```

## Zero-Knowledge Proof Security

### Longfellow Integration

1. **Run Longfellow in isolated environment**
   - Separate container/VM
   - Limited network access
   - No internet connectivity if possible

2. **Verify proof parameters**
   - Check zk_system_type matches expected
   - Validate proof format
   - Ensure issuer key matches VICAL

3. **Timeout protection**
   ```javascript
   const LONGFELLOW_TIMEOUT = 5000; // 5 seconds
   
   const verifyWithTimeout = Promise.race([
     verifyWithLongfellow(proof),
     new Promise((_, reject) => 
       setTimeout(() => reject(new Error('Timeout')), LONGFELLOW_TIMEOUT)
     )
   ]);
   ```

### ZK Proof Validation

Always validate:
- ✅ Proof format matches expected
- ✅ Public inputs are correct
- ✅ Issuer signature is valid
- ✅ SessionTranscript binds to session
- ✅ Replay protection (nonce)

## Session Security

### Session Management

1. **Use secure session IDs**
   ```javascript
   const sessionId = crypto.randomUUID(); // UUIDv4
   ```

2. **Implement session expiry**
   ```javascript
   const SESSION_TTL = 10 * 60 * 1000; // 10 minutes
   
   setTimeout(() => {
     sessions.delete(sessionId);
   }, SESSION_TTL);
   ```

3. **Prevent session fixation**
   - Generate new session ID after verification
   - Don't accept client-provided session IDs

### Nonce Management

Prevent replay attacks:

```javascript
const usedNonces = new Set();

function validateNonce(nonce) {
  if (usedNonces.has(nonce)) {
    throw new Error('Nonce already used');
  }
  
  usedNonces.add(nonce);
  
  // Clean up old nonces after 1 hour
  setTimeout(() => usedNonces.delete(nonce), 3600000);
}
```

## Input Validation

### Validate All Inputs

```javascript
// Example validation middleware
function validateVerifyRequest(req, res, next) {
  const { response } = req.body;
  
  // Check required fields
  if (!response || typeof response !== 'string') {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'Missing or invalid response field'
    });
  }
  
  // Check JWE format (5 base64url parts separated by dots)
  const parts = response.split('.');
  if (parts.length !== 5) {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'Invalid JWE format'
    });
  }
  
  // Limit size (prevent DoS)
  if (response.length > 50000) {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'Response too large'
    });
  }
  
  next();
}

app.post('/api/verify', validateVerifyRequest, verifyHandler);
```

## CORS Configuration

### Development

Allow all origins for testing:

```javascript
app.use(cors());
```

### Production

Restrict to specific origins:

```javascript
const corsOptions = {
  origin: [
    'https://example.com',
    'https://app.example.com'
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400
};

app.use(cors(corsOptions));
```

## Error Handling

### Don't Leak Information

```javascript
// ❌ Bad - leaks internal details
catch (error) {
  res.status(500).json({ 
    error: error.stack,
    message: error.message,
    query: req.body
  });
}

// ✅ Good - generic error
catch (error) {
  logger.error('Verification failed', { error, sessionId });
  res.status(500).json({
    error: 'server_error',
    error_description: 'An internal error occurred'
  });
}
```

### Rate Limit Error Messages

```javascript
// ❌ Bad - reveals rate limit details
"Rate limit exceeded: 10 requests per minute, you made 15"

// ✅ Good - generic message
"Too many requests, please try again later"
```

## Monitoring & Alerting

### Security Events to Monitor

1. **Failed verifications** - May indicate attack
2. **Rate limit hits** - Possible abuse
3. **Invalid issuers** - Attempted fraud
4. **Expired credentials** - User experience issue
5. **Longfellow errors** - Service availability

### Example Monitoring

```javascript
// Log security events
function logSecurityEvent(type, details) {
  logger.warn('Security event', {
    type,
    ...details,
    timestamp: new Date().toISOString(),
    ip: req.ip
  });
  
  // Send alert for critical events
  if (['invalid_issuer', 'replay_attack'].includes(type)) {
    alerting.send({ severity: 'high', type, details });
  }
}
```

## Incident Response

### Preparation

1. **Document incident response plan**
2. **Maintain contact list** for security team
3. **Set up alerting** for critical events
4. **Test backup and restore** procedures

### Key Compromise

If private keys are compromised:

1. **Immediately rotate keys**
2. **Revoke compromised keys** (publish to JWKS with revoked status)
3. **Audit logs** for unauthorized access
4. **Notify affected users** if necessary
5. **Update secrets** in all environments
6. **Post-mortem** to prevent recurrence

## Compliance

### GDPR Considerations

- Obtain consent for data processing
- Implement right to erasure
- Data minimization by design
- Privacy impact assessment
- Breach notification within 72 hours

### CCPA Considerations

- Disclose data collection practices
- Provide opt-out mechanism
- Don't sell personal information
- Respond to access requests within 45 days

## Security Checklist

### Pre-Production

- [ ] Keys stored in secrets manager
- [ ] HTTPS configured with valid certificate
- [ ] Rate limiting enabled
- [ ] CORS configured for production origins
- [ ] Input validation on all endpoints
- [ ] Error messages don't leak info
- [ ] Logging doesn't include PII
- [ ] Session expiry implemented
- [ ] Nonce replay protection active
- [ ] VICAL signature verification enabled
- [ ] Issuer pinning configured
- [ ] Monitoring and alerting set up

### Post-Production

- [ ] Regular security audits
- [ ] Penetration testing
- [ ] Dependency updates (npm audit)
- [ ] Key rotation every 90 days
- [ ] Review logs for anomalies
- [ ] Test incident response plan

## Reporting Security Issues

If you discover a security vulnerability:

1. **Do not** open a public GitHub issue
2. Email security@example.com with details
3. Include steps to reproduce
4. Allow time for patch before disclosure
5. We aim to respond within 48 hours

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [ISO 18013-5 Security](https://www.iso.org/standard/69084.html)
- [NIST Digital Identity Guidelines](https://pages.nist.gov/800-63-3/)

