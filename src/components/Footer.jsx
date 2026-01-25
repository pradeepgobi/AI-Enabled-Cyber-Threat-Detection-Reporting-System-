import React from "react";
import { useTranslation } from "react-i18next";
import footer from "../assets/footer.jpg";
import foo from "../assets/foo.jpg";

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="main-footer">
      <div className="footer-grid">

        {/* Logo Section */}
        <div
          className="footer-section logos-section"
          style={{ display: "flex", gap: "15px", alignItems: "center" }}
        >
          <img
            src={foo}
            alt="Govt Logo 1"
            className="footer-logo"
            style={{ width: "80px", height: "100px", objectFit: "contain" }}
          />
          <img
            src={footer}
            alt="Govt Logo 2"
            className="footer-logo"
            style={{ width: "80px", height: "100px", objectFit: "contain" }}
          />
        </div>

        {/* Quick Links */}
        <div className="footer-section">
          <h4>{t("quick_links")}</h4>
          <ul>
            <li><a href="#">{t("about_us")}</a></li>
            <li><a href="#">{t("faqs")}</a></li>
            <li><a href="#">{t("sitemap")}</a></li>
          </ul>
        </div>

        {/* Contact Section */}
        <div className="footer-section">
          <h4>{t("contact_us")}</h4>
          <p>{t("email")}: contact@portal.gov.in</p>
          <p>{t("phone")}: 1800-123-4567</p>
        </div>

      </div>
    </footer>
  );
}
