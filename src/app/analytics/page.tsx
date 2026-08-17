'use client';

import React, { useCallback, useEffect, useState } from 'react';
import EngagementDashboard from '@/components/analytics/EngagementDashboard';

/**
 * Operator analytics gate — a real one, not theater.
 *
 * The old gate accepted any non-empty string client-side and the API allowed
 * all comers when ANALYTICS_API_KEY was unset. Now: the access code is
 * validated server-side (timing-safe) against ANALYTICS_API_KEY and exchanged
 * for an httpOnly cookie scoped to /api/analytics. Production without a
 * configured key stays closed and says so.
 */

type Phase = 'checking' | 'locked' | 'open' | 'unconfigured';

export default function AnalyticsPage() {
  const [phase, setPhase] = useState<Phase>('checking');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const probe = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics/engagement');
      if (res.ok) {
        setPhase('open');
        return;
      }
      if (res.status === 401) {
        setPhase('locked');
        return;
      }
      // 503 with source:'none' — production without a configured sink/key.
      setPhase('unconfigured');
    } catch {
      setPhase('unconfigured');
    }
  }, []);

  useEffect(() => {
    void probe();
  }, [probe]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/analytics/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        setCode('');
        await probe();
      } else {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? 'Access denied');
      }
    } catch {
      setError('Could not reach the auth endpoint');
    } finally {
      setSubmitting(false);
    }
  };

  const logout = async () => {
    await fetch('/api/analytics/auth', { method: 'DELETE' }).catch(() => {});
    setPhase('locked');
  };

  if (phase === 'checking') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-gray-400 animate-pulse">Checking analytics access…</p>
      </div>
    );
  }

  if (phase === 'unconfigured') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-gray-900 p-8 rounded-lg border border-gray-700 w-full max-w-md space-y-3">
          <h1 className="text-xl font-bold text-white">Analytics not configured</h1>
          <p className="text-sm text-gray-400">
            The dashboard reads real aggregates from the durable PostHog sink and is gated by an
            access code. Set the following environment variables to enable it:
          </p>
          <ul className="text-xs text-gray-300 space-y-1 font-mono">
            <li>ANALYTICS_API_KEY — dashboard access code</li>
            <li>POSTHOG_API_KEY — event capture (write path)</li>
            <li>POSTHOG_PERSONAL_API_KEY — aggregate queries (read path)</li>
            <li>POSTHOG_PROJECT_ID — optional, skips project lookup</li>
          </ul>
          <p className="text-xs text-gray-500">
            In development the dashboard opens without a code and clearly labels its data as a local
            echo.
          </p>
        </div>
      </div>
    );
  }

  if (phase === 'locked') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-gray-900 p-8 rounded-lg border border-gray-700 w-full max-w-md">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">📊 Analytics Dashboard</h1>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label htmlFor="accessCode" className="block text-sm font-medium text-gray-300 mb-2">
                Access code
              </label>
              <input
                type="password"
                id="accessCode"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter the analytics access code…"
                autoComplete="current-password"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !code}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-md transition-colors"
            >
              {submitting ? 'Checking…' : 'Access Dashboard'}
            </button>
          </form>

          {error && (
            <p role="alert" className="text-xs text-red-400 mt-4 text-center">
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Imperfect Form Analytics</h1>
          <button
            onClick={logout}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            Lock
          </button>
        </div>

        <EngagementDashboard />
      </div>
    </div>
  );
}
