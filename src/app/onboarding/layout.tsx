export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#fdf8f2',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: "'Cabinet Grotesk', sans-serif",
    }}>
      {children}
    </div>
  )
}
