import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../../components/api.js";

export default function UserNewTicket() {
  const [form, setForm] = useState({
    title: "",
    type: "support",
    priority: "Normal",
    description: ""
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const on = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const ticket = await apiPost("/api/user/tickets", form);
      nav(`/user/tickets/${ticket._id}`);
    } catch (error) {
      setErr(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card formCard" onSubmit={submit}>
      <div className="panelTitle">Create New Ticket</div>
      <p className="small">Good form labels and defaults reduce user errors and follow Nielsen error-prevention guidance.</p>

      <div className="formRow">
        <label>Title
          <input value={form.title} onChange={on("title")} placeholder="Example: VPN connection problem" required />
        </label>
        <label>Type
          <select value={form.type} onChange={on("type")}>
            <option value="support">Support</option>
            <option value="billing">Billing</option>
            <option value="access">Access</option>
            <option value="technical">Technical</option>
          </select>
        </label>
      </div>

      <div className="formRow">
        <label>Priority
          <select value={form.priority} onChange={on("priority")}>
            <option value="Low">Low</option>
            <option value="Normal">Normal</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>
        </label>
      </div>

      <label>Description
        <textarea rows="7" value={form.description} onChange={on("description")} placeholder="Describe the issue clearly" required />
      </label>

      {err && <div className="alert error">{err}</div>}

      <div className="row">
        <button className="primary" disabled={busy}>{busy ? "Submitting..." : "Create Ticket"}</button>
        <button type="button" onClick={() => nav("/user")}>Cancel</button>
      </div>
    </form>
  );
}
