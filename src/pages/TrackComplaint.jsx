// src/pages/TrackComplaint.jsx
import React, { useState } from "react";
import "./trackcomplaint.css";

export default function TrackComplaint() {
  const [complaintId, setComplaintId] = useState("");
  const [alert, setAlert] = useState({ msg: "", type: "" });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  // Alert helper
  function showAlert(message, type = "error") {
    setAlert({ msg: message, type });
    if (!message) return;
    setTimeout(() => setAlert({ msg: "", type: "" }), 5000);
  }

  // Handle form submission
  async function handleSubmit(e) {
    e.preventDefault();
    const id = complaintId.trim();
    if (!id) {
      showAlert("Please enter a complaint ID.", "error");
      return;
    }

    setLoading(true);
    setAlert({ msg: "", type: "" });
    setResults(null);

    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/get_complaint/${encodeURIComponent(id)}`);
      const data = await resp.json().catch(() => ({}));

      if (resp.ok && data.success && data.complaint) {
        setResults(data.complaint);
        showAlert("", "");
      } else {
        setResults(null);
        showAlert(data.error || "Complaint not found. Please verify the ID.", "error");
      }
    } catch (err) {
      setResults(null);
      showAlert("Network error. Failed to connect to the complaint server.", "error");
    } finally {
      setLoading(false);
    }
  }

  // Generate CSS classes safely
  function statusClassFrom(status) {
    return status ? status.toLowerCase().replace(/\s+/g, "-") : "";
  }

  function riskClassFrom(risk) {
    return risk ? risk.toLowerCase() : "";
  }

  // Render values safely
  function renderValue(value) {
    if (value === null || value === undefined || value === "") return "None";
    if (typeof value === "object") {
      return (
        <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", margin: "0.2rem 0" }}>
          {JSON.stringify(value, null, 2)}
        </div>
      );
    }
    return value;
  }

  const isCMP = results?.category; // CMP complaints have 'category'
  const isCYB = results?.attack_type; // CYB complaints have 'attack_type'

  return (
    <div className="track-page-root">
      <main className="main-content">
        <div className="track-container">
          <h2 style={{ textAlign: "center", marginBottom: "1.5rem", color: "var(--primary-color)" }}>
            Track Your Complaint Status
          </h2>

          {alert.msg && <div className={`alert ${alert.type}`}>{alert.msg}</div>}

          <form id="trackForm" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="complaintId">Enter Your Complaint ID:</label>
              <input
                type="text"
                id="complaintId"
                name="complaintId"
                placeholder="e.g., CMP-123456 or CYB-36E42479"
                required
                value={complaintId}
                onChange={(e) => setComplaintId(e.target.value)}
              />
            </div>

            <button type="submit" className="btn" disabled={loading}>
              <i className="fas fa-search" /> {loading ? "Tracking..." : "Track Complaint"}
            </button>
          </form>

          {results && (
            <div id="results-container">
              <h3 style={{ borderBottom: "2px solid var(--border-color)", paddingBottom: ".5rem", marginBottom: "1rem" }}>
                Complaint Details
              </h3>

              <div><strong>Complaint ID:</strong> {renderValue(results.complaint_id)}</div>
              <div>
                <strong>Status:</strong>{" "}
                <span className={`status-badge ${statusClassFrom(results.status)}`}>
                  {results.status?.toUpperCase() || "N/A"}
                </span>
              </div>

              {/* CMP-specific */}
              {isCMP && (
                <>
                  <div><strong>Category:</strong> {renderValue(results.category)}</div>
                  <div><strong>Additional Info:</strong> {renderValue(results.additional_info)}</div>
                </>
              )}

              {/* CYB-specific */}
              {isCYB && (
                <>
                  <div>
                    <strong>Risk Level:</strong>{" "}
                    <span className={`risk-badge ${riskClassFrom(results.risk_level)}`}>
                      {results.risk_level?.toUpperCase() || "N/A"}
                    </span>
                  </div>
                  <div><strong>Incident Type:</strong> {renderValue(results.attack_type)}</div>
                  <div><strong>Scenario:</strong> {renderValue(results.scenario)}</div>
                  <div><strong>Additional Info:</strong> {renderValue(results.additional_info)}</div>
                </>
              )}

              {/* Daily Updates */}
              {results.daily_updates && results.daily_updates.length > 0 && (
                <div className="daily-updates">
                  <h4>Daily Updates:</h4>
                  <ul>
                    {results.daily_updates.map((d, i) => (
                      <li key={i}>
                        <b>{d.date}:</b> {d.work}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Completion Report */}
              {results.completion_report && (
                <div className="completion-report">
                  <h4>Completion Report:</h4>
                  <a
                    href={`${import.meta.env.VITE_API_URL}/${results.completion_report}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Report
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
