import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string
  sub?: string
  accent?: 'blue' | 'green' | 'orange' | 'purple'
}

const accents = {
  blue: 'border-blue-500 bg-blue-50',
  green: 'border-green-500 bg-green-50',
  orange: 'border-orange-500 bg-orange-50',
  purple: 'border-purple-500 bg-purple-50',
}

const valueColors = {
  blue: 'text-blue-700',
  green: 'text-green-700',
  orange: 'text-orange-700',
  purple: 'text-purple-700',
}

export default function StatCard({ label, value, sub, accent = 'blue' }: StatCardProps) {
  return (
    <div className={cn('rounded-xl border-l-4 p-5 shadow-sm', accents[accent])}>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className={cn('text-2xl font-bold mt-1', valueColors[accent])}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}
