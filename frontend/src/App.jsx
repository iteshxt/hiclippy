import React from 'react';
import { MotionConfig } from 'framer-motion';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SiteHeader, DeveloperInfo, usePageMeta, markVisited } from './components/Site';
import Landing from './pages/Landing';
import ToolLayout, { ShareTool } from './pages/ToolLayout';

const Privacy = React.lazy(() => import('./pages/Privacy'));
const Terms = React.lazy(() => import('./pages/Terms'));

export default function App() {
    usePageMeta();
    React.useEffect(markVisited, []);

    return (
        <MotionConfig reducedMotion="user">
            <SiteHeader />
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route element={<ToolLayout />}>
                    <Route path="/share" element={<ShareTool />} />
                </Route>
                <Route path="/privacy" element={<React.Suspense fallback={null}><Privacy /></React.Suspense>} />
                <Route path="/terms" element={<React.Suspense fallback={null}><Terms /></React.Suspense>} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <DeveloperInfo floating />
        </MotionConfig>
    );
}
