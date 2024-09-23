const express = require("express");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();

app.use(express.json());
app.use(require("cors")());

const NEYNAR_CLIENT_ID = process.env.NEYNAR_CLIENT_ID;
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

const signers = new Map(); // This will store signer_uuid and associated data

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
