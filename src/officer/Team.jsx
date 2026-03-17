// src/pages/TeamDashboard.jsx
import React, { useEffect, useState, useCallback } from "react";
import "./team.css";
import TeamChatAssistant from "./TeamChatAssistant.jsx";

// Use 127.0.0.1 to match admin panel BASE
const API_BASE_URL = "http://127.0.0.1:5006";

const TeamDashboard = () => {
  // Team name should be set at login and saved to localStorage:
  // localStorage.setItem('team', 'team1') for team 1 members
  const [teamName] = useState(localStorage.getItem("team") || "team1");
  const [memberName] = useState(localStorage.getItem("memberName") || "Team Member");

  const [complaints, setComplaints] = useState([]);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchAssignedComplaints = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_BASE_URL}/assigned-complaints/${encodeURIComponent(teamName)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch complaints");
      }

      setComplaints(Array.isArray(data) ? data : []);
      if (data && data.length > 0) {
        setSelectedComplaint(data[0]);
      } else {
        setSelectedComplaint(null);
      }
    } catch (err) {
      console.error("Error fetching assigned complaints:", err);
      setError(err.message || "Error loading complaints");
      setComplaints([]);
      setSelectedComplaint(null);
    } finally {
      setLoading(false);
    }
  }, [teamName]);

  // initial load + polling every 30s so team sees newly assigned tasks
  useEffect(() => {
    fetchAssignedComplaints();

    const id = setInterval(() => {
      fetchAssignedComplaints();
    }, 30000); // 30 seconds

    return () => clearInterval(id);
  }, [fetchAssignedComplaints]);

  const handleSelectComplaint = (complaint) => {
    setSelectedComplaint(complaint);
  };

  const formatDate = (val) => {
    if (!val) return "-";
    try {
      return new Date(val).toLocaleString();
    } catch {
      return val;
    }
  };

  return (
    <div className="team-page">
      {/* Top GOV-like header */}
      <div className="gov-topbar">
        <div className="gov-left">
          <img src="/assets/gov-emblem.png" alt="Emblem" className="gov-emblem" />
          <div className="gov-text">
            <div className="gov-line1">GOVERNMENT OF INDIA / MINISTRY OF HOME AFFAIRS</div>
            <div className="gov-line2">National Cyber Crime Reporting Portal</div>
          </div>
        </div>

        <div className="gov-right">
          <select className="lang-select" defaultValue="en">
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
          </select>
          <button className="login-btn" onClick={() => window.location.href = "/login"}>Login</button>
        </div>
      </div>

      {/* Navigation bar */}
      <nav className="gov-nav">
        <a href="/">Home</a>
        <a href="/register">Register a Complaint</a>
        <a href="/track">Track Your Complaint</a>
        <a href="/report">Report & Check Suspect</a>
        <a href="/volunteer" className="active">Cyber Volunteers</a>
        <a href="/learning">Learning Corner</a>
        <a href="/contact">Contact Us</a>
      </nav>

      {/* Hero banner */}
      <header className="hero-banner">
        <div className="hero-inner">
          <div className="hero-left">
            <h1>Join Our Cyber Volunteer Program</h1>
            <p>Contribute to a safer digital world. Your expertise can make a difference in national cyber security.</p>
          </div>

          <div className="hero-cta">
            <button
              className="join-btn"
              onClick={() => {
                // example action - navigate to volunteer form or register
                window.location.href = "/volunteer/register";
              }}
            >
              JOIN US
            </button>
          </div>
        </div>
      </header>

      {/* Main content container */}
      <div className="content-wrap">
        <div className="content-inner">
          <aside className="left-panel">
            <div className="left-header">
              <h3>Team Panel</h3>
              <div className="left-sub">Welcome, <span className="member-name">{memberName}</span></div>
              <div className="team-tag">{teamName}</div>
            </div>

            <div className="list-actions">
              <button className="btn small" onClick={fetchAssignedComplaints}>Refresh</button>
            </div>

            <h4 className="section-title">Assigned Cases</h4>

            <div className="case-list">
              {loading && <div className="muted">Loading cases...</div>}
              {error && <div className="error">{error}</div>}
              {!loading && complaints.length === 0 && !error && (
                <div className="muted">No complaints assigned to your team yet.</div>
              )}

              <ul>
                {complaints.map((c) => (
                  <li
                    key={c.complaint_id}
                    className={selectedComplaint && selectedComplaint.complaint_id === c.complaint_id ? "case-item active" : "case-item"}
                    onClick={() => handleSelectComplaint(c)}
                  >
                    <div className="case-top">
                      <div className="case-id">{c.complaint_id}</div>
                      <div className={`case-badge ${((c.risk_level || "low").toString()).toLowerCase()}`}>{c.risk_level || "low"}</div>
                    </div>
                    <div className="case-type">{c.attack_type || c.category || "—"}</div>
                    <div className="case-summary">{c.ai_summary || (c.scenario && c.scenario.slice(0, 90)) || "No summary available"}</div>
                    <div className="case-meta">Created: {formatDate(c.created_at)}</div>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <main className="right-panel">
            {selectedComplaint ? (
              <>
                <div className="case-detail-card">
                  <div className="card-header">
                    <h2>Case Brief</h2>
                    <div className="status-block">{selectedComplaint.status || "pending"}</div>
                  </div>

                  <div className="detail-grid">
                    <div className="detail-col">
                      <label>Complaint ID</label>
                      <div>{selectedComplaint.complaint_id}</div>
                    </div>
                    <div className="detail-col">
                      <label>Risk Level</label>
                      <div className={`pill ${((selectedComplaint.risk_level || "low").toString()).toLowerCase()}`}>{selectedComplaint.risk_level || "low"}</div>
                    </div>
                    <div className="detail-col">
                      <label>Attack Type</label>
                      <div>{selectedComplaint.attack_type || selectedComplaint.category || "-"}</div>
                    </div>
                    <div className="detail-col">
                      <label>Assigned Team</label>
                      <div>{selectedComplaint.assigned_team || teamName}</div>
                    </div>
                    <div className="detail-col">
                      <label>Created At</label>
                      <div>{formatDate(selectedComplaint.created_at)}</div>
                    </div>
                  </div>

                  {selectedComplaint.ai_summary && (
                    <div className="summary-box">
                      <h4>AI Summary</h4>
                      <p>{selectedComplaint.ai_summary}</p>
                    </div>
                  )}

                  <div className="long-block">
                    <h4>User Scenario</h4>
                    <p>{selectedComplaint.scenario || "No scenario provided."}</p>

                    <h4>Additional Info</h4>
                    <p>{selectedComplaint.additional_info || selectedComplaint.additionalInfo || "No additional info."}</p>

                    {selectedComplaint.user_info && (
                      <>
                        <h4>Victim Details</h4>
                        <p><strong>Name:</strong> {selectedComplaint.user_info.name || "-"}</p>
                        <p><strong>Email:</strong> {selectedComplaint.user_info.email || "-"}</p>
                        <p><strong>Phone:</strong> {selectedComplaint.user_info.phone || "-"}</p>
                        <p><strong>Address:</strong> {selectedComplaint.user_info.address || "-"}</p>
                      </>
                    )}

                    {selectedComplaint.analysis_results && Object.keys(selectedComplaint.analysis_results || {}).length > 0 && (
                      <>
                        <h4>Technical Analysis (Raw)</h4>
                        <pre className="json-block">{JSON.stringify(selectedComplaint.analysis_results, null, 2)}</pre>
                      </>
                    )}
                  </div>
                </div>

                <div className="assistant-card">
                  <h3>AI Assistance for This Case</h3>
                  <p className="muted">Ask how to proceed, what checks to do next, and how to close the case safely.</p>

                  <div className="assistant-area">
                    <TeamChatAssistant
                      complaintId={selectedComplaint.complaint_id}
                      attackType={selectedComplaint.attack_type || "general"}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-main">
                <h2>Select a case to view details</h2>
                <p className="muted">Choose a complaint from the left panel to see its full details and get AI guidance.</p>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Footer (simple) */}
      <footer className="gov-footer">
        <div>© Government of India — National Cyber Crime Reporting Portal</div>
      </footer>
    </div>
  );
};

export default TeamDashboard;
