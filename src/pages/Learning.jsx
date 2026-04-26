import React, { useState } from "react";
import "./Learning.css";

const courseData = {
  network: {
    title: "Network Security",
    videos: {
      english: "https://www.youtube.com/embed/qiQR5rTSshw",
      tamil: "https://www.youtube.com/embed/3fumBcKC6RE",
      hindi: "https://www.youtube.com/embed/2Vv-BfVoq4g"
    },
    assessment: [
      {
        q: "What protocol secures web traffic?",
        options: ["HTTPS", "HTTP", "FTP"],
        answer: "HTTPS"
      },
      {
        q: "What is a firewall?",
        options: ["Security system", "Virus", "App"],
        answer: "Security system"
      },
    ]
  },

  web: {
    title: "Web Application Security",
    videos: {
      english: "https://www.youtube.com/embed/2eLe7uz-7CM",
      tamil: "https://www.youtube.com/embed/yXk6rK9gZKc",
      hindi: "https://www.youtube.com/embed/tVzUXW6siu0"
    },
    assessment: [
      {
        q: "What is XSS?",
        options: ["Cross-site scripting", "Firewall", "VPN"],
        answer: "Cross-site scripting"
      },
      {
        q: "SQL Injection means?",
        options: ["DB attack", "Login", "Network"],
        answer: "DB attack"
      },
    ]
  },

  malware: {
    title: "Malware Analysis",
    videos: {
      english: "https://www.youtube.com/embed/0R_4g7p6Y2c",
      tamil: "https://www.youtube.com/embed/9J7yJ7d4yQk",
      hindi: "https://www.youtube.com/embed/k9HYC0EJU6E"
    },
    assessment: [
      {
        q: "What is malware?",
        options: ["Malicious software", "Hardware", "Network"],
        answer: "Malicious software"
      },
      {
        q: "Virus spreads via?",
        options: ["Files", "Water", "Air"],
        answer: "Files"
      },
    ]
  }
};

const coursesList = [
  {
    id: "network",
    title: "Network Security",
    description:
      "Learn how to secure networks, defend against attacks, and monitor traffic.",
    image: "https://placehold.co/200x120/1a2a3a/fff?text=Network+Security",
  },
  {
    id: "web",
    title: "Web Application Security",
    description:
      "Discover common web vulnerabilities and techniques to protect web applications.",
    image: "https://placehold.co/200x120/1a2a3a/fff?text=Web+App+Security",
  },
  {
    id: "malware",
    title: "Malware Analysis",
    description: "Dissect malicious software to understand its behavior and impact.",
    image: "https://placehold.co/200x120/1a2a3a/fff?text=Malware+Analysis",
  },
];

const Learning = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [phase, setPhase] = useState("video"); // video | assessment | result
  const [language, setLanguage] = useState("english");
  const [assessmentAnswers, setAssessmentAnswers] = useState({});
  const [assessmentStatus, setAssessmentStatus] = useState("");
  const [score, setScore] = useState(0);
  const [passed, setPassed] = useState(false);

  const currentCourse = courseData[selectedCourse];

  const handleStartCourse = (courseId) => {
    setSelectedCourse(courseId);
    setPhase("video");
    setLanguage("english");
    setAssessmentAnswers({});
    setAssessmentStatus("");
    setScore(0);
    setPassed(false);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedCourse(null);
    setPhase("video");
  };

  const handleFinishWatching = () => {
    setPhase("assessment");
    setAssessmentStatus("");
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
      } else if (selected === q.answer) {
        correctAnswers++;
      }
    });

    if (!allAnswered) {
      setAssessmentStatus("Please answer all questions.");
      return;
    }

    const finalScore = (correctAnswers / totalQuestions) * 100;
    const isPassed = finalScore >= 80;

    setScore(finalScore);
    setPassed(isPassed);
    setAssessmentStatus("");
    setPhase("result");
  };

  const handleTryAgain = () => {
    setAssessmentAnswers({});
    setAssessmentStatus("");
    setScore(0);
    setPassed(false);
    setPhase("assessment");
  };

  return (
    <>
      <section className="banner">
        <h1>Cyber Learning Corner</h1>
        <p>
          Enhance your cybersecurity skills and earn certificates by completing
          our comprehensive courses.
        </p>
      </section>

      <main className="main-container">
        <section className="courses-section">
          <h2>Explore Our Courses</h2>
          <p className="section-description">
            Browse different cybersecurity domains and start your learning
            journey.
          </p>
          <div className="course-grid">
            {coursesList.map((course) => (
              <div key={course.id} className="course-card" data-course={course.id}>
                <img src={course.image} alt={course.title} />
                <h3>{course.title}</h3>
                <p>{course.description}</p>
                <button className="start-btn" onClick={() => handleStartCourse(course.id)}>
                  Start Course
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>

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

          {currentCourse && (
            <div id="courseContent">
              <div id="videoContainer">
                <div id="videoHeader">
                  <h3>{currentCourse.title}</h3>
                  <p id="moduleTitle">Course Video</p>
                </div>

                {phase === "video" && (
                  <>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      style={{ marginBottom: "10px", padding: "5px" }}
                    >
                      <option value="english">English</option>
                      <option value="tamil">Tamil</option>
                      <option value="hindi">Hindi</option>
                    </select>

                    <p>Loading video...</p>

                    <iframe
                      width="100%"
                      height="300"
                      src={`${currentCourse.videos[language]}?autoplay=1&rel=0&modestbranding=1`}
                      frameBorder="0"
                      allowFullScreen
                    />

                    <button id="nextModuleBtn" onClick={handleFinishWatching}>
                      I Finished Watching Video
                    </button>
                  </>
                )}

                {phase === "assessment" && (
                  <div id="assessmentContainer" className="assessment-box">
                    <h4>Final Course Assessment</h4>
                    <p>Score 80% or more to complete the course.</p>

                    <div id="quizQuestions">
                      {currentCourse.assessment.map((q, i) => (
                        <div key={i} className="question">
                          <p>
                            {i + 1}. {q.q}
                          </p>
                          {q.options.map((option, optIndex) => (
                            <label key={optIndex}>
                              <input
                                type="radio"
                                name={i}
                                value={option}
                                checked={assessmentAnswers[i] === option}
                                onChange={() => handleSelectAnswer(i, option)}
                              />
                              {option}
                            </label>
                          ))}
                        </div>
                      ))}
                    </div>

                    <button id="submitAssessmentBtn" onClick={handleSubmitAssessment}>
                      Submit Answers
                    </button>

                    <p
                      id="assessmentStatus"
                      style={{
                        color: assessmentStatus ? "#e74c3c" : "inherit",
                      }}
                    >
                      {assessmentStatus}
                    </p>
                  </div>
                )}

                {phase === "result" && (
                  <div id="assessmentContainer" className="assessment-box">
                    <h4>Assessment Result</h4>
                    <p>Your Score: {score.toFixed(0)}%</p>
                    <p style={{ color: passed ? "#5ac18e" : "#e74c3c", fontWeight: 700 }}>
                      {passed ? "Course Completed" : "Try Again"}
                    </p>

                    {!passed && (
                      <button id="submitAssessmentBtn" onClick={handleTryAgain}>
                        Retry Assessment
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Learning;
