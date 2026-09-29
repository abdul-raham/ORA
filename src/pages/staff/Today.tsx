import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import AutomationTrace from '../../components/ora/AutomationTrace'
import ChairMap from '../../components/ora/ChairMap'
import ClinicPulse from '../../components/ora/ClinicPulse'
import PatientApproach from '../../components/ora/PatientApproach'
import ReceptionCommand, { findExceptions } from '../../components/ora/ReceptionCommand'
import { typeById } from '../../data/appointmentTypes'
import { chairById, clinicianById } from '../../data/clinic'
import { ApiError, moveAppointment, setStatus, statusLabel, type StaffView } from '../../lib/api'
import { addDays, formatDay, formatIsoTime, relativeDay, today, toWall } from '../../lib/time'
import { EmptyState, Orchestra, TodaySkeleton } from '../../staff/States'
import { useStaff } from '../../staff/StaffContext'

export default function Today() {
  const { view, error, refresh, selectedId, openAppointment, access, awake } = useStaff()
  const [date, setDate] = useState(today())
  const [mode, setMode] = useState<'map' | 'agenda'>('map')

  const exceptions = useMemo(() => (view ? findExceptions(view) : []), [view])
  const trace = useMemo(() => {
    if (!view) return []
    return view.events
      .filter((e) => e.status !== 'attention')
      .map((e) => {
        const a = view.appointments.find((x) => x.id === e.appointment_id)
        return { ...e, patientName: a ? view.patients.get(a.patient_id)?.full_name.split(' ')[0] : undefined }
      })
      .sort((a, b) => (b.completed_at ?? b.created_at).localeCompare(a.completed_at ?? a.created_at))
  }, [view])

  if (error && !view) return <Pad><EmptyState kind="error" title="The studio schedule is unreachable." body={`${error} ORA will keep retrying.`} action={<button className="btn-primary" onClick={() => refresh()}>Try now</button>} /></Pad>
  if (!view) return <Pad><TodaySkeleton /></Pad>

  const handledToday = trace.filter((e) => (e.completed_at ?? e.created_at).startsWith(today())).length
  const move = async (id: string, chair: string, start: string) => {
    if (access('move') !== 'full') return 'Your role can view the schedule but not move visits.'
    try {
      await moveAppointment(id, chair, start)
      await refresh()
      return null
    } catch (e) {
      return e instanceof ApiError ? e.message : 'Could not move that visit.'
    }
  }

  return (
    <Pad>
      <div className="space-y-14">
        <Orchestra index={0}>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-1">
              <button className="grid size-9 place-items-center hover:bg-ivory" aria-label="Previous day" onClick={() => setDate(addDays(date, -1))}>
                ←
              </button>
              <button className="min-w-[150px] px-2 text-center" onClick={() => setDate(today())} title="Jump to today">
                <span className="block font-display text-xl leading-none">{relativeDay(date)}</span>
                <span className="label text-[9px]">{formatDay(date)}</span>
              </button>
              <button className="grid size-9 place-items-center hover:bg-ivory" aria-label="Next day" onClick={() => setDate(addDays(date, 1))}>
                →
              </button>
            </div>
            <div role="tablist" aria-label="Schedule view" className="flex gap-5">
              {(['map', 'agenda'] as const).map((m) => (
                <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`relative pb-1 font-mono text-[11px] uppercase tracking-[0.14em] ${mode === m ? 'text-charcoal' : 'text-muted'}`}>
                  {m === 'map' ? 'Chair map' : 'Agenda'}
                  {mode === m && <motion.span layoutId="today-mode" className="absolute inset-x-0 bottom-0 h-px bg-charcoal" />}
                </button>
              ))}
            </div>
          </div>
          <ClinicPulse date={date} view={view} exceptions={exceptions.length} />
        </Orchestra>
        <Orchestra index={1}>
          {mode === 'map' ? (
            <ChairMap date={date} view={view} selectedId={selectedId} onSelect={openAppointment} onMove={move} />
          ) : (
            <Agenda date={date} view={view} onSelect={openAppointment} />
          )}
        </Orchestra>
        <Orchestra index={2} className="grid gap-14 xl:grid-cols-[1.5fr_1fr]">
          <PatientApproach date={today()} view={view} onAdvance={(id, s) => (access('status') === 'full' ? setStatus(id, s) : undefined)} />
          <ReceptionCommand
            view={view}
            exceptions={awake ? exceptions : []}
            handledToday={handledToday}
            onOpen={(a) => {
              setDate(toWall(a.start_at).date)
              openAppointment(a.id)
            }}
          />
        </Orchestra>
        <Orchestra index={3} className="grid gap-14 border-t border-bone pt-10 lg:grid-cols-[1fr_1.5fr]">
          <EffortRemoved view={view} />
          <AutomationTrace events={trace} title="Automation trace · latest" showPatient limit={10} />
        </Orchestra>
      </div>
    </Pad>
  )
}

const Pad = ({ children }: { children: React.ReactNode }) => <div className="mx-auto max-w-[1400px] px-4 pb-24 pt-8 md:px-6 lg:px-10">{children}</div>

function Agenda({ date, view, onSelect }: { date: string; view: StaffView; onSelect: (id: string) => void }) {
  const rows = view.appointments.filter((a) => a.start_at.startsWith(date)).sort((a, b) => a.start_at.localeCompare(b.start_at))
  if (!rows.length) return <EmptyState kind="first-use" title="No visits on this day." body="Choose another day, or add a booking from the header." />
  return (
    <section aria-label={`Agenda for ${formatDay(date, 'long')}`}>
      <ul className="border-t border-steel-2 md:hidden">
        {rows.map((a) => (
          <li key={a.id} className="border-b border-bone">
            <button onClick={() => onSelect(a.id)} className="grid w-full grid-cols-[56px_1fr] gap-3 py-3 text-left">
              <span className="font-mono text-sm">{formatIsoTime(a.start_at)}</span>
              <span>
                <span className="block">{view.patients.get(a.patient_id)?.full_name}</span>
                <span className="text-sm text-muted">
                  {typeById(a.appointment_type_id)?.short} · {chairById(a.chair_id)?.name} · {statusLabel(a.status)}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <table className="hidden w-full text-left text-sm md:table">
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
    </section>
  )
}

function EffortRemoved({ view }: { view: StaffView }) {
  const t = today()
  const upcoming = view.appointments.filter((a) => a.is_demo || a.start_at >= t)
  const ids = new Set(upcoming.map((a) => a.id))
  const count = (type: string) => view.events.filter((e) => ids.has(e.appointment_id) && e.event_type === type).length
  const rows = [
    ['Visits routed & booked online', upcoming.filter((a) => a.source === 'online').length],
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
