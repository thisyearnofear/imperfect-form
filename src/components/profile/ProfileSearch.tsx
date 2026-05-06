'use client';

import React, { useState } from 'react';

interface ProfileSearchProps {
  onSearch: (identifier: string) => void;
  loading?: boolean;
  error?: string | null;
}

export const ProfileSearch: React.FC<ProfileSearchProps> = ({
  onSearch,
  loading = false,
  error,
}) => {
  const [searchInput, setSearchInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onSearch(searchInput.trim());
    }
  };

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="profile-instruction text-center">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="ENS, wallet, username, or FID..."
            className="bg-black/40 border border-[primary]/30 rounded px-2 py-1 text-[primary] placeholder:text-[primary] placeholder:font-bold placeholder:text-base focus:border-[primary] focus:outline-none font-mono text-sm"
            style={{ minWidth: '200px' }}
            autoFocus
          />
        </div>
        <div className="profile-instruction text-center">
          <button
            type="submit"
            disabled={!searchInput.trim() || loading}
            className="button-text fun-highlight bg-[primary]/10 hover:bg-[primary]/20 disabled:opacity-50 border border-[primary]/30 rounded px-3 py-1 transition-all duration-200 transform hover:scale-105"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin">⚡</div>
                <span className="animate-pulse">Loading profile...</span>
              </div>
            ) : (
              'Load Profile'
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="profile-instruction">
          <span className="text-red-400 text-sm">⚠️ {error}</span>
        </div>
      )}
    </div>
  );
};
