import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiPost } from '../components/api.js'

export default function CreateTicket() {
  const nav = useNavigate()
  const [form, setForm] = useState({ title:'', type:'support', description:'', userEmail:'' })
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  const onChange = (k) => (e) => setForm(v => ({...v, [k]: e.target.value}))

  async function submit(e) {
    e.preventDefault()
    setErr('')
    setSaving(true)
    try {
      const created = await apiPost('/api/tickets', form)
      nav(`/tickets/${created.id}`)
    } catch (e2) {
      setErr(String(e2))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h2>Create Ticket</h2>
      <div className="small">View 2: Create item</div>

      {err && <p style={{color:'crimson'}}>{err}</p>}

      <form onSubmit={submit} className="card">
        <div className="row">
          <div className="input">
            <label>Title</label>
            <input value={form.title} onChange={onChange('title')} required />
          </div>

          <div className="input">
            <label>Type</label>
            <select value={form.type} onChange={onChange('type')}>
              <option value="support">support</option>
              <option value="bug">bug</option>
              <option value="feature">feature</option>
              <option value="other">other</option>
            </select>
          </div>

          <div className="input">
            <label>User Email</label>
            <input value={form.userEmail} onChange={onChange('userEmail')} required />
          </div>
        </div>

        <div className="input">
          <label>Description</label>
          <textarea rows="4" value={form.description} onChange={onChange('description')} required />
        </div>

        <button className="primary" disabled={saving}>{saving ? 'Creating...' : 'Create'}</button>
      </form>
    </div>
  )
}