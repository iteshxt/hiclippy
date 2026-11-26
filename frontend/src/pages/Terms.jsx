import React from 'react';
import { Link } from 'react-router-dom';
import { LegalPage } from '../components/LegalPage';

const CONTACT = 'mail.iteshxt@gmail.com';

const sections = [
    {
        id: 'using',
        title: 'Using HiClippy',
        body: (
            <p>
                HiClippy is a free online clipboard for moving text, links, images and files between devices with a
                4-digit code. You don’t need an account. By using it, you agree to these terms. If you don’t agree,
                please don’t use the service.
            </p>
        ),
    },
    {
        id: 'acceptable-use',
        title: 'What you can’t share',
        body: (
            <>
                <p>Don’t use HiClippy to share or do any of the following:</p>
                <ul>
                    <li>Anything illegal where you or the recipient are, including content that infringes someone else’s copyright.</li>
                    <li>Malware, phishing pages or anything designed to harm a device or trick a person.</li>
                    <li>Harassment, threats, or someone else’s personal information without their permission.</li>
                    <li>Sexual content involving minors. We report it.</li>
                </ul>
            </>
        ),
    },
    {
        id: 'fair-use',
        title: 'Fair use of the service',
        body: (
            <>
                <p>To keep HiClippy fast for everyone:</p>
                <ul>
                    <li>Files can be up to 10MB each.</li>
                    <li>Each device can share 5 clips a minute and 20 an hour, and can enter 30 wrong codes in 10 minutes before it has to wait.</li>
                    <li>Don’t try to guess or collect other people’s codes, get around the limits, or overload the service with automated requests.</li>
                </ul>
                <p>We may change these limits to protect the service.</p>
            </>
        ),
    },
    {
        id: 'your-content',
        title: 'Your content',
        body: (
            <p>
                What you share stays yours. You are responsible for it and for who you give the code to. You allow us
                to store and deliver it only for as long as its timer runs, after which it is deleted. See the{' '}
                <Link to="/privacy">privacy policy</Link> for details.
            </p>
        ),
    },
    {
        id: 'codes',
        title: 'Codes are not passwords',
        body: (
            <p>
                Anyone who enters a code before it expires can open that clip. Codes are short on purpose, so they are
                easy to type, not hard to guess. Don’t share passwords, keys, ID documents or other secrets with
                HiClippy.
            </p>
        ),
    },
    {
        id: 'removal',
        title: 'Removing content and blocking',
        body: (
            <p>
                We may delete any clip, or stop a device from using HiClippy, if it breaks these terms or puts the
                service or its users at risk.
            </p>
        ),
    },
    {
        id: 'availability',
        title: 'Availability and liability',
        body: (
            <>
                <p>
                    HiClippy is provided as it is, without warranties of any kind. It may be slow or unavailable at
                    times, and a clip can be lost before its timer runs out. There are no backups, so keep your own
                    copy of anything important.
                </p>
                <p>
                    As far as the law allows, we aren’t liable for any loss that comes from using HiClippy, including
                    lost content or a code being used by someone you didn’t intend.
                </p>
            </>
        ),
    },
    {
        id: 'changes',
        title: 'Changes and contact',
        body: (
            <p>
                We may update these terms. When we do, we will change the date at the top of this page. Questions?
                Email <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
            </p>
        ),
    },
];

export default function Terms() {
    return (
        <LegalPage
            title="Terms of service"
            intro="The rules for using HiClippy, in plain language."
            updated="25 November 2026"
            summary={[
                'HiClippy is free to use, with no account.',
                'Don’t share anything illegal or harmful, and don’t try to guess other people’s codes.',
                'Files can be up to 10MB, and every clip deletes itself when its timer runs out.',
                'The service comes with no guarantees, so keep your own copy of anything important.',
            ]}
            sections={sections}
        />
    );
}
