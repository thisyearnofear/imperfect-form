import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint to resolve a wallet address to Farcaster profile using Neynar
 */
export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json();

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    if (!process.env.NEYNAR_API_KEY) {
      console.error('NEYNAR_API_KEY not configured');
      return NextResponse.json(
        { error: 'Neynar API not configured' },
        { status: 500 }
      );
    }

    // Call Neynar API to resolve address to Farcaster user
    const neynarResponse = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'x-api-key': process.env.NEYNAR_API_KEY,
        },
      }
    );

    if (!neynarResponse.ok) {
      if (neynarResponse.status === 404) {
        // Address not found in Farcaster
        return NextResponse.json(
          { profile: null },
          { status: 404 }
        );
      }
      
      const errorText = await neynarResponse.text();
      console.error('Neynar API error:', neynarResponse.status, errorText);
      
      return NextResponse.json(
        { error: 'Failed to resolve address' },
        { status: neynarResponse.status }
      );
    }

    const neynarData = await neynarResponse.json();

    // Check if we found a user for this address (Neynar returns lowercase addresses)
    const lowercaseAddress = address.toLowerCase();
    const userData = neynarData[lowercaseAddress];

    if (userData && Array.isArray(userData) && userData.length > 0) {
      const user = userData[0]; // Take the first user if multiple

      const profile = {
        fid: user.fid,
        username: user.username,
        display_name: user.display_name,
        pfp_url: user.pfp_url,
        profile: user.profile,
        follower_count: user.follower_count,
        following_count: user.following_count,
        verified_addresses: user.verified_addresses,
      };

      return NextResponse.json({ profile });
    }

    // No user found for this address
    return NextResponse.json(
      { profile: null },
      { status: 404 }
    );

  } catch (error) {
    console.error('Error resolving Farcaster address:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
