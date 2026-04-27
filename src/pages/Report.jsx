import React, { useState } from "react";

// Backend API URL from environment variable
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "/api";

export default function Report() {
  const [urlInput, setUrlInput] = useState("");
  const [apkFile, setApkFile] = useState(null);
  const [docFile, setDocFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resultHtml, setResultHtml] = useState("");
  const [error, setError] = useState("");

  // --- Utility Functions ---
  const getStatusClass = (verdict) => {
    if (!verdict) return "status-label low-severity";
    const lowerVerdict = verdict.toLowerCase();
    if (lowerVerdict.includes("phish") || lowerVerdict.includes("high"))
      return "status-label phishing";
    if (lowerVerdict.includes("suspic") || lowerVerdict.includes("moderate"))
      return "status-label suspicious";
    return "status-label legitimate";
  };

  const renderUrlReport = (data) => {
    const verdict = data.final_verdict || "N/A";
    const verdictClass = getStatusClass(verdict);
    data.ai_suggestion = data.ai_suggestion || data.ai_assistance;

    setResultHtml(`
      <h3 class="text-xl font-semibold mb-4 text-blue-800">URL Analysis Report</h3>
      <div class="space-y-3 text-sm text-gray-700">
        <p><strong>URL:</strong> <span class="font-medium text-blue-600">${data.url}</span></p>
        <p><strong>Verdict:</strong> <span class="${verdictClass}">${verdict.toUpperCase()}</span></p>
        <p><strong>Risk Score:</strong> ${data.risk_score ? data.risk_score.toFixed(2) : "N/A"}</p>
        <div class="ai-report mt-4 pt-4 border-t border-gray-300">
          <h4 class="font-semibold mb-2 text-blue-800">Official Security Guidance:</h4>
          <pre class="bg-gray-100 p-3 rounded-md whitespace-pre-wrap">${data.ai_suggestion || "No guidance available."}</pre>
        </div>
      </div>
    `);
  };

  const renderApkReport = (data) => {
    const severityClass = getStatusClass(data.severity);
    const malwareProbability =
      data.malware_probability !== undefined
        ? (data.malware_probability * 100).toFixed(2) + "%"
        : "N/A";
    data.ai_suggestion = data.ai_suggestion || data.ai_assistance;

    setResultHtml(`
      <h3 class="text-xl font-semibold mb-4 text-blue-800">APK Analysis Report</h3>
      <div class="space-y-3 text-sm text-gray-700">
        <p><strong>App Name:</strong> <span class="font-medium text-blue-600">${data.app_name || "N/A"}</span></p>
        <p><strong>Package:</strong> <span class="text-gray-700">${data.package || "N/A"}</span></p>
        <p><strong>Severity:</strong> <span class="${severityClass}">${(data.severity || "Unknown").toUpperCase()}</span></p>
        <p><strong>Malware Probability:</strong> <span class="text-red-700 font-bold">${malwareProbability}</span></p>
        <div class="ai-report mt-4 pt-4 border-t border-gray-300">
          <h4 class="font-semibold mb-2 text-blue-800">Official Security Guidance:</h4>
          <pre class="bg-gray-100 p-3 rounded-md whitespace-pre-wrap">${data.ai_suggestion || "No guidance available."}</pre>
        </div>
      </div>
    `);
  };

  const renderEmailReport = (data) => {
    const riskClass = getStatusClass(data.risk_level);
    const urlsList =
      data.url_reports && data.url_reports.length > 0
        ? data.url_reports
            .map(
              (report) =>
                `<li>${report.url} - <span class="${getStatusClass(
                  report.final_verdict
                )}">${report.final_verdict.toUpperCase()}</span></li>`
            )
            .join("")
        : "<li>No actionable URLs found.</li>";
    data.ai_suggestion = data.ai_suggestion || data.ai_assistance;

    setResultHtml(`
      <h3 class="text-xl font-semibold mb-4 text-blue-800">Document/Image Analysis Report</h3>
      <div class="space-y-3 text-sm text-gray-700">
        <p><strong>File Name:</strong> <span class="font-medium text-blue-600">${data.filename || "N/A"}</span></p>
        <p><strong>Overall Risk:</strong> <span class="${riskClass}">${(data.risk_level || "UNKNOWN").toUpperCase()}</span></p>
        <p class="mt-4"><strong>Analyzed Links:</strong></p>
        <ul class="list-disc list-inside text-gray-700">${urlsList}</ul>
        <div class="ai-report mt-4 pt-4 border-t border-gray-300">
          <h4 class="font-semibold mb-2 text-blue-800">Official Security Guidance:</h4>
          <pre class="bg-gray-100 p-3 rounded-md whitespace-pre-wrap">${data.ai_suggestion || "No guidance available."}</pre>
        </div>
      </div>
    `);
  };

  // --- HANDLERS ---
  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!urlInput) {
      setError("Please enter a URL.");
      return;
    }

    setLoading(true);
    setError("");
    setResultHtml("");

    try {
      const res = await fetch(`${BACKEND_URL}/api/url-analyser`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput }),
      });
      setLoading(false);

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || `Failed to analyze URL (Status: ${res.status})`);
        return;
      }

      const data = await res.json();
      renderUrlReport(data);
    } catch (err) {
      setLoading(false);
      setError("Network Error: Could not connect to the API server.");
    }
  };

  const handleApkSubmit = async (e) => {
    e.preventDefault();
    if (!apkFile) {
      setError("Please select an APK file.");
      return;
    }

    setLoading(true);
    setError("");
    setResultHtml("");

    const formData = new FormData();
    formData.append("file", apkFile);

    try {
      const res = await fetch(`${BACKEND_URL}/api/apk-analyser`, { method: "POST", body: formData });
      setLoading(false);

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || `Failed to analyze APK (Status: ${res.status})`);
        return;
      }

      const data = await res.json();
      renderApkReport(data);
    } catch (err) {
      setLoading(false);
      setError("Network Error: Could not connect to the API server.");
    }
  };

  const handleDocSubmit = async (e) => {
    e.preventDefault();
    if (!docFile) {
      setError("Please select a document or image file.");
      return;
    }

    setLoading(true);
    setError("");
    setResultHtml("");

    const formData = new FormData();
    formData.append("file", docFile);

    try {
      const res = await fetch(`${BACKEND_URL}/api/email-analyser`, { method: "POST", body: formData });
      setLoading(false);

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || `Failed to analyze document (Status: ${res.status})`);
        return;
      }

      const data = await res.json();
      renderEmailReport(data);
    } catch (err) {
      setLoading(false);
      setError("Network Error: Could not connect to the API server.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 font-['Roboto']">
      <main className="main-container max-w-6xl mx-auto p-6">
        <section className="analysis-section bg-white p-6 rounded shadow mb-6">
          <h2 className="text-3xl font-bold text-blue-900 mb-2">AI Analysis Services</h2>
          <p className="text-gray-600 mb-4">Use our automated tools to check URLs, apps, and documents for potential threats.</p>

          {/* URL Form */}
          <form onSubmit={handleUrlSubmit} className="ai-form bg-blue-100 p-6 rounded mb-6">
            <h3 className="text-xl font-semibold mb-3">Analyze Suspicious URL</h3>
            <div className="form-group mb-4">
              <label htmlFor="url" className="block font-medium mb-2 text-gray-700">URL Address</label>
              <input
                type="url"
                id="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Enter full URL, e.g., https://example.com/scam"
                className="w-full p-3 border rounded"
              />
            </div>
            <button type="submit" className="btn-primary">
              Analyze URL
            </button>
          </form>

          {/* APK Form */}
          <form onSubmit={handleApkSubmit} className="ai-form bg-blue-100 p-6 rounded mb-6">
            <h3 className="text-xl font-semibold mb-3">Analyze Android Application (APK)</h3>
            <div className="form-group mb-4">
              <label htmlFor="apk" className="block font-medium mb-2 text-gray-700">Upload APK File</label>
              <input
                type="file"
                id="apk"
                accept=".apk"
                onChange={(e) => setApkFile(e.target.files[0])}
                className="w-full p-3 border rounded"
              />
            </div>
            <button type="submit" className="btn-primary">
              Analyze APK
            </button>
          </form>

          {/* Document/Image Form */}
          <form onSubmit={handleDocSubmit} className="ai-form bg-blue-100 p-6 rounded mb-6">
            <h3 className="text-xl font-semibold mb-3">Analyze Phishing Email or Document</h3>
            <div className="form-group mb-4">
              <label htmlFor="doc" className="block font-medium mb-2 text-gray-700">Upload Email or Document</label>
              <input
                type="file"
                id="doc"
                accept=".pdf,image/*"
                onChange={(e) => setDocFile(e.target.files[0])}
                className="w-full p-3 border rounded"
              />
            </div>
            <button type="submit" className="btn-primary">
              Analyze Email/Document
            </button>
          </form>

          {/* Loader / Result / Error */}
          <div className="ai-results-container bg-blue-100 p-6 rounded mt-6 border border-blue-200">
            {loading && (
              <div className="flex flex-col items-center justify-center p-6">
                <div className="loader border-4 border-blue-200 border-t-4 border-blue-700 rounded-full w-10 h-10 animate-spin"></div>
                <p className="mt-4 text-gray-600 text-sm">Analyzing content... Please wait.</p>
              </div>
            )}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded-lg font-semibold text-center mt-4">
                {error}
              </div>
            )}
            {!loading && !error && (
              <div dangerouslySetInnerHTML={{ __html: resultHtml }}></div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
