import { redirect } from 'next/navigation'

// MPCI logic has been integrated into the Stress Test module
// as the Multi-Pay CI scenario type. This page redirects there.
export default function MPCIPage() {
  redirect('/dashboard/stress-test')
}
