import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import AutomationTrace from '../components/ora/AutomationTrace'
import ChairMap from '../components/ora/ChairMap'
import { ErrorState } from '../components/ora/ChairFlow'
import ClinicPulse from '../components/ora/ClinicPulse'
import PatientApproach from '../components/ora/PatientApproach'
import ReceptionCommand, { findExceptions } from '../components/ora/ReceptionCommand'
import { typeById } from '../data/appointmentTypes'
import { chairById, clinicianById } from '../data/clinic'
import { ApiError, getStaffView, moveAppointment, resetDemo, setStatus, statusLabel, type StaffView } from '../lib/api'
import { currentStaff, signOut } from '../lib/auth'
import { subscribe } from '../lib/db/store'
import { findSlots } from '../lib/scheduling/availability'
import { addDays, formatDay, formatIsoTime, formatTime, relativeDay, today, toWall } from '../lib/time'
import type { AppointmentStatus } from '../lib/types'

export default function Staff() {
  const user = currentStaff()
  const navigate = useNavigate()
  const [view, setView] = useState<StaffView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [date, setDate] = useState(today())
  const [mode, setMode] = useState<'map' | 'agenda'>('map')
  const [selected, setSelected] = useState<string | null>(null)

  const refresh = useCallback(() => {
    return getStaffView()
      .then((v) => {
        setView(v)
        setError(null)
      })
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : 'Could not load the studio schedule.'))
  }, [])

  useEffect(() => {
    refresh()
    const unsub = subscribe(refresh)
    const t = window.setInterval(refresh, 60000)
    return () => {
      unsub()
      window.clearInterval(t)
    }
  }, [refresh])

  const exceptions = useMemo(() => (view ? findExceptions(view) : []), [view])
  const todayEvents = useMemo(() => {
    if (!view) return []
    return view.events
      .filter((e) => e.status !== 'attention')
      .map((e) => {
        const a = view.appointments.find((x) => x.id === e.appointment_id)
        return { ...e, patientName: a ? view.patients.get(a.patient_id)?.full_name.split(' ')[0] : undefined }
      })
      .sort((a, b) => (b.completed_at ?? b.created_at).localeCompare(a.completed_at ?? a.created_at))
  }, [view])

  if (!user) return <Navigate to="/staff/login" replace />

  const handledToday = todayEvents.filter((e) => (e.completed_at ?? e.created_at).startsWith(today())).length
  const selectedAppt = view?.appointments.find((a) => a.id === selected) ?? null

  const move = async (id: string, chair: string, start: string, clinician?: string) => {
    try {
      await moveAppointment(id, chair, start, clinician)
      await refresh()
      return null
    } catch (e) {
      return e instanceof ApiError ? e.message : 'Could not move that visit.'
    }
  }

  return (
    <div className="min-h-[100svh]">
      <StaffBar
        user={user}
        date={date}
        setDate={setDate}
        mode={mode}
        setMode={setMode}
        onReset={async () => {
          await resetDemo()
          setSelected(null)
          await refresh()
        }}
        onSignOut={() => {
          signOut()
          navigate('/staff/login')
        }}
      />
      <div className="mx-auto max-w-[1440px] px-4 pb-24 pt-8 md:px-[3%]">
        {error ? (
          <ErrorState message={error} onRetry={refresh} />
        ) : !view ? (
          <p className="label py-20 text-center">Opening the studio…</p>
        ) : (
          <div className="space-y-14">
            <ClinicPulse date={date} view={view} exceptions={exceptions.length} />
            {mode === 'map' ? (
              <ChairMap date={date} view={view} selectedId={selected} onSelect={setSelected} onMove={(id, c, s) => move(id, c, s)} />
            ) : (
              <Agenda date={date} view={view} onSelect={setSelected} />
            )}
            <div className="grid gap-14 xl:grid-cols-[1.5fr_1fr]">
              <PatientApproach date={today()} view={view} onAdvance={(id, s) => setStatus(id, s)} />
              <ReceptionCommand
                view={view}
                exceptions={exceptions}
                handledToday={handledToday}
                onOpen={(a) => {
                  setDate(toWall(a.start_at).date)
                  setSelected(a.id)
                }}
              />
            </div>
            <div className="grid gap-14 border-t border-bone pt-10 lg:grid-cols-[1fr_1.5fr]">
              <EffortRemoved view={view} />
              <AutomationTrace events={todayEvents} title="Automation trace · latest" showPatient limit={10} />
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedAppt && view && (
          <Drawer
            key={selectedAppt.id}
            view={view}
            id={selectedAppt.id}
            onClose={() => setSelected(null)}
            onMove={move}
            onStatus={(s) => setStatus(selectedAppt.id, s)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function StaffBar({
  user,
  date,
  setDate,
  mode,
  setMode,
  onReset,
  onSignOut,
}: {
  user: NonNullable<ReturnType<typeof currentStaff>>
  date: string
  setDate: (d: string) => void
  mode: 'map' | 'agenda'
  setMode: (m: 'map' | 'agenda') => void
  onReset: () => Promise<void>
  onSignOut: () => void
}) {
  const [menu, setMenu] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [outage, setOutage] = useState(() => {
    try {
      return localStorage.getItem('ora.simulateOutage') === '1'
    } catch {
      return false
    }
  })
  const toggleOutage = () => {
    const next = !outage
    setOutage(next)
    try {
      if (next) localStorage.setItem('ora.simulateOutage', '1')
      else localStorage.removeItem('ora.simulateOutage')
    } catch {
      // Storage unavailable — the toggle has no effect.
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-bone bg-porcelain/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 md:px-[3%]">
        <Link to="/staff" className="flex items-baseline gap-2 font-display text-2xl">
          ORA<span className="text-clinic">°</span>
          <span className="label text-[10px]">Studio</span>
        </Link>

        <div className="order-3 flex w-full items-center justify-between gap-4 md:order-none md:w-auto">
          <div className="flex items-center gap-1">
            <button className="grid size-9 place-items-center hover:bg-ivory" aria-label="Previous day" onClick={() => setDate(addDays(date, -1))}>
              ←
            </button>
            <button className="min-w-[140px] px-2 text-center" onClick={() => setDate(today())} title="Jump to today">
              <span className="block font-display text-lg leading-none">{relativeDay(date)}</span>
              <span className="label text-[9px]">{formatDay(date)}</span>
            </button>
            <button className="grid size-9 place-items-center hover:bg-ivory" aria-label="Next day" onClick={() => setDate(addDays(date, 1))}>
              →
            </button>
          </div>
          <div role="tablist" aria-label="Schedule view" className="flex gap-5">
            {(['map', 'agenda'] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={`relative pb-1 font-mono text-[11px] uppercase tracking-[0.14em] ${mode === m ? 'text-charcoal' : 'text-muted'}`}
              >
                {m === 'map' ? 'Chair map' : 'Agenda'}
                {mode === m && <motion.span layoutId="staff-mode" className="absolute inset-x-0 bottom-0 h-px bg-charcoal" />}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <button onClick={() => setMenu((m) => !m)} aria-expanded={menu} className="flex items-center gap-3 text-right">
            <span>
              <span className="block text-sm leading-tight">{user.name}</span>
              <span className="label text-[9px]">{user.role}</span>
            </span>
            <span className="grid size-9 place-items-center rounded-full border border-steel-2 text-xs" aria-hidden>
              {user.name
                .replace('Dr. ', '')
                .split(' ')
                .map((p) => p[0])
                .join('')}
            </span>
          </button>
          <AnimatePresence>
            {menu && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="porcelain-surface absolute right-0 top-12 z-50 w-[290px] p-5"
              >
                <p className="label mb-3">Operations</p>
                {confirmReset ? (
                  <div className="mb-4 border-l-2 border-alert pl-3">
                    <p className="text-sm">Remove every visit created in the demo and restore today's seed schedule?</p>
                    <div className="mt-2 flex gap-4">
                      <button
                        className="btn-quiet !border-alert !text-alert"
                        disabled={resetting}
                        onClick={async () => {
                          setResetting(true)
                          await onReset().catch(() => undefined)
                          setResetting(false)
                          setConfirmReset(false)
                          setMenu(false)
                        }}
                      >
                        {resetting ? 'Resetting…' : 'Reset demo'}
                      </button>
                      <button className="btn-quiet" onClick={() => setConfirmReset(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button className="mb-2 block w-full py-1.5 text-left text-sm hover:text-clinic-deep" onClick={() => setConfirmReset(true)}>
                    Reset demo data…
                  </button>
                )}
                <label className="flex cursor-pointer items-center justify-between py-1.5 text-sm">
                  Simulate backend outage
                  <input type="checkbox" checked={outage} onChange={toggleOutage} className="accent-[var(--color-alert)]" />
                </label>
                <div className="my-3 h-px bg-bone" />
                <Link to="/" className="block py-1.5 text-sm hover:text-clinic-deep">
                  Public site ↗
                </Link>
                <button className="block w-full py-1.5 text-left text-sm hover:text-alert" onClick={onSignOut}>
                  Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}

function Agenda({ date, view, onSelect }: { date: string; view: StaffView; onSelect: (id: string) => void }) {
  const rows = view.appointments.filter((a) => a.start_at.startsWith(date)).sort((a, b) => a.start_at.localeCompare(b.start_at))
  return (
    <section aria-labelledby="agenda-title">
      <p id="agenda-title" className="label mb-4">
        Agenda · {formatDay(date, 'long')}
      </p>
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-y border-steel-2">
              {['Time', 'Patient', 'Visit', 'Clinician', 'Chair', 'Status'].map((h) => (
                <th key={h} scope="col" className="label py-2 pr-4 text-[10px] font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-muted">
                  No visits.
                </td>
              </tr>
            )}
            {rows.map((a) => (
              <tr key={a.id} className={`border-b border-bone ${a.status === 'cancelled' ? 'text-muted line-through' : ''}`}>
                <td className="py-3 pr-4 font-mono">{formatIsoTime(a.start_at)}</td>
                <td className="pr-4">
                  <button className="underline decoration-steel-2 underline-offset-4 hover:decoration-charcoal" onClick={() => onSelect(a.id)}>
                    {view.patients.get(a.patient_id)?.full_name}
                  </button>
                </td>
                <td className="pr-4">{typeById(a.appointment_type_id)?.name}</td>
                <td className="pr-4">{clinicianById(a.clinician_id)?.name}</td>
                <td className="pr-4">{chairById(a.chair_id)?.name}</td>
                <td className="pr-4">{statusLabel(a.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function EffortRemoved({ view }: { view: StaffView }) {
  const t = today()
  const upcoming = view.appointments.filter((a) => a.is_demo || a.start_at >= t)
  const ids = new Set(upcoming.map((a) => a.id))
  const count = (type: string) => view.events.filter((e) => ids.has(e.appointment_id) && e.event_type === type).length
  const online = upcoming.filter((a) => a.source === 'online').length
  const rows = [
    ['Visits routed & booked online', online],
    ['Confirmations prepared', count('confirmation_prepared')],
    ['Reminders scheduled', count('reminder_scheduled')],
    ['Self-service reschedules', view.events.filter((e) => e.event_type === 'rescheduled' && e.label.includes('patient')).length],
  ] as const
  const touches = rows.reduce((n, [, v]) => n + v, 0)
  return (
    <section aria-labelledby="effort-title">
      <p id="effort-title" className="label mb-4">
        Reception effort removed · next 14 days
      </p>
      <p className="display text-[4.5rem]">{touches}</p>
      <p className="mb-6 text-sm text-muted">front-desk touches ORA handled or prepared</p>
      <dl className="border-t border-bone">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between border-b border-bone py-2.5 text-sm">
            <dt className="text-graphite">{k}</dt>
            <dd className="font-mono">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-muted">Messages are prepared, not sent, in this demo.</p>
    </section>
  )
}

const STATUS_FLOW: AppointmentStatus[] = ['booked', 'arrived', 'checked_in', 'in_chair', 'complete']

function Drawer({
  view,
  id,
  onClose,
  onMove,
  onStatus,
}: {
  view: StaffView
  id: string
  onClose: () => void
  onMove: (id: string, chair: string, start: string, clinician?: string) => Promise<string | null>
  onStatus: (s: AppointmentStatus) => Promise<void>
}) {
  const a = view.appointments.find((x) => x.id === id)!
  const p = view.patients.get(a.patient_id)
  const type = typeById(a.appointment_type_id)!
  const w = toWall(a.start_at)
  const [moveMsg, setMoveMsg] = useState<string | null>(null)
  const [moving, setMoving] = useState(false)
  const options = useMemo(
    () =>
      a.status === 'booked'
        ? findSlots({ appointments: view.appointments, timeOff: view.timeOff }, type.id, { fromDate: w.date, days: 1, excludeId: a.id })
        : [],
    [a, view, type.id, w.date],
  )
  const events = view.events.filter((e) => e.appointment_id === a.id).sort((x, y) => y.created_at.localeCompare(x.created_at))

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  return (
    <>
      <motion.div className="fixed inset-0 z-40 bg-charcoal/20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label={`${p?.full_name} visit details`}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 260, damping: 32 }}
        className="fixed inset-y-0 right-0 z-50 w-full max-w-[460px] overflow-y-auto border-l border-bone bg-ivory px-6 pb-10 pt-6"
      >
        <div className="mb-8 flex items-center justify-between">
          <p className="font-mono text-xs tracking-[0.14em]">{a.booking_code}</p>
          <button className="btn-quiet" onClick={onClose} autoFocus>
            Close ✕
          </button>
        </div>
        <p className="label mb-2">{statusLabel(a.status)}</p>
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
            ['Source', a.source === 'online' ? 'Booked online via ORA' : a.source === 'seed' ? 'Seeded' : 'Reception'],
          ].map(([k, v]) => (
            <div key={k} className="grid grid-cols-[90px_1fr] gap-3 border-b border-bone py-2.5 text-sm">
              <dt className="label text-[10px]">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>

        {a.status !== 'cancelled' && a.status !== 'no_show' && (
          <div className="mt-8">
            <p className="label mb-3">Status</p>
            <div className="flex flex-wrap gap-px bg-bone">
              {STATUS_FLOW.map((s) => (
                <button
                  key={s}
                  onClick={() => onStatus(s)}
                  aria-pressed={a.status === s}
                  className={`flex-1 px-2 py-2.5 font-mono text-[10px] uppercase tracking-[0.08em] ${a.status === s ? 'bg-charcoal text-ivory' : 'bg-porcelain hover:bg-ivory'}`}
                >
                  {statusLabel(s)}
                </button>
              ))}
            </div>
          </div>
        )}

        {a.status === 'booked' && (
          <div className="mt-8">
            <p className="label mb-3">Move within {relativeDay(w.date)}</p>
            {options.length === 0 ? (
              <p className="text-sm text-muted">No other feasible windows that day.</p>
            ) : (
              <div className="grid max-h-[180px] grid-cols-4 gap-px overflow-y-auto bg-bone">
                {options.map((s) => (
                  <button
                    key={s.start_at + s.chair_id}
                    disabled={moving}
                    onClick={async () => {
                      setMoving(true)
                      const err = await onMove(a.id, s.chair_id, s.start_at, s.clinician_id)
                      setMoveMsg(err ?? `Moved to ${formatTime(s.startMin)} · ${chairById(s.chair_id)?.name}`)
                      setMoving(false)
                    }}
                    className="bg-porcelain py-2 text-center hover:bg-ivory"
                    title={`${chairById(s.chair_id)?.name} · ${clinicianById(s.clinician_id)?.name}`}
                  >
                    <span className="block font-mono text-sm">{formatTime(s.startMin)}</span>
                    <span className="label text-[8.5px]">{chairById(s.chair_id)?.name.replace('Chair ', 'C')}</span>
                  </button>
                ))}
              </div>
            )}
            {moveMsg && <p className="mt-2 text-sm text-clinic-deep">{moveMsg}</p>}
          </div>
        )}

        <div className="mt-10">
          <AutomationTrace events={events} title="Visit trace" />
        </div>
      </motion.aside>
    </>
  )
}
