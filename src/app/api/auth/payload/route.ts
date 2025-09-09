import { NextRequest, NextResponse } from 'next/server';

/**
 * This endpoint is used by ThirdWeb to generate a payload for wallet authentication
 */
export async function POST(req: NextRequest) {
  try {
    console.log('Auth payload request received');

    let address;

    try {
      const body = await req.json();
      console.log('Auth payload body:', JSON.stringify(body, null, 2));
      address = body.address;
    } catch {
      // Error is intentionally not caught or used
      console.log('Failed to parse request body, using empty address');
      // If we can't parse the body, just use a placeholder
      address = '';
    }

    // Generate a random nonce
    const nonce = Math.floor(Math.random() * 1000000).toString();

    // Create a payload with the address and nonce
    const payload = {
      address: address || '',
      nonce,
      // Add any other data you want to include in the payload
      // This will be signed by the user's wallet
      chainId: 'any', // Allow any chain for authentication
      expirationTime: new Date(Date.now() + 1000 * 60 * 5).toISOString(), // 5 minutes
      statement: 'Please sign this message to authenticate with Onchain Olympics.',
      version: '1',
      aud:
        typeof window !== 'undefined'
          ? window.location.origin
          : 'https://imperfect-form.vercel.app',
    };

    console.log('Generated payload:', JSON.stringify(payload, null, 2));
    return NextResponse.json({ payload }, { status: 200 });
  } catch (error) {
    console.error('Auth payload error:', error);
    return NextResponse.json(
      { error: 'Failed to generate authentication payload' },
      { status: 500 }
    );
  }
}
