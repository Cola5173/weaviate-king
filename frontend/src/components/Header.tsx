import { useEffect, useState } from "react";
import { Switch, Tooltip } from "antd";
import "./Header.css";

export default function Header() {
  const [theme, setTheme] = useState<string>(() => {
    const saved = localStorage.getItem("wk-theme");
    return saved === "light" ? "light" : "dark";
  });

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
      <div className="header-right">
        <Tooltip title={theme === "dark" ? "切换到明亮模式" : "切换到暗黑模式"}>
          <Switch
            checked={theme === "dark"}
            onChange={(checked) => setTheme(checked ? "dark" : "light")}
            checkedChildren="🌙"
            unCheckedChildren="☀️"
          />
        </Tooltip>
      </div>
    </div>
  );
}

