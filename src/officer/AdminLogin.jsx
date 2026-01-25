import React, { useState } from "react";
import axios from "axios";
import "./login.css";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    try {
      const res = await axios.post("http://localhost:5006/admin-login", {
        email,
        password,
      });

      alert("Login success");
      localStorage.setItem("admin_id", res.data.admin_id);
      window.location.href = "/admin-dashboard";
    } catch (e) {
      alert("Invalid login");
    }
  };

  return (
    <div className="login-page">
      {/* MENU */}
      <div className="top-menu">
        <button
  className="active"
  onClick={() => (window.location.href = "/admin-login")}
>
  Admin Login
</button>
<button onClick={() => (window.location.href = "/member-login")}>
  Member Login
</button>

      </div>

      {/* LOGIN CARD */}
      <div className="login-box">
        <h2>Admin Login</h2>

        <input
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          placeholder="Password"
          type="password"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={login}>Login</button>
      </div>
    </div>
  );
}
