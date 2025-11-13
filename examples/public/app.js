/**
 * Frontend application for Digital Credentials API demo
 */

const VERIFIER_URL = 'http://localhost:3000';
const ISSUER_URL = 'http://localhost:3001';

let verificationSessionId = null;
let holderPublicKey = null;

// UI elements
const verifyBtn = document.getElementById('verifyBtn');
const requestDerivedBtn = document.getElementById('requestDerivedBtn');
const statusDiv = document.getElementById('status');
const resultDiv = document.getElementById('result');

/**
 * Main verification flow
 */
async function verifyWithDigitalID() {
  try {
    // Check if Digital Credentials API is available
    if (!('DigitalCredential' in window)) {
      showStatus('error', 'Digital Credentials API not available in this browser. Please use Chrome 141+ or Safari with the feature enabled.');
      return;
    }

    showStatus('info', 'Fetching reader keys...');

    // Get reader's public key from verifier
    const jwksResponse = await fetch(`${VERIFIER_URL}/api/reader-jwks`);
    const jwks = await jwksResponse.json();
    const readerPublicKey = jwks.keys[0];

    showStatus('info', 'Requesting mDL from wallet...');

    // Generate nonce for this session
    const nonce = crypto.randomUUID();

    // Create Digital Credentials API request
    const request = {
      protocol: "openid4vp-v1-unsigned",
      data: {
        response_type: "vp_token",
        response_mode: "dc_api.jwt",
        nonce: nonce,
        client_id: window.location.origin,
        client_metadata: {
          jwks: { keys: [readerPublicKey] }
        },
        // DCQL query for age verification
        dcql_query: {
          credentials: [{
            id: "mdl",
            // For ZK with Google Wallet, use format: "mso_mdoc_zk"
            // and add: meta: { zk_system_type: "longfellow" }
            format: "mso_mdoc",
            meta: { doctype_value: "org.iso.18013.5.1.mDL" },
            claims: [
              { path: ["org.iso.18013.5.1", "age_over_21"] },
              { path: ["org.iso.18013.5.1", "not_expired"] }
            ]
          }]
        }
      }
    };

    // Request credential from wallet
    const credential = await navigator.credentials.get({
      digital: { requests: [request] }
    });

    if (!credential || !credential.data) {
      showStatus('error', 'No credential received from wallet');
      return;
    }

    showStatus('info', 'Verifying credential...');

    // Send to verifier for validation
    const verifyResponse = await fetch(`${VERIFIER_URL}/api/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credential.data)
    });

    const verifyResult = await verifyResponse.json();

    if (!verifyResult.ok) {
      showStatus('error', `Verification failed: ${verifyResult.error || 'Unknown error'}`);
      return;
    }

    // Store session for derived credential flow
    verificationSessionId = verifyResult.sessionId;

    // Display results
    showStatus('success', 'Verification successful! ✓');
    displayResults(verifyResult);

    // Show derived credential button
    requestDerivedBtn.style.display = 'block';

  } catch (error) {
    console.error('Verification error:', error);
    showStatus('error', `Error: ${error.message}`);
  }
}

/**
 * Request derived credential flow
 */
async function requestDerivedCredential() {
  try {
    if (!verificationSessionId) {
      showStatus('error', 'No verification session. Please verify your mDL first.');
      return;
    }

    showStatus('info', 'Generating holder key pair...');

    // Generate ephemeral key pair for holder binding
    const keyPair = await generateKeyPair();
    holderPublicKey = keyPair.publicKey;

    showStatus('info', 'Requesting authorization...');

    // Step 1: Get authorization code
    const authResponse = await fetch(`${ISSUER_URL}/authorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verificationSessionId,
        holderPublicKey
      })
    });

    const authResult = await authResponse.json();

    if (!authResult.authorization_code) {
      showStatus('error', 'Authorization failed');
      return;
    }

    showStatus('info', 'Exchanging code for token...');

    // Step 2: Exchange code for access token
    const tokenResponse = await fetch(`${ISSUER_URL}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: authResult.authorization_code
      })
    });

    const tokenResult = await tokenResponse.json();

    if (!tokenResult.access_token) {
      showStatus('error', 'Token exchange failed');
      return;
    }

    showStatus('info', 'Issuing derived credential...');

    // Step 3: Request credential
    const credentialResponse = await fetch(`${ISSUER_URL}/credential`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenResult.access_token}`
      },
      body: JSON.stringify({
        format: 'vc+sd-jwt'
      })
    });

    const credentialResult = await credentialResponse.json();

    if (!credentialResult.credential) {
      showStatus('error', 'Credential issuance failed');
      return;
    }

    showStatus('success', 'Derived credential issued! ✓');
    displayDerivedCredential(credentialResult.credential);

  } catch (error) {
    console.error('Derived credential error:', error);
    showStatus('error', `Error: ${error.message}`);
  }
}

/**
 * Generate P-256 key pair for holder binding
 */
async function generateKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256'
    },
    true,
    ['sign', 'verify']
  );

  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);

  return {
    publicKey: publicKeyJwk,
    privateKey: privateKeyJwk
  };
}

/**
 * Display verification results
 */
function displayResults(result) {
  const predicates = result.predicates || {};
  
  let html = '<h3>Verification Results</h3>';
  
  for (const [key, value] of Object.entries(predicates)) {
    const displayKey = key.replace(/org\.iso\.18013\.5\.1\./, '').replace(/_/g, ' ');
    const className = typeof value === 'boolean' ? (value ? 'true' : 'false') : '';
    const displayValue = typeof value === 'boolean' ? (value ? '✓ Yes' : '✗ No') : value;
    
    html += `
      <div class="result-item">
        <span class="result-label">${displayKey}</span>
        <span class="result-value ${className}">${displayValue}</span>
      </div>
    `;
  }

  if (result.sessionId) {
    html += `
      <div class="result-item">
        <span class="result-label">Session ID</span>
        <span class="result-value">${result.sessionId.substring(0, 16)}...</span>
      </div>
    `;
  }

  resultDiv.innerHTML = html;
  resultDiv.classList.add('show');
}

/**
 * Display derived credential
 */
function displayDerivedCredential(sdJwt) {
  const parts = sdJwt.split('~');
  const jwt = parts[0];
  
  let html = '<h3>Derived Credential (SD-JWT VC)</h3>';
  html += `
    <div class="result-item">
      <span class="result-label">Format</span>
      <span class="result-value">vc+sd-jwt</span>
    </div>
    <div class="result-item">
      <span class="result-label">Disclosures</span>
      <span class="result-value">${parts.length - 2}</span>
    </div>
    <div class="result-item">
      <span class="result-label">JWT Length</span>
      <span class="result-value">${jwt.length} chars</span>
    </div>
  `;
  html += '<div class="code">' + sdJwt.substring(0, 200) + '...</div>';

  resultDiv.innerHTML = html;
  resultDiv.classList.add('show');
}

/**
 * Show status message
 */
function showStatus(type, message) {
  statusDiv.className = `status show ${type}`;
  statusDiv.textContent = message;
}

// Event listeners
verifyBtn.addEventListener('click', verifyWithDigitalID);
requestDerivedBtn.addEventListener('click', requestDerivedCredential);

// Check API availability on load
window.addEventListener('DOMContentLoaded', () => {
  if (!('DigitalCredential' in window)) {
    showStatus('error', '⚠️ Digital Credentials API not available. Use Chrome 141+ or enable the feature in chrome://flags');
    verifyBtn.disabled = true;
  }
});

