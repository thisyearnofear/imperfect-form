import { NextRequest, NextResponse } from 'next/server';
import {
  ANALYTICS_COOKIE,
  analyticsAuthCookieValue,
  isAnalyticsAuthConfigured,
  isValidAnalyticsCode,
} from '@/lib/analyticsAuth';

/**
 * POST /api/analytics/auth — exchange the dashboard access code for an
 * httpOnly session cookie. The code is ANALYTICS_API_KEY; the cookie stores
 * only a hash of it. DELETE clears the session.
 */
export async function POST(request: NextRequest) {
  if (!isAnalyticsAuthConfigured()) {
    // Development without a key stays open via the shared authorize helper;
    // here that just means there is no code to exchange.
    return NextResponse.json(
      { success: false, error: 'Analytics access code not configured' },
      { status: 503 }
    );
  }

  let code = '';
  try {
    const body = (await request.json()) as { code?: unknown };
    code = typeof body.code === 'string' ? body.code : '';
  } catch {
    code = '';
  }

  if (!isValidAnalyticsCode(code)) {
    return NextResponse.json({ success: false, error: 'Invalid access code' }, { status: 401 });
  }

  const cookieValue = analyticsAuthCookieValue();
  if (!cookieValue) {
    return NextResponse.json({ success: false, error: 'Not configured' }, { status: 503 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(ANALYTICS_COOKIE, cookieValue, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/analytics',
    maxAge: 60 * 60 * 8, // one operator shift, not a forever cookie
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(ANALYTICS_COOKIE, '', { path: '/api/analytics', maxAge: 0 });
  return response;
}
