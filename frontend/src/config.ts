// Global frontend configuration
// Prefer configuring via Vite env: VITE_BACKEND_URL
// 使用 127.0.0.1 而不是 localhost，避免在某些环境下解析为 IPv6(::1) 时，
// 后端仅监听 IPv4(127.0.0.1) 导致连接失败（表现为 Tauri 中 "Load failed"）。
export const BACKEND_BASE_URL: string =
  (import.meta as any).env?.VITE_BACKEND_URL || "http://127.0.0.1:5175";
