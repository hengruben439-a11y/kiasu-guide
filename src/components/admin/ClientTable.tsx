'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatSGD } from '@/lib/utils'
import { ClientProfile } from '@/types'

type ClientRow = Pick<ClientProfile,
  'user_id' | 'preferred_name' | 'role' | 'pipeline_status' |
  'monthly_income' | 'liquid_savings' | 'retirement_age' | 'cpf_oa' | 'cpf_sa' | 'cpf_ma'
>

interface Props {
  clients: ClientRow[]
}

const statusColour: Record<string, { bg: string; text: string }> = {
  prospect:    { bg: 'rgba(196,168,130,0.15)', text: '#a89070' },
  active:      { bg: 'rgba(122,28,46,0.08)',   text: '#7a1c2e' },
  review_due:  { bg: 'rgba(234,179,8,0.1)',    text: '#92400e' },
  inactive:    { bg: 'rgba(42,31,26,0.07)',     text: '#a89070' },
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
      background: '#fff',
      border: '1px solid rgba(42,31,26,0.07)',
      borderRadius: 14,
      overflow: 'hidden',
      boxShadow: '0 4px 16px rgba(42,31,26,0.04)',
    }}>
      {/* Table header with search + filters */}
      <div style={{ padding: '18px 28px', borderBottom: '1px solid rgba(42,31,26,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: '#2a1f1a', margin: 0 }}>
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
              border: '1.5px solid rgba(42,31,26,0.13)',
              color: '#2a1f1a',
              background: '#fdf8f2',
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
                  border: isActive ? '1.5px solid rgba(122,28,46,0.2)' : '1px solid rgba(42,31,26,0.1)',
                  background: isActive ? 'rgba(122,28,46,0.1)' : '#fff',
                  color: isActive ? '#7a1c2e' : '#a89070',
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
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
        <thead>
          <tr style={{ background: '#fdf8f2' }}>
            {['Name', 'Pipeline', 'Monthly Income', 'Savings', 'CPF Total', ''].map((h) => (
              <th key={h} style={{
                textAlign: 'left', padding: '10px 20px',
                fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: '#a89070',
                borderBottom: '1px solid rgba(42,31,26,0.06)',
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((client) => {
            const cpfTotal = Number(client.cpf_oa) + Number(client.cpf_sa) + Number(client.cpf_ma)
            const status   = client.pipeline_status ?? 'prospect'
            const colours  = statusColour[status] ?? statusColour.prospect
            return (
              <tr
                key={client.user_id}
                style={{ borderBottom: '1px solid rgba(42,31,26,0.04)' }}
              >
                <td style={{ padding: '14px 20px' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#2a1f1a', margin: 0 }}>
                    {client.preferred_name ?? '(no name)'}
                  </p>
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
                <td style={{ padding: '14px 20px', fontSize: 13, color: '#2a1f1a' }}>
                  {Number(client.monthly_income) > 0 ? formatSGD(Number(client.monthly_income)) : '—'}
                </td>
                <td style={{ padding: '14px 20px', fontSize: 13, color: '#2a1f1a' }}>
                  {Number(client.liquid_savings) > 0 ? formatSGD(Number(client.liquid_savings)) : '—'}
                </td>
                <td style={{ padding: '14px 20px', fontSize: 13, color: '#2a1f1a' }}>
                  {cpfTotal > 0 ? formatSGD(cpfTotal) : '—'}
                </td>
                <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                  <Link
                    href={`/admin/clients/${client.user_id}`}
                    style={{
                      fontSize: 12, fontWeight: 600, color: '#7a1c2e',
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
              <td colSpan={6} style={{ padding: '48px 20px', textAlign: 'center', color: '#a89070', fontSize: 14 }}>
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
