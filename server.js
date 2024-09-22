const express = require("express");
const fetch = require("node-fetch");
const { WebSocketServer } = require("ws");
require("dotenv").config();

const app = express();

app.use(express.json());

const NEYNAR_CLIENT_ID = process.env.NEYNAR_CLIENT_ID;
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

const signers = new Map(); // This will store signer_uuid and associated data

// Start the Express server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Set up WebSocket server
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", async (message) => {
    console.log("Received message:", message.toString());
    let data;
    try {
      data = JSON.parse(message);
    } catch (error) {
      console.error("Error parsing message:", error);
      ws.send(
        JSON.stringify({ success: false, error: "Invalid message format" })
      );
      return;
    }

    if (data.type === "store-signer") {
      const { signer_uuid, fid, reps, exerciseMode, formattedTimeSpent } =
        data.payload;
      signers.set(signer_uuid, { fid, reps, exerciseMode, formattedTimeSpent });
      console.log("Stored signer data:", {
        signer_uuid,
        fid,
        reps,
        exerciseMode,
        formattedTimeSpent,
      });
      ws.send(
        JSON.stringify({
          success: true,
          message: "Signer data stored successfully",
        })
      );
    } else if (data.type === "confirm-cast") {
      const { signer_uuid, text, embeds, replyTo } = data.payload;
      if (!signers.has(signer_uuid)) {
        console.error("Invalid signer_uuid:", signer_uuid);
        ws.send(
          JSON.stringify({ success: false, error: "Invalid signer_uuid" })
        );
        return;
      }

      try {
        console.log("Sending cast to Farcaster API...");
        console.log("Using API Key:", NEYNAR_API_KEY);
        console.log("Using signer_uuid:", signer_uuid);

        const response = await fetch(
          "https://api.neynar.com/v2/farcaster/cast",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              api_key: NEYNAR_API_KEY,
            },
            body: JSON.stringify({
              signer_uuid,
              text,
              embeds,
              parent: replyTo, // Use 'parent' instead of 'replyTo' for the API
            }),
          }
        );

        const responseData = await response.json();
        console.log("Farcaster API response:", responseData);

        if (!response.ok) {
          console.error("Full error response:", responseData);
          throw new Error(
            `Failed to share cast: ${response.status} ${response.statusText} - ${responseData.message}`
          );
        }

        console.log("Cast shared successfully:", responseData);
        ws.send(JSON.stringify({ success: true, result: responseData }));
      } catch (error) {
        console.error("Error sharing cast:", error);
        ws.send(JSON.stringify({ success: false, error: error.message }));
      }
    } else {
      console.error("Unknown message type:", data.type);
      ws.send(
        JSON.stringify({ success: false, error: "Unknown message type" })
      );
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});
