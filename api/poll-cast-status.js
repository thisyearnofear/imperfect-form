import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { signer_uuid } = req.query;

    try {
      const castStatus = await kv.get(`cast:${signer_uuid}`);

      if (castStatus) {
        res.status(200).json(castStatus);
      } else {
        res.status(200).json({ status: "pending" });
      }
    } catch (error) {
      console.error("Error polling cast status:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  } else {
    res.status(405).end();
  }
}
