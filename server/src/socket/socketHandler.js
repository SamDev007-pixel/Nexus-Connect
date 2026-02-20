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
          socket.emit("room_deleted");
          return;
        }

        socket.join(formattedCode);
        socket.join(`broadcast_${formattedCode}`);

        // 🔥 Track Online Users (Only for real users)
        if (userId) {
          await User.findByIdAndUpdate(userId, {
            isOnline: true,
            socketId: socket.id,
          });
        }

        // ===============================
        // LOAD DATA BASED ON ROLE
        // ===============================

        if (role === "user") {
  const allMessages = await Message.find({
    room: room._id,
  })
    .populate("sender", "username")
    .sort({ createdAt: 1 });

  socket.emit("load_messages", allMessages);
}

        if (role === "admin") {
          const pendingMessages = await Message.find({
            room: room._id,
            status: "pending",
          })
            .populate("sender", "username")
            .sort({ createdAt: 1 });

          socket.emit("load_pending_messages", pendingMessages);
        }

        if (role === "broadcast") {
          const approvedMessages = await Message.find({
            room: room._id,
            status: "approved",
          })
            .populate("sender", "username")
            .sort({ createdAt: 1 });

          socket.emit("load_broadcast_messages", approvedMessages);
        }

        // 🔥 LIVE USERS UPDATE (for SuperAdmin)
        const activeUsers = await User.find({
          room: room._id,
          status: "approved",
          isOnline: true,
        }).select("username role isOnline");

        socket.emit("superadmin_live_users", activeUsers);

      } catch (error) {
        console.error("Join Room Error:", error.message);
      }
    });

    // =========================================
    // SEND MESSAGE
    // =========================================
    socket.on("send_message", async ({ userId, roomCode, content }) => {
      try {
        if (!content || !content.trim()) return;

        const formattedCode = roomCode.trim().toUpperCase();
        const room = await Room.findOne({ roomCode: formattedCode });
        if (!room) return;

        const message = await Message.create({
          room: room._id,
          sender: userId,
          content: content.trim(),
          status: "pending",
        });

        const populatedMessage = await Message.findById(message._id)
          .populate("sender", "username")
          .populate("room", "roomCode");

        io.to(formattedCode).emit("receive_message", populatedMessage);
        socket.emit("new_pending_message", populatedMessage);

      } catch (error) {
        console.error("Send Message Error:", error.message);
      }
    });

    // =========================================
    // APPROVE MESSAGE
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

    // Send to broadcast
    io.to(`broadcast_${roomCode}`).emit("broadcast_message", message);


  } catch (error) {
    console.error("Approve Message Error:", error.message);
  }
});
    // =========================================
    // DELETE ROOM
    // =========================================
    socket.on("delete_room", async ({ roomCode }) => {
      try {
        const formattedCode = roomCode.trim().toUpperCase();
        const room = await Room.findOne({ roomCode: formattedCode });
        if (!room) return;

        // Get all users in the room before deleting
        const roomUsers = await User.find({ room: room._id });

        // Delete the room
        await Room.deleteOne({ _id: room._id });

        // Notify all users in the room that admin deleted it
        io.to(formattedCode).emit("room_deleted_by_admin", {
          message: "The room has been deleted by the Admin",
        });
        
        io.to(`broadcast_${formattedCode}`).emit("room_deleted_by_admin", {
          message: "The room has been deleted by the Admin",
        });

        // Update all users in the room to offline
        for (const user of roomUsers) {
          user.isOnline = false;
          user.socketId = null;
          await user.save();
        }

      } catch (error) {
        console.error("Delete Room Error:", error.message);
      }
    });

    // =========================================
// APPROVE USER (REAL-TIME)
// =========================================
socket.on("approve_user", async ({ userId, roomCode }) => {
  try {
    if (!userId || !roomCode) return;

    const formattedCode = roomCode.trim().toUpperCase();

    const user = await User.findByIdAndUpdate(
      userId,
      { status: "approved" },
      { new: true }
    );

    if (!user) return;

    // 🔥 Notify that specific user
    io.to(formattedCode).emit("user_approved", user._id);

    // 🔥 Update superadmin live users
    const room = await Room.findOne({ roomCode: formattedCode });

    if (room) {
      const activeUsers = await User.find({
        room: room._id,
        status: "approved",
        isOnline: true,
      }).select("username role isOnline");

      io.to(formattedCode).emit("superadmin_live_users", activeUsers);
    }

    console.log("✅ User approved:", user.username);

  } catch (error) {
    console.error("Approve User Error:", error.message);
  }
});
    // =========================================
    // KICK USER
    // =========================================
    socket.on("kick_user", async ({ userId, roomCode }) => {
      try {
        const user = await User.findById(userId);

        if (!user) {
          console.log("User not found for kick");
          return;
        }

        // Store the user's socket info before updating
        const userSocketId = user.socketId;
        const userRoomCode = user.room ? (await Room.findById(user.room))?.roomCode : null;

        // Update user to offline and remove from room
        user.isOnline = false;
        user.socketId = null;
        await user.save();

        // If user was in a room, notify superadmin of live users update
        if (userRoomCode) {
          const activeUsers = await User.find({
            room: user.room,
            status: "approved",
            isOnline: true,
          }).select("username role isOnline");

          io.to(userRoomCode).emit("superadmin_live_users", activeUsers);
        }

        // Emit to the kicked user's socket if online
        if (userSocketId) {
          io.to(userSocketId).emit("kicked_from_room", {
            message: "You have been removed from the room by the Super Admin",
          });
        }

        console.log(`👢 User kicked: ${user.username}`);

      } catch (error) {
        console.error("Kick User Error:", error.message);
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

          const room = await Room.findById(user.room);

          if (room) {
            const activeUsers = await User.find({
              room: room._id,
              status: "approved",
              isOnline: true,
            }).select("username role isOnline");

            io.to(room.roomCode)
              .emit("superadmin_live_users", activeUsers);
          }
        }

        console.log("🔴 Disconnected:", socket.id);

      } catch (error) {
        console.error("Disconnect Error:", error.message);
      }
    });
  });
};

module.exports = socketHandler;