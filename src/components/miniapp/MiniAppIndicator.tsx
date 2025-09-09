'use client';

// All Mini App indicators are hidden as users don't need to see them

export function MiniAppIndicator() {
  // Always return null - users don't need to see "Farcaster Mini App" header
  // This component is kept for backward compatibility but hidden from users
  return null;
}

// Compact version for header/nav use - hidden as users don't need to see this
export function CompactMiniAppIndicator() {
  // Always return null - users don't need to see "Mini App" indicator
  return null;
}

// Banner version for subtle display - hidden as users don't need to see this
export function MiniAppBanner() {
  // Always return null - users don't need to see "Farcaster Mini App" banner
  return null;
}
