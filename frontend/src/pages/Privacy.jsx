import React from 'react';
import { Link } from 'react-router-dom';
import { LegalPage } from '../components/LegalPage';

const CONTACT = 'mail.iteshxt@gmail.com';

const sections = [
    {
        id: 'what-we-store',
        title: 'What we store when you share',
        body: (
            <>
                <p>When you share a clip, our database stores:</p>
                <ul>
                    <li>The content itself: your text or link, or the file along with its name, size and type.</li>
                    <li>The 4-digit code, when the clip was created and when it expires.</li>
                    <li>A device fingerprint: a 16-character code made by hashing your IP address, browser name and language setting together. It can’t be turned back into your IP address. We use it to apply rate limits and to know which device is allowed to delete the clip.</li>
                </ul>
                <p>We don’t ask for your name, email or any account details, because there are no accounts.</p>
            </>
        ),
    },
    {
        id: 'how-long',
        title: 'How long we keep it',
        body: (
            <>
                <p>
                    You choose how long a clip stays: 1, 5 or 10 minutes. When that time is up, the clip is deleted
                    from the database together with its fingerprint. Two things make sure of this: the database
                    removes expired clips automatically, and a cleanup job checks for them every minute. If someone
                    tries to open a clip just after it expires, it is deleted at that moment.
                </p>
                <p>We don’t keep backups of clips, so a deleted clip can’t be recovered, by you or by us.</p>
            </>
        ),
    },
    {
        id: 'who-can-see',
        title: 'Who can see your clip',
        body: (
            <>
                <p>
                    Anyone who enters the code before the clip expires can open it. Codes are only 4 digits so they
                    are quick to type, which means they work like a short-lived pickup number, not a password.
                    Please don’t use HiClippy for passwords, keys, ID documents or anything you would not want a
                    stranger to see.
                </p>
                <p>Only the device that shared a clip can delete it early.</p>
            </>
        ),
    },
    {
        id: 'abuse',
        title: 'Rate limits and abuse protection',
        body: (
            <>
                <p>To keep the service fast and stop codes being guessed, each device fingerprint is limited to:</p>
                <ul>
                    <li>5 uploads per minute and 20 uploads per hour.</li>
                    <li>30 wrong codes in 10 minutes. After that, the device has to wait before trying again.</li>
                </ul>
                <p>These counters are kept in the server’s memory only and reset on their own.</p>
            </>
        ),
    },
    {
        id: 'logs',
        title: 'Server logs',
        body: (
            <p>
                Our server writes short operational logs, for example that clip 4821 was created as text and is 120
                bytes, or that a lookup failed. Logs never include what you shared. They are kept by our hosting
                provider for a limited time to help us fix problems.
            </p>
        ),
    },
    {
        id: 'your-browser',
        title: 'What we save in your browser',
        body: (
            <>
                <p>HiClippy itself sets no cookies. It saves two small things in your browser’s local storage:</p>
                <ul>
                    <li>Your most recent share (its code, name, type and expiry time), so the clipboard page can show it to you. It clears itself when the clip expires.</li>
                    <li>A note that you have visited before, so going to hiclippy.online takes you straight to the clipboard next time.</li>
                </ul>
                <p>You can clear both at any time by clearing this site’s data in your browser.</p>
            </>
        ),
    },
    {
        id: 'ads',
        title: 'Advertising',
        body: (
            <p>
                HiClippy is free and is supported by ads from Google AdSense. Google and its partners may use cookies
                to show ads and measure how they perform, based on your visits to this and other sites. You can
                learn how Google uses this data in{' '}
                <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">Google’s advertising policy</a>,
                and turn off personalised ads in{' '}
                <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">Google’s ad settings</a>.
            </p>
        ),
    },
    {
        id: 'providers',
        title: 'Services we use',
        body: (
            <>
                <p>HiClippy runs on these providers, which process data on our behalf:</p>
                <ul>
                    <li><strong>Vercel</strong> hosts the website.</li>
                    <li><strong>Render</strong> runs the server that stores and serves clips.</li>
                    <li><strong>MongoDB Atlas</strong> hosts the database.</li>
                    <li><strong>Google Fonts</strong> serves the typeface, so your browser requests it from Google.</li>
                </ul>
                <p>We don’t sell or share your data with anyone else.</p>
            </>
        ),
    },
    {
        id: 'changes',
        title: 'Changes and contact',
        body: (
            <p>
                If we change how HiClippy handles data, we will update this page and the date at the top. Questions
                about privacy? Email <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. See also the{' '}
                <Link to="/terms">terms of service</Link>.
            </p>
        ),
    },
];

export default function Privacy() {
    return (
        <LegalPage
            title="Privacy policy"
            intro="What HiClippy stores, for how long, and who can see it. Written to match how the service actually works."
            updated="25 November 2026"
            summary={[
                'No accounts: we never ask for your name or email.',
                'Clips are deleted for good when their timer runs out, after 1, 5 or 10 minutes.',
                'Anyone with the code can open a clip until then, so don’t share secrets.',
                'Google AdSense may use cookies to show ads.',
            ]}
            sections={sections}
        />
    );
}
