import React, { useEffect, useState } from 'react'
import { useTranslation } from "react-i18next";

const images = [
  "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=2070&auto=format&fit=crop"
];

export default function HeroCarousel() {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex(i => (i + 1) % images.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="hero-section">
      <div className="hero-carousel">
        {images.map((src, i) => (
          <div
            key={i}
            className={`carousel-image ${i === index ? "active" : ""}`}
            style={{ backgroundImage: `url('${src}')` }}
          />
        ))}
      </div>

      <div className="hero-content-container">
        <h1>{t("hero_title")}</h1>
        <p>{t("hero_subtitle")}</p>
        <a href="/admin-login" className="cta-btn">
          {t("file_complaint_now")}
        </a>
      </div>
    </section>
  );
}
