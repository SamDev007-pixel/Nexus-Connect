import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SuperAdmin from "./pages/SuperAdmin";
import Admin from "./pages/Admin";
import ChatRoom from "./pages/ChatRoom";
import Broadcast from "./pages/Broadcast";
import Layout from "./components/Layout";

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<SuperAdmin />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/chat" element={<ChatRoom />} />
          <Route path="/broadcast" element={<Broadcast />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
