require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const connectDB = require("./config/db");
const socketHandler = require("./socket/socketHandler");
const roomRoutes = require("./routes/roomRoutes");

connectDB();

const app = express();
const server = http.createServer(app);

// ================================
// 🔥 CORS CONFIG (IMPORTANT)
// ================================
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json());
app.use("/api/rooms", roomRoutes);

// ================================
// 🔥 SOCKET.IO SETUP
// ================================
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.set("io", io);

// Attach your main socket handler
socketHandler(io);

// ================================
// 🔥 MESSAGE ROUTES
// ================================
const messageRoutes = require("./routes/messageRoutes");
app.use("/api/messages", messageRoutes(io));

// ================================
// 🔥 HEALTH CHECK ROUTE
// ================================
app.get("/", (req, res) => {
  res.send("AWS Cloud Connect Backend Running 🚀");
});

// ================================
// 🔥 START SERVER
// ================================
const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`🟣 Server running on port ${PORT}`);
});