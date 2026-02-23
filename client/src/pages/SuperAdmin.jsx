import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Users,
  Activity,
  Trash2,
  Plus,
  RefreshCcw,
  UserPlus,
  UserMinus,
  CheckCircle,
  Hash,
  Crown,
  LayoutDashboard,
  ShieldAlert
} from "lucide-react";
import { API_URL, SOCKET_URL } from "../config";
import "../styles/global.css";
import logo from "../assets/logo.png";

const SuperAdmin = () => {
  const [roomName, setRoomName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [selectedRoomCode, setSelectedRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [liveUsers, setLiveUsers] = useState([]);
  const [socket, setSocket] = useState(null);
  const [activeTab, setActiveTab] = useState("live");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    newSocket.on("connect", () => {
      console.log("SuperAdmin Socket Connected:", newSocket.id);
      if (roomCode) {
        newSocket.emit("join_room", {
          roomCode: roomCode.trim().toUpperCase(),
          role: "superadmin",
          password: password
        });
      }
    });

    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, [roomCode]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("superAdminSession"));
      if (saved && saved.role === "superadmin" && saved.roomCode) {
        setRoomCode(saved.roomCode);
        setSelectedRoomCode(saved.roomCode);
        setPassword(saved.password || "");
      }
    } catch (e) {
      console.error("Session parse error:", e);
    }
  }, []);

  const fetchPendingUsers = useCallback(async () => {
    if (!selectedRoomCode) return;
    try {
      const res = await axios.get(`${API_URL}/api/rooms/${selectedRoomCode}/pending-users`);
      setPendingUsers(res.data || []);
    } catch (err) {
      console.error("Fetch pending failed", err);
    }
  }, [selectedRoomCode]);

  const fetchAllUsers = useCallback(async () => {
    if (!selectedRoomCode) return;
    try {
      const res = await axios.get(`${API_URL}/api/rooms/${selectedRoomCode}/all-users`);
      setAllUsers(res.data || []);
    } catch (err) {
      console.error("Fetch all failed", err);
    }
  }, [selectedRoomCode]);

  useEffect(() => {
    if (!socket || !roomCode) return;

    console.log("SuperAdmin re-joining room:", roomCode);
    socket.emit("join_room", {
      roomCode: roomCode.trim().toUpperCase(),
      role: "superadmin",
      password: password
    });

    // Initial fetch
    fetchPendingUsers();
    fetchAllUsers();
  }, [socket, roomCode, fetchPendingUsers, fetchAllUsers]);

  useEffect(() => {
    if (!socket) return;

    socket.on("room_deleted", () => {
      alert("Room deleted.");
      localStorage.removeItem("superAdminSession");
      window.location.reload();
    });

    socket.on("superadmin_live_users", (users) => {
      console.log("Received live users update:", users?.length);
      setLiveUsers(users || []);
    });

    socket.on("refresh_user_lists", () => {
      console.log("Refreshing data via socket trigger...");
      fetchPendingUsers();
      fetchAllUsers();
    });

    socket.on("auth_failed", (msg) => {
      setError(msg);
      localStorage.removeItem("superAdminSession");
      setRoomCode("");
    });

    return () => {
      socket.off("room_deleted");
      socket.off("superadmin_live_users");
      socket.off("refresh_user_lists");
      socket.off("auth_failed");
    };
  }, [socket, fetchPendingUsers, fetchAllUsers]);

  const createRoom = async () => {
    if (!roomName.trim() || !password.trim()) {
      setError("Credentials Required");
      return;
    }
    setLoading(true);
    setError(""); // Clear previous errors
    try {
      // Send both the room name and the root credential for verification
      const res = await axios.post(`${API_URL}/api/rooms/create`, {
        name: roomName,
        rootPassword: password
      });

      const newCode = res.data.room.roomCode;
      localStorage.setItem("superAdminSession", JSON.stringify({ roomCode: newCode, role: "superadmin", password }));
      setRoomCode(newCode);
      setSelectedRoomCode(newCode);
      if (socket) socket.emit("join_room", { roomCode: newCode, role: "superadmin", password: password });
    } catch (err) {
      const msg = err.response?.data?.message || "Authorization Protocol Failed. Check root credentials.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (userId) => {
    try {
      await axios.patch(`${API_URL}/api/rooms/approve-user/${userId}`);
      if (socket && selectedRoomCode) socket.emit("approve_user", { userId, roomCode: selectedRoomCode });
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
      fetchAllUsers();
    } catch (err) {
      console.error("Approve failed", err);
    }
  };

  const kickUser = async (userId) => {
    if (!window.confirm("Kick User?")) return;
    console.log("Kicking user with ID:", userId);
    try {
      await axios.delete(`${API_URL}/api/rooms/kick-user/${userId}`);
      console.log("Kick API success for:", userId);

      // Update UI immediately
      setAllUsers(prev => prev.filter(u => (u.id || u._id) !== userId));
      setLiveUsers(prev => prev.filter(u => (u.id || u._id) !== userId));

      alert("User removed successfully.");
      fetchAllUsers();
    } catch (err) {
      console.error("Kick failed:", err);
      alert("Failed to remove user. See console for details.");
    }
  };

  const handleDeleteRoom = () => {
    if (!window.confirm("PERMANENTLY DELETE ROOM?")) return;
    if (socket && roomCode) socket.emit("delete_room", { roomCode });
    localStorage.removeItem("superAdminSession");
    window.location.reload();
  };

  return (
    <div className="superadmin-page">
      <div className="bg-mesh" />

      <div className="dashboard-container">
        <header className={`dashboard-header ${!roomCode ? 'auth-centered' : ''}`}>
          <div className="brand">
            <div className="brand-box">
              <img src={logo} alt="Nexus Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div className="brand-text">
              <h1>NEXUS COMMAND</h1>
              <p>Project Infrastructure Hub</p>
            </div>
          </div>

          {roomCode && (
            <div className="room-meta">
              <div className="meta-item">
                <Hash size={14} />
                <span>{roomCode}</span>
              </div>
              <button className="btn-danger-icon" onClick={handleDeleteRoom}>
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </header>

        <AnimatePresence mode="wait">
          {!roomCode ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="setup-center">
              <div className="glass-card setup-card">
                <LayoutDashboard size={40} className="setup-icon" />
                <h2>Command New Room</h2>
                <p>Initialize a new project communication channel</p>
                <div className="setup-form">
                  {error && <div className="error-alert-nested">{error}</div>}
                  <input
                    className="input-premium"
                    placeholder="ENVIRONMENT NAME"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                  />
                  <input
                    type="password"
                    className="input-premium"
                    placeholder="ROOT CREDENTIALS"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button className="btn-premium w-full" onClick={createRoom} disabled={loading}>
                    <Plus size={18} />
                    {loading ? "INITIALIZING..." : "READY COMMAND"}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="dashboard-main">
              {/* Stats & Actions */}
              <div className="dashboard-top">
                <div className="stats-row">
                  <div className="stat-pill glass-card">
                    <Activity size={16} className="text-emerald" />
                    <span>{liveUsers.length} Live Peers</span>
                  </div>
                  <div className="stat-pill glass-card">
                    <UserPlus size={16} className="text-amber" />
                    <span>{pendingUsers.length} Pending</span>
                  </div>
                  <div className="stat-pill glass-card">
                    <Users size={16} className="text-purple" />
                    <span>{allUsers.length} Total</span>
                  </div>
                </div>

                <div className="tab-control glass-card">
                  <button onClick={() => setActiveTab("live")} className={activeTab === "live" ? "active" : ""}>Live</button>
                  <button onClick={() => setActiveTab("pending")} className={activeTab === "pending" ? "active" : ""}>Approvals</button>
                  <button onClick={() => setActiveTab("all")} className={activeTab === "all" ? "active" : ""}>Peers</button>
                </div>
              </div>

              {/* Lists Content */}
              <div className="dashboard-content shadow-lg">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="content-scroll"
                  >
                    {activeTab === "live" && (
                      <div className="user-list">
                        {liveUsers.length === 0 ? <EmptyState msg="No active peer connections detected." /> : (
                          liveUsers.map(u => (
                            <div key={u.id || u._id || u.username} className="user-item glass-card">
                              <div className="user-main">
                                <div className="user-avatar">{(u.username || "?")[0].toUpperCase()}</div>
                                <div className="user-details">
                                  <span className="name">{u.username}</span>
                                  <span className="meta">{u.role} • SYNCED</span>
                                </div>
                              </div>
                              <div className="user-status online">CONNECTED</div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {activeTab === "pending" && (
                      <div className="user-list">
                        {pendingUsers.length === 0 ? <EmptyState msg="No security clearance requests pending." /> : (
                          pendingUsers.map(u => (
                            <div key={u.id || u._id} className="user-item glass-card">
                              <div className="user-main">
                                <div className="user-avatar amber">{(u.username || "?")[0].toUpperCase()}</div>
                                <div className="user-details">
                                  <span className="name">{u.username}</span>
                                  <span className="meta">Awaiting Clearance</span>
                                </div>
                              </div>
                              <button className="btn-action approve" onClick={() => approveUser(u.id || u._id)}>
                                <CheckCircle size={16} />
                                GRANT
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {activeTab === "all" && (
                      <div className="user-list">
                        {allUsers.length === 0 ? <EmptyState msg="No registered peers in history." /> : (
                          allUsers.map(u => (
                            <div key={u.id || u._id} className="user-item glass-card">
                              <div className="user-main">
                                <div className={`user-avatar ${u.status === 'pending' ? 'amber' : 'purple'}`}>{(u.username || "?")[0].toUpperCase()}</div>
                                <div className="user-details">
                                  <span className="name">{u.username}</span>
                                  <span className="meta">{u.status} • {u.online ? 'Active' : 'Offline'}</span>
                                </div>
                              </div>
                              {u.status === "approved" && (
                                <button className="btn-action kick" onClick={() => kickUser(u.id || u._id)}>
                                  <UserMinus size={16} />
                                  KICK
                                </button>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .superadmin-page {
          min-height: 100vh;
          background: #050508;
          display: flex;
          flex-direction: column;
          padding: 0;
          overflow-x: hidden;
        }

        .bg-mesh {
          position: fixed;
          inset: 0;
          background: radial-gradient(circle at 50% -20%, rgba(139, 92, 246, 0.08) 0%, transparent 60%);
          z-index: 0;
        }

        .dashboard-container {
          max-width: 1080px;
          margin: 0 auto;
          width: 100%;
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 40px 24px;
          z-index: 10;
          position: relative;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 60px;
          flex-shrink: 0;
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .dashboard-header.auth-centered {
          flex-direction: column;
          justify-content: center;
          padding-top: 0;
          margin-bottom: 32px;
        }

        .auth-centered .brand {
          flex-direction: column;
          text-align: center;
          gap: 12px;
        }

        .auth-centered .brand-box {
          width: 64px;
          height: 64px;
          border-radius: 20px;
        }

        .auth-centered .brand-text h1 {
          font-size: 26px;
        }

        .auth-centered .brand-text p {
          font-size: 10px;
          letter-spacing: 3px;
          margin-top: 8px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .brand-box {
          width: 52px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .error-alert-nested {
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

        .brand-text h1 {
          font-size: 22px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.02em;
        }

        .brand-text p {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #a78bfa;
          font-weight: 700;
        }

        .room-meta {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 16px;
          background: var(--bg-surface);
          border: 1px solid var(--glass-border);
          border-radius: 100px;
          font-size: 14px;
          font-weight: 700;
          color: #a78bfa;
        }

        .btn-danger-icon {
          width: 40px;
          height: 40px;
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: var(--transition-base);
        }

        .btn-danger-icon:hover {
          background: #ef4444;
          color: white;
        }

        .setup-center {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding-top: 0;
        }

        .setup-card {
          max-width: 440px;
          width: 100%;
          padding: 40px;
          text-align: center;
          box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.7);
        }

        .setup-card h2 {
          font-size: 24px;
          font-weight: 700;
          color: white;
          margin-bottom: 8px;
        }

        .setup-card p {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 0;
        }

        .setup-icon {
          color: var(--primary);
          margin-bottom: 24px;
        }

        .setup-form {
          margin-top: 32px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .setup-form .input-premium {
          font-size: 14px;
          padding: 12px 16px;
        }

        .setup-form .btn-premium {
          font-size: 14px;
          padding: 12px;
        }

        .dashboard-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          gap: 20px;
        }

        .stats-row {
          display: flex;
          gap: 12px;
        }

        .stat-pill {
          padding: 10px 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .tab-control {
          padding: 6px;
          display: flex;
          gap: 4px;
          border-radius: 14px;
        }

        .tab-control button {
          padding: 8px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          border: none;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          transition: var(--transition-base);
        }

        .tab-control button.active {
          background: var(--bg-subtle);
          color: white;
          box-shadow: var(--shadow-sm);
        }

        .dashboard-content {
          background: rgba(12, 12, 18, 0.6);
          border: 1px solid var(--glass-border);
          border-radius: 24px;
          height: 60vh;
          overflow: hidden;
          position: relative;
        }

        .content-scroll {
          height: 100%;
          overflow-y: auto;
          padding: 32px;
        }

        .user-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .user-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          border-radius: 20px;
        }

        .user-main {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .user-avatar {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: rgba(124, 58, 237, 0.1);
          color: #a78bfa;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 16px;
          border: 1px solid rgba(124, 58, 237, 0.2);
        }

        .user-avatar.amber {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
          border-color: rgba(245, 158, 11, 0.2);
        }

        .user-details {
          display: flex;
          flex-direction: column;
        }

        .user-details .name {
          font-size: 15px;
          font-weight: 700;
          color: white;
        }

        .user-details .meta {
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .user-status.online {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          font-size: 10px;
          font-weight: 800;
          color: #10b981;
          background: rgba(16, 185, 129, 0.1);
          padding: 4px 10px;
          border-radius: 6px;
          letter-spacing: 1px;
        }

        .btn-action {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: var(--transition-base);
        }

        .approve {
          background: var(--primary);
          color: white;
        }

        .kick {
          background: rgba(239, 68, 68, 0.1);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .kick:hover { background: #ef4444; color: white; }

        .empty-state {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          font-size: 14px;
        }

        .text-emerald { color: #10b981; }
        .text-amber { color: #f59e0b; }
        .text-purple { color: #a78bfa; }

        @media (max-width: 1024px) {
          .super-admin-layout { padding: 24px; }
        }

        @media (max-width: 768px) {
          .super-admin-layout { padding: 16px; }
          .dashboard-top { flex-direction: column; align-items: stretch; gap: 16px; }
          .stats-row { flex-wrap: wrap; gap: 8px; }
          .stat-pill { flex: 1; min-width: 140px; padding: 10px 14px; }
          .dashboard-grid { grid-template-columns: 1fr; }
          .user-item { flex-direction: column; align-items: stretch; gap: 12px; }
          .user-actions { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          .btn-icon { width: 100%; justify-content: center; }
        }

        @media (max-width: 480px) {
          .superadmin-page { padding: 0; }
          .dashboard-container { padding: 20px 14px; }
          .dashboard-header { margin-bottom: 32px; gap: 12px; }
          
          .brand { display: flex; align-items: center; gap: 10px; }
          .brand-text h1 { font-size: 15px; letter-spacing: -0.02em; line-height: 1.1; margin: 0; }
          .brand-text p { font-size: 8px; letter-spacing: 0.5px; margin-top: 2px; opacity: 0.8; }
          .brand-box { width: 44px; height: 44px; border-radius: 10px; flex-shrink: 0; }

          .dashboard-header.auth-centered { padding-top: 20px; margin-bottom: 30px; }
          .auth-centered .brand { flex-direction: column; text-align: center; gap: 16px; }
          .auth-centered .brand-text h1 { font-size: 24px; letter-spacing: -0.03em; }
          .auth-centered .brand-text p { font-size: 10px; letter-spacing: 3px; margin-top: 8px; }
          .auth-centered .brand-box { width: 64px; height: 64px; border-radius: 18px; }
          
          .setup-card { padding: 32px 20px; }
          .setup-card h2 { font-size: 20px; }
          .setup-card p { font-size: 13px; }
          
          .dashboard-top { gap: 10px; margin-bottom: 20px; }
          .stat-pill { padding: 8px 12px; font-size: 10.5px; border-radius: 10px; flex: 1; justify-content: center; }
          .tab-control { padding: 4px; border-radius: 12px; }
          .tab-control button { padding: 6px 10px; font-size: 11.5px; flex: 1; }
          
          .dashboard-content { height: 65vh; border-radius: 20px; }
          .content-scroll { padding: 12px; }
          
          /* User Item Mobile Optimization */
          .user-item { 
            display: flex;
            flex-direction: column;
            padding: 14px; 
            margin-bottom: 12px; 
            border-radius: 16px;
            gap: 14px;
            align-items: stretch;
          }
          
          .user-main {
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 12px;
            width: 100%;
          }
          
          .user-avatar { 
            width: 40px; 
            height: 40px; 
            font-size: 15px; 
            border-radius: 10px;
            flex-shrink: 0;
          }
          
          .user-details {
            display: flex;
            flex-direction: column;
            gap: 2px;
            text-align: left;
          }
          
          .user-details .name { font-size: 14px; }
          .user-details .meta { font-size: 10px; letter-spacing: 0.5px; }
          
          .btn-action, .user-status {
            width: 100%;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            font-size: 11px;
            letter-spacing: 1px;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
};

const EmptyState = ({ msg }) => (
  <div className="empty-state">
    <CheckCircle size={40} className="mb-4 opacity-20" />
    <p>{msg}</p>
  </div>
);

export default SuperAdmin;
