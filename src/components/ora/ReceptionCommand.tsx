import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { typeById } from '../../data/appointmentTypes'
import { chairById, clinicianById } from '../../data/clinic'
import { ApiError, reassignClinician, resolveEvent, setStatus, type StaffView } from '../../lib/api'
import { formatIsoTime, relativeDay, toWall } from '../../lib/time'
import type { Appointment } from '../../lib/types'

// Exception-focused reception surface: only what needs a person appears here.

export interface Exception {
  key: string
  kind: 'late' | 'conflict' | 'reschedule' | 'intake'
  appointment: Appointment
  eventId?: string
  detail: string
}

const KIND = {
  late: { label: 'Late patient', tone: 'text-alert' },
  conflict: { label: 'Schedule conflict', tone: 'text-alert' },
  reschedule: { label: 'Reschedule request', tone: 'text-charcoal' },
  intake: { label: 'Unresolved intake', tone: 'text-graphite' },
}

export function findExceptions(view: StaffView): Exception[] {
  const nowMs = Date.now()
  const holds = (a: Appointment) => a.status !== 'cancelled' && a.status !== 'no_show' && a.status !== 'complete'
  const out: Exception[] = []
  for (const a of view.appointments) {
    if (!holds(a)) continue
    const s = Date.parse(a.start_at)
    const e = Date.parse(a.end_at)
    if (a.status === 'booked' && s < nowMs - 5 * 60000 && e > nowMs)
      out.push({ key: `late-${a.id}`, kind: 'late', appointment: a, detail: `Due ${formatIsoTime(a.start_at)} · ${Math.round((nowMs - s) / 60000)} min ago` })
    if (e > nowMs) {
      const off = view.timeOff.find((o) => o.clinician_id === a.clinician_id && Date.parse(o.start_at) < e && s < Date.parse(o.end_at))
      if (off)
        out.push({
          key: `conflict-${a.id}`,
          kind: 'conflict',
          appointment: a,
          detail: `${clinicianById(a.clinician_id)?.name} · ${off.reason.toLowerCase()} ${formatIsoTime(off.start_at)}—${formatIsoTime(off.end_at)}`,
        })
    }
  }
  for (const ev of view.events) {
    if (ev.status !== 'attention') continue
    const a = view.appointments.find((x) => x.id === ev.appointment_id)
    if (!a || !holds(a) || Date.parse(a.end_at) < nowMs) continue
    if (ev.event_type === 'reschedule_requested') out.push({ key: ev.id, kind: 'reschedule', appointment: a, eventId: ev.id, detail: ev.label })
    if (ev.event_type === 'intake_incomplete') out.push({ key: ev.id, kind: 'intake', appointment: a, eventId: ev.id, detail: ev.label })
  }
  const order = { late: 0, conflict: 1, reschedule: 2, intake: 3 }
  return out.sort((x, y) => order[x.kind] - order[y.kind] || x.appointment.start_at.localeCompare(y.appointment.start_at))
}

export default function ReceptionCommand({
  view,
  exceptions,
  handledToday,
  onOpen,
}: {
  view: StaffView
  exceptions: Exception[]
  handledToday: number
  onOpen: (a: Appointment) => void
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key)
    setMessage(null)
    try {
      const r = await fn()
      if (ok) setMessage(typeof r === 'string' ? `${ok} ${r}.` : ok)
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : 'That did not work — try again.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section aria-labelledby="command-title">
      <div className="mb-4 flex items-baseline justify-between">
        <p id="command-title" className="label">
          Reception command
        </p>
        <p className="label text-[10px]">{exceptions.length} open</p>
      </div>
      {message && (
        <p role="status" className="mb-3 border-l-2 border-clinic pl-3 text-sm text-clinic-deep">
          {message}
        </p>
      )}
      {exceptions.length === 0 ? (
        <div className="border-y border-bone py-10 text-center">
          <p className="font-display text-2xl">Nothing needs you.</p>
          <p className="mt-2 text-sm text-muted">ORA handled {handledToday} events today.</p>
        </div>
      ) : (
        <ul className="border-t border-bone">
          <AnimatePresence initial={false}>
            {exceptions.map((x) => {
              const a = x.appointment
              const p = view.patients.get(a.patient_id)
              const k = KIND[x.kind]
              return (
                <motion.li
                  key={x.key}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden border-b border-bone"
                >
                  <div className="py-4">
                    <p className={`label mb-1 text-[10px] ${k.tone}`}>{k.label}</p>
                    <p className="leading-snug">
                      <button className="font-medium underline decoration-steel-2 underline-offset-4 hover:decoration-charcoal" onClick={() => onOpen(a)}>
                        {p?.full_name}
                      </button>{' '}
                      · {typeById(a.appointment_type_id)?.short}, {relativeDay(toWall(a.start_at).date)} {formatIsoTime(a.start_at)}, {chairById(a.chair_id)?.name}
                    </p>
                    <p className="mt-0.5 text-sm text-muted">{x.detail}</p>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                      {x.kind === 'late' && (
                        <>
                          <Action busy={busy === x.key} onClick={() => run(x.key, () => setStatus(a.id, 'arrived'), 'Marked as arrived.')}>
                            Mark arrived
                          </Action>
                          <Action busy={busy === x.key} onClick={() => run(x.key, () => setStatus(a.id, 'no_show'), 'Marked as did not attend.')}>
                            Did not attend
                          </Action>
                        </>
                      )}
                      {x.kind === 'conflict' && (
                        <>
                          <Action busy={busy === x.key} onClick={() => run(x.key, () => reassignClinician(a.id), 'Reassigned to')}>
                            Reassign clinician
                          </Action>
                          <Action onClick={() => onOpen(a)}>Move visit</Action>
                        </>
                      )}
                      {x.kind === 'reschedule' && (
                        <>
                          <Action onClick={() => onOpen(a)}>Open & move</Action>
                          <Action busy={busy === x.key} onClick={() => run(x.key, () => resolveEvent(x.eventId!), 'Marked as handled.')}>
                            Called — keep time
                          </Action>
                        </>
                      )}
                      {x.kind === 'intake' && (
                        <Action busy={busy === x.key} onClick={() => run(x.key, () => resolveEvent(x.eventId!), 'Intake marked as resolved.')}>
                          Mark resolved
                        </Action>
                      )}
                    </div>
                  </div>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}
    </section>
  )
}

function Action({ children, onClick, busy }: { children: React.ReactNode; onClick: () => void; busy?: boolean }) {
  return (
    <button onClick={onClick} disabled={busy} className="btn-quiet !py-1 disabled:opacity-40">
      {children}
    </button>
  )
}
