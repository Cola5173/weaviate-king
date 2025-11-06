import { useState } from "react";
import { Button } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import ClusterCard from "../components/ClusterCard";
import AddClusterModal from "../components/AddClusterModal";
import "./ClustersPage.css";

export interface Cluster {
  id: string;
  name: string;
  address: string;
}

const mockClusters: Cluster[] = [
  { id: "1", name: "172.31.186.217", address: "172.31.186.217:9092" },
  { id: "2", name: "172.30.92.239", address: "172.30.92.239:9092" },
  { id: "3", name: "运营商", address: "172.30.92.75:9092,172.30.92.70:9092,172.30.92.71:9092" },
  { id: "4", name: "172.31.129.130", address: "172.31.129.130:9092" },
];

export default function ClustersPage() {
  const [clusters, setClusters] = useState<Cluster[]>(mockClusters);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCluster, setEditingCluster] = useState<Cluster | null>(null);

  const handleAdd = () => {
    setEditingCluster(null);
    setModalOpen(true);
  };

  const handleEdit = (cluster: Cluster) => {
    setEditingCluster(cluster);
    setModalOpen(true);
  };

  const handleDelete = (clusterId: string) => {
    setClusters(clusters.filter((c) => c.id !== clusterId));
  };

  const handleSave = (cluster: Cluster) => {
    if (editingCluster) {
      // 编辑模式
      setClusters(
        clusters.map((c) => (c.id === cluster.id ? cluster : c))
      );
    } else {
      // 添加模式
      setClusters([...clusters, cluster]);
    }
    setModalOpen(false);
    setEditingCluster(null);
  };

  const handleCancel = () => {
    setModalOpen(false);
    setEditingCluster(null);
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
          添加集群
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
      <AddClusterModal
        open={modalOpen}
        onCancel={handleCancel}
        onSave={handleSave}
        editingCluster={editingCluster}
      />
    </div>
  );
}

