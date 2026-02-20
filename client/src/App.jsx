import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import SuperAdmin from "./pages/SuperAdmin";
import Admin from "./pages/Admin";
import ChatRoom from "./pages/ChatRoom";
import Broadcast from "./pages/Broadcast";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/super-admin" element={<SuperAdmin />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/chat" element={<ChatRoom />} />
        <Route path="/broadcast" element={<Broadcast />} />
      </Routes>
    </Router>
  );
}

export default App;