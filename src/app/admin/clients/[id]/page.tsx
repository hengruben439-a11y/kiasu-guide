import { createClient } from '@/lib/supabase/server'
import { ClientProfile } from '@/types'
import { formatSGD } from '@/lib/utils'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import AdminClientNotes from '@/components/admin/AdminClientNotes'
import PipelineStatusSelect from '@/components/admin/PipelineStatusSelect'
import { buildPlanMetrics, SEVERITY_STYLES } from '@/lib/scoring'

interface Props {
  params: Promise<{ id: string }>
}


export default async function ClientDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: client }, { data: benefits }, { data: notes }] = await Promise.all([
    supabase.from('client_profiles').select('*').eq('user_id', id).single<ClientProfile>(),
    supabase.from('benefit_blocks').select('benefit_type, coverage, enabled').eq('user_id', id),
    supabase.from('case_notes').select('id, content, note_type, action_type, due_date, completed_at, created_at').eq('user_id', id).order('created_at', { ascending: false }),
  ])

  if (!client || client.role !== 'client') notFound()

  const hasFinancials = Number(client.monthly_income) > 0
  const status = client.pipeline_status ?? 'prospect'
  const plan = hasFinancials ? buildPlanMetrics(client, benefits) : null

  const stats = hasFinancials && plan ? [
    { label: 'Monthly Income', value: formatSGD(plan.income) },
    { label: 'Monthly Surplus', value: formatSGD(plan.surplus) },
    { label: 'Liquid Savings', value: formatSGD(plan.savings) },
    { label: 'CPF Total', value: formatSGD(plan.cpfTotal) },
  ] : []

  return (
    <div style={{ padding: 'clamp(20px, 4vw, 40px) clamp(16px, 4vw, 48px)', fontFamily: "'Cabinet Grotesk', sans-serif", maxWidth: 1100 }}>

      {/* Breadcrumb */}
      <Link href="/admin" style={{ fontSize: 13, color: '#a89070', textDecoration: 'none', display: 'inline-block', marginBottom: 28 }}>
        ← Back to CRM
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 8px' }}>
            Client Profile
          </p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700, color: '#2a1f1a', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            {client.preferred_name ?? '(No name)'}
          </h1>
          <p style={{ fontSize: 14, color: '#a89070', margin: 0 }}>
            Member since {new Date(client.created_at).toLocaleDateString('en-SG', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <PipelineStatusSelect userId={id} currentStatus={status} />
          <Link
            href={`/admin/clients/${id}/review`}
            style={{
              background: '#7a1c2e', color: '#fdf8f2',
              padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Review Mode →
          </Link>
        </div>
      </div>

      {/* Stats */}
      {hasFinancials && (
        <div className="grid-4col" style={{ gap: 14, marginBottom: 20 }}>
          {stats.map(({ label, value }) => (
            <div key={label} style={{
              background: '#fff', border: '1px solid rgba(42,31,26,0.07)',
              borderRadius: 12, padding: '18px 20px',
              boxShadow: '0 2px 8px rgba(42,31,26,0.04)',
            }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 6px' }}>
                {label}
              </p>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#2a1f1a', margin: 0 }}>
                {value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Plan gaps — advisor pre-meeting brief */}
      {plan && (
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#a89070', margin: '0 0 10px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            {plan.allGood ? 'Plan Status' : `${plan.priorities.length} Gap${plan.priorities.length !== 1 ? 's' : ''} Detected`}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {plan.allGood ? (
              <div style={{ padding: '7px 14px', borderRadius: 20, background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)', fontSize: 12, fontWeight: 600, color: '#16a34a' }}>
                ✓ All areas on track
              </div>
            ) : (
              plan.gaps.map(gap => {
                const s = SEVERITY_STYLES[gap.severity]
                return (
                  <div key={gap.id} style={{
                    padding: '7px 14px', borderRadius: 20,
                    background: s.bg, border: `1px solid ${s.border}`,
                    fontSize: 12, fontWeight: 600, color: s.text,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, display: 'inline-block', flexShrink: 0 }} />
                    {gap.title}
                    {gap.severity !== 'good' && (
                      <span style={{ opacity: 0.7, fontWeight: 400 }}>
                        · {gap.severity === 'critical' ? 'Critical' : 'Attention'}
                      </span>
                    )}
                  </div>
                )
              })
            )}
          </div>
          {!plan.allGood && plan.priorities[0] && (
            <p style={{ fontSize: 12, color: '#a89070', margin: '10px 0 0', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              Top concern: {plan.priorities[0].consequence}
            </p>
          )}
        </div>
      )}

      <div className="grid-2col" style={{ gap: 20 }}>

        {/* Financial details */}
        <div style={{ background: '#fff', border: '1px solid rgba(42,31,26,0.07)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(42,31,26,0.06)', background: '#fdf8f2' }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: '#2a1f1a', margin: 0 }}>
              Financial Details
            </h2>
          </div>
          <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {hasFinancials ? [
              { label: 'Retirement Age', value: String(client.retirement_age) },
              { label: 'Desired Retirement Income', value: formatSGD(Number(client.desired_monthly_income)) + '/mo' },
              { label: 'Monthly Investment', value: formatSGD(Number(client.monthly_investment)) },
              { label: 'CPF OA', value: formatSGD(Number(client.cpf_oa)) },
              { label: 'CPF SA', value: formatSGD(Number(client.cpf_sa)) },
              { label: 'CPF MA', value: formatSGD(Number(client.cpf_ma)) },
              { label: 'Inflation Rate', value: `${(Number(client.inflation_rate) * 100).toFixed(1)}%` },
              { label: 'Target Return Rate', value: `${(Number(client.target_return_rate) * 100).toFixed(1)}%` },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingBottom: 10, borderBottom: '1px solid rgba(42,31,26,0.04)' }}>
                <span style={{ color: '#a89070' }}>{label}</span>
                <span style={{ fontWeight: 600, color: '#2a1f1a' }}>{value}</span>
              </div>
            )) : (
              <p style={{ fontSize: 14, color: '#a89070', textAlign: 'center', padding: '24px 0' }}>
                Client has not completed their financial profile.
              </p>
            )}
          </div>
        </div>

        {/* Personal details */}
        <div style={{ background: '#fff', border: '1px solid rgba(42,31,26,0.07)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(42,31,26,0.06)', background: '#fdf8f2' }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: '#2a1f1a', margin: 0 }}>
              Personal Details
            </h2>
          </div>
          <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'DOB', value: client.dob ? new Date(client.dob).toLocaleDateString('en-SG') : '—' },
              { label: 'Sex', value: client.sex ? client.sex.charAt(0).toUpperCase() + client.sex.slice(1) : '—' },
              { label: 'Height', value: client.height_cm ? `${client.height_cm} cm` : '—' },
              { label: 'Weight', value: client.weight_kg ? `${client.weight_kg} kg` : '—' },
              { label: 'Employment', value: client.employment_status ? client.employment_status.replace('_', ' ') : '—' },
              { label: 'Dependants', value: String(client.num_dependents ?? 0) },
              { label: 'Pre-existing', value: client.pre_existing ?? 'None declared' },
              { label: 'PDPA Consent', value: client.pdpa_consent ? '✓ Given' : 'Pending' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingBottom: 10, borderBottom: '1px solid rgba(42,31,26,0.04)' }}>
                <span style={{ color: '#a89070' }}>{label}</span>
                <span style={{ fontWeight: 600, color: '#2a1f1a' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Case notes */}
      <div style={{ marginTop: 20 }}>
        <AdminClientNotes
          userId={id}
          initialNotes={notes ?? []}
        />
      </div>

    </div>
  )
}
