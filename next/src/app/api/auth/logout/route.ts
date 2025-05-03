import { NextRequest, NextResponse } from 'next/server';

/**
 * This endpoint is used by ThirdWeb to log out the user
 */
export async function POST(req: NextRequest) {
  try {
    // In a real app, you would invalidate the user's session/token here
    // For now, we'll just return a success response
    
    return NextResponse.json({ error: null }, { status: 200 });
  } catch (error) {
    console.error('Auth logout error:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
