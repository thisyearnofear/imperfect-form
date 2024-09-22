import { kv } from "@vercel/kv";
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { signer_uuid, text, embeds, replyTo } = req.body;

    try {
      const signerData = await kv.get(`signer:${signer_uuid}`);
      if (!signerData) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid signer_uuid" });
      }

      const response = await fetch("https://api.neynar.com/v2/farcaster/cast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          api_key: process.env.NEYNAR_API_KEY,
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

      await kv.set(
        `cast:${signer_uuid}`,
        { status: "completed", result: responseData },
        { ex: 3600 }
      );
      res.status(200).json({ success: true, result: responseData });
    } catch (error) {
      console.error("Error sharing cast:", error);
      await kv.set(
        `cast:${signer_uuid}`,
        { status: "error", error: error.message },
        { ex: 3600 }
      );
      res.status(500).json({ success: false, error: error.message });
    }
  } else {
    res.status(405).end();
  }
}
