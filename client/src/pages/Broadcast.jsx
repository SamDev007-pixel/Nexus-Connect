import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  ChevronRight,
  LogOut,
  Loader2,
  Activity,
  Monitor,
  Hash
} from "lucide-react";
import { SOCKET_URL } from "../config";
import "../styles/global.css";
import logo from "../assets/logo.png";

const Broadcast = () => {
  const [roomCode, setRoomCode] = useState("");
  const [password, setPassword] = useState("");
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const bottomRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));

    socket.on("load_broadcast_messages", (msgs) => {
      setMessages(msgs || []);
    });

    socket.on("broadcast_message", (msg) => {
      setMessages((prev) => {
        const msgId = msg.id || msg._id;
        if (prev.find((m) => (m.id || m._id) === msgId)) return prev;
        return [...prev, msg];
      });
    });

    socket.on("message_deleted", (messageId) => {
      setMessages((prev) => prev.filter((m) => (m.id || m._id) !== messageId));
    });

    socket.on("room_deleted", () => {
      localStorage.removeItem("broadcastSession");
      setJoined(false);
      setRoomCode("");
      setPassword("");
      setMessages([]);
    });

    socket.on("auth_failed", (msg) => {
      setError(msg);
      localStorage.removeItem("broadcastSession");
      setJoined(false);
      setPassword("");
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("load_broadcast_messages");
      socket.off("broadcast_message");
      socket.off("message_deleted");
      socket.off("room_deleted");
      socket.off("auth_failed");
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("broadcastSession"));
      if (saved && saved.role === "broadcast" && saved.roomCode) {
        setRoomCode(saved.roomCode);
        setPassword(saved.password || "");
        setJoined(true);
      }
    } catch (e) {
      console.error("Session parse error:", e);
    }
  }, []);

  useEffect(() => {
    if (!joined || !roomCode || !socketRef.current) return;
    socketRef.current.emit("join_room", { roomCode, role: "broadcast", password });
  }, [joined, roomCode, password]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const joinBroadcast = () => {
    if (!roomCode.trim() || !password.trim()) {
      setError("Credentials Required");
      return;
    }
    const code = roomCode.trim().toUpperCase();
    localStorage.setItem("broadcastSession", JSON.stringify({ roomCode: code, role: "broadcast", password }));
    setRoomCode(code);
    setJoined(true);
  };

  const handleLogout = () => {
    if (!window.confirm("Exit live session?")) return;
    localStorage.removeItem("broadcastSession");
    setJoined(false);
    setRoomCode("");
    setMessages([]);
  };

  const getDisplayTime = (createdAt) => {
    const now = new Date();
    let date;
    if (!createdAt) date = now;
    else if (Array.isArray(createdAt)) {
      date = new Date(createdAt[0], createdAt[1] - 1, createdAt[2], createdAt[3], createdAt[4]);
    } else {
      date = new Date(createdAt);
    }

    if (isNaN(date.getTime())) date = now;

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    const isToday = date.toDateString() === now.toDateString();

    // Check if it was yesterday
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return timeStr;
    if (isYesterday) return `Yesterday at ${timeStr}`;
    return `${date.toLocaleDateString()} at ${timeStr}`;
  };

  return (
    <div className="broadcast-root">
      <div className="bg-mesh" />

      <header className={`auth-header ${!joined ? 'centered' : 'hidden'}`}>
        <div className="brand">
          <div className="brand-box">
            <img src={logo} alt="Nexus Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div className="brand-text">
            <h1>NEXUS BROADCAST</h1>
            <p>Real-time Intelligence Hub</p>
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {!joined ? (
          <motion.div
            key="auth"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="setup-center"
          >
            <div className="glass-card setup-card">
              <h2>Sign In</h2>
              <p>Synchronize with the live project feed</p>

              <div className="auth-form">
                {error && <div className="error-pill">{error}</div>}

                <div className="input-group">
                  <label>Room Code</label>
                  <input
                    placeholder="XXXXXX"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    maxLength={10}
                  />
                </div>

                <div className="input-group">
                  <label>Access Key</label>
                  <input
                    type="password"
                    placeholder="Security Key"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <button className="btn-vibrant-connect" onClick={joinBroadcast}>
                  Connect Hub <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="feed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="feed-screen"
          >
            {/* Premium Project Brand Header */}
            <header className="broadcast-header">
              <div className="header-brand">
                <div className="brand-icon">
                  <img src={logo} alt="Nexus Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div className="brand-text">
                  <h1>Broadcast Terminal</h1>
                  <p>Real-time Intelligence Hub</p>
                </div>
              </div>

              <div className="header-actions">
                <div className="live-badge">
                  <div className={`status-orb ${isConnected ? 'online' : 'offline'}`} />
                  <span>{isConnected ? 'LIVE' : 'OFFLINE'}</span>
                </div>

                <div className="room-meta">
                  <Hash size={14} />
                  <span>{roomCode}</span>
                </div>

                <button className="btn-exit" onClick={handleLogout}>
                  <LogOut size={18} />
                </button>
              </div>
            </header>

            <main className="broadcast-stage">
              <div className="message-pipeline">
                <AnimatePresence initial={false}>
                  {messages.length === 0 ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="empty-log"
                    >
                      <Loader2 size={32} className="spin-slow" />
                      <p className="main-status">SYNCHRONIZING SECURE FEED...</p>
                      <p className="sub-status">Awaiting authorized data broadcast</p>
                    </motion.div>
                  ) : (
                    <div className="chat-scroller">
                      {messages.map((msg, idx) => (
                        <motion.div
                          key={msg.id || msg._id || idx}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="chat-item"
                        >
                          <div className="sender-avatar">
                            {(msg.sender?.username || msg.senderUsername || "U")[0].toUpperCase()}
                          </div>
                          <div className="chat-content-wrap">
                            <div className="chat-meta">
                              <span className="chat-username">{msg.sender?.username || msg.senderUsername || "User"}</span>
                              <span className="chat-time">{getDisplayTime(msg.createdAt)}</span>
                            </div>
                            <div className="chat-body">
                              {msg.content}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                      <div ref={bottomRef} className="scroller-end" />
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        /* --- Global Reset --- */
        .broadcast-root {
          width: 100vw; 
          height: 100vh;
          background: #050508;
          color: white;
          font-family: 'Inter', sans-serif;
          overflow: hidden;
          position: relative;
          display: flex;
          flex-direction: column;
        }

        .bg-mesh {
          position: fixed;
          inset: 0;
          background: radial-gradient(circle at 50% -20%, rgba(139, 92, 246, 0.08) 0%, transparent 60%);
          z-index: 0;
        }

        .auth-header.centered {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin-bottom: 32px;
          padding-top: 40px;
          transition: all 0.5s ease;
          z-index: 20;
        }

        .auth-header.hidden { display: none; }

        .brand {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 8px;
        }

        .brand-box {
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brand-text h1 {
          font-family: 'Outfit', sans-serif;
          font-size: 26px;
          font-weight: 800;
          color: white;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .brand-text p {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 3px;
          color: #a78bfa;
          font-weight: 700;
          margin: 4px 0 0 0;
        }

        /* --- Login Card --- */
        .setup-center {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 20;
          margin-top: -40px;
        }

        .setup-card {
          background: rgba(12, 12, 18, 0.4);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 40px; 
          border-radius: 28px;
          width: 100%; 
          max-width: 420px;
          box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.8);
          text-align: center;
        }

        .setup-card h2 {
          font-family: 'Outfit', sans-serif;
          font-size: 24px;
          font-weight: 700;
          color: white;
          margin-bottom: 8px;
        }

        .setup-card p {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 24px;
        }

        .error-pill {
          background: rgba(239, 68, 68, 0.08); 
          color: #f87171;
          padding: 10px 16px; 
          border-radius: 12px; 
          font-size: 13px;
          font-weight: 600;
          border: 1px solid rgba(239, 68, 68, 0.15);
          text-align: center;
          width: 100%;
          box-sizing: border-box;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .input-group { text-align: left; }
        .input-group label { 
          display: block; 
          font-size: 11px; 
          font-weight: 700; 
          color: #a78bfa; 
          text-transform: uppercase; 
          letter-spacing: 1.5px; 
          margin-bottom: 10px; 
          opacity: 0.8;
        }
        .input-group input {
          width: 100%; 
          background: rgba(255, 255, 255, 0.02); 
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 12px 16px; 
          border-radius: 12px; 
          color: white; 
          font-size: 14px; 
          font-family: 'Inter', sans-serif;
          outline: none; 
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .input-group input:focus { 
          border-color: #a78bfa; 
          background: rgba(139, 92, 246, 0.03); 
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.15); 
          transform: translateY(-1px);
        }

        .btn-vibrant-connect {
          width: 100%; 
          padding: 14px; 
          background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
          color: white; 
          border: none;
          border-radius: 12px; 
          font-weight: 700; 
          font-size: 14px; 
          font-family: 'Inter', sans-serif;
          cursor: pointer; 
          transition: all 0.3s ease;
          display: flex; 
          align-items: center; 
          justify-content: center; 
          gap: 10px;
          box-shadow: 0 10px 15px -3px rgba(124, 58, 237, 0.3);
          margin-top: 8px;
        }
        .btn-vibrant-connect:hover { 
          transform: translateY(-2px); 
          box-shadow: 0 20px 25px -5px rgba(124, 58, 237, 0.4); 
          filter: brightness(1.1);
        }
        .btn-vibrant-connect:active { transform: translateY(0); }

        /* --- Broadcast UI --- */
        .feed-screen {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .broadcast-header {
          padding: 20px 48px;
          background: rgba(5, 5, 8, 0.85);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(24px);
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 100;
          flex-shrink: 0;
        }

        .header-brand {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .brand-icon {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brand-text h1 {
          font-family: 'Outfit', sans-serif;
          font-size: 19px;
          font-weight: 700;
          color: white;
          line-height: 1.1;
          margin: 0;
        }

        .brand-text p {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #64748b;
          font-weight: 800;
          margin: 4px 0 0 0;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .live-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.03);
          padding: 8px 16px;
          border-radius: 100px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          height: 36px;
        }

        .status-orb {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .status-orb.online { background: #a78bfa; box-shadow: 0 0 12px rgba(167, 139, 250, 0.4); animation: pulse-violet 2s infinite; }
        .status-orb.offline { background: #475569; }

        @keyframes pulse-violet {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }

        .live-badge span {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.8px;
          color: #94a3b8;
        }

        .room-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #a78bfa;
          font-family: 'Outfit', sans-serif;
          font-size: 15px;
          font-weight: 700;
          background: rgba(139, 92, 246, 0.05);
          padding: 8px 14px;
          border-radius: 10px;
          border: 1px solid rgba(139, 92, 246, 0.1);
          height: 36px;
        }

        .btn-exit {
          width: 38px;
          height: 38px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          color: #64748b;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .btn-exit:hover {
          background: rgba(239, 68, 68, 0.08);
          color: #f87171;
          border-color: rgba(239, 68, 68, 0.15);
          transform: translateY(-1px);
        }

        .broadcast-stage {
          flex: 1;
          overflow-y: auto;
          padding: 48px 0;
          z-index: 10;
          position: relative;
          scroll-behavior: smooth;
        }

        .message-pipeline {
          max-width: 860px;
          margin: 0 auto;
          width: 100%;
          padding: 0 48px;
        }

        .empty-log {
          height: 60vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          text-align: center;
        }

        .main-status {
          color: #94a3b8;
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin: 12px 0 0 0;
        }

        .sub-status {
          color: #475569;
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.5px;
        }

        .spin-slow { animation: spin 2.5s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .chat-scroller {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .chat-item {
          display: flex;
          gap: 16px;
          align-items: flex-start;
          position: relative;
        }

        .sender-avatar {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(167, 139, 250, 0.1);
          color: #a78bfa;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 20px;
          border: 1px solid rgba(167, 139, 250, 0.15);
          flex-shrink: 0;
          font-family: 'Outfit', sans-serif;
          margin-top: 4px;
        }

        .chat-content-wrap {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .chat-meta {
          display: flex;
          align-items: baseline;
          gap: 12px;
        }

        .chat-username {
          font-weight: 700;
          font-size: 16px;
          color: #10b981;
          line-height: 1;
        }

        .chat-time {
          font-size: 11px;
          color: #64748b;
          font-weight: 600;
          letter-spacing: 0.2px;
        }

        .chat-body {
          font-size: 16px;
          line-height: 1.6;
          color: #cbd5e1;
          font-weight: 400;
          white-space: pre-wrap;
          word-wrap: break-word;
          max-width: 100%;
        }

        .scroller-end { height: 64px; }

        /* ── Responsive Precision ── */
        @media (max-width: 1024px) {
          .broadcast-header { padding: 20px 32px; }
          .message-pipeline { padding: 0 32px; }
        }

        @media (max-width: 768px) {
          .broadcast-header { padding: 16px 24px; }
          .message-pipeline { padding: 0 24px; }
          .brand-text p { display: none; }
          .live-badge { padding: 6px 12px; }
          .chat-scroller { gap: 24px; }
          .sender-avatar { width: 32px; height: 32px; font-size: 16px; font-weight: 600; margin-top: 2px; }
        }

        @media (max-width: 480px) {
          .broadcast-header { 
            padding: calc(12px + env(safe-area-inset-top)) 16px 12px; 
            background: rgba(5, 5, 8, 0.95);
          }
          .message-pipeline { padding: 0 16px; }
          .header-brand { display: flex; align-items: center; gap: 10px; }
          .brand-icon { width: 36px; height: 36px; border-radius: 8px; flex-shrink: 0; }
          .brand-text h1 { font-size: 15px; letter-spacing: -0.02em; line-height: 1.1; margin: 0; }
          
          .room-meta { display: none; }
          .live-badge { 
            display: flex; gap: 6px; padding: 4px 10px; height: 24px; 
            background: rgba(167, 139, 250, 0.1); border-color: rgba(167, 139, 250, 0.2);
          }
          .live-badge span { display: block; font-size: 9px; letter-spacing: 1px; color: #a78bfa; }
          
          .chat-body { font-size: 15px; }
          .chat-scroller { gap: 24px; }
        }
      `}</style>
    </div>
  );
};

export default Broadcast;
