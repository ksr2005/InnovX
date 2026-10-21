# InnovX — Enterprise Security Architecture & Attack Resilience

> **Mentor Pitch Mandate**: Built in response to the Day 1 pitch directive to harden the platform against web vulnerabilities, resource exhaustion, and adversarial attacks.

---

## Executive Summary

InnovX operates at the intersection of sensitive intellectual property discovery, generative AI inference, and public web endpoints. Securing this environment requires a **Defense-in-Depth** security model that protects:
1. **The Infrastructure** against Denial-of-Service (DoS), traffic flooding, and memory exhaustion.
2. **The LLM Pipeline** against prompt injection, adversarial jailbreaking, and secret extraction.
3. **The Web Surface** against Cross-Site Scripting (XSS), clickjacking, MIME-sniffing, and automated scanner bots.
4. **The Creator's IP** through zero-leakage NDA gates and SHA-256 cryptographic provenance chains.

```
                      INCOMING HTTP TRAFFIC
                                │
                                ▼
         ┌──────────────────────────────────────────────┐
         │  Layer 1: Reconnaissance & Bot Blocker       │
         │  (Inspects UA & Path: sqlmap, nikto, etc.)   │ ──► [403 Forbidden]
         └──────────────────────┬───────────────────────┘
                                │ (Clean UA & Path)
                                ▼
         ┌──────────────────────────────────────────────┐
         │  Layer 2: Payload Size Enforcer (Max 2MB)    │ ──► [413 Payload Too Large]
         └──────────────────────┬───────────────────────┘
                                │ (Payload <= 2MB)
                                ▼
         ┌──────────────────────────────────────────────┐
         │  Layer 3: Sliding-Window Rate Limiter        │ ──► [429 Too Many Requests]
         │  (IP-based 60s window across route tiers)    │     (Retry-After header)
         └──────────────────────┬───────────────────────┘
                                │ (Rate Allowed)
                                ▼
         ┌──────────────────────────────────────────────┐
         │  Layer 4: AI Prompt Injection Shield         │ ──► [400 Security Violation]
         │  (Detects override, DAN, and secret dump)    │     (Guidance & Template)
         └──────────────────────┬───────────────────────┘
                                │ (Valid Concept)
                                ▼
         ┌──────────────────────────────────────────────┐
         │  Layer 5: Input Sanitizer & Boundary Wrapper │
         │  (Strips HTML/XSS, wraps in <DATA> tags)     │
         └──────────────────────┬───────────────────────┘
                                │
                                ▼
         ┌──────────────────────────────────────────────┐
         │  Layer 6: Multi-Source Search & AI Inference │
         │  (OpenAlex, arXiv, USPTO, MiniLM, Gemini)    │
         └──────────────────────┬───────────────────────┘
                                │
                                ▼
         ┌──────────────────────────────────────────────┐
         │  Layer 7: OWASP Security Headers Injection   │
         │  (CSP, HSTS, X-Frame-Options, No-Sniff)      │
         └──────────────────────────────────────────────┘
```

---

## The 7 Layers of Defense

### 1. Automated Vulnerability Scanner & Bot Blocker
- **Threat Mitigated**: Automated reconnaissance bots and vulnerability scanners (`sqlmap`, `nikto`, `masscan`, `dirbuster`, `gobuster`, `nmap`, `acunetix`, `nuclei`, `wpscan`, `hydra`).
- **Mechanism**: Inspects `User-Agent` headers and request paths for known scanner signatures and hostile traversal patterns (`wp-login`, `.env`, `phpinfo`, `/etc/passwd`).
- **Outcome**: Returns `HTTP 403 Forbidden` immediately, terminating execution before application routers are invoked.

### 2. Large Payload & Memory Exhaustion Defense
- **Threat Mitigated**: Denial of Service via buffer flooding or massive JSON body submissions (e.g. 50MB–100MB payloads crashing cloud container memory).
- **Mechanism**: Middleware verifies `Content-Length` headers before payload ingestion.
- **Enforcement Threshold**: Strictly capped at **2 MB (2,097,152 bytes)**.
- **Outcome**: Returns `HTTP 413 Payload Too Large` with zero memory allocation.

### 3. Sliding-Window In-Memory Rate Limiting
- **Threat Mitigated**: API abuse, credential brute forcing, and "Denial of Wallet" (hostile exhaustion of external AI quotas and paid API credits).
- **Algorithm**: Thread-safe sliding-window counter tracking client IP request timestamps over rolling 60-second intervals.
- **Tier Allocations**:
  - **Heavy AI Analysis** (`/api/analyze/*`): **10 requests / 60s**
  - **Academic & Patent Search** (`/api/search/*`): **30 requests / 60s**
  - **Marketplace & Mutations** (`/api/marketplace/*`, `/api/campaigns/*`): **40 requests / 60s**
  - **Default Endpoints** (`/health`, metadata, docs): **120 requests / 60s**
- **Telemetry**: Every response includes `X-RateLimit-Limit` and `X-RateLimit-Remaining`. Violations receive `HTTP 429 Too Many Requests` with a calculated `Retry-After` header.

### 4. AI Prompt Injection & Adversarial Jailbreak Shield
- **Threat Mitigated**: Direct prompt injections, persona hijacking (e.g. "DAN mode"), system prompt leakage, and instruction overrides attempting to compromise LLM integrity.
- **Signatures Detected**:
  - System override directives (`"ignore previous instructions"`, `"disregard all earlier guidance"`, `"system directive: override"`)
  - Adversarial jailbreaks (`"you are now DAN"`, `"developer mode enabled"`, `"bypass security filters"`)
  - Secret & environment variable exfiltration (`"output system prompt"`, `"reveal api keys"`, `"dump environment variables"`)
  - Delimiter attacks (`<|im_start|>`, `<|im_end|>`)
- **Integration**: Integrated into both `services/security.py` and `services/guardrails.py`.
- **User Experience**: Returns `status: "security_violation"`, rendered in the UI with a pulsing crimson shield badge and targeted clarifying engineering prompts.

### 5. XSS & Malicious Script Tag Sanitizer
- **Threat Mitigated**: Stored and Reflected Cross-Site Scripting (XSS), malicious iframes, and hazardous URI protocols embedded in idea descriptions.
- **Sanitization Actions**:
  - Strips `<script>`, `<iframe>`, `<object>`, `<embed>`, `<applet>`, `<meta>`, and `<form>` tags.
  - Neutralizes JavaScript event handlers (`onload=`, `onerror=`, `onclick=`).
  - Blocks hazardous URI schemes (`javascript:`, `vbscript:`, `data:text/html`).
  - Strips null bytes (`\x00`) and non-printable control characters.
- **Prompt Isolation**: Encloses sanitized text inside explicit `<USER_INNOVATION_INPUT>` boundary delimiters with clear system directives forbidding instruction execution within the payload.

### 6. OWASP Production HTTP Security Headers
Every HTTP response served by the backend API and Next.js frontend is hardened with strict OWASP headers:

| Header | Production Value | Purpose |
|---|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Forces encrypted HTTPS connections |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type confusion attacks |
| `X-Frame-Options` | `DENY` | Prevents clickjacking in third-party frames |
| `X-XSS-Protection` | `1; mode=block` | Legacy browser reflective XSS filter |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Protects referrer leakage to third parties |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Restricts hardware device access |
| `X-Permitted-Cross-Domain-Policies` | `none` | Blocks Flash/PDF cross-domain leaks |
| `Content-Security-Policy` | Restrictive script, style, and connect policy | Restricts code execution origin |

### 7. Information Disclosure Masking & Incident Obfuscation
- **Threat Mitigated**: Attackers sending malformed requests to trigger uncaught exceptions and inspect Python stack traces, file paths, or database structures.
- **Mechanism**: A global FastAPI exception handler intercepts all unhandled errors:
  - Generates an opaque random UUID (`Incident ID: #a1b2c3d4`).
  - Logs the full traceback internally to secure server logs with a `[SECURITY ALERT]` prefix.
  - Returns a sanitized, generic error payload to the client:
    ```json
    {
      "error": "Internal Server Error",
      "message": "An unexpected server error occurred. The incident has been recorded with a secure audit ID.",
      "incident_id": "a1b2c3d4",
      "status_code": 500
    }
    ```

---

## Automated Verification

The entire security architecture is continuously verified via `backend/test_security_resilience.py`:
- [x] Test 1: OWASP Security Headers (nosniff, DENY, strict-origin, HSTS, CSP)
- [x] Test 2: Vulnerability Scanner & Reconnaissance Bot Blocker (HTTP 403 on `sqlmap`, `nikto`, etc.)
- [x] Test 3: Large Payload & Buffer Bomb Rejection (HTTP 413 on >2MB bodies)
- [x] Test 4: Sliding-Window Rate Limiting (HTTP 429 with `Retry-After` on traffic bursts)
- [x] Test 5: AI Prompt Injection Detection (blocks system override and secret extraction)
- [x] Test 6: XSS Tag & Event Handler Sanitization (strips scripts, iframes, and onerror)
- [x] Test 7: Guardrail Security Violation Integration (returns structured diagnostic UI)
