import crypto from 'crypto';
import rateLimit from 'express-rate-limit';

/* ── Fingerprint ────────────────────────────────────────────
   16-char hex ID from client IP + User-Agent + Accept-Language.
   Anonymous but consistent per device/browser/network. The IP
   keeps everyone on the same browser version and language from
   sharing one rate-limit bucket. req.ip is only the real client
   IP when `trust proxy` is set correctly (see app.js).
────────────────────────────────────────────────────────────── */
export function generateFingerprint(req) {
  const ip         = req.ip                           || 'unknown';
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
