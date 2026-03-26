import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { confirmationEmail } from '@/emails/confirmationEmail'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  // generateLink creates the user and returns a confirmation URL without sending any email
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'signup',
    email,
    password,
    options: { redirectTo: `${siteUrl}/onboarding` },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const confirmationUrl = data.properties.action_link

  const { error: emailError } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'hello@thekiasuguide.com',
    to: email,
    subject: 'Confirm your email — The Kiasu Guide',
    html: confirmationEmail({ confirmationUrl }),
  })

  if (emailError) {
    // User was created but email failed — still usable, surface the warning
    console.error('Resend error:', emailError)
    return NextResponse.json(
      { error: 'Account created but confirmation email failed to send. Contact support.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
