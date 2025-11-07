import { useState, useEffect } from "react";
import { Table, Empty, Tag, Collapse, Typography, Input, Button, Tooltip, Space, Modal, message } from "antd";
import { BACKEND_BASE_URL } from "../config";
import { SearchOutlined, ReloadOutlined, CopyOutlined, CheckOutlined, FileSearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import "./CollectionsPage.css";

const { Text } = Typography;

interface CollectionsPageProps {
  connection?: { id: string; name: string; address: string; scheme?: string; apiKey?: string } | null;
  schema?: any | null;
  onRefresh?: () => void;
}

interface ClassData {
  key: string;
  className: string;
  vectorIndexType?: string;
  vectorizer?: string;
  properties: any[];
  raw: any;
}

export default function CollectionsPage({ connection, schema, onRefresh }: CollectionsPageProps) {
  const [isDark, setIsDark] = useState(true);
  const [search, setSearch] = useState("");
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [classModalTitle, setClassModalTitle] = useState<string>("");
  const [classModalJson, setClassModalJson] = useState<any>(null);
  const [classModalLoading, setClassModalLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.body.getAttribute("data-theme") !== "light");
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const classes = Array.isArray(schema?.classes) ? schema.classes : [];

  const propertyNameColor = isDark ? "#f8fafc" : undefined;
  const propertyValueColor = isDark ? "#d4defa" : "rgba(0, 0, 0, 0.65)";
  const propertyDescColor = isDark ? "#9ca3af" : "#888";

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

  const formatProperties = (properties: any[]) => {
    if (!Array.isArray(properties) || properties.length === 0) return "无";
    return `${properties.length} 个属性`;
  };

  

  const tableData: ClassData[] = classes.map((cls: any, index: number) => ({
    key: cls.class || `class-${index}`,
    className: cls.class || "-",
    vectorIndexType: cls.vectorIndexType,
    vectorizer: cls.vectorizer,
    properties: Array.isArray(cls.properties) ? cls.properties : [],
    raw: cls,
  }));

  const filteredTableData = tableData.filter((item) =>
    (item.className || "-")
      .toString()
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  const columns: ColumnsType<ClassData> = [
    {
      title: renderHeader("className", "类名"),
      dataIndex: "className",
      key: "className",
      width: 400,
      align: "center",
      ellipsis: false,
      render: (text: string) => {
        const handleViewDetails = async () => {
          if (!connection) return;
          try {
            setClassModalTitle(text);
            setClassModalOpen(true);
            setClassModalLoading(true);
            setClassModalJson(null);
            const payload = {
              id: connection.id,
              name: connection.name,
              scheme: connection.scheme || "http",
              address: connection.address,
              apiKey: connection.apiKey || "",
              className: text,
            };
            const resp = await fetch(`${BACKEND_BASE_URL}/schema/class`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            const result = await resp.json();
            if (!resp.ok || !result?.success) {
              throw new Error(result?.message || `HTTP ${resp.status}`);
            }
            setClassModalJson(result?.data?.schema ?? result?.data ?? {});
            message.success("查询成功");
          } catch (e: any) {
            message.error(e?.message || "查询失败");
          } finally {
            setClassModalLoading(false);
          }
        };

        const handleViewObjects = async () => {
          if (!connection) return;
          try {
            // 触发跳转到对象页面
            window.dispatchEvent(
              new CustomEvent("navigate:objects", {
                detail: {
                  connection: {
                    id: connection.id,
                    name: connection.name,
                    scheme: connection.scheme || "http",
                    address: connection.address,
                    apiKey: connection.apiKey || "",
                  },
                  className: text,
                },
              })
            );
            message.success(`正在跳转到 ${text} 对象列表...`);
          } catch (e: any) {
            message.error(e?.message || "跳转失败");
          }
        };

        return (
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
            <span
              style={{
                color: isDark ? "#52c41a" : "#1890ff",
                display: "block",
                whiteSpace: "normal",
                wordBreak: "break-all",
                cursor: "pointer",
              }}
              title={text}
              onClick={handleViewObjects}
            >
              {text}
            </span>
            <Tooltip title="查看 class 详情">
              <Button
                size="small"
                type="link"
                icon={<FileSearchOutlined />}
                onClick={handleViewDetails}
                disabled={!connection}
              >
                详情
              </Button>
            </Tooltip>
          </div>
        );
      },
    },
    {
      title: renderHeader("vectorIndexType", "向量索引类型"),
      dataIndex: "vectorIndexType",
      key: "vectorIndexType",
      width: 180,
      align: "center",
      render: (text: string | undefined) =>
        text ? <Tag color={isDark ? "geekblue" : "blue"}>{text}</Tag> : "-",
    },
    {
      title: renderHeader("vectorizer", "向量化器"),
      dataIndex: "vectorizer",
      key: "vectorizer",
      width: 220,
      align: "center",
      render: (text: string | undefined) =>
        text ? <Tag color={isDark ? "purple" : "magenta"}>{text}</Tag> : "-",
    },
    
    {
      title: renderHeader("properties", "属性"),
      dataIndex: "properties",
      key: "properties",
      width: 200,
      align: "center",
      render: (properties: any[]) => (
        <Collapse
          ghost
          size="small"
          items={[
            {
              key: "1",
              label: <Text style={{ fontSize: 12 }}>{formatProperties(properties)}</Text>,
              children: (
                <div style={{ maxHeight: 300, overflow: "auto" }}>
                  {properties.map((p: any, idx: number) => (
                    <div key={idx} style={{ marginBottom: 8, fontSize: 11 }}>
                      <Text strong style={propertyNameColor ? { color: propertyNameColor } : undefined}>{p.name}</Text>
                      <Text style={{ marginLeft: 8, color: propertyValueColor }}>
                        : {(p.dataType || []).join(", ")}
                      </Text>
                      {p.description && (
                        <div style={{ fontSize: 10, color: propertyDescColor, marginTop: 2 }}>
                          {p.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ),
            },
          ]}
        />
      ),
    },
    
  ];

  return (
    <div className={`collections-page ${isDark ? "dark" : "light"}`}>
      <div className="collections-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          {connection ? (
            <>
              已连接到 <Tag color="green">{connection.name}</Tag>（{connection.address}）
            </>
          ) : (
            "未选择连接"
          )}
        </div>
        {connection && (
          <Space size={8}>
            <Tooltip title="刷新列表">
              <Button
                icon={<ReloadOutlined />}
                onClick={() => onRefresh && onRefresh()}
              />
            </Tooltip>
            <Input
              allowClear
              size="middle"
              placeholder="搜索className"
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 280 }}
            />
          </Space>
        )}
      </div>

      {!connection ? (
        <Empty description="请先选择连接配置" />
      ) : classes.length === 0 ? (
        <Empty description="没有可显示的 classes" />
      ) : (
        <>
          <Table
            columns={columns}
            dataSource={filteredTableData}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
            scroll={{ x: "max-content" }}
            size="middle"
          />
        </>
      )}
      <Modal
        open={classModalOpen}
        onCancel={() => {
          setClassModalOpen(false);
          setCopied(false);
        }}
        title={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingRight: 48 }}>
            <span>Class Schema: {classModalTitle}</span>
            {!classModalLoading && classModalJson && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 8 }}>
                <Button
                  type="text"
                  icon={copied ? <CheckOutlined /> : <CopyOutlined />}
                  onClick={async () => {
                    try {
                      const jsonString = JSON.stringify(classModalJson, null, 2);
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
        {classModalLoading ? (
          <div style={{ textAlign: "center", padding: 48 }}>
            <div>加载中...</div>
          </div>
        ) : classModalJson ? (
          <div
            style={{
              backgroundColor: isDark ? "#1e1e1e" : "#f5f5f5",
              padding: 16,
              maxHeight: "70vh",
              overflow: "auto",
            }}
          >
            <pre
              style={{
                margin: 0,
                padding: 0,
                fontFamily: "Monaco, Menlo, 'Ubuntu Mono', Consolas, 'source-code-pro', monospace",
                fontSize: 13,
                lineHeight: 1.6,
                color: isDark ? "#d4d4d4" : "#333",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {JSON.stringify(classModalJson, null, 2)}
            </pre>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}


