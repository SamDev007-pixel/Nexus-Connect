import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5001";

const ChatRoom = () => {
  const [username, setUsername] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [status, setStatus] = useState("idle");
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const saved = JSON.parse(sessionStorage.getItem("chatSession"));
    if (saved) {
      setUsername(saved.username);
      setRoomCode(saved.roomCode);
      setUserId(saved.userId);
      setStatus(saved.status);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    const socket = io(SERVER_URL);

    socket.on("user_approved", (approvedUserId) => {
      if (approvedUserId === userId) {
        setStatus("approved");

        const saved = JSON.parse(sessionStorage.getItem("chatSession"));
        if (saved) {
          saved.status = "approved";
          sessionStorage.setItem("chatSession", JSON.stringify(saved));
        }
      }
    });

    return () => socket.disconnect();
  }, [userId]);

  const joinRoom = async () => {
    if (!username.trim() || !roomCode.trim()) return;

    try {
      const res = await axios.post(
        `${SERVER_URL}/api/rooms/join`,
        { username, roomCode }
      );

      const newUserId = res.data.user._id;

      setUserId(newUserId);
      setStatus("pending");

      sessionStorage.setItem(
        "chatSession",
        JSON.stringify({
          username,
          roomCode,
          userId: newUserId,
          status: "pending",
        })
      );
    } catch (err) {
      console.error("Join failed");
    }
  };

  return (
    <div style={pageStyle}>
      {status !== "approved" && (
        <div style={joinCardStyle}>
          <h2 style={{ marginBottom: "20px" }}>Join Chat Room</h2>

          {status === "idle" && (
            <>
              <input
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={inputStyle}
              />
              <input
                placeholder="Room Code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                style={inputStyle}
              />
              <button onClick={joinRoom} style={buttonStyle}>
                Join Room
              </button>
            </>
          )}

          {status === "pending" && (
            <div style={{ opacity: 0.7 }}>
              Waiting for Super Admin approval...
            </div>
          )}
        </div>
      )}

      {status === "approved" && (
        <ChatInterface roomCode={roomCode} userId={userId} />
      )}
    </div>
  );
};

const ChatInterface = ({ roomCode, userId }) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const socketRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(SERVER_URL);

    const socket = socketRef.current;

    socket.emit("join_room", { roomCode, role: "user", userId });

    socket.on("load_messages", (msgs) => {
  setMessages((prev) => {
    const merged = [...msgs];

    prev.forEach((oldMsg) => {
      if (!merged.find((m) => m._id === oldMsg._id)) {
        merged.push(oldMsg);
      }
    });

    return merged.sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
  });
});
    socket.on("receive_message", (msg) => {
  setMessages((prev) => {
    const exists = prev.find((m) => m._id === msg._id);
    if (exists) return prev;
    return [...prev, msg];
  });
});

    socket.on("approved_message", (msg) => {
  setMessages((prev) => {
    const exists = prev.find((m) => m._id === msg._id);
    if (exists) return prev;
    return [...prev, msg];
  });
});

    // Handle kicked from room
    socket.on("kicked_from_room", (data) => {
      alert(data.message);
      sessionStorage.removeItem("chatSession");
      window.location.reload();
    });

    // Handle room deleted by admin
    socket.on("room_deleted_by_admin", (data) => {
      alert(data.message);
      sessionStorage.removeItem("chatSession");
      window.location.reload();
    });

    return () => socket.disconnect();
  }, [roomCode, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!message.trim()) return;

    socketRef.current.emit("send_message", {
      userId,
      roomCode,
      content: message,
    });

    setMessage("");
  };

  return (
    <div style={chatLayoutStyle}>
      {/* Top Bar */}
      <div style={topBarStyle}>
        <span style={{ fontWeight: 600 }}>AWS Cloud Connect</span>
        <span style={{ fontSize: "12px", opacity: 0.6 }}>
          Live Chat
        </span>
      </div>

      {/* Messages */}
      <div style={messagesPanelStyle}>
        {messages.map((msg) => {
          const isOwn =
            String(msg.sender?._id) === String(userId);

          return (
            <div
              key={msg._id}
              style={{
                display: "flex",
                marginBottom: "18px",
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "12px", opacity: 0.6 }}>
                  {msg.sender?.username}
                </div>

                <div
                  style={{
                    marginTop: "4px",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    background: isOwn
                      ? "#360659"
                      : "#1e1e28",
                    color: "#f3f4f6",
                    maxWidth: "65%",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input Dock */}
      <div style={inputDockStyle}>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
          placeholder="Message..."
          style={chatInputStyle}
        />
        <button onClick={sendMessage} style={buttonStyle}>
          Send
        </button>
      </div>
    </div>
  );
};

/* ================= STYLES ================= */

const pageStyle = {
  minHeight: "100vh",
  background: "#0b0b12",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "30px",
  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  color: "#f3f4f6",
};

const joinCardStyle = {
  width: "350px",
  padding: "30px",
  background: "#151520",
  borderRadius: "10px",
  display: "flex",
  flexDirection: "column",
  gap: "15px",
};

const chatLayoutStyle = {
  width: "95%",
  maxWidth: "1500px",
  height: "92vh",
  background: "#12121a",
  borderRadius: "10px",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  border: "1px solid #1f1f2e",
};

const topBarStyle = {
  padding: "16px 20px",
  borderBottom: "1px solid #1f1f2e",
  display: "flex",
  justifyContent: "space-between",
  background: "#161622",
};

const messagesPanelStyle = {
  flex: 1,
  padding: "20px",
  overflowY: "auto",
  background: "#0f0f16",
};

const inputDockStyle = {
  padding: "15px",
  borderTop: "1px solid #1f1f2e",
  display: "flex",
  gap: "10px",
  background: "#161622",
};

const inputStyle = {
  padding: "10px",
  borderRadius: "6px",
  border: "1px solid #2a2a3a",
  background: "#1a1a26",
  color: "white",
};

const chatInputStyle = {
  flex: 1,
  padding: "10px",
  borderRadius: "6px",
  border: "1px solid #2a2a3a",
  background: "#1a1a26",
  color: "white",
};

const buttonStyle = {
  padding: "10px 16px",
  borderRadius: "6px",
  border: "none",
  background: "#6a0dad",
  color: "white",
  cursor: "pointer",
};

export default ChatRoom;
