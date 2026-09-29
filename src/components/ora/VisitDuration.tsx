import { motion, useReducedMotion } from 'motion/react'
import { CLINIC } from '../../data/clinic'
import type { AppointmentType } from '../../lib/types'

// How the visit's time is spent, drawn as a chair-time bar with the reset
// window ORA holds after it.

export default function VisitDuration({ type }: { type: AppointmentType }) {
  const reduce = useReducedMotion()
  const total = type.duration_minutes + CLINIC.turnoverMinutes
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <p className="label">Visit length</p>
        <p className="font-display text-3xl">
          {type.duration_minutes}
          <span className="ml-1 text-base text-muted">min</span>
        </p>
      </div>
      <div className="flex h-12 w-full overflow-hidden border border-steel-2 bg-ivory" role="img" aria-label={type.phases.map((p) => `${p.label} ${p.minutes} minutes`).join(', ')}>
        {type.phases.map((p, i) => (
          <motion.div
            key={p.label}
            initial={reduce ? false : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.25 + i * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex origin-left items-end border-r border-steel-2 px-2 pb-1.5"
            style={{
              width: `${(p.minutes / total) * 100}%`,
              background: i % 2 ? 'var(--color-bone)' : 'linear-gradient(180deg,#fffdf8,#efe9de)',
            }}
          >
            <span className="label truncate text-[9.5px] text-graphite">{p.minutes}′</span>
          </motion.div>
        ))}
        <div
          className="flex items-end px-1.5 pb-1.5"
          style={{
            width: `${(CLINIC.turnoverMinutes / total) * 100}%`,
            background: 'repeating-linear-gradient(135deg, transparent 0 4px, rgba(161,158,150,0.35) 4px 5px)',
          }}
          title="Chair reset"
        />
      </div>
      <ul className="mt-3 grid gap-x-4 gap-y-1 sm:grid-cols-2">
        {type.phases.map((p, i) => (
          <li key={p.label} className="flex items-baseline gap-2 text-sm text-graphite">
            <span className="label text-[10px]">0{i + 1}</span>
            {p.label}
          </li>
        ))}
        <li className="flex items-baseline gap-2 text-sm text-muted">
          <span className="label text-[10px]">+{CLINIC.turnoverMinutes}′</span>
          Chair reset, held by ORA
        </li>
      </ul>
    </div>
  )
}
