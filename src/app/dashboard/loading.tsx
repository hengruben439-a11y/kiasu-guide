import { SkeletonCard, SkeletonStat, SkeletonText } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div style={{ padding: '40px 48px', fontFamily: "'Cabinet Grotesk', sans-serif", maxWidth: 1100 }}>

      {/* Greeting skeleton */}
      <div style={{ marginBottom: 36 }}>
        <SkeletonText width={120} style={{ marginBottom: 12 }} />
        <SkeletonText width={280} style={{ height: 36, borderRadius: 6 }} />
      </div>

      {/* Quote card skeleton */}
      <div style={{ marginBottom: 36 }}>
        <SkeletonCard height={88} />
      </div>

      {/* Stat cards — 4 in a row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 40 }}>
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
      </div>

      {/* Tool grid label */}
      <SkeletonText width={140} style={{ marginBottom: 16 }} />

      {/* Tool grid — 3×3 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <SkeletonCard key={i} height={120} />
        ))}
      </div>

    </div>
  )
}
