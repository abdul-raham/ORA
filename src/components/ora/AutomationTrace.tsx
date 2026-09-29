import { motion, useReducedMotion } from 'motion/react'
import { formatDay, formatIsoTime, toWall } from '../../lib/time'
import type { AppointmentEvent, EventStatus } from '../../lib/types'

// Visible trail of what ORA handled without reception. Simulated external
// deliveries are labelled as such — never presented as really sent.

const GLYPH: Record<EventStatus, { label: string; className: string }> = {
  done: { label: 'Done', className: 'bg-clinic border-clinic' },
  scheduled: { label: 'Scheduled', className: 'bg-transparent border-steel' },
  simulated: { label: 'Demo · not sent', className: 'bg-transparent border-clinic border-dashed' },
  attention: { label: 'Needs a person', className: 'bg-alert border-alert' },
}

export default function AutomationTrace({
  events,
  title = 'Automation trace',
  showPatient,
  limit,
}: {
  events: (AppointmentEvent & { patientName?: string })[]
  title?: string
  showPatient?: boolean
  limit?: number
}) {
  const reduce = useReducedMotion()
  const list = limit ? events.slice(0, limit) : events
  return (
    <section aria-label={title}>
      <p className="label mb-4">{title}</p>
      {list.length === 0 ? (
        <p className="text-sm text-muted">No events yet.</p>
      ) : (
        <ol className="relative">
          <span className="absolute bottom-3 left-[5px] top-3 w-px bg-steel-2" aria-hidden />
          {list.map((e, i) => {
            const g = GLYPH[e.status]
            const when = e.status === 'scheduled' && e.scheduled_for ? e.scheduled_for : e.completed_at ?? e.created_at
            const w = toWall(when)
            return (
              <motion.li
                key={e.id}
                initial={reduce ? false : { opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i, 8) * 0.06 }}
                className="relative grid grid-cols-[11px_1fr] gap-4 py-2.5"
              >
                <span className={`relative z-10 mt-1.5 size-[11px] rounded-full border ${g.className}`} aria-hidden />
                <span>
                  <span className="block text-sm leading-snug">
                    {showPatient && e.patientName && <span className="font-medium">{e.patientName} · </span>}
                    {e.label}
                  </span>
                  <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                    {g.label} · {e.status === 'scheduled' ? 'for ' : ''}
                    {formatDay(w.date)} {formatIsoTime(when)}
                  </span>
                </span>
              </motion.li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
