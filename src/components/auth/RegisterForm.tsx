'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterForm() {
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
    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Trigger auto-creates client_profiles via DB trigger
    // Redirect to onboarding to complete profile setup
    router.push('/onboarding')
    router.refresh()
  }

  const inputStyle = "w-full px-4 py-3 border border-[rgba(42,31,26,0.15)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7a1c2e] focus:border-transparent text-[#2a1f1a] placeholder:text-[#c4a882]"
  const labelStyle = "block text-xs font-semibold uppercase tracking-widest text-[#a89070] mb-2"

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
