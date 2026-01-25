import React from 'react'
import { useTranslation } from "react-i18next";

export default function TopBar(){
  const { t, i18n } = useTranslation();

  const changeLanguage = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <div className="top-bar">
      <div className="top-bar-left">
        <span>{t("gov_hi")}</span>
        <span>{t("gov_en")}</span>
      </div>

      <div className="top-bar-right">
        <span className="language-text">{t("language")}</span>

        <select className="language-dropdown" defaultValue="en" onChange={changeLanguage}>
          <option value="en">English</option>
          <option value="hi">हिंदी</option>
        </select>
      </div>
    </div>
  )
}
