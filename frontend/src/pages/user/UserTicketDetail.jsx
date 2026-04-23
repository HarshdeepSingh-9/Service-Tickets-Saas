import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiDelete, apiGet, apiPost } from "../../components/api.js";
import { getSocket } from "../../components/socket.js";

function Bubble({ mine, name, message, time }) {
  return (
    <div className={`bubble ${mine ? "mine" : "theirs"}`}>
      <div className="bubbleMeta"><strong>{name}</strong><span>{new Date(time).toLocaleString()}</span></div>
      <div>{message}</div>
    </div>
  );
}

export default function UserTicketDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [msg, setMsg] = useState("");
  const [typingText, setTypingText] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const data = await apiGet(`/api/user/tickets/${id}`);
      setTicket(data);
    } catch (e) {
      setErr(String(e.message || e));
    }
  }

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.emit("ticket:join", { ticketId: id });

    const onTicket = (next) => {
      if (next?._id === id) setTicket(next);
    };
    const onTyping = ({ ticketId, isTyping, role, username }) => {
      if (ticketId !== id) return;
      setTypingText(isTyping && role === "agent" ? `${username} is typing...` : "");
    };

    socket.on("ticket:updated", onTicket);
    socket.on("ticket:typing", onTyping);

    return () => {
      socket.off("ticket:updated", onTicket);
      socket.off("ticket:typing", onTyping);
    };
  }, [id]);

  const publicMessages = useMemo(() => (ticket?.messages || []).filter((m) => !m.internal), [ticket]);

  async function send() {
    if (!msg.trim()) return;
    setBusy(true);
    setErr("");
    try {
      const next = await apiPost(`/api/user/tickets/${id}/messages`, { message: msg.trim() });
      setTicket(next);
      setMsg("");
      const socket = getSocket();
      socket?.emit("ticket:typing", { ticketId: id, isTyping: false });
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function removeTicket() {
    if (!confirm("Delete this ticket?")) return;
    try {
      await apiDelete(`/api/user/tickets/${id}`);
      nav("/user");
    } catch (e) {
      setErr(String(e.message || e));
    }
  }

  function onType(e) {
    const value = e.target.value;
    setMsg(value);
    const socket = getSocket();
    socket?.emit("ticket:typing", { ticketId: id, isTyping: value.trim().length > 0 });
  }

  if (!ticket) {
    return <div className="card">{err ? <div className="alert error">{err}</div> : <div className="small">Loading ticket...</div>}</div>;
  }

  return (
    <div className="gridTwo">
      <section className="card">
        <div className="sectionHead">
          <div>
            <div className="panelTitle">{ticket.title}</div>
            <div className="row">
              <span className="tinyPill">{ticket.status}</span>
              <span className="tinyPill">{ticket.type}</span>
              <span className="tinyPill">Priority: {ticket.priority}</span>
            </div>
          </div>
          <button className="danger" onClick={removeTicket}>Delete Ticket</button>
        </div>

        <p className="excerpt">{ticket.description}</p>

        <div className="chatPanel">
          <div className="panelTitle">Real-Time Chat</div>
          <div className="small">Messages update immediately for the agent and the user on the same ticket.</div>
          <div className="chatWindow">
            {publicMessages.map((m, idx) => (
              <Bubble
                key={idx}
                mine={m.authorRole === "user"}
                name={m.authorName || m.authorRole}
                message={m.message}
                time={m.timestamp}
              />
            ))}
          </div>
          <div className="typingText">{typingText || " "}</div>
          <textarea rows="4" value={msg} onChange={onType} placeholder="Write a reply to the agent..." />
          {err && <div className="alert error">{err}</div>}
          <button className="primary" disabled={busy} onClick={send}>{busy ? "Sending..." : "Send Message"}</button>
        </div>
      </section>

      <aside className="stack">
        <div className="card brutalAccent">
          <div className="panelTitle">Ticket Summary</div>
          <div className="infoList">
            <div><span>Status</span><strong>{ticket.status}</strong></div>
            <div><span>Priority</span><strong>{ticket.priority}</strong></div>
            <div><span>Assigned Agent</span><strong>{ticket.assignedAgentName || "Unassigned"}</strong></div>
            <div><span>Last Updated</span><strong>{new Date(ticket.updatedAt).toLocaleString()}</strong></div>
          </div>
        </div>

      </aside>
    </div>
  );
}
