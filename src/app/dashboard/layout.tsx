import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/layout/AppShell'
import { ClientProfile } from '@/types'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('client_profiles')
    .select('role, preferred_name, pdpa_consent')
    .eq('user_id', user.id)
    .single<Pick<ClientProfile, 'role' | 'preferred_name' | 'pdpa_consent'>>()

  // Admins go to /admin
  if (profile?.role === 'admin') redirect('/admin')

  // Clients who haven't completed onboarding go to /onboarding
  if (!profile?.pdpa_consent) redirect('/onboarding')

  return (
    <AppShell
      role={profile?.role ?? 'client'}
      fullName={profile?.preferred_name ?? null}
      email={user.email ?? ''}
    >
      {children}
    </AppShell>
  )
}
