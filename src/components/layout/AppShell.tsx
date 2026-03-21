import Sidebar from './Sidebar'
import { UserRole } from '@/types'

interface AppShellProps {
  children: React.ReactNode
  role: UserRole
  fullName: string | null
  email: string
}

export default function AppShell({ children, role, fullName, email }: AppShellProps) {
  return (
    <div className="flex min-h-screen" style={{ background: '#fdf8f2' }}>
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
        {children}
      </main>
    </div>
  )
}
