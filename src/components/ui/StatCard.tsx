import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string
  sub?: string
  accent?: 'blue' | 'green' | 'orange' | 'purple'
}

const accents = {
  blue: 'border-blue-400',
  green: 'border-green-500',
  orange: 'border-orange-400',
  purple: 'border-purple-400',
}

const valueColors = {
  blue: 'text-blue-300',
  green: 'text-green-400',
  orange: 'text-orange-300',
  purple: 'text-purple-300',
}

export default function StatCard({ label, value, sub, accent = 'blue' }: StatCardProps) {
  return (
    <div
      className={cn('rounded-xl border-l-4 p-5', accents[accent])}
      style={{
        background: 'rgba(122,28,46,0.06)',
        border: '1px solid rgba(196,168,130,0.15)',
        borderRadius: 16,
        backdropFilter: 'blur(12px)',
      }}
    >
      <p className="text-sm font-medium" style={{ color: 'rgba(253,248,242,0.55)' }}>{label}</p>
      <p className={cn('text-2xl font-bold mt-1', valueColors[accent])}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: 'rgba(253,248,242,0.40)' }}>{sub}</p>}
    </div>
  )
}
