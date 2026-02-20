import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "https://aws-cloud-connect-server.onrender.com";

export default function Broadcast() {
  const [roomCode, setRoomCode] = useState("");
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const socketRef = useRef(null);

  // Initialize Socket
  useEffect(() => {
    socketRef.current = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    socketRef.current.on("connect", () => {
      console.log("Broadcast connected");
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Restore Session
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("broadcastSession"));
      if (saved && saved.role === "broadcast" && saved.roomCode) {
        setRoomCode(saved.roomCode);
        setJoined(true);
      }
    } catch (e) {
      console.error("Session parse error:", e);
    }
  }, []);

  // Socket Listeners
  useEffect(() => {
    if (!socketRef.current) return;
    const socket = socketRef.current;

    socket.on("load_broadcast_messages", (msgs) => {
      console.log("Loaded broadcast messages:", msgs?.length || 0);
      setMessages(msgs || []);
    });

    socket.on("broadcast_message", (msg) => {
      setMessages((prev) => {
        const exists = prev.find((m) => m._id === msg._id);
        if (exists) return prev;
        return [...prev, msg];
      });
    });

    socket.on("room_deleted", () => {
      localStorage.removeItem("broadcastSession");
      alert("Room has been deleted by Super Admin.");
      setJoined(false);
      setRoomCode("");
      setMessages([]);
    });

    return () => {
      socket.off("load_broadcast_messages");
      socket.off("broadcast_message");
      socket.off("room_deleted");
    };
  }, []);

  // Join Room
  useEffect(() => {
    if (!joined || !roomCode || !socketRef.current) return;

    socketRef.current.emit("join_room", {
      roomCode,
      role: "broadcast",
    });
  }, [joined, roomCode]);

  // Auto refresh every 3 seconds
  useEffect(() => {
    if (!joined || !roomCode || !socketRef.current) return;

    const interval = setInterval(() => {
      if (socketRef.current) {
        socketRef.current.emit("join_room", {
          roomCode,
          role: "broadcast",
        });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [joined, roomCode]);

  // Auto Scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const joinBroadcast = () => {
    if (!roomCode.trim()) {
      setError("Please enter a room code");
      return;
    }

    setError("");
    const code = roomCode.trim().toUpperCase();
    
    localStorage.setItem(
      "broadcastSession",
      JSON.stringify({ roomCode: code, role: "broadcast" })
    );

    setRoomCode(code);
    setJoined(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("broadcastSession");
    setJoined(false);
    setRoomCode("");
    setMessages([]);
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        {!joined ? (
          <div style={loginCardStyle}>
            <div style={loginHeaderStyle}>
              <h1 style={loginTitleStyle}>Live Broadcast</h1>
              <p style={loginSubtitleStyle}>Enter room code to view live messages</p>
            </div>

            {error && <div style={errorStyle}>{error}</div>}

            <div style={inputGroupStyle}>
              <input
                type="text"
                placeholder="Room Code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                style={inputStyle}
                maxLength={6}
              />
              <button onClick={joinBroadcast} style={buttonStyle}>
                Join Broadcast
              </button>
            </div>
          </div>
        ) : (
          <div style={broadcastCardStyle}>
            <div style={headerStyle}>
              <div style={headerLeftStyle}>
                <span style={liveBadgeStyle}>● LIVE</span>
                <span style={roomCodeStyle}>{roomCode}</span>
              </div>
              <button onClick={handleLogout} style={logoutButtonStyle}>
                Leave
              </button>
            </div>

            <div style={messagesAreaStyle}>
              {messages.length === 0 ? (
                <div style={emptyStyle}>
                  Waiting for approved messages...
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg._id} style={messageCardStyle}>
                    <div style={messageMetaStyle}>
                      <span style={messageSenderStyle}>
                        {msg.sender?.username || "Unknown"}
                      </span>
                      <span style={messageTimeStyle}>
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : ""}
                      </span>
                    </div>
                    <div style={messageContentStyle}>
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef}></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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

const loginCardStyle = {
  backgroundColor: "#171717",
  border: "1px solid #262626",
  borderRadius: "16px",
  padding: "48px",
  textAlign: "center",
};

const loginHeaderStyle = {
  marginBottom: "32px",
};

const loginTitleStyle = {
  fontSize: "28px",
  fontWeight: "600",
  color: "#f5f3ff",
  marginBottom: "8px",
};

const loginSubtitleStyle = {
  fontSize: "14px",
  color: "#71717a",
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

const inputGroupStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const inputStyle = {
  width: "100%",
  padding: "16px",
  borderRadius: "8px",
  border: "1px solid #3f3f46",
  backgroundColor: "#0a0a0a",
  color: "#fafafa",
  fontSize: "16px",
  textAlign: "center",
  letterSpacing: "2px",
  outline: "none",
  boxSizing: "border-box",
};

const buttonStyle = {
  width: "100%",
  padding: "16px",
  borderRadius: "8px",
  border: "none",
  backgroundColor: "#6d28d9",
  color: "#fafafa",
  fontSize: "15px",
  fontWeight: "600",
  cursor: "pointer",
};

const broadcastCardStyle = {
  backgroundColor: "#171717",
  border: "1px solid #262626",
  borderRadius: "16px",
  overflow: "hidden",
  minHeight: "70vh",
  display: "flex",
  flexDirection: "column",
};

const headerStyle = {
  padding: "16px 20px",
  borderBottom: "1px solid #262626",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const headerLeftStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const liveBadgeStyle = {
  color: "#ef4444",
  fontSize: "12px",
  fontWeight: "700",
  letterSpacing: "0.5px",
  animation: "pulse 2s infinite",
};

const roomCodeStyle = {
  color: "#d8b4fe",
  fontSize: "15px",
  fontWeight: "600",
  letterSpacing: "1px",
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

const messagesAreaStyle = {
  flex: 1,
  overflowY: "auto",
  padding: "20px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const emptyStyle = {
  textAlign: "center",
  color: "#52525b",
  marginTop: "40px",
  fontSize: "14px",
};

const messageCardStyle = {
  padding: "16px",
  borderRadius: "8px",
  backgroundColor: "#0a0a0a",
  border: "1px solid #262626",
};

const messageMetaStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "8px",
};

const messageSenderStyle = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#a78bfa",
};

const messageTimeStyle = {
  fontSize: "11px",
  color: "#52525b",
};

const messageContentStyle = {
  fontSize: "15px",
  color: "#fafafa",
  lineHeight: "1.5",
};
