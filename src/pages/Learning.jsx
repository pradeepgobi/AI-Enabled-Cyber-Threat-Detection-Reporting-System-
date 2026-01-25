// src/pages/Learning.jsx
import React, { useState, useRef } from "react";
import "./learning.css"; // adjust path as needed

const DUMMY_VIDEO_URL =
  "https://www.youtube.com/embed/videoseries?list=PLBf0-G6oFq96S7B91054Jk7S0V124E56P";

const courseData = {
  network: {
    title: "Network Security",
    modules: Array.from({ length: 11 }, (_, i) => ({
      title: `Module ${i + 1}: Network Concept`,
      videoUrl: DUMMY_VIDEO_URL,
    })),
    assessment: [
      {
        q: "What protocol is used for secure web traffic?",
        a: ["HTTPS", "HTTP", "FTP"],
      },
      {
        q: "Which of these is a preventive control?",
        a: ["Firewall", "IDS", "Log Analyzer"],
      },
      {
        q: "What is the primary purpose of an IDS?",
        a: [
          "Detecting malicious activity",
          "Preventing all network traffic",
          "Encrypting data",
        ],
      },
      { q: "Which port is commonly used for DNS?", a: ["53", "80", "443"] },
      {
        q: "What is a SYN flood attack?",
        a: [
          "A type of DoS attack",
          "A type of malware",
          "A phishing technique",
        ],
      },
    ],
    ctfFlag: "CTF{PACKET_SNIFFER_COMPLETE}",
  },
  "web-app": {
    title: "Web Application Security",
    modules: Array.from({ length: 11 }, (_, i) => ({
      title: `Module ${i + 1}: Web App Vulnerabilities`,
      videoUrl: DUMMY_VIDEO_URL,
    })),
    assessment: [
      {
        q: "What does SQL Injection exploit?",
        a: ["Database Queries", "HTTP Headers", "User Input"],
      },
      {
        q: "What is the primary defense against XSS?",
        a: [
          "Input Validation & Output Encoding",
          "Firewall Rules",
          "HTTPS",
        ],
      },
      {
        q: "What is CSRF?",
        a: [
          "Cross-Site Request Forgery",
          "Cross-Site Role Function",
          "Cross-Server Resource File",
        ],
      },
      {
        q: "Which vulnerability can lead to remote code execution?",
        a: [
          "XML External Entities",
          "Security Misconfiguration",
          "Cross-Site Scripting",
        ],
      },
      {
        q: "What does a broken authentication vulnerability allow?",
        a: [
          "Impersonating legitimate users",
          "Accessing sensitive data",
          "Denial of Service",
        ],
      },
    ],
    ctfFlag: "CTF{XSS_INJECTION_PROTECTED}",
  },
  forensics: {
    title: "Digital Forensics",
    modules: Array.from({ length: 11 }, (_, i) => ({
      title: `Module ${i + 1}: Digital Evidence`,
      videoUrl: DUMMY_VIDEO_URL,
    })),
    assessment: [
      {
        q: "What is the first step in a forensic investigation?",
        a: ["System Isolation", "Evidence Analysis", "Reporting"],
      },
      {
        q: "Which file system is commonly used in Windows?",
        a: ["NTFS", "ext4", "HFS+"],
      },
      {
        q: "What tool is used for memory acquisition?",
        a: ["Volatility", "Wireshark", "Autopsy"],
      },
      {
        q: 'What does a "hash" ensure?',
        a: ["Data integrity", "Data encryption", "Data storage"],
      },
      {
        q: "What is the purpose of chain of custody?",
        a: [
          "Maintaining a record of evidence handling",
          "Encrypting evidence files",
          "Creating forensic images",
        ],
      },
    ],
    ctfFlag: "CTF{DATA_RECOVERY_COMPLETE}",
  },
  "ethical-hacking": {
    title: "Ethical Hacking",
    modules: Array.from({ length: 11 }, (_, i) => ({
      title: `Module ${i + 1}: Hacking Fundamentals`,
      videoUrl: DUMMY_VIDEO_URL,
    })),
    assessment: [
      {
        q: "What is passive reconnaissance?",
        a: [
          "Collecting information without direct interaction",
          "Actively scanning a network",
          "Exploiting a vulnerability",
        ],
      },
      {
        q: "What tool is commonly used for port scanning?",
        a: ["Nmap", "Wireshark", "Metasploit"],
      },
      {
        q: "What is the most common vulnerability in web applications?",
        a: ["SQL Injection", "Cross-Site Scripting", "Broken Authentication"],
      },
      {
        q: "What is the final phase of ethical hacking?",
        a: ["Reporting", "Exploitation", "Reconnaissance"],
      },
      {
        q: "Which attack uses psychological manipulation to trick people?",
        a: ["Social Engineering", "Denial of Service", "Malware"],
      },
    ],
    ctfFlag: "CTF{HACK_LIKE_PRO}",
  },
  malware: {
    title: "Malware Analysis",
    modules: Array.from({ length: 11 }, (_, i) => ({
      title: `Module ${i + 1}: Malware Analysis`,
      videoUrl: DUMMY_VIDEO_URL,
    })),
    assessment: [
      {
        q: "What does static analysis involve?",
        a: [
          "Examining the code without running it",
          "Executing the malware in a controlled environment",
          "Using a debugger to trace execution",
        ],
      },
      {
        q: "What is a sandbox used for?",
        a: [
          "Creating a secure environment for testing",
          "Storing malware samples",
          "Disassembling the malware code",
        ],
      },
      {
        q: "Which type of malware can take over a computer's operating system?",
        a: ["Rootkit", "Adware", "Spyware"],
      },
      {
        q: "What is the main goal of ransomware?",
        a: [
          "To encrypt data and demand a ransom",
          "To steal user credentials",
          "To send spam messages",
        ],
      },
      {
        q: "What is a trojan?",
        a: [
          "A malicious program disguised as a legitimate one",
          "A self-replicating virus",
          "A program that sends spam",
        ],
      },
    ],
    ctfFlag: "CTF{MALWARE_ANALYSIS_MASTER}",
  },
  cryptography: {
    title: "Cryptography",
    modules: Array.from({ length: 11 }, (_, i) => ({
      title: `Module ${i + 1}: Cryptographic Principles`,
      videoUrl: DUMMY_VIDEO_URL,
    })),
    assessment: [
      {
        q: "What is the goal of symmetric encryption?",
        a: [
          "Using the same key for encryption and decryption",
          "Using different keys for encryption and decryption",
          "Signing a message digitally",
        ],
      },
      {
        q: "Which algorithm is a classic example of asymmetric encryption?",
        a: ["RSA", "AES", "SHA-256"],
      },
      {
        q: "What does a hash function ensure?",
        a: ["Data integrity", "Data privacy", "Data confidentiality"],
      },
      {
        q: "What is a digital signature used for?",
        a: [
          "Authentication and non-repudiation",
          "Encrypting a message",
          "Signing a contract",
        ],
      },
      {
        q: "What is a salt used for in password hashing?",
        a: [
          "To prevent rainbow table attacks",
          "To speed up hashing",
          "To encrypt the password",
        ],
      },
    ],
    ctfFlag: "CTF{CRYPTO_CHALLENGE_SOLVED}",
  },
  cloud: {
    title: "Cloud Security",
    modules: Array.from({ length: 11 }, (_, i) => ({
      title: `Module ${i + 1}: Cloud Security`,
      videoUrl: DUMMY_VIDEO_URL,
    })),
    assessment: [
      {
        q: "What is the shared responsibility model?",
        a: [
          "A framework outlining security duties for the provider and the user",
          "A model for sharing cloud resources",
          "A legal document for cloud usage",
        ],
      },
      {
        q: "Which of these is a benefit of cloud security?",
        a: [
          "Scalability and cost-effectiveness",
          "Physical access control",
          "Full control over hardware",
        ],
      },
      {
        q: "What does a CASB do?",
        a: [
          "Enforces security policies for cloud access",
          "Encrypts cloud data",
          "Manages virtual machines",
        ],
      },
      {
        q: "What is a common threat in cloud computing?",
        a: [
          "Data breaches and misconfigurations",
          "Physical server theft",
          "Power outages",
        ],
      },
      {
        q: "What is the purpose of an API Gateway?",
        a: [
          "To act as a single entry point for all API calls",
          "To store user data",
          "To manage user authentication",
        ],
      },
    ],
    ctfFlag: "CTF{CLOUD_SECURED}",
  },
  iot: {
    title: "IoT Security",
    modules: Array.from({ length: 11 }, (_, i) => ({
      title: `Module ${i + 1}: IoT Security`,
      videoUrl: DUMMY_VIDEO_URL,
    })),
    assessment: [
      {
        q: "What is a major challenge in IoT security?",
        a: [
          "Lack of standardization and weak credentials",
          "High cost of devices",
          "Limited device functionality",
        ],
      },
      {
        q: "What protocol is often used for IoT communication?",
        a: ["MQTT", "HTTP", "FTP"],
      },
      {
        q: "Why is physical security important for IoT devices?",
        a: [
          "To prevent device tampering and data theft",
          "To keep the device cool",
          "To ensure network connectivity",
        ],
      },
      {
        q: "What is a common attack vector for IoT devices?",
        a: [
          "Default passwords and weak firmware",
          "Phishing emails",
          "Website vulnerabilities",
        ],
      },
      {
        q: "How can you protect your home IoT devices?",
        a: [
          "Using strong passwords and network segmentation",
          "Turning off all devices",
          "Using only one brand of devices",
        ],
      },
    ],
    ctfFlag: "CTF{IOT_PROTECTED}",
  },
};

const coursesList = [
  {
    id: "network",
    title: "Network Security",
    description:
      "Learn how to secure networks, defend against attacks, and monitor traffic.",
    image:
      "https://placehold.co/200x120/1a2a3a/fff?text=Network+Security",
  },
  {
    id: "web-app",
    title: "Web Application Security",
    description:
      "Discover common web vulnerabilities and techniques to protect web applications.",
    image:
      "https://placehold.co/200x120/1a2a3a/fff?text=Web+App+Security",
  },
  {
    id: "forensics",
    title: "Digital Forensics",
    description:
      "Uncover the secrets of digital evidence and learn how to trace cyber incidents.",
    image:
      "https://placehold.co/200x120/1a2a3a/fff?text=Digital+Forensics",
  },
  {
    id: "ethical-hacking",
    title: "Ethical Hacking",
    description:
      "Understand the mindset of a hacker to build stronger defenses.",
    image:
      "https://placehold.co/200x120/1a2a3a/fff?text=Ethical+Hacking",
  },
  {
    id: "malware",
    title: "Malware Analysis",
    description:
      "Dissect malicious software to understand its behavior and impact.",
    image:
      "https://placehold.co/200x120/1a2a3a/fff?text=Malware+Analysis",
  },
  {
    id: "cryptography",
    title: "Cryptography",
    description:
      "Learn the principles of secure communication and data encryption.",
    image:
      "https://placehold.co/200x120/1a2a3a/fff?text=Cryptography",
  },
  {
    id: "cloud",
    title: "Cloud Security",
    description:
      "Secure cloud environments, data, and applications from cyber threats.",
    image:
      "https://placehold.co/200x120/1a2a3a/fff?text=Cloud+Security",
  },
  {
    id: "iot",
    title: "IoT Security",
    description:
      "Address security challenges in the world of connected devices.",
    image: "https://placehold.co/200x120/1a2a3a/fff?text=IoT+Security",
  },
];

const Learning = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [currentCourseId, setCurrentCourseId] = useState(null);
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [phase, setPhase] = useState("modules"); // "modules" | "assessment" | "ctf" | "certificate"
  const [assessmentAnswers, setAssessmentAnswers] = useState({});
  const [assessmentStatus, setAssessmentStatus] = useState("");
  const [ctfInput, setCtfInput] = useState("");
  const [ctfStatus, setCtfStatus] = useState("");
  const [certName, setCertName] = useState("");
  const [certDate, setCertDate] = useState("");
  const [certGenerated, setCertGenerated] = useState(false);

  const certificatePreviewRef = useRef(null);

  const currentCourse =
    currentCourseId && courseData[currentCourseId]
      ? courseData[currentCourseId]
      : null;

  const currentModule =
    currentCourse && currentCourse.modules[currentModuleIndex]
      ? currentCourse.modules[currentModuleIndex]
      : null;

  const handleStartCourse = (courseId) => {
    setCurrentCourseId(courseId);
    setCurrentModuleIndex(0);
    setPhase("modules");
    setAssessmentAnswers({});
    setAssessmentStatus("");
    setCtfInput("");
    setCtfStatus("");
    setCertName("");
    setCertDate("");
    setCertGenerated(false);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setCurrentCourseId(null);
    setPhase("modules");
  };

  const handleNextModule = () => {
    if (!currentCourse) return;
    if (currentModuleIndex < currentCourse.modules.length - 1) {
      setCurrentModuleIndex((idx) => idx + 1);
    } else {
      setPhase("assessment");
    }
  };

  const handleSelectAnswer = (qIndex, option) => {
    setAssessmentAnswers((prev) => ({
      ...prev,
      [qIndex]: option,
    }));
  };

  const handleSubmitAssessment = () => {
    if (!currentCourse) return;
    const totalQuestions = currentCourse.assessment.length;
    let correctAnswers = 0;
    let allAnswered = true;

    currentCourse.assessment.forEach((q, i) => {
      const selected = assessmentAnswers[i];
      if (!selected) {
        allAnswered = false;
      } else if (selected === q.a[0]) {
        correctAnswers++;
      }
    });

    if (!allAnswered) {
      setAssessmentStatus("Please answer all questions.");
      return;
    }

    const score = (correctAnswers / totalQuestions) * 100;
    if (score >= 80) {
      setAssessmentStatus(
        `You passed with a score of ${score.toFixed(
          0
        )}%! You can now proceed to the CTF challenge.`
      );
      setPhase("ctf");
    } else {
      setAssessmentStatus(
        `You scored ${score.toFixed(
          0
        )}%. You must score 80% to pass. Please review the modules and try again.`
      );
    }
  };

  const handleVerifyFlag = () => {
    if (!currentCourse) return;
    const enteredFlag = ctfInput.trim();
    if (enteredFlag === currentCourse.ctfFlag) {
      setCtfStatus(
        "Correct! You have completed the challenge and earned your certificate."
      );
      setPhase("certificate");
    } else {
      setCtfStatus("Incorrect flag. Please try again.");
    }
  };

  const handleGenerateCertificate = () => {
    const name = certName.trim();
    if (!name || !currentCourse) return;
    setCertDate(new Date().toLocaleDateString());
    setCertGenerated(true);
  };

  const handleDownloadPdf = async () => {
    const element = certificatePreviewRef.current;
    if (!element) return;

    const jspdf = window.jspdf;
    const html2canvas = window.html2canvas;

    if (!jspdf || !html2canvas) {
      console.error(
        "jsPDF or html2canvas not found on window. Ensure CDN scripts are loaded in index.html."
      );
      return;
    }

    const { jsPDF } = jspdf;
    const doc = new jsPDF("l", "mm", "a4");

    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const imgProps = doc.getImageProperties(imgData);
    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    doc.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    const safeName = (certName || "Certificate").replace(/\s+/g, "_");
    const courseTitle = currentCourse ? currentCourse.title : "Course";
    doc.save(`${safeName}_${courseTitle}_Certificate.pdf`);
  };

  return (
    <>
      

      {/* Main Banner */}
      <section className="banner">
        <h1>Cyber Learning Corner</h1>
        <p>
          Enhance your cybersecurity skills and earn certificates by completing
          our comprehensive courses.
        </p>
      </section>

      <main className="main-container">
        {/* Course Domains Section */}
        <section className="courses-section">
          <h2>Explore Our Courses</h2>
          <p className="section-description">
            Browse different cybersecurity domains and start your learning
            journey. Complete all modules, pass the final assessment with an 80%
            score, and complete the CTF challenge to earn your certificate.
          </p>
          <div className="course-grid">
            {coursesList.map((course) => (
              <div
                key={course.id}
                className="course-card"
                data-course={course.id}
              >
                <img src={course.image} alt={course.title} />
                <h3>{course.title}</h3>
                <p>{course.description}</p>
                <button
                  className="start-btn"
                  onClick={() => handleStartCourse(course.id)}
                >
                  Start Course
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Course Modal */}
      <div
        id="courseModal"
        className="modal"
        style={{ display: modalOpen ? "flex" : "none" }}
        onClick={(e) => {
          if (e.target.id === "courseModal") handleCloseModal();
        }}
      >
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <span className="close-btn" onClick={handleCloseModal}>
            &times;
          </span>

          {currentCourse && phase !== "certificate" && (
            <div id="courseContent">
              <div id="videoContainer">
                <div id="videoHeader">
                  <h3>{currentCourse.title}</h3>
                  <p id="moduleTitle">
                    {currentModule
                      ? `Module ${currentModuleIndex + 1}: ${
                          currentModule.title
                        }`
                      : ""}
                  </p>
                </div>
                <iframe
                  id="courseVideo"
                  width="100%"
                  height="315"
                  src={currentModule ? currentModule.videoUrl : ""}
                  title="Course Video"
                  frameBorder="0"
                  allowFullScreen
                ></iframe>
              </div>

              {phase === "modules" && (
                <button id="nextModuleBtn" onClick={handleNextModule}>
                  Next Module
                </button>
              )}

              {phase === "assessment" && (
                <div id="assessmentContainer" className="assessment-box">
                  <h4>Final Course Assessment</h4>
                  <p>
                    Answer the questions below. You must score 80% or more to
                    pass this course and proceed to the CTF.
                  </p>
                  <div id="quizQuestions">
                    {currentCourse.assessment.map((q, i) => (
                      <div key={i} className="question">
                        <p>
                          {i + 1}. {q.q}
                        </p>
                        {q.a.map((option) => (
                          <label key={option}>
                            <input
                              type="radio"
                              name={`q${i}`}
                              value={option}
                              checked={assessmentAnswers[i] === option}
                              onChange={() =>
                                handleSelectAnswer(i, option)
                              }
                            />
                            {option}
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                  <button
                    id="submitAssessmentBtn"
                    onClick={handleSubmitAssessment}
                  >
                    Submit Answers
                  </button>
                  <p
                    id="assessmentStatus"
                    style={{
                      color:
                        assessmentStatus.includes("passed") ||
                        assessmentStatus.includes("proceed")
                          ? "#5ac18e"
                          : assessmentStatus
                          ? "#e74c3c"
                          : "inherit",
                    }}
                  >
                    {assessmentStatus}
                  </p>
                </div>
              )}

              {phase === "ctf" && (
                <div id="ctfContainer" className="ctf-box">
                  <h4>Final Challenge: Find the Flag!</h4>
                  <p>
                    You've passed the assessment! The flag is a secret code
                    hidden in this course's videos or documentation. Enter it
                    below to earn your certificate.
                  </p>
                  <div className="form-group">
                    <label htmlFor="flagInput">Enter the Flag</label>
                    <input
                      type="text"
                      id="flagInput"
                      placeholder="Flag format: CTF{...}"
                      value={ctfInput}
                      onChange={(e) => setCtfInput(e.target.value)}
                    />
                  </div>
                  <button id="verifyBtn" onClick={handleVerifyFlag}>
                    Verify Flag
                  </button>
                  <p
                    id="ctfStatus"
                    style={{
                      color: ctfStatus.includes("Correct")
                        ? "#5ac18e"
                        : ctfStatus
                        ? "#e74c3c"
                        : "inherit",
                    }}
                  >
                    {ctfStatus}
                  </p>
                </div>
              )}
            </div>
          )}

          {currentCourse && phase === "certificate" && (
            <div
              id="certificateContainer"
              className="certificate-container"
            >
              <div
                className="certificate-preview"
                id="certificatePreview"
                ref={certificatePreviewRef}
                style={{ display: certGenerated ? "block" : "none" }}
              >
                <h2>Certificate of Completion</h2>
                <p>This certifies that</p>
                <h1 id="certName">{certName}</h1>
                <p>has successfully completed the course in</p>
                <h2 id="certCourse">{currentCourse.title}</h2>
                <p>and has demonstrated proficiency in the subject matter.</p>
                <div className="certificate-info">
                  <span>
                    Date: <span id="certDate">{certDate}</span>
                  </span>
                  <span>
                    Signature:{" "}
                    <img
                      src="https://placehold.co/100x50/A0C49D/333?text=Signature"
                      alt="Signature"
                    />
                  </span>
                </div>
              </div>

              {!certGenerated && (
                <div id="nameFormGroup" style={{ marginTop: 20 }}>
                  <label htmlFor="certificateName">
                    Enter your name for the certificate:
                  </label>
                  <input
                    type="text"
                    id="certificateName"
                    placeholder="Your Full Name"
                    value={certName}
                    onChange={(e) => setCertName(e.target.value)}
                  />
                </div>
              )}

              {!certGenerated && (
                <button
                  id="generateCertBtn"
                  onClick={handleGenerateCertificate}
                >
                  Generate Certificate Preview
                </button>
              )}

              {certGenerated && (
                <button
                  id="downloadPdfBtn"
                  onClick={handleDownloadPdf}
                >
                  Download as PDF
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Learning;
