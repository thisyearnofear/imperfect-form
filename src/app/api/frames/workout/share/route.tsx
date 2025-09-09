import { NextRequest, NextResponse } from 'next/server';

/**
 * This API route handles the frame action when a user clicks the share button
 */
export async function POST(req: NextRequest) {
  // Parse the request body (unused but kept for future reference)
  await req.json();

  // Base URL for the app
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://imperfectform.fun';

  // Generate a response with a success message
  return new NextResponse(
    `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Imperfect Form | Achievement Shared</title>

        <!-- Frame Metadata -->
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${baseUrl}/api/frames/workout/success" />
        <meta property="fc:frame:button:1" content="🎮 Play Now" />
        <meta property="fc:frame:button:1:action" content="link" />
        <meta property="fc:frame:button:1:target" content="${baseUrl}" />
      </head>
      <body>
        <h1>Achievement Shared!</h1>
        <p>Thanks for sharing your workout!</p>
      </body>
    </html>
  `,
    {
      headers: {
        'Content-Type': 'text/html',
      },
    }
  );
}
