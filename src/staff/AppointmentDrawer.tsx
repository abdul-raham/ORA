import { motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { typeById } from '../data/appointmentTypes'
import { chairById, clinicianById } from '../data/clinic'
import { REGION_LABELS, SMILE_GOALS } from '../data/routingRules'
import { ApiError, cancelBooking, moveAppointment, rescheduleBooking, sendReminders, setStatus, statusLabel } from '../lib/api'
import { bestTimes, findSlots } from '../lib/scheduling/availability'
import { formatDay, formatIsoTime, formatTime, relativeDay, toWall } from '../lib/time'
import type { AppointmentStatus, Region } from '../lib/types'
import AuditTimeline from './AuditTimeline'
import { ACCESS_NOTE, type Action, useStaff } from './StaffContext'

// Universal detail drawer for a visit. Controls follow the signed-in role:
// they stay visible but explain themselves when read-only or approval-bound.

const STATUS_FLOW: AppointmentStatus[] = ['booked', 'arrived', 'checked_in', 'in_chair', 'complete']

export function Permit({ action, children }: { action: Action; children: (enabled: boolean) => React.ReactNode }) {
  const { access } = useStaff()
  const a = access(action)
  return (
    <span className="inline-flex flex-col">
      {children(a === 'full')}
      {a !== 'full' && <span className="label mt-1 text-[9px] text-muted">⌀ {ACCESS_NOTE[a]}</span>}
    </span>
  )
}

const answerText = (k: string, v: unknown) => {
  if (k === 'region') return REGION_LABELS[v as Region] ?? String(v)
  if (k === 'goal') return SMILE_GOALS.find((g) => g.id === v)?.label ?? String(v)
  return String(v)
}

export default function AppointmentDrawer() {
  const { view, selectedId, openAppointment, access } = useStaff()
  const a = view?.appointments.find((x) => x.id === selectedId)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && openAppointment(null)
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [openAppointment])

  const w = a ? toWall(a.start_at) : null
  const type = a ? typeById(a.appointment_type_id)! : null
  const snap = useMemo(() => (view ? { appointments: view.appointments, timeOff: view.timeOff } : null), [view])
  const sameDay = useMemo(
    () => (a && snap && type && w && a.status === 'booked' ? findSlots(snap, type.id, { fromDate: w.date, days: 1, excludeId: a.id }) : []),
    [a, snap, type, w],
  )
  const otherDays = useMemo(
    () => (a && snap && type && a.status === 'booked' ? bestTimes(findSlots(snap, type.id, { excludeId: a.id }).filter((s) => s.date !== w?.date), 'soonest', 4) : []),
    [a, snap, type, w],
  )

  if (!a || !view || !type || !w) return null
  const p = view.patients.get(a.patient_id)
  const intake = view.intake.get(a.id)
  const events = view.events.filter((e) => e.appointment_id === a.id).sort((x, y) => y.created_at.localeCompare(x.created_at))
  const active = a.status !== 'cancelled' && a.status !== 'no_show' && a.status !== 'complete'

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true)
    setMsg(null)
    try {
      await fn()
      setMsg({ text: ok, ok: true })
    } catch (e) {
      setMsg({ text: e instanceof ApiError ? e.message : 'That did not work — nothing changed.', ok: false })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <motion.div className="fixed inset-0 z-40 bg-charcoal/20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => openAppointment(null)} />
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label={`${p?.full_name} visit details`}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 260, damping: 32 }}
        className="fixed inset-y-0 right-0 z-50 w-full max-w-[480px] overflow-y-auto border-l border-bone bg-ivory px-6 pb-12 pt-6"
      >
        <div className="mb-8 flex items-center justify-between">
          <Link to={`/manage/${a.booking_code}`} target="_blank" className="font-mono text-xs tracking-[0.14em] hover:text-clinic-deep" title="Open patient CarePass">
            {a.booking_code} ↗
          </Link>
          <button className="btn-quiet" onClick={() => openAppointment(null)} autoFocus>
            Close ✕
          </button>
        </div>
        <p className="label mb-2 flex items-center gap-2">
          <span className={`size-1.5 rounded-full ${a.status === 'cancelled' || a.status === 'no_show' ? 'bg-alert' : a.status === 'in_chair' ? 'bg-clinic' : 'bg-charcoal'}`} />
          {statusLabel(a.status)}
          {a.reschedule_requested && <span className="text-alert">· patient asked to reschedule</span>}
        </p>
        <h2 className="display text-[2.6rem]">{p?.full_name}</h2>
        <p className="mt-2 font-mono text-sm text-graphite">
          {p?.phone}
          {p?.email ? ` · ${p.email}` : ''}
        </p>

        <dl className="mt-8 border-t border-bone">
          {[
            ['Visit', `${type.name} · ${type.duration_minutes} min`],
            ['When', `${formatDay(w.date, 'long')} · ${formatIsoTime(a.start_at)}—${formatIsoTime(a.end_at)}`],
            ['Clinician', clinicianById(a.clinician_id)?.name],
            ['Chair', chairById(a.chair_id)?.name],
            ['Source', a.source === 'online' ? 'Booked online via ORA' : 'Booked by reception'],
          ].map(([k, v]) => (
            <div key={k} className="grid grid-cols-[92px_1fr] gap-3 border-b border-bone py-2.5 text-sm">
              <dt className="label text-[10px]">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>

        {intake && Object.keys(intake.responses_json).length > 0 && (
          <div className="mt-8">
            <p className="label mb-3">Intake · {intake.routing_category} route {intake.complete ? '' : '· incomplete'}</p>
            <dl className="grid grid-cols-2 gap-x-4 text-sm">
              {Object.entries(intake.responses_json)
                .filter(([, v]) => v !== '' && v !== undefined)
                .map(([k, v]) => (
                  <div key={k} className="border-b border-bone py-2">
                    <dt className="label text-[9px]">{k}</dt>
                    <dd className="capitalize">{answerText(k, v)}</dd>
                  </div>
                ))}
            </dl>
          </div>
        )}

        {msg && (
          <p role="status" className={`mt-8 border-l-2 pl-3 text-sm ${msg.ok ? 'border-clinic text-clinic-deep' : 'border-alert text-alert'}`}>
            {msg.text}
          </p>
        )}

        {active && (
          <div className="mt-8">
            <p className="label mb-3">Status</p>
            <Permit action="status">
              {(ok) => (
                <div className="flex flex-wrap gap-px bg-bone">
                  {STATUS_FLOW.map((s) => (
                    <button
                      key={s}
                      disabled={!ok || busy}
                      onClick={() => run(() => setStatus(a.id, s), `Marked ${statusLabel(s).toLowerCase()}.`)}
                      aria-pressed={a.status === s}
                      className={`flex-1 px-2 py-2.5 font-mono text-[10px] uppercase tracking-[0.08em] disabled:cursor-not-allowed ${a.status === s ? 'bg-charcoal text-ivory' : 'bg-porcelain enabled:hover:bg-ivory disabled:text-steel'}`}
                    >
                      {statusLabel(s)}
                    </button>
                  ))}
                </div>
              )}
            </Permit>
          </div>
        )}

        {a.status === 'booked' && (
          <div className="mt-8 space-y-6">
            <div>
              <p className="label mb-3">Move within {relativeDay(w.date)}</p>
              <Permit action="move">
                {(ok) =>
                  sameDay.length === 0 ? (
                    <p className="text-sm text-muted">No other feasible windows that day.</p>
                  ) : (
                    <div className="grid max-h-[150px] grid-cols-4 gap-px overflow-y-auto bg-bone">
                      {sameDay.map((s) => (
                        <button
                          key={s.start_at + s.chair_id}
                          disabled={!ok || busy}
                          onClick={() => run(() => moveAppointment(a.id, s.chair_id, s.start_at, s.clinician_id), `Moved to ${formatTime(s.startMin)} · ${chairById(s.chair_id)?.name}. Patient update prepared.`)}
                          className="bg-porcelain py-2 text-center enabled:hover:bg-ivory disabled:text-steel"
                          title={`${chairById(s.chair_id)?.name} · ${clinicianById(s.clinician_id)?.name}`}
                        >
                          <span className="block font-mono text-sm">{formatTime(s.startMin)}</span>
                          <span className="label text-[8.5px]">{chairById(s.chair_id)?.name.replace('Chair ', 'C')}</span>
                        </button>
                      ))}
                    </div>
                  )
                }
              </Permit>
            </div>
            <div>
              <p className="label mb-3">Or another day</p>
              <Permit action="move">
                {(ok) => (
                  <ul className="border-t border-bone">
                    {otherDays.map((s) => (
                      <li key={s.start_at + s.chair_id} className="flex items-center justify-between border-b border-bone py-2 text-sm">
                        <span>
                          {relativeDay(s.date)} · <span className="font-mono">{formatTime(s.startMin)}</span>
                          <span className="ml-2 text-muted">{chairById(s.chair_id)?.name}</span>
                        </span>
                        <button
                          className="btn-quiet !py-0.5 disabled:opacity-30"
                          disabled={!ok || busy}
                          onClick={() => run(() => rescheduleBooking(a.booking_code, s, 'reception'), `Rescheduled to ${relativeDay(s.date)} ${formatTime(s.startMin)}. Patient update prepared.`)}
                        >
                          Move
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Permit>
            </div>
          </div>
        )}

        {active && (
          <div className="mt-8 flex flex-wrap items-start gap-x-6 gap-y-4 border-t border-bone pt-6">
            <Permit action="remind">
              {(ok) => (
                <button className="btn-quiet disabled:opacity-30" disabled={!ok || busy} onClick={() => run(() => sendReminders([a.id]), 'Reminder prepared (demo — not sent).')}>
                  Prepare reminder
                </button>
              )}
            </Permit>
            <Permit action="cancel">
              {(ok) =>
                confirmCancel ? (
                  <span className="flex items-center gap-3">
                    <button className="btn-quiet !border-alert !text-alert" disabled={busy} onClick={() => run(() => cancelBooking(a.booking_code, 'reception'), 'Cancelled. Chair time released.')}>
                      Confirm cancel
                    </button>
                    <button className="btn-quiet" onClick={() => setConfirmCancel(false)}>
                      Keep
                    </button>
                  </span>
                ) : (
                  <button className="btn-quiet disabled:opacity-30" disabled={!ok || busy} onClick={() => setConfirmCancel(true)}>
                    Cancel visit
                  </button>
                )
              }
            </Permit>
          </div>
        )}
        {access('move') !== 'full' && a.status === 'booked' && <p className="mt-4 text-xs text-muted">Ask reception to move or cancel this visit.</p>}

        <div className="mt-10">
          <AuditTimeline events={events} compact />
        </div>
      </motion.aside>
    </>
  )
}
