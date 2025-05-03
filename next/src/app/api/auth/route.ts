import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // This is a simple auth endpoint that always succeeds
    // In a real app, you would validate the payload and perform actual authentication
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Auth endpoint is working' }, { status: 200 });
}
