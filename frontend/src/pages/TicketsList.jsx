import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet } from '../components/api.js'

export default function TicketsList() {
  const [tickets, setTickets] = useState([])
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    setErr('')
    try {
      const data = await apiGet('/api/tickets')
      setTickets(data)
    } catch (e) {
      setErr(String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <h2>All Tickets</h2>
      <div className="small">View 1: Read multiple items</div>

      {loading && <p>Loading...</p>}
      {err && <p style={{color:'crimson'}}>{err}</p>}

      {tickets.map(t => (
        <div key={t.id} className="card">
          <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
            <div>
              <strong>{t.title}</strong> <span className="badge">{t.type}</span> <span className="badge">{t.status}</span>
              <div className="small">Ticket ID: {t.id} • {t.userEmail}</div>
            </div>
            <Link to={`/tickets/${t.id}`}><button className="primary">Open</button></Link>
          </div>
          <p className="small">{t.description}</p>
        </div>
      ))}
    </div>
  )
}