const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
  },

  role: {
    type: String,
    enum: ["superadmin", "admin", "user"],
    default: "user",
  },

  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
  },

  status: {
    type: String,
    enum: ["pending", "approved"],
    default: "pending",
  },

  isOnline: {
    type: Boolean,
    default: false,
  },

  socketId: {
    type: String,
    default: null,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("User", userSchema);
