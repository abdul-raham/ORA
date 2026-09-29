import { motion, useReducedMotion } from 'motion/react'
import { BOOK_ARCH, angleAt, curveD, normalAt, pointAt, type Curve } from '../../lib/arch'
import { STEPS } from '../../store/visitStore'

// Booking progress drawn as a simplified upper dental arch. Completed nodes are
// filled porcelain forms, the current node carries a scanner ring, and the arch
// turns so the current node leans toward the apex when moving back and forth.

const NODE_T = [0.03, 0.27, 0.5, 0.73, 0.97]

interface GroupProps {
  step: number
  curve?: Curve
  labelSize?: number
  onSelect?: (i: number) => void
  maxReachable?: number
  labels?: boolean
}

export function OcclusionArch({ step, curve = BOOK_ARCH, labelSize = 10, onSelect, maxReachable = step, labels = true }: GroupProps) {
  const reduce = useReducedMotion()
  const progress = NODE_T[Math.min(step, 4)]
  const nodeScale = labelSize / 10

  return (
    <motion.g
      initial={false}
      animate={{ rotate: reduce ? 0 : (2 - step) * 6 }}
      transition={{ type: 'spring', stiffness: 90, damping: 18 }}
      style={{ originX: 0.5, originY: 0.6 }}
    >
      <defs>
        <linearGradient id="occ-porcelain" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fffdf8" />
          <stop offset="1" stopColor="#ddd5c6" />
        </linearGradient>
      </defs>
      {/* Gum line and occlusal hairlines */}
      <path d={curveD(curve)} fill="none" stroke="var(--color-steel-2)" strokeWidth={1} />
      <motion.path
        d={curveD(curve)}
        fill="none"
        stroke="var(--color-charcoal)"
        strokeWidth={1.4}
        initial={false}
        animate={{ pathLength: progress }}
        transition={{ duration: reduce ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
      />
      {NODE_T.map((t, i) => {
        const [x, y] = pointAt(curve, t)
        const [nx, ny] = normalAt(curve, t)
        const rot = angleAt(curve, t)
        const done = i < step
        const current = i === step
        const reachable = i <= maxReachable && i !== step && !!onSelect
        const lx = x + nx * 22 * nodeScale
        const ly = y + ny * 22 * nodeScale
        const anchor = Math.abs(nx) < 0.35 ? 'middle' : nx < 0 ? 'end' : 'start'
        return (
          <g
            key={i}
            role={reachable ? 'button' : undefined}
            tabIndex={reachable ? 0 : undefined}
            aria-label={reachable ? `Return to ${STEPS[i]}` : undefined}
            onClick={reachable ? () => onSelect?.(i) : undefined}
            onKeyDown={reachable ? (e) => (e.key === 'Enter' || e.key === ' ') && onSelect?.(i) : undefined}
            style={{ cursor: reachable ? 'pointer' : 'default' }}
          >
            {current && (
              <circle cx={x} cy={y} r={9 * nodeScale} fill="none" stroke="var(--color-clinic)" strokeWidth={1} className="scan-pulse" />
            )}
            <motion.rect
              x={x - 5 * nodeScale}
              y={y - 7.5 * nodeScale}
              width={10 * nodeScale}
              height={15 * nodeScale}
              rx={4.5 * nodeScale}
              transform={`rotate(${rot + 90} ${x} ${y})`}
              initial={false}
              animate={{
                fill: done ? 'url(#occ-porcelain)' : current ? 'var(--color-ivory)' : 'rgba(0,0,0,0)',
                stroke: done || current ? 'var(--color-charcoal)' : 'var(--color-steel)',
              }}
              strokeWidth={current ? 1.4 : 1}
              transition={{ duration: 0.3 }}
            />
            {current && <circle cx={x} cy={y} r={1.8 * nodeScale} fill="var(--color-clinic)" />}
            {done && <circle cx={x} cy={y} r={1.2 * nodeScale} fill="var(--color-charcoal)" />}
            {labels && <text
              x={lx}
              y={ly}
              textAnchor={anchor}
              dominantBaseline="middle"
              transform={`rotate(${reduce ? 0 : -(2 - step) * 6} ${lx} ${ly})`}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: labelSize,
                letterSpacing: '0.12em',
                fill: current ? 'var(--color-charcoal)' : done ? 'var(--color-graphite)' : 'var(--color-muted)',
                fontWeight: current ? 500 : 400,
                textDecorationLine: reachable ? 'underline' : 'none',
                textDecorationColor: 'var(--color-steel-2)',
              }}
            >
              {STEPS[i].toUpperCase()}
            </text>}
          </g>
        )
      })}
    </motion.g>
  )
}

const STANDALONE: Curve = [
  [96, 150],
  [104, 22],
  [256, 22],
  [264, 150],
]

/** Standalone arch for narrow screens, where the header cannot host it. */
export default function OcclusionPath({ step, onSelect, maxReachable }: Omit<GroupProps, 'curve' | 'labelSize'>) {
  return (
    <nav aria-label="Booking progress" className="mx-auto w-full max-w-[360px]">
      <p className="sr-only" aria-live="polite">
        Step {step + 1} of {STEPS.length}: {STEPS[step]}
      </p>
      <svg viewBox="0 0 360 172" className="w-full" aria-hidden="true">
        <OcclusionArch step={step} curve={STANDALONE} labelSize={9.5} onSelect={onSelect} maxReachable={maxReachable} />
      </svg>
    </nav>
  )
}
