const express = require("express");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();

app.use(express.json());

const NEYNAR_CLIENT_ID = process.env.NEYNAR_CLIENT_ID;
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

// Temporary storage for the duration of a single request
let tempStorage = {};

app.post("/api/store-signer", (req, res) => {
  const { signer_uuid, fid, reps, exerciseMode, formattedTimeSpent } = req.body;
  tempStorage = { signer_uuid, fid, reps, exerciseMode, formattedTimeSpent };
  console.log("Stored signer data:", tempStorage);
  res.json({
    success: true,
    message: "Signer data stored successfully",
  });
});

app.post("/api/confirm-cast", async (req, res) => {
  const { signer_uuid, text, embeds, replyTo } = req.body;

  if (signer_uuid !== tempStorage.signer_uuid) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid signer_uuid" });
  }

  try {
    console.log("Sending cast to Farcaster API...");
    console.log("Using API Key:", NEYNAR_API_KEY);
    console.log("Using signer_uuid:", signer_uuid);

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
        parent: replyTo,
      }),
    });

    const responseData = await response.json();
    console.log("Farcaster API response:", responseData);

    if (!response.ok) {
      console.error("Full error response:", responseData);
      throw new Error(
        `Failed to share cast: ${response.status} ${response.statusText} - ${responseData.message}`
      );
    }

    console.log("Cast shared successfully:", responseData);
    res.json({ success: true, result: responseData });
  } catch (error) {
    console.error("Error sharing cast:", error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    // Clear the temporary storage after the cast is sent
    tempStorage = {};
  }
});

// For Vercel, we export the app instead of starting a server
module.exports = app;
