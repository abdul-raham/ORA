import { LayoutGroup, motion, useReducedMotion } from 'motion/react'
import { chairById } from '../../data/clinic'
import { statusLabel, type StaffView } from '../../lib/api'
import { formatIsoTime } from '../../lib/time'
import type { Appointment, AppointmentStatus } from '../../lib/types'

// Today's patients move along an arch of stations. Advancing a patient glides
// their node to the next station and records the change.

const STATIONS: { id: 'arriving' | AppointmentStatus; label: string }[] = [
  { id: 'arriving', label: 'Arriving' },
  { id: 'arrived', label: 'Arrived' },
  { id: 'checked_in', label: 'Checked in' },
  { id: 'in_chair', label: 'In chair' },
  { id: 'complete', label: 'Complete' },
]
const NEXT: Partial<Record<AppointmentStatus | 'arriving', AppointmentStatus>> = {
  arriving: 'arrived',
  arrived: 'checked_in',
  checked_in: 'in_chair',
  in_chair: 'complete',
}

const initials = (name = '') =>
  name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')

export default function PatientApproach({
  date,
  view,
  onAdvance,
}: {
  date: string
  view: StaffView
  onAdvance: (id: string, status: AppointmentStatus) => void
}) {
  const reduce = useReducedMotion()
  const nowMs = Date.now()
  const today = view.appointments.filter((a) => a.start_at.startsWith(date) && a.status !== 'cancelled' && a.status !== 'no_show')
  const station = (a: Appointment): (typeof STATIONS)[number]['id'] | null => {
    if (a.status !== 'booked') return a.status
    const until = Date.parse(a.start_at) - nowMs
    return until < 90 * 60000 && Date.parse(a.end_at) > nowMs ? 'arriving' : null
  }
  const columns = STATIONS.map((s) => ({
    ...s,
    items: today
      .filter((a) => station(a) === s.id)
      .sort((a, b) => (s.id === 'complete' ? b.start_at.localeCompare(a.start_at) : a.start_at.localeCompare(b.start_at))),
  }))

  return (
    <section aria-labelledby="approach-title">
      <p id="approach-title" className="label mb-4">
        Patient approach
      </p>
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div className="relative min-w-[680px]">
          <svg viewBox="0 0 1000 60" preserveAspectRatio="none" className="absolute inset-x-0 top-0 h-[60px] w-full" aria-hidden>
            <path d="M 60 50 C 300 6, 700 6, 940 50" fill="none" stroke="var(--color-steel)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          </svg>
          <LayoutGroup id="approach">
            <ol className="relative grid grid-cols-5">
              {columns.map((c, i) => (
                <li key={c.id} className="px-2 text-center">
                  <div className="flex flex-col items-center" style={{ paddingTop: [36, 14, 6, 14, 36][i] }}>
                    <span className={`size-2.5 rounded-full border ${c.items.length ? 'border-charcoal bg-charcoal' : 'border-steel bg-porcelain'}`} aria-hidden />
                    <span className="label mt-2 text-[9.5px]">{c.label}</span>
                    <span className="font-display text-2xl leading-none">{c.id === 'complete' ? c.items.length : c.items.length}</span>
                  </div>
                  <ul className="mt-4 space-y-2">
                    {c.items.slice(0, c.id === 'complete' ? 3 : 5).map((a) => {
                      const p = view.patients.get(a.patient_id)
                      const next = NEXT[c.id]
                      const late = c.id === 'arriving' && Date.parse(a.start_at) < nowMs - 5 * 60000
                      return (
                        <motion.li key={a.id} layoutId={reduce ? undefined : `ap-${a.id}`} transition={{ type: 'spring', stiffness: 260, damping: 28 }}>
                          <button
                            disabled={!next}
                            onClick={() => next && onAdvance(a.id, next)}
                            aria-label={next ? `Move ${p?.full_name} to ${statusLabel(next)}` : `${p?.full_name}, complete`}
                            className={`group flex w-full items-center gap-2 border bg-ivory px-2 py-1.5 text-left transition-colors enabled:hover:border-charcoal ${late ? 'border-alert' : 'border-bone'} disabled:opacity-60`}
                          >
                            <span
                              className={`grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-medium ${c.id === 'in_chair' ? 'bg-clinic text-ivory' : 'bg-bone text-graphite'}`}
                              aria-hidden
                            >
                              {initials(p?.full_name)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[12.5px] leading-tight">{p?.full_name}</span>
                              <span className={`block font-mono text-[9.5px] uppercase ${late ? 'text-alert' : 'text-muted'}`}>
                                {formatIsoTime(a.start_at)} → {chairById(a.chair_id)?.name.replace('Chair ', 'C')}
                                {late && ' · late'}
                              </span>
                            </span>
                            {next && (
                              <span className="text-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden>
                                →
                              </span>
                            )}
                          </button>
                        </motion.li>
                      )
                    })}
                  </ul>
                </li>
              ))}
            </ol>
          </LayoutGroup>
        </div>
      </div>
      {columns.every((c) => c.items.length === 0) && <p className="mt-4 text-sm text-muted">No patients approaching in the next 90 minutes.</p>}
    </section>
  )
}
