import { NextResponse } from 'next/server';

// Farcaster Mini App Manifest
const manifest = {
  accountAssociation: {
    header:
      'eyJmaWQiOjUyNTQsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHg4QjAzQTJDMzY1YzI2MUFlQmU2ODQyMjREQkI2Qzk1OTJhQkNkRkIyIn0',
    payload: 'eyJkb21haW4iOiJpbXBlcmZlY3Rmb3JtLmZ1biJ9',
    signature:
      'MHgyYWI5ZGQ1NTAxMTZlNDU5NGQ1OTQ5YTk3ZGY1YzhjNjRkNmQzZTdkNWQ2YzU3NDFiZDk2YjJkM2M1YTVhNTZmMjRkNmNmYWFmNGI5YzAxODNiOTdkNDJkMTAwM2MzMjhiMDliMmI1YmE5MTA4MjdmYWRhY2ZlMDhmMjM5NGZhMDFi',
  },
  frame: {
    version: '1',
    name: 'Imperfect Form',
    iconUrl: 'https://imperfectform.fun/icon.png',
    homeUrl: 'https://imperfectform.fun',
    splashImageUrl: 'https://imperfectform.fun/splash.png',
    splashBackgroundColor: '#061013',
    webhookUrl: 'https://imperfectform.fun/api/miniapp/webhook',
    subtitle: 'Private camera coaching',
    description:
      'Private camera coaching with game-quality feedback, and a path into physical AI that can show the correction.',
    primaryCategory: 'health-fitness',
    tags: ['fitness', 'workout', 'coaching', 'pose-detection', 'form'],
    heroImageUrl: 'https://imperfectform.fun/og-image.png',
    tagline: 'Move with better form',
    ogTitle: 'Imperfect Form',
    ogDescription: 'Private camera coaching. Game-quality feedback. A path into physical AI.',
    ogImageUrl: 'https://imperfectform.fun/og-image.png',
    requiredChains: ['eip155:42220', 'eip155:137', 'eip155:8453'],
    requiredCapabilities: [
      'wallet.getEthereumProvider',
      'actions.ready',
      'actions.composeCast',
      'actions.addMiniApp',
    ],
  },
  baseBuilder: {
    allowedAddresses: ['0x3D86Ff165D8bEb8594AE05653249116a6d1fF3f1'],
  },
};

export async function GET() {
  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
