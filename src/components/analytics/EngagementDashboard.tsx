'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { EngagementAnalytics } from '@/lib/engagementTracker';

interface EngagementDashboardProps {
  apiKey?: string;
}

export default function EngagementDashboard({ apiKey }: EngagementDashboardProps) {
  const [analytics, setAnalytics] = useState<EngagementAnalytics | null>(null);
  const [source, setSource] = useState<'posthog' | 'local-echo' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    try {
      setRefreshing(true);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch('/api/analytics/engagement', {
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.status}`);
      }

      const data = await response.json();
      setAnalytics(data.data);
      setSource(data.source ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiKey]);

  useEffect(() => {
    fetchAnalytics();
  }, [apiKey, fetchAnalytics]);

  const exportData = async () => {
    try {
      const headers: Record<string, string> = {};
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch('/api/analytics/export', {
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `engagement-data-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-900 rounded-lg">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-700 rounded"></div>
            <div className="h-3 bg-gray-700 rounded w-5/6"></div>
            <div className="h-3 bg-gray-700 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-900/20 border border-red-500 rounded-lg">
        <h3 className="text-red-400 font-bold mb-2">Error Loading Analytics</h3>
        <p className="text-red-300 text-sm mb-4">{error}</p>
        <button onClick={fetchAnalytics} className="btn-error-cta">
          Retry
        </button>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6 bg-gray-900 rounded-lg">
        <p className="text-gray-400">No analytics data available</p>
      </div>
    );
  }

  // Honest empty state: a configured sink with zero events means exactly that
  // — nothing has been captured yet, not a broken query.
  if (source === 'posthog' && analytics.totalUsers === 0) {
    return (
      <div className="p-6 bg-gray-900 rounded-lg border border-gray-700 space-y-3">
        <h3 className="text-white font-bold">No events captured yet</h3>
        <p className="text-gray-400 text-sm">
          The durable sink is configured and responding — no engagement events have arrived. Events
          flow in as real sessions happen (launch, workout, challenge, share), through the privacy
          allowlist described in <code className="text-gray-300">posthogSink.ts</code>.
        </p>
        <button onClick={fetchAnalytics} disabled={refreshing} className="btn-secondary-cta">
          {refreshing ? 'Checking…' : 'Check again'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">📊 Engagement Analytics</h2>
          <p className="text-xs mt-1">
            {source === 'posthog' ? (
              <span className="text-green-400">Live from the durable PostHog sink</span>
            ) : source === 'local-echo' ? (
              <span className="text-warning">
                Local echo (this server instance only) — configure the durable sink for real data
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={fetchAnalytics}
            disabled={refreshing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded transition-colors"
          >
            {refreshing ? '🔄' : '↻'} Refresh
          </button>
          <button
            onClick={exportData}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-gray-400 text-sm font-medium">Total Users</h3>
          <p className="text-2xl font-bold text-white">{analytics.totalUsers}</p>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-gray-400 text-sm font-medium">Daily Active</h3>
          <p className="text-2xl font-bold text-green-400">{analytics.activeUsers.daily}</p>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-gray-400 text-sm font-medium">Weekly Active</h3>
          <p className="text-2xl font-bold text-blue-400">{analytics.activeUsers.weekly}</p>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-gray-400 text-sm font-medium">Monthly Active</h3>
          <p className="text-2xl font-bold text-purple-400">{analytics.activeUsers.monthly}</p>
        </div>
      </div>

      {/* Engagement Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-bold text-white mb-4">🎯 Engagement</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Avg Sessions/User:</span>
              <span className="text-white font-medium">
                {analytics.engagement.averageSessionsPerUser.toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Avg Workouts/User:</span>
              <span className="text-white font-medium">
                {analytics.engagement.averageWorkoutsPerUser.toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Conversion Rate:</span>
              <span className="text-green-400 font-medium">
                {(analytics.engagement.conversionRate * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-bold text-white mb-4">📱 Mini App</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Added Users:</span>
              <span className="text-green-400 font-medium">{analytics.miniApp.addedUsers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Removed Users:</span>
              <span className="text-red-400 font-medium">{analytics.miniApp.removedUsers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Addition Rate:</span>
              <span className="text-blue-400 font-medium">
                {(analytics.miniApp.additionRate * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Retention & Notifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-bold text-white mb-4">📈 Retention</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Day 1:</span>
              <span className="text-green-400 font-medium">
                {(analytics.retention.day1 * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Day 7:</span>
              <span className="text-brass font-medium">
                {(analytics.retention.day7 * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Day 30:</span>
              <span className="text-red-400 font-medium">
                {(analytics.retention.day30 * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-bold text-white mb-4">🔔 Notifications</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Enabled:</span>
              <span className="text-green-400 font-medium">
                {analytics.notifications.enabledUsers}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Disabled:</span>
              <span className="text-red-400 font-medium">
                {analytics.notifications.disabledUsers}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Enable Rate:</span>
              <span className="text-blue-400 font-medium">
                {(analytics.notifications.enablementRate * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Chains — chain names are dropped by the privacy allowlist at the
          write boundary, so this list stays empty by design. */}
      {analytics.topChains.length > 0 && (
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-bold text-white mb-4">⛓️ Top Chains</h3>
          <div className="space-y-2">
            {analytics.topChains.map((chain, index) => (
              <div key={chain.chain} className="flex justify-between items-center">
                <span className="text-gray-400 capitalize">
                  #{index + 1} {chain.chain}
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-white font-medium">{chain.users} users</span>
                  <span className="text-gray-500 text-sm">({chain.percentage.toFixed(1)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
