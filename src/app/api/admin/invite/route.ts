import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  // Verify the caller is an authenticated admin
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

  const { data: caller } = await supabase
    .from('client_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (caller?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { email, name, pipeline_status } = await request.json()
  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

  // Use service role key to create the user
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ error: 'Server configuration error: missing service role key' }, { status: 500 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Generate a temporary password (client will be forced to set their own via onboarding)
  const tempPassword = `TKG-${Math.random().toString(36).slice(2, 10).toUpperCase()}`

  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true, // Skip email verification
  })

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 })
  }

  // Create their client_profiles row
  const { error: profileError } = await admin
    .from('client_profiles')
    .insert({
      user_id: newUser.user.id,
      preferred_name: name || null,
      role: 'client',
      pipeline_status: pipeline_status ?? 'prospect',
      pdpa_consent: false,
    })

  if (profileError) {
    // Rollback: delete the auth user if profile creation failed
    await admin.auth.admin.deleteUser(newUser.user.id)
    return NextResponse.json({ error: 'Could not create client profile.' }, { status: 500 })
  }

  // Also create legacy profiles row so old queries don't break
  await admin.from('profiles').insert({
    id: newUser.user.id,
    email,
    full_name: name || null,
    role: 'client',
  }).throwOnError()

  return NextResponse.json({ success: true, userId: newUser.user.id })
}
