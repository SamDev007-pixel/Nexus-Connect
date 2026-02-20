const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
  roomCode: {
    type: String,
    unique: true,
    required: true,
    index: true,
  },

  name: {
    type: String,
    required: true,
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Room", roomSchema);
