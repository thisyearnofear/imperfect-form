import { ImageResponse } from "next/og";

/**
 * This API route generates a success image after sharing
 */
export async function GET() {
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
            Achievement Shared!
          </h1>

          <div
            style={{
              fontSize: "24px",
              color: "#ff69b4",
              marginTop: "40px",
              marginBottom: "40px",
              textAlign: "center",
            }}
          >
            Thanks for sharing your workout!
          </div>

          <div
            style={{
              fontSize: "20px",
              color: "white",
              marginTop: "20px",
              textAlign: "center",
            }}
          >
            Try Imperfect Form yourself and join the Onchain Olympians!
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
