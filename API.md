# API Documentation

Complete API reference for zk-mdl-kit services.

## Verifier API

Base URL: `http://localhost:3000` (development)

### POST /api/verify

Verify an mDL presentation from Digital Credentials API.

**Request:**

```json
{
  "response": "<JWE-encrypted-vp-token>"
}
```

**Success Response (200):**

```json
{
  "ok": true,
  "predicates": {
    "over21": true,
    "notExpired": true,
    "issuerJurisdiction": "CA-DMV"
  },
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Error Response (400):**

```json
{
  "ok": false,
  "error": "Verification failed",
  "details": "Invalid signature"
}
```

### GET /api/reader-jwks

Get the reader's public JWK for embedding in DC-API requests.

**Success Response (200):**

```json
{
  "keys": [
    {
      "kty": "EC",
      "crv": "P-256",
      "x": "WKn-ZIGevcwGIyyrzFoZNBdaq9_TsqzGl96oc0CWuis",
      "y": "y77t-RvAHRKTsSGdIYUfweuOvwrvDD-Q3Hv5J0fSKbE"
    }
  ]
}
```

### GET /health

Health check endpoint.

**Success Response (200):**

```json
{
  "status": "ok",
  "service": "zk-mdl-kit-verifier",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Issuer API (OID4VCI)

Base URL: `http://localhost:3001` (development)

### POST /authorize

Initial authorization for credential issuance.

**Request:**

```json
{
  "verificationSessionId": "550e8400-e29b-41d4-a716-446655440000",
  "holderPublicKey": {
    "kty": "EC",
    "crv": "P-256",
    "x": "...",
    "y": "..."
  }
}
```

**Success Response (200):**

```json
{
  "authorization_code": "8e7f3a2b-9c4d-41e5-b6a7-123456789abc",
  "expires_in": 600
}
```

**Error Response (400):**

```json
{
  "error": "invalid_request",
  "error_description": "Missing verificationSessionId or holderPublicKey"
}
```

### POST /token

Exchange authorization code for access token (OID4VCI token endpoint).

**Request:**

```json
{
  "grant_type": "authorization_code",
  "code": "8e7f3a2b-9c4d-41e5-b6a7-123456789abc"
}
```

**Success Response (200):**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "c_nonce": "550e8400-e29b-41d4-a716-446655440000",
  "c_nonce_expires_in": 300
}
```

**Error Response (400):**

```json
{
  "error": "invalid_grant",
  "error_description": "Invalid or expired authorization code"
}
```

### POST /credential

Issue SD-JWT VC (OID4VCI credential endpoint).

**Request:**

```http
POST /credential
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "format": "vc+sd-jwt",
  "proof": {
    "proof_type": "jwt",
    "jwt": "<key-binding-jwt>"
  }
}
```

**Success Response (200):**

```json
{
  "format": "vc+sd-jwt",
  "credential": "eyJhbGciOiJFUzI1NiIsInR5cCI6InZjK3NkLWp3dCJ9...~WyJzYWx0IiwgImNsYWltIiwgdmFsdWVd~...",
  "c_nonce": "550e8400-e29b-41d4-a716-446655440000",
  "c_nonce_expires_in": 300
}
```

**Error Response (401):**

```json
{
  "error": "invalid_token",
  "error_description": "Missing or invalid access token"
}
```

### GET /.well-known/openid-credential-issuer

OID4VCI discovery endpoint.

**Success Response (200):**

```json
{
  "credential_issuer": "http://localhost:3001",
  "credential_endpoint": "http://localhost:3001/credential",
  "token_endpoint": "http://localhost:3001/token",
  "authorization_endpoint": "http://localhost:3001/authorize",
  "jwks": {
    "keys": [
      {
        "kty": "EC",
        "crv": "P-256",
        "x": "...",
        "y": "...",
        "kid": "issuer-key-1"
      }
    ]
  },
  "credentials_supported": [
    {
      "format": "vc+sd-jwt",
      "id": "derived-mdl-vc",
      "cryptographic_binding_methods_supported": ["jwk"],
      "cryptographic_suites_supported": ["ES256"],
      "display": [
        {
          "name": "Derived mDL Credential",
          "locale": "en-US",
          "description": "Short-lived derived credential from mDL verification"
        }
      ],
      "claims": {
        "over21": {
          "display": [{ "name": "Over 21", "locale": "en-US" }]
        },
        "notExpired": {
          "display": [{ "name": "Not Expired", "locale": "en-US" }]
        }
      }
    }
  ]
}
```

### GET /health

Health check endpoint.

**Success Response (200):**

```json
{
  "status": "ok",
  "service": "zk-mdl-kit-issuer",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## SD-JWT VC Format

The issued credentials use the SD-JWT VC format:

```
<JWT>~<disclosure1>~<disclosure2>~...~
```

**Example JWT payload:**

```json
{
  "iss": "http://localhost:3001",
  "sub": "holder-identifier",
  "iat": 1705318200,
  "exp": 1705404600,
  "vct": "https://example.com/derived-mdl-vc",
  "_sd": [
    "sha256-hash-of-disclosure1",
    "sha256-hash-of-disclosure2"
  ],
  "cnf": {
    "jwk": {
      "kty": "EC",
      "crv": "P-256",
      "x": "...",
      "y": "..."
    }
  },
  "_sd_alg": "sha-256"
}
```

**Example disclosure:**

```json
["salt-value", "over21", true]
```

Base64url-encoded: `WyJzYWx0LXZhbHVlIiwgIm92ZXIyMSIsIHRydWVd`

---

## Digital Credentials API Request Format

Example request for Chrome/Safari DC-API:

```javascript
const request = {
  protocol: "openid4vp-v1-unsigned",
  data: {
    response_type: "vp_token",
    response_mode: "dc_api.jwt",
    nonce: crypto.randomUUID(),
    client_id: "https://verifier.example.com",
    client_metadata: {
      jwks: { keys: [readerPublicKey] }
    },
    dcql_query: {
      credentials: [{
        id: "mdl",
        format: "mso_mdoc", // or "mso_mdoc_zk" for ZK
        meta: { 
          doctype_value: "org.iso.18013.5.1.mDL"
          // For ZK: zk_system_type: "longfellow"
        },
        claims: [
          { path: ["org.iso.18013.5.1", "age_over_21"] }
        ]
      }]
    }
  }
};

const credential = await navigator.credentials.get({
  digital: { requests: [request] }
});
```

---

## Error Codes

### Verifier Errors

- `invalid_request` - Missing required parameters
- `verification_failed` - Credential verification failed
- `longfellow_unavailable` - Longfellow service not reachable
- `unsupported_format` - Credential format not supported
- `invalid_issuer` - Issuer not in accepted list

### Issuer Errors (OID4VCI)

- `invalid_request` - Malformed request
- `invalid_grant` - Invalid or expired authorization code
- `invalid_token` - Invalid or expired access token
- `unsupported_grant_type` - Grant type not supported
- `unsupported_credential_format` - Credential format not supported
- `invalid_proof` - Key binding proof invalid
- `server_error` - Internal server error

---

## Rate Limits

Development: No rate limits

Production recommendations:
- `/api/verify`: 10 requests per minute per IP
- `/authorize`: 5 requests per minute per IP
- `/token`: 5 requests per minute per IP
- `/credential`: 5 requests per minute per IP

---

## CORS

Development: All origins allowed

Production: Configure allowed origins in environment variables.

