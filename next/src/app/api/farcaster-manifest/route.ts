import { NextResponse } from 'next/server';

// Farcaster Mini App Manifest
const manifest = {
  // TODO: Add account association after generating it from Warpcast tool
  // "accountAssociation": {
  //   "header": "eyJmaWQiOjEyMzQsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHg....",
  //   "payload": "eyJkb21haW4iOiJpbXBlcmZlY3Rmb3JtLmZ1biJ9",
  //   "signature": "MHg3NmRkOWVlMjE4OGEyMjliNzExZjUzOTkxYTc1NmEzMGZjNTA3NmE5..."
  // },
  "frame": {
    "version": "1",
    "name": "Imperfect Form",
    "iconUrl": "https://imperfectform.fun/icon.png",
    "homeUrl": "https://imperfectform.fun",
    "splashImageUrl": "https://imperfectform.fun/splash.png",
    "splashBackgroundColor": "#000000",
    "webhookUrl": "https://imperfectform.fun/api/miniapp/webhook",
    "subtitle": "Onchain Olympians",
    "description": "Track your fitness with real-time pose detection and compete onchain. Join the movement of decentralized fitness challenges and earn rewards for your workouts.",
    "primaryCategory": "health-fitness",
    "tags": ["fitness", "workout", "onchain", "pose-detection", "competition"],
    "heroImageUrl": "https://imperfectform.fun/api/frames/workout/image?reps=50&exerciseMode=squats&timeSpent=60",
    "tagline": "Onchain Fitness Revolution",
    "ogTitle": "Imperfect Form Fitness",
    "ogDescription": "Track your fitness with real-time pose detection and compete onchain",
    "ogImageUrl": "https://imperfectform.fun/api/frames/workout/image?reps=50&exerciseMode=squats&timeSpent=60",
    "requiredChains": [
      "eip155:42220",
      "eip155:137",
      "eip155:8453"
    ],
    "requiredCapabilities": [
      "wallet.getEthereumProvider",
      "actions.ready",
      "actions.composeCast"
    ]
  }
};

export async function GET() {
  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
