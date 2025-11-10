// Quick script to clear leaderboard cache
// Run this in browser console or add to your app temporarily

if (typeof window !== 'undefined') {
  // Clear leaderboard cache
  localStorage.removeItem('leaderboardCache_v2_with_timestamps');
  localStorage.removeItem('leaderboardCacheTimestamp_v2');

  // Also clear any other potential cache keys
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes('leaderboard')) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));

  console.log('✅ Cleared all leaderboard cache');
  console.log('🔄 Refresh the page to load fresh data from new contracts');
}
