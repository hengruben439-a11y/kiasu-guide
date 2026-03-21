'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { UserRole } from '@/types'

interface SidebarProps {
  role: UserRole
  fullName: string | null
  email: string
}

const clientNav = [
  { href: '/dashboard', label: 'Overview', icon: '◈', exact: true },
  { href: '/dashboard/profile', label: 'Financial Profile', icon: '◉', exact: false },
]

const clientTools = [
  { href: '/dashboard/overview', label: 'Financial Overview', icon: '◉' },
  { href: '/dashboard/retirement', label: 'Retirement Analytics', icon: '◈' },
  { href: '/dashboard/stress-test', label: 'Stress Test', icon: '◇' },
  { href: '/dashboard/cost-of-waiting', label: 'Cost of Waiting', icon: '△' },
  { href: '/dashboard/cpf', label: 'CPF Planning', icon: '⬟' },
  { href: '/dashboard/insurance', label: 'Insurance Benefits', icon: '◍' },
  { href: '/dashboard/cashflow', label: 'Cash Flow', icon: '⊞' },
  { href: '/dashboard/bmi', label: 'BMI Calculator', icon: '⊕' },
  { href: '/dashboard/ltc', label: 'LTC Gap', icon: '⊗' },
  { href: '/dashboard/health-score', label: 'Health Score', icon: '⊛' },
  { href: '/dashboard/net-worth', label: 'Net Worth', icon: '⊜' },
]

const adminNav = [
  { href: '/admin', label: 'CRM Dashboard', icon: '◈', exact: true },
  { href: '/admin/invite', label: 'Invite Client', icon: '⊕', exact: false },
]

export default function Sidebar({ role, fullName, email }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [toolsOpen, setToolsOpen] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile and listen for resize
  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close sidebar on route change
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isMobile, isOpen])

  const navItems = role === 'admin' ? adminNav : clientNav

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const linkStyle = (active: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    padding: '8px 12px',
    borderRadius: 8,
    fontFamily: "'Cabinet Grotesk', sans-serif",
    fontSize: 12,
    fontWeight: active ? 600 : 500,
    color: active ? '#7a1c2e' : '#a89070',
    background: active ? 'rgba(122,28,46,0.07)' : 'transparent',
    borderLeft: active ? '2px solid #7a1c2e' : '2px solid transparent',
    textDecoration: 'none' as const,
    transition: 'all 0.15s',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
  })

  // On mobile: fixed, full height, slides in/out
  // On desktop: static, always visible
  const sidebarStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 1000,
        height: '100vh',
        width: 260,
        background: '#fff',
        borderRight: '1px solid rgba(42,31,26,0.08)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        overflowY: 'auto',
      }
    : {
        position: 'relative' as const,
        width: 220,
        minHeight: '100vh',
        background: '#fff',
        borderRight: '1px solid rgba(42,31,26,0.08)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }

  return (
    <>
      {/* Hamburger button — only visible on mobile when sidebar is closed */}
      {isMobile && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open navigation"
          style={{
            position: 'fixed',
            top: 14,
            left: 14,
            zIndex: 1001,
            width: 40,
            height: 40,
            background: '#fff',
            border: '1px solid rgba(42,31,26,0.12)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(42,31,26,0.1)',
            fontSize: 18,
            color: '#2a1f1a',
          }}
        >
          ☰
        </button>
      )}

      {/* Backdrop — only on mobile when open */}
      {isMobile && isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(42,31,26,0.4)',
            zIndex: 999,
          }}
        />
      )}

      {/* Sidebar */}
      <aside style={sidebarStyle}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid rgba(42,31,26,0.07)' }}>
          <Link href={role === 'admin' ? '/admin' : '/dashboard'} style={{ textDecoration: 'none' }}>
            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 16, fontWeight: 700, color: '#2a1f1a',
              letterSpacing: '-0.01em', margin: 0,
            }}>
              The Kiasu Guide
            </h1>
            <p style={{
              fontFamily: "'Cabinet Grotesk', sans-serif",
              fontSize: 10, color: '#c4a882', marginTop: 3,
              letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>
              Financial Planning
            </p>
          </Link>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 1, overflowY: 'auto' }}>

          {/* Primary nav items */}
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} style={linkStyle(isActive(item.href, item.exact))}>
              <span style={{ fontSize: 13, flexShrink: 0 }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}

          {/* Tools section — client only */}
          {role === 'client' && (
            <>
              <button
                onClick={() => setToolsOpen((v) => !v)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '8px 12px',
                  background: 'transparent', border: 'none',
                  cursor: 'pointer', marginTop: 8,
                  fontFamily: "'Cabinet Grotesk', sans-serif",
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: '#c4a882',
                }}
              >
                <span>Tools</span>
                <span style={{ fontSize: 10, transition: 'transform 0.2s', transform: toolsOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}>▾</span>
              </button>
              {toolsOpen && clientTools.map((item) => {
                const active = pathname === item.href
                return (
                  <Link key={item.href} href={item.href} style={linkStyle(active)}>
                    <span style={{ fontSize: 11, flexShrink: 0, opacity: 0.7 }}>{item.icon}</span>
                    {item.label}
                  </Link>
                )
              })}
            </>
          )}
        </nav>

        {/* User / Sign out */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(42,31,26,0.07)', flexShrink: 0 }}>
          <div style={{ padding: '10px 12px', marginBottom: 2, background: '#fdf8f2', borderRadius: 8 }}>
            <p style={{
              fontFamily: "'Cabinet Grotesk', sans-serif",
              fontSize: 12, fontWeight: 600, color: '#2a1f1a',
              margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {fullName ?? email}
            </p>
            <p style={{
              fontFamily: "'Cabinet Grotesk', sans-serif",
              fontSize: 10, color: '#a89070', margin: '2px 0 6px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {email}
            </p>
            <span style={{
              display: 'inline-block',
              fontFamily: "'Cabinet Grotesk', sans-serif",
              fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', padding: '2px 8px', borderRadius: 20,
              background: role === 'admin' ? 'rgba(122,28,46,0.1)' : 'rgba(196,168,130,0.15)',
              color: role === 'admin' ? '#7a1c2e' : '#a89070',
            }}>
              {role === 'admin' ? 'Advisor' : 'Client'}
            </span>
          </div>
          <button
            onClick={handleSignOut}
            style={{
              width: '100%', textAlign: 'left',
              padding: '8px 12px',
              fontFamily: "'Cabinet Grotesk', sans-serif",
              fontSize: 12, color: '#a89070',
              background: 'transparent', border: 'none',
              borderRadius: 8, cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
