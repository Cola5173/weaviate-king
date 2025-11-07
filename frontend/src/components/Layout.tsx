import { useEffect, useState } from "react";
import { BACKEND_BASE_URL } from "../config";
import Header from "./Header";
import Sidebar from "./Sidebar";
import ClustersPage from "../pages/ClustersPage";
import CollectionsPage from "../pages/CollectionsPage";
import ObjectsPage from "../pages/ObjectsPage";
import "./Layout.css";

export default function Layout() {
  const [activeMenu, setActiveMenu] = useState("home");
  const [collectionsSchema, setCollectionsSchema] = useState<any | null>(null);
  const [collectionsConnection, setCollectionsConnection] = useState<{
    id: string;
    name: string;
    scheme?: string;
    address: string;
    apiKey?: string;
  } | null>(null);
  const [objectsConnection, setObjectsConnection] = useState<{
    id: string;
    name: string;
    scheme?: string;
    address: string;
    apiKey?: string;
  } | null>(null);
  const [objectsClassName, setObjectsClassName] = useState<string | null>(null);

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

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      setObjectsConnection(detail.connection || null);
      setObjectsClassName(detail.className || null);
      setActiveMenu("objects");
    };
    window.addEventListener("navigate:objects", handler as EventListener);
    return () => window.removeEventListener("navigate:objects", handler as EventListener);
  }, []);

  const handleRefreshCollections = async () => {
    if (!collectionsConnection) return;
    const payload = {
      id: collectionsConnection.id,
      name: collectionsConnection.name,
      scheme: collectionsConnection.scheme || "http",
      address: collectionsConnection.address,
      apiKey: collectionsConnection.apiKey || "",
    };
    try {
      const resp = await fetch(`${BACKEND_BASE_URL}/schema/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (resp.ok && data?.success) {
        setCollectionsSchema(data?.data?.schema || null);
        // keep connection as is
      }
    } catch (e) {
      // 静默失败，交由调用处可能增加提示
    }
  };

  const renderContent = () => {
    switch (activeMenu) {
      case "home":
      case "clusters":
        return <ClustersPage />;
      case "collections":
        return (
          <CollectionsPage
            connection={collectionsConnection}
            schema={collectionsSchema}
            onRefresh={handleRefreshCollections}
          />
        );
      case "objects":
        return (
          <ObjectsPage
            connection={objectsConnection}
            className={objectsClassName}
            onRefresh={() => {
              // 可以在这里添加刷新逻辑
            }}
          />
        );
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

