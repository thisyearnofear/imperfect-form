import { kv } from "@vercel/kv";
import { NeynarAPIClient } from "@neynar/nodejs-sdk";

const neynarClient = new NeynarAPIClient(process.env.NEYNAR_API_KEY);

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { signer_uuid, text, embeds, replyTo } = req.body;

    try {
      const signerData = await kv.get(`signer:${signer_uuid}`);
      if (!signerData) {
        return res
          .status(400)
          .json({ success: false, error: "Signer data not found" });
      }

      const cast = await neynarClient.publishCast(
        signer_uuid,
        text,
        embeds,
        replyTo
      );
      res.status(200).json({ success: true, result: cast });
    } catch (error) {
      console.error("Error publishing cast:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  } else {
    res.status(405).end();
  }
}
