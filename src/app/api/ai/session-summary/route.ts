import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = await request.json()
    const { profile, benefits, healthScore, planMetrics } = body

    const monthlyIncome = Number(profile.monthly_income) || 0
    const monthlyExpenses = Number(profile.monthly_expenses) || 0
    const surplus = monthlyIncome - monthlyExpenses
    const retirementFundedPct = planMetrics?.retirementFundedPct ?? null
    const coverageGaps = (benefits ?? []).filter((b: { enabled: boolean }) => b.enabled).length
    const totalPolicies = (benefits ?? []).length

    const client = new Anthropic()
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1800,
      messages: [{
        role: 'user',
        content: `You are a financial planning assistant helping a Singapore financial adviser named Noah summarise a client session.

Write a plain-English session summary in exactly 5 paragraphs with the following section labels (bold the label, then continue on the same line):

**Financial Position Overview:** ...
**Protection Gaps:** ...
**Retirement Outlook:** ...
**Cash Flow Health:** ...
**Recommended Actions:** ...

Rules:
- Plain English only. No jargon like "corpus", "annualised", "bifurcated", or "ACO".
- Warm, human tone — as if summarising a real conversation.
- Each paragraph should be 2–4 sentences.
- The Recommended Actions paragraph should name exactly 2–3 concrete steps Noah should discuss with the client (specific, not generic).

Client data:
- Monthly income: S$${monthlyIncome.toLocaleString()}
- Monthly expenses: S$${monthlyExpenses.toLocaleString()}
- Monthly surplus: S$${surplus.toLocaleString()} (${monthlyIncome > 0 ? Math.round((surplus / monthlyIncome) * 100) : 0}% of income)
- Liquid savings: S$${Number(profile.liquid_savings || 0).toLocaleString()}
- Portfolio value: S$${Number(profile.portfolio_value || 0).toLocaleString()}
- CPF (OA/SA/MA): S$${Number(profile.cpf_oa || 0).toLocaleString()} / S$${Number(profile.cpf_sa || 0).toLocaleString()} / S$${Number(profile.cpf_ma || 0).toLocaleString()}
- Monthly investment: S$${Number(profile.monthly_investment || 0).toLocaleString()}
- Retirement target age: ${profile.retirement_age ?? 65}
- Desired retirement income: S$${Number(profile.desired_monthly_income || 0).toLocaleString()}/mo
- Retirement funded: ${retirementFundedPct !== null ? `${Math.round(retirementFundedPct * 100)}% of target` : 'not calculated'}
- Insurance policies on file: ${totalPolicies} (${coverageGaps} enabled)
- Financial health score: ${healthScore ?? '?'}/100
- Total liabilities: S$${Number(profile.total_liabilities || 0).toLocaleString()}

Write the 5-paragraph summary now:`
      }]
    })

    const summaryText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Upsert today's session summary
    const today = new Date().toISOString().split('T')[0]
    await supabase
      .from('session_summaries')
      .upsert({
        user_id: user.id,
        session_date: today,
        ai_summary: summaryText,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,session_date' })

    return NextResponse.json({ summary: summaryText })
  } catch (error) {
    console.error('Session summary error:', error)
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 })
  }
}
