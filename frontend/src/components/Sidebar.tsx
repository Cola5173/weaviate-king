import { useState } from "react";
import {
  HomeOutlined,
  AppstoreOutlined,
  BoxPlotOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { Modal, Tooltip } from "antd";
import "./Sidebar.css";

interface SidebarProps {
  activeMenu: string;
  onMenuChange: (menu: string) => void;
}

export default function Sidebar({ activeMenu, onMenuChange }: SidebarProps) {
  const [isInfoVisible, setInfoVisible] = useState(false);
  const menuItems = [
    { key: "home", icon: <HomeOutlined />, label: "主页", color: "#52c41a" },
    { key: "collections", icon: <AppstoreOutlined />, label: "集合" },
    { key: "objects", icon: <BoxPlotOutlined />, label: "对象" },
  ];

  return (
    <div className="sidebar">
      {menuItems.map((item) => {
        const isActive = activeMenu === item.key;
        const style: React.CSSProperties = {};
        
        if (isActive) {
          // 激活状态：使用绿色背景或自定义颜色
          style.background = item.color || "#52c41a";
          style.color = "#ffffff";
        } else if (item.color) {
          // 非激活状态但有自定义颜色：保持图标原色
          style.color = item.color;
        }
        
        return (
          <Tooltip
            key={item.key}
            title={item.label}
            placement="right"
            overlayInnerStyle={{
              backgroundColor: "#2a2a2a",
              color: "#ffffff",
              border: "1px solid #3a3a3a",
            }}
          >
            <div
              className={`sidebar-item ${isActive ? "active" : ""}`}
              onClick={() => onMenuChange(item.key)}
              style={style}
            >
              {item.icon}
            </div>
          </Tooltip>
        );
      })}
      <Tooltip
        title="关于应用"
        placement="right"
        overlayInnerStyle={{
          backgroundColor: "#2a2a2a",
          color: "#ffffff",
          border: "1px solid #3a3a3a",
        }}
      >
        <div
          className="sidebar-item sidebar-info-button"
          onClick={() => setInfoVisible(true)}
        >
          <InfoCircleOutlined />
        </div>
      </Tooltip>
      <Modal
        title="关于 Weaviate King"
        open={isInfoVisible}
        onOk={() => setInfoVisible(false)}
        onCancel={() => setInfoVisible(false)}
        footer={null}
      >
        <div className="sidebar-info-modal">
          <p>Weaviate King 是一个帮助你管理 Weaviate 集群、集合与对象的桌面工具。</p>
          <p>通过连接管理器快速切换，维护自己的数据集，轻松完成日常运维。</p>
        </div>
      </Modal>
    </div>
  );
}

