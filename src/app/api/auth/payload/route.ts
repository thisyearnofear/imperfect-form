import { NextRequest, NextResponse } from 'next/server';

/**
 * This endpoint is used by ThirdWeb to generate a payload for wallet authentication
 */
export async function POST(req: NextRequest) {
  try {
    console.log('Auth payload request received');

    let body: unknown;
    try {
      body = await req.json();
    } catch (error) {
      // Fail closed: a payload minted from an unparsed body would be signed by
      // the wallet with an empty address and then authenticate nobody.
      console.warn('Auth payload body could not be parsed:', error);
      return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
    }

    const address = (body as { address?: unknown })?.address;
    if (typeof address !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      console.warn('Auth payload rejected: missing or malformed address');
      return NextResponse.json(
        { error: 'A valid EVM `address` (0x followed by 40 hex characters) is required' },
        { status: 400 }
      );
    }

    // Generate a random nonce
    const nonce = Math.floor(Math.random() * 1000000).toString();

    // Create a payload with the address and nonce
    const payload = {
      address,
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
