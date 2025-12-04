import { NextRequest, NextResponse } from 'next/server';
import NotificationManager from '@/lib/notifications';

export async function GET(request: NextRequest, { params }: { params: Promise<{ fid: string }> }) {
  try {
    const { fid: fidStr } = await params;
    const fid = parseInt(fidStr, 10);

    if (isNaN(fid)) {
      return NextResponse.json({ error: 'Invalid FID' }, { status: 400 });
    }

    const miniAppAdded = await NotificationManager.isMiniAppAdded(fid);

    return NextResponse.json({
      fid,
      miniAppAdded,
    });
  } catch (error) {
    console.error('Error checking mini app status:', error);
    return NextResponse.json({ error: 'Failed to check mini app status' }, { status: 500 });
  }
}
