import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Maximize2 as ExpandIcon,
    X as CloseIcon,
    ExternalLink as OpenIcon,
    FileQuestion as NoPreviewIcon,
} from 'lucide-react';

/* ── Limits ─────────────────────────────────────────────── */
const TEXT_PREVIEW_BYTES = 200 * 1024; // show at most 200KB of a text file
const CSV_PREVIEW_ROWS = 200;

/* ── Type detection ─────────────────────────────────────── */
const TEXT_EXTENSIONS = new Set([
    'txt', 'md', 'markdown', 'log', 'csv', 'tsv', 'json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'env', 'conf', 'cfg',
    'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'css', 'scss', 'html', 'htm', 'svg', 'py', 'rb', 'go', 'rs', 'java',
    'kt', 'c', 'h', 'cpp', 'hpp', 'cs', 'php', 'sh', 'bash', 'zsh', 'sql', 'swift', 'dart', 'lua', 'r', 'vue',
    'svelte', 'gitignore', 'dockerfile',
]);
const TEXT_MIMES = new Set([
    'application/json', 'application/xml', 'application/javascript', 'application/x-javascript',
    'application/x-sh', 'application/x-yaml', 'application/yaml', 'application/sql', 'application/toml',
]);

const extensionOf = (name = '') => {
    const base = name.toLowerCase().split('/').pop();
    if (!base.includes('.')) return base; // e.g. "Dockerfile"
    return base.split('.').pop();
};

// Browsers and phones sometimes upload with an empty or generic MIME type,
// so fall back to the extension for the formats we can actually play.
const EXT_MIMES = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
    avif: 'image/avif', bmp: 'image/bmp', ico: 'image/x-icon', svg: 'image/svg+xml',
    mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', ogv: 'video/ogg',
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', oga: 'audio/ogg', m4a: 'audio/mp4',
    aac: 'audio/aac', flac: 'audio/flac', opus: 'audio/opus',
    pdf: 'application/pdf',
};

const GENERIC_MIMES = new Set(['', 'application/octet-stream', 'binary/octet-stream', 'application/x-download']);

/** The MIME type to use for previewing: the uploaded one, or one guessed from the extension. */
export function effectiveMime(mimeType = '', fileName = '') {
    const mime = (mimeType || '').toLowerCase();
    if (!GENERIC_MIMES.has(mime)) return mime;
    return EXT_MIMES[extensionOf(fileName)] || mime;
}

/**
 * Decide how to preview a file. HTML is deliberately shown as source text:
 * rendering it (or an SVG) in an iframe from a blob: URL would run its scripts
 * on our origin.
 */
export function detectPreviewKind(mimeType = '', fileName = '') {
    const mime = effectiveMime(mimeType, fileName);
    const ext = extensionOf(fileName);

    if (ext === 'csv' || ext === 'tsv' || mime === 'text/csv' || mime === 'text/tab-separated-values') return 'csv';
    if (mime === 'image/svg+xml' || ext === 'svg') return 'image'; // <img> never runs SVG scripts
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
    if (mime.startsWith('text/') || TEXT_MIMES.has(mime) || TEXT_EXTENSIONS.has(ext)) return 'text';
    return 'none';
}

/* ── Helpers ────────────────────────────────────────────── */
export function base64ToBytes(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
}

export function formatBytes(n) {
    if (!Number.isFinite(n)) return '';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function decodeText(bytes) {
    const slice = bytes.subarray(0, TEXT_PREVIEW_BYTES);
    // A NUL byte in the first few KB means it's really binary, not text.
    const probe = slice.subarray(0, 8000);
    if (probe.includes(0)) return null;
    return {
        text: new TextDecoder('utf-8', { fatal: false }).decode(slice),
        truncated: bytes.length > TEXT_PREVIEW_BYTES,
    };
}

/** Small CSV parser that handles quoted fields; good enough for a preview. */
function parseCsv(text, delimiter) {
    const rows = [];
    let row = [], field = '', inQuotes = false;
    for (let i = 0; i < text.length && rows.length < CSV_PREVIEW_ROWS + 1; i++) {
        const c = text[i];
        if (inQuotes) {
            if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
            else if (c === '"') inQuotes = false;
            else field += c;
        } else if (c === '"') inQuotes = true;
        else if (c === delimiter) { row.push(field); field = ''; }
        else if (c === '\n' || c === '\r') {
            if (c === '\r' && text[i + 1] === '\n') i++;
            row.push(field); rows.push(row); row = []; field = '';
        } else field += c;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    return rows;
}

/* ── Renderers ──────────────────────────────────────────── */
function NoPreview({ reason }) {
    return (
        <div className="preview-empty">
            <NoPreviewIcon />
            <p>{reason || 'No preview available for this file type.'}</p>
            <p className="preview-empty-sub">You can still download it below.</p>
        </div>
    );
}

function PreviewBody({ kind, url, bytes, fileName, expanded, onFail }) {
    const ext = extensionOf(fileName);

    const textData = useMemo(
        () => (kind === 'text' || kind === 'csv' ? decodeText(bytes) : null),
        [kind, bytes]
    );

    if (['image', 'video', 'audio', 'pdf'].includes(kind) && !url) {
        return null; // blob URL is being prepared
    }
    if (kind === 'image') {
        return <img className="preview-media" src={url} alt={fileName || 'Shared image'} onError={onFail} />;
    }
    if (kind === 'video') {
        return <video className="preview-media" src={url} controls playsInline preload="metadata" onError={onFail} />;
    }
    if (kind === 'audio') {
        return (
            <div className="preview-audio">
                <audio src={url} controls preload="metadata" onError={onFail} />
            </div>
        );
    }
    if (kind === 'pdf') {
        return <iframe className="preview-pdf" src={url} title={fileName || 'PDF preview'} />;
    }
    if (kind === 'csv' && textData) {
        const rows = parseCsv(textData.text, ext === 'tsv' ? '\t' : ',');
        const [head = [], ...body] = rows;
        const shown = body.slice(0, CSV_PREVIEW_ROWS - 1);
        return (
            <div className="preview-table-wrap">
                <table className="preview-table">
                    <thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
                    <tbody>
                        {shown.map((r, i) => (
                            <tr key={i}>{r.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
                        ))}
                    </tbody>
                </table>
                {(rows.length > CSV_PREVIEW_ROWS || textData.truncated) && (
                    <p className="preview-note">Showing the first {shown.length} rows. Download for the full file.</p>
                )}
            </div>
        );
    }
    if (kind === 'text' && textData) {
        return (
            <div className={`preview-text${expanded ? ' expanded' : ''}`}>
                <pre>{textData.text}</pre>
                {textData.truncated && (
                    <p className="preview-note">Preview cut at {formatBytes(TEXT_PREVIEW_BYTES)}. Download for the full file.</p>
                )}
            </div>
        );
    }
    if (kind === 'text' || kind === 'csv') {
        return <NoPreview reason="This file looks binary, so it can't be shown as text." />;
    }
    return <NoPreview />;
}

/* ── Main component ─────────────────────────────────────── */
export function FilePreview({ bytes, mimeType, fileName }) {
    const [expanded, setExpanded] = useState(false);
    const [failed, setFailed] = useState(false);

    const initialKind = useMemo(() => detectPreviewKind(mimeType, fileName), [mimeType, fileName]);
    const kind = failed ? 'none' : initialKind;

    // One blob: URL per file, created and freed inside the same effect so
    // StrictMode's mount/unmount/mount cycle can't leave us with a revoked URL.
    const [url, setUrl] = useState(null);
    useEffect(() => {
        if (!['image', 'video', 'audio', 'pdf'].includes(initialKind)) { setUrl(null); return; }
        const type = effectiveMime(mimeType, fileName) || 'application/octet-stream';
        const objectUrl = URL.createObjectURL(new Blob([bytes], { type }));
        setUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [bytes, initialKind, mimeType, fileName]);

    // Esc closes the full-screen view.
    useEffect(() => {
        if (!expanded) return;
        const onKey = (e) => { if (e.key === 'Escape') setExpanded(false); };
        window.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [expanded]);

    const canExpand = kind !== 'none' && kind !== 'audio';
    const bodyProps = { kind, url, bytes, fileName, onFail: () => setFailed(true) };

    return (
        <>
            <div className={`content-display file-preview kind-${kind}`}>
                <PreviewBody {...bodyProps} expanded={false} />
                {canExpand && (
                    <div className="preview-actions">
                        {kind === 'pdf' && (
                            <a className="preview-icon-btn" href={url} target="_blank" rel="noopener noreferrer" title="Open in new tab" aria-label="Open PDF in new tab">
                                <OpenIcon />
                            </a>
                        )}
                        <button type="button" className="preview-icon-btn" onClick={() => setExpanded(true)} title="Full screen" aria-label="Open full-screen preview">
                            <ExpandIcon />
                        </button>
                    </div>
                )}
            </div>

            {createPortal(
                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            className="preview-overlay"
                            role="dialog"
                            aria-modal="true"
                            aria-label={`Preview of ${fileName || 'file'}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            onClick={() => setExpanded(false)}
                        >
                            <motion.div
                                className={`preview-modal kind-${kind}`}
                                initial={{ scale: 0.96, y: 10 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.96, y: 10 }}
                                transition={{ duration: 0.2 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="preview-modal-head">
                                    <span className="preview-modal-name" title={fileName}>{fileName || 'Preview'}</span>
                                    <span className="preview-modal-size">{formatBytes(bytes.length)}</span>
                                    <button type="button" className="preview-icon-btn" onClick={() => setExpanded(false)} aria-label="Close preview" autoFocus>
                                        <CloseIcon />
                                    </button>
                                </div>
                                <div className="preview-modal-body">
                                    <PreviewBody {...bodyProps} expanded />
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}
