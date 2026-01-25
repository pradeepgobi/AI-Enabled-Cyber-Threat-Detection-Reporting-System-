import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function MainContent() {
  const { t } = useTranslation();

  return (
    <main>
      <section className="main-content-grid">

        <div className="section-card">
          <h2>{t("register_complaint")}</h2>
          <p>{t("register_complaint_desc")}</p>
          <Link to="/problem-categories" className="section-btn">
            {t("start_now")}
          </Link>
        </div>

        <div className="section-card">
          <h2>{t("track_complaint")}</h2>
          <p>{t("track_complaint_desc")}</p>
          <Link to="/trackcomplaint" className="section-btn">
            {t("track_now")}
          </Link>
        </div>

        <div className="section-card">
          <h2>{t("learning_portal")}</h2>
          <ul>
            <li>{t("courses")}</li>
            <li>{t("cyber_awareness")}</li>
            <li>{t("attack_prevention")}</li>
          </ul>
          <Link to="/learning" className="section-btn">
            {t("explore_now")}
          </Link>
        </div>

        <div className="section-card">
          <h2>{t("gov_links")}</h2>
          <ul className="link-list">
            <li>{t("cert")}</li>
            <li>{t("cyber_police")}</li>
            <li>{t("nciipc")}</li>
          </ul>
        </div>

        <div className="section-card">
          <h2>{t("volunteers")}</h2>
          <p>{t("volunteer_desc")}</p>
          <Link to="/volunteer" className="section-btn">
            {t("join_now")}
          </Link>
        </div>

      </section>

      {/* Crimes Section */}
      <section className="info-section types-of-crime">
        <div className="info-container">
          <h2 className="section-title">{t("common_cyber_crimes")}</h2>
          <div className="crime-grid">

            <div className="crime-item">
              <h3>{t("financial_fraud")}</h3>
              <p>{t("financial_fraud_desc")}</p>
            </div>

            <div className="crime-item">
              <h3>{t("identity_theft")}</h3>
              <p>{t("identity_theft_desc")}</p>
            </div>

            <div className="crime-item">
              <h3>{t("cyberstalking")}</h3>
              <p>{t("cyberstalking_desc")}</p>
            </div>

            <div className="crime-item">
              <h3>{t("malware")}</h3>
              <p>{t("malware_desc")}</p>
            </div>

          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="info-section how-to-report">
        <div className="info-container">
          <h2 className="section-title">{t("report_steps")}</h2>
          <div className="step-grid">

            <div className="step-item">
              <div className="step-number">1</div>
              <h3>{t("step1_title")}</h3>
              <p>{t("step1_desc")}</p>
            </div>

            <div className="step-item">
              <div className="step-number">2</div>
              <h3>{t("step2_title")}</h3>
              <p>{t("step2_desc")}</p>
            </div>

            <div className="step-item">
              <div className="step-number">3</div>
              <h3>{t("step3_title")}</h3>
              <p>{t("step3_desc")}</p>
            </div>

            <div className="step-item">
              <div className="step-number">4</div>
              <h3>{t("step4_title")}</h3>
              <p>{t("step4_desc")}</p>
            </div>

          </div>
        </div>
      </section>
    </main>
  );
}
