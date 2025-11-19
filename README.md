# zk-mdl-kit

![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Status](https://img.shields.io/badge/status-experimental-yellow)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)

> ⚠️ **IMPORTANT:** This is a reference implementation for educational and development purposes.  
> For production deployment, review [SECURITY.md](SECURITY.md) and implement proper key management, rate limiting, and monitoring.

A minimal, wallet-agnostic verifier and derived-VC bridge for online age/residency checks using **mobile driver's licenses (ISO mdoc/mDL)** and **web-native Verifiable Credentials**. The verifier accepts presentations from browser **Digital Credentials API** (DC-API) flows and can validate **zero-knowledge** proofs produced by wallets (e.g., Google Wallet with Longfellow ZK). The bridge issues **derived credentials** for repeat, privacy-reduced web use via **OID4VP/OID4VCI**. ([Chrome for Developers][1])

---

## Why this kit

* **Wallet-agnostic web integration.** Works with Chrome/Safari DC-API and **OID4VP** presentation, so you aren't locked to a single vendor. ([Chrome for Developers][1])
* **True ZK for mDL.** Request a ZK presentation (`mso_mdoc_zk`) and verify it with **Longfellow** against issuer keys. ([Google for Developers][2])
* **Real trust roots.** Fetch and pin issuer public keys from **AAMVA's VICAL**; for California dev/testing, DMV exposes the **IACA root**. ([Vical][3])
* **Derived VC path.** After one high-assurance mDL check, issue a short-lived **SD-JWT VC** (optional **BBS+** DI) for fast, privacy-reduced re-use. ([IETF Datatracker][4])

---

## Quick start

### 0) Prereqs

* **Browser:** Chrome 141+ or Safari with DC-API enabled. ([Chrome for Developers][1])
* **Backend:** Node 20+ (or your stack of choice).
* **ZK verifier:** Build/run **Longfellow** verifier-service (Docker-ready). ([GitHub][5])
* **Trust:** Enroll to download **VICAL** (issuer CA list). For CA devs, download the **IACA root** from DMV's mDL pages. ([Vical][3])

### 1) Architecture

```mermaid
flowchart LR
  A[Browser (DC-API)] -- OID4VP request --> W[(Wallet)]
  W -- VP / (optional) ZK proof --> A
  A --> B[/Verifier API/]
  B --> C[Decrypt JWE + build SessionTranscript]
  C --> D[Longfellow verifier-service]
  D -- valid + predicates --> B
  B -- minimal result --> App

  subgraph Trust
  E[VICAL fetcher] --> D
  F[CA DMV IACA (dev)] --> D
  end

  B -. optional .-> G[Derived-VC Issuer (OID4VCI)]
  G --> H[(Holder Wallet)]
```

* DC-API provides the browser call. OID4VP is the protocol binding. ([Chrome for Developers][1])
* Longfellow validates mDL ZK proofs and standard mdoc/MSO paths. ([GitHub][5])
* VICAL/IACA supply issuer trust. ([Vical][3])

---

## Installation

### Option 1: Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Services will be available at:
- Verifier: http://localhost:3000
- Issuer: http://localhost:3001
- Example: http://localhost:8080

### Option 2: Local Development

```bash
npm install
```

### Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

**⚠️ NEVER commit `.env` or key files to version control!**

---

## Usage

### Start the verifier service

```bash
npm run start:verifier
```

### Start the issuer service (optional)

```bash
npm run start:issuer
```

### Run the example

```bash
npm run start:example
```

Open your browser to `http://localhost:8080` to see the demo.

---

## Project Structure

```
zk-mdl-kit/
  verifier/            # OID4VP endpoint + DC-API handover, Longfellow adapter
  trust/               # VICAL fetch/cache + issuer pinning policy
  issuer/              # OID4VCI server for SD-JWT VC (optional DI-BBS+)
  examples/            # Minimal web demo + Postman/cURL flows
  README.md
```

---

## Policy defaults

* Request **only** what you need (e.g., `age_over_21`, `not_expired`). DC-API and wallet flows are designed for data minimization. ([Chrome for Developers][1])
* Store **predicate outcomes**, not raw PII (e.g., `over21: true`).
* Pin trusted issuers (e.g., only CA + neighbors) in your VICAL cache. ([AAMVA][6])

---

## Notes for Apple flows

Apple's **Verify with Wallet** supports IDs in Apple Wallet for apps and the web; WWDC sessions and Apple docs show DC-API integration and server-side validation steps. Keep your verifier wallet-agnostic by staying with DC-API + OID4VP on the wire. ([Apple Developer][10])

---

## References

* **Google Wallet — Accepting IDs Online (ZK mode, `mso_mdoc_zk`)**. ([Google for Developers][2])
* **Longfellow-ZK repo (verifier-service, mdoc/JWT/VC ZK)**. ([GitHub][5])
* **Digital Credentials API — Chrome shipped** (overview, examples). ([Chrome for Developers][1])
* **OpenID for Verifiable Presentations 1.0 (Final)** — includes DC-API binding. ([OpenID Foundation][11])
* **OpenID for Verifiable Credential Issuance 1.0 (Final)**. ([OpenID Foundation][8])
* **W3C VC Data Model 2.0 (REC)**. ([w3.org][9])
* **SD-JWT VC (IETF draft)**. ([IETF Datatracker][4])
* **Data Integrity BBS+ cryptosuite (W3C)**. ([w3.org][9])
* **AAMVA DTS — for relying parties (VICAL)** + **VICAL portal**. ([AAMVA][6])
* **CA DMV — mDL Reader / IACA root**. ([California DMV][7])
* **OpenWallet Foundation — Multipaz SDK (mdoc/DC-API/OID4VP utilities)**. ([GitHub][12])

---

## License

MIT

[1]: https://developer.chrome.com/blog/digital-credentials-api-shipped?utm_source=chatgpt.com "Digital Credentials API: Secure and private identity on the web"
[2]: https://developers.google.com/wallet/identity/verify/accepting-ids-from-wallet-online?utm_source=chatgpt.com "Online Acceptance of Digital Credentials"
[3]: https://vical.dts.aamva.org/?utm_source=chatgpt.com "Verified Issuer Certificate Authority List (VICAL) - AAMVA"
[4]: https://datatracker.ietf.org/doc/draft-ietf-oauth-sd-jwt-vc/?utm_source=chatgpt.com "SD-JWT-based Verifiable Credentials (SD-JWT VC)"
[5]: https://github.com/google/longfellow-zk?utm_source=chatgpt.com "google/longfellow-zk"
[6]: https://www.aamva.org/identity/mobile-driver-license-digital-trust-service/for-relying-parties?utm_source=chatgpt.com "For Relying Parties"
[7]: https://www.dmv.ca.gov/portal/ca-dmv-wallet/mdl-reader/?utm_source=chatgpt.com "mDL Reader"
[8]: https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html?utm_source=chatgpt.com "OpenID for Verifiable Credential Issuance 1.0"
[9]: https://www.w3.org/TR/vc-data-model-2.0/?utm_source=chatgpt.com "Verifiable Credentials Data Model v2.0"
[10]: https://developer.apple.com/wallet/get-started-with-verify-with-wallet/?utm_source=chatgpt.com "Get started with the Verify with Wallet API"
[11]: https://openid.net/specs/openid-4-verifiable-presentations-1_0.html?utm_source=chatgpt.com "OpenID for Verifiable Presentations 1.0"
[12]: https://github.com/openwallet-foundation/multipaz?utm_source=chatgpt.com "openwallet-foundation/multipaz: SDK for Digital Credentials"

