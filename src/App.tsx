import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChaosInput } from './components/ChaosInput';
import { processChaosInput } from './services/geminiService';
import { trackEvent, trackError, trackPageView } from './services/analyticsService';
import type { ActionPayload } from './types';
import { Activity, Cpu } from 'lucide-react';

const ActionDashboard = React.lazy(() => import('./components/ActionDashboard').then(m => ({ default: m.ActionDashboard })));

function App() {
  const [actions, setActions] = useState<ActionPayload[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Track page view on mount (Google Analytics 4)
    trackPageView();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleProcess = useCallback(async (text: string, file: File | null) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsProcessing(true);
    setError(null);
    setStreamingText('⚡ Gemini is thinking...');

    // GA4: Track chaos input submission
    trackEvent('chaos_submitted', {
      has_image: file !== null,
      text_length: text.length,
    });

    try {
      const payload = await processChaosInput(
        text,
        file,
        abortControllerRef.current.signal,
        // Streaming callback — updates UI token-by-token
        (partial) => setStreamingText(`⚡ Receiving... ${partial.length} chars`)
      );

      setActions(prev => [payload, ...prev]);
      setStreamingText(null);

      // GA4: Track successful action extraction
      trackEvent('action_extracted', {
        category: payload.category,
        severity: payload.severity,
        confidence: Math.round(payload.confidenceScore * 100),
      });
    } catch (err: any) {
      setStreamingText(null);
      if (err.name === 'AbortError') {
        console.log("Previous request aborted.");
      } else {
        const msg = err.message || 'Unknown error';
        setError(msg);
        // GA4: Track Gemini API errors
        trackError(msg, false);
      }
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return (
    <>
      <div className="bg-mesh" aria-hidden="true"></div>

      <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 relative z-10 w-full flex flex-col items-center">
        <header className="text-center mb-16 w-full max-w-4xl">
          <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] mb-8 shadow-[0_0_40px_rgba(0,240,255,0.2)] animate-enter" aria-hidden="true">
            <Activity className="text-gradient" size={48} strokeWidth={2} />
          </div>

          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight mb-6 text-white animate-enter delay-100">
            Universal <span className="text-gradient">Bridge</span>
          </h1>

          <p className="max-w-2xl mx-auto text-xl text-[var(--text-muted)] leading-relaxed animate-enter delay-200 font-light">
            Instantly translating <strong className="text-white font-semibold">human chaos</strong> into strictly structured, life-saving <strong className="text-white font-semibold">system actions.</strong>
          </p>
        </header>

        <main className="w-full max-w-5xl flex flex-col gap-10 pb-24 animate-enter delay-300" role="main">
          {error && (
            <div
              className="w-full max-w-3xl mx-auto p-4 rounded-xl bg-[rgba(255,42,95,0.1)] border border-[rgba(255,42,95,0.3)] text-[var(--status-critical)] text-center font-medium shadow-[0_0_20px_rgba(255,42,95,0.1)]"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </div>
          )}

          {/* Gemini Streaming Indicator */}
          {streamingText && (
            <div
              role="status"
              aria-live="polite"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                color: 'var(--brand-cyan)', fontSize: '0.9rem', fontWeight: 600,
                padding: '0.75rem 1.25rem',
                background: 'rgba(0,240,255,0.06)',
                border: '1px solid rgba(0,240,255,0.2)',
                borderRadius: '0.75rem',
                maxWidth: '48rem',
                margin: '0 auto',
              }}
            >
              <Cpu size={16} aria-hidden="true" style={{ animation: 'spin 1.5s linear infinite' }} />
              {streamingText}
            </div>
          )}

          <ChaosInput onSubmit={handleProcess} isProcessing={isProcessing} />
          <React.Suspense fallback={null}>
            <ActionDashboard actions={actions} />
          </React.Suspense>
        </main>
      </div>
    </>
  );
}

export default App;
