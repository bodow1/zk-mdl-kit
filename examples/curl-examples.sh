#!/bin/bash
# cURL examples for testing the zk-mdl-kit APIs

BASE_VERIFIER="http://localhost:3000"
BASE_ISSUER="http://localhost:3001"

echo "=== zk-mdl-kit API Examples ==="
echo ""

# 1. Health checks
echo "1. Health Checks"
echo "----------------"
echo "Verifier health:"
curl -s "${BASE_VERIFIER}/health" | jq '.'
echo ""
echo "Issuer health:"
curl -s "${BASE_ISSUER}/health" | jq '.'
echo ""

# 2. Get reader JWKS
echo "2. Get Reader JWKS"
echo "------------------"
curl -s "${BASE_VERIFIER}/api/reader-jwks" | jq '.'
echo ""

# 3. Get issuer metadata
echo "3. Get Issuer Metadata (OID4VCI Discovery)"
echo "-------------------------------------------"
curl -s "${BASE_ISSUER}/.well-known/openid-credential-issuer" | jq '.'
echo ""

# 4. Verify presentation (mock example)
echo "4. Verify Presentation"
echo "----------------------"
echo "Note: This requires actual JWE from Digital Credentials API"
echo "Example structure:"
cat << 'EOF'
{
  "response": "<JWE-encrypted-vp-token>"
}
EOF
echo ""

# 5. Request derived credential
echo "5. Request Derived Credential Flow"
echo "-----------------------------------"
echo "Step 1: Authorize"
AUTH_RESPONSE=$(curl -s -X POST "${BASE_ISSUER}/authorize" \
  -H "Content-Type: application/json" \
  -d '{
    "verificationSessionId": "test-session-123",
    "holderPublicKey": {
      "kty": "EC",
      "crv": "P-256",
      "x": "WKn-ZIGevcwGIyyrzFoZNBdaq9_TsqzGl96oc0CWuis",
      "y": "y77t-RvAHRKTsSGdIYUfweuOvwrvDD-Q3Hv5J0fSKbE"
    }
  }')
echo "$AUTH_RESPONSE" | jq '.'
echo ""

AUTH_CODE=$(echo "$AUTH_RESPONSE" | jq -r '.authorization_code')

if [ "$AUTH_CODE" != "null" ]; then
  echo "Step 2: Exchange code for token"
  TOKEN_RESPONSE=$(curl -s -X POST "${BASE_ISSUER}/token" \
    -H "Content-Type: application/json" \
    -d "{
      \"grant_type\": \"authorization_code\",
      \"code\": \"$AUTH_CODE\"
    }")
  echo "$TOKEN_RESPONSE" | jq '.'
  echo ""

  ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token')

  if [ "$ACCESS_TOKEN" != "null" ]; then
    echo "Step 3: Request credential"
    curl -s -X POST "${BASE_ISSUER}/credential" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -d '{
        "format": "vc+sd-jwt"
      }' | jq '.'
    echo ""
  fi
fi

echo "=== Examples Complete ==="

