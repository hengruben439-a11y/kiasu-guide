'use client'

import { CSSProperties } from 'react'

const KEYFRAME_STYLE = `
@keyframes kiasu-shimmer {
  0%   { background-color: rgba(42,31,26,0.06); }
  50%  { background-color: rgba(42,31,26,0.12); }
  100% { background-color: rgba(42,31,26,0.06); }
}
`

let styleInjected = false

function injectStyle() {
  if (styleInjected || typeof document === 'undefined') return
  const tag = document.createElement('style')
  tag.textContent = KEYFRAME_STYLE
  document.head.appendChild(tag)
  styleInjected = true
}

// ── Base Skeleton ──────────────────────────────────────────────────────────────

interface SkeletonProps {
  width?: string | number
  height?: string | number
  borderRadius?: number
  style?: CSSProperties
}

export default function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  if (typeof document !== 'undefined') injectStyle()

  return (
    <>
      <style>{KEYFRAME_STYLE}</style>
      <div
        style={{
          width,
          height,
          borderRadius,
          animation: 'kiasu-shimmer 1.6s ease-in-out infinite',
          display: 'block',
          ...style,
        }}
      />
    </>
  )
}

// ── SkeletonCard ───────────────────────────────────────────────────────────────

interface SkeletonCardProps {
  height?: number | string
  style?: CSSProperties
}

export function SkeletonCard({ height = 120, style }: SkeletonCardProps) {
  return (
    <Skeleton
      width="100%"
      height={height}
      borderRadius={12}
      style={style}
    />
  )
}

// ── SkeletonText ───────────────────────────────────────────────────────────────

interface SkeletonTextProps {
  width?: string | number
  style?: CSSProperties
}

export function SkeletonText({ width = '100%', style }: SkeletonTextProps) {
  return (
    <Skeleton
      width={width}
      height={14}
      borderRadius={4}
      style={style}
    />
  )
}

// ── SkeletonStat ───────────────────────────────────────────────────────────────

export function SkeletonStat() {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid rgba(42,31,26,0.07)',
      borderRadius: 12,
      padding: '18px 20px',
      boxShadow: '0 2px 8px rgba(42,31,26,0.04)',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      {/* label line */}
      <Skeleton width="55%" height={10} borderRadius={4} />
      {/* big number */}
      <Skeleton width="70%" height={28} borderRadius={6} />
      {/* sub line */}
      <Skeleton width="40%" height={10} borderRadius={4} />
    </div>
  )
}
