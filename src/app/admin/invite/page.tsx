import InviteClientForm from '@/components/admin/InviteClientForm'

export default function InvitePage() {
  return (
    <div style={{ padding: '40px 48px', fontFamily: "'Cabinet Grotesk', sans-serif", maxWidth: 600 }}>
      <div style={{ marginBottom: 36 }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 8px' }}>
          Client Management
        </p>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: '#2a1f1a', margin: 0, letterSpacing: '-0.02em' }}>
          Invite New Client
        </h1>
        <p style={{ fontSize: 14, color: '#a89070', margin: '8px 0 0' }}>
          Creates a Supabase account and sends the client a login link.
        </p>
      </div>
      <InviteClientForm />
    </div>
  )
}
