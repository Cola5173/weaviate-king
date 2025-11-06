import { useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import ClustersPage from "../pages/ClustersPage";
import "./Layout.css";

export default function Layout() {
  const [activeMenu, setActiveMenu] = useState("clusters");

  const renderContent = () => {
    switch (activeMenu) {
      case "clusters":
        return <ClustersPage />;
      default:
        return <ClustersPage />;
    }
  };

  return (
    <div className="layout">
      <Header />
      <div className="layout-body">
        <Sidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} />
        <div className="layout-content">{renderContent()}</div>
      </div>
    </div>
  );
}

