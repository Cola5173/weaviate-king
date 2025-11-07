import {
  HomeOutlined,
  AppstoreOutlined,
  BoxPlotOutlined,
} from "@ant-design/icons";
import { Tooltip } from "antd";
import "./Sidebar.css";

interface SidebarProps {
  activeMenu: string;
  onMenuChange: (menu: string) => void;
}

export default function Sidebar({ activeMenu, onMenuChange }: SidebarProps) {
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
    </div>
  );
}

