import React, { useState, useEffect } from "react";
import "./Login.css";

const API_URL = import.meta.env.VITE_API_URL;

// Generate Captcha
const generateCaptcha = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
};

const CitizenLogin = () => {
  const [loginId, setLoginId] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [captcha, setCaptcha] = useState(generateCaptcha());
  const [captchaInput, setCaptchaInput] = useState("");

  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  const [resendIn, setResendIn] = useState(0);

  // Timer for OTP resend
  useEffect(() => {
    if (resendIn === 0) return;

    const timer = setInterval(() => {
      setResendIn((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [resendIn]);

  const formatPhone = () => `${countryCode}${mobile.trim()}`;

  const setError = (msg) => {
    setMessageType("error");
    setMessage(msg);
  };

  const setSuccess = (msg) => {
    setMessageType("success");
    setMessage(msg);
  };

  const refreshCaptcha = () => {
    setCaptcha(generateCaptcha());
    setCaptchaInput("");
  };

  // ================================================
  // SEND USER OTP
  // ================================================
  const handleGetOtp = async () => {
    setMessage("");

    if (!loginId.trim()) return setError("Please enter your Name.");
    if (!mobile.trim() || mobile.trim().length < 10)
      return setError("Please enter a valid Mobile Number.");
    if (captchaInput.trim().toUpperCase() !== captcha.toUpperCase())
      return setError("Captcha does not match.");

    try {
      setIsSendingOtp(true);

      const res = await fetch(`${API_URL}/send-user-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loginId,
          phone: formatPhone(),
        }),
      });

      const data = await res.json();

      if (data.status === "success") {
        setSuccess("OTP sent successfully.");
        setResendIn(60);

        // Auto-fill OTP in development if backend returns dev_otp
        if (data.dev_otp) {
          setOtp(data.dev_otp);
        }
      } else {
        setError(data.message || "Failed to send OTP.");
      }
    } catch (err) {
      console.error(err);
      setError("Server error while sending OTP.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  // ================================================
  // VERIFY OTP + SAVE USER
  // ================================================
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!loginId.trim()) return setError("Please enter Name.");
    if (!mobile.trim() || mobile.trim().length < 10)
      return setError("Enter valid Mobile Number.");
    if (!otp.trim()) return setError("Enter OTP.");
    if (!captchaInput.trim()) return setError("Enter Captcha.");
    if (captchaInput.toUpperCase() !== captcha.toUpperCase())
      return setError("Captcha does not match.");

    try {
      setIsVerifying(true);

      // 1️⃣ Verify OTP
      const resOtp = await fetch(`${API_URL}/verify-user-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: formatPhone(),
          otp,
        }),
      });

      const otpData = await resOtp.json();

      if (!otpData.verified) {
        return setError(otpData.message || "Invalid OTP.");
      }

      // 2️⃣ Save User Data
      const resSave = await fetch(`${API_URL}/save-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: loginId,
          phone: formatPhone(),
        }),
      });

      const saveData = await resSave.json();

      if (!saveData.success) {
        return setError(saveData.message || "Failed to save user.");
      }

      // 3️⃣ Success Redirect
      setSuccess("Login Successful! Redirecting...");
      setTimeout(() => {
        window.location.href = "/complaint";
      }, 800);
    } catch (err) {
      console.error(err);
      setError("Verification failed.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClear = () => {
    setLoginId("");
    setMobile("");
    setOtp("");
    setCaptchaInput("");
    setCaptcha(generateCaptcha());
    setMessage("");
    setResendIn(0);
  };

  return (
    <div className="cl-page">
      <div className="cl-card">
        {/* LEFT SECTION */}
        <section className="cl-left">
          <h2 className="cl-section-title">CHECKLIST FOR COMPLAINANT</h2>
          <p className="cl-warning-text">Please keep this information ready:</p>
          <ol className="cl-list">
            <li>Incident Date &amp; Time</li>
            <li>Minimum 200-character description</li>
            <li>National ID (jpeg/jpg/png)</li>
            <li>Bank details for financial frauds</li>
            <li>Evidence documents</li>
          </ol>
        </section>

        {/* RIGHT SECTION */}
        <section className="cl-right">
          <h2 className="cl-section-title center">CITIZEN LOGIN</h2>

          <form className="cl-form" onSubmit={handleVerifyOtp}>
            {/* Name */}
            <div className="cl-form-group">
              <label className="cl-label">Name *</label>
              <input
                className="cl-input"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="Your Name"
              />
            </div>

            {/* Mobile Number + OTP */}
            <div className="cl-form-group">
              <label className="cl-label">Mobile No. *</label>
              <div className="cl-mobile-row">
                <select
                  className="cl-select"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                >
                  <option value="+91">+91</option>
                </select>

                <input
                  className="cl-input"
                  placeholder="Mobile Number"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                />

                <button
                  type="button"
                  className="cl-btn cl-btn-primary"
                  disabled={isSendingOtp || resendIn > 0}
                  onClick={handleGetOtp}
                >
                  {resendIn ? `Get OTP (${resendIn}s)` : "Get OTP"}
                </button>
              </div>
            </div>

            {/* OTP */}
            <div className="cl-form-group">
              <label className="cl-label">OTP *</label>
              <input
                className="cl-input"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>

            {/* CAPTCHA */}
            <div className="cl-form-group">
              <label className="cl-label">Captcha *</label>

              <div className="cl-captcha-row">
                <div className="cl-captcha-box">{captcha}</div>
                <button
                  type="button"
                  className="cl-captcha-refresh"
                  onClick={refreshCaptcha}
                >
                  ↻
                </button>
              </div>

              <input
                className="cl-input"
                placeholder="Enter Captcha"
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value)}
              />
            </div>

            {/* Messages */}
            {message && (
              <div
                className={
                  messageType === "success"
                    ? "cl-alert cl-alert-success"
                    : messageType === "error"
                    ? "cl-alert cl-alert-error"
                    : "cl-alert cl-alert-info"
                }
              >
                {message}
              </div>
            )}

            {/* Buttons */}
            <div className="cl-button-row">
              <button
                type="button"
                className="cl-btn cl-btn-danger"
                onClick={handleClear}
              >
                Clear
              </button>

              <button type="submit" className="cl-btn cl-btn-success">
                {isVerifying ? "Verifying..." : "Submit"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default CitizenLogin;
