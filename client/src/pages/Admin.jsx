import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Trash2,
  CheckCircle,
  XCircle,
  LogOut,
  Hash,
  MessageSquare,
  Activity,
  User as UserIcon,
  ChevronRight,
  ShieldAlert,
  BookCheck
} from "lucide-react";
import { API_URL, SOCKET_URL } from "../config";
import "../styles/global.css";
import logo from "../assets/logo.png";

const Admin = () => {
  const [roomCode, setRoomCode] = useState("");
  const [password, setPassword] = useState("");
  const [connected, setConnected] = useState(false);
  const [pendingMessages, setPendingMessages] = useState([]);
  const [approvedMessages, setApprovedMessages] = useState([]);
  const [socket, setSocket] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [error, setError] = useState("");

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("adminSession"));
      if (saved && saved.role === "admin" && saved.roomCode) {
        setRoomCode(saved.roomCode);
        setPassword(saved.password || "");
        setConnected(true);
      }
    } catch (e) {
      console.error("Session parse error:", e);
    }
  }, []);

  // ── Dedicated effect to load (and reload) approved messages ──────────────────
  // This runs as soon as connected + roomCode are known — no socket dependency.
  // That means it fires immediately on page reload from localStorage session,
  // independently of when the socket finishes connecting.
  useEffect(() => {
    if (!connected || !roomCode) return;
    axios
      .get(`${API_URL}/api/messages/approved/${roomCode}`)
      .then((res) => setApprovedMessages(res.data || []))
      .catch((err) => console.error("Failed to fetch approved messages:", err));
  }, [connected, roomCode]);

  // ── Socket event listeners ────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !connected || !roomCode) return;
    socket.emit("join_room", { roomCode, role: "admin", password });

    const handleLoad = (msgs) => setPendingMessages(msgs || []);
    const handleNew = (msg) => {
      setPendingMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };
    const handleDelete = (messageId) => {
      setPendingMessages((prev) => prev.filter((m) => (m.id || m._id) !== messageId));
      setApprovedMessages((prev) => prev.filter((m) => (m.id || m._id) !== messageId));
    };
    const handleApproved = (msg) => {
      // Add newly-approved message to the approved list in real-time
      setApprovedMessages((prev) => {
        const id = msg.id || msg._id;
        if (prev.find((m) => (m.id || m._id) === id)) return prev;
        return [...prev, msg];
      });
    };

    socket.on("load_pending_messages", handleLoad);
    socket.on("new_pending_message", handleNew);
    socket.on("message_deleted", handleDelete);
    socket.on("message_approved", handleApproved);
    // Only refresh pending messages on user-list changes, never touch approved state
    socket.on("refresh_user_lists", () => {
      socket.emit("get_pending_messages", { roomCode });
    });

    socket.on("auth_failed", (msg) => {
      setError(msg);
      localStorage.removeItem("adminSession");
      setConnected(false);
      setPassword("");
    });

    return () => {
      socket.off("load_pending_messages", handleLoad);
      socket.off("new_pending_message", handleNew);
      socket.off("message_deleted", handleDelete);
      socket.off("message_approved", handleApproved);
      socket.off("refresh_user_lists");
      socket.off("auth_failed");
    };
  }, [socket, connected, roomCode, password]);

  const connectRoom = () => {
    if (!roomCode.trim() || !password.trim()) {
      setError("Credentials Required");
      return;
    }
    localStorage.setItem("adminSession", JSON.stringify({ roomCode, role: "admin", password }));
    setConnected(true);
  };

  const approveMessage = (messageId) => {
    if (!socket) return;
    socket.emit("approve_message", { messageId });
    setPendingMessages((prev) => prev.filter((msg) => (msg.id || msg._id) !== messageId));
  };

  const deleteMessage = async (messageId) => {
    if (!window.confirm("Permanently delete this message?")) return;
    try {
      await axios.delete(`${API_URL}/api/messages/delete/${messageId}`);
      // Immediately remove from both queues so the UI reflects the deletion right away
      setPendingMessages((prev) => prev.filter((msg) => (msg.id || msg._id) !== messageId));
      setApprovedMessages((prev) => prev.filter((msg) => (msg.id || msg._id) !== messageId));
    } catch (_err) {
      setError("Failed to delete message");
    }
  };

  const logout = () => {
    if (!window.confirm("Logout from admin panel?")) return;
    localStorage.removeItem("adminSession");
    setConnected(false);
    setRoomCode("");
    setPendingMessages([]);
    setApprovedMessages([]);
  };

  return (
    <div className="admin-page">
      <div className="bg-mesh" />
      <div className="admin-container">

        <header className={`admin-header ${!connected ? 'auth-centered' : ''}`}>
          <div className="header-brand">
            <div className="brand-icon">
              <img src={logo} alt="Nexus Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div className="brand-text">
              <h1>NEXUS TERMINAL</h1>
              <p>Security Protocol: Active</p>
            </div>
          </div>

          {connected && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="header-actions">
              <div className="room-badge">
                <Hash size={14} />
                <span>{roomCode}</span>
              </div>
              <button className="btn-logout" onClick={logout}>
                <LogOut size={16} />
              </button>
            </motion.div>
          )}
        </header>


        <AnimatePresence mode="wait">
          {!connected ? (
            <motion.div
              key="auth"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="admin-auth"
            >
              <div className="glass-card auth-card">
                <ShieldAlert size={40} className="auth-icon" />
                <h2>Access Control</h2>
                <p>Enter the security code to access this terminal</p>
                <div className="auth-form">
                  {error && <div className="error-pill">{error}</div>}
                  <input
                    className="input-premium"
                    placeholder="ENTER ROOM CODE"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    maxLength={6}
                  />
                  <input
                    type="password"
                    className="input-premium"
                    placeholder="ENTER ACCESS KEY"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ marginTop: '12px' }}
                  />
                  <button className="btn-premium w-full" onClick={connectRoom}>
                    Authorize Access <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="admin-dashboard"
            >
              {/* Stats Bar */}
              <div className="stats-grid">
                <div className="stat-card glass-card">
                  <Activity size={18} />
                  <div className="stat-info">
                    <span className="label">Status</span>
                    <span className="value text-emerald">Active</span>
                  </div>
                </div>
                <div className="stat-card glass-card">
                  <MessageSquare size={18} />
                  <div className="stat-info">
                    <span className="label">Pending</span>
                    <span className="value">{pendingMessages.length} Items</span>
                  </div>
                </div>
                <div className="stat-card glass-card">
                  <BookCheck size={18} />
                  <div className="stat-info">
                    <span className="label">Approved</span>
                    <span className="value text-emerald">{approvedMessages.length} Msgs</span>
                  </div>
                </div>
                <div className="stat-card glass-card">
                  <UserIcon size={18} />
                  <div className="stat-info">
                    <span className="label">Authority</span>
                    <span className="value">Moderator</span>
                  </div>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="moderation-header">
                <div className="tab-control glass-card">
                  <button
                    onClick={() => setActiveTab("pending")}
                    className={activeTab === "pending" ? "active" : ""}
                  >
                    Approval Queue
                    {pendingMessages.length > 0 && <span className="badge amber">{pendingMessages.length}</span>}
                  </button>
                  <button
                    onClick={() => setActiveTab("approved")}
                    className={activeTab === "approved" ? "active" : ""}
                  >
                    Approved Messages
                    {approvedMessages.length > 0 && <span className="badge emerald">{approvedMessages.length}</span>}
                  </button>
                </div>

                <div className="live-pulse">
                  <span className="dot"></span>
                  Live Sync Enabled
                </div>
              </div>

              {/* Main Moderation Content */}
              <div className="moderation-container">
                <AnimatePresence mode="wait">
                  {activeTab === "pending" ? (
                    <motion.div
                      key="pending-queue"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="moderation-queue"
                    >
                      <div className="queue-list">
                        <AnimatePresence initial={false}>
                          {pendingMessages.length === 0 ? (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="empty-queue"
                            >
                              <div className="empty-icon-wrap">
                                <CheckCircle size={32} />
                              </div>
                              <p>All clear! No messages awaiting review.</p>
                            </motion.div>
                          ) : (
                            pendingMessages.map((msg) => (
                              <motion.div
                                key={msg.id || msg._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="moderation-item"
                              >
                                <div className="item-main">
                                  <div className="sender-avatar">
                                    {(msg.sender?.username || msg.senderUsername || "User")[0].toUpperCase()}
                                  </div>
                                  <div className="item-content-wrap">
                                    <div className="item-meta">
                                      <span className="sender-name">{msg.sender?.username || msg.senderUsername || "User"}</span>
                                      <span className="time-tag">Incoming</span>
                                    </div>
                                    <p className="item-content">{msg.content}</p>
                                  </div>
                                </div>
                                <div className="item-actions">
                                  <button className="btn-action-icon approve" onClick={() => approveMessage(msg.id || msg._id)} title="Approve">
                                    <CheckCircle size={18} />
                                  </button>
                                  <button className="btn-action-icon delete" onClick={() => deleteMessage(msg.id || msg._id)} title="Discard">
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </motion.div>
                            ))
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="approved-list"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="moderation-queue approved-queue"
                    >
                      <div className="queue-list">
                        <AnimatePresence initial={false}>
                          {approvedMessages.length === 0 ? (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="empty-queue"
                            >
                              <div className="empty-icon-wrap">
                                <BookCheck size={32} />
                              </div>
                              <p>No approved messages yet.</p>
                            </motion.div>
                          ) : (
                            approvedMessages.map((msg) => (
                              <motion.div
                                key={msg.id || msg._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="moderation-item"
                              >
                                <div className="item-main">
                                  <div className="sender-avatar">
                                    {(msg.sender?.username || msg.senderUsername || "User")[0].toUpperCase()}
                                  </div>
                                  <div className="item-content-wrap">
                                    <div className="item-meta">
                                      <span className="sender-name">{msg.sender?.username || msg.senderUsername || "User"}</span>
                                      <span className="approved-tag">✓ Approved</span>
                                    </div>
                                    <p className="item-content">{msg.content}</p>
                                  </div>
                                </div>
                                <div className="item-actions">
                                  <div className="status-telem live">
                                    <div className="telem-dot" />
                                    <span>LIVE</span>
                                  </div>
                                  <button
                                    className="btn-action-icon delete"
                                    onClick={() => deleteMessage(msg.id || msg._id)}
                                    title="Delete this approved message"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </motion.div>
                            ))
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .admin-page {
          min-height: 100vh;
          background: #050508;
          color: #f1f5f9;
          font-family: 'Inter', sans-serif;
          display: flex;
          flex-direction: column;
          padding-top: env(safe-area-inset-top);
          padding-bottom: env(safe-area-inset-bottom);
        }

        .bg-mesh {
          position: fixed;
          inset: 0;
          background: radial-gradient(circle at 50% -20%, rgba(139, 92, 246, 0.08) 0%, transparent 60%);
          z-index: 0;
        }

        .admin-container {
          max-width: 1080px;
          margin: 0 auto;
          width: 100%;
          flex: 1;
          display: flex;
          flex-direction: column;
          position: relative;
        }

        .admin-auth {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          gap: 40px; /* Precise gap between branding and card */
        }

        /* ── Super Admin Sync Header ── */
        .admin-header {
          padding: 24px 48px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          background: rgba(5, 5, 8, 0.5);
          backdrop-filter: blur(20px);
          transition: all 0.4s ease;
        }

        .admin-header.auth-centered {
          justify-content: center;
          border-bottom-color: transparent;
          background: transparent;
          padding-top: 80px;
          padding-bottom: 0;
        }

        .auth-centered .header-brand {
          flex-direction: column;
          text-align: center;
          gap: 20px;
        }

        .auth-centered .brand-icon {
          width: 56px;
          height: 56px;
        }

        .header-brand {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .brand-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .brand-text h1 {
          font-family: 'Outfit', sans-serif;
          font-size: 21px;
          font-weight: 800;
          color: white;
          line-height: 1;
          margin: 0;
          letter-spacing: -0.03em;
        }

        .brand-text p {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1.8px;
          color: #a78bfa;
          font-weight: 700;
          margin: 6px 0 0 0;
          opacity: 0.9;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .room-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 100px;
          font-size: 13px;
          font-weight: 700;
          color: #a78bfa;
        }

        /* ── Auth Card Extensions ── */
        .auth-card {
          width: 100%;
          max-width: 400px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 40px 32px !important;
        }

        .auth-icon {
          color: #a78bfa;
          margin-bottom: 12px;
          filter: drop-shadow(0 0 10px rgba(124, 58, 237, 0.2));
        }

        .auth-card h2 {
          font-size: 24px;
          letter-spacing: -0.02em;
          margin-bottom: 8px;
        }

        .auth-card p {
          color: #64748b;
          font-size: 14px;
          margin-bottom: 24px;
        }

        .auth-form {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .auth-form input {
          text-align: center;
          letter-spacing: 2px;
          font-weight: 700;
        }

        .btn-logout {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-logout:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #f87171;
          border-color: rgba(239, 68, 68, 0.15);
        }

        /* ── Scrolling Fix: Pure Flex Layout ── */
        .admin-dashboard {
          padding: 32px 48px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          flex: 1; 
          overflow: hidden; 
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

        /* ── STATS ROW ── */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          flex-shrink: 0; /* Keep stats fixed size */
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 20px;
          background: rgba(10, 10, 15, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: 14px !important;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .stat-card:hover {
          background: rgba(15, 15, 20, 0.6);
          border-color: rgba(124, 58, 237, 0.2);
          transform: translateY(-2px);
        }

        .stat-card svg {
          width: 38px;
          height: 38px;
          padding: 10px;
          border-radius: 10px;
          background: rgba(124, 58, 237, 0.05);
          color: #a78bfa;
          flex-shrink: 0;
          border: 1px solid rgba(124, 58, 237, 0.1);
        }

        .stat-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .stat-info .label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          font-weight: 800;
          color: #475569;
        }

        .stat-info .value {
          font-size: 18px;
          font-weight: 800;
          color: white;
          font-family: 'Outfit', sans-serif;
          line-height: 1.1;
          letter-spacing: -0.02em;
        }

        /* ── Moderation Controls ── */
        .moderation-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }

        .tab-control {
          background: rgba(15, 15, 25, 0.6);
          padding: 4px;
          border-radius: 12px;
          display: flex;
          gap: 4px;
          border: 1px solid rgba(255, 255, 255, 0.03);
        }

        .tab-control button {
          padding: 10px 24px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          color: #64748b;
          border: none;
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.2s;
          letter-spacing: -0.01em;
        }

        .tab-control button.active {
          color: white;
          background: rgba(124, 58, 237, 0.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .badge {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 6px;
          letter-spacing: 0.5px;
        }

        .badge.amber { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        .badge.emerald { background: rgba(16, 185, 129, 0.1); color: #10b981; }

        .live-pulse {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          font-weight: 700;
          color: #10b981;
          background: rgba(16, 185, 129, 0.05);
          padding: 8px 18px;
          border-radius: 100px;
          border: 1px solid rgba(16, 185, 129, 0.1);
          letter-spacing: 0.02em;
        }

        .live-pulse .dot {
          width: 6px;
          height: 6px;
          background: currentColor;
          border-radius: 50%;
          animation: pulse-green 2s infinite;
        }

        @keyframes pulse-green {
          0% { opacity: 0.4; }
          50% { opacity: 1; }
          100% { opacity: 0.4; }
        }

        /* ── Moderation Main Container ── */
        .moderation-container {
          background: rgba(12, 12, 18, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: 24px;
          flex: 1; 
          min-height: 0; 
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        /* Ensure AnimatePresence and Queue Wrapper fill height */
        .moderation-container > div,
        .moderation-queue {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .queue-list {
          padding: 24px;
          overflow-y: overlay;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* ── Premium Scrollbar ── */
        .queue-list::-webkit-scrollbar {
          width: 6px;
        }
        .queue-list::-webkit-scrollbar-track {
          background: transparent;
        }
        .queue-list::-webkit-scrollbar-thumb {
          background: rgba(124, 58, 237, 0.2);
          border-radius: 10px;
        }
        .queue-list::-webkit-scrollbar-thumb:hover {
          background: rgba(124, 58, 237, 0.4);
        }

        .moderation-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: rgba(15, 15, 20, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: 16px;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }

        .moderation-item::before {
          content: '';
          position: absolute;
          left: 0;
          top: 15%;
          bottom: 15%;
          width: 3px;
          border-radius: 0 4px 4px 0;
          background: transparent;
          transition: background 0.2s;
        }

        .moderation-item:hover {
          background: rgba(20, 20, 25, 0.7);
          border-color: rgba(124, 58, 237, 0.2);
          transform: translateX(2px);
        }

        .moderation-item:hover::before {
          background: #7c3aed;
        }

        .approved-queue .moderation-item:hover::before {
          background: #10b981;
        }

        .status-telem {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          color: #475569;
          margin-right: 8px;
        }

        .status-telem.live span { color: #10b981; opacity: 0.8; }
        
        .telem-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
        }

        .item-main {
          flex: 1;
          display: flex;
          gap: 16px;
          align-items: center; /* Center avatar and text vertically */
        }

        .sender-avatar {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(124, 58, 237, 0.1);
          color: #a78bfa;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 20px;
          border: 1px solid rgba(124, 58, 237, 0.15);
          flex-shrink: 0;
          font-family: 'Outfit', sans-serif;
        }

        .item-content-wrap {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .item-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0;
        }

        .sender-name {
          font-weight: 700;
          color: #a78bfa;
          font-size: 14px;
          letter-spacing: -0.01em;
        }

        .time-tag, .approved-tag {
          font-family: 'Outfit', sans-serif;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 800;
        }

        .time-tag { color: #475569; }
        .approved-tag { color: #10b981; background: rgba(16, 185, 129, 0.05); padding: 1px 6px; border-radius: 4px; }

        .item-content {
          font-size: 15px;
          line-height: 1.5;
          color: #e2e8f0;
          font-weight: 500;
        }

        .item-actions {
          display: flex;
          gap: 8px;
          margin-left: 24px;
        }

        .btn-action-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid transparent;
          background: rgba(255, 255, 255, 0.02);
          color: #64748b;
        }

        .btn-action-icon.approve:hover {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border-color: rgba(16, 185, 129, 0.2);
          transform: scale(1.05);
        }

        .btn-action-icon.delete:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #f87171;
          border-color: rgba(239, 68, 68, 0.2);
          transform: scale(1.05);
        }

        .empty-queue {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 20px;
          color: #475569;
          font-size: 15px;
          font-weight: 500;
        }

        .empty-icon-wrap {
          width: 72px;
          height: 72px;
          border-radius: 24px;
          background: rgba(124, 58, 237, 0.04);
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(124, 58, 237, 0.15);
          margin-bottom: 4px;
        }

        .empty-icon-wrap svg {
          width: 40px;
          height: 40px;
        }

        /* ── Responsive Architecture ── */
        @media (max-width: 1024px) {
          .admin-header, .admin-dashboard { padding-left: 32px; padding-right: 32px; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
        }

        @media (max-width: 768px) {
          .admin-dashboard { overflow: visible; height: auto; }
          .admin-header { padding: 20px 24px; }
          .admin-dashboard { padding: 20px; gap: 20px; }
          
          .brand-text h1 { font-size: 20px; }
          .brand-text p { font-size: 10px; letter-spacing: 1.5px; }
          .brand-icon { width: 40px; height: 40px; }
          .brand-icon svg { width: 20px; height: 20px; }

          .moderation-header { flex-direction: column; align-items: stretch; gap: 16px; }
          .tab-control { width: 100%; }
          .tab-control button { flex: 1; justify-content: center; padding: 10px; font-size: 13px; }
          .live-pulse { align-self: flex-start; }

          .moderation-item { flex-direction: column; align-items: stretch; gap: 16px; padding: 16px; }
          .item-actions { margin-left: 0; justify-content: flex-end; border-top: 1px solid rgba(255, 255, 255, 0.03); padding-top: 12px; }
          
          .auth-card { padding: 32px 24px; margin: 0 20px; }
        }

        @media (max-width: 480px) {
          .admin-header { padding: 14px 16px; border-bottom-color: rgba(255, 255, 255, 0.05); }
          .admin-header.auth-centered { padding-top: 32px; }
          .admin-dashboard { padding: 16px; gap: 16px; }
          
          /* Compact 2x2 Stats */
          .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .stat-card { padding: 12px; gap: 10px; }
          .stat-card svg { width: 32px; height: 32px; padding: 8px; }
          .stat-info .value { font-size: 15px; }
          
          .header-brand { gap: 10px; }
          .admin-header.auth-centered .header-brand { flex-direction: column; text-align: center; gap: 12px; }
          .brand-icon { width: 52px; height: 52px; }
          .brand-text h1 { font-size: 16px; letter-spacing: -0.01em; }
          .brand-text p { font-size: 8px; letter-spacing: 1px; margin-top: 4px; }
          
          .moderation-header { gap: 12px; }
          .tab-control { background: rgba(15, 15, 25, 0.8); }
          .tab-control button { font-size: 12px; padding: 10px; gap: 8px; }

          .queue-list { padding: 12px; gap: 8px; }
          .moderation-item { padding: 14px; flex-direction: row; align-items: center; } /* Keep row layout if possible */
          .item-actions { border: none; padding: 0; margin-top: 0; margin-left: 12px; }
          .sender-avatar { width: 32px; height: 32px; font-size: 14px; }
          .item-content { font-size: 14px; }
          
          .auth-card { width: 100%; max-width: 100%; margin: 0; padding: 32px 20px; border-radius: 16px; }
          .admin-auth { padding: 20px; align-items: center; justify-content: center; } 
          .auth-centered .brand-text p { letter-spacing: 2px; font-size: 10px; }
        }
      `}</style>
    </div>
  );
};

export default Admin;
