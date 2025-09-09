import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint to batch resolve multiple wallet addresses to Farcaster profiles
 * More efficient for leaderboards with many addresses
 */
export async function POST(req: NextRequest) {
  try {
    const { addresses } = await req.json();

    if (!addresses || !Array.isArray(addresses)) {
      return NextResponse.json({ error: 'Addresses array is required' }, { status: 400 });
    }

    if (addresses.length === 0) {
      return NextResponse.json({ profiles: {} });
    }

    if (addresses.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 addresses per batch' }, { status: 400 });
    }

    if (!process.env.NEYNAR_API_KEY) {
      console.error('NEYNAR_API_KEY not configured');
      return NextResponse.json({ error: 'Neynar API not configured' }, { status: 500 });
    }

    // Join addresses for the API call
    const addressesParam = addresses.join(',');

    // Call Neynar API to resolve addresses to Farcaster users
    const neynarResponse = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${addressesParam}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'x-api-key': process.env.NEYNAR_API_KEY,
        },
      }
    );

    if (!neynarResponse.ok) {
      const errorText = await neynarResponse.text();
      console.error('Neynar batch API error:', neynarResponse.status, errorText);

      return NextResponse.json(
        { error: 'Failed to resolve addresses' },
        { status: neynarResponse.status }
      );
    }

    const neynarData = await neynarResponse.json();

    // Process the results into a clean format
    const profiles: Record<string, unknown> = {};

    addresses.forEach((address) => {
      // Neynar returns addresses in lowercase, so we need to check both cases
      const lowercaseAddress = address.toLowerCase();
      const userData = neynarData[lowercaseAddress];

      if (userData && Array.isArray(userData) && userData.length > 0) {
        const user = userData[0]; // Take the first user if multiple

        profiles[address] = {
          fid: user.fid,
          username: user.username,
          display_name: user.display_name,
          pfp_url: user.pfp_url,
          profile: user.profile,
          follower_count: user.follower_count,
          following_count: user.following_count,
          verified_addresses: user.verified_addresses,
        };
      } else {
        // No profile found for this address
        profiles[address] = null;
      }
    });

    return NextResponse.json({ profiles });
  } catch (error) {
    console.error('Error batch resolving Farcaster addresses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
