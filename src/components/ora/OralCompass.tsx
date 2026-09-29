import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { CONCERNS } from '../../data/routingRules'
import type { ConcernId } from '../../lib/types'

// First-step concern selector: five bearings on an arch-shaped instrument.
// A needle follows focus and hover; choosing locks it and moves the patient on.

const R = 230
const CX = 300
const CY = 290
const angleFor = (i: number) => 180 - i * 45 // left → right along the arch

export default function OralCompass({ value, onChoose }: { value: ConcernId | null; onChoose: (id: ConcernId) => void }) {
  const reduce = useReducedMotion()
  const selectedIdx = CONCERNS.findIndex((c) => c.id === value)
  const [focus, setFocus] = useState<number>(selectedIdx >= 0 ? selectedIdx : 2)
  const [locked, setLocked] = useState<number | null>(null)

  const choose = (i: number) => {
    if (locked !== null) return
    setFocus(i)
    setLocked(i)
    window.setTimeout(() => onChoose(CONCERNS[i].id), reduce ? 0 : 420)
  }

  const needle = 90 - angleFor(focus) // rotation from pointing straight up
  const active = CONCERNS[focus]

  return (
    <div>
      {/* Instrument (tablet and up) */}
      <div className="relative mx-auto hidden aspect-[600/340] w-full max-w-[760px] md:block">
        <svg viewBox="0 0 600 340" className="absolute inset-0 size-full" aria-hidden>
          {[0, 1, 2].map((i) => (
            <path
              key={i}
              d={`M ${CX - R + i * 34} ${CY} A ${R - i * 34} ${R - i * 34} 0 0 1 ${CX + R - i * 34} ${CY}`}
              fill="none"
              stroke={i === 0 ? 'var(--color-steel)' : 'var(--color-steel-2)'}
              strokeWidth={i === 0 ? 1 : 0.7}
              strokeDasharray={i === 2 ? '1 5' : undefined}
            />
          ))}
          {Array.from({ length: 37 }, (_, k) => {
            const a = (Math.PI * k) / 36
            const long = k % 9 === 0
            const r0 = R + 6
            const r1 = R + (long ? 16 : 10)
            return (
              <line
                key={k}
                x1={CX - Math.cos(a) * r0}
                y1={CY - Math.sin(a) * r0}
                x2={CX - Math.cos(a) * r1}
                y2={CY - Math.sin(a) * r1}
                stroke="var(--color-steel)"
                strokeWidth={long ? 1 : 0.5}
              />
            )
          })}
          <motion.g
            initial={false}
            animate={{ rotate: needle }}
            transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 140, damping: 16 }}
            style={{ originX: 0.5, originY: 1 }}
          >
            <line x1={CX} y1={CY} x2={CX} y2={CY - R + 26} stroke="var(--color-charcoal)" strokeWidth={1.2} />
            <circle cx={CX} cy={CY - R + 26} r={3} fill="var(--color-clinic)" />
          </motion.g>
          <circle cx={CX} cy={CY} r={7} fill="var(--color-ivory)" stroke="var(--color-charcoal)" strokeWidth={1.2} />
          <circle cx={CX} cy={CY} r={2} fill="var(--color-charcoal)" />
        </svg>

        {CONCERNS.map((c, i) => {
          const a = (angleFor(i) * Math.PI) / 180
          const x = CX + Math.cos(a) * (R + 44)
          const y = CY - Math.sin(a) * (R + 44) + (i === 0 || i === 4 ? 30 : 0)
          const on = focus === i
          return (
            <button
              key={c.id}
              onClick={() => choose(i)}
              onMouseEnter={() => locked === null && setFocus(i)}
              onFocus={() => locked === null && setFocus(i)}
              aria-pressed={value === c.id}
              className="group absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap px-2 py-2 text-center"
              style={{ left: `${(x / 600) * 100}%`, top: `${(y / 340) * 100}%` }}
            >
              <span className={`label block text-[10px] ${on ? 'text-clinic' : ''}`}>{c.index}</span>
              <span
                className={`mt-1 block font-display text-[clamp(1rem,1.7vw,1.35rem)] transition-colors ${on ? 'text-charcoal' : 'text-muted group-hover:text-charcoal'}`}
              >
                {c.label}
              </span>
              {locked === i && (
                <motion.span layoutId="compass-lock" className="mx-auto mt-1 block h-px w-full bg-clinic" />
              )}
            </button>
          )
        })}

        <div className="pointer-events-none absolute inset-x-0 bottom-[3%] text-center" aria-live="polite">
          <p className="mx-auto max-w-[280px] text-[0.95rem] leading-snug text-graphite">{active.line}</p>
        </div>
      </div>

      {/* Stacked bearings (phones) */}
      <ul className="space-y-0 md:hidden">
        {CONCERNS.map((c, i) => (
          <li key={c.id} className="border-b border-bone first:border-t">
            <button
              onClick={() => choose(i)}
              aria-pressed={value === c.id}
              className="flex w-full items-center gap-4 py-5 text-left"
              style={{ paddingLeft: Math.sin((i / 4) * Math.PI) * 18 }}
            >
              <span className={`label w-6 ${locked === i || value === c.id ? 'text-clinic' : ''}`}>{c.index}</span>
              <span className="flex-1">
                <span className="block font-display text-[1.55rem] leading-tight">{c.label}</span>
                <span className="mt-1 block text-sm text-muted">{c.line}</span>
              </span>
              <span aria-hidden className="text-muted">
                →
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
