'use client'

import Link from 'next/link'

export default function ReportPrintButton() {
  return (
    <div
      className="no-print"
      style={{
        position: 'fixed',
        top: 24,
        right: 32,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        zIndex: 50,
      }}
    >
      <Link
        href="/dashboard/overview"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '9px 16px',
          borderRadius: 9,
          border: '1px solid rgba(42,31,26,0.15)',
          background: '#fdf8f2',
          color: '#2a1f1a',
          fontSize: 13,
          fontWeight: 600,
          textDecoration: 'none',
          fontFamily: "'Cabinet Grotesk', sans-serif",
        }}
      >
        ← Back to Overview
      </Link>

      <button
        onClick={() => window.print()}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          padding: '9px 20px',
          borderRadius: 9,
          border: 'none',
          background: '#7a1c2e',
          color: '#fdf8f2',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: "'Cabinet Grotesk', sans-serif",
          letterSpacing: '0.02em',
        }}
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Download PDF
      </button>
    </div>
  )
}
