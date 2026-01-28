import { NextRequest, NextResponse } from 'next/server';

const MEMORY_API_BASE = 'https://api.memoryproto.co';

export async function POST(request: NextRequest) {
  const apiKey = process.env.MEMORY_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'Memory API not configured' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { endpoint, method = 'GET', data } = body;

    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400 });
    }

    // Validate endpoint to prevent SSRF
    if (!endpoint.startsWith('/')) {
      return NextResponse.json({ error: 'Invalid endpoint format' }, { status: 400 });
    }

    const url = `${MEMORY_API_BASE}${endpoint}`;

    const fetchOptions: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      fetchOptions.body = JSON.stringify(data);
    }

    const response = await fetch(url, fetchOptions);
    const responseData = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        {
          error: responseData?.error || `Memory API error: ${response.status}`,
          status: response.status,
        },
        { status: response.status }
      );
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Memory API proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Use POST method with endpoint in body' }, { status: 405 });
}
