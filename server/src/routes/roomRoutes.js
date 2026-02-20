const User = require("../models/User");
const express = require("express");
const router = express.Router();
const Room = require("../models/Room");

// Utility to generate 6-character room code
const generateRoomCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};
// Create Room (Super Admin)
router.post("/create", async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Room name is required" });
    }

    let roomCode;
    let existingRoom;

    // Ensure unique room code
    do {
      roomCode = generateRoomCode();
      existingRoom = await Room.findOne({ roomCode });
    } while (existingRoom);

    const newRoom = await Room.create({
      name,
      roomCode,
    });

    res.status(201).json({
      message: "Room created successfully",
      room: newRoom,
    });
  } catch (error) {
    console.error("Room Creation Error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});
// User Join Request (Pending Approval)
router.post("/join", async (req, res) => {
  try {
    const { username, roomCode } = req.body;

    if (!username || !roomCode) {
      return res.status(400).json({
        message: "Username and Room Code are required",
      });
    }

    const room = await Room.findOne({ roomCode });

    if (!room) {
      return res.status(404).json({
        message: "Room not found",
      });
    }

    const newUser = await User.create({
      username,
      room: room._id,
      status: "pending",
    });

    res.status(201).json({
      message: "Join request sent. Waiting for approval.",
      user: newUser,
    });

  } catch (error) {
    console.error("Join Error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});
// Get Pending Users (Super Admin)
router.get("/:roomCode/pending-users", async (req, res) => {
  try {
    const { roomCode } = req.params;

    const room = await Room.findOne({ roomCode });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const pendingUsers = await User.find({
      room: room._id,
      status: "pending",
    });

    res.json(pendingUsers);
  } catch (error) {
    console.error("Fetch Pending Users Error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});
// Approve User (Super Admin)
router.patch("/approve-user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.status = "approved";
    await user.save();

    // Emit socket event to that user
    const io = req.app.get("io");
    io.emit("user_approved", userId);

    res.json({
      message: "User approved successfully",
      user,
    });

  } catch (error) {
    console.error("Approve User Error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Get All Users (Approved + Pending) - Super Admin
router.get("/:roomCode/all-users", async (req, res) => {
  try {
    const { roomCode } = req.params;

    const room = await Room.findOne({ roomCode });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const allUsers = await User.find({
      room: room._id,
    }).select("username role status isOnline createdAt");

    res.json(allUsers);
  } catch (error) {
    console.error("Fetch All Users Error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
