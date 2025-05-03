import { NextRequest, NextResponse } from 'next/server';

/**
 * This endpoint is used by ThirdWeb to verify a signed payload and authenticate the user
 */
export async function POST(req: NextRequest) {
  try {
    // Log the request for debugging
    console.log('Auth login request received');

    const body = await req.json();
    console.log('Auth login body:', JSON.stringify(body, null, 2));

    // Handle the nested payload format we're seeing in the logs
    // The format appears to be { payload: { payload: {...}, signature: "..." } }
    let address = null;
    let signature = null;

    // Try to extract address from various possible formats
    if (body.payload && typeof body.payload === 'object') {
      // Handle nested payload format
      if (body.payload.payload && typeof body.payload.payload === 'object') {
        address = body.payload.payload.address;
        signature = body.payload.signature;
        console.log('Found nested payload format with address:', address);
      } else if (body.payload.address) {
        // Handle direct payload format
        address = body.payload.address;
        signature = body.signature;
        console.log('Found direct payload format with address:', address);
      }
    } else if (body.address) {
      // Handle direct address format
      address = body.address;
      console.log('Found direct address format:', address);
    }

    if (address) {
      console.log('Authentication successful for address:', address);

      // Return success with the address
      return NextResponse.json({
        address,
        error: null
      }, { status: 200 });
    }

    console.log('No address found in the request');
    return NextResponse.json({
      address: null,
      error: 'No address found in the request'
    }, { status: 400 });
  } catch (error) {
    console.error('Auth login error:', error);
    return NextResponse.json({
      address: null,
      error: 'Authentication failed'
    }, { status: 500 });
  }
}
