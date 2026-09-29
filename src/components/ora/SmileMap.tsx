import { motion } from 'motion/react'
import { bandPath, pointAt, type Curve } from '../../lib/arch'
import type { Region } from '../../lib/types'
import { REGION_LABELS } from '../../data/routingRules'

// Simplified upper and lower arches split into general regions. It exists to
// prepare the right visit, never to pinpoint or diagnose a tooth. Shown as in a
// mirror: the patient's right is on the right of the screen.

const UPPER: Curve = [
  [90, 150],
  [96, 22],
  [324, 22],
  [330, 150],
]
const LOWER: Curve = [
  [90, 186],
  [96, 314],
  [324, 314],
  [330, 186],
]

// Along each curve t runs screen-left → screen-right, i.e. patient's left → right.
const SEGMENTS: { region: Region; curve: Curve; t: [number, number] }[] = [
  { region: 'upper-left', curve: UPPER, t: [0, 0.3] },
  { region: 'upper-front', curve: UPPER, t: [0.33, 0.67] },
  { region: 'upper-right', curve: UPPER, t: [0.7, 1] },
  { region: 'lower-left', curve: LOWER, t: [0, 0.3] },
  { region: 'lower-front', curve: LOWER, t: [0.33, 0.67] },
  { region: 'lower-right', curve: LOWER, t: [0.7, 1] },
]

export default function SmileMap({ value, onChange }: { value?: string; onChange: (r: Region) => void }) {
  return (
    <div className="grid items-center gap-6 md:grid-cols-[minmax(0,420px)_1fr]">
      <div role="radiogroup" aria-label="General area" className="relative">
        <svg viewBox="0 0 420 336" className="w-full">
          <text x={20} y={170} className="label" style={{ fontSize: 10 }} fill="var(--color-muted)">
            YOUR LEFT
          </text>
          <text x={400} y={170} textAnchor="end" className="label" style={{ fontSize: 10 }} fill="var(--color-muted)">
            YOUR RIGHT
          </text>
          <line x1={120} y1={168} x2={300} y2={168} stroke="var(--color-steel-2)" strokeDasharray="2 5" />
          {SEGMENTS.map((s) => {
            const on = value === s.region
            const [lx, ly] = pointAt(s.curve, (s.t[0] + s.t[1]) / 2)
            const ticks = [0.25, 0.5, 0.75].map((k) => s.t[0] + (s.t[1] - s.t[0]) * k)
            return (
              <g
                key={s.region}
                role="radio"
                aria-checked={on}
                aria-label={REGION_LABELS[s.region]}
                tabIndex={0}
                onClick={() => onChange(s.region)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onChange(s.region)
                  }
                }}
                className="group cursor-pointer outline-none"
              >
                <motion.path
                  d={bandPath(s.curve, s.t[0], s.t[1], 34, 0.35)}
                  initial={false}
                  animate={{
                    fill: on ? 'var(--color-clinic-soft)' : 'var(--color-ivory)',
                    stroke: on ? 'var(--color-clinic)' : 'var(--color-steel)',
                  }}
                  strokeWidth={on ? 1.4 : 0.9}
                  className="transition-[filter] group-hover:brightness-[0.97] group-focus-visible:[stroke:var(--color-clinic)]"
                />
                {ticks.map((t) => {
                  const [x, y] = pointAt(s.curve, t)
                  return <circle key={t} cx={x} cy={y} r={1} fill={on ? 'var(--color-clinic)' : 'var(--color-steel)'} />
                })}
                {on && (
                  <circle cx={lx} cy={ly} r={16} fill="none" stroke="var(--color-clinic)" strokeWidth={1} className="scan-pulse" />
                )}
              </g>
            )
          })}
        </svg>
      </div>
      <div className="space-y-4">
        <p className="label">Shown as in a mirror</p>
        <p className="text-graphite">
          {value ? (
            <>
              Noted: <span className="font-display text-xl text-charcoal">{REGION_LABELS[value as Region]}</span>.
            </>
          ) : (
            'Tap the general area. You don’t need to know which tooth.'
          )}
        </p>
        <button
          type="button"
          onClick={() => onChange('unsure')}
          aria-pressed={value === 'unsure'}
          className={`btn-quiet ${value === 'unsure' ? '!border-clinic !text-clinic-deep' : ''}`}
        >
          Not sure / more than one place
        </button>
      </div>
    </div>
  )
}
