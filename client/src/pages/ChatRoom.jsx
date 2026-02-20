import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";

// Get server URL from env or use production fallback
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "https://aws-cloud-connect-server.onrender.com";

const ChatRoom = () => {
  const [username, setUsername] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [status, setStatus] = useState("idle");
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const socketRef = useRef(null);

  // Initialize socket
  useEffect(() => {
    socketRef.current = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current.on("connect", () => {
      console.log("Connected to server");
    });

    socketRef.current.on("connect_error", (err) => {
      console.error("Connection error:", err);
      setError("Cannot connect to server. Please check your connection.");
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Restore session
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem("chatSession"));
      if (saved) {
        setUsername(saved.username || "");
        setRoomCode(saved.roomCode || "");
        setUserId(saved.userId || null);
        setStatus(saved.status || "idle");
      }
    } catch (e) {
      console.error("Session parse error:", e);
    }
  }, []);

  // Approval listener
  useEffect(() => {
    if (!socketRef.current || !userId) return;

    socketRef.current.on("user_approved", (approvedUserId) => {
      console.log("User approved event received:", approvedUserId);
      if (String(approvedUserId) === String(userId)) {
        setStatus("approved");

        try {
          const saved = JSON.parse(sessionStorage.getItem("chatSession"));
          if (saved) {
            saved.status = "approved";
            sessionStorage.setItem("chatSession", JSON.stringify(saved));
          }
        } catch (e) {
          console.error("Session save error:", e);
        }
      }
    });

    socketRef.current.on("room_not_found", () => {
      setError("Room not found. Please check the room code.");
      sessionStorage.removeItem("chatSession");
      setStatus("idle");
      setUserId(null);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.off("user_approved");
        socketRef.current.off("room_not_found");
      }
    };
  }, [userId]);

  const joinRoom = async () => {
    if (!username.trim() || !roomCode.trim()) {
      setError("Please enter both username and room code");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await axios.post(
        `${SERVER_URL}/api/rooms/join`,
        { username: username.trim(), roomCode: roomCode.trim().toUpperCase() }
      );

      const newUserId = res.data.user._id;

      setUserId(newUserId);
      setStatus("pending");

      sessionStorage.setItem(
        "chatSession",
        JSON.stringify({
          username: username.trim(),
          roomCode: roomCode.trim().toUpperCase(),
          userId: newUserId,
          status: "pending",
        })
      );

      // Join socket room
      if (socketRef.current) {
        socketRef.current.emit("join_room", {
          roomCode: roomCode.trim().toUpperCase(),
          role: "user",
          userId: newUserId,
        });
      }

    } catch (err) {
      console.error("Join failed:", err);
      setError(err.response?.data?.message || "Failed to join room. Please check the room code.");
    } finally {
      setLoading(false);
    }
  };

  const clearSession = () => {
    sessionStorage.removeItem("chatSession");
    setStatus("idle");
    setUserId(null);
    setUsername("");
    setRoomCode("");
    setError("");
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}>Join Chat Room</h1>
          <p style={subtitleStyle}>Enter your details to join the conversation</p>
        </div>

        {error && (
          <div style={errorStyle}>
            {error}
          </div>
        )}

        {status !== "approved" && (
          <div style={cardStyle}>
            {status === "idle" && (
              <>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Username</label>
                  <input
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={inputStyle}
                    disabled={loading}
                  />
                </div>

                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Room Code</label>
                  <input
                    type="text"
                    placeholder="Enter room code"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    style={inputStyle}
                    maxLength={6}
                    disabled={loading}
                  />
                </div>

                <button 
                  onClick={joinRoom} 
                  style={buttonStyle}
                  disabled={loading}
                >
                  {loading ? "Joining..." : "Join Room"}
                </button>
              </>
            )}

            {status === "pending" && (
              <div style={pendingStyle}>
                <div style={spinnerStyle}></div>
                <p style={pendingTextStyle}>Waiting for Super Admin approval...</p>
                <p style={pendingSubTextStyle}>Room: {roomCode}</p>
                <button onClick={clearSession} style={secondaryButtonStyle}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {status === "approved" && (
          <ChatInterface
            roomCode={roomCode}
            userId={userId}
            socket={socketRef.current}
            onLogout={clearSession}
          />
        )}
      </div>
    </div>
  );
};

const ChatInterface = ({ roomCode, userId, socket, onLogout }) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    // Join room
    socket.emit("join_room", { roomCode, role: "user", userId });

    // Load messages
    socket.on("load_messages", (msgs) => {
      console.log("Loaded messages:", msgs.length);
      setMessages(msgs || []);
    });

    // Receive new message
    socket.on("receive_message", (msg) => {
      console.log("Received message:", msg);
      setMessages((prev) => {
        if (prev.find((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    });

    // Handle kick
    socket.on("kicked_from_room", (data) => {
      alert(data.message || "You were removed from the room");
      onLogout();
    });

    // Handle room deletion
    socket.on("room_deleted", () => {
      alert("Room has been deleted by Super Admin");
      onLogout();
    });

    return () => {
      socket.off("load_messages");
      socket.off("receive_message");
      socket.off("kicked_from_room");
      socket.off("room_deleted");
    };
  }, [socket, roomCode, userId, onLogout]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!message.trim() || !socket || sending) return;

    setSending(true);
    socket.emit("send_message", {
      userId,
      roomCode,
      content: message.trim(),
    });

    setMessage("");
    setSending(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={chatContainerStyle}>
      <div style={chatHeaderStyle}>
        <div>
          <span style={chatLabelStyle}>Room:</span>
          <span style={chatRoomCodeStyle}>{roomCode}</span>
        </div>
        <button onClick={onLogout} style={logoutButtonStyle}>
          Leave Room
        </button>
      </div>

      <div style={messagesAreaStyle}>
        {messages.length === 0 ? (
          <div style={emptyMessagesStyle}>
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg._id} 
              style={{
                ...messageStyle,
                alignSelf: msg.sender?._id === userId || msg.sender === userId ? "flex-end" : "flex-start",
              }}
            >
              <div style={messageSenderStyle}>
                {msg.sender?.username || "Unknown"}
              </div>
              <div style={messageContentStyle}>
                {msg.content}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div style={inputAreaStyle}>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          style={chatInputStyle}
          disabled={sending}
        />
        <button onClick={sendMessage} style={sendButtonStyle} disabled={sending || !message.trim()}>
          Send
        </button>
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
  maxWidth: "500px",
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
  transition: "border-color 0.2s",
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
  transition: "background-color 0.2s",
};

const pendingStyle = {
  textAlign: "center",
  padding: "20px 0",
};

const spinnerStyle = {
  width: "40px",
  height: "40px",
  border: "3px solid #3f3f46",
  borderTopColor: "#a78bfa",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
  margin: "0 auto 20px",
};

const pendingTextStyle = {
  fontSize: "16px",
  fontWeight: "500",
  color: "#d8b4fe",
  marginBottom: "8px",
};

const pendingSubTextStyle = {
  fontSize: "14px",
  color: "#71717a",
  marginBottom: "20px",
};

const secondaryButtonStyle = {
  padding: "10px 20px",
  borderRadius: "6px",
  border: "1px solid #3f3f46",
  backgroundColor: "transparent",
  color: "#a1a1aa",
  fontSize: "14px",
  cursor: "pointer",
};

// Chat Interface Styles
const chatContainerStyle = {
  backgroundColor: "#171717",
  border: "1px solid #262626",
  borderRadius: "12px",
  overflow: "hidden",
  height: "70vh",
  display: "flex",
  flexDirection: "column",
};

const chatHeaderStyle = {
  padding: "16px 20px",
  borderBottom: "1px solid #262626",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const chatLabelStyle = {
  color: "#71717a",
  fontSize: "13px",
  marginRight: "8px",
};

const chatRoomCodeStyle = {
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

const emptyMessagesStyle = {
  textAlign: "center",
  color: "#52525b",
  marginTop: "40px",
};

const messageStyle = {
  maxWidth: "80%",
  padding: "12px 16px",
  borderRadius: "12px",
  backgroundColor: "#27272a",
};

const messageSenderStyle = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#a78bfa",
  marginBottom: "4px",
};

const messageContentStyle = {
  fontSize: "14px",
  color: "#fafafa",
  wordBreak: "break-word",
};

const inputAreaStyle = {
  padding: "16px 20px",
  borderTop: "1px solid #262626",
  display: "flex",
  gap: "12px",
};

const chatInputStyle = {
  flex: 1,
  padding: "12px 16px",
  borderRadius: "8px",
  border: "1px solid #3f3f46",
  backgroundColor: "#0a0a0a",
  color: "#fafafa",
  fontSize: "14px",
  outline: "none",
};

const sendButtonStyle = {
  padding: "12px 24px",
  borderRadius: "8px",
  border: "none",
  backgroundColor: "#6d28d9",
  color: "#fafafa",
  fontSize: "14px",
  fontWeight: "600",
  cursor: "pointer",
};

export default ChatRoom;
