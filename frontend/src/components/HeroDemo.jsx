import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Check, Copy, Share, Type, Image, File, Smartphone, Laptop } from 'lucide-react';

/* ── Hero demo ──────────────────────────────────────────────
   A looping, scaled-down replay of the real flow, built from the
   same UI the /share page uses: type on the laptop, share, get a
   code, type the code on the phone, see the text arrive.
   Everything is driven by one clock (t, in ms) so the two devices
   stay in sync. Reduced motion shows the finished state, still.
────────────────────────────────────────────────────────────── */
const TEXT = 'Grocery list:\noat milk, basil, 2 lemons';
const CODE = '4821';
const LOOP = 9400;

// Timeline (ms)
const T_TYPE_START = 500;
const T_TYPE_END = T_TYPE_START + TEXT.length * 38;
const T_PRESS = T_TYPE_END + 350;
const T_SHARED = T_PRESS + 350;
const T_DIGIT0 = T_SHARED + 1100;
const T_DIGIT_GAP = 230;
const T_RECEIVED = T_DIGIT0 + CODE.length * T_DIGIT_GAP + 300;
const T_FADE = LOOP - 500;

function useDemoClock(start) {
    const reduce = useReducedMotion();
    const [t, setT] = React.useState(reduce ? T_RECEIVED + 400 : 0);

    React.useEffect(() => {
        if (reduce || !start) return;
        // 20 updates a second is plenty for typing; framer animates the rest.
        let origin = performance.now();
        const id = setInterval(() => {
            if (!document.hidden) setT((performance.now() - origin) % LOOP);
        }, 50);
        // Restart cleanly when the tab comes back, instead of jumping mid-loop.
        const onVis = () => { if (!document.hidden) origin = performance.now(); };
        document.addEventListener('visibilitychange', onVis);
        return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
    }, [reduce, start]);

    return t;
}

function Pills({ options, active }) {
    return (
        <div className="demo-pills">
            {options.map(({ label, Icon }, i) => (
                <span key={label} className={`demo-pill${i === active ? ' is-active' : ''}`}>
                    {Icon && <Icon />}{label}
                </span>
            ))}
        </div>
    );
}

export function HeroDemo({ start = true }) {
    const t = useDemoClock(start);

    const typed = TEXT.slice(0, Math.max(0, Math.min(TEXT.length, Math.floor((t - T_TYPE_START) / 38))));
    const pressing = t >= T_PRESS && t < T_SHARED;
    const shared = t >= T_SHARED;
    const digits = CODE.slice(0, Math.max(0, Math.min(CODE.length, Math.floor((t - T_DIGIT0) / T_DIGIT_GAP) + 1)));
    const received = t >= T_RECEIVED;
    const fading = t >= T_FADE;

    return (
        <div className={`hero-demo${fading ? ' is-fading' : ''}`} aria-hidden="true">
            {/* ── Laptop: the Share tab ── */}
            <div className="demo-device demo-laptop">
                <div className="demo-bar">
                    <span className="demo-dots"><i /><i /><i /></span>
                    <span className="demo-url">hiclippy.online/share</span>
                </div>
                <div className="demo-body">
                    <AnimatePresence mode="wait" initial={false}>
                        {!shared ? (
                            <motion.div
                                key="form"
                                className="demo-form"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0, scale: 0.97 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="demo-row">
                                    <Pills active={0} options={[{ label: 'Text', Icon: Type }, { label: 'Image', Icon: Image }, { label: 'File', Icon: File }]} />
                                    <Pills active={1} options={[{ label: '1m' }, { label: '5m' }, { label: '10m' }]} />
                                </div>
                                <div className="demo-textarea">
                                    {typed}
                                    {!shared && <span className="demo-caret" />}
                                </div>
                                <span className={`demo-submit${typed.length === TEXT.length ? ' is-ready' : ''}${pressing ? ' is-pressed' : ''}`}>
                                    <Share /> Share to Clipboard
                                </span>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="done"
                                className="demo-done"
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="demo-done-head">
                                    <motion.span
                                        className="demo-check"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.08 }}
                                    >
                                        <Check />
                                    </motion.span>
                                    <div>
                                        <p className="demo-done-title">Shared successfully!</p>
                                        <p className="demo-done-sub">Expires in 5 minutes</p>
                                    </div>
                                </div>
                                <div className="demo-codebox">
                                    <span className="demo-codebox-label">Share code</span>
                                    <motion.span
                                        className="demo-codebox-code"
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.15 }}
                                    >
                                        {CODE}
                                    </motion.span>
                                    <span className="demo-copied"><Copy /> Copied!</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                <span className="demo-device-label"><Laptop /> This laptop</span>
            </div>

            {/* ── Phone: the Retrieve tab ── */}
            <div className="demo-device demo-phone">
                <span className="demo-notch" />
                <div className="demo-phone-body">
                    <p className="demo-phone-title">Retrieve</p>
                    <div className="demo-phone-tiles">
                        {[0, 1, 2, 3].map((i) => (
                            <span key={i} className={`demo-phone-tile${digits[i] ? ' is-filled' : ''}`}>
                                <AnimatePresence>
                                    {digits[i] && (
                                        <motion.span
                                            initial={{ y: 10, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ duration: 0.18 }}
                                        >
                                            {digits[i]}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </span>
                        ))}
                    </div>
                    <AnimatePresence>
                        {received && (
                            <motion.div
                                className="demo-received"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.35, ease: 'easeOut' }}
                            >
                                <span className="demo-received-banner"><Check /> Retrieved</span>
                                <p className="demo-received-text">{TEXT}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                <span className="demo-device-label"><Smartphone /> Your phone</span>
            </div>
        </div>
    );
}
