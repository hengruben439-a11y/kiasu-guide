import { SkeletonCard, SkeletonText } from '@/components/ui/Skeleton'

function InputFieldSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <SkeletonText width={130} style={{ height: 11 }} />
      <SkeletonCard height={40} style={{ borderRadius: 8 }} />
    </div>
  )
}

export default function StressTestLoading() {
  return (
    <div style={{ padding: '40px 48px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>

      {/* Page header */}
      <div style={{ marginBottom: 36 }}>
        <SkeletonText width={100} style={{ height: 10, marginBottom: 10 }} />
        <SkeletonText width={260} style={{ height: 28, borderRadius: 6, marginBottom: 10 }} />
        <SkeletonText width={420} style={{ height: 14 }} />
      </div>

      {/* Two-panel layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24 }}>

        {/* Left panel — input skeletons */}
        <div style={{
          background: '#fff',
          border: '1px solid rgba(42,31,26,0.07)',
          borderRadius: 14,
          padding: '24px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          alignSelf: 'start',
        }}>
          <SkeletonText width={110} style={{ height: 12 }} />
          <InputFieldSkeleton />
          <InputFieldSkeleton />
          <InputFieldSkeleton />
          <InputFieldSkeleton />
          <InputFieldSkeleton />
          <SkeletonCard height={42} style={{ borderRadius: 10 }} />
        </div>

        {/* Right panel — scenario cards + chart skeleton */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Scenario selector tabs */}
          <div style={{ display: 'flex', gap: 8 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} height={36} style={{ borderRadius: 20, width: 120, flex: 'none' }} />
            ))}
          </div>

          {/* Chart block */}
          <SkeletonCard height={300} style={{ borderRadius: 14 }} />

          {/* Result stat row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{
                background: '#fff',
                border: '1px solid rgba(42,31,26,0.07)',
                borderRadius: 12,
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}>
                <SkeletonText width="60%" style={{ height: 10 }} />
                <SkeletonText width="70%" style={{ height: 22, borderRadius: 5 }} />
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
