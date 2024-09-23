const http = require("http");
const socketIo = require("socket.io");
require("dotenv").config();

const server = http.createServer();
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const signers = new Map(); // store signer_uuid and associated data

io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("store-signer", (data) => {
    const { signer_uuid, fid, reps, exerciseMode, formattedTimeSpent } = data;
    signers.set(signer_uuid, { fid, reps, exerciseMode, formattedTimeSpent });
    socket.emit("store-signer-response", {
      success: true,
      message: "Signer data stored successfully",
    });
  });

  socket.on("confirm-cast", async (data) => {
    const { signer_uuid, text, embeds, parent } = data;
    if (!signers.has(signer_uuid)) {
      socket.emit("confirm-cast-response", {
        success: false,
        error: "Invalid signer_uuid",
      });
      return;
    }

    try {
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
          parent,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          `Failed to share cast: ${response.status} ${response.statusText} - ${responseData.message}`
        );
      }

      console.log("Cast shared successfully:", responseData);
      socket.emit("confirm-cast-response", {
        success: true,
        result: responseData,
      });
    } catch (error) {
      console.error("Error sharing cast:", error);
      socket.emit("confirm-cast-response", {
        success: false,
        error: error.message,
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

const PORT = process.env.SOCKET_PORT || 4000;
server.listen(PORT, () => {
  console.log(`Socket.io server is running on port ${PORT}`);
});
