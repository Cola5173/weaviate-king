import {
  ClusterOutlined,
  SearchOutlined,
  FileTextOutlined,
  SendOutlined,
  MessageOutlined,
  TeamOutlined,
  BarChartOutlined,
  SettingOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import "./Sidebar.css";

interface SidebarProps {
  activeMenu: string;
  onMenuChange: (menu: string) => void;
}

export default function Sidebar({ activeMenu, onMenuChange }: SidebarProps) {
  const menuItems = [
    { key: "clusters", icon: <ClusterOutlined />, label: "集群" },
    { key: "search", icon: <SearchOutlined />, label: "搜索" },
    { key: "documents", icon: <FileTextOutlined />, label: "文档" },
    { key: "send", icon: <SendOutlined />, label: "发送" },
    { key: "messages", icon: <MessageOutlined />, label: "消息" },
    { key: "users", icon: <TeamOutlined />, label: "用户" },
    { key: "analytics", icon: <BarChartOutlined />, label: "分析" },
    { key: "settings", icon: <SettingOutlined />, label: "设置" },
    { key: "about", icon: <InfoCircleOutlined />, label: "关于" },
  ];

  return (
    <div className="sidebar">
      {menuItems.map((item) => (
        <div
          key={item.key}
          className={`sidebar-item ${activeMenu === item.key ? "active" : ""}`}
          onClick={() => onMenuChange(item.key)}
          title={item.label}
        >
          {item.icon}
        </div>
      ))}
    </div>
  );
}

