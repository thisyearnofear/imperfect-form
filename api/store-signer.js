const { tempStorage } = require("../utils/tempStorage");

module.exports = (req, res) => {
  console.log("Request method:", req.method);
  console.log("Request body:", req.body);

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
    res.status(200).json({
      success: true,
      message: "Signer data stored successfully",
    });
  } else {
    res.status(405).json({ success: false, error: "Method not allowed" });
  }
};
