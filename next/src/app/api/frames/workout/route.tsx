import { NextRequest, NextResponse } from "next/server";

/**
 * This API route generates a Farcaster Frame for sharing workout achievements
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Get workout details from query params
  const reps = searchParams.get("reps") || "0";
  const exerciseMode = searchParams.get("exerciseMode") || "squats";
  const timeSpent = searchParams.get("timeSpent") || "0:00";

  // Base URL for the app
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://imperfectform.fun";

  // Image URL for the frame - use static embed image
  const imageUrl = `${baseUrl}/embed.png`;

  // HTML response with frame metadata
  return new NextResponse(
    `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Imperfect Form | ${exerciseMode} Achievement</title>

        <!-- Frame Metadata -->
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${imageUrl}" />
        <meta property="fc:frame:button:1" content="🏆 Share Achievement" />
        <meta property="fc:frame:button:1:action" content="post" />
        <meta property="fc:frame:button:2" content="🏋️ Try It Yourself" />
        <meta property="fc:frame:button:2:action" content="link" />
        <meta property="fc:frame:button:2:target" content="${baseUrl}" />
        <meta property="fc:frame:post_url" content="${baseUrl}/api/frames/workout/share" />
        <meta property="og:image" content="${imageUrl}" />
      </head>
      <body>
        <h1>Imperfect Form Achievement</h1>
        <p>Exercise: ${exerciseMode}</p>
        <p>Reps: ${reps}</p>
        <p>Time: ${timeSpent}</p>
        <p>Share this achievement on Farcaster!</p>
      </body>
    </html>
  `,
    {
      headers: {
        "Content-Type": "text/html",
      },
    }
  );
}
