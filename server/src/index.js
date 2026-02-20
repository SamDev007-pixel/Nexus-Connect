require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const connectDB = require("./config/db");
const socketHandler = require("./socket/socketHandler");
const roomRoutes = require("./routes/roomRoutes");

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// ================================
// CORS CONFIG - Allow all origins for production
// ================================
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
}));

app.use(express.json());

// ================================
// SOCKET.IO SETUP
// ================================
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true,
});

app.set("io", io);

// Attach socket handler
socketHandler(io);

// ================================
// API Routes
// ================================
app.use("/api/rooms", roomRoutes);

// Message Routes
const messageRoutes = require("./routes/messageRoutes");
app.use("/api/messages", messageRoutes(io));

// ================================
// Health Check Route
// ================================
app.get("/", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "AWS Cloud Connect Backend Running",
    timestamp: new Date().toISOString()
  });
});

// ================================
// Start Server
// ================================
const PORT = process.env.PORT || 5001;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
