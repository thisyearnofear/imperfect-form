const express = require("express");
const fetch = require("node-fetch");
const WebSocket = require("ws");
require("dotenv").config();

const app = express();
const server = require("http").createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());

const NEYNAR_CLIENT_ID = process.env.NEYNAR_CLIENT_ID;
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

const signers = new Map(); // This will store signer_uuid and associated data
const pendingCasts = new Map(); // This will store pending casts for each signer_uuid

app.post("/api/store-signer", (req, res) => {
  const { signer_uuid, fid, reps, exerciseMode, formattedTimeSpent } = req.body;
  signers.set(signer_uuid, { fid, reps, exerciseMode, formattedTimeSpent });
  console.log("Stored signer data:", {
    signer_uuid,
    fid,
    reps,
    exerciseMode,
    formattedTimeSpent,
  });
  res.json({ success: true, message: "Signer data stored successfully" });
});

app.post("/api/confirm-cast", async (req, res) => {
  const { signer_uuid, text, embeds, replyTo } = req.body;
  if (!signers.has(signer_uuid)) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid signer_uuid" });
  }

  try {
    const response = await fetch("https://api.neynar.com/v2/farcaster/cast", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        api_key: NEYNAR_API_KEY,
      },
      body: JSON.stringify({
        signer_uuid,
        text,
        embeds,
        parent: replyTo ? { id: replyTo } : undefined,
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(
        `Failed to share cast: ${response.status} ${response.statusText} - ${responseData.message}`
      );
    }

    console.log("Cast shared successfully:", responseData);
    res.json({ success: true, result: responseData });
  } catch (error) {
    console.error("Error sharing cast:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/poll-cast-status/:signer_uuid", (req, res) => {
  const { signer_uuid } = req.params;
  const castStatus = pendingCasts.get(signer_uuid);

  if (castStatus) {
    pendingCasts.delete(signer_uuid);
    res.json(castStatus);
  } else {
    res.json({ status: "pending" });
  }
});

// WebSocket connection handling
wss.on("connection", (ws) => {
  console.log("WebSocket connection established");

  ws.on("message", (message) => {
    const data = JSON.parse(message);
    if (data.type === "store-signer") {
      const { signer_uuid, fid, reps, exerciseMode, formattedTimeSpent } =
        data.payload;
      signers.set(signer_uuid, { fid, reps, exerciseMode, formattedTimeSpent });
      ws.send(
        JSON.stringify({
          success: true,
          message: "Signer data stored successfully",
        })
      );
    } else if (data.type === "confirm-cast") {
      const { signer_uuid, text, embeds, replyTo } = data.payload;
      if (!signers.has(signer_uuid)) {
        ws.send(
          JSON.stringify({ success: false, error: "Invalid signer_uuid" })
        );
        return;
      }

      fetch("https://api.neynar.com/v2/farcaster/cast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          api_key: NEYNAR_API_KEY,
        },
        body: JSON.stringify({
          signer_uuid,
          text,
          embeds,
          parent: replyTo ? { id: replyTo } : undefined,
        }),
      })
        .then((response) => response.json())
        .then((responseData) => {
          if (!response.ok) {
            throw new Error(
              `Failed to share cast: ${response.status} ${response.statusText} - ${responseData.message}`
            );
          }
          console.log("Cast shared successfully:", responseData);
          ws.send(JSON.stringify({ success: true, result: responseData }));
        })
        .catch((error) => {
          console.error("Error sharing cast:", error);
          ws.send(JSON.stringify({ success: false, error: error.message }));
        });
    }
  });

  ws.on("close", () => {
    console.log("WebSocket connection closed");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
