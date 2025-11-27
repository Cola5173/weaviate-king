import { useEffect } from "react";
import "./Header.css";

export default function Header() {
  const theme = "light";

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("wk-theme", theme);
  }, [theme]);

  // 阻止拖拽区域的文本选择
  useEffect(() => {
    const headerElement = document.querySelector('.header');
    if (!headerElement) return;

    const preventSelection = (e: Event) => {
      e.preventDefault();
      return false;
    };

    // 阻止文本选择，但不阻止拖拽
    headerElement.addEventListener('selectstart', preventSelection);
    headerElement.addEventListener('contextmenu', preventSelection);

    return () => {
      headerElement.removeEventListener('selectstart', preventSelection);
      headerElement.removeEventListener('contextmenu', preventSelection);
    };
  }, []);

  return (
    <div className="header">
      <div className="header-left">
        <img src="/logo.svg" alt="Weaviate-King" className="header-logo" />
        <div className="header-title-wrapper">
          <span className="header-title">Weaviate-King</span>
          <span className="header-subtitle">更人性化的 Weaviate GUI v0.1.0</span>
        </div>
      </div>
    </div>
  );
}

