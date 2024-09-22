const { tempStorage } = require("../utils/tempStorage");

module.exports = (req, res) => {
  if (req.method === "POST") {
    const { signer_uuid, fid, reps, exerciseMode, formattedTimeSpent } =
      req.body;
    tempStorage.set({
      signer_uuid,
      fid,
      reps,
      exerciseMode,
      formattedTimeSpent,
    });
    console.log("Stored signer data:", tempStorage.get());
    res.json({
      success: true,
      message: "Signer data stored successfully",
    });
  } else {
    res.status(405).json({ success: false, error: "Method not allowed" });
  }
};
