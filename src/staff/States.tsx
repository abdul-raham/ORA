import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

// Loading and empty states that match what is coming, rather than one spinner
// or one illustration for everything.

const Bar = ({ w, h = 10, className = '' }: { w: string; h?: number; className?: string }) => (
  <span className={`relative block overflow-hidden bg-bone ${className}`} style={{ width: w, height: h }}>
    <span className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-ivory to-transparent" style={{ animation: 'sweep-x 1.5s infinite' }} />
  </span>
)

export function TodaySkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading today" className="space-y-14">
      <div className="space-y-4">
        <Bar w="180px" h={9} />
        <Bar w="72%" h={44} />
        <Bar w="48%" h={44} />
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="grid grid-cols-[108px_1fr] items-center gap-4">
            <Bar w="80px" h={18} />
            <div className="relative h-[72px] border-y border-bone">
              {[8, 30, 55, 76].map((l, k) => (
                <span key={k} className="absolute top-2" style={{ left: `${l}%`, width: `${10 + ((i + k) % 3) * 4}%` }}>
                  <Bar w="100%" h={56} />
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function GridSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading bookings" className="border-t border-bone">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="grid grid-cols-[24px_90px_1.3fr_1fr_1fr_110px] items-center gap-4 border-b border-bone py-4">
          <Bar w="14px" h={14} />
          <Bar w="60px" />
          <Bar w={`${60 + (i % 3) * 12}%`} />
          <Bar w="70%" />
          <Bar w="55%" />
          <Bar w="70px" />
        </div>
      ))}
    </div>
  )
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-busy="true" className="space-y-4">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-bone pb-4">
          <span className="size-9 rounded-full bg-bone" />
          <div className="flex-1 space-y-2">
            <Bar w={`${40 + (i % 4) * 10}%`} />
            <Bar w="25%" h={8} />
          </div>
        </div>
      ))}
    </div>
  )
}

type EmptyKind = 'first-use' | 'no-results' | 'filtered' | 'error' | 'offline' | 'done' | 'restricted'

const MARKS: Record<EmptyKind, ReactNode> = {
  'first-use': <path d="M10 40 C12 8, 52 8, 54 40" />,
  'no-results': <path d="M10 40 C12 8, 52 8, 54 40 M24 26 h16" />,
  filtered: <path d="M10 14 h44 M18 26 h28 M26 38 h12" />,
  error: <path d="M10 40 C12 8, 52 8, 54 40 M32 18 v12 M32 35 v1" />,
  offline: <path d="M10 40 C12 8, 52 8, 54 40 M8 8 L56 44" />,
  done: <path d="M10 40 C12 8, 52 8, 54 40 M22 26 l7 7 l13 -14" />,
  restricted: <path d="M10 40 C12 8, 52 8, 54 40 M24 24 h16 v14 h-16 z M27 24 v-4 a5 5 0 0 1 10 0 v4" />,
}

export function EmptyState({ kind, title, body, action }: { kind: EmptyKind; title: string; body?: string; action?: ReactNode }) {
  const reduce = useReducedMotion()
  return (
    <div className="grid place-items-center border-y border-bone px-4 py-16 text-center" role={kind === 'error' ? 'alert' : undefined}>
      <svg viewBox="0 0 64 48" className="mb-6 h-12 w-16" fill="none" stroke={kind === 'error' || kind === 'offline' ? 'var(--color-alert)' : 'var(--color-graphite)'} strokeWidth={1.2} aria-hidden>
        <motion.g initial={reduce ? false : { pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 0.9 }}>
          {MARKS[kind]}
        </motion.g>
      </svg>
      <p className="font-display text-2xl">{title}</p>
      {body && <p className="mt-2 max-w-[420px] text-sm text-muted">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

/** Priority-ordered entrance: each section arrives after the one before it. */
export function Orchestra({ index, children, className = '' }: { index: number; children: ReactNode; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.section
      className={className}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.14, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.section>
  )
}
