import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { UploadCard } from './components/UploadCard';
import { FetchCard } from './components/FetchCard';
const Privacy = React.lazy(() => import('./pages/Privacy'));
const Terms = React.lazy(() => import('./pages/Terms'));

import {
    Zap as ZapIcon,
    Lock as LockIcon,
    Box as BoxIcon,
    Hash as HashIcon,
    Copy as _CopyIconSmall
} from 'lucide-react';

const features = [
    { Icon: ZapIcon, title: 'Zero Friction Sharing', desc: 'Instantly share text snippets and files up to 10MB—no accounts, no logins.' },
    { Icon: HashIcon, title: '4-Digit Quick Retrieval', desc: 'Fetch your shared clipboard on any device using a simple, temporary code.' },
    { Icon: LockIcon, title: 'Auto-Destruct Privacy', desc: 'Your shared content is private and automatically wiped forever upon expiry.' },
];

/* ── Nature SVG Background ──────────────────────────────── */
function NatureBg() {
    // Procedural background generation on mount
    const props = React.useMemo(() => {
        // 1. Randomize Hills (Static per reload)
        const hills = [...Array(4)].map((_, i) => {
            const h1 = 160 + Math.random() * 80;
            const h2 = 140 + Math.random() * 100;
            const h3 = 180 + Math.random() * 60;
            return `M-100,320 L-100,${h1} Q300,${h1 - 80} 720,${h2} Q1140,${h2 + 80} 1600,${h3} L1600,320 Z`;
        });

        // 2. Five Layers of Dense Grass
        const grassLayers = [...Array(5)].map((_, layerIndex) => {
            const count = 50 + (layerIndex * 15);
            return [...Array(count)].map((__, i) => {
                const type = i % 3; // 0: standard, 1: thick, 2: tapered/wild
                return {
                    x: Math.random() * 1500 - 50,
                    h: (20 + (layerIndex * 10)) + Math.random() * (20 + layerIndex * 5),
                    strokeWidth: type === 1 ? 3.5 : (type === 2 ? 1.5 : 2.5),
                    opacity: 0.3 + (layerIndex * 0.12),
                    color: ["#8ecfa8", "#6fb58d", "#4ba371", "#3a8f5e", "#2a6e40"][layerIndex],
                    duration: 3 + Math.random() * 4,
                    delay: Math.random() * 5,
                    skew: (Math.random() - 0.5) * 12
                };
            });
        });

        // 3. Scattered Flowers
        const flowers = [...Array(16)].map((_, i) => ({
            x: Math.random() * 1440,
            stemH: 25 + Math.random() * 20,
            delay: Math.random() * 6,
            color: ["#ff9e6d", "#ffcc6d", "#ffed6d", "#6dccff"][i % 4]
        }));

        return { hills, grassLayers, flowers };
    }, []);

    return (
        <div className="nature-bg" aria-hidden="true">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 1440 320"
                preserveAspectRatio="none"
                style={{ width: '100%', height: '100%', display: 'block' }}
            >
                {/* Procedural Static Hills */}
                {props.hills && props.hills.map((d, i) => {
                    if (!d) return null;
                    return (
                        <path
                            key={`hill-${i}`}
                            d={d}
                            fill={["#f0faf4", "#e2f5e9", "#d4eedd", "#c6e7d1"][i]}
                            opacity={0.6 + (i * 0.1)}
                        />
                    );
                })}

                {/* 5 Layers of Grass */}
                {props.grassLayers && props.grassLayers.map((layer, lIdx) => {
                    if (!layer) return null;
                    return (
                        <g key={`layer-${lIdx}`}>
                            {layer.map((g, i) => {
                                if (!g || typeof g.x !== 'number' || typeof g.h !== 'number' || typeof g.skew !== 'number') return null;
                                return (
                                    <motion.path
                                        key={`g-${lIdx}-${i}`}
                                        d={`M${g.x},321 Q${g.x + g.skew},${320 - g.h / 2} ${g.x},${320 - g.h}`}
                                        stroke={g.color}
                                        strokeWidth={g.strokeWidth}
                                        strokeLinecap="round"
                                        fill="none"
                                        opacity={g.opacity}
                                        animate={{
                                            d: [
                                                `M${g.x},321 Q${g.x + g.skew},${320 - g.h / 2} ${g.x},${320 - g.h}`,
                                                `M${g.x},321 Q${g.x + g.skew + 8},${320 - g.h / 2} ${g.x + 4},${320 - g.h}`,
                                                `M${g.x},321 Q${g.x + g.skew},${320 - g.h / 2} ${g.x},${320 - g.h}`
                                            ]
                                        }}
                                        transition={{ duration: g.duration, repeat: Infinity, ease: "easeInOut", delay: g.delay }}
                                    />
                                );
                            })}
                        </g>
                    );
                })}

                {/* Scattered Mixed Flowers */}
                {props.flowers && props.flowers.map((f, i) => {
                    if (!f || typeof f.x !== 'number' || typeof f.stemH !== 'number') return null;
                    return (
                        <g key={`f-${i}`}>
                            <path d={`M${f.x},320 Q${f.x + 2},${320 - f.stemH / 2} ${f.x},${320 - f.stemH}`} stroke="#2a6e40" strokeWidth="1.2" fill="none" opacity={0.5} />
                            <motion.g
                                animate={{ rotate: [0, 5, -5, 0], x: [0, 2, -2, 0] }}
                                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: f.delay }}
                                style={{ transformOrigin: `${f.x}px ${320 - f.stemH}px` }}
                            >
                                <circle cx={f.x} cy={320 - f.stemH - 4} r="4" fill={f.color} />
                                <circle cx={f.x - 4} cy={320 - f.stemH} r="4" fill={f.color} />
                                <circle cx={f.x + 4} cy={320 - f.stemH} r="4" fill={f.color} />
                                <circle cx={f.x} cy={320 - f.stemH + 4} r="4" fill={f.color} />
                                <circle cx={f.x} cy={320 - f.stemH} r="3" fill="#f4c430" />
                            </motion.g>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}

function DeveloperInfo() {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <motion.div
            className="dev-credits"
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
                    <a href="mailto:iteshxt@gmail.com" onClick={(e) => e.stopPropagation()}>Email</a>
                </div>
            </div>
        </motion.div>
    );
}

/* ── Fade-in variant for left col items ─────────────────── */
const fadeUp = {
    hidden: { opacity: 0, y: 22 },
    show: { opacity: 1, y: 0 },
};

/* ── Animated Mascot───────────────────────────── */
function Mascot() {
    return (
        <div className="mascot-wrapper">
            <motion.video
                src="/images/tom.webm"
                autoPlay
                loop
                muted
                playsInline
                className="mascot-img"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                aria-hidden="true"
                fetchPriority="high"
                onContextMenu={(e) => e.preventDefault()}
            >
                <track kind="captions" src="" label="Mute" />
            </motion.video>
        </div>
    );
}

/* ── Branding ── */
function Branding() {
    return (
        <motion.div
            className="brand-section"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="brand-row">
                <Mascot />
                <div className="brand-info">
                    <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <span className="brand-name" style={{ cursor: 'pointer', display: 'block' }}>HiClippy</span>
                    </Link>
                    <div className="brand-meta">
                        <span className="brand-tagline">The Ultimate Online Clipboard</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

export default function App() {
    const [activeTab, setActiveTab] = useState('share');
    const location = useLocation();
    const [hasRecentShare, setHasRecentShare] = useState(false);

    // Track recent share existence to dynamically size the main card
    React.useEffect(() => {
        const checkRecent = () => {
            const saved = localStorage.getItem('recentShare');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.expiresAt && new Date() > new Date(parsed.expiresAt)) {
                    setHasRecentShare(false);
                } else {
                    setHasRecentShare(true);
                }
            } else {
                setHasRecentShare(false);
            }
        };
        checkRecent();
        window.addEventListener('recentShareUpdated', checkRecent);
        const interval = setInterval(checkRecent, 1000);
        return () => {
            window.removeEventListener('recentShareUpdated', checkRecent);
            clearInterval(interval);
        };
    }, []);

    // Dynamically update SEO title & meta description on route changes
    React.useEffect(() => {
        let title = 'HiClippy – The Best Online Clipboard | Share Text & Files Instantly';
        let desc = 'HiClippy is the ultimate online clipboard for instant, anonymous sharing. Send text, images, and files between devices with a simple 4-digit code. The fastest clippy online alternative for private snippet sharing.';

        if (location.pathname === '/privacy') {
            title = 'Privacy Policy – HiClippy Online Clipboard';
            desc = 'Learn about HiClippy privacy standards, database auto-deletion, zero permanent logs, and rate limit protections.';
        } else if (location.pathname === '/terms') {
            title = 'Terms of Service – HiClippy Online Clipboard';
            desc = 'Read the terms of service and usage rules for HiClippy clipboard sharing platform.';
        }

        document.title = title;
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.setAttribute('content', desc);
        }
    }, [location.pathname]);

    return (
        <div className="page-shell">
            <NatureBg />
            <DeveloperInfo />

            <main className="page-inner">
                <div className="left-col">
                    <Branding />

                    {/* ── Hero (Heading) ── */}
                    <motion.div
                        className="hero-section"
                        variants={fadeUp}
                        initial="hidden"
                        animate="show"
                    >
                        <h1 className="hero-headline">
                            Your Ultimate<br />Online Clipboard
                        </h1>
                        <p className="hero-sub">Instant cross-device clipboard sharing. Send snippets, images, and files securely with zero friction.</p>
                    </motion.div>

                    {/* ── Features ── */}
                    <motion.div
                        className="features-section"
                        initial="hidden"
                        animate="show"
                        variants={{ show: { transition: { staggerChildren: 0.1 } } }}
                    >
                        <div className="features">
                            {features.map(({ Icon, title, desc }, i) => (
                                <motion.div
                                    key={title}
                                    className="feat-item"
                                    variants={fadeUp}
                                    transition={{ delay: i * 0.06 }}
                                >
                                    <div className="feat-icon"><Icon /></div>
                                    <div className="feat-body">
                                        <p className="feat-title">{title}</p>
                                        <p className="feat-desc">{desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Legal Footer Links */}
                        <div className="legal-footer-links">
                            <Link to="/privacy" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = 'var(--green)'} onMouseLeave={(e) => e.target.style.color = 'inherit'}>Privacy Policy</Link>
                            <span>•</span>
                            <Link to="/terms" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = 'var(--green)'} onMouseLeave={(e) => e.target.style.color = 'inherit'}>Terms & Conditions</Link>
                        </div>
                    </motion.div>
                </div>

                {/* ── RIGHT ── */}
                <motion.div
                    className="right-col"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
                >
                    {/* Tabs (Only on homepage) */}
                    {location.pathname === '/' && (
                        <div className="tab-strip">
                            {['share', 'fetch'].map((tab) => (
                                <button
                                    key={tab}
                                    className={`tab-btn${activeTab === tab ? ' active' : ''}`}
                                    onClick={() => setActiveTab(tab)}
                                >
                                    {tab === 'share' ? 'Share' : 'Retrieve'}
                                    {activeTab === tab && (
                                        <motion.div
                                            layoutId="tab-underline"
                                            style={{
                                                position: 'absolute',
                                                bottom: 0,
                                                left: 8,
                                                right: 8,
                                                height: 2,
                                                background: 'var(--green)',
                                                borderRadius: 2,
                                            }}
                                        />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Card */}
                    <div
                        className="main-card"
                        style={{
                            height: location.pathname === '/' ? (hasRecentShare ? '418px' : '480px') : 'auto',
                            borderRadius: location.pathname === '/' ? '0 0 20px 20px' : '20px'
                        }}
                    >
                        <AnimatePresence mode="wait">
                            <React.Suspense fallback={<div className="loading-fallback" />}>
                                <Routes location={location} key={location.pathname}>
                                    <Route path="/" element={
                                        <motion.div
                                            key={activeTab}
                                            initial={{ opacity: 0, x: activeTab === 'share' ? -16 : 16 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: activeTab === 'share' ? 16 : -16 }}
                                            transition={{ duration: 0.22, ease: 'easeInOut' }}
                                            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                                        >
                                            {activeTab === 'share' ? <UploadCard /> : <FetchCard />}
                                        </motion.div>
                                    } />
                                    <Route path="/privacy" element={<Privacy />} />
                                    <Route path="/terms" element={<Terms />} />
                                </Routes>
                            </React.Suspense>
                        </AnimatePresence>
                    </div>

                    {/* Recent Share floating pill (Only on homepage) */}
                    {location.pathname === '/' && <RecentShare />}
                </motion.div>

            </main>

            {/* Semantic SEO Rich Content for Bots (Hidden visually) */}
            <section className="sr-only">
                <h2>Frequently Asked Questions about Online Clipboard</h2>
                <h3>What is HiClippy?</h3>
                <p>HiClippy is a free, nature-inspired online clipboard tool that lets you securely share text snippets, links, images, and files across multiple devices anonymously. Using a simple 4-digit code, you can fetch your clipboard anywhere with zero accounts or logins required.</p>

                <h3>Is this online clipboard secure?</h3>
                <p>Yes. HiClippy prioritizes privacy. Your clipboard uploads are stored temporarily and automatically destroyed based on your chosen expiry time (up to 10 minutes) using automated database sweeps. No permanent activity logs are kept, and browser fingerprint hashes are only used to limit spam.</p>

                <h3>How do I use a clippy online clipboard?</h3>
                <p>Simply paste your text or drag your files up to 10MB into the input box on our homepage. Click share to generate a unique 4-digit code. Go to your target device, enter the retrieval code, and download or copy the contents instantly.</p>
            </section>
        </div>
    );
}

/* ── RecentShare Component ───────────────────────────────── */
const CopyIconSmall = () => (
    <_CopyIconSmall size={14} strokeWidth={2.2} />
);

function RecentShare() {
    const [recent, setRecent] = React.useState(null);
    const [copied, setCopied] = React.useState(false);

    React.useEffect(() => {
        let interval;
        const loadRecent = () => {
            const saved = localStorage.getItem('recentShare');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.expiresAt && new Date() > new Date(parsed.expiresAt)) {
                    localStorage.removeItem('recentShare');
                    setRecent(null);
                } else {
                    setRecent(parsed);
                }
            } else {
                setRecent(null);
            }
        };

        loadRecent();
        window.addEventListener('recentShareUpdated', loadRecent);

        interval = setInterval(() => {
            if (recent?.expiresAt && new Date() > new Date(recent.expiresAt)) {
                localStorage.removeItem('recentShare');
                setRecent(null);
            }
        }, 1000);

        return () => {
            window.removeEventListener('recentShareUpdated', loadRecent);
            clearInterval(interval);
        };
    }, [recent]);

    if (!recent) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="recent-share"
        >
            <div className="recent-info">
                <span className="recent-label">Shared</span>
                <span className="recent-name" title={recent.name}>{recent.name}</span>
                <span className="recent-meta">({recent.duration}m)</span>
            </div>
            <div className="recent-code">
                <span>Code:</span>
                <strong>{recent.id}</strong>
                <button
                    onClick={() => {
                        navigator.clipboard.writeText(recent.id);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                    }}
                    title="Copy Code"
                >
                    {copied ? <span style={{ fontSize: 10, fontWeight: 'bold', color: 'var(--green)' }}>✓</span> : <CopyIconSmall />}
                </button>
            </div>
        </motion.div>
    );
}