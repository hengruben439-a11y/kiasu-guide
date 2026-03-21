import { SkeletonCard, SkeletonStat, SkeletonText } from '@/components/ui/Skeleton'

function TableRowSkeleton() {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '2fr 1.2fr 1.2fr 1.2fr 1fr',
      gap: 12,
      padding: '14px 20px',
      borderBottom: '1px solid rgba(42,31,26,0.05)',
      alignItems: 'center',
    }}>
      <SkeletonText width="70%" style={{ height: 13 }} />
      <SkeletonText width="60%" style={{ height: 13 }} />
      <SkeletonText width="55%" style={{ height: 13 }} />
      <SkeletonText width="65%" style={{ height: 13 }} />
      <SkeletonCard height={26} style={{ borderRadius: 20, width: 80 }} />
    </div>
  )
}

export default function AdminLoading() {
  return (
    <div style={{ padding: '40px 48px', fontFamily: "'Cabinet Grotesk', sans-serif", maxWidth: 1200 }}>

      {/* Header row */}
      <div style={{ marginBottom: 36 }}>
        <SkeletonText width={180} style={{ height: 10, marginBottom: 12 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <SkeletonText width={220} style={{ height: 30, borderRadius: 6 }} />
          <SkeletonCard height={40} style={{ borderRadius: 10, width: 160 }} />
        </div>
      </div>

      {/* 4 stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 36 }}>
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
      </div>

      {/* Table */}
      <div style={{
        background: '#fff',
        border: '1px solid rgba(42,31,26,0.07)',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(42,31,26,0.04)',
      }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1.2fr 1.2fr 1.2fr 1fr',
          gap: 12,
          padding: '12px 20px',
          background: 'rgba(42,31,26,0.03)',
          borderBottom: '1px solid rgba(42,31,26,0.07)',
        }}>
          {['Name', 'Status', 'Income', 'Savings', ''].map((_, i) => (
            <SkeletonText key={i} width="50%" style={{ height: 10 }} />
          ))}
        </div>

        {/* 5 row skeletons */}
        {Array.from({ length: 5 }).map((_, i) => (
          <TableRowSkeleton key={i} />
        ))}
      </div>

    </div>
  )
}
