import { SkeletonText, SkeletonCard } from '@/components/ui/Skeleton'

function InputSkeleton({ label = true }: { label?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {label && <SkeletonText width={120} style={{ height: 11 }} />}
      <SkeletonCard height={42} style={{ borderRadius: 8 }} />
    </div>
  )
}

export default function ProfileLoading() {
  return (
    <div style={{ padding: '40px 48px', fontFamily: "'Cabinet Grotesk', sans-serif", maxWidth: 780 }}>

      {/* Page header */}
      <div style={{ marginBottom: 36 }}>
        <SkeletonText width={80} style={{ height: 10, marginBottom: 10 }} />
        <SkeletonText width={220} style={{ height: 28, borderRadius: 6, marginBottom: 10 }} />
        <SkeletonText width={300} style={{ height: 14 }} />
      </div>

      {/* Tab row — 5 tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard
            key={i}
            height={36}
            style={{ width: 110, borderRadius: 20, flex: 'none' }}
          />
        ))}
      </div>

      {/* Active tab panel — input fields */}
      <div style={{
        background: '#fff',
        border: '1px solid rgba(42,31,26,0.07)',
        borderRadius: 14,
        padding: '28px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: 22,
      }}>
        {/* Section label */}
        <SkeletonText width={160} style={{ height: 11 }} />

        {/* 2-column grid of inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 24px' }}>
          <InputSkeleton />
          <InputSkeleton />
          <InputSkeleton />
          <InputSkeleton />
          <InputSkeleton />
          <InputSkeleton />
        </div>

        {/* Divider-ish */}
        <SkeletonText width="100%" style={{ height: 1, borderRadius: 0 }} />

        {/* Another section */}
        <SkeletonText width={140} style={{ height: 11 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 24px' }}>
          <InputSkeleton />
          <InputSkeleton />
          <InputSkeleton />
          <InputSkeleton />
        </div>

        {/* Save button skeleton */}
        <SkeletonCard height={44} style={{ borderRadius: 10, maxWidth: 160 }} />
      </div>
    </div>
  )
}
