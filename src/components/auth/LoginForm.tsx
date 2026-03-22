'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('client_profiles')
      .select('role')
      .eq('user_id', data.user.id)
      .single()

    router.refresh()
    router.push(profile?.role === 'admin' ? '/admin' : '/dashboard')
  }

  const inputStyle = {
    width: '100%', padding: '12px 16px',
    border: '1px solid rgba(196,168,130,0.2)',
    borderRadius: 10, fontSize: 14, color: '#fdf8f2',
    background: 'rgba(10,6,5,0.7)', outline: 'none',
    fontFamily: "'Cabinet Grotesk', sans-serif",
    boxSizing: 'border-box' as const,
  }

  const labelStyle = {
    display: 'block' as const,
    fontSize: 11, fontWeight: 600 as const,
    letterSpacing: '0.1em', textTransform: 'uppercase' as const,
    color: 'rgba(196,168,130,0.7)', marginBottom: 8,
    fontFamily: "'Cabinet Grotesk', sans-serif",
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626', fontSize: 13, padding: '12px 14px', borderRadius: 9, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          {error}
        </div>
      )}

      <div>
        <label style={labelStyle}>Email address</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label style={labelStyle}>Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{
          background: loading ? 'rgba(155,32,64,0.5)' : '#9b2040',
          color: '#fdf8f2', border: 'none', borderRadius: 10,
          padding: '13px', fontSize: 14, fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: "'Cabinet Grotesk', sans-serif",
          transition: 'background 0.15s',
        }}
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>

      <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(253,248,242,0.40)', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
        Don&apos;t have an account?{' '}
        <Link href="/register" style={{ color: '#c4a882', fontWeight: 600, textDecoration: 'none' }}>
          Register
        </Link>
      </p>
    </form>
  )
}
