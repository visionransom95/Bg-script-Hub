/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Download from "./pages/Download";
import Info from "./pages/Info";
import Contact from "./pages/Contact";
import History from "./pages/History";
import Admin from "./pages/Admin";

export default function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-[#f5f5f4] text-[#0a0a0a] font-sans">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/download" element={<Download />} />
            <Route path="/history" element={<History />} />
            <Route path="/info" element={<Info />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}
