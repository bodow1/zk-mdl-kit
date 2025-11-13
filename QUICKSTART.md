# Quick Start Guide

Get up and running with zk-mdl-kit in 5 minutes.

## Prerequisites

- Node.js 20+
- Chrome 141+ (or Safari with DC-API enabled)

## Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

## Start Services

Open **three terminal windows** and run:

**Terminal 1:**
```bash
npm run start:verifier
# Verifier running on http://localhost:3000
```

**Terminal 2:**
```bash
npm run start:issuer
# Issuer running on http://localhost:3001
```

**Terminal 3:**
```bash
npm run start:example
# Example demo on http://localhost:8080
```

## Test It

1. Open **Chrome 141+** to `http://localhost:8080`
2. Click **"Verify with Digital ID"**
3. Select your mobile wallet (Google Wallet, Apple Wallet, etc.)
4. Approve the request on your device
5. See verification results!

## What Just Happened?

1. **Browser** requested age verification via Digital Credentials API
2. **Wallet** created a presentation (standard or ZK proof)
3. **Verifier** decrypted and validated the presentation
4. **Result** shows predicates only (not raw PII)

## Next Steps

### Test with cURL

```bash
cd examples
chmod +x curl-examples.sh
./curl-examples.sh
```

### Check API Health

```bash
curl http://localhost:3000/health  # Verifier
curl http://localhost:3001/health  # Issuer
```

### Get Reader Public Key

```bash
curl http://localhost:3000/api/reader-jwks
```

### Request Derived Credential

In the web demo:
1. Complete mDL verification first
2. Click **"Request Derived Credential"**
3. See SD-JWT VC issued!

## Project Structure

```
zk-mdl-kit/
├── verifier/          # mDL verification service
│   ├── server.js              # Express API
│   ├── verifyPresentation.js  # Core logic
│   ├── keys.js                # Key management
│   └── sessionTranscript.js   # ISO 18013-5
│
├── trust/             # Trust & issuer management
│   ├── vicalFetcher.js        # VICAL data
│   ├── issuerPinning.js       # Policy
│   └── iacaLoader.js          # IACA roots
│
├── issuer/            # Derived credential issuer
│   ├── server.js              # OID4VCI endpoints
│   ├── issueCredential.js     # SD-JWT VC
│   └── keys.js                # Issuer keys
│
└── examples/          # Demo & examples
    ├── public/
    │   ├── index.html         # Web UI
    │   └── app.js             # DC-API client
    └── curl-examples.sh       # API tests
```

## Common Issues

### "Digital Credentials API not available"

- Use Chrome 141+ or Safari with feature enabled
- Make sure you're on `localhost` or HTTPS

### "Longfellow not available"

- Normal! The verifier uses mock verification when Longfellow isn't running
- For real ZK verification, set up [Longfellow](https://github.com/google/longfellow-zk)

### "No wallet available"

- You need Google Wallet (Android) or Apple Wallet (iOS) with an mDL
- Request a test mDL from your state DMV's pilot program

## Learn More

- **[SETUP.md](SETUP.md)** - Detailed setup instructions
- **[API.md](API.md)** - Complete API reference
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System design
- **[SECURITY.md](SECURITY.md)** - Security best practices

## Need Help?

- Open a [GitHub issue](https://github.com/yourusername/zk-mdl-kit/issues)
- Check the [documentation](README.md)
- Review the [examples](examples/)

---

**Happy verifying! 🔐**

