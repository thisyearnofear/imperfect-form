const fetch = require("node-fetch");
const { NEYNAR_API_KEY } = require("./config");

const signers = new Map();

function storeSigner({ signer_uuid, fid, reps, exerciseMode, formattedTimeSpent }) {
  signers.set(signer_uuid, { fid, reps, exerciseMode, formattedTimeSpent });
}

async function shareCast({ signer_uuid, text, embeds, replyTo }) {
  if (!signers.has(signer_uuid)) {
    const error = new Error("Invalid signer_uuid");
    error.status = 400;
    throw error;
  }

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

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(
      `Failed to share cast: ${response.status} ${response.statusText} - ${data.message}`
    );
    error.status = response.status;
    throw error;
  }

  return data;
}

module.exports = {
  storeSigner,
  shareCast,
};
