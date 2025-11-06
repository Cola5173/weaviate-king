import "./Header.css";

export default function Header() {
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
        <span className="header-status error">后端: error</span>
      </div>
    </div>
  );
}

