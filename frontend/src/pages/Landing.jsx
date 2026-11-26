import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { NatureBg, Mascot, SiteFooter, DeveloperInfo, IS_RETURNING_VISITOR } from '../components/Site';
import { HeroDemo } from '../components/HeroDemo';
import {
    Type as TextIcon,
    Link2 as LinkIcon,
    Image as ImageIcon,
    FileText as FileIcon,
    ShieldCheck as ShieldIcon,
    Timer as TimerIcon,
    UserX as NoAccountIcon,
    Ban as BlockIcon,
    ChevronDown as ChevronIcon,
    Check as CheckIcon,
    Copy as CopyIcon,
    Share as ShareIcon,
    Film as FilmIcon,
    Music as MusicIcon,
    Table as TableIcon,
    FileCode as CodeIcon,
} from 'lucide-react';

const EASE = [0.22, 1, 0.36, 1];

/* ── Hero code entry ────────────────────────────────────────
   Four digit tiles backed by one real input (one tab stop, works
   with paste and phone number pads). A full code opens /share.
────────────────────────────────────────────────────────────── */
function CodeEntry() {
    const [code, setCode] = useState('');
    const [focused, setFocused] = useState(false);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    const open = (value) => {
        if (/^\d{4}$/.test(value)) navigate(`/share?code=${value}`);
    };

    const onChange = (e) => {
        const next = e.target.value.replace(/\D/g, '').slice(0, 4);
        setCode(next);
        if (next.length === 4) open(next);
    };

    return (
        <form className="code-entry" onSubmit={(e) => { e.preventDefault(); open(code); }}>
            <label htmlFor="hero-code" className="code-entry-label">Got a code?</label>
            <div className="code-entry-row">
                <div className={`code-tiles${focused ? ' is-focused' : ''}`} onClick={() => inputRef.current?.focus()}>
                    <input
                        ref={inputRef}
                        id="hero-code"
                        name="code"
                        className="code-tiles-input"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="\d{4}"
                        maxLength={4}
                        value={code}
                        onChange={onChange}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        aria-describedby="hero-code-hint"
                    />
                    {[0, 1, 2, 3].map((i) => (
                        <span
                            key={i}
                            aria-hidden="true"
                            className={`code-tile${code[i] ? ' is-filled' : ''}${focused && i === Math.min(code.length, 3) ? ' is-active' : ''}`}
                        >
                            {code[i] || ''}
                        </span>
                    ))}
                </div>
                <button type="submit" className="btn btn-dark" disabled={code.length !== 4}>Open</button>
            </div>
            <p id="hero-code-hint" className="code-entry-hint">Type the 4 digits from your other device.</p>
        </form>
    );
}

/* ── Scroll reveal: fades content up once as it enters view ── */
function Reveal({ children, delay = 0, y = 24, className, as = 'div' }) {
    const Comp = motion[as];
    return (
        <Comp
            className={className}
            initial={{ opacity: 0, y }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, delay, ease: EASE }}
        >
            {children}
        </Comp>
    );
}

/* ── Step visuals: small pieces of the real interface ─────── */
function StepVisual({ index }) {
    if (index === 0) {
        return (
            <div className="step-visual step-visual--paste">
                <span className="step-pill is-active"><TextIcon /> Text</span>
                <span className="step-pill">5m</span>
                <div className="step-text">Grocery list:<br />oat milk, basil, 2 lemons</div>
            </div>
        );
    }
    if (index === 1) {
        return (
            <div className="step-visual step-visual--code">
                <div className="step-tiles">
                    {'4821'.split('').map((d, j) => (
                        <motion.span
                            key={j}
                            initial={{ rotateX: -90, opacity: 0 }}
                            whileInView={{ rotateX: 0, opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.5 + j * 0.12, duration: 0.45, ease: EASE }}
                        >
                            {d}
                        </motion.span>
                    ))}
                </div>
                <span className="step-copied"><CopyIcon /> Copied to your clipboard</span>
            </div>
        );
    }
    return (
        <div className="step-visual step-visual--open">
            <span className="step-banner"><CheckIcon /> Retrieved</span>
            <div className="step-text">Grocery list:<br />oat milk, basil, 2 lemons</div>
        </div>
    );
}

const steps = [
    { title: 'Paste or drop', body: 'Type some text, paste a link, or drop in a file up to 10MB.' },
    { title: 'Get a code', body: 'Choose 1, 5 or 10 minutes. You get a 4-digit code, already copied for you.' },
    { title: 'Open it anywhere', body: 'On your other device, open HiClippy and type the code. Copy it, preview it or download it.' },
];

const fileTypes = [
    { Icon: FileIcon, label: 'PDF' },
    { Icon: FilmIcon, label: 'Video' },
    { Icon: MusicIcon, label: 'Audio' },
    { Icon: TableIcon, label: 'CSV tables' },
    { Icon: CodeIcon, label: 'Text and code' },
    { Icon: ImageIcon, label: 'Images' },
];

/* One tile in the "What you can send" grid */
function BentoTile({ className, delay, icon: Icon, title, body, children }) {
    return (
        <motion.div
            className={`bento ${className}`}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.6, delay, ease: EASE }}
        >
            <div className="bento-visual">{children}</div>
            <div className="bento-copy">
                <h3><Icon aria-hidden="true" /> {title}</h3>
                <p>{body}</p>
            </div>
        </motion.div>
    );
}

const promises = [
    { Icon: TimerIcon, title: 'Deleted for good', text: 'When the timer runs out, the clip is removed and the code stops working.' },
    { Icon: NoAccountIcon, title: 'No account', text: 'No email, no sign-up, no profile. Just a code.' },
    { Icon: ShieldIcon, title: 'Safe downloads', text: 'Files are sent as downloads, never run as web pages.' },
    { Icon: BlockIcon, title: 'Guessing is blocked', text: 'After 30 wrong codes in 10 minutes, that device has to wait.' },
];

const faqs = [
    { q: 'Is HiClippy free?', a: 'Yes. There is no paid plan and no account to create.' },
    { q: 'How long does a clip stay?', a: 'You choose 1, 5 or 10 minutes when you share it. When the time is up, the clip is deleted and the code stops working.' },
    { q: 'What is the size limit?', a: 'Files can be up to 10MB each. Text and links can be as long as you need within that.' },
    { q: 'Who can see what I share?', a: 'Anyone who types the code before the clip expires. Codes are short so they are easy to type, which also means they are not a password: avoid sharing passwords, keys or anything you would not want a stranger to see.' },
    { q: 'Which files can I preview?', a: 'Images, video, audio, PDFs, text and code files, and CSV tables open in the page, with a full-screen view. Other files go straight to download.' },
    { q: 'Does it work on my phone?', a: 'Yes. HiClippy runs in any modern browser on phones, tablets and computers, with nothing to install.' },
];

/* ── FAQ item: button + animated panel ──────────────────── */
function FaqItem({ q, a, id }) {
    const [open, setOpen] = useState(false);
    return (
        <div className={`faq-item${open ? ' is-open' : ''}`}>
            <h3>
                <button
                    className="faq-q"
                    aria-expanded={open}
                    aria-controls={`${id}-panel`}
                    id={`${id}-btn`}
                    onClick={() => setOpen((o) => !o)}
                >
                    <span>{q}</span>
                    <ChevronIcon aria-hidden="true" />
                </button>
            </h3>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        id={`${id}-panel`}
                        role="region"
                        aria-labelledby={`${id}-btn`}
                        className="faq-a"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: EASE }}
                    >
                        <p>{a}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ── Hero headline: each line slides up out of a mask ────── */
function MaskLine({ children, delay }) {
    return (
        <span className="mask-line">
            <motion.span
                initial={{ y: '110%' }}
                animate={{ y: '0%' }}
                transition={{ duration: 0.9, delay, ease: EASE }}
            >
                {children}
            </motion.span>
        </span>
    );
}

export default function Landing() {
    // The demo starts once the intro has played.
    const [demoOn, setDemoOn] = useState(false);
    React.useEffect(() => {
        const t = setTimeout(() => setDemoOn(true), 1600);
        return () => clearTimeout(t);
    }, []);

    // Someone who has been here before and opens hiclippy.online directly
    // goes straight to the clipboard. Clicking the logo or "Home" inside the
    // app (not a fresh page load), an #anchor link, or /?home still shows
    // this page.
    const location = useLocation();
    const freshLoad = location.key === 'default';
    const wantsHome = location.hash || new URLSearchParams(location.search).has('home');
    if (IS_RETURNING_VISITOR && freshLoad && !wantsHome) {
        return <Navigate to="/share" replace />;
    }

    return (
        <div className="landing">
            {/* ── Hero: the meadow ── */}
            <section className="lp-hero">
                <div className="lp-hero-inner">
                    <div className="lp-hero-copy">
                        <h1 className="lp-h1">
                            <MaskLine delay={0.1}>Paste it here.</MaskLine>
                            <MaskLine delay={0.22}>Open it anywhere.</MaskLine>
                        </h1>
                        <motion.p
                            className="lp-lede"
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.5, ease: EASE }}
                        >
                            HiClippy is a free online clipboard. Share text, links, images or files
                            with a 4-digit code and open them on any other device. No account, and
                            everything deletes itself in minutes.
                        </motion.p>

                        <motion.div
                            className="lp-actions"
                            initial={{ opacity: 0, y: 22 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.66, ease: EASE }}
                        >
                            <div className="lp-action-send">
                                <p className="code-entry-label">Sending something?</p>
                                <Link to="/share" className="btn btn-primary"><ShareIcon aria-hidden="true" /> Share something</Link>
                                <p className="code-entry-hint">Text, links or files up to 10MB.</p>
                            </div>
                            <div className="lp-action-divider" aria-hidden="true" />
                            <CodeEntry />
                        </motion.div>
                    </div>

                    <div className="lp-hero-visual">
                        <motion.div
                            className="lp-hero-visual-in"
                            initial={{ opacity: 0, x: 40, rotate: 1.5 }}
                            animate={{ opacity: 1, x: 0, rotate: 0 }}
                            transition={{ duration: 0.9, delay: 0.45, ease: EASE }}
                        >
                            <HeroDemo start={demoOn} />
                        </motion.div>
                        <motion.div
                            className="lp-hero-mascot"
                            initial={{ y: 220 }}
                            animate={{ y: 0 }}
                            transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 1.0 }}
                        >
                            <Mascot className="lp-mascot" />
                        </motion.div>
                    </div>
                </div>
                <NatureBg variant="hero" />
            </section>

            {/* ── How it works ── */}
            <section className="lp-section" id="how-it-works" aria-labelledby="how-title">
                <div className="lp-container">
                    <Reveal className="lp-section-head">
                        <h2 id="how-title" className="lp-h2">How it works</h2>
                        <p className="lp-section-lede">Three steps, about ten seconds. Nothing to install on either device.</p>
                    </Reveal>
                    <ol className="lp-steps">
                        <motion.span
                            className="lp-steps-line"
                            aria-hidden="true"
                            initial={{ scaleX: 0 }}
                            whileInView={{ scaleX: 1 }}
                            viewport={{ once: true, amount: 0.5 }}
                            transition={{ duration: 1.2, delay: 0.2, ease: EASE }}
                        />
                        {steps.map((s, i) => (
                            <motion.li
                                key={s.title}
                                className="lp-step"
                                initial={{ opacity: 0, y: 28 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, amount: 0.3 }}
                                transition={{ duration: 0.7, delay: 0.15 + i * 0.25, ease: EASE }}
                            >
                                <motion.span
                                    className="lp-step-num"
                                    aria-hidden="true"
                                    initial={{ scale: 0.4 }}
                                    whileInView={{ scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 16, delay: 0.25 + i * 0.25 }}
                                >
                                    {i + 1}
                                </motion.span>
                                <h3>{s.title}</h3>
                                <p>{s.body}</p>
                                <StepVisual index={i} />
                            </motion.li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* ── What you can send: real previews ── */}
            <section className="lp-section lp-section--tint" aria-labelledby="kinds-title">
                <div className="lp-container">
                    <Reveal className="lp-section-head">
                        <h2 id="kinds-title" className="lp-h2">What you can send</h2>
                        <p className="lp-section-lede">
                            Whatever you would normally email to yourself. Most of it opens right in the
                            page, so you can check it before you download.
                        </p>
                    </Reveal>

                    <div className="lp-bento">
                        <BentoTile className="bento-text" delay={0} icon={TextIcon} title="Text and code" body="Notes, snippets, addresses. Copy it on the other side with one click.">
                            <div className="bento-snippet">
                                <span className="bento-snippet-bar"><i /><i /><i /><b><CopyIcon /> Copy</b></span>
                                <pre>{'npm run dev\n# then open localhost:3000'}</pre>
                            </div>
                        </BentoTile>
                        <BentoTile className="bento-link" delay={0.08} icon={LinkIcon} title="Links" body="Links open with one tap on the other device.">
                            <div className="bento-linkchip">
                                <LinkIcon aria-hidden="true" />
                                <span>github.com/iteshxt</span>
                            </div>
                        </BentoTile>
                        <BentoTile className="bento-image" delay={0.16} icon={ImageIcon} title="Images" body="See the picture before you save it.">
                            <div className="bento-photo">
                                <img src="/web-app-manifest-192x192.png" alt="" width="96" height="96" loading="lazy" />
                            </div>
                        </BentoTile>
                        <BentoTile className="bento-files" delay={0.24} icon={FileIcon} title="Files up to 10MB" body="These open in the page with a full-screen view. Anything else downloads.">
                            <ul className="bento-filetypes">
                                {fileTypes.map(({ Icon, label }) => (
                                    <li key={label}><Icon aria-hidden="true" />{label}</li>
                                ))}
                            </ul>
                        </BentoTile>
                    </div>
                </div>
            </section>

            {/* ── Privacy: the timer ── */}
            <section className="lp-section" aria-labelledby="privacy-title">
                <div className="lp-container lp-privacy">
                    <TimerCard />
                    <div>
                        <Reveal>
                            <h2 id="privacy-title" className="lp-h2">Gone when the timer runs out</h2>
                            <p className="lp-section-lede">
                                Every clip gets a timer when you share it. When it hits zero, the clip is
                                removed from our database and the code stops working.
                            </p>
                        </Reveal>
                        <ul className="lp-promises">
                            {promises.map(({ Icon, title, text }, i) => (
                                <Reveal as="li" key={title} delay={0.1 + i * 0.08} y={12}>
                                    <span className="lp-promise-icon"><Icon aria-hidden="true" /></span>
                                    <div>
                                        <h3>{title}</h3>
                                        <p>{text}</p>
                                    </div>
                                </Reveal>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            {/* ── FAQ ── */}
            <section className="lp-section lp-section--tint" id="faq" aria-labelledby="faq-title">
                <div className="lp-container lp-split lp-split--faq">
                    <Reveal>
                        <h2 id="faq-title" className="lp-h2">Questions</h2>
                        <p className="lp-section-lede">The short answers. The <Link to="/privacy">privacy policy</Link> has the long ones.</p>
                    </Reveal>
                    <Reveal className="lp-faq" delay={0.1}>
                        {faqs.map(({ q, a }, i) => <FaqItem key={q} q={q} a={a} id={`faq-${i}`} />)}
                    </Reveal>
                </div>
            </section>

            {/* ── Closing call to action ── */}
            <section className="lp-cta">
                <div className="lp-container lp-cta-inner">
                    <Mascot className="lp-cta-mascot" />
                    <Reveal>
                        <h2 className="lp-h2">Got something to move?</h2>
                        <p>Paste it in, take the code to your other device, done.</p>
                        <div className="lp-cta-actions">
                            <Link to="/share" className="btn btn-primary btn-lg">Share something</Link>
                            <Link to="/share?tab=retrieve" className="btn btn-ghost btn-lg">Open a code</Link>
                        </div>
                    </Reveal>
                </div>
                <DeveloperInfo />
            </section>

            <SiteFooter />
        </div>
    );
}

/* ── Timer card: drains once when it scrolls into view ───── */
function TimerCard() {
    const [run, setRun] = useState(false);
    return (
        <motion.div
            className={`lp-timer${run ? ' is-running' : ''}`}
            aria-hidden="true"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            onViewportEnter={() => setRun(true)}
            transition={{ duration: 0.8, ease: EASE }}
        >
            <div className="lp-timer-head">
                <span className="lp-timer-code">4821</span>
                <span className="lp-timer-status">Expires in 5 min</span>
            </div>
            <div className="lp-timer-track">
                <span className="lp-timer-fill" />
            </div>
            <div className="lp-timer-marks">
                <span style={{ left: '10%' }}>1 min</span>
                <span style={{ left: '50%' }}>5 min</span>
                <span style={{ left: '100%' }}>10 min</span>
            </div>
            <p className="lp-timer-caption">Pick 1, 5 or 10 minutes. After that, there is nothing left to find.</p>
        </motion.div>
    );
}
