<div align="center">

# 🎥 Live Broadcast & Moderated Chat System

[![Node.js](https://img.shields.io/badge/Node.js-18.x-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.x-blue?style=for-the-badge&logo=react)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.x-green?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-black?style=for-the-badge&logo=socket.io)](https://socket.io/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-gray?style=for-the-badge&logo=express)](https://expressjs.com/)

A production-ready real-time live broadcast platform with moderated chat functionality, built with modern web technologies.

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Socket Events](#socket-events)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Security](#security)
- [UI Theme](#ui-theme)
- [Future Enhancements](#future-enhancements)
- [Contributing](#contributing)
- [License](#license)

---

## 📖 Overview

This system provides a comprehensive real-time broadcast platform with advanced moderation capabilities. It enables seamless communication between users, administrators, and broadcasters through a carefully designed role-based workflow.

### Core Workflow

```
┌─────────────┐     Request Access      ┌─────────────┐
│    User     │ ──────────────────────► │ Super Admin │
└─────────────┘                        └──────┬──────┘
                                              │
                                         Approve/Remove
                                              │
     View Approved                            ▼
◄────────────────────────────────────────────────┐
│                                                │
│  ┌─────────────┐     Send Message    ┌─────────┴──────┐
│  │   Broadcast │ ◄─────────────────── │      Admin     │
│  │   Screen    │    Approve Message   │  (Moderator)   │
│  └─────────────┘                      └────────────────┘
└──────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

### 👑 Super Admin
| Feature | Description |
|---------|-------------|
| Room Management | Create and delete broadcast rooms |
| User Management | Approve or remove users from rooms |
| User Dashboard | View pending and active users in real-time |

### 👨‍💻 Users (Participants)
| Feature | Description |
|---------|-------------|
| Room Access | Request access to join rooms |
| Messaging | Send messages after approval |
| Auto Session | Automatic session restoration on page refresh |

### 🛡 Admin (Moderator)
| Feature | Description |
|---------|-------------|
| Message Queue | View all pending messages |
| Moderation | Approve or delete messages |
| Real-time Updates | Instant synchronization with broadcast screen |

### 📺 Broadcast Screen
| Feature | Description |
|---------|-------------|
| Approved Messages | Display only admin-approved messages |
| Live Updates | Real-time message streaming |
| Clean UI | Distraction-free presentation layout |

---

## 🛠 Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React.js | 18.x | User Interface |
| Socket.IO Client | 4.x | Real-time Communication |
| Axios | ^1.6.x | HTTP Client |
| Vite | 5.x | Build Tool |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18.x | Runtime Environment |
| Express.js | 4.x | Web Framework |
| MongoDB | 6.x | Database |
| Mongoose | 8.x | ODM |
| Socket.IO | 4.x | Real-time Engine |

---

## 📂 Project Structure

```
AWS-Cloud-Connect/
├── server/                      # Backend Application
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js            # Database Configuration
│   │   ├── middleware/          # Express Middleware
│   │   ├── models/              # Mongoose Models
│   │   │   ├── User.js
│   │   │   ├── Room.js
│   │   │   └── Message.js
│   │   ├── routes/              # API Routes
│   │   │   ├── roomRoutes.js
│   │   │   └── messageRoutes.js
│   │   ├── socket/
│   │   │   └── socketHandler.js # Socket.IO Handlers
│   │   └── index.js             # Server Entry Point
│   └── package.json
│
├── client/                      # Frontend Application
│   ├── src/
│   │   ├── assets/              # Static Assets
│   │   ├── components/          # Reusable Components
│   │   │   ├── GlassCard.jsx
│   │   │   └── Layout.jsx
│   │   ├── pages/               # Page Components
│   │   │   ├── Admin.jsx
│   │   │   ├── Broadcast.jsx
│   │   │   ├── ChatRoom.jsx
│   │   │   └── SuperAdmin.jsx
│   │   ├── styles/              # CSS Files
│   │   │   ├── global.css
│   │   │   ├── glass.css
│   │   │   └── variables.css
│   │   ├── App.jsx              # Root Component
│   │   └── main.jsx             # Client Entry Point
│   └── package.json
│
└── README.md
```

---

## 🏗 Architecture

### Design Pattern

| Layer | Technology | Responsibility |
|-------|------------|----------------|
| Presentation | React.js | User Interface |
| API | Express.js REST | Business Logic |
| Real-time | Socket.IO | Live Updates |
| Data | MongoDB | Persistence |

### Data Flow

```
User Action → REST API → MongoDB → Socket Emit → Client Update
```

### Session Management

| Role | Storage | Purpose |
|------|---------|---------|
| Super Admin | localStorage | Persistent admin session |
| Broadcast | localStorage | Public display session |
| Chat User | sessionStorage | Temporary user session |

---

## 🗄 Database Schema

### User Model

```
javascript
{
  username: String,        // User's display name
  role: String,            // 'superadmin' | 'admin' | 'user'
  room: String,            // Associated room code
  status: String,          // 'pending' | 'approved'
  createdAt: Date          // Registration timestamp
}
```

### Room Model

```
javascript
{
  name: String,            // Room display name
  roomCode: String,        // Unique room identifier
  createdAt: Date          // Creation timestamp
}
```

### Message Model

```
javascript
{
  room: String,            // Associated room code
  sender: String,          // Sender's username
  content: String,         // Message text
  status: String,          // 'pending' | 'approved'
  createdAt: Date          // Message timestamp
}
```

---

## 🔌 API Reference

### Room Endpoints

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| POST | `/api/rooms/create` | Create a new room | `{ name, roomCode }` |
| POST | `/api/rooms/join` | Join a room | `{ username, roomCode }` |
| GET | `/api/rooms/:roomCode/pending-users` | Get pending users | - |
| GET | `/api/rooms/:roomCode/active-users` | Get approved users | - |
| PATCH | `/api/rooms/approve-user/:userId` | Approve a user | - |
| DELETE | `/api/rooms/remove-user/:userId` | Remove a user | - |

### Message Endpoints

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| DELETE | `/api/messages/delete/:messageId` | Delete a message | - |

---

## 📡 Socket Events

### Connection Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join_room` | Client → Server | Join a specific room |

### Message Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `send_message` | Client → Server | Send new message |
| `receive_message` | Server → Client | Broadcast message to room |
| `new_pending_message` | Server → Client | Notify admin of new message |
| `approve_message` | Server → Client | Confirm message approval |
| `broadcast_message` | Server → Client | Send to broadcast screen |

### Room Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `delete_room` | Client → Server | Delete a room |
| `room_deleted` | Server → Client | Notify room deletion |

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:

- **Node.js** (v18.x or higher)
- **npm** or **yarn**
- **MongoDB** (local or Atlas)

### Installation

#### 1. Clone the Repository

```
bash
git clone <repository-url>
cd AWS-Cloud-Connect
```

#### 2. Backend Setup

```
bash
cd server
npm install
```

#### 3. Frontend Setup

```
bash
cd client
npm install
```

#### 4. Configure Environment

Create a `.env` file in the `server` directory:

```
env
PORT=5001
MONGO_URI=your_mongodb_connection_string
```

#### 5. Start the Application

**Terminal 1 - Backend:**
```
bash
cd server
npm start
```

**Terminal 2 - Frontend:**
```
bash
cd client
npm run dev
```

---

## 🔧 Environment Variables

### Server (.env)
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port number | `5001` | Yes |
| `MongoDB Connection String` | MongoDB URI | - | Yes |

### Client (.env)
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_SERVER_URL` | Backend server URL | `http://localhost:5001` | Yes (for production) |

---

## 🚀 Deployment Guide

### Prerequisites
- MongoDB Atlas account (or self-hosted MongoDB)
- Vercel account (for frontend)
- Render account (for backend)

### Step 1: Deploy Backend to Render

1. Push your code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Create a new **Web Service**
4. Connect your GitHub repository
5. Configure:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. Add Environment Variables:
   - `MONGO_URI`: Your MongoDB Atlas connection string
   - `PORT`: `443` (Render requires this)
7. Click **Create Web Service**

### Step 2: Deploy Frontend to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Import your GitHub repository
3. Configure:
   - **Root Directory**: `client`
   - **Framework Preset**: `Vite`
4. Add Environment Variables:
   - `VITE_SERVER_URL`: Your Render backend URL (e.g., `https://your-app.onrender.com`)
5. Click **Deploy**

### Step 3: Update MongoDB Network Access

If using MongoDB Atlas:
1. Go to **Network Access** in MongoDB Atlas
2. Add IP `0.0.0.0/0` to allow all IPs (or add Render's IP range)

### Step 4: Test Your Deployment

- Visit your Vercel URL
- Create a room as Super Admin
- Test real-time functionality

---

## 🔧 Quick Production URLs Update

If you need to hardcode URLs instead of using environment variables:

**Client files to update:**
- `client/src/pages/SuperAdmin.jsx`
- `client/src/pages/ChatRoom.jsx`
- `client/src/pages/Admin.jsx`
- `client/src/pages/Broadcast.jsx`

Change:
```
javascript
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5001";
```
To:
```
javascript
const SERVER_URL = "https://your-render-backend.onrender.com";
```

---

## 🔒 Security Recommendations

For production deployment, consider implementing:

- [ ] JWT Authentication
- [ ] Role-based Access Control (RBAC)
- [ ] Rate Limiting
- [ ] Input Validation & Sanitization
- [ ] HTTPS/TLS Encryption
- [ ] Environment-based Configuration
- [ ] Process Management (PM2)
- [ ] API Rate Throttling

---

## 🎨 UI Theme

| Element | Description |
|---------|-------------|
| Color Scheme | Dark Purple + Black |
| Design Style | Glassmorphism |
| Layout | Minimal, Clean |
| Chat Style | Discord-inspired |
| Broadcast Style | Twitch-inspired |

---

## 📦 Future Enhancements

- [ ] Real-time active user counter
- [ ] Online/offline user indicators
- [ ] Message reactions
- [ ] Typing indicator
- [ ] Admin analytics dashboard
- [ ] Multi-room support
- [ ] AWS deployment configuration
- [ ] CDN integration for broadcast scaling

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

This project is for educational and demonstration purposes.

---

## 👨‍💻 Author

**Sam**  
Computer Science & Engineering  

---

<div align="center">

**⭐ Star this repository if you found it helpful!**

</div>
