import { io } from "socket.io-client";
import { API_BASE } from "./api.js";
import { loadAuth } from "./auth.js";

let socket;

export function getSocket() {
  const auth = loadAuth();
  if (!auth?.token) return null;

  if (!socket) {
    socket = io(API_BASE, {
      auth: { token: auth.token },
      transports: ["websocket"]
    });
  }

  return socket;
}

export function resetSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
