import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MessageSquare,
  ShieldAlert,
  Radio,
  Settings,
  ArrowRight,
  Globe,
  Zap
} from "lucide-react";
import "../styles/global.css";
import logo from "../assets/logo.png";

const navItems = [
  {
    title: "Join Chat",
    description: "Connect to live rooms with a simple code",
    link: "/chat",
    icon: <MessageSquare size={24} />,
    color: "#a78bfa"
  },
  {
    title: "Admin Panel",
    description: "Moderate messages and manage room flow",
    link: "/admin",
    icon: <ShieldAlert size={24} />,
    color: "#3b82f6"
  },
  {
    title: "Live Broadcast",
    description: "Real-time viewer for approved messages",
    link: "/broadcast",
    icon: <Radio size={24} />,
    color: "#ef4444"
  },
  {
    title: "Super Admin",
    description: "Core infrastructure and user control",
    link: "/super-admin",
    icon: <Settings size={24} />,
    color: "#f59e0b"
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

export default function Home() {
  return (
    <div className="home-container">
      <div className="bg-mesh" />
      <div className="bg-grid" />

      <motion.main
        className="home-content"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Hero Section */}
        <div className="hero-section">
          <motion.div variants={itemVariants} className="badge-container">
            <div className="hero-badge">
              <Zap size={14} className="animate-pulse-slow" />
              <span>NEXUS v1.0 • Live Infrastructure</span>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="logo-section">
            <div className="logo-glow" />
            <div className="logo-box">
              <img src={logo} alt="Nexus Logo" className="brand-logo-img" />
            </div>
          </motion.div>

          <motion.h1 variants={itemVariants} className="hero-title">
            NEXUS <span className="text-gradient">CONNECT</span>
          </motion.h1>

          <motion.p variants={itemVariants} className="hero-subtitle">
            Experience real-time communication at scale. Authorized, moderated, and lightning-fast.
          </motion.p>
        </div>

        {/* Navigation Grid */}
        <div className="nav-grid">
          {navItems.map((item, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Link to={item.link} className="nav-card-link">
                <div className="glass-card nav-card">
                  <div className="nav-card-content">
                    <div className="icon-wrapper" style={{ color: item.color }}>
                      {item.icon}
                    </div>
                    <div className="text-wrapper">
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                  </div>
                  <div className="nav-card-footer">
                    <span className="launch-text">Launch</span>
                    <ArrowRight size={16} className="arrow-icon" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <motion.footer variants={itemVariants} className="home-footer">
          <div className="footer-line" />
          <div className="footer-content">
            <span>&copy; 2026 NEXUS PROTOCOL</span>
            <span className="dot">•</span>
            <span>Professional Enterprise Engineering</span>
          </div>
        </motion.footer>
      </motion.main>

      <style>{`
        .home-container {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 80px 24px;
          overflow: hidden;
          position: relative;
        }

        .home-content {
          width: 100%;
          max-width: 900px;
          z-index: 10;
        }

        .hero-section {
          text-align: center;
          margin-bottom: 64px;
        }

        .badge-container {
          display: flex;
          justify-content: center;
          margin-bottom: 24px;
        }

        .hero-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          background: rgba(139, 92, 246, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 100px;
          color: #a78bfa;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .logo-section {
          position: relative;
          display: inline-block;
          margin-bottom: 24px;
        }

        .logo-box {
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brand-logo-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .logo-glow {
          position: absolute;
          inset: -10px;
          background: var(--primary);
          filter: blur(20px);
          opacity: 0.3;
          border-radius: 20px;
        }

        .hero-title {
          font-size: clamp(32px, 6vw, 56px);
          font-weight: 800;
          color: white;
          letter-spacing: -0.04em;
          margin-bottom: 16px;
        }

        .text-gradient {
          background: linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-subtitle {
          font-size: clamp(16px, 2vw, 19px);
          color: var(--text-secondary);
          max-width: 600px;
          margin: 0 auto;
        }

        .nav-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-bottom: 48px;
        }

        @media (max-width: 640px) {
          .nav-grid {
            grid-template-columns: 1fr;
          }
        }

        .nav-card-link {
          text-decoration: none;
          display: block;
        }

        .nav-card {
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 24px;
          position: relative;
          overflow: hidden;
          transition: var(--transition-base);
        }

        .nav-card:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.15);
          transform: translateY(-4px);
        }

        .nav-card-content {
          display: flex;
          gap: 20px;
          margin-bottom: 24px;
        }

        .icon-wrapper {
          width: 48px;
          height: 48px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .text-wrapper h3 {
          font-size: 18px;
          font-weight: 600;
          color: white;
          margin-bottom: 4px;
        }

        .text-wrapper p {
          font-size: 14px;
          color: var(--text-muted);
          line-height: 1.4;
        }

        .nav-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .launch-text {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-muted);
          transition: var(--transition-base);
        }

        .arrow-icon {
          color: var(--text-muted);
          transition: var(--transition-base);
        }

        .nav-card:hover .launch-text {
          color: white;
        }

        .nav-card:hover .arrow-icon {
          transform: translateX(4px);
          color: white;
        }

        .home-footer {
          text-align: center;
        }

        .footer-line {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          margin-bottom: 24px;
        }

        .footer-content {
          font-size: 14px;
          color: var(--text-muted);
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
        }

        .dot {
          opacity: 0.3;
        }

        @media (max-width: 480px) {
          .home-container { padding: 40px 20px; }
          .hero-section { margin-bottom: 40px; }
          .hero-title { font-size: 32px; }
          .hero-subtitle { font-size: 14px; }
          .logo-box { width: 64px; height: 64px; }
          .logo-box img { width: 100%; height: 100%; }
          .nav-card { padding: 16px; }
          .nav-card-content { gap: 12px; margin-bottom: 16px; }
          .icon-wrapper { width: 40px; height: 40px; border-radius: 10px; }
          .icon-wrapper svg { width: 20px; height: 20px; }
          .text-wrapper h3 { font-size: 16px; }
          .text-wrapper p { font-size: 13px; }
          .footer-content { font-size: 11px; gap: 8px; }
        }
      `}</style>
    </div>
  );
}
