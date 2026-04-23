import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiDelete, apiGet, apiPost, apiPut } from '../components/api.js'

export default function TicketDetail() {
  const { id } = useParams()
  const nav = useNavigate()

  const [ticket, setTicket] = useState(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)

  const [edit, setEdit] = useState({ title:'', type:'support', description:'', userEmail:'', status:'Open' })
  const [msg, setMsg] = useState('')

  const onChange = (k) => (e) => setEdit(v => ({...v, [k]: e.target.value}))

  async function load() {
    setLoading(true)
    setErr('')
    try {
      const t = await apiGet(`/api/tickets/${id}`)
      setTicket(t)
      setEdit({
        title: t.title,
        type: t.type,
        description: t.description,
        userEmail: t.userEmail,
        status: t.status
      })
    } catch (e) {
      setErr(String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function save() {
    setErr('')
    try {
      const res = await apiPut(`/api/tickets/${id}`, edit)
      setTicket(res.ticket)
    } catch (e) {
      setErr(String(e))
    }
  }

  async function remove() {
    if (!confirm('Delete this ticket?')) return
    setErr('')
    try {
      await apiDelete(`/api/tickets/${id}`)
      nav('/')
    } catch (e) {
      setErr(String(e))
    }
  }

  async function addMessage() {
    if (!msg.trim()) return
    setErr('')
    try {
      const messages = await apiPost(`/api/tickets/${id}/messages`, { message: msg, agent: 'Agent' })
      setTicket(t => ({...t, messages}))
      setMsg('')
    } catch (e) {
      setErr(String(e))
    }
  }

  return (
    <div>
      <h2>Ticket Details</h2>
      <div className="small">View 3: Read one + Update + Delete + Add Message (full CRUD view)</div>

      {loading && <p>Loading...</p>}
      {err && <p style={{color:'crimson'}}>{err}</p>}

      {ticket && (
        <>
          <div className="card">
            <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
              <div>
                <strong>ID:</strong> {ticket.id} <span className="badge">{ticket.status}</span> <span className="badge">{ticket.type}</span>
                <div className="small">{ticket.userEmail}</div>
              </div>
              <div className="row">
                <button onClick={save} className="primary">Save Update</button>
                <button onClick={remove}>Delete</button>
              </div>
            </div>

            <div className="row">
              <div className="input">
                <label>Title</label>
                <input value={edit.title} onChange={onChange('title')} />
              </div>

              <div className="input">
                <label>Type</label>
                <select value={edit.type} onChange={onChange('type')}>
                  <option value="support">support</option>
                  <option value="bug">bug</option>
                  <option value="feature">feature</option>
                  <option value="other">other</option>
                </select>
              </div>

              <div className="input">
                <label>Status</label>
                <select value={edit.status} onChange={onChange('status')}>
                  <option value="Open">Open</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>
            </div>

            <div className="input">
              <label>Description</label>
              <textarea rows="4" value={edit.description} onChange={onChange('description')} />
            </div>

            <div className="input">
              <label>User Email</label>
              <input value={edit.userEmail} onChange={onChange('userEmail')} />
            </div>
          </div>

          <div className="card">
            <strong>Messages</strong>
            <div className="small">POST /api/tickets/:id/messages</div>

            <div className="input">
              <label>Add a message</label>
              <textarea rows="3" value={msg} onChange={(e)=>setMsg(e.target.value)} />
            </div>
            <button className="primary" onClick={addMessage}>Add Message</button>

            <div style={{marginTop:12}}>
              {(ticket.messages || []).length === 0 && <p className="small">No messages yet.</p>}
              {(ticket.messages || []).map((m, idx) => (
                <div key={idx} className="card" style={{margin: '10px 0'}}>
                  <div className="small"><strong>{m.agent}</strong> • {new Date(m.timestamp).toLocaleString()}</div>
                  <div>{m.message}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}