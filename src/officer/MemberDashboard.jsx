// src/pages/MemberDashboard.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import "./MemberDashboard.css";

export default function MemberDashboard() {
  // prefer localStorage team, but allow override
  const initialTeam = (localStorage.getItem("team") || "").trim();
  const [team, setTeam] = useState(initialTeam);
  const [members, setMembers] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [activeMenu, setActiveMenu] = useState("complaints");
  const [loading, setLoading] = useState(false);
  const [rawResponse, setRawResponse] = useState(null);
  const BASE = "http://localhost:5006";

  useEffect(() => {
    if (team) {
      fetchMembers();
      fetchComplaints();
    }
    // optional polling to pick up new assignments
    const id = setInterval(() => {
      if (team) fetchComplaints();
    }, 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line
  }, [team]);

  const saveTeamToLocal = (t) => {
    const trimmed = (t || "").trim();
    setTeam(trimmed);
    if (trimmed) localStorage.setItem("team", trimmed);
    else localStorage.removeItem("team");
  };

  const fetchMembers = async () => {
    try {
      const res = await axios.get(`${BASE}/team-members/${encodeURIComponent(team)}`);
      // expected shape: { team: "TeamName", members: [...] }
      const ms = Array.isArray(res.data.members) ? res.data.members : (Array.isArray(res.data) ? res.data : []);
      setMembers(ms);
    } catch (err) {
      console.error("fetchMembers error:", err);
      setMembers([]);
    }
  };

  const fetchComplaints = async () => {
    if (!team) {
      setRawResponse(null);
      setComplaints([]);
      return;
    }
    try {
      setLoading(true);
      const res = await axios.get(`${BASE}/assigned-complaints/${encodeURIComponent(team)}`);
      // Save raw response for debugging (use dev only)
      setRawResponse({ status: res.status, data: res.data });
      // Backend returns an array of complaints sometimes; handle both shapes
      const payload = res.data;
      let items = [];
      if (Array.isArray(payload)) {
        items = payload;
      } else if (Array.isArray(payload.complaints)) {
        items = payload.complaints;
      } else if (payload && typeof payload === "object") {
        // maybe the backend returned an object keyed by complaint id
        items = Object.values(payload);
      }
      setComplaints(items);
    } catch (err) {
      console.error("fetchComplaints error:", err);
      setRawResponse({ error: err.toString(), response: err.response?.data || null });
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessing = async (index) => {
    const c = complaints[index];
    const todayWork = (c.todayWork || "").trim();
    if (!todayWork) return alert("Enter today's work update");
    try {
      await axios.post(`${BASE}/update-processing`, {
        complaint_id: c.complaint_id,
        team,
        today_work: todayWork,
      });
      alert("Processing updated and status set to processing");
      fetchComplaints();
    } catch (err) {
      console.error(err);
      alert("Failed to update processing");
    }
  };

  const handleComplete = async (index) => {
    const c = complaints[index];
    const reportFile = c.reportFile;
    if (!reportFile) return alert("Attach a completion report");

    const formData = new FormData();
    formData.append("complaint_id", c.complaint_id);
    formData.append("team", team);
    formData.append("report", reportFile);

    try {
      await axios.post(`${BASE}/complete-complaint`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Complaint marked complete");
      fetchComplaints();
    } catch (err) {
      console.error(err);
      alert("Failed to complete complaint");
    }
  };

  return (
    <div className="member-dashboard">
      <aside className="sidebar">
        <h2 className="logo">Team: {team || "Unassigned"}</h2>

        <div style={{ padding: 12 }}>
          <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Your Team (edit if incorrect)</label>
          <input
            type="text"
            placeholder="Enter exact team name (e.g., Phishing Team)"
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            style={{ width: "100%", marginBottom: 8 }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => saveTeamToLocal(team)} className="btn">Save Team</button>
            <button onClick={() => { setTeam(""); localStorage.removeItem("team"); }} className="btn outline">Clear</button>
            <button onClick={() => fetchComplaints()} className="btn small">Refresh</button>
          </div>
        </div>

        <button className={activeMenu === "members" ? "menu active" : "menu"} onClick={() => setActiveMenu("members")}>
          👥 Members
        </button>
        <button className={activeMenu === "complaints" ? "menu active" : "menu"} onClick={() => setActiveMenu("complaints")}>
          📝 Complaints
        </button>
      </aside>

      <main className="content">
        {activeMenu === "members" && (
          <div className="card fade-in">
            <h3>Team Members</h3>
            {members.length === 0 ? <p>No members found for this team.</p> : (
              <ul>
                {members.map((m) => (
                  <li key={m._id} className="member-item">
                    <strong>{m.name}</strong> — {m.email}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeMenu === "complaints" && (
          <div className="card fade-in">
            <h3>Assigned Complaints {loading ? "(loading...)" : ""}</h3>

            {!team && (
              <div style={{ background: "#fffbe6", padding: 12, borderRadius: 6, marginBottom: 12 }}>
                <b>No team selected.</b> Enter the exact team name above and press <i>Save Team</i> then <i>Refresh</i>.
              </div>
            )}

            {team && complaints.length === 0 && !loading && (
              <div>
                <p>No complaints assigned to <b>{team}</b>.</p>
                <p style={{ fontSize: 12, color: "#666" }}>
                  Tip: confirm the admin assigned the case to <b>{team}</b> exactly (no extra spaces / casing differences).
                </p>
              </div>
            )}

            {complaints.map((c, i) => (
              <details key={i} className="details-box">
                <summary>
                  {c.complaint_id} — {c.category || c.attack_type || "-"} 
                  <span className={`status ${c.status}`}>{c.status || "pending"}</span>
                </summary>
                <div className="details-content">
                  <p><b>Email:</b> {c.email}</p>
                  <p><b>Phone:</b> {c.phone}</p>
                  <p><b>Category / Type:</b> {c.category || c.attack_type || "-"}</p>
                  <p><b>Additional Info:</b> {c.additionalInfo || c.scenario || "-"}</p>

                  {c.status !== "completed" && (
                    <div className="update-work">
                      <input
                        type="text"
                        placeholder="Today's Work"
                        value={c.todayWork || ""}
                        onChange={(e) => {
                          const newComplaints = [...complaints];
                          newComplaints[i].todayWork = e.target.value;
                          setComplaints(newComplaints);
                        }}
                      />
                      <button className="processing-btn" onClick={() => handleProcessing(i)}>
                        Processing
                      </button>

                      <input
                        type="file"
                        onChange={(e) => {
                          const newComplaints = [...complaints];
                          newComplaints[i].reportFile = e.target.files[0];
                          setComplaints(newComplaints);
                        }}
                      />
                      <button className="complete-btn" onClick={() => handleComplete(i)}>
                        Complete
                      </button>
                    </div>
                  )}

                  {c.daily_updates && c.daily_updates.length > 0 && (
                    <div className="daily-updates">
                      <h4>Daily Updates:</h4>
                      <ul>
                        {c.daily_updates.map((d, idx) => (
                          <li key={idx}><b>{d.date}:</b> {d.work}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {c.completion_report && (
                    <p><b>Completion Report:</b> <a href={`${BASE}/${c.completion_report}`} target="_blank" rel="noreferrer">View</a></p>
                  )}
                </div>
              </details>
            ))}

            {/* Debug area: show raw response from assigned-complaints for quick diagnosis */}
            <div style={{ marginTop: 16, padding: 12, background: "#f7f7f7", borderRadius: 6 }}>
              <h4 style={{ marginTop: 0 }}>Debug / Raw Response</h4>
              <pre style={{ maxHeight: 220, overflow: "auto", fontSize: 12 }}>
                {rawResponse ? JSON.stringify(rawResponse, null, 2) : "No response yet. Click Refresh."}
              </pre>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
