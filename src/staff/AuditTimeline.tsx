import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { formatDay, formatIsoTime, relativeDay, toWall, today } from '../lib/time'
import type { AppointmentEvent } from '../lib/types'

// Audit timeline: who changed what, old → new, and when. In stream mode it
// groups events into periods and folds runs of the same automation into one
// expandable line, so hundreds of events stay readable.

export type TraceEvent = AppointmentEvent & { patientName?: string }

export const actorOf = (e: AppointmentEvent) => {
  const a = e.metadata?.actor
  if (typeof a === 'string') return a
  if (e.status === 'simulated' || e.event_type === 'reminder_scheduled' || e.event_type === 'prep_shared') return 'ORA'
  if (e.event_type === 'reschedule_requested') return 'Patient'
  return 'ORA'
}

const when = (e: AppointmentEvent) => e.completed_at ?? e.created_at

function Actor({ name }: { name: string }) {
  const ora = name === 'ORA'
  const initials = ora ? 'O°' : name === 'Patient' ? 'Pt' : name.replace('Dr. ', '').split(' ').map((x) => x[0]).join('')
  return (
    <span
      title={name}
      className={`grid size-7 shrink-0 place-items-center rounded-full border text-[10px] ${ora ? 'border-clinic bg-clinic-soft text-clinic-deep' : name === 'Patient' ? 'border-steel-2 bg-porcelain' : 'border-charcoal bg-charcoal text-ivory'}`}
    >
      {initials}
    </span>
  )
}

function Row({ e, showPatient }: { e: TraceEvent; showPatient?: boolean }) {
  const actor = actorOf(e)
  const from = e.metadata?.from as string | undefined
  const to = e.metadata?.to as string | undefined
  const label = from && to ? e.label.split(' · ')[0] : e.label
  return (
    <div className="grid grid-cols-[28px_1fr_auto] items-start gap-3 py-2.5">
      <Actor name={actor} />
      <div className="min-w-0">
        <p className="text-sm leading-snug">
          <span className="font-medium">{actor}</span> <span className="text-graphite">· {label}</span>
          {showPatient && e.patientName && <span className="text-muted"> — {e.patientName}</span>}
        </p>
        {from && to && (
          <p className="mt-0.5 font-mono text-[11px]">
            <span className="text-muted line-through">{from}</span> <span className="text-clinic-deep">→ {to}</span>
          </p>
        )}
        {e.status === 'simulated' && <p className="label mt-0.5 text-[9px] text-clinic-deep">Demo · not sent</p>}
        {e.status === 'attention' && <p className="label mt-0.5 text-[9px] text-alert">Needs a person</p>}
      </div>
      <span className="font-mono text-[10px] text-muted">{formatIsoTime(when(e))}</span>
    </div>
  )
}

export default function AuditTimeline({ events, compact }: { events: TraceEvent[]; compact?: boolean }) {
  if (compact)
    return (
      <section aria-label="Audit timeline">
        <p className="label mb-2">Audit timeline</p>
        <div className="divide-y divide-bone border-t border-bone">
          {events.map((e) => (
            <Row key={e.id} e={e} />
          ))}
        </div>
      </section>
    )
  return <ActivityStream events={events} />
}

const period = (iso: string) => {
  const w = toWall(iso)
  const t = today()
  if (w.date === t) return w.minutes < 720 ? 'Today · morning' : w.minutes < 1020 ? 'Today · afternoon' : 'Today · evening'
  return relativeDay(w.date) === 'Tomorrow' ? formatDay(w.date, 'long') : w.date > t ? `Scheduled · ${formatDay(w.date, 'long')}` : relativeDay(w.date, 'long')
}

/** Periods, then runs of identical automation folded into one line. */
export function ActivityStream({ events }: { events: TraceEvent[] }) {
  const reduce = useReducedMotion()
  const [open, setOpen] = useState<Set<string>>(new Set())
  const groups: { title: string; items: (TraceEvent | { cluster: TraceEvent[]; key: string })[] }[] = []
  for (const e of events) {
    const title = period(when(e))
    let g = groups[groups.length - 1]
    if (!g || g.title !== title) groups.push((g = { title, items: [] }))
    const prev = g.items[g.items.length - 1]
    const kind = `${e.event_type}-${e.status}-${actorOf(e)}`
    const prevKind = prev && ('cluster' in prev ? `${prev.cluster[0].event_type}-${prev.cluster[0].status}-${actorOf(prev.cluster[0])}` : `${prev.event_type}-${prev.status}-${actorOf(prev)}`)
    if (prev && prevKind === kind && actorOf(e) === 'ORA') {
      if ('cluster' in prev) prev.cluster.push(e)
      else g.items[g.items.length - 1] = { cluster: [prev, e], key: prev.id }
    } else g.items.push(e)
  }

  return (
    <div className="space-y-10">
      {groups.map((g) => (
        <section key={g.title} aria-label={g.title}>
          <p className="label sticky top-16 z-10 mb-2 bg-porcelain/95 py-2 backdrop-blur">{g.title}</p>
          <div className="divide-y divide-bone border-t border-bone">
            {g.items.map((it) =>
              'cluster' in it ? (
                <div key={it.key}>
                  <button
                    className="grid w-full grid-cols-[28px_1fr_auto] items-center gap-3 py-2.5 text-left"
                    aria-expanded={open.has(it.key)}
                    onClick={() => setOpen((s) => {
                      const n = new Set(s)
                      if (n.has(it.key)) n.delete(it.key)
                      else n.add(it.key)
                      return n
                    })}
                  >
                    <Actor name="ORA" />
                    <span className="text-sm">
                      <span className="font-medium">ORA</span>
                      <span className="text-graphite"> · {it.cluster.length}× {it.cluster[0].label.replace(/ for .*$/, '')}</span>
                    </span>
                    <span className="label text-[9.5px]">{open.has(it.key) ? 'Fold' : 'Expand'} ▾</span>
                  </button>
                  <AnimatePresence initial={false}>
                    {open.has(it.key) && (
                      <motion.div
                        initial={reduce ? false : { height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-l border-steel-2 pl-5"
                      >
                        {it.cluster.map((e) => (
                          <Row key={e.id} e={e} showPatient />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Row key={it.id} e={it} showPatient />
              ),
            )}
          </div>
        </section>
      ))}
    </div>
  )
}
