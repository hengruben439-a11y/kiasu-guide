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
    const { profile, benefits, healthScore } = body

    const client = new Anthropic()
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are a financial planning assistant helping a Singapore financial adviser named Noah summarise a client session.

Write a plain-English session summary in exactly 3 paragraphs (no headers, no bullet points, no markdown). Use simple, warm language a non-financial person can understand. Do not use jargon like "corpus", "annualized", or "bifurcated". Write as if summarising a real conversation.

Paragraph 1: Where the client stands today (income, savings, protection coverage, key strengths).
Paragraph 2: The gaps and risks identified (retirement shortfall, insurance gaps, cash flow concerns).
Paragraph 3: The recommended next steps and what would make the biggest difference.

Client data:
- Monthly income: S$${profile.monthly_income}
- Monthly expenses: S$${profile.monthly_expenses}
- Monthly surplus: S$${profile.monthly_income - profile.monthly_expenses}
- Liquid savings: S$${profile.liquid_savings}
- CPF (OA/SA/MA): S$${profile.cpf_oa} / S$${profile.cpf_sa} / S$${profile.cpf_ma}
- Monthly investment: S$${profile.monthly_investment}
- Retirement target age: ${profile.retirement_age}
- Desired monthly income in retirement: S$${profile.desired_monthly_income}
- Portfolio value: S$${profile.portfolio_value}
- Number of insurance policies on file: ${benefits?.length ?? 0}
- Financial health score: ${healthScore}/100

Write the 3-paragraph summary now:`
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
