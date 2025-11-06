import { useState } from "react";
import { Button } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import ClusterCard from "../components/ClusterCard";
import "./ClustersPage.css";

export interface Cluster {
  id: string;
  name: string;
  address: string;
}

const mockClusters: Cluster[] = [
  { id: "1", name: "172.31.186.217", address: "172.31.186.217:8080" },
  { id: "2", name: "172.30.92.239", address: "172.30.92.239:8080" },
  { id: "3", name: "运营商", address: "172.30.92.75:8080,172.30.92.70:8080,172.30.92.71:8080" },
  { id: "4", name: "172.31.129.130", address: "172.31.129.130:8080" },
];

export default function ClustersPage() {
  const [clusters, setClusters] = useState<Cluster[]>(mockClusters);

  const handleAdd = () => {
    // TODO: 打开添加对话框
    console.log("添加集群");
  };

  const handleEdit = (cluster: Cluster) => {
    // TODO: 打开编辑对话框
    console.log("编辑集群", cluster);
  };

  const handleDelete = (clusterId: string) => {
    setClusters(clusters.filter((c) => c.id !== clusterId));
  };

  return (
    <div className="clusters-page">
      <div className="clusters-header">
        <div className="clusters-title">
          <span>集群</span>
          <span className="clusters-count">数量: {clusters.length}</span>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          className="add-cluster-btn"
        >
          + 添加集群
        </Button>
      </div>
      <div className="clusters-grid">
        {clusters.map((cluster) => (
          <ClusterCard
            key={cluster.id}
            cluster={cluster}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}

