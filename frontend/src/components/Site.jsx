import React from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

/* ── Nature SVG Background ──────────────────────────────────
   Procedural hills, grass and flowers, generated once per load.
   `variant="hero"` pins it to the bottom of its parent instead
   of the viewport (used by the landing page hero).
────────────────────────────────────────────────────────────── */
export function NatureBg({ variant }) {
    const props = React.useMemo(() => {
        // 1. Randomize Hills (Static per reload)
        const hills = [...Array(4)].map(() => {
            const h1 = 160 + Math.random() * 80;
            const h2 = 140 + Math.random() * 100;
            const h3 = 180 + Math.random() * 60;
            return `M-100,320 L-100,${h1} Q300,${h1 - 80} 720,${h2} Q1140,${h2 + 80} 1600,${h3} L1600,320 Z`;
        });

        // 2. Five Layers of Dense Grass
        const grassLayers = [...Array(5)].map((_, layerIndex) => {
            const count = 50 + (layerIndex * 15);
            const blades = [...Array(count)].map((__, i) => {
                const type = i % 3;
                const x = Math.random() * 1500 - 50;
                const h = (20 + (layerIndex * 10)) + Math.random() * (20 + layerIndex * 5);
                const skew = (Math.random() - 0.5) * 12;
                return { type, x, h, skew };
            });

            const paths = [0, 1, 2].map(type => blades
                .filter(b => b.type === type)
                .map(b => `M${b.x},321 Q${b.x + b.skew},${320 - b.h / 2} ${b.x},${320 - b.h}`)
                .join(' '));

            return {
                color: ["#8ecfa8", "#6fb58d", "#4ba371", "#3a8f5e", "#2a6e40"][layerIndex],
                opacity: 0.3 + (layerIndex * 0.12),
                paths: { thin: paths[2], medium: paths[0], thick: paths[1] },
            };
        });

        // 3. Scattered Flowers
        const flowers = [...Array(16)].map((_, i) => ({
            x: Math.random() * 1440,
            stemH: 25 + Math.random() * 20,
            delay: Math.random() * 6,
            color: ["#ff9e6d", "#ffcc6d", "#ffed6d", "#6dccff"][i % 4],
        }));

        return { hills, grassLayers, flowers };
    }, []);

    return (
        <div className={`nature-bg${variant ? ` nature-bg--${variant}` : ''}`} aria-hidden="true">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 1440 320"
                preserveAspectRatio="none"
                style={{ width: '100%', height: '100%', display: 'block' }}
            >
                {props.hills.map((d, i) => (
                    <path
                        key={`hill-${i}`}
                        d={d}
                        fill={["#f0faf4", "#e2f5e9", "#d4eedd", "#c6e7d1"][i]}
                        opacity={0.6 + (i * 0.1)}
                    />
                ))}

                {props.grassLayers.map((layer, lIdx) => (
                    <g key={`layer-${lIdx}`} className={lIdx % 2 === 0 ? 'sway-layer-even' : 'sway-layer-odd'} style={{ transformOrigin: '50% 320px' }}>
                        <path d={layer.paths.thin} stroke={layer.color} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity={layer.opacity} />
                        <path d={layer.paths.medium} stroke={layer.color} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity={layer.opacity} />
                        <path d={layer.paths.thick} stroke={layer.color} strokeWidth="3.5" strokeLinecap="round" fill="none" opacity={layer.opacity} />
                    </g>
                ))}

                {props.flowers.map((f, i) => (
                    <g key={`f-${i}`}>
                        <path d={`M${f.x},320 Q${f.x + 2},${320 - f.stemH / 2} ${f.x},${320 - f.stemH}`} stroke="#2a6e40" strokeWidth="1.2" fill="none" opacity={0.5} />
                        <g
                            className="sway-flower"
                            style={{ transformOrigin: `${f.x}px ${320 - f.stemH}px`, animationDelay: `${-f.delay}s` }}
                        >
                            <circle cx={f.x} cy={320 - f.stemH - 4} r="4" fill={f.color} />
                            <circle cx={f.x - 4} cy={320 - f.stemH} r="4" fill={f.color} />
                            <circle cx={f.x + 4} cy={320 - f.stemH} r="4" fill={f.color} />
                            <circle cx={f.x} cy={320 - f.stemH + 4} r="4" fill={f.color} />
                            <circle cx={f.x} cy={320 - f.stemH} r="3" fill="#f4c430" />
                        </g>
                    </g>
                ))}
            </svg>
        </div>
    );
}

/* ── Animated mascot (looping WebM) ─────────────────────────
   The native `loop` attribute seeks back to 0 at the end, and
   browsers can hold the last frame while that seek resolves,
   which shows up as a hitch in a 1.3s loop. Instead, two copies
   take turns: one plays while the other waits, paused and already
   decoded, on frame 0. When the playing copy presents its last
   frame we schedule the swap for the moment that frame's time is
   up; the waiting copy is shown and starts, and the other resets
   to frame 0 for the next round. No seek ever happens at the
   loop point. Without requestVideoFrameCallback we swap on
   `ended` instead.
────────────────────────────────────────────────────────────── */
const MASCOT_SRC = '/images/tom.webm';

function useSeamlessLoop(aRef, bRef) {
    React.useEffect(() => {
        const vids = [aRef.current, bRef.current];
        if (!vids[0] || !vids[1]) return;
        let active = 0;
        let timer = null;
        let stopped = false;
        let frameDur = 1 / 22;   // refined from real frame timestamps
        let lastMediaTime = null;

        const show = (i) => {
            vids[i].style.opacity = '1';
            vids[1 - i].style.opacity = '0';
        };

        const swap = () => {
            if (stopped) return;
            clearTimeout(timer);
            const prev = vids[active];
            active = 1 - active;
            const next = vids[active];
            show(active);
            next.play().catch(() => {});
            prev.pause();
            prev.currentTime = 0;   // decoded and waiting for its next turn
            lastMediaTime = null;
            watch(next);
        };

        const watch = (v) => {
            if (typeof v.requestVideoFrameCallback !== 'function') return; // `ended` covers it
            const onFrame = (_now, meta) => {
                if (stopped || vids[active] !== v) return;
                if (lastMediaTime !== null && meta.mediaTime > lastMediaTime) {
                    frameDur = meta.mediaTime - lastMediaTime;
                }
                lastMediaTime = meta.mediaTime;
                const remaining = v.duration - meta.mediaTime;
                if (Number.isFinite(remaining) && remaining <= frameDur * 1.5) {
                    // This is the last frame: swap exactly when its time is up.
                    timer = setTimeout(swap, Math.max(0, remaining * 1000));
                    return;
                }
                v.requestVideoFrameCallback(onFrame);
            };
            v.requestVideoFrameCallback(onFrame);
        };

        // Safety net: if a timer is late (background tab) or the API is
        // missing, swap as soon as the active copy ends.
        const onEnded = (e) => { if (e.target === vids[active]) swap(); };
        vids.forEach((v) => v.addEventListener('ended', onEnded));

        show(0);
        watch(vids[0]);

        return () => {
            stopped = true;
            clearTimeout(timer);
            vids.forEach((v) => v.removeEventListener('ended', onEnded));
        };
    }, [aRef, bRef]);
}

export function Mascot({ className = 'mascot-wrapper' }) {
    const aRef = React.useRef(null);
    const bRef = React.useRef(null);
    useSeamlessLoop(aRef, bRef);

    const common = {
        src: MASCOT_SRC,
        muted: true,
        playsInline: true,
        preload: 'auto',
        className: 'mascot-img',
        'aria-hidden': 'true',
        onContextMenu: (e) => e.preventDefault(),
    };

    return (
        <div className={className}>
            <div className="mascot-loop">
                <video ref={aRef} autoPlay {...common} />
                <video ref={bRef} {...common} className="mascot-img mascot-img--standby" style={{ opacity: 0 }} />
            </div>
        </div>
    );
}

/* ── "Crafted by iteshxt" signature pill ────────────────────
   `floating`: pinned bottom-right on wide screens (every page).
   Inline: sits in the page flow on narrow screens.
────────────────────────────────────────────────────────────── */
export function DeveloperInfo({ floating = false }) {
    const [isOpen, setIsOpen] = React.useState(false);
    return (
        <motion.div
            className={`dev-credits ${floating ? 'dev-credits--float' : 'dev-credits--inline'}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1 }}
        >
            <div
                className={`dev-pill${isOpen ? ' open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                style={{ cursor: 'pointer' }}
            >
                <span className="dev-label">Crafted by</span>
                <span className="dev-name">iteshxt</span>

                <div className="dev-links">
                    <a href="https://github.com/iteshxt" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>GitHub</a>
                    <a href="https://iteshxt.me" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>Website</a>
                    <a href="mailto:mail.iteshxt@gmail.com" onClick={(e) => e.stopPropagation()}>Email</a>
                </div>
            </div>
        </motion.div>
    );
}

/* ── Site header (every page) ───────────────────────────── */
export function SiteHeader() {
    const { pathname } = useLocation();
    const onShare = pathname === '/share';

    return (
        <header className="site-header">
            <div className="site-header-inner">
                <Link to="/" className="wordmark" aria-label="HiClippy home">
                    <img src="/favicon.svg" alt="" width="30" height="30" />
                    <span>HiClippy</span>
                </Link>
                <nav className="site-nav" aria-label="Main">
                    <Link to="/#how-it-works" className="site-nav-link">How it works</Link>
                    <Link to="/#faq" className="site-nav-link">FAQ</Link>
                    {onShare ? (
                        <NavLink to="/" className="site-nav-link site-nav-home">Home</NavLink>
                    ) : (
                        <Link to="/share" className="btn btn-primary btn-sm">Open clipboard</Link>
                    )}
                </nav>
            </div>
        </header>
    );
}

/* ── Site footer (landing page) ─────────────────────────── */
export function SiteFooter() {
    return (
        <footer className="site-footer">
            <div className="site-footer-inner">
                <div className="site-footer-brand">
                    <Link to="/" className="wordmark wordmark--light">
                        <img src="/favicon.svg" alt="" width="28" height="28" />
                        <span>HiClippy</span>
                    </Link>
                    <p>A free online clipboard for moving text and files between your devices.</p>
                </div>

                <nav className="site-footer-col" aria-label="Product">
                    <h2>Use it</h2>
                    <Link to="/share">Share something</Link>
                    <Link to="/share?tab=retrieve">Open a code</Link>
                    <Link to="/#faq">FAQ</Link>
                </nav>

                <nav className="site-footer-col" aria-label="Legal">
                    <h2>Legal</h2>
                    <Link to="/privacy">Privacy policy</Link>
                    <Link to="/terms">Terms and conditions</Link>
                </nav>

                <div className="site-footer-col">
                    <h2>Made by iteshxt</h2>
                    <a href="https://github.com/iteshxt" target="_blank" rel="noopener noreferrer">GitHub</a>
                    <a href="https://iteshxt.me" target="_blank" rel="noopener noreferrer">Website</a>
                    <a href="mailto:mail.iteshxt@gmail.com">Email</a>
                </div>
            </div>
            <p className="site-footer-legal">© {new Date().getFullYear()} HiClippy. Paste it here. Open it anywhere.</p>
        </footer>
    );
}

/* ── Returning visitors ─────────────────────────────────────
   Read once at startup, before this visit marks itself, so the
   landing page knows whether this browser has been here before.
   Storage can throw (private mode, blocked site data): then we
   simply treat everyone as new.
────────────────────────────────────────────────────────────── */
const VISITED_KEY = 'hiclippyVisited';

export const IS_RETURNING_VISITOR = (() => {
    try { return localStorage.getItem(VISITED_KEY) === '1'; } catch { return false; }
})();

export function markVisited() {
    try { localStorage.setItem(VISITED_KEY, '1'); } catch { /* storage unavailable */ }
}

/* ── Per-page title, description and canonical URL ──────── */
const SITE_ORIGIN = 'https://www.hiclippy.online';

const PAGE_META = {
    '/': {
        title: 'HiClippy – Free Online Clipboard | Share Text & Files With a 4-Digit Code',
        desc: 'Share text, links, images and files up to 10MB between devices with a 4-digit code. Free, no account, and every clip deletes itself in minutes.',
    },
    '/share': {
        title: 'Share or Open a Clip – HiClippy Online Clipboard',
        desc: 'Paste text or drop a file to get a 4-digit code, or type a code to open a clip shared from another device.',
    },
    '/privacy': {
        title: 'Privacy Policy – HiClippy Online Clipboard',
        desc: 'How HiClippy handles what you share: no accounts, automatic deletion when the timer runs out, and rate limits against abuse.',
    },
    '/terms': {
        title: 'Terms of Service – HiClippy Online Clipboard',
        desc: 'The terms of service and usage rules for the HiClippy clipboard sharing service.',
    },
};

function setMeta(selector, attr, value) {
    const el = document.querySelector(selector);
    if (el) el.setAttribute(attr, value);
}

export function usePageMeta() {
    const { pathname, hash } = useLocation();

    React.useEffect(() => {
        const meta = PAGE_META[pathname] || PAGE_META['/'];
        const url = `${SITE_ORIGIN}${pathname === '/' ? '/' : pathname}`;
        document.title = meta.title;
        setMeta('meta[name="description"]', 'content', meta.desc);
        setMeta('link[rel="canonical"]', 'href', url);
        setMeta('meta[property="og:url"]', 'content', url);
        setMeta('meta[property="og:title"]', 'content', meta.title);
        setMeta('meta[property="og:description"]', 'content', meta.desc);
    }, [pathname]);

    // Scroll to #anchors (header links like /#faq), otherwise to the top.
    React.useEffect(() => {
        if (hash) {
            const t = setTimeout(() => {
                document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 50);
            return () => clearTimeout(t);
        }
        window.scrollTo(0, 0);
    }, [pathname, hash]);
}
