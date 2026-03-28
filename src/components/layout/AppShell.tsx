import Sidebar from './Sidebar'
import AnimatedMain from './AnimatedMain'
import { UserRole } from '@/types'

interface AppShellProps {
  children: React.ReactNode
  role: UserRole
  fullName: string | null
  email: string
}

export default function AppShell({ children, role, fullName, email }: AppShellProps) {
  return (
    <div className="flex min-h-screen" style={{ background: '#0a0605' }}>
      <Sidebar role={role} fullName={fullName} email={email} />
      <main
        className="kiasu-main-content"
        style={{
          flex: 1,
          minWidth: 0,
          overflowX: 'hidden',
          overflowY: 'auto',
        }}
      >
        <AnimatedMain>{children}</AnimatedMain>
      </main>
    </div>
  )
}
