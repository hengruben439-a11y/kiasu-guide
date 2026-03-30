'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { UserRole } from '@/types'

interface SidebarProps {
  role: UserRole
  fullName: string | null
  email: string
}

const phases = [
  {
    number: 1,
    label: 'Know Your Position',
    items: [
      { href: '/dashboard/profile', label: 'Financial Profile', icon: '◉' },
      { href: '/dashboard/bmi', label: 'BMI & Health', icon: '⊕' },
      { href: '/dashboard/overview', label: 'Financial Overview', icon: '◈' },
    ],
  },
  {
    number: 2,
    label: 'Find the Gaps',
    items: [
      { href: '/dashboard/insurance', label: 'Insurance Coverage', icon: '◍' },
      { href: '/dashboard/ltc', label: 'LTC Gap', icon: '⊗' },
      { href: '/dashboard/stress-test', label: 'Stress Test', icon: '◇' },
    ],
  },
  {
    number: 3,
    label: 'Plot the Path',
    items: [
      { href: '/dashboard/retirement', label: 'Retirement Analytics', icon: '◈' },
      { href: '/dashboard/cost-of-waiting', label: 'Cost of Waiting', icon: '△' },
      { href: '/dashboard/cpf', label: 'CPF Planning', icon: '⬟' },
    ],
  },
  {
    number: 4,
    label: 'Understand the Tools',
    items: [
      { href: '/dashboard/health-score', label: 'Health Score', icon: '⊛' },
    ],
  },
  {
    number: 5,
    label: 'Optimise the Plan',
    items: [
      { href: '/dashboard/cashflow', label: 'Cash Flow', icon: '⊞' },
      { href: '/dashboard/net-worth', label: 'Net Worth', icon: '⊜' },
    ],
  },
  {
    number: 6,
    label: 'The Recommendation',
    items: [
      { href: '/dashboard/report', label: 'Session Summary', icon: '◉' },
    ],
  },
]

const adminNav = [
  { href: '/admin', label: 'CRM Dashboard', icon: '◈', exact: true },
  { href: '/admin/invite', label: 'Invite Client', icon: '⊕', exact: false },
]

export default function Sidebar({ role, fullName, email }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [openPhases, setOpenPhases] = useState<Set<number>>(new Set([1, 2, 3, 4, 5, 6]))
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    function checkMobile() { setIsMobile(window.innerWidth <= 768) }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => { setIsOpen(false) }, [pathname])

  useEffect(() => {
    if (isMobile && isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isMobile, isOpen])

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  function phaseHasActive(phaseItems: typeof phases[0]['items']) {
    return phaseItems.some(item => isActive(item.href, (item as { href: string; label: string; icon: string; exact?: boolean }).exact))
  }

  function togglePhase(num: number) {
    setOpenPhases(prev => {
      const next = new Set(prev)
      if (next.has(num)) next.delete(num)
      else next.add(num)
      return next
    })
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function linkStyle(active: boolean): React.CSSProperties {
    return {
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      padding: '6px 10px 6px 22px',
      borderRadius: 8,
      fontFamily: "'Cabinet Grotesk', sans-serif",
      fontSize: 12,
      fontWeight: active ? 600 : 400,
      color: active ? '#fdf8f2' : 'rgba(253,248,242,0.45)',
      background: active ? 'rgba(155,32,64,0.25)' : 'transparent',
      borderLeft: active ? '2px solid #9b2040' : '2px solid transparent',
      textDecoration: 'none',
      transition: 'all 0.15s',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }
  }

  const sidebarStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 1000,
        height: '100vh',
        width: 240,
        background: 'rgba(10,6,5,0.97)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(196,168,130,0.12)',
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
        background: 'rgba(10,6,5,0.6)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(196,168,130,0.10)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }

  return (
    <>
      {/* Hamburger — mobile only */}
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
            background: 'rgba(122,28,46,0.25)',
            border: '1px solid rgba(196,168,130,0.2)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: 17,
            color: '#c4a882',
            backdropFilter: 'blur(8px)',
          }}
        >
          ☰
        </button>
      )}

      {/* Backdrop */}
      {isMobile && isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10,6,5,0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 999,
          }}
        />
      )}

      {/* Sidebar */}
      <aside style={sidebarStyle}>
        {/* Logo */}
        <div style={{ padding: '22px 18px 14px', borderBottom: '1px solid rgba(196,168,130,0.08)' }}>
          <Link href={role === 'admin' ? '/admin' : '/dashboard'} style={{ textDecoration: 'none' }}>
            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 15, fontWeight: 700, color: '#fdf8f2',
              letterSpacing: '-0.01em', margin: 0,
            }}>
              The Kiasu Guide
            </h1>
            <p style={{
              fontFamily: "'Cabinet Grotesk', sans-serif",
              fontSize: 9, color: '#c4a882', marginTop: 3,
              letterSpacing: '0.15em', textTransform: 'uppercase',
            }}>
              Financial Planning
            </p>
          </Link>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 0, overflowY: 'auto' }}>

          {role === 'admin' ? (
            adminNav.map((item) => (
              <motion.div key={item.href} whileHover={{ x: 2 }} transition={{ duration: 0.15 }}>
                <Link href={item.href} style={linkStyle(item.exact ? pathname === item.href : pathname.startsWith(item.href))}>
                  <span style={{ fontSize: 12, flexShrink: 0, opacity: 0.8 }}>{item.icon}</span>
                  {item.label}
                </Link>
              </motion.div>
            ))
          ) : (
            phases.map((phase) => {
              const isPhaseActive = phaseHasActive(phase.items)
              const isPhaseOpen = openPhases.has(phase.number)

              return (
                <div key={phase.number} style={{ marginBottom: 2 }}>
                  {/* Phase header */}
                  <button
                    onClick={() => togglePhase(phase.number)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      width: '100%', padding: '6px 10px',
                      background: isPhaseActive ? 'rgba(155,32,64,0.08)' : 'transparent',
                      border: 'none', borderRadius: 7,
                      cursor: 'pointer', marginTop: 4,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 16, height: 16, borderRadius: 4,
                        background: isPhaseActive ? 'rgba(155,32,64,0.35)' : 'rgba(196,168,130,0.08)',
                        border: `1px solid ${isPhaseActive ? 'rgba(155,32,64,0.5)' : 'rgba(196,168,130,0.15)'}`,
                        fontFamily: "'Cabinet Grotesk', sans-serif",
                        fontSize: 8, fontWeight: 800,
                        color: isPhaseActive ? '#c4a882' : 'rgba(196,168,130,0.4)',
                        flexShrink: 0,
                      }}>
                        {phase.number}
                      </span>
                      <span style={{
                        fontFamily: "'Cabinet Grotesk', sans-serif",
                        fontSize: 9, fontWeight: 700, letterSpacing: '0.10em',
                        textTransform: 'uppercase',
                        color: isPhaseActive ? 'rgba(196,168,130,0.85)' : 'rgba(196,168,130,0.4)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {phase.label}
                      </span>
                    </div>
                    <span style={{
                      fontSize: 9,
                      color: 'rgba(196,168,130,0.3)',
                      transition: 'transform 0.2s',
                      transform: isPhaseOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                    }}>▾</span>
                  </button>

                  {/* Phase items */}
                  {isPhaseOpen && (
                    <div style={{ paddingBottom: 4 }}>
                      {phase.items.map((item) => {
                        const active = isActive(item.href, (item as { exact?: boolean }).exact)
                        return (
                          <motion.div key={item.href} whileHover={{ x: 2 }} transition={{ duration: 0.15 }}>
                            <Link href={item.href} style={linkStyle(active)}>
                              <span style={{ fontSize: 10, flexShrink: 0, opacity: 0.5 }}>{item.icon}</span>
                              {item.label}
                            </Link>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </nav>

        {/* User section */}
        <div style={{ padding: '10px 8px', borderTop: '1px solid rgba(196,168,130,0.08)', flexShrink: 0 }}>
          <div style={{
            padding: '10px 12px', marginBottom: 2,
            background: 'rgba(122,28,46,0.12)',
            border: '1px solid rgba(196,168,130,0.08)',
            borderRadius: 10,
          }}>
            <p style={{
              fontFamily: "'Cabinet Grotesk', sans-serif",
              fontSize: 12, fontWeight: 600, color: '#fdf8f2',
              margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {fullName ?? email}
            </p>
            <p style={{
              fontFamily: "'Cabinet Grotesk', sans-serif",
              fontSize: 10, color: 'rgba(253,248,242,0.4)', margin: '2px 0 6px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {email}
            </p>
            <span style={{
              display: 'inline-block',
              fontFamily: "'Cabinet Grotesk', sans-serif",
              fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
              textTransform: 'uppercase', padding: '2px 8px', borderRadius: 20,
              background: role === 'admin' ? 'rgba(155,32,64,0.3)' : 'rgba(196,168,130,0.12)',
              color: role === 'admin' ? '#c4a882' : 'rgba(253,248,242,0.5)',
              border: `1px solid ${role === 'admin' ? 'rgba(155,32,64,0.4)' : 'rgba(196,168,130,0.15)'}`,
            }}>
              {role === 'admin' ? 'Advisor' : 'Client'}
            </span>
          </div>
          <button
            onClick={handleSignOut}
            style={{
              width: '100%', textAlign: 'left',
              padding: '7px 12px',
              fontFamily: "'Cabinet Grotesk', sans-serif",
              fontSize: 11, color: 'rgba(253,248,242,0.3)',
              background: 'transparent', border: 'none',
              borderRadius: 8, cursor: 'pointer',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(253,248,242,0.6)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(253,248,242,0.3)')}
          >
            Sign out →
          </button>
        </div>
      </aside>
    </>
  )
}
