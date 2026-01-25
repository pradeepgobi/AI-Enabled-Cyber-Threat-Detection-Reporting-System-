import React from 'react'
import { Link } from 'react-router-dom';
import { useTranslation } from "react-i18next";

export default function NavBar() {

  const { t } = useTranslation();   

  return (
    <nav className="nav-bar">
      <ul>
        <li><Link to="/">{t("home")}</Link></li>
        <li><Link to="/problem-categories">{t("complaint")}</Link></li>
        <li><Link to="/TrackComplaint">{t("track")}</Link></li>
        <li><Link to="/report">{t("report")}</Link></li>
        <li><Link to="/volunteer">{t("volunteer")}</Link></li>
        <li><Link to="/learning">{t("learning")}</Link></li>
        <li><Link to="/admin-login">{t("login")}</Link></li>
      </ul>
    </nav>
  );
}