const User = require("../models/User");
const Room = require("../models/Room");
const Message = require("../models/Message");

const socketHandler = (io) => {
  io.on("connection", (socket) => {
    console.log("🟢 Connected:", socket.id);

    // =========================================
    // JOIN ROOM
    // =========================================
    socket.on("join_room", async ({ roomCode, role, userId }) => {
      try {
        if (!roomCode) return;

        const formattedCode = roomCode.trim().toUpperCase();
        const room = await Room.findOne({ roomCode: formattedCode });

        if (!room) {
          socket.emit("room_not_found");
          return;
        }

        socket.join(formattedCode);
        socket.join(`room_${formattedCode}`);

        // Track user online status
        if (userId) {
          await User.findByIdAndUpdate(userId, {
            isOnline: true,
            socketId: socket.id,
          });
        }

        // USER - Load messages
        if (role === "user") {
          const messages = await Message.find({ room: room._id })
            .populate("sender", "username")
            .sort({ createdAt: 1 });

          socket.emit("load_messages", messages);
        }

        // ADMIN - Load pending messages
        if (role === "admin") {
          const pending = await Message.find({
            room: room._id,
            status: "pending",
          })
            .populate("sender", "username")
            .sort({ createdAt: 1 });

          socket.emit("load_pending_messages", pending);
        }

        // BROADCAST - Load approved messages
        if (role === "broadcast") {
          socket.join(`broadcast_${formattedCode}`);

          const approved = await Message.find({
            room: room._id,
            status: "approved",
          })
            .populate("sender", "username")
            .sort({ createdAt: 1 });

          socket.emit("load_broadcast_messages", approved);
        }

        // SUPERADMIN - Live users
        if (role === "superadmin") {
          const liveUsers = await User.find({
            room: room._id,
            status: "approved",
            isOnline: true,
          }).select("username role isOnline");

          io.to(`room_${formattedCode}`).emit("superadmin_live_users", liveUsers);
        }
      } catch (err) {
        console.error("Join Room Error:", err.message);
      }
    });

    // =========================================
    // SEND MESSAGE
    // =========================================
    socket.on("send_message", async ({ userId, roomCode, content }) => {
      try {
        if (!content?.trim()) return;

        const formattedCode = roomCode.trim().toUpperCase();
        const room = await Room.findOne({ roomCode: formattedCode });
        if (!room) return;

        const message = await Message.create({
          room: room._id,
          sender: userId,
          content: content.trim(),
          status: "pending",
        });

        const populated = await Message.findById(message._id)
          .populate("sender", "username")
          .populate("room", "roomCode");

        // Send to all users in the room
        io.to(`room_${formattedCode}`).emit("receive_message", populated);

        // Send to admins only (pending messages)
        io.to(`room_${formattedCode}`).emit("new_pending_message", populated);

      } catch (err) {
        console.error("Send Message Error:", err.message);
      }
    });

    // =========================================
    // APPROVE MESSAGE (Broadcast Only)
    // =========================================
    socket.on("approve_message", async ({ messageId }) => {
      try {
        const message = await Message.findByIdAndUpdate(
          messageId,
          { status: "approved" },
          { new: true }
        )
          .populate("sender", "username")
          .populate("room", "roomCode");

        if (!message) return;

        const roomCode = message.room.roomCode;

        io.to(`broadcast_${roomCode}`).emit("broadcast_message", message);

      } catch (err) {
        console.error("Approve Message Error:", err.message);
      }
    });

    // =========================================
    // APPROVE USER (HTTP API + Socket fallback)
    // =========================================
    socket.on("approve_user", async ({ userId, roomCode }) => {
      try {
        const user = await User.findByIdAndUpdate(
          userId,
          { status: "approved" },
          { new: true }
        );

        if (!user) return;

        console.log("✅ User approved via socket:", user.username);

        // Try to emit to specific user via socket ID
        if (user.socketId) {
          io.to(user.socketId).emit("user_approved", userId);
        }

        // Also emit to the room in case user reconnected
        if (roomCode) {
          const formattedCode = roomCode.trim().toUpperCase();
          io.to(`room_${formattedCode}`).emit("user_approved", userId);
        }

      } catch (err) {
        console.error("Approve User Error:", err.message);
      }
    });

    // =========================================
    // KICK USER
    // =========================================
    socket.on("kick_user", async ({ userId, roomCode }) => {
      try {
        const user = await User.findById(userId);
        if (!user) return;

        if (user.socketId) {
          io.to(user.socketId).emit("kicked_from_room", {
            message: "You were removed by Super Admin",
          });
        }

        user.isOnline = false;
        user.socketId = null;
        await user.save();

        console.log("👢 User kicked:", user.username);

      } catch (err) {
        console.error("Kick User Error:", err.message);
      }
    });

    // =========================================
    // DELETE ROOM
    // =========================================
    socket.on("delete_room", async ({ roomCode }) => {
      try {
        if (!roomCode) return;

        const formattedCode = roomCode.trim().toUpperCase();
        const room = await Room.findOne({ roomCode: formattedCode });

        if (!room) return;

        // Delete all users in the room
        await User.deleteMany({ room: room._id });

        // Delete all messages in the room
        await Message.deleteMany({ room: room._id });

        // Delete the room
        await Room.findByIdAndDelete(room._id);

        // Notify all users in the room
        io.to(`room_${formattedCode}`).emit("room_deleted");

        console.log("🗑️ Room deleted:", formattedCode);

      } catch (err) {
        console.error("Delete Room Error:", err.message);
      }
    });

    // =========================================
    // DISCONNECT
    // =========================================
    socket.on("disconnect", async () => {
      try {
        const user = await User.findOne({ socketId: socket.id });
        if (user) {
          user.isOnline = false;
          user.socketId = null;
          await user.save();
        }

        console.log("🔴 Disconnected:", socket.id);
      } catch (err) {
        console.error("Disconnect Error:", err.message);
      }
    });
  });
};

module.exports = socketHandler;
