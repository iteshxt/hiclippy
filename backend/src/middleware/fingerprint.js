import crypto from 'crypto';
import net from 'net';
import rateLimit from 'express-rate-limit';

/* ── Client IP ──────────────────────────────────────────────
   On Render the API sits behind Cloudflare, then Render's proxy.
   req.ip (trust proxy = 1) is then the Cloudflare edge that
   opened the connection to Render, which changes from time to
   time and is shared by everyone using that edge.

   CLIENT_IP_HEADER names a header set by the proxy in front of
   the API that holds the visitor's IP. On Render that is
   `cf-connecting-ip`: Cloudflare sets it on every request and
   refuses (403) requests from clients that send it themselves.
   Only set it where such a proxy is guaranteed to be in front;
   anywhere else a client could write any IP into that header.
   Unset (the default) → req.ip, governed by TRUST_PROXY.
────────────────────────────────────────────────────────────── */
export function getClientIp(req) {
  const header = process.env.CLIENT_IP_HEADER?.trim();
  if (header) {
    const value = req.get(header)?.trim();
    // Exactly one valid IP; anything else (missing, a list, junk)
    // falls back to req.ip rather than trusting part of it.
    if (value && net.isIP(value)) return value;
  }
  return req.ip;
}

/* ── Fingerprint ────────────────────────────────────────────
   16-char hex ID from client IP + User-Agent + Accept-Language.
   Anonymous but consistent per device/browser/network. The IP
   keeps everyone on the same browser version and language from
   sharing one rate-limit bucket.
────────────────────────────────────────────────────────────── */
export function generateFingerprint(req) {
  const ip         = getClientIp(req)                 || 'unknown';
  const userAgent  = req.get('user-agent')            || 'unknown';
  const acceptLang = req.get('accept-language')       || 'unknown';
  return crypto.createHash('sha256').update(`${ip}|${userAgent}|${acceptLang}`).digest('hex').substring(0, 16);
}

/* ── Skip helper (only limit uploads) ──────────────────────── */
const skipGets = (req) => req.method === 'GET' || req.path === '/health';

/* ── Burst limiter: max 5 uploads per minute ───────────────
   Catches rapid-fire abuse (e.g. 10-req/min script).
   At 10MB/upload that's 50MB/min max — stopped cold.
────────────────────────────────────────────────────────────── */
const burstLimiter = rateLimit({
  windowMs: 60 * 1000,                                    // 1 minute
  limit: parseInt(process.env.RATE_LIMIT_BURST_MAX || 5), // 5 uploads/min
  keyGenerator: (req) => req.fingerprint,
  skip: skipGets,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many uploads in a short time. Please wait a moment before trying again.',
  },
});

/* ── Hourly limiter: max 20 uploads per hour ───────────────
   Sustained abuse protection.
   At 10MB/upload that's 200MB/hour max — well under 512MB.
   Realistically content expires in 1–10min so real DB usage
   is far lower (only live pastes consume space).
────────────────────────────────────────────────────────────── */
const hourlyLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || 3_600_000), // 1 hour
  limit: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || 20),        // 20 uploads/hr
  keyGenerator: (req) => req.fingerprint,
  skip: skipGets,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Hourly upload limit reached. Please try again later.',
  },
});

/* ── Lookup limiter: failed code lookups ───────────────────
   There are only 10,000 codes, so without this a script can
   walk all of them in minutes. Only failed lookups (4xx) count,
   so normal use — including fetching the same paste repeatedly —
   is never limited.
────────────────────────────────────────────────────────────── */
export const lookupLimiter = rateLimit({
  windowMs: parseInt(process.env.LOOKUP_LIMIT_WINDOW_MS || 10 * 60 * 1000), // 10 minutes
  limit: parseInt(process.env.LOOKUP_LIMIT_MAX_FAILURES || 30),             // 30 misses
  keyGenerator: (req) => req.fingerprint,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many wrong codes. Please wait a few minutes and try again.',
  },
});

/* ── Middleware ─────────────────────────────────────────────
   1. Stamp fingerprint on req
   2. Run burst check
   3. Run hourly check
────────────────────────────────────────────────────────────── */
export function fingerprintMiddleware(req, res, next) {
  req.fingerprint = generateFingerprint(req);

  // Chain both limiters sequentially
  burstLimiter(req, res, (err) => {
    if (err) return next(err);
    hourlyLimiter(req, res, next);
  });
}
