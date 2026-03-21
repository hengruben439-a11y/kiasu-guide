import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/layout/AppShell'
import { ClientProfile } from '@/types'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('client_profiles')
    .select('role, preferred_name')
    .eq('user_id', user.id)
    .single<Pick<ClientProfile, 'role' | 'preferred_name'>>()

  if (profile?.role !== 'admin') redirect('/dashboard')

  return (
    <AppShell
      role={profile.role}
      fullName={profile.preferred_name ?? null}
      email={user.email ?? ''}
    >
      {children}
    </AppShell>
  )
}
