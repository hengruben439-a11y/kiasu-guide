import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn(className)} style={{
      background: 'rgba(122,28,46,0.06)',
      border: '1px solid rgba(196,168,130,0.15)',
      borderRadius: 16,
      backdropFilter: 'blur(12px)',
    }}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: CardProps) {
  return (
    <div className={cn(className)} style={{
      padding: '20px 24px',
      borderBottom: '1px solid rgba(196,168,130,0.08)',
    }}>
      {children}
    </div>
  )
}

export function CardBody({ children, className }: CardProps) {
  return (
    <div className={cn(className)} style={{ padding: '20px 24px' }}>
      {children}
    </div>
  )
}
