import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Tool-specific prompts — always pass pre-computed values, never ask Claude to calculate
function buildPrompt(tool: string, data: Record<string, unknown>): string {
  switch (tool) {
    case 'retirement':
      return `You are a Singapore financial advisor writing a short, direct, personalised analysis for a client.

Client data:
- Current age: ${data.currentAge ?? 'unknown'}
- Retirement age target: ${data.retirementAge}
- Years to retirement: ${data.yearsToRetirement}
- Projected corpus at retirement: S$${Number(data.projectedCorpus).toLocaleString('en-SG')}
- Required corpus: S$${Number(data.requiredCorpus).toLocaleString('en-SG')}
- Gap/Surplus: S$${Math.abs(Number(data.gap)).toLocaleString('en-SG')} (${Number(data.gap) <= 0 ? 'SURPLUS' : 'SHORTFALL'})
- On track: ${data.onTrack ? 'Yes' : 'No'}
- Monthly investment: S$${data.monthlyInvestment}
- Monthly income: S$${data.monthlyIncome}
- Income replacement rate at retirement: ${data.replacementRate !== null ? `${data.replacementRate}%` : 'unknown'}
- CPF Life estimated payout: S$${Number(data.cpfMonthlyPayout).toLocaleString('en-SG')}/month from age 65
- Corpus depletes at age: ${data.depletionAge ?? '90+ (no depletion)'}
- To close gap, need monthly investment of: S$${data.trinityPMT}
- Earliest feasible retirement age at current savings: ${data.trinityAge}
- Return rate needed to hit goal: ${data.trinityReturn}% p.a.
- Assumed portfolio return: ${data.annualRate}% p.a.
- Safe withdrawal rate: ${data.swr}%

Write 3 concise sentences in plain Singapore English:
1. State what their retirement picture looks like — reference the income replacement rate and whether corpus lasts long enough
2. Name the single most important lever they can pull right now
3. End with one specific, actionable number (e.g. "Increasing monthly investment by S$X closes the gap entirely")

Do not use headers, bullet points, asterisks, or markdown. Write as a human advisor speaking directly to the client. Be warm but honest.`

    case 'stress-test':
      return `You are a Singapore financial advisor writing a short, personalised stress test analysis.

Client scenario: ${data.scenario}
Runway: ${data.runway === null ? 'indefinitely (no depletion within 50 years)' : `${data.runway} years before savings depleted`}
Current liquid savings: S$${Number(data.liquidSavings).toLocaleString('en-SG')}
Monthly expenses: S$${Number(data.monthlyExpenses).toLocaleString('en-SG')}
${data.scenario === 'tpd' ? `CareShield offset: S$662/month` : ''}

Write 3 concise sentences in plain Singapore English:
1. Interpret the runway result — what does it mean for this client's real life?
2. Name the key vulnerability in their current position (e.g. thin emergency fund, no CI coverage, high expense-to-income ratio)
3. Give one specific action that would materially extend their runway

No headers, no bullets, no markdown formatting. Warm but honest tone. Speak directly to the client.`

    case 'cost-of-waiting':
      return `You are a Singapore financial advisor writing a short analysis about the cost of investment delay.

Client data:
- Current age: ${data.currentAge}
- Required monthly investment starting now: S$${Number(data.pmtNow).toLocaleString('en-SG')}
- Required monthly investment if delayed ${data.delay} years: S$${Number(data.pmtDelayed).toLocaleString('en-SG')}
- Extra monthly cost of delay: S$${Number(data.delta).toLocaleString('en-SG')}
- Target retirement corpus: S$${Number(data.targetCorpus).toLocaleString('en-SG')}

Write 2 concise sentences in plain Singapore English:
1. Make the cost of delay visceral and real — translate the monthly delta into an annual figure or 10-year figure
2. End with a direct call to action — one sentence, first person ("Starting today, even S$X per month puts you...").

No headers, no bullets, no markdown. Direct and emotionally honest. This tool should create urgency.`

    case 'cashflow':
      return `You are a Singapore financial advisor reviewing a client's cash flow.

Client data:
- Monthly income: S$${data.monthlyIncome}
- Monthly expenses: S$${data.monthlyExpenses}
- Monthly surplus: S$${Number(data.surplus).toLocaleString('en-SG')}
- Savings rate: ${Number(data.savingsRate).toFixed(1)}%
- Largest expense category: ${data.largestCategory} (${data.largestPct}% of expenses)

Write 2 sentences:
1. Assess their cash flow health honestly — savings rate versus Singapore context
2. Name the single highest-impact change they could make (e.g. "Reducing your ${data.largestCategory} spend by 15% would free up S$X/month")

No markdown. Warm, specific, actionable.`

    case 'health-score':
      return `You are a Singapore financial advisor reviewing a client's financial health score.

Client data:
- Overall health score: ${data.score} / 100 (${data.threshold})
- Protection: ${data.protection} / 30
- Retirement: ${data.retirement} / 25
- Liquidity: ${data.liquidity} / 20
- Debt Management: ${data.debt} / 15
- Investment: ${data.investment} / 10

Write 3 concise sentences in plain Singapore English:
1. Interpret the overall score honestly — what does ${data.score}/100 mean for this client's financial life?
2. Name their single weakest dimension and why it matters most right now
3. Give one concrete action they can take this month to move the needle

No headers, no bullets, no markdown. Warm, direct, specific. Speak as an advisor who knows them.`

    case 'cpf':
      return `You are a Singapore financial advisor reviewing a client's CPF projection.

Client data:
- Years to retirement: ${data.yearsToRetirement}
- Retirement age target: ${data.retirementAge}
- Projected CPF Life payout: S$${Number(data.cpfLifeMonthly).toLocaleString('en-SG')}/month
- Inflation-adjusted desired income: S$${Number(data.adjDesiredMonthly).toLocaleString('en-SG')}/month
- CPF Life coverage of desired income: ${Number(data.coveragePct).toFixed(1)}%
- RA balance at retirement: S$${Number(data.raAtRetirement).toLocaleString('en-SG')}
- Annual SA top-up modelled: S$${Number(data.annualTopup).toLocaleString('en-SG')}
- Monthly payout delta from top-up: S$${Number(data.topupDeltaPerMonth).toLocaleString('en-SG')}

Write 3 concise sentences in plain Singapore English:
1. Assess whether CPF alone will cover their retirement needs — be honest about the gap
2. If a top-up is modelled (annualTopup > 0), explain the value clearly. If not, explain whether topping up is worth considering.
3. Name the most impactful CPF move they can make (RSTU, OA-to-SA transfer, housing OA preservation, or Retirement Sum selection)

No headers, no bullets, no markdown. Precise, warm, Singapore-specific.`

    case 'insurance':
      return `You are a Singapore financial advisor reviewing a client's protection coverage.

Client data:
- Protection score: ${data.score} / 100
- Annual income: S$${Number(data.annualIncome).toLocaleString('en-SG')}
- Total coverage: S$${Number(data.totalCoverage).toLocaleString('en-SG')}
- Coverage multiple: ${Number(data.coverageMultiple).toFixed(1)}× income (LIA benchmark: 9×)
- Has critical illness coverage: ${data.hasCI ? 'Yes' : 'No'}
- Has hospitalisation coverage: ${data.hasHospitalisation ? 'Yes' : 'No'}
- Monthly expenses: S$${Number(data.monthlyExpenses).toLocaleString('en-SG')}
- Liquid savings: S$${Number(data.liquidSavings).toLocaleString('en-SG')}

Write 3 concise sentences in plain Singapore English:
1. State the client's protection picture plainly — are they adequately covered, under-covered, or over-insured?
2. Name the single most important gap (usually CI coverage, or coverage multiple below 9×)
3. Give one specific, actionable recommendation (e.g. "Adding S$X of CI coverage would bring your multiple to 9×")

No headers, no bullets, no markdown. Direct and honest. Do not recommend specific insurers or products.`

    default:
      return `You are a Singapore financial advisor. Write 2-3 sentences of concise, personalised financial insight based on: ${JSON.stringify(data)}. No markdown, no bullets. Plain English.`
  }
}

export async function POST(request: NextRequest) {
  // Verify auth
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Check API key
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI_KEY_MISSING' }, { status: 503 })
  }

  const { tool, data } = await request.json()
  if (!tool || !data) {
    return NextResponse.json({ error: 'Missing tool or data' }, { status: 400 })
  }

  const prompt = buildPrompt(tool, data)

  // Stream from Claude
  const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      stream: true,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!anthropicResponse.ok) {
    const err = await anthropicResponse.text()
    return NextResponse.json({ error: `Claude API error: ${err}` }, { status: 502 })
  }

  // Proxy the stream back to the client
  return new NextResponse(anthropicResponse.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
