'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const inputStyle = {
  width: '100%', padding: '12px 16px',
  border: '1px solid rgba(196,168,130,0.15)',
  borderRadius: 10, fontSize: 14, color: '#fdf8f2',
  background: 'rgba(10,6,5,0.6)', outline: 'none',
  fontFamily: "'Cabinet Grotesk', sans-serif",
  boxSizing: 'border-box' as const,
}

const labelStyle = {
  display: 'block' as const,
  fontSize: 11, fontWeight: 600 as const,
  letterSpacing: '0.1em', textTransform: 'uppercase' as const,
  color: 'rgba(253,248,242,0.55)', marginBottom: 8,
  fontFamily: "'Cabinet Grotesk', sans-serif",
}

export default function InviteClientForm() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [pipeline, setPipeline] = useState('prospect')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, pipeline_status: pipeline }),
    })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Something went wrong.')
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div style={{
        background: 'rgba(122,28,46,0.06)',
        border: '1px solid rgba(196,168,130,0.15)',
        borderRadius: 14, padding: '40px',
        textAlign: 'center',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
      }}>
        <p style={{ fontSize: 32, margin: '0 0 16px' }}>✓</p>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: '#fdf8f2', margin: '0 0 10px' }}>
          Invitation sent
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(253,248,242,0.55)', margin: '0 0 28px' }}>
          {name ? `${name} (${email})` : email} has been invited. They&apos;ll receive a login link.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={() => { setSuccess(false); setEmail(''); setName('') }}
            style={{
              background: 'rgba(196,168,130,0.1)', color: '#fdf8f2',
              border: '1px solid rgba(196,168,130,0.15)', borderRadius: 10, padding: '11px 22px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: "'Cabinet Grotesk', sans-serif",
            }}
          >
            Invite another
          </button>
          <button
            onClick={() => router.push('/admin')}
            style={{
              background: '#9b2040', color: '#fdf8f2',
              border: 'none', borderRadius: 10, padding: '11px 22px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: "'Cabinet Grotesk', sans-serif",
            }}
          >
            Back to CRM
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{
        background: 'rgba(122,28,46,0.06)',
        border: '1px solid rgba(196,168,130,0.15)',
        borderRadius: 14, padding: '36px 40px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        display: 'flex', flexDirection: 'column', gap: 24,
      }}>
        {error && (
          <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8 }}>
            <p style={{ fontSize: 13, color: '#ef4444', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>{error}</p>
          </div>
        )}

        <div>
          <label style={labelStyle}>Client email address *</label>
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="client@example.com"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Preferred name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sarah"
            style={inputStyle}
          />
          <p style={{ fontSize: 12, color: 'rgba(253,248,242,0.55)', margin: '6px 0 0', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            Optional — client can set this during onboarding
          </p>
        </div>

        <div>
          <label style={labelStyle}>Pipeline status</label>
          <select
            value={pipeline}
            onChange={(e) => setPipeline(e.target.value)}
            style={{ ...inputStyle, appearance: 'none' as const }}
          >
            <option value="prospect">Prospect</option>
            <option value="active">Active</option>
            <option value="review_due">Review due</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            background: '#9b2040', color: '#fdf8f2',
            border: 'none', borderRadius: 10, padding: '13px',
            fontSize: 14, fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            fontFamily: "'Cabinet Grotesk', sans-serif",
            transition: 'opacity 0.15s',
          }}
        >
          {loading ? 'Sending invitation…' : 'Send invitation'}
        </button>
      </div>
    </form>
  )
}
