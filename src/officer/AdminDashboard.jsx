// src/pages/AdminDashboard.jsx
import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

const BASE = "http://52.66.205.11:5000";
const INITIAL_TEAMS = ["team1", "team2", "team3", "team4", "team5"];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState("overview");

  const [women, setWomen] = useState([]);
  const [crime, setCrime] = useState([]);
  const [teams, setTeams] = useState(INITIAL_TEAMS); // always have team1–team5
  const [teamStats, setTeamStats] = useState({});
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamAssignedCases, setTeamAssignedCases] = useState([]);

  // per-complaint selected team for dropdown
  const [selectedTeamByComplaint, setSelectedTeamByComplaint] = useState({});

  const [form, setForm] = useState({
    name: "",
    email: "",
    team: "",
    password: "",
  });

  const [filter, setFilter] = useState({
    attackType: "all",
    riskLevel: "all",
    q: "",
  });

  const [loading, setLoading] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  // blob URLs for secure evidence files (key = unique_filename)
  const [evidenceUrls, setEvidenceUrls] = useState({});

  const adminId = localStorage.getItem("admin_id") || "";

  // ---------- Guard: if no admin session, redirect ----------
  useEffect(() => {
    if (!adminId) {
      navigate("/admin-login");
    }
  }, [adminId, navigate]);

  // ---------- Fetch functions ----------

  const fetchWomen = async () => {
    try {
      const res = await axios.get(`${BASE}/women-complaints`);
      setWomen(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error loading women complaints:", err);
    }
  };

  const fetchCrime = async () => {
    try {
      const res = await axios.get(`${BASE}/crime-complaints`);
      setCrime(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error loading crime complaints:", err);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const res = await axios.get(`${BASE}/team-members-list`);
      const members = Array.isArray(res.data) ? res.data : [];
      const uniqueTeams = [
        ...new Set(members.map((m) => m.team).filter(Boolean)),
      ];
      // merge backend teams + fixed team1–5
      setTeams((prev) => [
        ...new Set([...(prev || []), ...INITIAL_TEAMS, ...uniqueTeams]),
      ]);
    } catch (err) {
      console.error("Error loading team members:", err);
    }
  };

  const fetchTeamStats = async () => {
    try {
      const res = await axios.get(`${BASE}/team-stats`);
      const stats = res.data && res.data.stats ? res.data.stats : {};
      setTeamStats(stats);
      const fromStats = Object.keys(stats || {});
      setTeams((prev) => [
        ...new Set([...(prev || []), ...INITIAL_TEAMS, ...fromStats]),
      ]);
    } catch (err) {
      console.error("Error loading team stats:", err);
    }
  };

  const fetchAssignedForTeam = async (teamName) => {
    try {
      setSelectedTeam(teamName);
      const res = await axios.get(
        `${BASE}/assigned-complaints/${encodeURIComponent(teamName)}`
      );
      setTeamAssignedCases(Array.isArray(res.data) ? res.data : []);
      setActiveMenu("overview");
    } catch (err) {
      console.error("Error fetching assigned complaints:", err);
      setTeamAssignedCases([]);
    }
  };

  // ---------- Add Member ----------

  const addMember = async () => {
    try {
      if (!form.name || !form.email || !form.team || !form.password) {
        alert("Please fill all fields");
        return;
      }
      await axios.post(`${BASE}/add-team-member`, form);
      alert("Team member added");
      setForm({ name: "", email: "", team: "", password: "" });
      await fetchTeamMembers();
      await fetchTeamStats();
    } catch (error) {
      console.error("Error adding member:", error);
      alert("Failed to add member");
    }
  };

  // ---------- Assign Complaint ----------

  const assignTeamToComplaint = async (complaint_id, team) => {
    try {
      if (!complaint_id) {
        alert("No complaint_id provided.");
        return;
      }
      if (!team) {
        alert("Please select a team before assigning.");
        return;
      }
      await axios.post(`${BASE}/assign-complaint`, { complaint_id, team });
      alert(`Complaint ${complaint_id} assigned to ${team}`);
      await refreshAll();
      if (selectedTeam === team) {
        await fetchAssignedForTeam(team);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to assign complaint");
    }
  };

  // Quick assign to team1 (kept as helper if you still want it)
  const assignToTeam1 = async (complaint_id) => {
    const team = "team1";
    await assignTeamToComplaint(complaint_id, team);
  };

  // For dropdowns
  const handleSelectTeamForComplaint = (complaintId, teamValue) => {
    setSelectedTeamByComplaint((prev) => ({
      ...prev,
      [complaintId]: teamValue,
    }));
  };

  const handleAssignFromDropdown = (complaintId) => {
    const team = selectedTeamByComplaint[complaintId];
    if (!team) {
      alert("Please select a team for this complaint.");
      return;
    }
    assignTeamToComplaint(complaintId, team);
  };

  // ---------- Full Complaint Details ----------

  const openComplaintDetails = async (complaintId) => {
    try {
      const res = await axios.get(`${BASE}/api/get_complaint/${complaintId}`);
      if (res.data && res.data.success) {
        setSelectedComplaint(res.data.complaint);
      } else {
        alert(res.data.error || "Failed to load complaint details");
      }
    } catch (err) {
      console.error("Error fetching complaint details:", err);
      alert("Error fetching complaint details");
    }
  };

  // ---------- Evidence: build backend URL (used only for axios) ----------

  const buildEvidenceUrl = (complaintId, uniqueFilename) => {
    return `${BASE}/api/admin/evidence/${encodeURIComponent(
      complaintId
    )}/${encodeURIComponent(uniqueFilename)}`;
  };

  // ---------- Securely fetch evidence blobs whenever complaint changes ----------

  useEffect(() => {
    // Clean up previous blob URLs
    setEvidenceUrls((prev) => {
      Object.values(prev).forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          // ignore
        }
      });
      return {};
    });

    if (!selectedComplaint || !selectedComplaint.evidence_files || !adminId) {
      return;
    }

    const controller = new AbortController();

    const loadEvidence = async () => {
      const map = {};
      for (const file of selectedComplaint.evidence_files) {
        try {
          const apiUrl = buildEvidenceUrl(
            selectedComplaint.complaint_id,
            file.unique_filename
          );
          const res = await axios.get(apiUrl, {
            headers: {
              "X-Admin-Id": adminId, // REQUIRED by backend for authorization
            },
            responseType: "blob",
            signal: controller.signal,
          });
          const blobUrl = URL.createObjectURL(res.data);
          map[file.unique_filename] = blobUrl;
        } catch (err) {
          console.error("Error loading evidence file:", err);
        }
      }
      setEvidenceUrls(map);
    };

    loadEvidence();

    return () => {
      controller.abort();
      setEvidenceUrls((prev) => {
        Object.values(prev).forEach((url) => {
          try {
            URL.revokeObjectURL(url);
          } catch (e) {
            // ignore
          }
        });
        return {};
      });
    };
  }, [selectedComplaint, adminId]);

  // ---------- Refresh ----------

  const refreshAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchWomen(),
      fetchCrime(),
      fetchTeamMembers(),
      fetchTeamStats(),
    ]);
    // ensure base team1–5 are always present
    setTeams((prev) => [...new Set([...(prev || []), ...INITIAL_TEAMS])]);
    setLoading(false);
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line
  }, []);

  // ---------- Combined complaints ----------

  const combinedComplaints = useMemo(() => {
    const normalize = (item) => {
      const user = item.user_info || {};
      return {
        complaint_id: item.complaint_id || item.complaintId || "",
        attack_type:
          item.attack_type ||
          item.category ||
          (item.analysis_results
            ? Object.keys(item.analysis_results)[0]
            : "unknown"),
        risk_level:
          item.risk_level ||
          item.risk ||
          (item.analysis_results && item.analysis_results.risk_level) ||
          "unknown",
        status: item.status || "pending",
        name:
          item.name ||
          user.name ||
          item.user_info?.name ||
          item.fullName ||
          "",
        email: item.email || user.email || item.user_info?.email || "",
        phone: item.phone || user.phone || item.user_info?.phone || "",
        address:
          item.address || user.address || item.user_info?.address || "",
        scenario:
          item.scenario ||
          item.additional_info ||
          item.additionalInfo ||
          item.description ||
          "",
        analysis_results:
          item.analysis_results ||
          item.analysisResults ||
          item.analysis ||
          {},
        assigned_team: item.assigned_team || "",
        original: item,
      };
    };
    return [...(women || []), ...(crime || [])].map(normalize);
  }, [women, crime]);

  const summary = useMemo(() => {
    const byAttack = {};
    const byRisk = {};
    for (const c of combinedComplaints) {
      const at = (c.attack_type || "unknown").toString();
      const rl = (c.risk_level || "unknown").toString();
      byAttack[at] = (byAttack[at] || 0) + 1;
      byRisk[rl] = (byRisk[rl] || 0) + 1;
    }
    return { byAttack, byRisk, total: combinedComplaints.length };
  }, [combinedComplaints]);

  const filtered = useMemo(() => {
    return combinedComplaints.filter((c) => {
      if (filter.attackType !== "all" && c.attack_type !== filter.attackType)
        return false;
      if (filter.riskLevel !== "all" && c.risk_level !== filter.riskLevel)
        return false;
      if (
        filter.q &&
        !`${c.complaint_id} ${c.name} ${c.email} ${c.phone} ${c.scenario}`
          .toLowerCase()
          .includes(filter.q.toLowerCase())
      )
        return false;
      return true;
    });
  }, [combinedComplaints, filter]);

  // Suggested team label (still available if you want to use/extend it later)
  const suggestedTeam = (attackType, analysis) => {
    if (!attackType) return "General";
    attackType = attackType.toLowerCase();
    if (attackType.includes("malware") || analysis?.apk_analysis)
      return "Malware Response";
    if (
      attackType.includes("phishing") ||
      analysis?.url_analysis ||
      analysis?.phishing_document
    )
      return "Phishing Team";
    if (attackType.includes("deepfake")) return "Media Forensics";
    if (attackType.includes("identity") || attackType.includes("identity_theft"))
      return "Identity Fraud";
    if (attackType.includes("financial")) return "Financial Fraud";
    return "General";
  };

  // ---------- Helpers ----------

  const handleLogout = () => {
    localStorage.clear();
    navigate("/admin-login");
  };

  const renderEvidenceFiles = () => {
    if (!selectedComplaint || !selectedComplaint.evidence_files) {
      return <p>No evidence files for this complaint.</p>;
    }

    const files = selectedComplaint.evidence_files;
    if (!files.length) return <p>No evidence files for this complaint.</p>;

    return (
      <div className="evidence-list">
        {files.map((file, idx) => {
          const ext = (file.filename || "").toLowerCase().split(".").pop();
          const blobUrl = evidenceUrls[file.unique_filename];

          if (!blobUrl) {
            return (
              <div key={idx} className="evidence-item">
                <p>{file.filename}</p>
                <p style={{ fontSize: 12, color: "#6b7280" }}>
                  Loading secure file…
                </p>
              </div>
            );
          }

          if (["jpg", "jpeg", "png"].includes(ext)) {
            return (
              <div key={idx} className="evidence-item">
                <p>{file.filename}</p>
                <img
                  src={blobUrl}
                  alt={file.filename}
                  style={{
                    maxWidth: "260px",
                    borderRadius: 4,
                    border: "1px solid #d1d5db",
                  }}
                />
              </div>
            );
          }

          if (["mp4", "avi", "mov", "mkv"].includes(ext)) {
            return (
              <div key={idx} className="evidence-item">
                <p>{file.filename}</p>
                <video
                  controls
                  style={{ maxWidth: "280px", borderRadius: 4 }}
                  src={blobUrl}
                />
              </div>
            );
          }

          if (ext === "pdf") {
            return (
              <div key={idx} className="evidence-item">
                <p>{file.filename}</p>
                <a href={blobUrl} target="_blank" rel="noreferrer">
                  View PDF
                </a>
              </div>
            );
          }

          return (
            <div key={idx} className="evidence-item">
              <p>{file.filename}</p>
              <a href={blobUrl} target="_blank" rel="noreferrer">
                Download file
              </a>
            </div>
          );
        })}
      </div>
    );
  };

  // ---------- JSX ----------

  return (
    <div className="admin-container gov-theme">
      {/* Top Government Bar */}
      <header className="gov-header">
        <div className="gov-header-left">
          <div className="gov-logo-circle">🛡️</div>
          <div>
            <div className="gov-header-title">National Cyber Safety Portal</div>
            <div className="gov-header-subtitle">
              Ministry of Home Affairs – Admin Module
            </div>
          </div>
        </div>
        <div className="gov-header-right">
          <span className="gov-header-role">Logged in as: Admin</span>
          <button className="logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <div className="gov-body-layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-section-label">Navigation</div>
          <button
            className={activeMenu === "overview" ? "menu active" : "menu"}
            onClick={() => setActiveMenu("overview")}
          >
            📊 Dashboard Overview
          </button>
          <button
            className={activeMenu === "addMember" ? "menu active" : "menu"}
            onClick={() => setActiveMenu("addMember")}
          >
            👥 Manage Team Members
          </button>
          <button
            className={activeMenu === "women" ? "menu active" : "menu"}
            onClick={() => setActiveMenu("women")}
          >
            👩 Women Complaints
          </button>
          <button
            className={activeMenu === "crime" ? "menu active" : "menu"}
            onClick={() => setActiveMenu("crime")}
          >
            ⚠️ Other Crime Complaints
          </button>
          <button
            className={activeMenu === "teams" ? "menu active" : "menu"}
            onClick={() => setActiveMenu("teams")}
          >
            🏢 Team Allocation
          </button>
          <button
            className={activeMenu === "dailyWork" ? "menu active" : "menu"}
            onClick={() => setActiveMenu("dailyWork")}
          >
            📋 Daily Work Summary
          </button>
        </aside>

        {/* Main Content */}
        <main className="content">
          {loading && <div className="loading-indicator">Loading data…</div>}

          {activeMenu === "overview" && (
            <div className="card fade-in">
              <h3 className="section-title">Dashboard Overview</h3>
              <p className="section-caption">
                View case statistics and assign complaints to teams.
              </p>

              <div className="summary-row">
                <div className="summary-card">
                  <h4>Total Complaints</h4>
                  <div className="summary-number">{summary.total}</div>
                </div>

                <div className="summary-card">
                  <h4>By Attack Type</h4>
                  <div className="summary-list">
                    {Object.entries(summary.byAttack).length === 0 ? (
                      <p>No data available.</p>
                    ) : (
                      Object.entries(summary.byAttack).map(([k, v]) => (
                        <div key={k} className="summary-item">
                          <span className="badge type">{k}</span>
                          <span className="count">{v}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="summary-card">
                  <h4>By Risk Level</h4>
                  <div className="summary-list">
                    {Object.entries(summary.byRisk).length === 0 ? (
                      <p>No data available.</p>
                    ) : (
                      Object.entries(summary.byRisk).map(([k, v]) => (
                        <div key={k} className="summary-item">
                          <span className={`badge risk ${k.toLowerCase()}`}>
                            {k}
                          </span>
                          <span className="count">{v}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="filter-row">
                <select
                  value={filter.attackType}
                  onChange={(e) =>
                    setFilter({ ...filter, attackType: e.target.value })
                  }
                >
                  <option value="all">All Attack Types</option>
                  {Object.keys(summary.byAttack).map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>

                <select
                  value={filter.riskLevel}
                  onChange={(e) =>
                    setFilter({ ...filter, riskLevel: e.target.value })
                  }
                >
                  <option value="all">All Risk Levels</option>
                  {Object.keys(summary.byRisk).map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>

                <input
                  placeholder="Search by ID / name / phone"
                  value={filter.q}
                  onChange={(e) =>
                    setFilter({ ...filter, q: e.target.value })
                  }
                />
                <button
                  className="btn secondary"
                  onClick={() => {
                    setFilter({
                      attackType: "all",
                      riskLevel: "all",
                      q: "",
                    });
                  }}
                >
                  Clear Filters
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 16,
                  marginTop: 16,
                  alignItems: "flex-start",
                }}
              >
                {/* Recent complaints with dropdown assignment */}
                <div style={{ flex: 1 }}>
                  <h4 className="subheading">Recent Complaints</h4>
                  {filtered.length === 0 ? (
                    <p>No complaints match current filters.</p>
                  ) : (
                    filtered.map((c, idx) => (
                      <details key={idx} className="details-box">
                        <summary>
                          <span className="complaint-id">
                            {c.complaint_id}
                          </span>
                          <span className="badge type">
                            {c.attack_type || "Unknown"}
                          </span>
                          <span
                            className={`badge risk ${(
                              c.risk_level || ""
                            ).toLowerCase()}`}
                          >
                            {c.risk_level}
                          </span>
                          <span className="complainant-name">
                            {c.name || "—"}
                          </span>
                        </summary>
                        <div className="details-content">
                          <p>
                            <b>Status:</b> {c.status}
                          </p>
                          <p>
                            <b>Scenario:</b> {c.scenario || "—"}
                          </p>
                          <p>
                            <b>Citizen Details:</b> {c.name} — {c.phone} —{" "}
                            {c.email}
                          </p>
                          <p>
                            <b>Assigned Team:</b>{" "}
                            {c.assigned_team || "Unassigned"}
                          </p>

                          {/* Assignment row */}
                          <div className="assign-row">
                            <label className="assign-label">
                              Allocate to Team:
                            </label>
                            <select
                              className="assign-select"
                              value={
                                selectedTeamByComplaint[c.complaint_id] || ""
                              }
                              onChange={(e) =>
                                handleSelectTeamForComplaint(
                                  c.complaint_id,
                                  e.target.value
                                )
                              }
                            >
                              <option value="">-- Select Team (1–5) --</option>
                              {teams.map((t) => (
                                <option key={t} value={t}>
                                  {t.toUpperCase()}
                                </option>
                              ))}
                            </select>
                            <button
                              className="btn small"
                              onClick={() =>
                                handleAssignFromDropdown(c.complaint_id)
                              }
                            >
                              Assign
                            </button>

                            <button
                              className="btn small outline"
                              onClick={() =>
                                openComplaintDetails(c.complaint_id)
                              }
                            >
                              View Full Record
                            </button>
                          </div>
                        </div>
                      </details>
                    ))
                  )}
                </div>

                {/* Teams & assigned list */}
                <div
                  style={{
                    width: 340,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  <div className="card inner">
                    <h4 className="subheading">Teams & Case Count</h4>
                    <ul className="team-list admin-list">
                      {teams.length === 0 && <li>No teams defined.</li>}
                      {teams.map((t) => (
                        <li
                          key={t}
                          className={`team-item ${
                            selectedTeam === t ? "selected" : ""
                          }`}
                        >
                          <div className="team-item-main">
                            <div>
                              <b>{t.toUpperCase()}</b>
                              <div className="team-item-meta">
                                {teamStats[t] || 0} cases assigned
                              </div>
                            </div>
                            <div className="team-item-actions">
                              <button
                                className="btn small"
                                onClick={() => fetchAssignedForTeam(t)}
                              >
                                View Cases
                              </button>
                              <button
                                className="btn small outline"
                                onClick={() =>
                                  assignTeamToComplaint(
                                    promptAssignId(t),
                                    t
                                  )
                                }
                              >
                                Assign by ID
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {selectedTeam && (
                    <div className="card inner">
                      <h4 className="subheading">
                        Cases Assigned to {selectedTeam.toUpperCase()} (
                        {teamStats[selectedTeam] || 0})
                      </h4>
                      {teamAssignedCases.length === 0 ? (
                        <p>No cases assigned to this team.</p>
                      ) : (
                        teamAssignedCases.map((c, i) => (
                          <div key={i} className="assigned-case-item">
                            <div>
                              <b>{c.complaint_id}</b> —{" "}
                              {c.attack_type || c.category}
                            </div>
                            <div className="assigned-case-text">
                              {c.scenario || c.additional_info || "-"}
                            </div>
                            <div style={{ marginTop: 6 }}>
                              <button
                                className="btn small outline"
                                onClick={() =>
                                  assignTeamToComplaint(
                                    c.complaint_id,
                                    "General"
                                  )
                                }
                              >
                                Reassign to General
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Full Complaint Details Panel */}
              {selectedComplaint && (
                <div className="card inner" style={{ marginTop: 16 }}>
                  <div className="card-header-row">
                    <h4>
                      Complaint Details — {selectedComplaint.complaint_id}
                    </h4>
                    <button
                      className="btn small outline"
                      onClick={() => setSelectedComplaint(null)}
                    >
                      Close
                    </button>
                  </div>
                  <p>
                    <b>Type:</b> {selectedComplaint.attack_type || "—"}
                  </p>
                  <p>
                    <b>Risk Level:</b> {selectedComplaint.risk_level || "—"}
                  </p>
                  <p>
                    <b>Status:</b> {selectedComplaint.status || "pending"}
                  </p>
                  <p>
                    <b>Scenario:</b>{" "}
                    {selectedComplaint.scenario ||
                      selectedComplaint.additional_info ||
                      "—"}
                  </p>
                  <p>
                    <b>User:</b> {selectedComplaint.user_info?.name} —{" "}
                    {selectedComplaint.user_info?.phone} —{" "}
                    {selectedComplaint.user_info?.email}
                  </p>

                  <h5 style={{ marginTop: 12 }}>Evidence Files</h5>
                  {renderEvidenceFiles()}
                </div>
              )}
            </div>
          )}

          {activeMenu === "addMember" && (
            <div className="card fade-in">
              <h3 className="section-title">Add Team Member</h3>
              <p className="section-caption">
                Create credentials for investigative staff.
              </p>
              <div className="input-row">
                <input
                  placeholder="Name"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                />
                <input
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                />
              </div>
              <div className="input-row">
                <input
                  placeholder="Team Name (e.g. team1)"
                  value={form.team}
                  onChange={(e) =>
                    setForm({ ...form, team: e.target.value })
                  }
                />
                <input
                  placeholder="Password"
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                />
              </div>
              <button className="btn" onClick={addMember}>
                Save Member
              </button>
            </div>
          )}

          {activeMenu === "women" && (
            <div className="card fade-in">
              <h3 className="section-title">Women Complaints</h3>
              <p className="section-caption">
                Cases filed through the women safety interface.
              </p>
              {women.length === 0 ? (
                <p>No complaints available.</p>
              ) : (
                women.map((item, i) => (
                  <details key={i} className="details-box">
                    <summary>
                      <span className="complaint-id">
                        {item.complaint_id}
                      </span>{" "}
                      {item.category || item.attack_type}
                    </summary>
                    <div className="details-content">
                      <p>
                        <b>Email:</b> {item.email}
                      </p>
                      <p>
                        <b>Phone:</b> {item.phone}
                      </p>
                      <p>
                        <b>Status:</b>{" "}
                        <span
                          className={
                            item.status === "assigned"
                              ? "status-assigned"
                              : "status-pending"
                          }
                        >
                          {item.status || "pending"}
                        </span>
                      </p>

                      <div className="assign-row">
                        <label className="assign-label">
                          Allocate to Team:
                        </label>
                        <select
                          className="assign-select"
                          value={
                            selectedTeamByComplaint[item.complaint_id] || ""
                          }
                          onChange={(e) =>
                            handleSelectTeamForComplaint(
                              item.complaint_id,
                              e.target.value
                            )
                          }
                        >
                          <option value="">-- Select Team (1–5) --</option>
                          {teams.map((t) => (
                            <option key={t} value={t}>
                              {t.toUpperCase()}
                            </option>
                          ))}
                        </select>
                        <button
                          className="btn small"
                          onClick={() =>
                            handleAssignFromDropdown(item.complaint_id)
                          }
                        >
                          Assign
                        </button>
                      </div>

                      <button
                        className="btn small outline mt-6"
                        onClick={() =>
                          openComplaintDetails(item.complaint_id)
                        }
                      >
                        View Full Record
                      </button>
                    </div>
                  </details>
                ))
              )}
            </div>
          )}

          {activeMenu === "crime" && (
            <div className="card fade-in">
              <h3 className="section-title">Crime Complaints</h3>
              <p className="section-caption">
                General cybercrime complaints registered on the portal.
              </p>
              {crime.length === 0 ? (
                <p>No complaints.</p>
              ) : (
                crime.map((item, i) => (
                  <details key={i} className="details-box">
                    <summary>
                      <span className="complaint-id">
                        {item.complaint_id}
                      </span>{" "}
                      {item.attack_type}
                    </summary>
                    <div className="details-content">
                      <p>
                        <b>Name:</b>{" "}
                        {item.name || item?.user_info?.name || "—"}
                      </p>
                      <p>
                        <b>Status:</b> {item.status || "pending"}
                      </p>

                      <div className="assign-row">
                        <label className="assign-label">
                          Allocate to Team:
                        </label>
                        <select
                          className="assign-select"
                          value={
                            selectedTeamByComplaint[item.complaint_id] || ""
                          }
                          onChange={(e) =>
                            handleSelectTeamForComplaint(
                              item.complaint_id,
                              e.target.value
                            )
                          }
                        >
                          <option value="">-- Select Team (1–5) --</option>
                          {teams.map((t) => (
                            <option key={t} value={t}>
                              {t.toUpperCase()}
                            </option>
                          ))}
                        </select>
                        <button
                          className="btn small"
                          onClick={() =>
                            handleAssignFromDropdown(item.complaint_id)
                          }
                        >
                          Assign
                        </button>
                      </div>

                      <button
                        className="btn small outline mt-6"
                        onClick={() =>
                          openComplaintDetails(item.complaint_id)
                        }
                      >
                        View Full Record
                      </button>
                    </div>
                  </details>
                ))
              )}
            </div>
          )}

          {activeMenu === "teams" && (
            <div className="card fade-in">
              <h3 className="section-title">Team Allocation Overview</h3>
              <p className="section-caption">
                List of investigation teams and their current workload.
              </p>
              <ul className="team-list">
                {teams.length > 0 ? (
                  teams.map((team, i) => (
                    <li key={i} className="team-overview-item">
                      🏢{" "}
                      <button
                        className="linkish"
                        onClick={() => fetchAssignedForTeam(team)}
                      >
                        {team.toUpperCase()}
                      </button>{" "}
                      — {teamStats[team] || 0} cases assigned
                    </li>
                  ))
                ) : (
                  <p>No teams available.</p>
                )}
              </ul>
            </div>
          )}

          {activeMenu === "dailyWork" && (
            <div className="card fade-in">
              <h3 className="section-title">Daily Work Summary</h3>
              <p className="section-caption">
                Use the dashboard overview and team allocation panel to
                monitor today&apos;s case distribution and updates.
              </p>
              <ul className="bullet-list">
                <li>Review new complaints under “Dashboard Overview”.</li>
                <li>Allocate cases to Teams 1–5 using the dropdown.</li>
                <li>Track load per team in “Team Allocation Overview”.</li>
                <li>Use “View Full Record” to see all evidence & details.</li>
              </ul>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// helper for prompt-based assignment (still used from team list)
function promptAssignId(defaultTeam) {
  const id = window.prompt(
    `Enter complaint_id to assign to ${defaultTeam}: (example CYB-xxxx)`
  );
  return id || "";
}
