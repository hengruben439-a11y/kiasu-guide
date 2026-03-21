import { SkeletonCard, SkeletonText } from '@/components/ui/Skeleton'

function InputFieldSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <SkeletonText width={130} style={{ height: 11 }} />
      <SkeletonCard height={40} style={{ borderRadius: 8 }} />
    </div>
  )
}

export default function RetirementLoading() {
  return (
    <div style={{ padding: '40px 48px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>

      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <SkeletonText width={140} style={{ height: 10, marginBottom: 10 }} />
        <SkeletonText width={240} style={{ height: 28, borderRadius: 6, marginBottom: 10 }} />
        <SkeletonText width={380} style={{ height: 14 }} />
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
          <SkeletonText width={120} style={{ height: 12 }} />
          <InputFieldSkeleton />
          <InputFieldSkeleton />
          <InputFieldSkeleton />
          <InputFieldSkeleton />
          <InputFieldSkeleton />
          <InputFieldSkeleton />
          <SkeletonCard height={42} style={{ borderRadius: 10 }} />
        </div>

        {/* Right panel — chart skeleton */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Summary stat row */}
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
                <SkeletonText width="75%" style={{ height: 22, borderRadius: 5 }} />
              </div>
            ))}
          </div>

          {/* Chart block */}
          <SkeletonCard height={300} style={{ borderRadius: 14 }} />
        </div>

      </div>
    </div>
  )
}
