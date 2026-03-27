import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

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

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI_KEY_MISSING' }, { status: 503 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Extract text from PDF (dynamic import avoids pdf-parse test file issue)
    const pdfParse = (await import('pdf-parse')).default
    const pdfData = await pdfParse(buffer)
    const pdfText = pdfData.text

    if (!pdfText || pdfText.trim().length < 100) {
      return NextResponse.json({
        error: 'Could not extract text from PDF. Ensure this is a text-based PDF, not a scanned image.'
      }, { status: 422 })
    }

    // Send extracted text to Claude
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are an insurance policy document analyser for a Singapore financial adviser.

Extract the following from this insurance policy document and return ONLY valid JSON, no other text:

{
  "policy_name": "string",
  "insurer": "string",
  "benefit_type": "death|tpd|eci|aci|hospitalisation|personal_accident|careshield|endowment|ilp|multi_pay_ci",
  "coverage": number (SGD amount, numbers only),
  "payout_mode": "lump_sum|monthly|multi_pay",
  "expiry_age": number or null,
  "annual_premium": number or null,
  "key_exclusions": ["string"],
  "how_to_claim": "string",
  "special_conditions": "string",
  "confidence_score": number (0-100)
}

If you cannot determine a field, use null. Do not hallucinate values.

Policy document:
${pdfText.substring(0, 8000)}`
      }]
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)

    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI could not parse policy structure' }, { status: 422 })
    }

    const extracted = JSON.parse(jsonMatch[0])
    return NextResponse.json({ extracted, raw_preview: pdfText.substring(0, 300) })

  } catch (error) {
    console.error('Insurance scan error:', error)
    return NextResponse.json({ error: 'Failed to process PDF' }, { status: 500 })
  }
}
