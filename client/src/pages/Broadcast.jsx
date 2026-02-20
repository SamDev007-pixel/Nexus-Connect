import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5001";

export default function Broadcast() {
  const [roomCode, setRoomCode] = useState("");
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const bottomRef = useRef(null);
  const socketRef = useRef(null);

  // Initialize Socket
  useEffect(() => {
    socketRef.current = io(SERVER_URL);
    return () => socketRef.current.disconnect();
  }, []);

  // Restore Session
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("broadcastSession"));
    if (saved && saved.role === "broadcast") {
      setRoomCode(saved.roomCode);
      setJoined(true);
    }
  }, []);

  // Socket Listeners
  useEffect(() => {
    if (!socketRef.current) return;
    const socket = socketRef.current;

    socket.on("load_broadcast_messages", (msgs) => {
      setMessages(msgs);
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
      alert("Room deleted by Super Admin.");
      window.location.reload();
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

  // Auto refresh every 2 seconds
  useEffect(() => {
    if (!joined || !roomCode) return;

    const interval = setInterval(() => {
      if (socketRef.current) {
        socketRef.current.emit("join_room", {
          roomCode,
          role: "broadcast",
        });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [joined, roomCode]);

  // Auto Scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const joinBroadcast = () => {
    if (!roomCode.trim()) return;

    localStorage.setItem(
      "broadcastSession",
      JSON.stringify({ roomCode, role: "broadcast" })
    );

    setJoined(true);
  };

  const handleLogout = () => {
    if (!window.confirm("Are you sure you want to logout from this broadcast room?"))
      return;

    localStorage.removeItem("broadcastSession");
    setJoined(false);
    setRoomCode("");
    setMessages([]);

    socketRef.current.disconnect();
    socketRef.current = io(SERVER_URL);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "40px",
        fontFamily: "Inter, sans-serif",
        color: "#e5e7eb",
        background: `
          linear-gradient(
            135deg,
            #050507 0%,
            #0b0b12 30%,
            #0f0f18 55%,
            #0b0b12 75%,
            #050507 100%
          )
        `,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1200px",
          height: "90vh",
          borderRadius: "20px",
          background: "rgba(15,15,20,0.9)",
          backdropFilter: "blur(18px)",
          border: "1px solid rgba(255,255,255,0.04)",
          boxShadow: "0 0 40px rgba(0,0,0,0.7)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {!joined ? (
          <div
            style={{
              height: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: "60px",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "500px",
                display: "flex",
                flexDirection: "column",
                gap: "40px",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <h1
                  style={{
                    fontSize: "36px",
                    fontWeight: "600",
                    marginBottom: "10px",
                  }}
                >
                  Live Broadcast
                </h1>

                <p
                  style={{
                    fontSize: "14px",
                    opacity: 0.6,
                  }}
                >
                  Access the live session using your room code
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <input
                  placeholder="ENTER ROOM CODE"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  style={{
                    padding: "16px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "#0f0f15",
                    color: "white",
                    fontSize: "15px",
                    textAlign: "center",
                    letterSpacing: "2px",
                    outline: "none",
                  }}
                />

                <button
                  onClick={joinBroadcast}
                  style={{
                    padding: "14px",
                    borderRadius: "10px",
                    border: "none",
                    background: "#1e1b2e",
                    color: "white",
                    fontWeight: "600",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  ENTER LIVE SESSION
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div
              style={{
                padding: "20px 40px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: "500",
                  color: "#e5e5f0",
                }}
              >
                AWS Cloud Connect
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                <div
                  style={{
                    color: "#8b5cf6",
                    fontWeight: "500",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span
                    style={{
                      width: "7px",
                      height: "7px",
                      borderRadius: "50%",
                      background: "#6d28d9",
                    }}
                  ></span>
                  LIVE
                </div>

                <button
                  onClick={handleLogout}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    background: "#14141c",
                    border: "1px solid rgba(255,255,255,0.05)",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "13px",
                  }}
                >
                  Logout
                </button>
              </div>
            </div>

            <div
              style={{
                height: "1px",
                background: "rgba(255,255,255,0.05)",
                marginBottom: "20px",
              }}
            ></div>

            {/* Message Area */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "40px",
              }}
            >
              {messages.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    opacity: 0.4,
                    fontSize: "16px",
                  }}
                >
                  Waiting for approved messages...
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg._id}
                  style={{
                    marginBottom: "25px",
                    padding: "20px",
                    borderRadius: "14px",
                    background: "#12121a",
                    border: "1px solid rgba(255,255,255,0.05)",
                    boxShadow: "0 8px 20px rgba(0,0,0,0.6)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      opacity: 0.6,
                      marginBottom: "8px",
                    }}
                  >
                    {msg.sender?.username} •{" "}
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </div>

                  <div
                    style={{
                      fontSize: "clamp(18px, 1.5vw, 22px)",
                      fontWeight: "500",
                      lineHeight: "1.6",
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              <div ref={bottomRef}></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}