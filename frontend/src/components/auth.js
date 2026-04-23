const KEY = "ticketing_auth_v2";


export function saveAuth(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}


export function loadAuth() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
}


export function clearAuth() {
  localStorage.removeItem(KEY);
}


export function authHeader() {
  const auth = loadAuth();

  // Support BOTH formats (safe)
  const token =
    auth?.token || // preferred
    auth?.accessToken || // fallback
    (typeof auth === "string" ? auth : null); // edge case

  return token ? { Authorization: `Bearer ${token}` } : {};
}
