import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { io } from "socket.io-client";

// Get server URL from env or use production fallback
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "https://aws-cloud-connect-server.onrender.com";

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
  const [error, setError] = useState("");

  // Initialize socket
  useEffect(() => {
    const newSocket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
    
    newSocket.on("connect", () => {
      console.log("SuperAdmin connected");
    });
    
    setSocket(newSocket);
    
    return () => newSocket.disconnect();
  }, []);

  // Restore session
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("superAdminSession"));
      if (saved && saved.role === "superadmin" && saved.roomCode) {
        setRoomCode(saved.roomCode);
        setSelectedRoomCode(saved.roomCode);
      }
    } catch (e) {
      console.error("Session parse error:", e);
    }
  }, []);

  // Join room when socket is ready
  useEffect(() => {
    if (!socket || !roomCode) return;
    
    socket.emit("join_room", { roomCode, role: "superadmin" });
    
    // Refresh pending users
    fetchPendingUsers();
    fetchAllUsers();
  }, [socket, roomCode]);

  // Listen for room deletion
  useEffect(() => {
    if (!socket) return;
    
    const handleRoomDeleted = () => {
      alert("Room has been deleted.");
      localStorage.removeItem("superAdminSession");
      setRoomCode("");
      setSelectedRoomCode("");
      window.location.reload();
    };
    
    socket.on("room_deleted", handleRoomDeleted);
    return () => socket.off("room_deleted", handleRoomDeleted);
  }, [socket]);

  // Listen for live users updates
  useEffect(() => {
    if (!socket) return;
    
    const handleLiveUsers = (users) => {
      console.log("Live users update:", users);
      setLiveUsers(users || []);
    };
    
    socket.on("superadmin_live_users", handleLiveUsers);
    return () => socket.off("superadmin_live_users", handleLiveUsers);
  }, [socket]);

  // Auto refresh every 3 seconds
  useEffect(() => {
    if (!socket || !selectedRoomCode) return;
    
    const interval = setInterval(() => {
      socket.emit("join_room", { roomCode: selectedRoomCode, role: "superadmin" });
    }, 3000);
    
    return () => clearInterval(interval);
  }, [socket, selectedRoomCode]);

  const fetchPendingUsers = useCallback(async () => {
    if (!selectedRoomCode) return;
    try {
      const res = await axios.get(`${SERVER_URL}/api/rooms/${selectedRoomCode}/pending-users`);
      setPendingUsers(res.data || []);
    } catch (err) {
      console.error("Failed to fetch pending users:", err);
    }
  }, [selectedRoomCode]);

  const fetchAllUsers = useCallback(async () => {
    if (!selectedRoomCode) return;
    try {
      const res = await axios.get(`${SERVER_URL}/api/rooms/${selectedRoomCode}/all-users`);
      setAllUsers(res.data || []);
    } catch (err) {
      console.error("Failed to fetch all users:", err);
    }
  }, [selectedRoomCode]);

  const createRoom = async () => {
    if (!roomName.trim()) {
      setError("Please enter a room name");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await axios.post(`${SERVER_URL}/api/rooms/create`, { name: roomName.trim() });
      const generatedCode = res.data.room.roomCode;
      
      setRoomCode(generatedCode);
      setSelectedRoomCode(generatedCode);
      setRoomName("");
      
      localStorage.setItem("superAdminSession", JSON.stringify({ roomCode: generatedCode, role: "superadmin" }));
      
      if (socket) {
        socket.emit("join_room", { roomCode: generatedCode, role: "superadmin" });
      }
      
      // Refresh users
      fetchPendingUsers();
      fetchAllUsers();
      
    } catch (err) {
      console.error("Room creation failed:", err);
      setError(err.response?.data?.message || "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (userId) => {
    try {
      // Use HTTP API for approval (more reliable)
      await axios.patch(`${SERVER_URL}/api/rooms/approve-user/${userId}`);
      
      // Also emit via socket as backup
      if (socket && selectedRoomCode) {
        socket.emit("approve_user", { userId, roomCode: selectedRoomCode });
      }
      
      // Remove from pending list immediately
      setPendingUsers((prev) => prev.filter((user) => user._id !== userId));
      
      // Refresh all users
      fetchAllUsers();
      
      console.log("User approved:", userId);
    } catch (err) {
      console.error("Failed to approve user:", err);
      setError("Failed to approve user");
    }
  };

  const kickUser = (userId) => {
    const confirmKick = window.confirm("Are you sure you want to remove this user from the room?");
    if (!confirmKick) return;
    
    if (socket && selectedRoomCode) {
      socket.emit("kick_user", { userId, roomCode: selectedRoomCode });
    }
    
    // Refresh users after kick
    setTimeout(() => {
      fetchAllUsers();
    }, 500);
  };

  const handleDeleteRoom = () => {
    const confirmDelete = window.confirm("Are you sure you want to delete this room? This will remove everyone from the room.");
    if (!confirmDelete) return;
    
    if (socket && roomCode) {
      socket.emit("delete_room", { roomCode });
    }
    
    localStorage.removeItem("superAdminSession");
    setRoomCode("");
    setSelectedRoomCode("");
    setPendingUsers([]);
    setAllUsers([]);
    setLiveUsers([]);
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}>Super Admin</h1>
          <p style={subtitleStyle}>Manage your chat room</p>
        </div>

        {error && (
          <div style={errorStyle}>{error}</div>
        )}

        {!roomCode && (
          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>Create New Room</h3>
            <input
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Enter Room Name"
              style={inputStyle}
              disabled={loading}
            />
            <button onClick={createRoom} disabled={loading} style={primaryButtonStyle}>
              {loading ? "Creating..." : "Create Room"}
            </button>
          </div>
        )}

        {roomCode && (
          <>
            <div style={roomCardStyle}>
              <div style={roomInfoRow}>
                <div style={roomInfoLeft}>
                  <span style={labelStyle}>Room Active</span>
                  <h2 style={roomCodeStyle}>{roomCode}</h2>
                </div>
                <button onClick={handleDeleteRoom} style={dangerButtonStyle}>
                  Delete Room
                </button>
              </div>
            </div>

            <div style={tabsRow}>
              <button
                onClick={() => setActiveTab("live")}
                style={activeTab === "live" ? activeTabStyle : tabStyle}
              >
                Live ({liveUsers.length})
              </button>
              <button
                onClick={() => setActiveTab("all")}
                style={activeTab === "all" ? activeTabStyle : tabStyle}
              >
                All ({allUsers.length})
              </button>
              <button
                onClick={() => {
                  setActiveTab("pending");
                  fetchPendingUsers();
                }}
                style={activeTab === "pending" ? activeTabStyle : tabStyle}
              >
                Pending ({pendingUsers.length})
              </button>
            </div>

            <div style={contentCardStyle}>
              {activeTab === "live" && (
                <div>
                  <div style={sectionHeaderRow}>
                    <h3 style={sectionTitleStyle}>Live Users</h3>
                  </div>
                  {liveUsers.length === 0 ? (
                    <div style={emptyStateStyle}>No users online</div>
                  ) : (
                    <div style={usersListStyle}>
                      {liveUsers.map((user) => (
                        <div key={user._id || user.username} style={userRow}>
                          <div style={userInfoRow}>
                            <div style={avatarStyle}>
                              {user.username?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                            <div>
                              <div style={userNameStyle}>{user.username}</div>
                              <div style={userRoleStyle}>{user.role}</div>
                            </div>
                          </div>
                          <div style={statusBadgeStyle}>
                            <span style={onlineDotStyle}></span> Online
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "all" && (
                <div>
                  <div style={sectionHeaderRow}>
                    <h3 style={sectionTitleStyle}>All Users</h3>
                    <button onClick={fetchAllUsers} style={refreshButtonStyle}>Refresh</button>
                  </div>
                  {allUsers.length === 0 ? (
                    <div style={emptyStateStyle}>
                      <p>No users yet</p>
                      <button onClick={fetchAllUsers} style={secondaryButtonStyle}>Load All Users</button>
                    </div>
                  ) : (
                    <div style={usersListStyle}>
                      {allUsers.map((user) => (
                        <div key={user._id} style={userRow}>
                          <div style={userInfoRow}>
                            <div
                              style={{
                                ...avatarStyle,
                                backgroundColor: user.status === "approved" ? "#2d1a4d" : "#3d2a1a",
                                color: user.status === "approved" ? "#c4a0ff" : "#fbbf24",
                              }}
                            >
                              {user.username?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                            <div>
                              <div style={userNameStyle}>{user.username}</div>
                              <div style={userStatusStyle}>
                                <span
                                  style={{
                                    ...statusDotStyle,
                                    backgroundColor: user.isOnline ? "#22c55e" : "#6b7280",
                                  }}
                                ></span>
                                {user.isOnline ? "Online" : "Offline"} - {user.status}
                              </div>
                            </div>
                          </div>
                          {user.status === "approved" && (
                            <button onClick={() => kickUser(user._id)} style={kickButtonStyle}>
                              Kick
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "pending" && (
                <div>
                  <div style={sectionHeaderRow}>
                    <h3 style={sectionTitleStyle}>Pending Approval</h3>
                    <button onClick={fetchPendingUsers} style={refreshButtonStyle}>Refresh</button>
                  </div>
                  {pendingUsers.length === 0 ? (
                    <div style={emptyStateStyle}>
                      <p>No pending users</p>
                      <button onClick={fetchPendingUsers} style={secondaryButtonStyle}>Load Pending</button>
                    </div>
                  ) : (
                    <div style={usersListStyle}>
                      {pendingUsers.map((user) => (
                        <div key={user._id} style={userRow}>
                          <div style={userInfoRow}>
                            <div style={{ ...avatarStyle, backgroundColor: "#3d2a1a", color: "#fbbf24" }}>
                              {user.username?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                            <div>
                              <div style={userNameStyle}>{user.username}</div>
                              <div style={userStatusStyle}>Waiting for approval</div>
                            </div>
                          </div>
                          <button onClick={() => approveUser(user._id)} style={approveButtonStyle}>
                            Approve
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
  maxWidth: "600px",
  margin: "0 auto",
};

const headerStyle = {
  textAlign: "center",
  marginBottom: "36px",
};

const titleStyle = {
  fontSize: "28px",
  fontWeight: "600",
  color: "#d8b4fe",
  marginBottom: "6px",
  letterSpacing: "-0.5px",
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
  borderRadius: "10px",
  padding: "28px",
};

const cardTitleStyle = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#e5e5e5",
  marginBottom: "20px",
};

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "6px",
  border: "1px solid #404040",
  backgroundColor: "#0a0a0a",
  color: "#e5e5e5",
  fontSize: "14px",
  marginBottom: "14px",
  outline: "none",
  boxSizing: "border-box",
};

const primaryButtonStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "6px",
  border: "none",
  backgroundColor: "#581c87",
  color: "#f5f5f5",
  fontSize: "14px",
  fontWeight: "500",
  cursor: "pointer",
};

const roomCardStyle = {
  backgroundColor: "#171717",
  border: "1px solid #262626",
  borderRadius: "10px",
  padding: "22px",
  marginBottom: "16px",
};

const roomInfoRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const roomInfoLeft = {
  textAlign: "left",
};

const labelStyle = {
  fontSize: "12px",
  color: "#737373",
  display: "block",
  marginBottom: "4px",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const roomCodeStyle = {
  fontSize: "24px",
  fontWeight: "600",
  color: "#d8b4fe",
  letterSpacing: "3px",
};

const dangerButtonStyle = {
  padding: "8px 16px",
  borderRadius: "5px",
  border: "1px solid #7f1d1d",
  backgroundColor: "#450a0a",
  color: "#fca5a5",
  fontSize: "12px",
  fontWeight: "500",
  cursor: "pointer",
};

const tabsRow = {
  display: "flex",
  gap: "8px",
  marginBottom: "16px",
};

const tabStyle = {
  flex: 1,
  padding: "10px 12px",
  borderRadius: "6px",
  border: "1px solid #404040",
  backgroundColor: "#171717",
  color: "#737373",
  fontSize: "13px",
  fontWeight: "500",
  cursor: "pointer",
  textAlign: "center",
};

const activeTabStyle = {
  flex: 1,
  padding: "10px 12px",
  borderRadius: "6px",
  border: "1px solid #581c87",
  backgroundColor: "#3b0764",
  color: "#f5f5f5",
  fontSize: "13px",
  fontWeight: "500",
  cursor: "pointer",
  textAlign: "center",
};

const contentCardStyle = {
  backgroundColor: "#171717",
  border: "1px solid #262626",
  borderRadius: "10px",
  padding: "20px",
};

const sectionHeaderRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "16px",
  paddingBottom: "12px",
  borderBottom: "1px solid #262626",
};

const sectionTitleStyle = {
  fontSize: "15px",
  fontWeight: "600",
  color: "#e5e5e5",
};

const refreshButtonStyle = {
  padding: "6px 10px",
  borderRadius: "4px",
  border: "1px solid #404040",
  backgroundColor: "transparent",
  color: "#737373",
  fontSize: "11px",
  cursor: "pointer",
};

const usersListStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const userRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px",
  borderRadius: "6px",
  backgroundColor: "#0a0a0a",
  border: "1px solid #262626",
};

const userInfoRow = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const avatarStyle = {
  width: "36px",
  height: "36px",
  borderRadius: "6px",
  backgroundColor: "#2d1a4d",
  color: "#c4a0ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "14px",
  fontWeight: "600",
};

const userNameStyle = {
  fontSize: "14px",
  fontWeight: "500",
  color: "#e5e5e5",
};

const userRoleStyle = {
  fontSize: "11px",
  color: "#737373",
  textTransform: "capitalize",
};

const userStatusStyle = {
  fontSize: "11px",
  color: "#737373",
  display: "flex",
  alignItems: "center",
  gap: "5px",
};

const statusDotStyle = {
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  display: "inline-block",
};

const onlineDotStyle = {
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  backgroundColor: "#22c55e",
  display: "inline-block",
  marginRight: "4px",
};

const statusBadgeStyle = {
  display: "flex",
  alignItems: "center",
  gap: "4px",
  padding: "4px 10px",
  borderRadius: "4px",
  backgroundColor: "#052e16",
  border: "1px solid #166534",
  color: "#22c55e",
  fontSize: "11px",
  fontWeight: "500",
};

const kickButtonStyle = {
  padding: "6px 12px",
  borderRadius: "4px",
  border: "1px solid #7f1d1d",
  backgroundColor: "#450a0a",
  color: "#fca5a5",
  fontSize: "11px",
  fontWeight: "500",
  cursor: "pointer",
};

const approveButtonStyle = {
  padding: "6px 12px",
  borderRadius: "4px",
  border: "none",
  backgroundColor: "#581c87",
  color: "#f5f5f5",
  fontSize: "11px",
  fontWeight: "500",
  cursor: "pointer",
};

const secondaryButtonStyle = {
  marginTop: "10px",
  padding: "8px 14px",
  borderRadius: "5px",
  border: "1px solid #404040",
  backgroundColor: "transparent",
  color: "#737373",
  fontSize: "12px",
  cursor: "pointer",
};

const emptyStateStyle = {
  textAlign: "center",
  padding: "28px 16px",
  color: "#525252",
};

export default SuperAdmin;
