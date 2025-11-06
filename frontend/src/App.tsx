import { ConfigProvider } from "antd";
import Layout from "./components/Layout";
import "./App.css";

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#52c41a",
        },
      }}
    >
      <Layout />
    </ConfigProvider>
  );
}

export default App;

