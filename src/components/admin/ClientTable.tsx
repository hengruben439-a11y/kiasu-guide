'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatSGD } from '@/lib/utils'
import { ClientRiskRow } from '@/app/admin/page'

interface Props {
  clients: ClientRiskRow[]
}

const RISK_DOT: Record<string, { color: string; label: string }> = {
  critical:   { color: '#dc2626', label: 'Critical' },
  attention:  { color: '#d97706', label: 'Attention' },
  good:       { color: '#16a34a', label: 'On track' },
  'no-data':  { color: 'rgba(196,168,130,0.4)', label: 'No data' },
}

const statusColour: Record<string, { bg: string; text: string }> = {
  prospect:    { bg: 'rgba(196,168,130,0.15)', text: 'rgba(253,248,242,0.55)' },
  active:      { bg: 'rgba(122,28,46,0.15)',   text: '#c4a882' },
  review_due:  { bg: 'rgba(234,179,8,0.1)',    text: '#f59e0b' },
  inactive:    { bg: 'rgba(196,168,130,0.08)', text: 'rgba(253,248,242,0.55)' },
}

const FILTER_OPTIONS = [
  { value: 'all',        label: 'All'        },
  { value: 'prospect',   label: 'Prospect'   },
  { value: 'active',     label: 'Active'     },
  { value: 'review_due', label: 'Review Due' },
  { value: 'inactive',   label: 'Inactive'   },
]

export default function ClientTable({ clients }: Props) {
  const [search, setSearch]           = useState('')
  const [activeFilter, setActiveFilter] = useState('all')

  const filtered = clients.filter((c) => {
    const matchesSearch = (c.preferred_name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchesFilter = activeFilter === 'all' || (c.pipeline_status ?? 'prospect') === activeFilter
    return matchesSearch && matchesFilter
  })

  return (
    <div style={{
      background: 'rgba(122,28,46,0.06)',
      border: '1px solid rgba(196,168,130,0.15)',
      borderRadius: 14,
      overflow: 'hidden',
      boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
    }}>
      {/* Table header with search + filters */}
      <div style={{ padding: '18px 28px', borderBottom: '1px solid rgba(196,168,130,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: '#fdf8f2', margin: 0 }}>
            All Clients
          </h2>
          <input
            type="text"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              fontSize: 13,
              fontFamily: "'Cabinet Grotesk', sans-serif",
              padding: '7px 14px',
              borderRadius: 8,
              border: '1px solid rgba(196,168,130,0.15)',
              color: '#fdf8f2',
              background: 'rgba(10,6,5,0.6)',
              outline: 'none',
              width: 200,
            }}
          />
        </div>

        {/* Pipeline filter pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {FILTER_OPTIONS.map(({ value, label }) => {
            const isActive = activeFilter === value
            return (
              <button
                key={value}
                onClick={() => setActiveFilter(value)}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '4px 12px',
                  borderRadius: 20,
                  cursor: 'pointer',
                  fontFamily: "'Cabinet Grotesk', sans-serif",
                  border: isActive ? '1.5px solid rgba(196,168,130,0.3)' : '1px solid rgba(196,168,130,0.15)',
                  background: isActive ? 'rgba(122,28,46,0.2)' : 'transparent',
                  color: isActive ? '#c4a882' : 'rgba(253,248,242,0.55)',
                  transition: 'all 0.15s ease',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div className="table-scroll">
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 650 }}>
        <thead>
          <tr style={{ background: 'rgba(10,6,5,0.5)' }}>
            {['Name', 'Risk', 'Pipeline', 'Monthly Income', 'Savings', ''].map((h) => (
              <th key={h} style={{
                textAlign: 'left', padding: '10px 20px',
                fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: 'rgba(253,248,242,0.55)',
                borderBottom: '1px solid rgba(196,168,130,0.15)',
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((client) => {
            const status   = client.pipeline_status ?? 'prospect'
            const colours  = statusColour[status] ?? statusColour.prospect
            const risk     = RISK_DOT[client.riskLevel] ?? RISK_DOT['no-data']
            return (
              <tr
                key={client.user_id}
                style={{ borderBottom: '1px solid rgba(196,168,130,0.04)' }}
              >
                <td style={{ padding: '14px 20px' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#fdf8f2', margin: 0 }}>
                    {client.preferred_name ?? '(no name)'}
                  </p>
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: risk.color, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: risk.color }}>{risk.label}</span>
                  </span>
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <span style={{
                    display: 'inline-block',
                    fontSize: 11, fontWeight: 600,
                    padding: '3px 10px', borderRadius: 20,
                    background: colours.bg, color: colours.text,
                  }}>
                    {status.replace('_', ' ')}
                  </span>
                </td>
                <td style={{ padding: '14px 20px', fontSize: 13, color: '#fdf8f2' }}>
                  {Number(client.monthly_income) > 0 ? formatSGD(Number(client.monthly_income)) : '—'}
                </td>
                <td style={{ padding: '14px 20px', fontSize: 13, color: '#fdf8f2' }}>
                  {Number(client.liquid_savings) > 0 ? formatSGD(Number(client.liquid_savings)) : '—'}
                </td>
                <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                  <Link
                    href={`/admin/clients/${client.user_id}`}
                    style={{
                      fontSize: 12, fontWeight: 600, color: '#c4a882',
                      textDecoration: 'none',
                    }}
                  >
                    View →
                  </Link>
                </td>
              </tr>
            )
          })}

          {filtered.length === 0 && (
            <tr>
              <td colSpan={6} style={{ padding: '48px 20px', textAlign: 'center', color: 'rgba(253,248,242,0.55)', fontSize: 14 }}>
                {clients.length === 0
                  ? 'No clients yet. Use "Invite New Client" to get started.'
                  : 'No clients match your search.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  )
}
