const express = require("express");
const cors = require("cors");
const { storeSigner, shareCast } = require("./backend/signerManager");
const { HTTP_PORT } = require("./backend/config");

const app = express();

app.use(express.json());
app.use(cors());

app.post("/api/store-signer", (req, res) => {
  try {
    storeSigner(req.body);
    res.json({ success: true, message: "Signer data stored successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/confirm-cast", async (req, res) => {
  try {
    const result = await shareCast({ ...req.body, replyTo: req.body.replyTo });
    res.json({ success: true, result });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
});

app.listen(HTTP_PORT, () => {
  console.log(`Server is running on port ${HTTP_PORT}`);
});
