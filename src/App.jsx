// src/App.jsx
import React from "react";
import TopBar from './components/TopBar';
import Header from './components/Header';
import NavBar from './components/NavBar';
import NewsTicker from './components/NewsTicker';
import HeroCarousel from './components/HeroCarousel';
import MainContent from './components/MainContent';
import Footer from './components/Footer';

import { Routes, Route } from "react-router-dom";
import Complaint from "./pages/complaint";
import TrackComplaint from "./pages/TrackComplaint";
import Report from "./pages/Report";
import Volunteer from "./pages/Volunteer";
import Learning from "./pages/Learning";

import ProblemCategories from "./pages/ProblemCategories";
import Women from "./pages/Women";
import Login from "./pages/Login";
import AdminDashboard from "./officer/AdminDashboard";
import AdminLogin from "./officer/AdminLogin";
import MemberLogin from "./officer/MemberLogin";
import MemberDashboard from "./officer/MemberDashboard";
import Team from "./officer/Team";
import TeamChatAssistantd from "./officer/TeamChatAssistant";

// Home page content component


function HomeContent() {
  return (
    <>
      <NewsTicker />
      <HeroCarousel />
      <MainContent />
    </>
  );
}

export default function App() {
  return (
    <>
      {/* persistent header area */}
      <TopBar />
      <Header />
      <NavBar />

      {/* routed content appears here */}
      <main>
        <Routes>
          {/* Home page */}
          <Route path="/" element={<HomeContent />} />

          {/* Complaint page (single route) */}
          <Route path="/complaint" element={<Complaint />} />
          <Route path="/problem-categories" element={<ProblemCategories />} />
          <Route path="/women" element={<Women />} />

          {/* Track Complaint page */}
          <Route path="/trackcomplaint" element={<TrackComplaint />} />
          <Route path="/Report" element={<Report />} />
          <Route path="/Volunteer" element={<Volunteer />} />
          <Route path="/Learning" element={<Learning />} />

          {/* Alias for older links that still point to /combined */}
          <Route path="/combined" element={<Complaint />} />

          {/* Officer/Admin Routes */}
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/member-login" element={<MemberLogin />} />
          <Route path="/member-dashboard" element={<MemberDashboard />} />
          <Route path="/Login" element={<Login  />} />
          <Route path="/Team" element={<Team />} />
          <Route path="/TeamChatAssistant" element={<TeamChatAssistantd />} />

          {/* Simple 404 fallback */}
          <Route
            path="*"
            element={
              <div style={{ padding: 24 }}>
                <h2>404 — Page not found</h2>
                <p>
                  The page you requested doesn't exist. <a href="/">Go to Home</a>
                </p>
              </div>
            }
          />
        </Routes>
      </main>

      {/* persistent footer */}
      <Footer />
    </>
  );
}
