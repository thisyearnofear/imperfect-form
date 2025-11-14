import { NextRequest, NextResponse } from 'next/server';
import NotificationManager from '@/lib/notifications';

interface RouteParams {
  params: {
    fid: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const fid = parseInt(params.fid, 10);

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
