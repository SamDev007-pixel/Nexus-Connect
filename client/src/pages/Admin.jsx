import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5001";

const Admin = () => {
  const [roomCode, setRoomCode] = useState("");
  const [connected, setConnected] = useState(false);
  const [pendingMessages, setPendingMessages] = useState([]);
  const [socket, setSocket] = useState(null);

  // =====================================
  // 🔥 Initialize Socket Once
  // =====================================
  useEffect(() => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, []);

  // =====================================
  // 🔥 Restore Admin Session On Refresh
  // =====================================
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("adminSession"));

    if (saved && saved.role === "admin") {
      setRoomCode(saved.roomCode);
      setConnected(true);
    }
  }, []);

  // =====================================
  // 🔥 Join Room After Restore / Connect
  // =====================================
  useEffect(() => {
    if (!socket || !connected || !roomCode) return;

    socket.emit("join_room", {
      roomCode,
      role: "admin",
    });
  }, [socket, connected, roomCode]);

  // =====================================
  // 🔥 Listen For Pending + Delete Events
  // =====================================
  useEffect(() => {
    if (!socket) return;

    const handleLoad = (msgs) => {
      setPendingMessages(msgs);
    };

    const handleNew = (msg) => {
      setPendingMessages((prev) => {
        const exists = prev.find((m) => m._id === msg._id);
        if (exists) return prev;
        return [...prev, msg];
      });
    };

    const handleDelete = (messageId) => {
      setPendingMessages((prev) =>
        prev.filter((m) => m._id !== messageId)
      );
    };

    socket.on("load_pending_messages", handleLoad);
    socket.on("new_pending_message", handleNew);
    socket.on("message_deleted", handleDelete);

    return () => {
      socket.off("load_pending_messages", handleLoad);
      socket.off("new_pending_message", handleNew);
      socket.off("message_deleted", handleDelete);
    };
  }, [socket]);

  // =====================================
  // 🔥 Connect Room Manually
  // =====================================
  const connectRoom = () => {
    if (!roomCode.trim() || !socket) return;

    setConnected(true);

    localStorage.setItem(
      "adminSession",
      JSON.stringify({
        roomCode,
        role: "admin",
      })
    );
  };

  // =====================================
  // 🔥 Approve Message
  // =====================================
  const approveMessage = (messageId) => {
    if (!socket) return;

    socket.emit("approve_message", { messageId });

    setPendingMessages((prev) =>
      prev.filter((msg) => msg._id !== messageId)
    );
  };

  // =====================================
  // 🔥 Delete Message (Permanent)
  // =====================================
 const deleteMessage = async (messageId) => {
  const confirmDelete = window.confirm(
    "Are you sure you want to permanently delete this message?"
  );

  if (!confirmDelete) return;

  try {
    await axios.delete(
      `${SERVER_URL}/api/messages/delete/${messageId}`
    );

  } catch (error) {
    console.error("Delete failed:", error);
    alert("Failed to delete message.");
  }
};

  // =====================================
  // 🔥 Logout Admin
  // =====================================
  const logout = () => {
    const confirmLogout = window.confirm(
      "Are you sure you want to logout from this admin room?"
    );

    if (!confirmLogout) return;

    localStorage.removeItem("adminSession");
    window.location.reload();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "40px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1100px",
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(15px)",
          borderRadius: "20px",
          padding: "40px",
          boxShadow: "0 0 40px rgba(0,0,0,0.4)",
        }}
      >
        {/* HEADER */}
        <div style={{ marginBottom: "30px" }}>
          <h1 style={{ marginBottom: "8px" }}>
            Admin Message Moderation
          </h1>
          <p style={{ opacity: 0.6 }}>
            Review and moderate messages for live broadcast
          </p>
        </div>

        {/* ROOM CONNECT */}
        {!connected && (
          <div
            style={{
              display: "flex",
              gap: "15px",
              marginBottom: "30px",
            }}
          >
            <input
              placeholder="Enter Room Code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              style={{
                flex: 1,
                padding: "14px",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.05)",
                color: "white",
                fontSize: "15px",
              }}
            />
            <button
              onClick={connectRoom}
              style={{
                padding: "14px 25px",
                borderRadius: "10px",
                background: "linear-gradient(135deg,#7b2cbf,#9d4edd)",
                color: "white",
                border: "none",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Connect
            </button>
          </div>
        )}

        {/* CONNECTED STATE */}
        {connected && (
          <>
            <div
              style={{
                marginBottom: "25px",
                padding: "15px",
                borderRadius: "12px",
                background: "rgba(123,44,191,0.15)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <span style={{ opacity: 0.6 }}>Room:</span>{" "}
                <strong>{roomCode}</strong>
              </div>

              <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
                <div>
                  Pending: <strong>{pendingMessages.length}</strong>
                </div>

                <button
                  onClick={logout}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.15)",
                    border: "none",
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  Logout
                </button>
              </div>
            </div>

            <h3 style={{ marginBottom: "20px" }}>
              Pending Messages
            </h3>

            {pendingMessages.length === 0 && (
              <div
                style={{
                  padding: "40px",
                  textAlign: "center",
                  opacity: 0.5,
                }}
              >
                No pending messages yet...
              </div>
            )}

            {pendingMessages.map((msg) => (
              <div
                key={msg._id}
                style={{
                  padding: "20px",
                  marginBottom: "18px",
                  borderRadius: "14px",
                  background: "rgba(255,255,255,0.07)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "12px",
                      opacity: 0.5,
                      marginBottom: "6px",
                    }}
                  >
                    {msg.sender?.username}
                  </div>

                  <div style={{ fontSize: "17px" }}>
                    {msg.content}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={() => approveMessage(msg._id)}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "8px",
                      background: "#9d4edd",
                      border: "none",
                      color: "white",
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    Approve
                  </button>

                  <button
                    onClick={() => deleteMessage(msg._id)}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "8px",
                      background: "#c1121f",
                      border: "none",
                      color: "white",
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default Admin;
