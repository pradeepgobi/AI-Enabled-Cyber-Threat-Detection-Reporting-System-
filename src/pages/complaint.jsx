import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import "./complaint.css"; // your CSS file

// Centralize API base URL so it's easier to change
const API_BASE_URL = "/api";

export default function ComplaintPage() {
  // --- State Management ---
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    scenario: "",
    url: "",
    additional_info: "",
    declaration: false,
  });

  const [selectedAttackType, setSelectedAttackType] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [alert, setAlert] = useState({ show: false, message: "", type: "" });

  // Results & Analysis State
  const [submissionResult, setSubmissionResult] = useState(null);

  // Chat State
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    {
      type: "ai",
      content:
        "Welcome! I'm here to help you with cybersecurity concerns and guide you through the complaint process. Feel free to ask me anything about staying safe online.",
    },
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(false);

  // Theme State
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  // Refs
  const fileInputRef = useRef(null);
  const chatBottomRef = useRef(null);
  const resultsSectionRef = useRef(null);

  // --- Effects ---

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatMinimized]);

  // Handle Theme Toggle
  useEffect(() => {
    if (isDarkTheme) {
      document.body.classList.add("dark-theme");
    } else {
      document.body.classList.remove("dark-theme");
    }
  }, [isDarkTheme]);

  // --- Helper Functions ---

  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: "", type: "" }), 5000);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // --- Event Handlers ---

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAttackTypeSelect = (type) => {
    setSelectedAttackType(type);
  };

  // File Upload Handlers
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    addFiles(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add("dragover");
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("dragover");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("dragover");
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  };

  const addFiles = (files) => {
    const newFiles = files.filter(
      (file) => !uploadedFiles.some((f) => f.name === file.name)
    );
    setUploadedFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (fileName) => {
    setUploadedFiles((prev) => prev.filter((f) => f.name !== fileName));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      scenario: "",
      url: "",
      additional_info: "",
      declaration: false,
    });
    setSelectedAttackType("");
    setUploadedFiles([]);
    setSubmissionResult(null);
    setUploadProgress(0);
  };

  // --- PDF Generation ---
  const generatePlaybookPDF = (aiText) => {
  if (!aiText) {
    showAlert("No AI assistance available to generate Playbook", "error");
    return;
  }

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.width;

  /* ---------- HEADER ---------- */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("CYBER SECURITY PLAYBOOK", pageWidth / 2, 40, {
    align: "center",
  });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Generated On: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
    pageWidth / 2,
    60,
    { align: "center" }
  );

  doc.setLineWidth(0.5);
  doc.line(30, 70, pageWidth - 30, 70);

  /* ---------- AI CONTENT ---------- */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("AI Threat Response & Prevention Guide", 30, 100);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  const lines = doc.splitTextToSize(aiText, pageWidth - 60);

  let startY = 130;

  lines.forEach((line, index) => {
    if (startY > 770) {
      doc.addPage();
      startY = 50;
    }
    doc.text(line, 30, startY);
    startY += 16;
  });

  /* ---------- FOOTER ---------- */
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    "This Playbook is generated using AI-assisted cyber threat analysis.",
    30,
    820
  );

  doc.save(
    `AI_Playbook_${submissionResult?.complaint_id || "Report"}.pdf`
  );
};



  const generatePDF = (data) => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    /* ---------------- HEADER ---------------- */
    doc.addImage(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Emblem_of_India.svg/245px-Emblem_of_India.svg.png",
      "PNG",
      25,
      20,
      45,
      55
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("GOVERNMENT OF INDIA", pageWidth / 2, 40, { align: "center" });

    doc.setFontSize(14);
    doc.text("MINISTRY OF HOME AFFAIRS", pageWidth / 2, 60, {
      align: "center",
    });

    doc.setFontSize(12);
    doc.text("National Cyber Crime Reporting Portal", pageWidth / 2, 78, {
      align: "center",
    });

    doc.setFontSize(16);
    doc.text("CYBERCRIME COMPLAINT REPORT", pageWidth / 2, 105, {
      align: "center",
    });

    doc.setLineWidth(0.5);
    doc.line(20, 112, pageWidth - 20, 112);

    /* ---------------- META INFO ---------------- */
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Report Date: ${new Date().toLocaleDateString()}`,
      pageWidth - 20,
      130,
      {
        align: "right",
      }
    );
    doc.text(
      `Report Time: ${new Date().toLocaleTimeString()}`,
      pageWidth - 20,
      142,
      {
        align: "right",
      }
    );

    doc.setFont("helvetica", "bold");
    doc.text(`COMPLAINT ID: ${data.complaint_id}`, 20, 130);
    doc.setFont("helvetica", "normal");
    doc.text(`Status: RECEIVED (Pending Review)`, 20, 142);

    /* ---------------- WATERMARK ---------------- */
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.08 }));
    doc.setFontSize(60);
    doc.setTextColor(150);
    doc.text("GOVT OFFICIAL COPY", pageWidth / 2, pageHeight / 2, {
      align: "center",
      angle: 45,
    });
    doc.restoreGraphicsState();

    /* ---------------- SECTION A ---------------- */
    autoTable(doc, {
      startY: 155,
      head: [["SECTION A: COMPLAINANT INFORMATION", ""]],
      body: [
        ["Full Name", formData.name || "N/A"],
        ["Email", formData.email || "N/A"],
        ["Phone Number", formData.phone || "N/A"],
        ["Address", formData.address || "N/A"],
      ],
      theme: "grid",
      headStyles: { fillColor: [30, 58, 138], textColor: 255 },
      styles: { fontSize: 10 },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 150 } },
    });

    /* ---------------- SECTION B ---------------- */
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 15,
      head: [["SECTION B: INCIDENT DETAILS", ""]],
      body: [
        [
          "Attack Type",
          selectedAttackType
            ? selectedAttackType.replace("_", " ").toUpperCase()
            : "N/A",
        ],
        ["Risk Level", data.risk_level || "N/A"],
        ["Information", formData.additional_info || "N/A"],
      ],
      theme: "grid",
      headStyles: { fillColor: [185, 28, 28], textColor: 255 },
      styles: { fontSize: 10 },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 150 } },
    });

    /* ---------------- SECTION C ---------------- */
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(
      "SECTION C: INCIDENT DESCRIPTION",
      20,
      doc.lastAutoTable.finalY + 20
    );

    const incidentLines = doc.splitTextToSize(
      formData.scenario || "No description provided.",
      pageWidth - 40
    );

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 25,
      body: [[incidentLines]],
      theme: "plain",
      styles: { fontSize: 10, cellPadding: 5 },
    });

    /* ---------------- ADDITIONAL INFO ---------------- */
    if (formData.additional_info) {
      doc.setFont("helvetica", "bold");
      doc.text("Additional Information:", 20, doc.lastAutoTable.finalY + 20);

      const addLines = doc.splitTextToSize(
        formData.additional_info,
        pageWidth - 40
      );

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 25,
        body: [[addLines]],
        theme: "plain",
        styles: { fontSize: 10, cellPadding: 5 },
      });
    }

    let finalY = doc.lastAutoTable.finalY + 40;

    /* ---------------- SIGNATURE ---------------- */
    doc.setFontSize(10);
    doc.text("(Digitally Signed by Complainant)", 20, finalY);

    doc.line(pageWidth - 140, finalY - 5, pageWidth - 20, finalY - 5);

    doc.text("Authorized Officer", pageWidth - 140, finalY + 12);
    doc.text("Cyber Crime Cell", pageWidth - 140, finalY + 24);

    /* ---------------- TRACK LINK ---------------- */
    const trackURL = `https://cybercrime.gov.in/track?id=${data.complaint_id}`;

    doc.setTextColor(0, 0, 255);
    doc.textWithLink(
      `Track your complaint status: ${trackURL}`,
      20,
      finalY + 50,
      {
        url: trackURL,
      }
    );

    /* ---------------- FOOTER ---------------- */
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(
      "This is a computer-generated report and does not require a physical signature.",
      20,
      pageHeight - 30
    );
    doc.text(
      `Generated via Cyber Safety Portal | Case ID: ${data.complaint_id}`,
      20,
      pageHeight - 20
    );

    doc.save(`Complaint_${data.complaint_id}.pdf`);
  };

  // --- Submission Logic ---

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedAttackType) {
      showAlert("Please select an attack type", "error");
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      const form = new FormData();
      Object.keys(formData).forEach((key) => {
        form.append(key, formData[key]);
      });
      form.append("attack_type", selectedAttackType);

      uploadedFiles.forEach((file) => {
        form.append("evidence", file);
      });

      const response = await axios.post(
        `${API_BASE_URL}/api/submit_complaint`,
        form,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            if (!progressEvent.total) return;
            const percent = Math.round(
              (progressEvent.loaded / progressEvent.total) * 100
            );
            setUploadProgress(percent);
          },
        }
      );

      if (response.data.success) {
        setSubmissionResult(response.data);
        showAlert("Complaint submitted successfully!", "success");

        // Generate PDF automatically
        generatePDF(response.data);

        setTimeout(() => {
          resultsSectionRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 200);
      } else {
        showAlert(response.data.error || "Unknown error", "error");
      }
    } catch (err) {
      console.error("Submit error:", err);

      // Prefer backend JSON error if present
      const backendMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message;

      showAlert("Backend Error: " + backendMsg, "error");
    }

    setIsSubmitting(false);
  };

  // --- Chat Logic ---

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatMessages((prev) => [...prev, { type: "user", content: userMsg }]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/get_ai_guidance`,
        {
          attack_type: selectedAttackType || "general",
          question: userMsg,
          complaint_id: submissionResult?.complaint_id || "",
        }
      );

      if (response.data.success) {
        setChatMessages((prev) => [
          ...prev,
          { type: "ai", content: response.data.guidance },
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            type: "ai",
            content: "AI guidance failed. Try again later.",
          },
        ]);
      }
    } catch (err) {
      const backendMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message;

      setChatMessages((prev) => [
        ...prev,
        { type: "ai", content: "Backend Error: " + backendMsg },
      ]);
    }

    setIsChatLoading(false);
  };

  const handleChatKeyPress = (e) => {
    if (e.key === "Enter") handleSendChat();
  };

  // --- Render Helpers for Analysis Results ---

  const renderAnalysisContent = (key, analysis) => {
    switch (key) {
      case "apk_analysis":
        return (
          <>
            <p>
              <strong>App Name:</strong> {analysis.app_name}
            </p>
            <p>
              <strong>Package:</strong> {analysis.package}
            </p>
            <p>
              <strong>Malware Probability:</strong>{" "}
              {(analysis.malware_probability * 100).toFixed(2)}%
            </p>
            <p>
              <strong>Severity:</strong>{" "}
              <span
                style={{
                  fontWeight: "bold",
                  color:
                    analysis.severity === "Low"
                      ? "green"
                      : analysis.severity === "Moderate"
                      ? "orange"
                      : "red",
                }}
              >
                {analysis.severity}
              </span>
            </p>
            <p>
              <strong>Guidance:</strong> {analysis.guidance}
            </p>
            <p>
              <strong>Permissions:</strong>
            </p>
            <ul>
              {analysis.permissions?.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </>
        );

      case "url_analysis":
        // FIX: backend sends confidence as "HIGH" | "MEDIUM" | "LOW", not a float
        return (
          <>
            <p>
              <strong>URL:</strong> {analysis.url}
            </p>
            <p>
              <strong>Final Verdict:</strong>{" "}
              {analysis.final_verdict?.toUpperCase()}
            </p>
            <p>
              <strong>Risk Score:</strong> {analysis.risk_score}
            </p>
            <p>
              <strong>Confidence:</strong>{" "}
              {typeof analysis.confidence === "string"
                ? analysis.confidence
                : analysis.confidence}
            </p>
            <p>
              <strong>Domain Analysis:</strong>
            </p>
            <ul>
              <li>
                <strong>Domain:</strong>{" "}
                {analysis.domain_analysis?.Domain || "N/A"}
              </li>
              <li>
                <strong>Has SSL:</strong>{" "}
                {String(analysis.domain_analysis?.["Has SSL"])}
              </li>
              <li>
                <strong>Domain Age:</strong>{" "}
                {analysis.domain_analysis?.["Domain Age (days)"] ??
                  "Unknown"}{" "}
                days
              </li>
              <li>
                <strong>Pass Domain Check:</strong>{" "}
                {String(analysis.domain_analysis?.["Pass Domain Check"])}
              </li>
            </ul>
          </>
        );

      case "deepfake_image":
      case "deepfake_video":
        return (
          <>
            <p>
              <strong>Prediction:</strong> {analysis.prediction}
            </p>
            <p>
              <strong>Confidence:</strong>{" "}
              {(analysis.confidence * 100).toFixed(2)}%
            </p>
            <p>
              <strong>Is Deepfake:</strong>{" "}
              {analysis.is_deepfake ? "Yes" : "No"}
            </p>
          </>
        );

      case "phishing_document":
        return (
          <>
            <p>
              <strong>Overall Document Risk:</strong>{" "}
              {analysis.risk_level?.toUpperCase()}
            </p>
            <p>
              <strong>Extracted Text:</strong>{" "}
              {analysis.extracted_text
                ? `${analysis.extracted_text.substring(0, 200)}...`
                : "N/A"}
            </p>
            <h4>Analyzed URLs:</h4>
            {analysis.url_reports && analysis.url_reports.length > 0 ? (
              analysis.url_reports.map((report, idx) => (
                <div key={idx} className="analysis-sub-card">
                  <h4>URL: {report.url}</h4>
                  <ul>
                    <li>
                      <strong>Verdict:</strong>{" "}
                      {report.final_verdict?.toUpperCase()}
                    </li>
                    <li>
                      <strong>Confidence:</strong>{" "}
                      {typeof report.confidence === "string"
                        ? report.confidence
                        : (report.confidence * 100).toFixed(2) + "%"}
                    </li>
                  </ul>
                </div>
              ))
            ) : (
              <p>No URLs found.</p>
            )}
          </>
        );

      default:
        return <pre>{JSON.stringify(analysis, null, 2)}</pre>;
    }
  };

  const renderAiAssistance = (text) => {
    if (!text) return null;
    const sections = text.split(/\n\n/);
    return sections.map((section, idx) => {
      if (/^\d+\./.test(section.trim())) {
        const items = section
          .split("\n")
          .map((s) => s.replace(/^\d+\./, "").trim());
        return (
          <ol key={idx}>
            {items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ol>
        );
      }
      if (/^-/.test(section.trim())) {
        const items = section
          .split("\n")
          .map((s) => s.replace(/^-/, "").trim());
        return (
          <ul key={idx}>
            {items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        );
      }
      return <p key={idx}>{section}</p>;
    });
  };

  // --- JSX Structure ---

  return (
    <div>
      <main className="main-content">
        <div className="content-wrapper">
          {/* Hero Section */}
          <section className="hero-section">
            <div className="hero-content">
              <div className="hero-badge">
                <i className="fas fa-shield-alt"></i>
                <span>Secure · Confidential · Swift Action</span>
              </div>
              <h2 className="hero-title">Report Cybercrime Incidents</h2>
              <p className="hero-description">
                Your safety is our priority. File your complaint securely and
                get assistance from our AI-powered support system.
              </p>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <i className="fas fa-users"></i>
                <div className="stat-info">
                  <span className="stat-number">50,000+</span>
                  <span className="stat-label">Complaints Resolved</span>
                </div>
              </div>
              <div className="stat-card">
                <i className="fas fa-clock"></i>
                <div className="stat-info">
                  <span className="stat-number">24/7</span>
                  <span className="stat-label">Support Available</span>
                </div>
              </div>
              <div className="stat-card">
                <i className="fas fa-chart-line"></i>
                <div className="stat-info">
                  <span className="stat-number">95%</span>
                  <span className="stat-label">Success Rate</span>
                </div>
              </div>
            </div>
          </section>

          {/* Alert Message */}
          {alert.show && (
            <div className={`alert ${alert.type}`} style={{ display: "block" }}>
              {alert.message}
            </div>
          )}

          {/* Complaint Form */}
          <form className="complaint-form" onSubmit={handleSubmit}>
            <div className="form-header">
              <h3>
                <i className="fas fa-edit"></i> File Your Complaint
              </h3>
              <p className="form-instruction">
                Please fill all mandatory fields marked with{" "}
                <span className="required">*</span>
              </p>
            </div>

            {/* Section 1: Personal Info */}
            <div className="form-section">
              <div className="section-header">
                <span className="section-number">1</span>
                <div className="section-title-wrapper">
                  <h4 className="section-title">Personal Information</h4>
                  <p className="section-subtitle">
                    Your details will be kept confidential
                  </p>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="name">
                    Full Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">
                    Email Address <span className="required">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    placeholder="example@email.com"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="phone">
                    Phone Number <span className="required">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    required
                    placeholder="+91 XXXXX XXXXX"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group full-width">
                  <label htmlFor="address">Address</label>
                  <textarea
                    id="address"
                    name="address"
                    rows="3"
                    placeholder="Enter your complete address"
                    value={formData.address}
                    onChange={handleInputChange}
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Section 2: Attack Type */}
            <div className="form-section">
              <div className="section-header">
                <span className="section-number">2</span>
                <div className="section-title-wrapper">
                  <h4 className="section-title">
                    Type of Cybercrime <span className="required">*</span>
                  </h4>
                  <p className="section-subtitle">
                    Select the category that best describes your complaint
                  </p>
                </div>
              </div>

              <div className="attack-type-grid">
                {[
                  {
                    id: "phishing",
                    icon: "fa-fish",
                    title: "Phishing Attack",
                    desc: "Fraudulent emails, messages or fake websites",
                  },
                  {
                    id: "deepfake_image",
                    icon: "fa-image",
                    title: "Deepfake Image",
                    desc: "Manipulated or AI-generated fake images",
                  },
                  {
                    id: "deepfake_video",
                    icon: "fa-video",
                    title: "Deepfake Video",
                    desc: "Manipulated or AI-generated fake videos",
                  },
                  {
                    id: "malware",
                    icon: "fa-virus",
                    title: "Malware/APK",
                    desc: "Malicious applications or software",
                  },
                  {
                    id: "identity_theft",
                    icon: "fa-user-secret",
                    title: "Identity Theft",
                    desc: "Unauthorized use of personal information",
                  },
                  {
                    id: "financial_fraud",
                    icon: "fa-credit-card",
                    title: "Financial Fraud",
                    desc: "Unauthorized financial transactions",
                  },
                ].map((attack) => (
                  <div
                    key={attack.id}
                    className={`attack-card ${
                      selectedAttackType === attack.id ? "selected" : ""
                    }`}
                    onClick={() => handleAttackTypeSelect(attack.id)}
                  >
                    <div className="attack-icon">
                      <i className={`fas ${attack.icon}`}></i>
                    </div>
                    <h5>{attack.title}</h5>
                    <p>{attack.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: Incident Details */}
            <div className="form-section">
              <div className="section-header">
                <span className="section-number">3</span>
                <div className="section-title-wrapper">
                  <h4 className="section-title">Incident Details</h4>
                  <p className="section-subtitle">
                    Provide comprehensive information about the incident
                  </p>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group full-width">
                  <label htmlFor="scenario">
                    Incident Description <span className="required">*</span>
                  </label>
                  <textarea
                    id="scenario"
                    name="scenario"
                    rows="6"
                    required
                    placeholder="Please describe the incident in detail..."
                    value={formData.scenario}
                    onChange={handleInputChange}
                  ></textarea>
                  <small className="help-text">
                    Minimum 50 characters required
                  </small>
                </div>

                {selectedAttackType === "phishing" && (
                  <div className="form-group full-width" id="url-input">
                    <label htmlFor="url">Suspicious URL</label>
                    <input
                      type="url"
                      id="url"
                      name="url"
                      placeholder="https://suspicious-website.com"
                      value={formData.url}
                      onChange={handleInputChange}
                    />
                    <small className="help-text">
                      Enter the complete URL of the suspicious website
                    </small>
                  </div>
                )}

                <div className="form-group full-width">
                  <label htmlFor="additional_info">Additional Information</label>
                  <textarea
                    id="additional_info"
                    name="additional_info"
                    rows="4"
                    placeholder="Any other relevant details, witnesses, or supporting information..."
                    value={formData.additional_info}
                    onChange={handleInputChange}
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Section 4: Evidence Upload */}
            <div className="form-section">
              <div className="section-header">
                <span className="section-number">4</span>
                <div className="section-title-wrapper">
                  <h4 className="section-title">Evidence Upload</h4>
                  <p className="section-subtitle">
                    Upload screenshots, documents, or other evidence
                  </p>
                </div>
              </div>

              <div className="upload-container">
                <div
                  className="file-upload"
                  onClick={() => fileInputRef.current.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <i className="fas fa-cloud-upload-alt"></i>
                  <h4>Drag and drop files here</h4>
                  <p>or click to browse from your device</p>
                  <div className="supported-formats">
                    <span className="format-badge">
                      <i className="fas fa-image"></i> Images
                    </span>
                    <span className="format-badge">
                      <i className="fas fa-video"></i> Videos
                    </span>
                    <span className="format-badge">
                      <i className="fas fa-file-pdf"></i> PDF
                    </span>
                    <span className="format-badge">
                      <i className="fas fa-file-archive"></i> APK
                    </span>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept=".jpg,.jpeg,.png,.pdf,.mp4,.avi,.mov,.mkv,.apk"
                    style={{ display: "none" }}
                    onChange={handleFileSelect}
                  />
                </div>

                <div className="file-list">
                  {uploadedFiles.map((file, index) => (
                    <div className="file-item" key={index}>
                      <span>
                        <i className="fas fa-file"></i> {file.name} (
                        {formatFileSize(file.size)})
                      </span>
                      <i
                        className="fas fa-times remove-file"
                        onClick={() => removeFile(file.name)}
                      ></i>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            {isSubmitting && (
              <div
                className="progress-container"
                style={{ display: "block" }}
              >
                <div className="progress-label">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Declaration */}
            <div className="declaration-section">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  id="declaration"
                  name="declaration"
                  required
                  checked={formData.declaration}
                  onChange={handleInputChange}
                />
                <span className="checkmark"></span>
                <span className="declaration-text">
                  I hereby declare that the information provided above is true
                  and correct to the best of my knowledge. I understand that
                  providing false information is a punishable offense.
                </span>
              </label>
            </div>

            {/* Form Actions */}
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={resetForm}
              >
                <i className="fas fa-redo"></i> Reset Form
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="loading-spinner"></div> Submitting...
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane"></i> Submit Complaint
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Results Section */}
          {submissionResult && (
            <div
              className="results-section"
              ref={resultsSectionRef}
              style={{ display: "block" }}
            >
              <div className="result-header">
                <i className="fas fa-check-circle"></i>
                <h3>Complaint Submitted Successfully</h3>
              </div>

              <div id="complaintDetails">
                <h3>Complaint ID: {submissionResult.complaint_id}</h3>
                <div
                  className={`risk-badge ${submissionResult.risk_level || ""}`}
                >
                  Risk Level: {submissionResult.risk_level?.toUpperCase()}
                </div>
                <p>
                  <strong>Status:</strong> Pending Review
                </p>
                <p>
                  <strong>Attack Type:</strong>{" "}
                  {selectedAttackType
                    ? selectedAttackType.replace("_", " ").toUpperCase()
                    : "N/A"}
                </p>
              </div>

              <div className="analysis-section">
                {Object.keys(submissionResult.analysis_results || {}).length >
                0 ? (
                  Object.entries(submissionResult.analysis_results).map(
                    ([key, analysis], idx) => (
                      <div className="analysis-card" key={idx}>
                        <h3>{key.replace(/_/g, " ").toUpperCase()}</h3>
                        <div className="analysis-details">
                          {renderAnalysisContent(key, analysis)}
                        </div>
                      </div>
                    )
                  )
                ) : (
                  <p>
                    No specific file or URL analysis was performed for this
                    complaint type.
                  </p>
                )}
              </div>

              <div className="ai-assistance">
                  <div className="ai-header-with-button">
                    <h3>
                      <i className="fas fa-robot"></i> AI Security Assistance
                    </h3>

                    <button
                      className="btn btn-primary"
                      style={{ marginLeft: "auto" }}
                      onClick={() =>
                        generatePlaybookPDF(submissionResult.ai_assistance)
                      }
                    >
                      <i className="fas fa-book"></i> Playbook
                    </button>
                  </div>

                  {renderAiAssistance(submissionResult.ai_assistance)}
                </div>

            </div>
          )}

          {/* Chat Section */}
          <section className="chat-section">
            <div className="chat-header">
              <div className="chat-header-left">
                <i className="fas fa-robot"></i>
                <div>
                  <h4>AI Security Assistant</h4>
                  <p className="chat-status">
                    <span className="status-dot"></span> Online
                  </p>
                </div>
              </div>
              <button
                className="chat-minimize"
                onClick={() => setIsChatMinimized(!isChatMinimized)}
              >
                <i
                  className={`fas ${
                    isChatMinimized ? "fa-plus" : "fa-minus"
                  }`}
                ></i>
              </button>
            </div>

            {!isChatMinimized && (
              <div className="chat-body">
                <div className="chat-messages">
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`message ${
                        msg.type === "user" ? "user" : "ai"
                      }`}
                    >
                      <div className="message-avatar">
                        <i
                          className={`fas ${
                            msg.type === "user" ? "fa-user" : "fa-robot"
                          }`}
                        ></i>
                      </div>
                      <div className="message-content">
                        <strong>
                          {msg.type === "user" ? "You" : "AI Assistant"}
                        </strong>
                        <p>{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={chatBottomRef}></div>
                </div>
                <div className="chat-input-container">
                  <input
                    type="text"
                    placeholder="Type your question here..."
                    className="chat-input"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={handleChatKeyPress}
                    disabled={isChatLoading}
                  />
                  <button
                    type="button"
                    className="btn-chat-send"
                    onClick={handleSendChat}
                    disabled={isChatLoading || !chatInput.trim()}
                  >
                    {isChatLoading ? (
                      <div className="loading-spinner"></div>
                    ) : (
                      <i className="fas fa-paper-plane"></i>
                    )}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}