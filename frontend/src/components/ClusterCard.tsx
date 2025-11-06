import { Button } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { Cluster } from "../pages/ClustersPage";
import "./ClusterCard.css";

interface ClusterCardProps {
  cluster: Cluster;
  onEdit: (cluster: Cluster) => void;
  onDelete: (clusterId: string) => void;
  onConnect: (cluster: Cluster) => void;
}

export default function ClusterCard({
  cluster,
  onEdit,
  onDelete,
  onConnect,
}: ClusterCardProps) {
  return (
    <div className="cluster-card" onClick={() => onConnect(cluster)}>
      <div className="cluster-card-header">
        <div className="cluster-card-title">{cluster.name}</div>
        <div className="cluster-card-actions">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(cluster);
            }}
            className="cluster-card-btn"
          >
            编辑
          </Button>
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(cluster.id);
            }}
            className="cluster-card-btn"
          >
            删除
          </Button>
        </div>
      </div>
      <div className="cluster-card-body">
        <div className="cluster-card-address">
          <span className="address-label">地址:</span>
          <span className="address-value">{cluster.address}</span>
        </div>
      </div>
    </div>
  );
}

