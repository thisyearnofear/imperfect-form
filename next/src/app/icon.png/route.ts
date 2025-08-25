import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(_request: NextRequest) {
  try {
    // Try to serve the actual icon file from public directory
    const iconPath = join(process.cwd(), 'public', 'icon.png');
    const iconBuffer = await readFile(iconPath);

    return new NextResponse(iconBuffer as BodyInit, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_error) {
    // Fallback: Generate a simple SVG icon
    const svg = `
      <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#8B5CF6;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#EC4899;stop-opacity:1" />
          </linearGradient>
        </defs>

        <!-- Background -->
        <rect width="1024" height="1024" fill="url(#grad)"/>

        <!-- Fitness icon - dumbbell -->
        <g transform="translate(512, 512)">
          <!-- Dumbbell shape -->
          <rect x="-150" y="-20" width="300" height="40" fill="white" rx="20"/>

          <!-- Left weight -->
          <circle cx="-120" cy="0" r="60" fill="white"/>
          <rect x="-180" y="-40" width="120" height="80" fill="white" rx="20"/>

          <!-- Right weight -->
          <circle cx="120" cy="0" r="60" fill="white"/>
          <rect x="60" y="-40" width="120" height="80" fill="white" rx="20"/>

          <!-- Text -->
          <text x="0" y="150" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="80" font-weight="bold">IF</text>
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
