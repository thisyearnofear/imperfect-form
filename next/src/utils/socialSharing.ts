/**
 * Generates a Twitter share URL
 * @param text The text to share
 * @param url The URL to share (optional)
 * @param hashtags Array of hashtags without the # symbol (optional)
 * @returns The Twitter share URL
 */
export function getTwitterShareUrl(
  text: string,
  url?: string,
  hashtags?: string[]
): string {
  const params = new URLSearchParams();
  params.append('text', text);
  
  if (url) {
    params.append('url', url);
  }
  
  if (hashtags && hashtags.length > 0) {
    params.append('hashtags', hashtags.join(','));
  }
  
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

/**
 * Generates a Farcaster share URL (opens Warpcast)
 * @param text The text to share
 * @param url The URL to share (optional)
 * @returns The Farcaster share URL
 */
export function getFarcasterShareUrl(text: string, url?: string): string {
  const params = new URLSearchParams();
  const fullText = url ? `${text} ${url}` : text;
  params.append('text', fullText);
  
  return `https://warpcast.com/~/compose?${params.toString()}`;
}

/**
 * Generates a Lens share URL
 * @param text The text to share
 * @param url The URL to share (optional)
 * @returns The Lens share URL
 */
export function getLensShareUrl(text: string, url?: string): string {
  const params = new URLSearchParams();
  const fullText = url ? `${text} ${url}` : text;
  params.append('text', fullText);
  
  return `https://hey.xyz/?${params.toString()}`;
}

/**
 * Opens a share URL in a new window
 * @param url The URL to open
 */
export function openShareWindow(url: string): void {
  window.open(url, '_blank', 'width=550,height=420');
}
