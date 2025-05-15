import { NextRequest } from "next/server";
import { ImageResponse } from "next/og";

/**
 * This API route generates an image for the Farcaster Frame
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Get workout details from query params
  const reps = searchParams.get("reps") || "0";
  const repCount = parseInt(reps, 10);
  const exerciseMode = searchParams.get("exerciseMode") || "squats";
  
  // Format exercise mode to be properly capitalized and singular/plural
  const formattedExerciseMode = exerciseMode.toLowerCase().startsWith('push') 
    ? repCount === 1 ? 'Pushup' : 'Pushups'
    : repCount === 1 ? 'Squat' : 'Squats';
    
  // Time formatting - ensure it matches the frontend format (seconds)
  const timeSpent = searchParams.get("timeSpent") || "0 seconds";
  const formattedTime = timeSpent.includes(":") 
    ? timeSpent // Already formatted
    : timeSpent.endsWith("s") ? timeSpent : `${timeSpent} seconds`;

  // Generate image
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          backgroundColor: "black",
          color: "white",
          padding: "40px",
          fontFamily: '"Press Start 2P"',
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            border: "4px solid #fcb131",
            borderRadius: "20px",
            padding: "40px",
            width: "90%",
            height: "80%",
          }}
        >
          <h1
            style={{
              fontSize: "32px",
              color: "#fcb131",
              marginBottom: "20px",
              textAlign: "center",
            }}
          >
            Imperfect Form
          </h1>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              marginTop: "20px",
              marginBottom: "20px",
            }}
          >
            <h2
              style={{
                fontSize: "24px",
                color: "#ff69b4",
                marginBottom: "10px",
              }}
            >
              {formattedExerciseMode.toUpperCase()}
            </h2>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginTop: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  margin: "0 30px",
                }}
              >
                <span
                  style={{
                    fontSize: "18px",
                    color: "white",
                  }}
                >
                  REPS
                </span>
                <span
                  style={{
                    fontSize: "48px",
                    color: "#fcb131",
                    fontWeight: "bold",
                  }}
                >
                  {reps}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  margin: "0 30px",
                }}
              >
                <span
                  style={{
                    fontSize: "18px",
                    color: "white",
                  }}
                >
                  TIME
                </span>
                <span
                  style={{
                    fontSize: "48px",
                    color: "#fcb131",
                    fontWeight: "bold",
                  }}
                >
                  {formattedTime}
                </span>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: "30px",
              fontSize: "16px",
              color: "white",
              textAlign: "center",
            }}
          >
            Onchain Olympians
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
