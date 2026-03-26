import { createClient } from '@/lib/supabase/server'
import { ClientProfile } from '@/types'
import { formatSGD } from '@/lib/utils'
import Link from 'next/link'
import ClientTable from '@/components/admin/ClientTable'
import { buildPlanMetrics, Severity } from '@/lib/scoring'

type ClientRow = Pick<ClientProfile,
  'user_id' | 'preferred_name' | 'role' | 'pipeline_status' |
  'monthly_income' | 'monthly_expenses' | 'liquid_savings' |
  'retirement_age' | 'desired_monthly_income' | 'cpf_oa' | 'cpf_sa' | 'cpf_ma' |
  'monthly_investment' | 'target_return_rate' | 'dividend_yield' | 'inflation_rate' | 'dob'
>

export type ClientRiskRow = ClientRow & { riskLevel: Severity | 'no-data' }

export default async function AdminDashboard() {
  const supabase = await createClient()

  const { data: rawClients } = await supabase
    .from('client_profiles')
    .select('user_id, preferred_name, role, pipeline_status, monthly_income, monthly_expenses, liquid_savings, retirement_age, desired_monthly_income, cpf_oa, cpf_sa, cpf_ma, monthly_investment, target_return_rate, dividend_yield, inflation_rate, dob')
    .eq('role', 'client')
    .order('created_at', { ascending: false })
    .returns<ClientRow[]>()

  const clients: ClientRiskRow[] = (rawClients ?? []).map(c => {
    if (!Number(c.monthly_income)) return { ...c, riskLevel: 'no-data' as const }
    const m = buildPlanMetrics(c)
    const riskLevel: Severity | 'no-data' = m.priorities.some(g => g.severity === 'critical')
      ? 'critical'
      : m.priorities.some(g => g.severity === 'attention')
        ? 'attention'
        : 'good'
    return { ...c, riskLevel }
  })

  const total = clients.length
  const active = clients.filter(c => c.pipeline_status === 'active').length
  const withIncome = clients.filter(c => Number(c.monthly_income) > 0).length
  const avgIncome = withIncome > 0
    ? clients.reduce((s, c) => s + Number(c.monthly_income), 0) / withIncome
    : 0
  const critical = clients.filter(c => c.riskLevel === 'critical').length

  return (
    <div style={{ padding: 'clamp(20px, 4vw, 40px) clamp(16px, 4vw, 48px)', fontFamily: "'Cabinet Grotesk', sans-serif", maxWidth: 1200 }}>

      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 8px' }}>
          Advisor Command Centre
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700, color: '#2a1f1a', margin: 0, letterSpacing: '-0.02em' }}>
            CRM Dashboard
          </h1>
          <Link
            href="/admin/invite"
            style={{
              background: '#7a1c2e', color: '#fdf8f2',
              fontSize: 13, fontWeight: 600,
              padding: '10px 20px', borderRadius: 10,
              textDecoration: 'none',
              fontFamily: "'Cabinet Grotesk', sans-serif",
            }}
          >
            + Invite New Client
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid-4col" style={{ gap: 14, marginBottom: 36 }}>
        {[
          { label: 'Total Clients', value: String(total), sub: null },
          { label: 'Active', value: String(active), sub: `${total - active} other` },
          { label: 'Critical Gaps', value: String(critical), sub: critical > 0 ? 'Need attention' : 'None flagged', accent: critical > 0 },
          { label: 'Avg Monthly Income', value: avgIncome > 0 ? formatSGD(avgIncome) : '—', sub: null },
        ].map(({ label, value, sub, accent }) => (
          <div key={label} style={{
            background: accent ? 'rgba(220,38,38,0.04)' : '#fff',
            border: accent ? '1px solid rgba(220,38,38,0.2)' : '1px solid rgba(42,31,26,0.07)',
            borderRadius: 12, padding: '18px 20px',
            boxShadow: '0 2px 8px rgba(42,31,26,0.04)',
          }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: accent ? '#f87171' : '#c4a882', margin: '0 0 8px' }}>
              {label}
            </p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: accent ? '#dc2626' : '#2a1f1a', margin: '0 0 4px' }}>
              {value}
            </p>
            {sub && <p style={{ fontSize: 11, color: '#a89070', margin: 0 }}>{sub}</p>}
          </div>
        ))}
      </div>

      {/* Client table */}
      <ClientTable clients={clients ?? []} />
    </div>
  )
}
