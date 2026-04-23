import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../components/api.js";
import { saveAuth } from "../components/auth.js";
import { resetSocket } from "../components/socket.js";

export default function AgentLogin() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const on = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const data = await apiPost("/api/auth/agent/login", form);
      resetSocket();
      saveAuth(data);
      nav("/agent");
    } catch (error) {
      setErr(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="authWrap">
      <form className="card authCard brutalAccent" onSubmit={submit}>
        <div className="panelTitle">Agent Login</div>
        <p className="small">Handle all tickets, respond in real time, and watch dashboard counts update live.</p>

        <label>Agent username
          <input value={form.username} onChange={on("username")} placeholder="Agent username" required />
        </label>

        <label>Password
          <input type="password" value={form.password} onChange={on("password")} placeholder="Password" required />
        </label>

        {err && <div className="alert error">{err}</div>}

        <button className="primary" disabled={busy}>{busy ? "Logging in..." : "Login as agent"}</button>
      </form>
    </div>
  );
}
