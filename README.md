# 📡 NEXUS - Real-Time Communication & Moderation System
### 🎓 Internship Capstone Project

NEXUS is a full-stack real-time communication platform developed as part of an **internship project**. It demonstrates the integration of modern web technologies to solve real-world challenges in synchronizing data across multiple user roles.

---

## 📝 Project Overview
The objective of this project was to build a secure, role-based messaging system where communication is strictly moderated. This project explores the implementation of **WebSockets** for real-time updates and **NoSQL databases** for persistent message storage.

### 🚀 Key Features Implemented:
- **Role-Based Access Control (RBAC):** Distinct interfaces for Users, Admins, and SuperAdmins.
- **Moderation Pipeline:** A system where user messages must be authorized by an admin before appearing on the public broadcast.
- **Real-Time Synchronization:** Instant data delivery using Socket.io, ensuring zero-latency updates across all terminals.
- **Identity Persistence:** A custom logic to ensure sender information is preserved in the history even after a user disconnects.
- **Modern UI/UX:** A glassmorphic design system focusing on premium aesthetics and responsive layouts.

---

## 🏗️ System Architecture
This project follows a decoupled **Client-Server Architecture**:

### **Frontend (The Client)**
- Built with **React** and **Vite**.
- Uses **Framer Motion** for interactive animations.
- Implements **Axios** for RESTful API communication.
- Uses **Socket.io-client** for persistent real-time connections.

### **Backend (The Server)**
- Built with **Java** using the **Spring Boot** framework.
- **Spring Data MongoDB** handles communication with the NoSQL database.
- **Netty-SocketIO** provides a high-performance WebSocket server optimized for Java.

### **Database**
- **MongoDB** is used to store Room configurations, User profiles, and Message history.

---

## 🛠️ Tech Stack Used
- **Frontend:** React, JavaScript (ES6+), CSS3 (Glassmorphism), Lucide Icons.
- **Backend:** Java 17, Spring Boot, Maven.
- **Database:** MongoDB.
- **Communication:** Socket.io (WebSockets).

---

## 📖 Educational Learnings
Developing this project provided deep insights into:
1. **Asynchronous Programming:** Managing real-time events and state synchronization in a multi-user environment.
2. **Database Modeling:** Designing flexible NoSQL schemas for chat and moderation logs.
3. **Security Logic:** Implementing role-based gatekeeping (SuperAdmin → Admin → User).
4. **Clean Code & Refactoring:** optimizing production builds and handling linter-driven code quality.

---

## ⚙️ How to Run Locally

### 1. Prerequisites
- **JDK 17** or higher
- **Node.js & npm**
- **MongoDB** (Local instance or Atlas connection string)
- **Maven** (for Java building)

### 2. Backend Setup
1. Navigate to `backend-java/`.
2. Configure your MongoDB URI in `src/main/resources/application.properties`.
3. Build and run:
   ```bash
   mvn clean package
   mvn spring-boot:run
   ```

### 3. Frontend Setup
1. Navigate to `client/`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Update the API and Socket URLs in `src/config.js` to point to your local backend.
4. Start the development server:
   ```bash
   npm run dev
   ```

---

## ⚠️ Disclaimer
This project was developed for **educational and internship purposes** only. It is not intended for commercial use. All branding and assets are part of the internship learning track.
