'use client';

import React, { useState } from 'react';
import EngagementDashboard from '@/components/analytics/EngagementDashboard';

export default function AnalyticsPage() {
  const [apiKey, setApiKey] = useState('');
  const [authenticated, setAuthenticated] = useState(false);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple client-side auth - in production, this should be more secure
    if (apiKey || process.env.NODE_ENV === 'development') {
      setAuthenticated(true);
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-gray-900 p-8 rounded-lg border border-gray-700 w-full max-w-md">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">📊 Analytics Dashboard</h1>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-300 mb-2">
                API Key (optional in development)
              </label>
              <input
                type="password"
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter analytics API key..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
            >
              Access Dashboard
            </button>
          </form>

          {process.env.NODE_ENV === 'development' && (
            <p className="text-xs text-gray-500 mt-4 text-center">
              Development mode: API key not required
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
            onClick={() => setAuthenticated(false)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            Logout
          </button>
        </div>

        <EngagementDashboard apiKey={apiKey} />
      </div>
    </div>
  );
}
