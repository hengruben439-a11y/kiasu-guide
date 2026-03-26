'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Something went wrong.')
      setLoading(false)
      return
    }

    setSent(true)
  }

  const inputStyle = "w-full px-4 py-3 border border-[rgba(42,31,26,0.15)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7a1c2e] focus:border-transparent text-[#2a1f1a] placeholder:text-[#c4a882]"
  const labelStyle = "block text-xs font-semibold uppercase tracking-widest text-[#a89070] mb-2"

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'rgba(122,28,46,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7a1c2e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>
        <div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#2a1f1a', margin: '0 0 6px' }}>Check your inbox</p>
          <p style={{ fontSize: 13, color: '#a89070', margin: 0, lineHeight: 1.6 }}>
            We sent a confirmation link to <strong style={{ color: '#6b5744' }}>{email}</strong>.<br />
            Click it to activate your account.
          </p>
        </div>
        <p className="text-center text-sm text-[#a89070] pt-2">
          Already confirmed?{' '}
          <Link href="/login" className="text-[#7a1c2e] hover:underline font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label className={labelStyle}>Email address</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputStyle}
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label className={labelStyle}>Password</label>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputStyle}
          placeholder="Min. 8 characters"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{ background: loading ? '#c4a882' : '#7a1c2e' }}
        className="w-full py-3 px-4 text-[#fdf8f2] text-sm font-semibold rounded-lg transition-colors"
      >
        {loading ? 'Creating account…' : 'Create account'}
      </button>

      <p className="text-center text-sm text-[#a89070]">
        Already have an account?{' '}
        <Link href="/login" className="text-[#7a1c2e] hover:underline font-semibold">
          Sign in
        </Link>
      </p>
    </form>
  )
}
