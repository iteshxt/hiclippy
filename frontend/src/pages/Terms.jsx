import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FileText, ArrowLeft } from 'lucide-react';

export default function Terms() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div className="success-icon" style={{ background: 'var(--green-pill)', color: 'var(--green)', width: 36, height: 36, borderRadius: '10px', display: 'flex', alignItems: 'center', justify: 'center' }}>
                    <FileText size={18} />
                </div>
                <div>
                    <h2 className="success-title" style={{ fontSize: '20px', fontWeight: 800 }}>Terms of Service</h2>
                    <p className="success-sub" style={{ fontSize: '12px' }}>Simple rules for sharing safely.</p>
                </div>
            </div>

            <div style={{ background: 'var(--input-bg)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '20px', fontSize: '14px', lineHeight: '1.6', color: 'var(--text-900)', marginBottom: '16px' }}>
                <h3 style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--green)' }}>1. Acceptable Use</h3>
                <p style={{ marginBottom: '12px', color: 'var(--text-600)' }}>
                    You agree not to use HiClippy to upload, post, or share any content that is illegal, harmful, threatening, abusive, defamatory, or otherwise objectionable.
                </p>

                <h3 style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--green)' }}>2. Storage Limits & Constraints</h3>
                <p style={{ marginBottom: '12px', color: 'var(--text-600)' }}>
                    All shared clips are subject to a maximum file size limit of 10MB. We reserve the right to block files or content that trigger safety filters or exceed our technical bandwidth limits.
                </p>

                <h3 style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--green)' }}>3. Rate Limiting & Abuse Protection</h3>
                <p style={{ marginBottom: '12px', color: 'var(--text-600)' }}>
                    To prevent spam and keep the service fast for everyone, requests are rate-limited. Attempts to bypass limits or scrape codes will result in temporary or permanent IP/fingerprint bans.
                </p>

                <h3 style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--green)' }}>4. Disclaimer of Warranties</h3>
                <p style={{ color: 'var(--text-600)' }}>
                    HiClippy is provided "as is" without warranties of any kind. We are not responsible for data loss, service interruptions, or unauthorized retrieval of clipboard codes. Do not share highly sensitive credentials or secrets.
                </p>
            </div>

            <Link to="/" className="reset-btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', fontSize: '14px', fontWeight: 600 }}>
                <ArrowLeft size={16} /> Back to Clipboard
            </Link>
        </motion.div>
    );
}
