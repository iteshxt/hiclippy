# HiClippy API — Test Plan

## Stack: Vitest + Supertest + a real MongoDB

| Tool | Role |
|---|---|
| **Vitest** | Test runner — natively supports ESM (`"type": "module"`) with zero config. Jest requires transforms for ESM. |
| **Supertest** | HTTP integration testing against the Express app without a real server |
| **MongoDB** | Tests connect to `MONGO_URI` (environment or `backend/.env`), use a separate `clippy_test` database, and drop it when done (`tests/dbUtils.js`) |

> [!IMPORTANT]
> The project uses `"type": "module"` (ESM). **Jest requires painful Babel transforms to work with ESM.** Vitest supports it natively.

---

## Running

```bash
MONGO_URI=mongodb://localhost:27017 npm test
```

The create tests pin `PASTE_DEFAULT_EXPIRY_MINUTES=5` and `PASTE_MAX_EXPIRY_MINUTES=10` themselves, so results don't depend on your `.env`. The paste tests mock the fingerprint middleware (fingerprint `test-fingerprint`, or the `x-test-fingerprint` header) and the lookup limiter; `ratelimit.test.js` uses the real ones.

---

## File structure

```
backend/
├── src/
│   ├── routes/paste.js
│   ├── models/Paste.js
│   ├── middleware/fingerprint.js
│   └── server.js
├── tests/
│   ├── dbUtils.js            ← connect / clear / drop the clippy_test database
│   ├── paste.create.test.js  ← POST /api/paste
│   ├── paste.fetch.test.js   ← GET /api/paste/:id and /raw
│   ├── paste.delete.test.js  ← DELETE /api/paste/:id
│   └── ratelimit.test.js     ← Upload, lookup and IP limits + health
├── vitest.config.js
└── package.json
```

---

## Test Cases

### 1. `POST /api/paste` — Create Paste

| # | Test | Input | Expected |
|---|---|---|---|
| 1.1 | Valid text paste | `{ content: "hello", contentType: "text", duration: "1" }` | `201` + `{ id, expiresAt, expiryMinutes }` |
| 1.2 | Valid link paste | `{ content: "https://google.com", contentType: "link", duration: "5" }` | `201` |
| 1.3 | Valid image URL paste | `{ content: "https://img.com/x.png", contentType: "image", duration: "1" }` | `201` |
| 1.4 | Valid file upload | Multipart: `file = 1KB text file`, `contentType: "file"`, `duration: "1"` | `201` + id in body |
| 1.5 | Missing content AND file | `{}` | `400` + `error: "No content provided"` |
| 1.6 | File exceeds 10MB | Multipart: `file = 11MB buffer` | `413` |
| 1.7 | Duration clamped to max | `{ content: "x", duration: "9999" }` | `201` + `expiryMinutes = 10` (env max) |
| 1.8 | Duration defaults when omitted | `{ content: "x" }` | `201` + `expiryMinutes = 5` (env default) |
| 1.9 | Duration 0 / NaN falls back | `{ content: "x", duration: "abc" }` | `201` + `expiryMinutes = 5` |
| 1.10 | Returned id is exactly 4 digits | Any valid paste | `id` matches `/^\d{4}$/` |
| 1.11 | `expiresAt` is in the future | Any valid paste | `new Date(expiresAt) > new Date()` |
| 1.9b | Code taken between check and save | Existing paste `1234`; pre-check misses once; random picks 1234 then 5678 | `201` + `id = 5678`; existing paste untouched |
| 1.12 | Image file upload (mimeType detection) | Multipart: PNG image buffer | `201`, saved `contentType = "file"`, `mimeType = "image/png"` |

---

### 2. `GET /api/paste/:id` — Fetch Paste

| # | Test | Input | Expected |
|---|---|---|---|
| 2.1 | Fetch existing text paste | `GET /api/paste/{id}` | `200` + `{ id, content, contentType, expiresAt }` |
| 2.2 | Fetch existing file paste | `GET /api/paste/{id}` | `200` + `{ id, contentType, fileName, mimeType, content (base64) }` |
| 2.3 | Fetch existing link paste | `GET /api/paste/{id}` | `200` + `{ content: "https://..." }` |
| 2.4 | Non-existent ID | `GET /api/paste/9999` | `404` + `error: "Paste not found or expired"` |
| 2.5 | Invalid format — letters | `GET /api/paste/abcd` | `400` + `error: "Invalid paste ID format"` |
| 2.6 | Invalid format — 3 digits | `GET /api/paste/123` | `400` |
| 2.7 | Invalid format — 5 digits | `GET /api/paste/12345` | `400` |
| 2.8 | Expired paste (manual `expiresAt` in past) | Seed a paste with `expiresAt: new Date(Date.now() - 1000)` then GET | `404` + `error: "Paste has expired"` |
| 2.9 | Expired paste is deleted from DB | Same as 2.8 then query DB | Document no longer exists in MongoDB |
| 2.10 | Response shape for text has no `fileName`/`mimeType` | `GET` text paste | Response does NOT include `fileName` or `mimeType` keys |
| 2.11 | `?meta=1` for a file | `GET /api/paste/{id}?meta=1` | `200`, no `content`, has `fileName` and `fileSize` |
| 2.12 | `/raw` for a file | `GET /api/paste/{id}/raw` (UTF-8 file name) | Original bytes; `Content-Type` from upload; `attachment` with `filename*=UTF-8''…`; `nosniff`; sandbox CSP |
| 2.13 | `/raw` for a text paste | Text containing `<script>` | `200`, `text/plain`, body unchanged |
| 2.14 | `/raw` for an unknown code | `GET /api/paste/0000/raw` | `404` |

---

### 3. `DELETE /api/paste/:id` — Delete Paste

| # | Test | Input | Expected |
|---|---|---|---|
| 3.1 | Delete existing paste | `DELETE /api/paste/{id}` | `200` + `{ message: "Paste deleted successfully" }` |
| 3.2 | Verify deleted — follow-up GET | After delete, `GET /api/paste/{id}` | `404` |
| 3.3 | Delete non-existent ID | `DELETE /api/paste/9999` | `404` + `error: "Paste not found"` |
| 3.4 | Invalid format | `DELETE /api/paste/abc` | `400` + `error: "Invalid paste ID format"` |
| 3.5 | Another device tries to delete | `DELETE` with a different fingerprint | `404`; paste still fetchable |

---

### 4. Rate Limiting

> [!NOTE]
> Rate limiters use in-memory stores per process. The `express-rate-limit` default store resets between test file runs since each test spins up a fresh app instance. For rate limit tests, we create the app fresh and fire requests in the same test.

| # | Test | Scenario | Expected |
|---|---|---|---|
| 4.1 | **Burst — under limit** | 5 POSTs within 1 second, same fingerprint | All `201` |
| 4.2 | **Burst — hit limit** | 6th POST within same minute, same fingerprint | `429` + `error` contains "short time" |
| 4.3 | **Burst — different fingerprints** | 6 POSTs, each with unique `User-Agent` | All `201` (different fingerprints = independent counters) |
| 4.4 | **Successful GETs not limited** | 100 GETs of an existing paste, same fingerprint | All `200` (only failed lookups count) |
| 4.5 | **Hourly — hit limit** (skipped) | 21 POSTs spread across hour window (fake timers) | 21st → `429` + `error` contains "Hourly" |
| 4.6 | **Wrong codes limited** | 31 GETs for a missing code, same fingerprint | First 30 → `404`, 31st → `429` ("wrong codes"); other fingerprint unaffected |
| 4.7 | **IP is part of the fingerprint** | Same User-Agent from two `X-Forwarded-For` IPs | Second IP not blocked by the first IP's burst limit |

> [!WARNING]
> Test 4.5 (hourly) can't literally wait 1 hour. Strategy: use **`vi.useFakeTimers()`** in Vitest to advance the clock, OR reduce `RATE_LIMIT_WINDOW_MS` to `2000ms` for the test environment via an env override.

---

### 6. Client IP behind Cloudflare (`clientip.test.js`)

`X-Forwarded-For` stands in for the Cloudflare edge address (what `req.ip` becomes on Render with `TRUST_PROXY=1`); `CF-Connecting-IP` holds the visitor's IP.

| # | Test | Input | Expected |
|---|---|---|---|
| 6.1 | **Edge changes, visitor doesn't** | `CLIENT_IP_HEADER=cf-connecting-ip`; save via edge A, delete via edge B, same `CF-Connecting-IP` | Delete → `200` |
| 6.2 | **Visitors on one edge are separate** | Same setting; 6 saves from one visitor, then one from another visitor on the same edge | 6th → `429`, other visitor → `201` |
| 6.3 | **Bad header falls back** | `getClientIp` with header missing, a list, or junk | Returns `req.ip`; a single IPv4/IPv6 value is used as-is |
| 6.4 | **Spoofed header ignored when unset** | No `CLIENT_IP_HEADER`; 6 saves with a different `CF-Connecting-IP` each time | 6th → `429` |
| 6.5 | **Spoofed header can't take over a clip** | No `CLIENT_IP_HEADER`; delete from another IP claiming the owner's IP in `CF-Connecting-IP` | `404` |

### 5. Health Check

| # | Test | Expected |
|---|---|---|
| 5.1 | `GET /health` | `200` + `{ status: "healthy", timestamp: <ISO string> }` |
| 5.2 | `GET /unknown-route` | `404` + `{ error: "Not found" }` |
