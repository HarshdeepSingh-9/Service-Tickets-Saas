import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../components/api.js";
import { saveAuth } from "../components/auth.js";
import { resetSocket } from "../components/socket.js";

export default function UserSignup() {
  const [form, setForm] = useState({ username: "", displayName: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const on = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const data = await apiPost("/api/auth/user/signup", form);
      resetSocket();
      saveAuth(data);
      nav("/user");
    } catch (error) {
      setErr(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="authWrap">
      <form className="card authCard" onSubmit={submit}>
        <div className="panelTitle">Create User Account</div>
        <label>Username
          <input value={form.username} onChange={on("username")} placeholder="Unique username" required />
        </label>

        <label>Display name
          <input value={form.displayName} onChange={on("displayName")} placeholder="How your name should appear" />
        </label>

        <label>Email
          <input value={form.email} onChange={on("email")} placeholder="name@example.com" />
        </label>

        <label>Password
          <input type="password" value={form.password} onChange={on("password")} placeholder="Create password" required />
        </label>

        {err && <div className="alert error">{err}</div>}

        <button className="primary" disabled={busy}>{busy ? "Creating..." : "Create account"}</button>
      </form>
    </div>
  );
}
