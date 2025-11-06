import { useState, useEffect } from "react";
import { Modal, Form, Input, Select, Switch, Button, message } from "antd";
import { Cluster } from "../pages/ClustersPage";
import "./AddClusterModal.css";
import { BACKEND_BASE_URL } from "../config";

interface AddClusterModalProps {
  open: boolean;
  onCancel: () => void;
  onSave: (cluster: Cluster) => void;
  editingCluster?: Cluster | null;
}

export default function AddClusterModal({
  open,
  onCancel,
  onSave,
  editingCluster,
}: AddClusterModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [useApiKey, setUseApiKey] = useState(false);

  // 解析地址，提取协议和地址部分
  useEffect(() => {
    if (editingCluster?.address) {
      const address = editingCluster.address;
      let scheme = "http";
      let host = address;
      
      if (address.startsWith("http://")) {
        scheme = "http";
        host = address.replace("http://", "");
      } else if (address.startsWith("https://")) {
        scheme = "https";
        host = address.replace("https://", "");
      }
      
      form.setFieldsValue({
        scheme,
        address: host,
        name: editingCluster.name,
        apiKey: "",
      });
      setUseApiKey(false);
    } else {
      form.setFieldsValue({
        scheme: "http",
        address: "",
        name: "",
        apiKey: "",
      });
      setUseApiKey(false);
    }
  }, [editingCluster, form, open]);

  const handleTestConnection = async () => {
    try {
      const values = await form.validateFields(["name", "scheme", "address", useApiKey ? "apiKey" : undefined].filter(Boolean) as string[]);
      setLoading(true);
      // 组合协议和地址进行测试
      const payload: Record<string, any> = {
        name: values.name,
        scheme: values.scheme,
        address: values.address,
      };
      if (useApiKey && values.apiKey) {
        payload.apiKey = values.apiKey;
      }

      const resp = await fetch(`${BACKEND_BASE_URL}/connection/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();
      if (resp.ok && data?.success) {
        message.success(data?.message || "连接测试成功");
      } else {
        message.error(data?.message || `连接测试失败 (${resp.status})`);
      }
    } catch (error) {
      message.error("连接测试失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload: Record<string, any> = {
        name: values.name,
        scheme: values.scheme,
        address: values.address,
      };
      if (useApiKey && values.apiKey) {
        payload.apiKey = values.apiKey;
      }

      const resp = await fetch(`${BACKEND_BASE_URL}/connection/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();
      if (resp.ok && data?.success) {
        const fullAddress = `${values.scheme}://${values.address}`;
        const cluster: Cluster = {
          id: editingCluster?.id || Date.now().toString(),
          name: values.name,
          address: fullAddress,
        };
        message.success(data?.message || "保存成功");
        onSave(cluster);
        form.resetFields();
      } else {
        message.error(data?.message || `保存失败 (${resp.status})`);
      }
    } catch (error) {
      console.error("保存失败:", error);
      message.error("保存失败");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title="添加连接"
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={520}
      className="add-cluster-modal"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          name: editingCluster?.name || "",
          address: editingCluster?.address || "",
        }}
      >
        <Form.Item
          label="昵称 *"
          name="name"
          rules={[{ required: true, message: "请输入名称" }]}
        >
          <Input placeholder="请输入名称" />
        </Form.Item>

        <Form.Item
          label="协议 *"
          name="scheme"
          rules={[{ required: true, message: "请选择协议" }]}
        >
          <Select>
            <Select.Option value="http">http</Select.Option>
            <Select.Option value="https">https</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="连接地址 *"
          name="address"
          rules={[{ required: true, message: "请输入连接地址" }]}
        >
          <Input placeholder="127.0.0.1:9180" />
        </Form.Item>

        <div className="form-hint">
          注意:必须保证本地能够访问 Weaviate 配置的地址 (特别是域名解析,即使你填的是ip,也需要在本地配置好hosts)
        </div>

        <Form.Item label="使用 ApiKey" name="useApiKey" valuePropName="checked">
          <Switch
            onChange={(checked) => {
              setUseApiKey(checked);
              if (!checked) {
                form.setFieldsValue({ apiKey: "" });
              }
            }}
          />
        </Form.Item>

        {useApiKey && (
          <Form.Item
            label="ApiKey *"
            name="apiKey"
            rules={
              useApiKey
                ? [{ required: true, message: "请输入 ApiKey" }]
                : []
            }
          >
            <Input.Password placeholder="请输入 ApiKey" />
          </Form.Item>
        )}

        <div className="modal-footer">
          <Button onClick={handleTestConnection} loading={loading}>
            连接测试
          </Button>
          <Button onClick={handleCancel}>取消</Button>
          <Button type="primary" onClick={handleSave}>
            保存
          </Button>
        </div>
      </Form>
    </Modal>
  );
}

