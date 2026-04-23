import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { apiPost } from "../components/api.js";
import { saveAuth } from "../components/auth.js";
import { resetSocket } from "../components/socket.js";

export default function UserLogin() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();

  const on = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const data = await apiPost("/api/auth/user/login", form);
      resetSocket();
      saveAuth(data);
      nav(loc.state?.from || "/user");
    } catch (error) {
      setErr(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="authWrap">
      <form className="card authCard" onSubmit={submit}>
        <div className="panelTitle">User Login</div>
        <p className="small">Access your own tickets and continue real-time conversations with agents.</p>

        <label>Username
          <input value={form.username} onChange={on("username")} placeholder="Enter username" required />
        </label>

        <label>Password
          <input type="password" value={form.password} onChange={on("password")} placeholder="Enter password" required />
        </label>

        {err && <div className="alert error">{err}</div>}

        <button className="primary" disabled={busy}>{busy ? "Logging in..." : "Login"}</button>
        <div className="small">Need an account? <Link to="/signup">Sign up here</Link>.</div>
      </form>
    </div>
  );
}
