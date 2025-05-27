import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const size = parseInt(searchParams.get('size') || '1024');
  
  // Create a simple SVG icon for Imperfect Form
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#8B5CF6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#EC4899;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Background -->
      <rect width="${size}" height="${size}" fill="url(#grad)"/>
      
      <!-- Fitness icon - dumbbell -->
      <g transform="translate(${size/2}, ${size/2})">
        <!-- Dumbbell shape -->
        <rect x="-${size*0.15}" y="-${size*0.02}" width="${size*0.3}" height="${size*0.04}" fill="white" rx="${size*0.02}"/>
        
        <!-- Left weight -->
        <circle cx="-${size*0.12}" cy="0" r="${size*0.06}" fill="white"/>
        <rect x="-${size*0.18}" y="-${size*0.04}" width="${size*0.12}" height="${size*0.08}" fill="white" rx="${size*0.02}"/>
        
        <!-- Right weight -->
        <circle cx="${size*0.12}" cy="0" r="${size*0.06}" fill="white"/>
        <rect x="${size*0.06}" y="-${size*0.04}" width="${size*0.12}" height="${size*0.08}" fill="white" rx="${size*0.02}"/>
        
        <!-- Text -->
        <text x="0" y="${size*0.15}" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="${size*0.08}" font-weight="bold">IF</text>
      </g>
    </svg>
  `;

  // Convert SVG to PNG would require a library like sharp or canvas
  // For now, return the SVG directly
  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000',
    },
  });
}
