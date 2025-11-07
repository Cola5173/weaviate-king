import { useState, useEffect, useRef } from "react";
import { Table, Empty, Tag, Typography, Input, Button, Tooltip, Space, Modal, message, Spin, Select, Collapse, Tree } from "antd";
import { BACKEND_BASE_URL } from "../config";
import { ReloadOutlined, CopyOutlined, CheckOutlined, EyeOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { DataNode } from "antd/es/tree";
import "./ObjectsPage.css";

const { Text } = Typography;

interface ObjectsPageProps {
  connection?: { id: string; name: string; address: string; scheme?: string; apiKey?: string } | null;
  className?: string | null;
  onRefresh?: () => void;
}

interface ObjectData {
  key: string;
  id: string;
  properties: any;
  vector?: number[];
  creationTimeUnix?: number;
  lastUpdateTimeUnix?: number;
  raw: any;
}

export default function ObjectsPage({ connection, className, onRefresh }: ObjectsPageProps) {
  const [isDark, setIsDark] = useState(true);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [objects, setObjects] = useState<any[]>([]);
  const [classProperties, setClassProperties] = useState<string[]>([]);
  const [filters, setFilters] = useState<Array<{ id: string; property?: string; operator: "Equal" | "Like"; value?: string }>>([
    { id: `${Date.now()}`, operator: "Equal" },
  ]);
  const [objectModalOpen, setObjectModalOpen] = useState(false);
  const [objectModalJson, setObjectModalJson] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [after, setAfter] = useState<string | null>(null);
  const lastFetchKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.body.getAttribute("data-theme") !== "light");
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const fetchObjects = async (cursor?: string | null) => {
    if (!connection || !className) return;

    setLoading(true);
    try {
      const payload: any = {
        id: connection.id,
        name: connection.name,
        scheme: connection.scheme || "http",
        address: connection.address,
        apiKey: connection.apiKey || "",
        className: className,
        limit: 100,
      };
      // 如果存在有效过滤条件，走 /objects/search，否则不默认拉取所有
      const validFilters = filters
        .filter(f => f.property && (f.value ?? "").toString().trim() !== "")
        .map(f => ({ property: f.property!, operator: f.operator, value: (f.value ?? "").toString() }));

      let resp: Response;
      if (validFilters.length > 0) {
        payload.filters = validFilters;
        resp = await fetch(`${BACKEND_BASE_URL}/objects/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        // 没有条件则走 REST 初始列表查询
        payload.after = cursor || null;
        resp = await fetch(`${BACKEND_BASE_URL}/objects/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const result = await resp.json();
      if (!resp.ok || !result?.success) {
        throw new Error(result?.message || `HTTP ${resp.status}`);
      }

      const normalizeGraphQLObjects = (items: any[]): any[] => {
        if (!Array.isArray(items)) return [];
        return items
          .filter((item) => item && typeof item === "object")
          .map((item) => {
            const additional = item._additional && typeof item._additional === "object" ? item._additional : {};
            const props = item.properties && typeof item.properties === "object"
              ? item.properties
              : Object.keys(item)
                  .filter((key) => !["_additional", "__typename"].includes(key))
                  .reduce((acc: Record<string, any>, key) => {
                    acc[key] = item[key];
                    return acc;
                  }, {} as Record<string, any>);
            return {
              id: additional.id ?? item.id ?? "",
              properties: props,
              vector: additional.vector ?? item.vector,
              creationTimeUnix: additional.creationTimeUnix ?? item.creationTimeUnix,
              lastUpdateTimeUnix: additional.lastUpdateTimeUnix ?? item.lastUpdateTimeUnix,
              raw: item,
            };
          });
      };

      const graphqlFormatted = Array.isArray(result?.data?.objects) ? result.data.objects : [];
      const restData = Array.isArray(result?.data?.result?.objects) ? result.data.result.objects : [];
      const graphqlRawFallback = normalizeGraphQLObjects(result?.data?.data?.Get?.[className]);

      const objectsData =
        graphqlFormatted.length > 0
          ? graphqlFormatted
          : restData.length > 0
          ? restData
          : graphqlRawFallback;

      setObjects(objectsData);
      setPagination((prev) => ({
        ...prev,
        total: objectsData.length,
      }));

      // 如果有更多数据，保存最后一个对象的 id 作为游标
      if (objectsData.length > 0 && objectsData.length === 100) {
        const lastObject = objectsData[objectsData.length - 1];
        setAfter(lastObject.id || null);
      } else {
        setAfter(null);
      }

      message.success(`查询成功，共 ${objectsData.length} 个对象`);
    } catch (e: any) {
      message.error(e?.message || "查询失败");
      setObjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!connection || !className) return;
    // 拉取 class 的属性列表用于下拉框，并进行一次初始 REST 查询渲染表格
    (async () => {
      try {
        const resp = await fetch(`${BACKEND_BASE_URL}/schema/class`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: connection.id,
            name: connection.name,
            scheme: connection.scheme || "http",
            address: connection.address,
            apiKey: connection.apiKey || "",
            className: className,
          }),
        });
        const data = await resp.json();
        const props = Array.isArray(data?.data?.schema?.properties)
          ? data.data.schema.properties.map((p: any) => p.name).filter(Boolean)
          : [];
        const uniqueProps = Array.from(new Set(["id", ...props]));
        setClassProperties(uniqueProps);
      } catch (_) {
        setClassProperties([]);
      }
      // 初始列表：使用 REST /objects/query
      try {
        setLoading(true);
        const initResp = await fetch(`${BACKEND_BASE_URL}/objects/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: connection.id,
            name: connection.name,
            scheme: connection.scheme || "http",
            address: connection.address,
            apiKey: connection.apiKey || "",
            className: className,
            limit: 100,
            after: null,
          }),
        });
        const initJson = await initResp.json();
        if (initResp.ok && initJson?.success) {
          const objs = initJson?.data?.result?.objects || [];
          setObjects(objs);
          setPagination(prev => ({ ...prev, total: objs.length }));
        } else {
          setObjects([]);
          setPagination(prev => ({ ...prev, total: 0 }));
        }
      } catch (_) {
        setObjects([]);
        setPagination(prev => ({ ...prev, total: 0 }));
      } finally {
        setLoading(false);
      }
    })();
    lastFetchKeyRef.current = `${connection.id}::${className}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection, className]);

  const handleRefresh = () => {
    setAfter(null);
    setPagination((prev) => ({ ...prev, current: 1 }));
    fetchObjects();
    if (onRefresh) {
      onRefresh();
    }
  };

  const handleViewObject = (record: ObjectData) => {
    setObjectModalJson(record.raw);
    setObjectModalOpen(true);
    setCopied(false);
  };

  const formatProperties = (properties: any) => {
    if (!properties || typeof properties !== "object") return "无";
    const keys = Object.keys(properties);
    if (keys.length === 0) return "无";
    return `${keys.length} 个属性`;
  };

  const renderHeader = (en: string, zh: string) => (
    <div style={{ textAlign: "center" }}>
      <div>{en}</div>
      <div
        style={{
          fontSize: 10,
          color: "#999",
          marginTop: 2,
        }}
      >
        {zh}
      </div>
    </div>
  );

  const tableData: ObjectData[] = objects.map((obj: any, index: number) => ({
    key: obj.id || `object-${index}`,
    id: obj.id || "-",
    properties: obj.properties || {},
    vector: obj.vector,
    creationTimeUnix: obj.creationTimeUnix,
    lastUpdateTimeUnix: obj.lastUpdateTimeUnix,
    raw: obj,
  }));

  const filteredTableData = tableData.filter((item) => {
    const searchLower = search.trim().toLowerCase();
    if (!searchLower) return true;
    return (
      item.id.toLowerCase().includes(searchLower) ||
      JSON.stringify(item.properties).toLowerCase().includes(searchLower)
    );
  });

  const buildJsonTreeNodes = (value: any, keyLabel: string, path: string): DataNode => {
    const isObject = value !== null && typeof value === "object";

    if (!isObject) {
      return {
        key: path,
        title: `${keyLabel}: ${String(value)}`,
        isLeaf: true,
      };
    }

    if (Array.isArray(value)) {
      return {
        key: path,
        title: `${keyLabel}: [Array] (${value.length})`,
        children: value.map((item, index) => buildJsonTreeNodes(item, `[${index}]`, `${path}.${index}`)),
      };
    }

    const entries = Object.entries(value as Record<string, any>);
    return {
      key: path,
      title: `${keyLabel}: {Object} (${entries.length} keys)`,
      children: entries.map(([childKey, childValue]) =>
        buildJsonTreeNodes(childValue, String(childKey), `${path}.${childKey}`),
      ),
    };
  };

  const jsonTreeData: DataNode[] = objectModalJson ? [buildJsonTreeNodes(objectModalJson, "root", "root")] : [];

  const columns: ColumnsType<ObjectData> = [
    {
      title: renderHeader("ID", "对象ID"),
      dataIndex: "id",
      key: "id",
      width: 160,
      align: "center",
      ellipsis: true,
      render: (text: string) => (
        <Text
          copyable={{ text }}
          style={{
            color: isDark ? "#52c41a" : "#1890ff",
            fontFamily: "monospace",
            fontSize: 12,
          }}
        >
          {text}
        </Text>
      ),
    },
    {
      title: renderHeader("Properties", "属性"),
      dataIndex: "properties",
      key: "properties",
      width: 200,
      align: "center",
      render: (properties: any) => {
        if (!properties || typeof properties !== "object") {
          return <Text type="secondary">无属性</Text>;
        }
        const keys = Object.keys(properties);
        if (keys.length === 0) {
          return <Text type="secondary">无属性</Text>;
        }
        return (
          <Collapse
            ghost
            size="small"
            items={[
              {
                key: "1",
                label: <Text style={{ fontSize: 12 }}>{formatProperties(properties)}</Text>,
                children: (
                  <div style={{ maxHeight: 300, overflow: "auto" }}>
                    {keys.map((key: string, idx: number) => {
                      const value = properties[key];
                      const valueStr = typeof value === "object" ? JSON.stringify(value) : String(value);
                      return (
                        <div key={idx} style={{ marginBottom: 8, fontSize: 11 }}>
                          <Text strong>{key}</Text>
                          <Text type="secondary" style={{ marginLeft: 8 }}>
                            : {valueStr.length > 50 ? `${valueStr.slice(0, 50)}...` : valueStr}
                          </Text>
                        </div>
                      );
                    })}
                  </div>
                ),
              },
            ]}
          />
        );
      },
    },
    
    {
      title: renderHeader("Action", "操作"),
      key: "action",
      width: 120,
      align: "center",
      render: (_: any, record: ObjectData) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              size="small"
              type="link"
              icon={<EyeOutlined />}
              onClick={() => handleViewObject(record)}
            >
              查看
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className={`objects-page ${isDark ? "dark" : "light"}`}>
      <div
        className="objects-header"
        style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "flex-start", gap: 12 }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <div>
            {connection && className ? (
              <>
                查看 <Tag color="green">{connection.name}</Tag> 中的 <Tag color="blue">{className}</Tag> 对象
                <span style={{ marginLeft: 8, color: isDark ? "#aaaaaa" : "#666666" }}>（共 {objects.length} 个）</span>
              </>
            ) : (
              "未选择连接或类名"
            )}
          </div>
          {connection && className && (
            <Tooltip title="刷新列表">
              <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
            </Tooltip>
          )}
        </div>
        {connection && className && (
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: 8,
              width: "100%",
              alignItems: "flex-start",
              justifyContent: "space-between",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                flex: 1,
                minWidth: 0,
              }}
            >
              {filters.map((f, idx) => (
                <div key={f.id} style={{ display: "flex", gap: 8, alignItems: "center", whiteSpace: "nowrap" }}>
                  <Select
                    placeholder="选择属性"
                    value={f.property}
                    onChange={(v) => setFilters(prev => prev.map(x => x.id === f.id ? { ...x, property: v } : x))}
                    style={{ width: 200 }}
                    options={classProperties.map(p => ({ label: p, value: p }))}
                  />
                  <Select
                    value={f.operator}
                    onChange={(v) => setFilters(prev => prev.map(x => x.id === f.id ? { ...x, operator: v as any } : x))}
                    style={{ width: 100 }}
                    options={[
                      { label: "等于", value: "Equal" },
                      { label: "Like", value: "Like" },
                    ]}
                  />
                  <Input
                    placeholder="输入值"
                    value={f.value}
                    onChange={(e) => setFilters(prev => prev.map(x => x.id === f.id ? { ...x, value: e.target.value } : x))}
                    style={{ width: 220 }}
                  />
                  <Button
                    onClick={() => setFilters(prev => prev.filter(x => x.id !== f.id))}
                    disabled={filters.length <= 1}
                  >
                    删除
                  </Button>
                  {idx === filters.length - 1 && (
                    <Button
                      type="dashed"
                      onClick={() => setFilters(prev => [...prev, { id: `${Date.now()}`, operator: "Equal" }])}
                    >
                      添加条件
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", paddingTop: 0 }}>
              <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchObjects()} loading={loading}>
                查询
              </Button>
            </div>
          </div>
        )}
      </div>

      {!connection || !className ? (
        <Empty description="请先选择连接和类名" />
      ) : (
        <>
          <Spin spinning={loading}>
            <Table
              columns={columns}
              dataSource={filteredTableData}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条`,
                onChange: (page, pageSize) => {
                  setPagination({ ...pagination, current: page, pageSize });
                },
              }}
              scroll={{ x: "max-content" }}
              size="middle"
            />
          </Spin>
        </>
      )}

      <Modal
        open={objectModalOpen}
        onCancel={() => {
          setObjectModalOpen(false);
          setCopied(false);
        }}
        title={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingRight: 48 }}>
            <span>Object 详情</span>
            {objectModalJson && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 8 }}>
                <Button
                  type="text"
                  icon={copied ? <CheckOutlined /> : <CopyOutlined />}
                  onClick={async () => {
                    try {
                      const jsonString = JSON.stringify(objectModalJson, null, 2);
                      await navigator.clipboard.writeText(jsonString);
                      setCopied(true);
                      message.success("已复制到剪贴板");
                      setTimeout(() => setCopied(false), 2000);
                    } catch (e) {
                      message.error("复制失败");
                    }
                  }}
                  size="small"
                >
                  {copied ? "已复制" : "复制"}
                </Button>
              </div>
            )}
          </div>
        }
        footer={null}
        width={900}
        styles={{
          body: {
            padding: 0,
            maxHeight: "70vh",
            overflow: "hidden",
          },
        }}
      >
        {objectModalJson ? (
          <div
            style={{
              backgroundColor: isDark ? "#1e1e1e" : "#f5f5f5",
              padding: 16,
              maxHeight: "70vh",
              overflow: "auto",
            }}
          >
            <Tree
              showLine
              defaultExpandedKeys={["root"]}
              selectable={false}
              treeData={jsonTreeData}
            />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

