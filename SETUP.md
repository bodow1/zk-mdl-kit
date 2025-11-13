# Setup Guide

This guide will help you set up and run the zk-mdl-kit project.

## Prerequisites

- **Node.js 20+** - [Download here](https://nodejs.org/)
- **Chrome 141+** or Safari with Digital Credentials API enabled
- **Longfellow verifier-service** (optional for full ZK verification) - [GitHub](https://github.com/google/longfellow-zk)

## Installation

### 1. Clone and install dependencies

```bash
cd zk-mdl-kit
npm install
```

### 2. Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and configure as needed. The defaults will work for local development.

### 3. Generate keys (optional)

The services will automatically generate P-256 key pairs on first run. For production, you should pre-generate and securely store these keys.

To generate keys manually:

```bash
node -e "import('jose').then(j => j.generateKeyPair('ES256').then(k => Promise.all([j.exportJWK(k.publicKey), j.exportJWK(k.privateKey)]).then(([pub, priv]) => console.log('Public:', JSON.stringify(pub), '\nPrivate:', JSON.stringify(priv)))))"
```

## Running the Services

### Option 1: Run all services (recommended for testing)

Open three terminal windows:

**Terminal 1 - Verifier:**
```bash
npm run start:verifier
```

**Terminal 2 - Issuer:**
```bash
npm run start:issuer
```

**Terminal 3 - Example Demo:**
```bash
npm run start:example
```

### Option 2: Run individual services

**Verifier only:**
```bash
npm run start:verifier
```

**Issuer only:**
```bash
npm run start:issuer
```

**Example demo only:**
```bash
npm run start:example
```

## Testing

### 1. Web Demo

Open your browser to:

```
http://localhost:8080
```

You must use Chrome 141+ or Safari with Digital Credentials API enabled.

### 2. cURL Examples

Test the APIs with cURL:

```bash
cd examples
chmod +x curl-examples.sh
./curl-examples.sh
```

### 3. Manual API Testing

**Check verifier health:**
```bash
curl http://localhost:3000/health
```

**Get reader JWKS:**
```bash
curl http://localhost:3000/api/reader-jwks
```

**Check issuer health:**
```bash
curl http://localhost:3001/health
```

**Get issuer metadata:**
```bash
curl http://localhost:3001/.well-known/openid-credential-issuer
```

## Setting Up Longfellow (Optional)

For full zero-knowledge proof verification, you need to run Longfellow verifier-service:

### 1. Clone Longfellow

```bash
git clone https://github.com/google/longfellow-zk.git
cd longfellow-zk
```

### 2. Run with Docker

```bash
docker build -t longfellow-verifier .
docker run -p 8080:8080 longfellow-verifier
```

### 3. Update your .env

```bash
LONGFELLOW_URL=http://localhost:8080
```

## Trust Configuration

### VICAL (Production)

To use real VICAL data:

1. Enroll at [AAMVA DTS](https://www.aamva.org/identity/mobile-driver-license-digital-trust-service/)
2. Download VICAL data
3. Configure accepted jurisdictions in `.env`:

```bash
ACCEPTED_JURISDICTIONS=CA,NY,FL,TX
```

### California IACA Root (Development)

For California testing:

1. Download the IACA root from [CA DMV](https://www.dmv.ca.gov/portal/ca-dmv-wallet/mdl-reader/)
2. Place in `trust/cache/ca-iaca-root.pem`

The service will automatically cache and use it.

## Browser Configuration

### Chrome

Digital Credentials API is shipped in Chrome 141+. No configuration needed.

### Safari

Enable the Digital Credentials API in the experimental features:

1. Safari → Develop → Experimental Features → Digital Credentials API

## Production Deployment

For production deployment:

1. **Secure key storage** - Use environment variables or secrets management (AWS Secrets Manager, HashiCorp Vault, etc.)
2. **HTTPS required** - Digital Credentials API requires secure context
3. **Real VICAL** - Enroll and fetch real issuer certificates
4. **Longfellow service** - Deploy the verifier-service for ZK verification
5. **Database** - Replace in-memory stores with persistent storage
6. **Rate limiting** - Add rate limiting to prevent abuse
7. **Monitoring** - Add logging and monitoring

### Environment Variables for Production

```bash
# Production URLs
VERIFIER_URL=https://verifier.example.com
ISSUER_URL=https://issuer.example.com

# Secure keys (from secrets management)
READER_PRIVATE_JWK=...
READER_PUBLIC_JWK=...
ISSUER_PRIVATE_JWK=...
ISSUER_PUBLIC_JWK=...

# Trust configuration
VICAL_URL=https://vical.dts.aamva.org
VICAL_AUTH_TOKEN=...
ACCEPTED_JURISDICTIONS=CA,NY,FL,TX

# Longfellow
LONGFELLOW_URL=https://longfellow.internal.example.com

# Redis/DB
REDIS_URL=redis://...
DATABASE_URL=postgresql://...
```

## Troubleshooting

### "Digital Credentials API not available"

- Make sure you're using Chrome 141+ or Safari with the feature enabled
- Check that you're on HTTPS (or localhost for development)

### "Longfellow not available"

- The verifier will use mock verification if Longfellow is not running
- For full ZK verification, make sure Longfellow is running on port 8080

### "VICAL fetch failed"

- The system uses mock VICAL data for development
- For production, enroll with AAMVA DTS to get real VICAL access

### Keys not persisting

- Keys are saved to `.reader-keys.json` and `.issuer-keys.json`
- For production, set keys in environment variables instead

## Next Steps

- Read the [API Documentation](API.md) for detailed endpoint information
- Check out the [Architecture Guide](ARCHITECTURE.md) for system design
- Review the [Security Best Practices](SECURITY.md)
- Join the discussion on [GitHub](https://github.com/yourusername/zk-mdl-kit)

