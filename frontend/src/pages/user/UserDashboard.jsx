import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet } from "../../components/api.js";
import { getSocket } from "../../components/socket.js";

function statusClass(status) {
  return status === "Resolved" ? "good" : status === "In Progress" ? "info" : "warn";
}

function countByStatus(list, status) {
  return list.filter((t) => t.status === status).length;
}

export default function UserDashboard() {
  const [tickets, setTickets] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await apiGet("/api/user/tickets");
      setTickets(data || []);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
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
    return tickets.filter((t) => [t.title, t.description, t.status, t.type, t.priority].join(" ").toLowerCase().includes(needle));
  }, [tickets, q]);

  const stats = {
    total: tickets.length,
    open: countByStatus(tickets, "Open"),
    inProgress: countByStatus(tickets, "In Progress"),
    resolved: countByStatus(tickets, "Resolved")
  };

  const total = Math.max(stats.total, 1);

  return (
    <div className="stack">
      <section className="statsGrid">
        <div className="statCard"><div className="small">Total Tickets</div><strong>{stats.total}</strong></div>
        <div className="statCard accentBlue"><div className="small">Open</div><strong>{stats.open}</strong></div>
        <div className="statCard accentYellow"><div className="small">In Progress</div><strong>{stats.inProgress}</strong></div>
        <div className="statCard accentGreen"><div className="small">Resolved</div><strong>{stats.resolved}</strong></div>
      </section>

      <section className="gridTwo">
        <div className="card">
          <div className="sectionHead">
            <div>
              <div className="panelTitle">My Tickets</div>
              <div className="small">Visibility of system status: ticket list and counters update live.</div>
            </div>
            <Link to="/user/new"><button className="primary">+ New Ticket</button></Link>
          </div>

          <label>Search your tickets
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title, status, priority..." />
          </label>

          {loading && <div className="small">Loading tickets...</div>}
          {err && <div className="alert error">{err}</div>}
          {!loading && !filtered.length && <div className="emptyState">No tickets found.</div>}

          <div className="ticketList">
            {filtered.map((t) => (
              <div key={t._id} className="ticketCard">
                <div className="ticketTop">
                  <div>
                    <strong>{t.title}</strong>
                    <div className="small">Updated {new Date(t.updatedAt).toLocaleString()}</div>
                  </div>
                  <span className={`statusPill ${statusClass(t.status)}`}>{t.status}</span>
                </div>
                <div className="row">
                  <span className="tinyPill">{t.type}</span>
                  <span className="tinyPill">Priority: {t.priority}</span>
                  {t.assignedAgentName ? <span className="tinyPill">Assigned: {t.assignedAgentName}</span> : null}
                </div>
                <p className="excerpt">{t.description}</p>
                <Link to={`/user/tickets/${t._id}`}><button>Open Ticket</button></Link>
              </div>
            ))}
          </div>
        </div>

        <div className="stack">
          <div className="card brutalAccent">
            <div className="panelTitle">Live Ticket Mix</div>
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
