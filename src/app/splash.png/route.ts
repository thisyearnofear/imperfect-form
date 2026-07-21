import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(_request: NextRequest) {
  try {
    // Try to serve the actual splash file from public directory
    const splashPath = join(process.cwd(), 'public', 'splash.png');
    const splashBuffer = await readFile(splashPath);

    return new NextResponse(splashBuffer as BodyInit, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (_error) {
    // Fallback: Generate a simple SVG splash icon (200x200)
    const svg = `
      <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#8B5CF6;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#EC4899;stop-opacity:1" />
          </linearGradient>
        </defs>

        <!-- Background -->
        <rect width="200" height="200" fill="url(#grad)" rx="20"/>

        <!-- Fitness icon - dumbbell -->
        <g transform="translate(100, 100)">
          <!-- Dumbbell shape -->
          <rect x="-30" y="-4" width="60" height="8" fill="white" rx="4"/>

          <!-- Left weight -->
          <circle cx="-24" cy="0" r="12" fill="white"/>
          <rect x="-36" y="-8" width="24" height="16" fill="white" rx="4"/>

          <!-- Right weight -->
          <circle cx="24" cy="0" r="12" fill="white"/>
          <rect x="12" y="-8" width="24" height="16" fill="white" rx="4"/>

          <!-- Text -->
          <text x="0" y="30" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="16" font-weight="bold">IF</text>
        </g>
      </svg>
    `;

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  }
}
