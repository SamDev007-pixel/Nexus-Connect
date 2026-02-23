import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  LogOut,
  User as UserIcon,
  Hash,
  Loader2,
  AlertCircle,
  Check,
  Shield
} from "lucide-react";
import { API_URL, SOCKET_URL } from "../config";
import "../styles/global.css";
import logo from "../assets/logo.png";
import { ChevronRight } from "lucide-react";

const ChatRoom = () => {
  const [username, setUsername] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [status, setStatus] = useState("idle");
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem("chatSession"));
      if (saved) {
        setUsername(saved.username || "");
        setRoomCode(saved.roomCode || "");
        setUserId(saved.userId || null);
        setStatus(saved.status || "idle");
      }
    } catch (_e) {
      console.error("Session parse error");
    }
  }, []);

  useEffect(() => {
    if (!socketRef.current || !userId) return;

    socketRef.current.on("user_approved", (approvedUserId) => {
      if (String(approvedUserId) === String(userId)) {
        setStatus("approved");
        const saved = JSON.parse(sessionStorage.getItem("chatSession") || "{}");
        saved.status = "approved";
        sessionStorage.setItem("chatSession", JSON.stringify(saved));
      }
    });

    socketRef.current.on("room_not_found", () => {
      setError("Room not found.");
      sessionStorage.removeItem("chatSession");
      setStatus("idle");
      setUserId(null);
    });

    socketRef.current.on("user_kicked", (kickedUserId) => {
      if (String(kickedUserId) === String(userId)) {
        alert("Session terminated by administrator.");
        clearSession();
      }
    });

    return () => {
      socketRef.current.off("user_approved");
      socketRef.current.off("room_not_found");
      socketRef.current.off("user_kicked");
    };
  }, [userId]);

  const joinRoom = async () => {
    if (!username.trim() || !roomCode.trim()) {
      setError("Please provide both Username and Room Code.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await axios.post(`${API_URL}/api/rooms/join`, {
        username: username.trim(),
        roomCode: roomCode.trim().toUpperCase()
      });

      const newUserId = res.data.user.id || res.data.user._id;
      setUserId(newUserId);
      setStatus("pending");

      sessionStorage.setItem("chatSession", JSON.stringify({
        username: username.trim(),
        roomCode: roomCode.trim().toUpperCase(),
        userId: newUserId,
        status: "pending",
      }));

      if (socketRef.current) {
        socketRef.current.emit("join_room", {
          roomCode: roomCode.trim().toUpperCase(),
          role: "user",
          userId: newUserId,
        });
      }
    } catch (_err) {
      setError(_err.response?.data?.message || "Connection failed.");
    } finally {
      setLoading(false);
    }
  };

  const clearSession = () => {
    if (socketRef.current && userId) {
      socketRef.current.emit("leave_room", { userId, roomCode });
    }
    sessionStorage.removeItem("chatSession");
    setStatus("idle");
    setUserId(null);
    setError("");
  };

  return (
    <div className="chat-root">
      <div className="bg-mesh" />

      <AnimatePresence mode="wait">
        {status !== "approved" ? (
          <div className="auth-viewport">
            {/* Branding Header */}
            <header className="auth-header centered">
              <div className="brand">
                <div className="brand-box">
                  <img src={logo} alt="Nexus Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div className="brand-text">
                  <h1>NEXUS CHAT</h1>
                  <p>Project Communication Hub</p>
                </div>
              </div>
            </header>

            <motion.div
              key="auth"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="setup-center"
            >
              <div className="glass-card setup-card">
                <h2>Sign In</h2>
                <p>Welcome to the project HQ</p>

                {status === "idle" ? (
                  <div className="login-form">
                    {error && <div className="error-message">{error}</div>}
                    <div className="input-group">
                      <label>Username</label>
                      <input
                        placeholder="e.g. Sam_Dev"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={loading}
                      />
                    </div>

                    <div className="input-group">
                      <label>Room Code</label>
                      <input
                        placeholder="XXXXXX"
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                        maxLength={10}
                        disabled={loading}
                      />
                    </div>

                    <button className="btn-vibrant-connect" onClick={joinRoom} disabled={loading}>
                      {loading ? <Loader2 size={18} className="animate-spin" /> : <>Enter Chat <ChevronRight size={18} /></>}
                    </button>
                  </div>
                ) : (
                  <div className="waiting-area">
                    <div className="status-spinner" />
                    <p>Awaiting administrator approval...</p>
                    <button className="secondary-button" onClick={clearSession}>Cancel</button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        ) : (
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="chat-main-viewport"
          >
            <ChatInterface
              roomCode={roomCode}
              userId={userId}
              socket={socketRef.current}
              onLogout={clearSession}
              username={username}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        :root {
          --pro-bg: #050508;
          --pro-surface: #0c0c12;
          --pro-border: rgba(255, 255, 255, 0.08);
          --pro-text: #ffffff;
          --pro-text-muted: #a1a1aa;
          --pro-accent: #7c3aed;
          --pro-accent-hover: #4c1d95;
          --pro-font: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        /* --- Global Reset --- */
        .chat-root {
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

        .auth-viewport {
          max-width: 1080px;
          margin: 0 auto;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          padding: 40px 24px;
          position: relative;
          z-index: 10;
        }

        .chat-main-viewport {
          flex: 1;
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
          z-index: 10;
        }

        /* --- Header Styles --- */
        .auth-header.centered {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin-bottom: 32px;
          transition: all 0.5s ease;
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

        .error-message {
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

        .login-form {
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

        .waiting-area { text-align: center; padding: 20px 0; }
        .status-spinner { width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.05); border-top-color: #a78bfa; border-radius: 50%; margin: 0 auto 24px; animation: rotate 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        @keyframes rotate { to { transform: rotate(360deg); } }
        .waiting-area p { font-size: 16px; margin-bottom: 32px; color: rgba(255, 255, 255, 0.7); font-weight: 500; }
        .secondary-button { background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.6); padding: 12px 24px; border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.2s; }
        .secondary-button:hover { color: white; border-color: rgba(255, 255, 255, 0.2); background: rgba(255, 255, 255, 0.05); }
      `}</style>
    </div>
  );
};

const ChatInterface = ({ roomCode, userId, socket, onLogout, username }) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!socket) return;
    socket.emit("join_room", { roomCode, role: "user", userId });

    socket.on("load_messages", (msgs) => setMessages(msgs || []));
    socket.on("receive_message", (msg) => {
      setMessages((prev) => {
        const msgId = msg.id || msg._id;
        if (prev.find((m) => (m.id || m._id) === msgId)) return prev;
        return [...prev, msg];
      });
    });

    socket.on("user_kicked", (kickedUserId) => {
      if (String(kickedUserId) === String(userId)) onLogout();
    });

    socket.on("room_deleted", () => onLogout());

    return () => {
      socket.off("load_messages");
      socket.off("receive_message");
      socket.off("user_kicked");
      socket.off("room_deleted");
    };
  }, [socket, roomCode, userId, onLogout]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = () => {
    if (!message.trim() || sending) return;
    setSending(true);
    socket.emit("send_message", { userId, roomCode, content: message.trim() });
    setMessage("");
    setSending(false);
  };

  return (
    <div className="chat-container-pro">
      {/* Chrome Style App Bar */}
      <header className="app-bar">
        <div className="bar-left">
          <div className="room-indicator">
            <Hash size={18} />
            <span>{roomCode}</span>
          </div>
          <div className="separator" />
          <div className="user-indicator">
            <UserIcon size={16} />
            <span>{username}</span>
          </div>
        </div>

        <div className="bar-right">
          <button className="exit-button" onClick={() => window.confirm("Leave the chat room?") && onLogout()}>
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Message List Area */}
      <div className="message-scroller" ref={scrollRef}>
        <div className="encryption-banner">
          <Shield size={14} />
          <span>Authorized system transmission established.</span>
        </div>

        <div className="message-list">
          {messages.map((msg, idx) => {
            const isOwn = String(msg.sender?.id || msg.sender) === String(userId);
            const senderName = msg.sender?.username || msg.senderUsername || "User";

            return (
              <div key={msg.id || idx} className={`msg-bubble-wrapper ${isOwn ? 'own' : 'other'}`}>
                <div className="msg-bubble-chrome">
                  {!isOwn && <span className="sender-display">{senderName}</span>}
                  <div className="msg-text-display">{msg.content}</div>
                  <div className="msg-bottom-meta">
                    <span className="timestamp-display">
                      {new Date(msg.createdAt || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isOwn && <Check size={14} className="delivered-icon" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Input Field */}
      <footer className="input-bar-chrome">
        <div className="input-shell">
          <input
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button className={`send-icon-button ${message.trim() ? 'active' : ''}`} onClick={sendMessage}>
            <Send size={20} />
          </button>
        </div>
      </footer>

      <style>{`
        .chat-container-pro {
          width: 100%; height: 100%;
          display: flex; flex-direction: column;
          background: var(--pro-bg);
          position: relative;
        }

        /* --- App Bar --- */
        .app-bar {
          height: 64px; padding: 0 48px;
          background: rgba(5, 5, 8, 0.8);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--pro-border);
          display: flex; align-items: center; justify-content: space-between;
          z-index: 1000;
          flex-shrink: 0;
          position: sticky;
          top: 0;
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
        }
        .bar-left { display: flex; align-items: center; gap: 20px; }
        .room-indicator { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 15px; color: #a78bfa; letter-spacing: 0.5px; }
        .separator { width: 1px; height: 16px; background: rgba(255, 255, 255, 0.1); }
        .user-indicator { display: flex; align-items: center; gap: 10px; font-size: 14px; color: var(--pro-text-muted); font-weight: 500; }

        .exit-button {
          display: flex; align-items: center; gap: 10px;
          background: rgba(255, 255, 255, 0.03); border: 1px solid var(--pro-border);
          color: var(--pro-text-muted); padding: 8px 18px; border-radius: 10px;
          font-size: 13px; font-weight: 600; cursor: pointer; transition: 0.2s;
        }
        .exit-button:hover { background: rgba(239, 68, 68, 0.1); color: #f87171; border-color: rgba(239, 68, 68, 0.2); }

        /* --- Message Flow --- */
        .message-scroller {
          flex: 1; overflow-y: auto; padding: 40px 0;
          display: flex; flex-direction: column;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.1) transparent;
        }

        .encryption-banner {
          align-self: center; display: flex; align-items: center; gap: 10px;
          background: rgba(255,255,255,0.03); color: var(--pro-text-muted);
          padding: 8px 24px; border-radius: 100px; font-size: 12px; margin-bottom: 40px;
          border: 1px solid var(--pro-border);
        }

        .message-list { width: 100%; max-width: 800px; margin: 0 auto; padding: 0 24px; display: flex; flex-direction: column; gap: 4px; }
        .msg-bubble-wrapper { display: flex; width: 100%; margin-bottom: 2px; }
        .msg-bubble-wrapper.own { justify-content: flex-end; }

        .msg-bubble-chrome {
          max-width: 70%; padding: 10px 16px;
          display: flex; flex-direction: column; position: relative;
          border-radius: 12px;
        }
        .msg-bubble-wrapper.other .msg-bubble-chrome { 
          background: var(--pro-surface); 
          border: 1px solid rgba(255, 255, 255, 0.1); 
          border-bottom-left-radius: 2px; 
          color: var(--pro-text); 
        }
        .msg-bubble-wrapper.own .msg-bubble-chrome { 
          background: #11111a; 
          border: 1px solid rgba(167, 139, 250, 0.25);
          border-bottom-right-radius: 2px; 
          color: var(--pro-text); 
        }

        .sender-display { font-size: 11px; font-weight: 700; color: #a78bfa; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9; }
        .msg-text-display { font-size: 15px; line-height: 1.5; font-weight: 400; }
        .msg-bottom-meta { align-self: flex-end; display: flex; align-items: center; gap: 6px; margin-top: 4px; opacity: 0.6; }
        .timestamp-display { font-size: 9.5px; opacity: 0.8; font-weight: 500; }
        .delivered-icon { color: white; opacity: 0.8; }

        /* --- Input Bar --- */
        .input-bar-chrome {
          height: 100px; padding: 0 48px 40px;
          display: flex; align-items: flex-end;
          background: linear-gradient(to top, var(--pro-bg) 60%, transparent);
          z-index: 50;
        }
        .input-shell {
          max-width: 1000px; margin: 0 auto;
          width: 100%;
          background: rgba(255, 255, 255, 0.03); border: 1px solid var(--pro-border);
          backdrop-filter: blur(20px);
          border-radius: 16px; display: flex; align-items: center;
          padding: 6px 6px 6px 20px;
          transition: all 0.3s ease;
        }
        .input-shell:focus-within { 
          border-color: #a78bfa; 
          background: rgba(255, 255, 255, 0.05);
          box-shadow: 0 0 30px rgba(139, 92, 246, 0.1);
        }
        .input-shell input {
          flex: 1; background: none; border: none; color: white;
          font-size: 15px; outline: none; padding: 12px 0;
          font-family: 'Inter', sans-serif;
        }
        .send-icon-button {
          width: 44px; height: 44px; background: none; border: none;
          color: var(--pro-text-muted); cursor: pointer; opacity: 0.3; transition: 0.2s;
        }
        .send-icon-button.active { opacity: 1; color: var(--pro-accent); }

        @media (max-width: 768px) {
          .app-bar { 
            padding: 0 16px; 
            padding-top: env(safe-area-inset-top);
            height: calc(60px + env(safe-area-inset-top));
          }
          .bar-left { gap: 10px; }
          .room-indicator { gap: 4px; }
          .room-indicator span { font-size: 13px; display: block; }
          .user-indicator { gap: 6px; }
          .user-indicator span { 
            display: block; 
            font-size: 12px; 
            max-width: 60px; 
            overflow: hidden; 
            text-overflow: ellipsis; 
            white-space: nowrap;
          }
          .separator { height: 12px; margin: 0 2px; }
          
          .input-bar-chrome { padding: 0 16px 20px; height: 84px; }
          .message-list { padding: 0 16px; }
          .msg-bubble-chrome { max-width: 90%; }
          
          .exit-button { padding: 8px 10px; }
          .exit-button span { display: none; }
        }
      `}</style>
    </div>
  );
};

export default ChatRoom;
