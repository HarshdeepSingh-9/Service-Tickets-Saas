import { authHeader, clearAuth } from "./auth.js";

const API_BASE = import.meta.env.VITE_API_BASE || "";

async function handle(res) {
  const text = await res.text();
  if (res.ok) return text ? JSON.parse(text) : null;

  if (res.status === 401) {
    clearAuth();
  }

  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  throw new Error(payload?.error || text || `HTTP ${res.status}`);
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...authHeader(),
      ...(options.headers || {})
    }
  });
  return handle(res);
}

export const apiGet = (path) => request(path);
export const apiPost = (path, body) => request(path, { method: "POST", body: JSON.stringify(body) });
export const apiPut = (path, body) => request(path, { method: "PUT", body: JSON.stringify(body) });
export const apiDelete = (path) => request(path, { method: "DELETE" });
export { API_BASE };
