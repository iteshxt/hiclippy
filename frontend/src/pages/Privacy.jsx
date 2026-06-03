import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';

export default function Privacy() {
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
                    <Shield size={18} />
                </div>
                <div>
                    <h2 className="success-title" style={{ fontSize: '20px', fontWeight: 800 }}>Privacy Policy</h2>
                    <p className="success-sub" style={{ fontSize: '12px' }}>Your privacy is our highest priority.</p>
                </div>
            </div>

            <div style={{ background: 'var(--input-bg)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '20px', fontSize: '14px', lineHeight: '1.6', color: 'var(--text-900)', marginBottom: '16px' }}>
                <h3 style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--green)' }}>1. Zero Account Friction</h3>
                <p style={{ marginBottom: '12px', color: 'var(--text-600)' }}>
                    HiClippy does not require accounts, usernames, or email addresses. Sharing is completely anonymous.
                </p>

                <h3 style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--green)' }}>2. Temporary Storage & Auto-Destruct</h3>
                <p style={{ marginBottom: '12px', color: 'var(--text-600)' }}>
                    All clipboard content is stored temporarily. Files, text, and images are automatically and permanently deleted from our database after the expiry time you choose (1, 5, or 10 minutes) using database TTL automation.
                </p>

                <h3 style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--green)' }}>3. Browser Fingerprinting</h3>
                <p style={{ marginBottom: '12px', color: 'var(--text-600)' }}>
                    We use a secure, non-personally identifiable hash of your browser details solely to enforce rate limits (to prevent abuse of the file upload infrastructure). We do not track or profile your device.
                </p>

                <h3 style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--green)' }}>4. No Permanent Logging</h3>
                <p style={{ color: 'var(--text-600)' }}>
                    We do not track or log details about what you copy or who retrieves it. Once a paste expires, it is gone forever.
                </p>
            </div>

            <Link to="/" className="reset-btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', fontSize: '14px', fontWeight: 600 }}>
                <ArrowLeft size={16} /> Back to Clipboard
            </Link>
        </motion.div>
    );
}
