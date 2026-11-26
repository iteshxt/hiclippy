import React from 'react';
import { motion } from 'framer-motion';
import { NatureBg, SiteFooter } from './Site';

/* ── Shared layout for /privacy and /terms ──────────────────
   Title band with the meadow, a sticky contents list that
   highlights the section you're reading, and the document.
   `sections` = [{ id, title, body: <JSX> }]
────────────────────────────────────────────────────────────── */
export function LegalPage({ title, intro, updated, summary, sections }) {
    const [active, setActive] = React.useState(sections[0]?.id);

    React.useEffect(() => {
        const els = sections.map((s) => document.getElementById(s.id)).filter(Boolean);
        const io = new IntersectionObserver(
            (entries) => {
                const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
                if (visible[0]) setActive(visible[0].target.id);
            },
            { rootMargin: '-20% 0px -65% 0px' },
        );
        els.forEach((el) => io.observe(el));
        return () => io.disconnect();
    }, [sections]);

    return (
        <div className="legal">
            <header className="legal-hero">
                <motion.div
                    className="legal-hero-inner"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                    <h1 className="lp-h2">{title}</h1>
                    <p className="legal-intro">{intro}</p>
                    <p className="legal-updated">Last updated {updated}</p>
                </motion.div>
                <NatureBg variant="band" />
            </header>

            <div className="legal-body">
                <nav className="legal-toc" aria-label="On this page">
                    <p className="legal-toc-title">On this page</p>
                    <ol>
                        {sections.map((s) => (
                            <li key={s.id}>
                                <a href={`#${s.id}`} className={active === s.id ? 'is-active' : undefined}>{s.title}</a>
                            </li>
                        ))}
                    </ol>
                </nav>

                <article className="legal-doc">
                    {summary && (
                        <aside className="legal-summary" aria-label="Summary">
                            <h2>The short version</h2>
                            <ul>{summary.map((line) => <li key={line}>{line}</li>)}</ul>
                        </aside>
                    )}
                    {sections.map((s) => (
                        <section key={s.id} id={s.id} className="legal-section">
                            <h2>{s.title}</h2>
                            {s.body}
                        </section>
                    ))}
                </article>
            </div>

            <SiteFooter />
        </div>
    );
}
