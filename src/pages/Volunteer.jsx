// Volunteer.jsx
import React, { useEffect } from "react";
// adjust path as per your project structure:
import "./Volunteer.css"; 

const Volunteer = () => {
  // optional: clean up dark theme on unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove("dark-theme");
    };
  }, []);

  const handleThemeToggle = () => {
    document.body.classList.toggle("dark-theme");
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  const formData = {
    fullName: e.target.fullName.value,
    email: e.target.email.value,
    volunteerType: e.target.volunteerType.value,
    organizationName: e.target.organizationName.value || "",
    skills: e.target.skills.value,
  };

  try {
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:5006"}/api/volunteer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const result = await response.json();

    if (response.ok) {
      alert(result.message);
      e.target.reset();
    } else {
      alert(result.error || "Failed to submit application.");
    }
  } catch (err) {
    console.error(err);
    alert("Network error. Could not submit application.");
  }
};


  return (
    <>
      {/* Top Govt bar */}
      

      {/* Header */}
      <header className="main-header">
        <div className="header-container">
          <div className="header-left">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg"
              alt="Emblem of India"
              className="emblem"
              style={{ height: "70px" }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div className="header-titles">
              <h1 className="portal-title">Cyber Volunteer Program</h1>
              <p className="portal-subtitle">Contribute to National Cyber Security</p>
            </div>
          </div>
          <div className="header-right">
            <div className="emergency-number">
              <i className="fas fa-handshake"></i>
              <div className="emergency-info">
                <span className="helpline-label">Secure Volunteering</span>
                <span className="helpline-number">JOIN US</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      

      <main className="main-content">
        <div className="content-wrapper">
          {/* Hero / Banner */}
          <section className="volunteer-banner-section">
            <div className="hero-content">
              <h1 className="hero-title">Join Our Cyber Volunteer Program</h1>
              <p className="hero-description">
                Contribute to a safer digital world. Your expertise can make a
                difference in national cyber security.
              </p>
            </div>
          </section>

          {/* Intro / Why volunteer */}
          <section className="intro-section">
            <h2 className="section-heading">Why Volunteer with Us?</h2>
            <p className="section-description-text">
              The CyberSecure Volunteer Program is a platform for individuals and
              organizations to lend their skills and passion to combat cyber threats.
              By joining, you help us analyze cases, identify emerging trends, and
              protect the public from online harm.
            </p>
            <div className="benefits-grid">
              <div className="benefit-card">
                <i className="fas fa-shield-alt"></i>
                <h3>Protect the Community</h3>
                <p>Use your skills for good and make the internet a safer place for everyone.</p>
              </div>
              <div className="benefit-card">
                <i className="fas fa-lightbulb"></i>
                <h3>Gain Experience</h3>
                <p>Work on real-world cases and enhance your cybersecurity expertise.</p>
              </div>
              <div className="benefit-card">
                <i className="fas fa-network-wired"></i>
                <h3>Be Part of a Network</h3>
                <p>Collaborate with a community of like-minded professionals and enthusiasts.</p>
              </div>
            </div>
          </section>

          {/* Registration form */}
          <section className="registration-section">
            <h2 className="section-heading">Become a Volunteer</h2>
            <p className="section-description-text">
              Fill out the form below to register your interest in joining our
              program. We will review your application and get in touch.
            </p>

            <form
              id="volunteerForm"
              className="volunteer-form"
              onSubmit={handleSubmit}
            >
              <div className="form-grid-single-col">
                <div className="form-group">
                  <label htmlFor="fullName">Full Name</label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    Are you registering as an individual or an organization?
                  </label>
                  <div className="radio-group">
                    <label>
                      <input
                        type="radio"
                        name="volunteerType"
                        value="individual"
                        defaultChecked
                      />{" "}
                      Individual
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="volunteerType"
                        value="organization"
                      />{" "}
                      Organization
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="organizationName">
                    Organization Name (if applicable)
                  </label>
                  <input
                    type="text"
                    id="organizationName"
                    name="organizationName"
                    placeholder="Enter your organization's name"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="skills">Your Skills/Expertise</label>
                  <textarea
                    id="skills"
                    name="skills"
                    rows={4}
                    placeholder="e.g., threat analysis, malware research, digital forensics..."
                    required
                  ></textarea>
                </div>
              </div>

              <div className="form-actions-center">
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-paper-plane"></i> Submit Application
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </>
  );
};

export default Volunteer;
