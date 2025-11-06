import { useEffect, useState } from "react";
import { message } from "antd";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import ClusterCard from "../components/ClusterCard";
import AddClusterModal from "../components/AddClusterModal";
import { BACKEND_BASE_URL } from "../config";
import "./ClustersPage.css";

export interface Cluster {
  id: string;
  name: string;
  address: string; // 不含协议，仅 host:port 或路径
  scheme?: string; // 保存时需要
  apiKey?: string; // 编辑时展示
}

// 后端返回 Connections 列表，前端转换为 Cluster 用于展示

export default function ClustersPage() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCluster, setEditingCluster] = useState<Cluster | null>(null);

  const loadClusters = async () => {
    try {
      const resp = await fetch(`${BACKEND_BASE_URL}/connection/list`);
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const data = await resp.json();
      // data: List[Connections] -> {name, scheme, address, apiKey}
      const mapped: Cluster[] = (Array.isArray(data) ? data : []).map((c) => ({
        id: c.id || c.name || `${c.scheme}://${c.address}`,
        name: c.name,
        address: c.address, // 仅展示 host:port，不显示协议
        scheme: c.scheme,
        apiKey: c.apiKey || "",
      }));
      setClusters(mapped);
    } catch (e) {
      message.error("加载集群列表失败");
    }
  };

  useEffect(() => {
    loadClusters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = () => {
    setEditingCluster(null);
    setModalOpen(true);
  };

  const handleEdit = async (cluster: Cluster) => {
    try {
      const resp = await fetch(`${BACKEND_BASE_URL}/connection/get/${encodeURIComponent(cluster.id)}`);
      const result = await resp.json();
      if (!resp.ok || !result?.success) {
        throw new Error(result?.message || `HTTP ${resp.status}`);
      }
      const data = result.data || {};
      const editing: Cluster = {
        id: String(data.id ?? cluster.id),
        name: String(data.name ?? cluster.name),
        scheme: String(data.scheme ?? cluster.scheme ?? "http"),
        address: String(data.address ?? cluster.address),
        apiKey: data.apiKey || "",
      };
      setEditingCluster(editing);
      setModalOpen(true);
    } catch (e: any) {
      message.error(`加载连接详情失败：${e?.message || "未知错误"}`);
    }
  };

  const handleDelete = async (clusterId: string) => {
    try {
      const resp = await fetch(`${BACKEND_BASE_URL}/connection/delete/${encodeURIComponent(clusterId)}`, {
        method: "DELETE",
      });
      const result = await resp.json();
      if (!resp.ok || !result?.success) {
        throw new Error(result?.message || `HTTP ${resp.status}`);
      }
      // 删除成功，更新本地列表
      setClusters((prev) => prev.filter((c) => c.id !== clusterId));
      message.success("删除成功");
    } catch (e: any) {
      message.error(`删除失败：${e?.message || "未知错误"}`);
    }
  };

  const handleConnect = async (cluster: Cluster) => {
    try {
      const payload: Record<string, any> = {
        id: cluster.id,
        name: cluster.name,
        scheme: cluster.scheme || "http",
        address: cluster.address,
        apiKey: cluster.apiKey || "",
      };
      const resp = await fetch(`${BACKEND_BASE_URL}/schema/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (resp.ok && data?.success) {
        const detail = {
          connection: {
            id: data?.data?.id || cluster.id,
            name: data?.data?.name || cluster.name,
            scheme: cluster.scheme || "http",
            address: cluster.address,
            apiKey: cluster.apiKey || "",
          },
          schema: data?.data?.schema,
        };
        window.dispatchEvent(new CustomEvent("navigate:collections", { detail }));
      } else {
        message.error(data?.message || `连接/查询失败 (${resp.status})`);
      }
    } catch (e: any) {
      message.error(`连接/查询失败：${e?.message || "未知错误"}`);
    }
  };

  const handleSave = async (_cluster: Cluster) => {
    // 保存由后端完成，这里刷新列表
    await loadClusters();
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
            onConnect={handleConnect}
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

