import React from 'react'
import { useTranslation } from "react-i18next";

export default function NewsTicker() {
  const { t } = useTranslation();

  return (
    <div className="news-ticker-container">
      <div className="news-ticker">
        <p>{t("news_ticker_alert")}</p>
      </div>
    </div>
  );
}
