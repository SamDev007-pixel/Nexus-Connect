import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "https://aws-cloud-connect-server.onrender.com";

const Admin = () => {
  const [roomCode, setRoomCode] = useState("");
  const [connected, setConnected] = useState(false);
  const [pendingMessages, setPendingMessages] = useState([]);
  const [socket, setSocket] = useState(null);
  const [error, setError] = useState("");

  // Initialize Socket
  useEffect(() => {
    const newSocket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    newSocket.on("connect", () => {
      console.log("Admin connected");
    });

    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, []);

  // Restore Admin Session
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("adminSession"));
      if (saved && saved.role === "admin" && saved.roomCode) {
        setRoomCode(saved.roomCode);
        setConnected(true);
      }
    } catch (e) {
      console.error("Session parse error:", e);
    }
  }, []);

  // Join Room After Restore
  useEffect(() => {
    if (!socket || !connected || !roomCode) return;

    socket.emit("join_room", {
      roomCode,
      role: "admin",
    });
  }, [socket, connected, roomCode]);

  // Socket Listeners
  useEffect(() => {
    if (!socket) return;

    const handleLoad = (msgs) => {
      setPendingMessages(msgs || []);
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

  const connectRoom = () => {
    if (!roomCode.trim() || !socket) return;

    setConnected(true);
    setError("");

    localStorage.setItem(
      "adminSession",
      JSON.stringify({
        roomCode: roomCode.trim().toUpperCase(),
        role: "admin",
      })
    );
  };

  const approveMessage = (messageId) => {
    if (!socket) return;

    socket.emit("approve_message", { messageId });

    setPendingMessages((prev) =>
      prev.filter((msg) => msg._id !== messageId)
    );
  };

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
      setError("Failed to delete message");
    }
  };

  const logout = () => {
    const confirmLogout = window.confirm(
      "Are you sure you want to logout from this admin room?"
    );

    if (!confirmLogout) return;

    localStorage.removeItem("adminSession");
    setConnected(false);
    setRoomCode("");
    setPendingMessages([]);
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}>Admin Panel</h1>
          <p style={subtitleStyle}>Moderate messages for live broadcast</p>
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        {!connected && (
          <div style={cardStyle}>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Room Code</label>
              <input
                type="text"
                placeholder="Enter room code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                style={inputStyle}
                maxLength={6}
              />
            </div>
            <button onClick={connectRoom} style={buttonStyle}>
              Connect
            </button>
          </div>
        )}

        {connected && (
          <>
            <div style={statusCardStyle}>
              <div style={statusRowStyle}>
                <div>
                  <span style={statusLabelStyle}>Room:</span>
                  <span style={statusCodeStyle}>{roomCode}</span>
                </div>
                <div style={statusRightStyle}>
                  <span style={pendingCountStyle}>
                    Pending: <strong>{pendingMessages.length}</strong>
                  </span>
                  <button onClick={logout} style={logoutButtonStyle}>
                    Logout
                  </button>
                </div>
              </div>
            </div>

            <div style={messagesCardStyle}>
              <h3 style={sectionTitleStyle}>Pending Messages</h3>

              {pendingMessages.length === 0 ? (
                <div style={emptyStyle}>
                  No pending messages
                </div>
              ) : (
                pendingMessages.map((msg) => (
                  <div key={msg._id} style={messageRowStyle}>
                    <div style={messageContentStyle}>
                      <div style={senderStyle}>
                        {msg.sender?.username || "Unknown"}
                      </div>
                      <div style={msgContentStyle}>
                        {msg.content}
                      </div>
                    </div>
                    <div style={actionsStyle}>
                      <button
                        onClick={() => approveMessage(msg._id)}
                        style={approveButtonStyle}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => deleteMessage(msg._id)}
                        style={deleteButtonStyle}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Styles
const pageStyle = {
  minHeight: "100vh",
  backgroundColor: "#0a0a0a",
  padding: "40px 20px",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

const containerStyle = {
  maxWidth: "800px",
  margin: "0 auto",
};

const headerStyle = {
  textAlign: "center",
  marginBottom: "32px",
};

const titleStyle = {
  fontSize: "28px",
  fontWeight: "600",
  color: "#d8b4fe",
  marginBottom: "8px",
};

const subtitleStyle = {
  fontSize: "14px",
  color: "#737373",
};

const errorStyle = {
  padding: "12px 16px",
  borderRadius: "8px",
  backgroundColor: "rgba(220, 38, 38, 0.1)",
  border: "1px solid rgba(220, 38, 38, 0.3)",
  color: "#fca5a5",
  fontSize: "14px",
  marginBottom: "20px",
  textAlign: "center",
};

const cardStyle = {
  backgroundColor: "#171717",
  border: "1px solid #262626",
  borderRadius: "12px",
  padding: "28px",
};

const inputGroupStyle = {
  marginBottom: "20px",
};

const labelStyle = {
  display: "block",
  fontSize: "13px",
  fontWeight: "500",
  color: "#a1a1aa",
  marginBottom: "8px",
};

const inputStyle = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: "8px",
  border: "1px solid #3f3f46",
  backgroundColor: "#0a0a0a",
  color: "#fafafa",
  fontSize: "15px",
  outline: "none",
  boxSizing: "border-box",
};

const buttonStyle = {
  width: "100%",
  padding: "14px",
  borderRadius: "8px",
  border: "none",
  backgroundColor: "#6d28d9",
  color: "#fafafa",
  fontSize: "15px",
  fontWeight: "600",
  cursor: "pointer",
};

const statusCardStyle = {
  backgroundColor: "#171717",
  border: "1px solid #262626",
  borderRadius: "12px",
  padding: "16px 20px",
  marginBottom: "16px",
};

const statusRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const statusLabelStyle = {
  color: "#71717a",
  fontSize: "13px",
  marginRight: "8px",
};

const statusCodeStyle = {
  color: "#d8b4fe",
  fontSize: "15px",
  fontWeight: "600",
  letterSpacing: "1px",
};

const statusRightStyle = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
};

const pendingCountStyle = {
  color: "#a1a1aa",
  fontSize: "13px",
};

const logoutButtonStyle = {
  padding: "8px 16px",
  borderRadius: "6px",
  border: "1px solid #3f3f46",
  backgroundColor: "transparent",
  color: "#a1a1aa",
  fontSize: "13px",
  cursor: "pointer",
};

const messagesCardStyle = {
  backgroundColor: "#171717",
  border: "1px solid #262626",
  borderRadius: "12px",
  padding: "20px",
};

const sectionTitleStyle = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#e5e5e5",
  marginBottom: "20px",
  paddingBottom: "12px",
  borderBottom: "1px solid #262626",
};

const emptyStyle = {
  textAlign: "center",
  padding: "40px",
  color: "#52525b",
  fontSize: "14px",
};

const messageRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "16px",
  borderRadius: "8px",
  backgroundColor: "#0a0a0a",
  border: "1px solid #262626",
  marginBottom: "12px",
};

const messageContentStyle = {
  flex: 1,
};

const senderStyle = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#a78bfa",
  marginBottom: "4px",
};

const msgContentStyle = {
  fontSize: "14px",
  color: "#fafafa",
};

const actionsStyle = {
  display: "flex",
  gap: "8px",
  marginLeft: "16px",
};

const approveButtonStyle = {
  padding: "8px 16px",
  borderRadius: "6px",
  border: "none",
  backgroundColor: "#6d28d9",
  color: "#fafafa",
  fontSize: "13px",
  fontWeight: "500",
  cursor: "pointer",
};

const deleteButtonStyle = {
  padding: "8px 16px",
  borderRadius: "6px",
  border: "none",
  backgroundColor: "#dc2626",
  color: "#fafafa",
  fontSize: "13px",
  fontWeight: "500",
  cursor: "pointer",
};

export default Admin;
