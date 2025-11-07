import { useEffect } from "react";
import "./Header.css";

export default function Header() {
  const theme = "light";

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("wk-theme", theme);
  }, [theme]);

  return (
    <div className="header">
      <div className="header-left">
        <img src="/logo.svg" alt="Weaviate-King" className="header-logo" />
        <div className="header-title-wrapper">
          <span className="header-title">Weaviate-King</span>
          <span className="header-subtitle">更人性化的 Weaviate GUI v0.1.0</span>
        </div>
      </div>
      <div className="header-right" />
    </div>
  );
}

