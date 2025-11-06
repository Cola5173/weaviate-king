// Global frontend configuration
// Prefer configuring via Vite env: VITE_BACKEND_URL
export const BACKEND_BASE_URL: string = (import.meta as any).env?.VITE_BACKEND_URL || "http://localhost:5175";
