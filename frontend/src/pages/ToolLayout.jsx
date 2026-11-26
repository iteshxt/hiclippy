import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, Outlet, useSearchParams } from 'react-router-dom';
import { UploadCard } from '../components/UploadCard';
import { FetchCard } from '../components/FetchCard';
import { NatureBg, Mascot, DeveloperInfo } from '../components/Site';
import {
    Zap as ZapIcon,
    Lock as LockIcon,
    Hash as HashIcon,
    Copy as CopyIcon,
} from 'lucide-react';

const features = [
    { Icon: ZapIcon, title: 'Zero Friction Sharing', desc: 'Instantly share text snippets and files up to 10MB—no accounts, no logins.' },
    { Icon: HashIcon, title: '4-Digit Quick Retrieval', desc: 'Fetch your shared clipboard on any device using a simple, temporary code.' },
    { Icon: LockIcon, title: 'Auto-Destruct Privacy', desc: 'Your shared content is private and automatically wiped forever upon expiry.' },
];

const fadeUp = {
    hidden: { opacity: 0, y: 22 },
    show: { opacity: 1, y: 0 },
};

/* ── Layout for the tool and legal pages ────────────────────
   The meadow page that used to be the homepage: intro on the
   left, the share tool on the right.
────────────────────────────────────────────────────────────── */
export default function ToolLayout() {
    return (
        <div className="page-shell">
            <NatureBg />

            <main className="page-inner">
                <div className="left-col">
                    <motion.div
                        className="brand-section"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="brand-row">
                            <Mascot />
                            <h1 className="hero-headline tool-headline">
                                Your Ultimate<br />Online Clipboard
                            </h1>
                        </div>
                    </motion.div>

                    <motion.div className="hero-section" variants={fadeUp} initial="hidden" animate="show">
                        <p className="hero-sub">Instant cross-device clipboard sharing. Send snippets, images, and files securely with zero friction.</p>
                    </motion.div>

                    <motion.div
                        className="features-section"
                        initial="hidden"
                        animate="show"
                        variants={{ show: { transition: { staggerChildren: 0.1 } } }}
                    >
                        <div className="features">
                            {features.map(({ Icon, title, desc }) => (
                                <motion.div key={title} className="feat-item" variants={fadeUp}>
                                    <div className="feat-icon"><Icon /></div>
                                    <div className="feat-body">
                                        <p className="feat-title">{title}</p>
                                        <p className="feat-desc">{desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <div className="legal-footer-links">
                            <Link to="/privacy">Privacy Policy</Link>
                            <span aria-hidden="true">•</span>
                            <Link to="/terms">Terms & Conditions</Link>
                        </div>
                    </motion.div>
                </div>

                <motion.div
                    className="right-col"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
                >
                    <React.Suspense fallback={<div className="main-card loading-fallback" style={{ borderRadius: 20 }} />}>
                        <Outlet />
                    </React.Suspense>
                </motion.div>
            </main>
            <DeveloperInfo />
        </div>
    );
}

/* ── /share: Share and Retrieve tabs ────────────────────────
   /share?code=1234 opens the Retrieve tab and fetches that code;
   /share?tab=retrieve opens the Retrieve tab empty.
────────────────────────────────────────────────────────────── */
export function ShareTool() {
    const [searchParams, setSearchParams] = useSearchParams();
    const urlCode = searchParams.get('code');
    const wantsRetrieve = /^\d{4}$/.test(urlCode || '') || searchParams.get('tab') === 'retrieve';

    const [activeTab, setActiveTab] = useState(wantsRetrieve ? 'fetch' : 'share');
    const [pendingCode, setPendingCode] = useState(/^\d{4}$/.test(urlCode || '') ? urlCode : null);
    const [hasRecentShare, setHasRecentShare] = useState(false);

    // A link to /share?code=… while already on /share switches to that code.
    React.useEffect(() => {
        if (/^\d{4}$/.test(urlCode || '')) {
            setActiveTab('fetch');
            setPendingCode(urlCode);
        } else if (searchParams.get('tab') === 'retrieve') {
            setActiveTab('fetch');
        }
    }, [urlCode, searchParams]);

    // Once the code is handed to the Retrieve card, drop it from the URL so
    // switching tabs or refreshing doesn't look it up again.
    const consumeCode = React.useCallback(() => {
        setPendingCode(null);
        setSearchParams({}, { replace: true });
    }, [setSearchParams]);

    // Track recent share existence to size the main card
    React.useEffect(() => {
        const checkRecent = () => setHasRecentShare(!!readRecentShare());
        checkRecent();
        window.addEventListener('recentShareUpdated', checkRecent);
        const interval = setInterval(checkRecent, 1000);
        return () => {
            window.removeEventListener('recentShareUpdated', checkRecent);
            clearInterval(interval);
        };
    }, []);

    return (
        <>
            <div className="tab-strip" role="tablist" aria-label="Share or retrieve">
                {['share', 'fetch'].map((tab) => (
                    <button
                        key={tab}
                        role="tab"
                        aria-selected={activeTab === tab}
                        className={`tab-btn${activeTab === tab ? ' active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === 'share' ? 'Share' : 'Retrieve'}
                        {activeTab === tab && (
                            <motion.div
                                layoutId="tab-underline"
                                style={{ position: 'absolute', bottom: 0, left: 8, right: 8, height: 2, background: 'var(--green)', borderRadius: 2 }}
                            />
                        )}
                    </button>
                ))}
            </div>

            <div
                className="main-card"
                style={{ height: hasRecentShare ? '418px' : '480px', borderRadius: '0 0 20px 20px' }}
            >
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: activeTab === 'share' ? -16 : 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: activeTab === 'share' ? 16 : -16 }}
                        transition={{ duration: 0.22, ease: 'easeInOut' }}
                        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                    >
                        {activeTab === 'share'
                            ? <UploadCard />
                            : <FetchCard initialCode={pendingCode} onInitialCodeUsed={consumeCode} />}
                    </motion.div>
                </AnimatePresence>
            </div>

            <RecentShare />
        </>
    );
}

/* ── recentShare storage ─────────────────────────────────────
   Returns the saved share, or null if it's missing, expired or
   unreadable. Bad or expired entries are removed. Storage can
   also throw (private mode, blocked site data), so never let
   that take the page down.
────────────────────────────────────────────────────────────── */
function readRecentShare() {
    try {
        const saved = localStorage.getItem('recentShare');
        if (!saved) return null;
        const parsed = JSON.parse(saved);
        const expired = parsed?.expiresAt && new Date() > new Date(parsed.expiresAt);
        if (!parsed || typeof parsed !== 'object' || !parsed.id || expired) {
            localStorage.removeItem('recentShare');
            return null;
        }
        return parsed;
    } catch {
        try { localStorage.removeItem('recentShare'); } catch { /* storage unavailable */ }
        return null;
    }
}

function RecentShare() {
    const [recent, setRecent] = React.useState(null);
    const [copied, setCopied] = React.useState(false);

    React.useEffect(() => {
        const loadRecent = () => setRecent(readRecentShare());

        loadRecent();
        window.addEventListener('recentShareUpdated', loadRecent);

        const interval = setInterval(() => {
            if (recent?.expiresAt && new Date() > new Date(recent.expiresAt)) {
                setRecent(readRecentShare()); // also clears the expired entry
            }
        }, 1000);

        return () => {
            window.removeEventListener('recentShareUpdated', loadRecent);
            clearInterval(interval);
        };
    }, [recent]);

    if (!recent) return null;

    return (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="recent-share">
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
                    {copied ? <span style={{ fontSize: 10, fontWeight: 'bold', color: 'var(--green)' }}>✓</span> : <CopyIcon size={14} strokeWidth={2.2} />}
                </button>
            </div>
        </motion.div>
    );
}
