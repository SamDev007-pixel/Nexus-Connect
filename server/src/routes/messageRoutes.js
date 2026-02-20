const express = require("express");
const router = express.Router();
const Message = require("../models/Message");

module.exports = (io) => {

  // =========================================
  // DELETE MESSAGE (Permanent)
  // =========================================
  router.delete("/delete/:messageId", async (req, res) => {
    try {
      const { messageId } = req.params;

      const message = await Message.findById(messageId)
        .populate("room", "roomCode");

      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }

      const roomCode = message.room.roomCode;

      // 🔥 Permanently delete from DB
      await Message.deleteOne({ _id: messageId });

      console.log("Message deleted permanently:", messageId);

      // 🔥 Real-time UI updates
      io.to(roomCode).emit("message_deleted", messageId);
      io.to(roomCode).emit("remove_message", messageId);
      io.to(`broadcast_${roomCode}`)
        .emit("remove_broadcast_message", messageId);

      return res.json({ success: true });

    } catch (error) {
      console.error("Delete API Error:", error.message);
      return res.status(500).json({ message: "Server Error" });
    }
  });

  return router;
};
