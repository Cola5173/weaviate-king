import { useState, useEffect } from "react";
import { Table, Empty, Tag, Collapse, Typography, Input } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import "./CollectionsPage.css";

const { Text } = Typography;

interface CollectionsPageProps {
  connection?: { id: string; name: string; address: string } | null;
  schema?: any | null;
}

interface ClassData {
  key: string;
  className: string;
  vectorIndexType?: string;
  vectorizer?: string;
  properties: any[];
  raw: any;
}

export default function CollectionsPage({ connection, schema }: CollectionsPageProps) {
  const [isDark, setIsDark] = useState(true);
  const [search, setSearch] = useState("");

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
      width: 250,
      align: "center",
      ellipsis: true,
      render: (text: string) => (
        <Text 
          strong 
          ellipsis 
          style={{ 
            color: isDark ? "#52c41a" : "#1890ff",
            display: "block",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis"
          }}
        >
          {text}
        </Text>
      ),
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
                      <Text strong>{p.name}</Text>
                      <Text type="secondary" style={{ marginLeft: 8 }}>
                        : {(p.dataType || []).join(", ")}
                      </Text>
                      {p.description && (
                        <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>
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
        <Input
          allowClear
          size="middle"
          placeholder="搜索className"
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 280 }}
        />
      </div>

      {classes.length === 0 ? (
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
    </div>
  );
}


