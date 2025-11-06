import { useEffect, useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import ClustersPage from "../pages/ClustersPage";
import CollectionsPage from "../pages/CollectionsPage";
import "./Layout.css";

export default function Layout() {
  const [activeMenu, setActiveMenu] = useState("home");
  const [collectionsSchema, setCollectionsSchema] = useState<any | null>(null);
  const [collectionsConnection, setCollectionsConnection] = useState<{ id: string; name: string; address: string } | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      setCollectionsSchema(detail.schema || null);
      setCollectionsConnection(detail.connection || null);
      setActiveMenu("collections");
    };
    window.addEventListener("navigate:collections", handler as EventListener);
    return () => window.removeEventListener("navigate:collections", handler as EventListener);
  }, []);

  const renderContent = () => {
    switch (activeMenu) {
      case "home":
      case "clusters":
        return <ClustersPage />;
      case "collections":
        return <CollectionsPage connection={collectionsConnection} schema={collectionsSchema} />;
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

