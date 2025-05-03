require("dotenv").config();

module.exports = {
  NEYNAR_CLIENT_ID: process.env.NEYNAR_CLIENT_ID,
  NEYNAR_API_KEY: process.env.NEYNAR_API_KEY,
  HTTP_PORT: Number(process.env.PORT) || 3000,
  SOCKET_PORT: Number(process.env.SOCKET_PORT) || 4000,
};
