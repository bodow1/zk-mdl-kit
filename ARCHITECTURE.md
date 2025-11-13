# Architecture Guide

## Overview

zk-mdl-kit implements a complete flow for verifying mobile driver's licenses (mDL) in web browsers and issuing derived credentials.

```
┌─────────────┐
│   Browser   │
│  (DC-API)   │
└──────┬──────┘
       │ 1. Request mDL presentation
       ▼
┌─────────────┐
│   Wallet    │
│ (iOS/Android)│
└──────┬──────┘
       │ 2. Return VP (JWE-encrypted)
       ▼
┌─────────────┐
│  Verifier   │
│   Service   │
└──────┬──────┘
       │ 3. Decrypt & verify
       ▼
┌─────────────┐         ┌─────────────┐
│ Longfellow  │◄────────┤    Trust    │
│   ZK Verify │         │   (VICAL)   │
└──────┬──────┘         └─────────────┘
       │ 4. Return predicates
       ▼
┌─────────────┐
│   Issuer    │
│  (OID4VCI)  │
└──────┬──────┘
       │ 5. Issue SD-JWT VC
       ▼
┌─────────────┐
│   Wallet    │
│  (storage)  │
└─────────────┘
```

## Components

### 1. Verifier Module

**Purpose:** Accept and verify mDL presentations from wallets.

**Key Files:**
- `verifier/server.js` - Express server with API endpoints
- `verifier/verifyPresentation.js` - Core verification logic
- `verifier/sessionTranscript.js` - ISO 18013-5 SessionTranscript builder
- `verifier/keys.js` - Reader key management

**Flow:**

1. Browser requests reader's public JWK (`GET /api/reader-jwks`)
2. Browser embeds JWK in DC-API request to wallet
3. Wallet returns JWE-encrypted VP token
4. Verifier decrypts JWE with reader's private key
5. Verifier builds SessionTranscript (ISO 18013-5 binding)
6. Verifier calls Longfellow to verify proof
7. Verifier returns minimal predicates (not raw PII)

**Data Minimization:**

Only predicates are returned, never raw PII:
- ✅ `over21: true`
- ✅ `notExpired: true`
- ✅ `issuerJurisdiction: "CA"`
- ❌ `birthDate: "1990-01-01"`
- ❌ `fullName: "John Doe"`

### 2. Trust Module

**Purpose:** Manage trusted issuers and certificate verification.

**Key Files:**
- `trust/vicalFetcher.js` - VICAL data fetching and caching
- `trust/issuerPinning.js` - Jurisdiction acceptance policy
- `trust/iacaLoader.js` - IACA root certificate loader

**Trust Sources:**

1. **VICAL (Verified Issuer CA List)**
   - Official AAMVA list of issuer public keys
   - Cached locally with 24-hour TTL
   - Filtered by accepted jurisdictions

2. **IACA (Issuer Authority CA)**
   - Root certificates from DMVs
   - California IACA available for dev/testing
   - Used by Longfellow for chain verification

**Pinning Policy:**

```javascript
// Only accept certain jurisdictions
ACCEPTED_JURISDICTIONS = ['CA', 'NY', 'FL']

// Verify issuer matches policy
verifyIssuer('CA-DMV', 'key-id-123') → {accepted: true}
verifyIssuer('XX-DMV', 'key-id-456') → {accepted: false}
```

### 3. Issuer Module

**Purpose:** Issue short-lived derived credentials after mDL verification.

**Key Files:**
- `issuer/server.js` - OID4VCI-compliant server
- `issuer/issueCredential.js` - SD-JWT VC creation
- `issuer/keys.js` - Issuer key management

**Flow (OID4VCI):**

1. **Authorization**
   ```
   POST /authorize
   {
     "verificationSessionId": "...",
     "holderPublicKey": {...}
   }
   → authorization_code
   ```

2. **Token Exchange**
   ```
   POST /token
   {
     "grant_type": "authorization_code",
     "code": "..."
   }
   → access_token
   ```

3. **Credential Issuance**
   ```
   POST /credential
   Authorization: Bearer <access_token>
   {
     "format": "vc+sd-jwt"
   }
   → SD-JWT VC
   ```

**SD-JWT VC Structure:**

```
eyJhbGciOiJFUzI1NiIsInR5cCI6InZjK3NkLWp3dCJ9.eyJpc3MiOi...
~WyJzYWx0IiwgIm92ZXIyMSIsIHRydWVd
~WyJzYWx0IiwgIm5vdEV4cGlyZWQiLCB0cnVlXQ
~
```

- **JWT**: Contains issuer signature and disclosure digests
- **Disclosures**: Selective disclosure of claims (base64url-encoded)
- **Holder Binding**: Cryptographically bound to holder's key

### 4. Examples Module

**Purpose:** Demonstrate end-to-end flow with web UI.

**Key Files:**
- `examples/server.js` - Static file server
- `examples/public/index.html` - Web UI
- `examples/public/app.js` - DC-API client code
- `examples/curl-examples.sh` - API testing scripts

**Features:**

- Modern, responsive UI
- Complete DC-API integration
- Error handling and status display
- Derived credential flow demonstration

## Data Flow

### Full Verification Flow

```
┌─────────┐
│ Browser │ 1. Click "Verify"
└────┬────┘
     │
     ▼
┌─────────┐
│ App.js  │ 2. Fetch reader JWKS
└────┬────┘
     │
     ▼
┌─────────┐
│Verifier │ 3. Return public JWK
└────┬────┘
     │
     ▼
┌─────────┐
│ App.js  │ 4. Build DC-API request
└────┬────┘
     │
     ▼
┌─────────┐
│DC-API   │ 5. Dispatch to wallet
└────┬────┘
     │
     ▼
┌─────────┐
│ Wallet  │ 6. User approves
└────┬────┘    7. Sign/encrypt VP
     │
     ▼
┌─────────┐
│DC-API   │ 8. Return to app
└────┬────┘
     │
     ▼
┌─────────┐
│ App.js  │ 9. POST to /api/verify
└────┬────┘
     │
     ▼
┌─────────┐
│Verifier │ 10. Decrypt JWE
└────┬────┘    11. Build SessionTranscript
     │
     ▼
┌─────────┐
│Longfellow│ 12. Verify ZK proof
└────┬────┘
     │
     ▼
┌─────────┐
│ Trust   │ 13. Check issuer policy
└────┬────┘
     │
     ▼
┌─────────┐
│Verifier │ 14. Extract predicates
└────┬────┘
     │
     ▼
┌─────────┐
│ Browser │ 15. Display results ✓
└─────────┘
```

### Derived Credential Flow

```
┌─────────┐
│ App.js  │ 1. Generate holder keypair
└────┬────┘
     │
     ▼
┌─────────┐
│ Issuer  │ 2. POST /authorize
└────┬────┘    → auth_code
     │
     ▼
┌─────────┐
│ App.js  │ 3. POST /token
└────┬────┘
     │
     ▼
┌─────────┐
│ Issuer  │ 4. Validate code
└────┬────┘    → access_token
     │
     ▼
┌─────────┐
│ App.js  │ 5. POST /credential
└────┬────┘       (with access_token)
     │
     ▼
┌─────────┐
│ Issuer  │ 6. Create SD-JWT VC
└────┬────┘    7. Sign with issuer key
     │         8. Bind to holder key
     ▼
┌─────────┐
│ App.js  │ 9. Store credential
└────┬────┘   10. Display ✓
```

## Security Architecture

### Key Management

**Reader (Verifier) Keys:**
- P-256 key pair
- Private key for JWE decryption
- Public key shared via JWKS endpoint
- Rotated periodically

**Issuer Keys:**
- P-256 key pair
- Private key for SD-JWT VC signing
- Public key in OID4VCI metadata
- Rotated periodically

**Holder Keys:**
- Generated client-side
- Bound to derived credentials
- Ephemeral (can be per-session)

### Transport Security

- **HTTPS required** for production (DC-API requirement)
- **JWE encryption** for VP tokens (end-to-end encryption)
- **JWT signatures** for credential integrity

### Trust Model

```
┌──────────┐
│   AAMVA  │ Root trust anchor
│  (VICAL) │
└────┬─────┘
     │
     ▼
┌──────────┐
│CA-DMV    │ Issuer CA
│ (IACA)   │
└────┬─────┘
     │
     ▼
┌──────────┐
│  mDL     │ Issued credential
│Document  │
└────┬─────┘
     │
     ▼
┌──────────┐
│ Verifier │ Relying party
│ (zk-mdl) │
└────┬─────┘
     │
     ▼
┌──────────┐
│ Derived  │ Short-lived VC
│   VC     │
└──────────┘
```

## Privacy Architecture

### Data Minimization

1. **Request only needed claims**
   - age_over_21 (not birth_date)
   - not_expired (not expiration_date)

2. **Return only predicates**
   - Boolean outcomes, not raw values
   - Issuer jurisdiction, not full cert chain

3. **Short-lived derived VCs**
   - 24-hour TTL by default
   - Minimal claims (over21, notExpired)

### Zero-Knowledge Proofs

When using ZK mode (`mso_mdoc_zk`):

1. Wallet generates ZK proof
2. Proof reveals only predicates, not underlying data
3. Longfellow verifies proof against issuer public key
4. Verifier never sees raw PII

**Example:**
- User proves "age > 21" without revealing birthdate
- Cryptographically sound via Groth16 ZK-SNARKs

### Unlinkability

- Each verification uses unique nonce
- No persistent identifiers in predicates
- Derived VCs use fresh holder keys
- Optional: implement presentation tokens for unlinkable re-use

## Scalability

### Performance

- **Verifier:** ~50ms per verification (without Longfellow)
- **Longfellow:** ~200-500ms per ZK proof verification
- **Issuer:** ~30ms per SD-JWT VC issuance

### Caching Strategy

1. **VICAL cache:** 24-hour TTL, background refresh
2. **IACA cache:** Persistent, manual refresh
3. **Session cache:** In-memory, 10-minute TTL

### Production Scaling

- Load balance verifier instances
- Dedicated Longfellow cluster
- Redis for session storage
- CDN for static files
- Rate limiting per IP

## Standards Compliance

- ✅ **ISO 18013-5:** mDL format and SessionTranscript
- ✅ **ISO 18013-7:** Device retrieval over web (DC-API)
- ✅ **OID4VP 1.0:** Verifiable presentation exchange
- ✅ **OID4VCI 1.0:** Credential issuance
- ✅ **SD-JWT VC (draft):** Selective disclosure
- ✅ **W3C VC Data Model 2.0:** Verifiable credentials (optional DI path)

## Extensibility

### Adding New Formats

To support additional credential formats:

1. Add format handler in `verifier/verifyPresentation.js`
2. Implement format-specific verification logic
3. Update DC-API request in `examples/public/app.js`

### Adding BBS+ Support

For W3C Data Integrity with BBS+:

1. Add BBS+ library (`@mattrglobal/bbs-signatures`)
2. Implement in `issuer/issueCredential.js`
3. Add `DataIntegrityProof` to VC structure
4. Update credential format to `ldp_vc`

### Custom Trust Policies

Extend `trust/issuerPinning.js`:

```javascript
export function customTrustPolicy(issuer, credential) {
  // Custom logic here
  return { accepted: true, reason: '...' };
}
```

## Testing Strategy

1. **Unit tests:** Each module independently
2. **Integration tests:** Full flow end-to-end
3. **Mock mode:** Longfellow unavailable → mock verification
4. **Browser testing:** Chrome/Safari with test mDLs

