import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { typeById } from '../../data/appointmentTypes'
import { chairById } from '../../data/clinic'
import { statusLabel } from '../../lib/api'
import { formatDay, formatIsoTime, relativeDay, toWall, today } from '../../lib/time'
import { EmptyState, ListSkeleton } from '../../staff/States'
import { useStaff } from '../../staff/StaffContext'

// Patient directory with a visit history for each person.

export default function Patients() {
  const { view, openAppointment, openNewBooking, access } = useStaff()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const selectedId = params.get('id')
  const t = today()

  const list = useMemo(() => {
    if (!view) return []
    const s = q.trim().toLowerCase()
    return [...view.patients.values()]
      .filter((p) => !s || p.full_name.toLowerCase().includes(s) || p.phone.replace(/\s/g, '').includes(s.replace(/\s/g, '')))
      .map((p) => {
        const visits = view.appointments.filter((a) => a.patient_id === p.id).sort((a, b) => a.start_at.localeCompare(b.start_at))
        const next = visits.find((a) => a.start_at.slice(0, 10) >= t && a.status === 'booked')
        return { p, visits, next }
      })
      .sort((a, b) => a.p.full_name.localeCompare(b.p.full_name))
  }, [view, q, t])

  const selected = list.find((x) => x.p.id === selectedId) ?? null

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-24 pt-8 md:px-6 lg:px-10">
      <p className="label mb-3">Patients</p>
      <h1 className="display mb-8 text-[clamp(2.4rem,5vw,4rem)]">People, not rows.</h1>
      <div className="grid gap-10 lg:grid-cols-[380px_1fr]">
        <div className={selected ? 'hidden lg:block' : ''}>
          <input className="field mb-4 !text-base" placeholder="Search name or phone" aria-label="Search patients" value={q} onChange={(e) => setQ(e.target.value)} />
          {!view ? (
            <ListSkeleton />
          ) : list.length === 0 ? (
            <EmptyState kind="no-results" title="No one by that name." body="Try part of a name or a phone number." />
          ) : (
            <ul className="max-h-[70vh] overflow-y-auto border-t border-bone">
              {list.map(({ p, visits, next }) => (
                <li key={p.id}>
                  <button
                    onClick={() => setParams({ id: p.id })}
                    aria-current={selectedId === p.id}
                    className={`flex w-full items-center gap-3 border-b border-bone px-2 py-3 text-left transition-colors ${selectedId === p.id ? 'bg-ivory' : 'hover:bg-ivory/60'}`}
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-bone text-[11px]">
                      {p.full_name.split(' ').map((x) => x[0]).slice(0, 2).join('')}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{p.full_name}</span>
                      <span className="font-mono text-[10.5px] text-muted">
                        {visits.length} visits{next ? ` · next ${relativeDay(toWall(next.start_at).date)}` : ''}
                      </span>
                    </span>
                    {p.is_demo && <span className="label text-[9px] text-clinic-deep">new</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          {!selected ? (
            <div className="hidden lg:block">
              <EmptyState kind="first-use" title="Choose a patient." body="Their visits, history and next booking appear here." />
            </div>
          ) : (
            <motion.div key={selected.p.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}>
              <button className="btn-quiet mb-6 lg:hidden" onClick={() => setParams({})}>
                ← All patients
              </button>
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-bone pb-6">
                <div>
                  <h2 className="display text-[clamp(2.2rem,4vw,3.4rem)]">{selected.p.full_name}</h2>
                  <p className="mt-2 font-mono text-sm text-graphite">
                    {selected.p.phone}
                    {selected.p.email ? ` · ${selected.p.email}` : ''}
                  </p>
                </div>
                <button className="btn-primary disabled:opacity-30" disabled={access('book') !== 'full'} onClick={() => openNewBooking({ patientId: selected.p.id })}>
                  Book a visit →
                </button>
              </div>
              <dl className="grid grid-cols-3 border-b border-bone">
                {[
                  ['Visits', selected.visits.length],
                  ['Next', selected.next ? `${relativeDay(toWall(selected.next.start_at).date)} ${formatIsoTime(selected.next.start_at)}` : '—'],
                  ['Did not attend', selected.visits.filter((a) => a.status === 'no_show').length],
                ].map(([k, v]) => (
                  <div key={k as string} className="py-4 pr-4">
                    <dt className="label text-[9.5px]">{k}</dt>
                    <dd className="mt-1 font-display text-2xl">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="label mb-3 mt-8">Visit history</p>
              <ol className="relative border-l border-steel-2 pl-6">
                {[...selected.visits].reverse().map((a) => {
                  const w = toWall(a.start_at)
                  const future = w.date >= t && a.status === 'booked'
                  return (
                    <li key={a.id} className="relative pb-5">
                      <span className={`absolute -left-[29px] top-1.5 size-2.5 rounded-full border ${future ? 'border-clinic bg-porcelain' : a.status === 'cancelled' || a.status === 'no_show' ? 'border-alert bg-alert' : 'border-charcoal bg-charcoal'}`} />
                      <button className="text-left hover:text-clinic-deep" onClick={() => openAppointment(a.id)}>
                        <span className="block">
                          {typeById(a.appointment_type_id)?.name}
                          <span className="text-muted"> · {chairById(a.chair_id)?.name}</span>
                        </span>
                        <span className="font-mono text-[11px] text-muted">
                          {formatDay(w.date, 'long')} {formatIsoTime(a.start_at)} · {statusLabel(a.status)}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ol>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
