import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { apiGet, apiPost, apiPut } from "../../components/api.js";
import { getSocket } from "../../components/socket.js";

function Bubble({ mine, name, message, time, internal }) {
  return (
    <div className={`bubble ${internal ? "internal" : mine ? "mine" : "theirs"}`}>
      <div className="bubbleMeta"><strong>{name}</strong><span>{new Date(time).toLocaleString()}</span></div>
      <div>{message}</div>
    </div>
  );
}

export default function AgentTicketDetail() {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [typingText, setTypingText] = useState("");
  const [edit, setEdit] = useState({ status: "Open", priority: "Normal", description: "" });
  const [err, setErr] = useState("");

  async function load() {
    try {
      const data = await apiGet(`/api/agent/tickets/${id}`);
      setTicket(data);
      setEdit({
        status: data.status,
        priority: data.priority,
        description: data.description
      });
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
      if (next?._id === id) {
        setTicket(next);
        setEdit((prev) => ({ ...prev, status: next.status, priority: next.priority, description: next.description }));
      }
    };
    const onTyping = ({ ticketId, isTyping, role, username }) => {
      if (ticketId !== id) return;
      setTypingText(isTyping && role === "user" ? `${username} is typing...` : "");
    };

    socket.on("ticket:updated", onTicket);
    socket.on("ticket:typing", onTyping);

    return () => {
      socket.off("ticket:updated", onTicket);
      socket.off("ticket:typing", onTyping);
    };
  }, [id]);

  const publicMessages = useMemo(() => (ticket?.messages || []).filter((m) => !m.internal), [ticket]);
  const internalMessages = useMemo(() => (ticket?.messages || []).filter((m) => m.internal), [ticket]);

  async function save() {
    try {
      const next = await apiPut(`/api/agent/tickets/${id}`, edit);
      setTicket(next);
    } catch (e) {
      setErr(String(e.message || e));
    }
  }

  async function sendReply() {
    if (!reply.trim()) return;
    try {
      const next = await apiPost(`/api/agent/tickets/${id}/reply`, { message: reply.trim() });
      setTicket(next);
      setReply("");
      getSocket()?.emit("ticket:typing", { ticketId: id, isTyping: false });
    } catch (e) {
      setErr(String(e.message || e));
    }
  }

  async function addNote() {
    if (!note.trim()) return;
    try {
      const next = await apiPost(`/api/agent/tickets/${id}/notes`, { message: note.trim() });
      setTicket(next);
      setNote("");
    } catch (e) {
      setErr(String(e.message || e));
    }
  }

  function onReplyChange(e) {
    const value = e.target.value;
    setReply(value);
    getSocket()?.emit("ticket:typing", { ticketId: id, isTyping: value.trim().length > 0 });
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
            <div className="small">{ticket.userEmail}</div>
          </div>
          <div className="row">
            <span className="tinyPill">{ticket.status}</span>
            <span className="tinyPill">{ticket.priority}</span>
          </div>
        </div>

        <div className="formRow">
          <label>Status
            <select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </label>

          <label>Priority
            <select value={edit.priority} onChange={(e) => setEdit({ ...edit, priority: e.target.value })}>
              <option value="Low">Low</option>
              <option value="Normal">Normal</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </label>
        </div>

        <label>Description
          <textarea rows="5" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
        </label>
        <button className="primary" onClick={save}>Save Ticket Updates</button>

        <div className="chatPanel">
          <div className="panelTitle">User ↔ Agent Chat</div>
          <div className="small">Live replies appear immediately for the user on this ticket.</div>
          <div className="chatWindow">
            {publicMessages.map((m, idx) => (
              <Bubble
                key={idx}
                mine={m.authorRole === "agent"}
                name={m.authorName || m.authorRole}
                message={m.message}
                time={m.timestamp}
              />
            ))}
          </div>
          <div className="typingText">{typingText || " "}</div>
          <textarea rows="4" value={reply} onChange={onReplyChange} placeholder="Write a public reply..." />
          {err && <div className="alert error">{err}</div>}
          <button className="primary" onClick={sendReply}>Send Reply</button>
        </div>
      </section>

      <aside className="stack">
        <div className="card brutalAccent">
          <div className="panelTitle">Internal Notes</div>
          <div className="chatWindow noteWindow">
            {internalMessages.map((m, idx) => (
              <Bubble
                key={idx}
                mine={false}
                name={m.authorName || "Agent"}
                message={m.message}
                time={m.timestamp}
                internal
              />
            ))}
          </div>
          <textarea rows="4" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add private internal note..." />
          <button onClick={addNote}>Add Internal Note</button>
        </div>

        <div className="card">
          <div className="panelTitle">Ticket Summary</div>
          <div className="infoList">
            <div><span>User</span><strong>{ticket.userEmail}</strong></div>
            <div><span>Assigned Agent</span><strong>{ticket.assignedAgentName || "You on save/reply"}</strong></div>
            <div><span>Last Updated</span><strong>{new Date(ticket.updatedAt).toLocaleString()}</strong></div>
          </div>
        </div>
      </aside>
    </div>
  );
}
