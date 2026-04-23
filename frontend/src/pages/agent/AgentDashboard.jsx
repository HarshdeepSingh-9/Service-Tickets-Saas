import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet } from "../../components/api.js";
import { getSocket } from "../../components/socket.js";

function bucket(list, status) {
  return list.filter((t) => t.status === status).length;
}

export default function AgentDashboard() {
  const [tickets, setTickets] = useState([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    try {
      const data = await apiGet("/api/agent/tickets");
      setTickets(data || []);
    } catch (e) {
      setErr(String(e.message || e));
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const refresh = () => load();
    socket.on("dashboard:updated", refresh);
    socket.on("ticket:updated", refresh);
    return () => {
      socket.off("dashboard:updated", refresh);
      socket.off("ticket:updated", refresh);
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return tickets;
    return tickets.filter((t) => [t.title, t.description, t.status, t.priority, t.userEmail].join(" ").toLowerCase().includes(needle));
  }, [tickets, q]);

  const stats = {
    total: tickets.length,
    open: bucket(tickets, "Open"),
    inProgress: bucket(tickets, "In Progress"),
    resolved: bucket(tickets, "Resolved"),
    high: tickets.filter((t) => ["High", "Urgent"].includes(t.priority)).length
  };
  const total = Math.max(stats.total, 1);

  return (
    <div className="stack">
      <section className="statsGrid">
        <div className="statCard"><div className="small">All Tickets</div><strong>{stats.total}</strong></div>
        <div className="statCard accentBlue"><div className="small">Open</div><strong>{stats.open}</strong></div>
        <div className="statCard accentYellow"><div className="small">In Progress</div><strong>{stats.inProgress}</strong></div>
        <div className="statCard accentGreen"><div className="small">Resolved</div><strong>{stats.resolved}</strong></div>
      </section>

      <section className="gridTwo">
        <div className="card">
          <div className="sectionHead">
            <div>
              <div className="panelTitle">Agent Command Center</div>
              <div className="small">Live dashboard updates make monitoring immediate and reduce hidden system state.</div>
            </div>
          </div>

          <label>Search tickets
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title, owner, status, priority..." />
          </label>

          {err && <div className="alert error">{err}</div>}

          <div className="tableLike">
            {filtered.map((t) => (
              <div key={t._id} className="tableRow">
                <div>
                  <strong>{t.title}</strong>
                  <div className="small">{t.userEmail}</div>
                </div>
                <div className="row">
                  <span className="tinyPill">{t.status}</span>
                  <span className="tinyPill">{t.priority}</span>
                </div>
                <div className="small">{new Date(t.updatedAt).toLocaleString()}</div>
                <Link to={`/agent/tickets/${t._id}`}><button>Open</button></Link>
              </div>
            ))}
          </div>
        </div>

        <div className="stack">
          <div className="card brutalAccent">
            <div className="panelTitle">Live Operations Snapshot</div>
            <div className="chartStack">
              <div>
                <div className="chartLabel"><span>Open</span><span>{stats.open}</span></div>
                <div className="barTrack"><div className="barFill accentBlue" style={{ width: `${(stats.open / total) * 100}%` }} /></div>
              </div>
              <div>
                <div className="chartLabel"><span>In Progress</span><span>{stats.inProgress}</span></div>
                <div className="barTrack"><div className="barFill accentYellow" style={{ width: `${(stats.inProgress / total) * 100}%` }} /></div>
              </div>
              <div>
                <div className="chartLabel"><span>Resolved</span><span>{stats.resolved}</span></div>
                <div className="barTrack"><div className="barFill accentGreen" style={{ width: `${(stats.resolved / total) * 100}%` }} /></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
