import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { signer_uuid, fid, reps, exerciseMode, formattedTimeSpent } =
      req.body;

    try {
      await kv.set(
        `signer:${signer_uuid}`,
        { fid, reps, exerciseMode, formattedTimeSpent },
        { ex: 3600 }
      ); // expires in 1 hour
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error storing signer data:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  } else {
    res.status(405).end();
  }
}
