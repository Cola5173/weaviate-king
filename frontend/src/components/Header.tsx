import { Button } from "antd";
import {
  HomeOutlined,
  DownloadOutlined,
  MinusOutlined,
  BorderOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import "./Header.css";

export default function Header() {
  return (
    <div className="header">
      <div className="header-left">
        <span className="header-title">Weaviate-King</span>
        <span className="header-subtitle">更人性化的 Weaviate GUI v0.1.0</span>
      </div>
      <div className="header-right">
        <Button type="text" className="header-btn">
          技术交流群
        </Button>
        <Button type="text" className="header-btn" icon={<HomeOutlined />} />
        <Button type="text" className="header-btn" icon={<DownloadOutlined />} />
        <Button type="text" className="header-btn" icon={<MinusOutlined />} />
        <Button type="text" className="header-btn" icon={<BorderOutlined />} />
        <Button type="text" className="header-btn" icon={<CloseOutlined />} />
      </div>
    </div>
  );
}

