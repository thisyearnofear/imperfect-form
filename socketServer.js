const http = require("http");
const socketIo = require("socket.io");
const { storeSigner, shareCast } = require("./backend/signerManager");
const { SOCKET_PORT } = require("./backend/config");

const server = http.createServer();
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Signer data is now managed via backend/signerManager

io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("store-signer", (data) => {
    console.log("store-signer event received:", data);
    storeSigner(data);
    socket.emit("store-signer-response", {
      success: true,
      message: "Signer data stored successfully",
    });
  });

  socket.on("confirm-cast", async (data) => {
    console.log("confirm-cast event received:", data);
    try {
      const result = await shareCast({ ...data, replyTo: data.parent });
      socket.emit("confirm-cast-response", {
        success: true,
        result,
      });
    } catch (error) {
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

server.listen(SOCKET_PORT, () => {
  console.log(`Socket.io server is running on port ${SOCKET_PORT}`);
});
