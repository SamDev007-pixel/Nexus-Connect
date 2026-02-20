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

app.use(cors());
app.use(express.json());
app.use("/api/rooms", roomRoutes);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});
app.set("io", io);
socketHandler(io);
// Temporary basic socket
io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("User Disconnected:", socket.id);
  });
});
// =====================================
// 🔥 Message Routes (Pass io)
// =====================================
const messageRoutes = require("./routes/messageRoutes");
app.use("/api/messages", messageRoutes(io));

app.get("/", (req, res) => {
  res.send("AWS Cloud Connect Backend Running 🚀");
});

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`🟣 Server running on port ${PORT}`);
});
