const fetch = require("node-fetch");
const { tempStorage } = require("../utils/tempStorage");

module.exports = async (req, res) => {
  if (req.method === "POST") {
    const { signer_uuid, text, embeds, replyTo } = req.body;
    const storedData = tempStorage.get();

    if (!storedData || signer_uuid !== storedData.signer_uuid) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid signer_uuid" });
    }

    try {
      const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
      console.log("Sending cast to Farcaster API...");
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
      tempStorage.clear();
    }
  } else {
    res.status(405).json({ success: false, error: "Method not allowed" });
  }
};
