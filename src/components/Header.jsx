import React from 'react'
import emblem from "../assets/emblem.jpg";
import iccc from "../assets/iccc.png";
import "./Header.css"
export default function Header(){
  return (
    <header className="main-header">
      <div className="main-header-content">
        <div className="logos-and-title">
          <img src={emblem} alt="Indian Emblem" className="emblem-logo" />
          <img src={iccc} alt="ICCC" className="iccc-logo" />
          <div className="portal-titles">
            <p className="hindi-title">राष्ट्रीय साइबर अपराध रिपोर्टिंग पोर्टल</p>
            <p className="english-title">National Cyber Crime Reporting Portal</p>
          </div>
        </div>
        <div className="header-utility">
          <a href="/admin-login" className="login-link">Login</a>
        </div>
      </div>
    </header>
  )
}