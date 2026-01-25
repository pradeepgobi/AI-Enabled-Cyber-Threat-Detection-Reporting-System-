import React, { useState } from "react";
import axios from "axios";
import "./login.css";

const API_BASE = "http://localhost:5006"; // Update if needed

export default function MemberLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    try {
      const response = await axios.post(`${API_BASE}/member-login`, {
        email,
        password,
      });

      if (response.data) {
        const { member_id, team } = response.data;

        // store in localStorage
        localStorage.setItem("member_id", member_id);
        localStorage.setItem("team", team);

        // redirect to team dashboard
        window.location.href = "/team";
      }
    } catch (error) {
      if (error.response) {
        alert(error.response.data.msg);
      } else {
        alert("Server error. Please try again.");
      }
    }
  };

  return (
    <div className="login-page">
      <div className="top-menu">
        <button onClick={() => (window.location.href = "/admin-login")}>
          Admin Login
        </button>
        <button
          className="active"
          onClick={() => (window.location.href = "/member-login")}
        >
          Member Login
        </button>
      </div>

      <div className="login-box">
        <h2>Team Member Login</h2>

        <input
          placeholder="Enter Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          placeholder="Enter Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={login}>Login</button>
      </div>
    </div>
  );
}