import { motion } from 'motion/react'
import { useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { findExceptions } from '../components/ora/ReceptionCommand'
import { chairById } from '../data/clinic'
import { formatIsoTime, today } from '../lib/time'
import { useStaff } from './StaffContext'

// Navigation that reacts to the studio: live counts, what needs a person and
// who is in the chairs right now. Sections sit on a vertical arch; the active
// marker travels along it.

export const STAFF_NAV = [
  { to: '/staff', label: 'Today', end: true },
  { to: '/staff/bookings', label: 'Bookings' },
  { to: '/staff/patients', label: 'Patients' },
  { to: '/staff/activity', label: 'Activity' },
]

export default function LivingSidebar() {
  const { view, openAppointment } = useStaff()
  const { pathname } = useLocation()
  const t = today()

  const counts = useMemo(() => {
    if (!view) return [null, null, null, null]
    const upcoming = view.appointments.filter((a) => a.start_at.slice(0, 10) >= t && a.status === 'booked').length
    const todayCount = view.appointments.filter((a) => a.start_at.startsWith(t) && a.status !== 'cancelled').length
    const eventsToday = view.events.filter((e) => (e.completed_at ?? e.created_at).startsWith(t)).length
    return [todayCount, upcoming, view.patients.size, eventsToday]
  }, [view, t])
  const exceptions = useMemo(() => (view ? findExceptions(view) : []), [view])
  const inChair = view?.appointments.filter((a) => a.status === 'in_chair' && a.start_at.startsWith(t)) ?? []
  const activeIdx = STAFF_NAV.findIndex((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)))

  return (
    <aside className="flex h-full w-[236px] flex-col border-r border-bone bg-ivory/60 px-5 pb-6 pt-5 lg:flex" aria-label="Studio navigation">
      <NavLink to="/staff" className="mb-10 flex items-baseline gap-2 font-display text-[28px] leading-none">
        ORA<span className="text-clinic">°</span>
        <span className="label text-[9.5px]">Studio</span>
      </NavLink>

      <nav className="relative pl-6">
        <svg className="absolute left-0 top-0 h-full w-4" viewBox="0 0 16 200" preserveAspectRatio="none" aria-hidden>
          <path d="M 3 4 C 14 60, 14 140, 3 196" fill="none" stroke="var(--color-steel-2)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        </svg>
        <ul className="space-y-1">
          {STAFF_NAV.map((n, i) => (
            <li key={n.to} className="relative">
              {activeIdx === i && (
                <motion.span
                  layoutId="sidebar-marker"
                  className="absolute -left-[22px] top-1/2 size-2.5 -translate-y-1/2 rounded-full border-2 border-ivory bg-clinic"
                  style={{ marginLeft: [2, 7, 7, 2][i] }}
                  transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                />
              )}
              <NavLink
                to={n.to}
                end={n.end}
                className={({ isActive }) => `flex items-baseline justify-between py-2 transition-colors ${isActive ? 'text-charcoal' : 'text-muted hover:text-charcoal'}`}
              >
                <span className="font-display text-[1.35rem] leading-none">{n.label}</span>
                <span className="font-mono text-[10px]">{counts[i] ?? '—'}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-10 min-h-0 flex-1 space-y-8 overflow-y-auto">
        <section aria-label="Needs you">
          <p className="label mb-2 flex justify-between text-[9.5px]">
            Needs you <span className={exceptions.length ? 'text-alert' : ''}>{exceptions.length}</span>
          </p>
          {exceptions.length === 0 ? (
            <p className="text-xs text-muted">All handled.</p>
          ) : (
            <ul className="space-y-1.5">
              {exceptions.slice(0, 4).map((x) => (
                <li key={x.key}>
                  <button onClick={() => openAppointment(x.appointment.id)} className="w-full text-left text-[12.5px] leading-snug hover:text-clinic-deep">
                    <span className={`mr-1.5 inline-block size-1.5 rounded-full align-middle ${x.kind === 'late' || x.kind === 'conflict' ? 'bg-alert' : 'bg-steel'}`} />
                    {view?.patients.get(x.appointment.patient_id)?.full_name.split(' ')[0]}
                    <span className="text-muted"> · {x.kind === 'late' ? 'late' : x.kind === 'conflict' ? 'conflict' : x.kind === 'reschedule' ? 'call back' : 'intake'}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-label="In the chairs now">
          <p className="label mb-2 text-[9.5px]">In the chairs</p>
          {inChair.length === 0 ? (
            <p className="text-xs text-muted">No one right now.</p>
          ) : (
            <ul className="space-y-1.5">
              {inChair.map((a) => (
                <li key={a.id}>
                  <button onClick={() => openAppointment(a.id)} className="flex w-full items-center gap-2 text-left text-[12.5px] hover:text-clinic-deep">
                    <span className="size-1.5 rounded-full bg-clinic" />
                    <span className="flex-1 truncate">{view?.patients.get(a.patient_id)?.full_name}</span>
                    <span className="font-mono text-[10px] text-muted">
                      {chairById(a.chair_id)?.name.replace('Chair ', 'C')} · {formatIsoTime(a.end_at)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </aside>
  )
}

/** Phone navigation: the same sections as a bottom bar. */
export function StaffTabBar() {
  return (
    <nav aria-label="Studio navigation" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-bone bg-ivory/95 backdrop-blur lg:hidden">
      {STAFF_NAV.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.end}
          className={({ isActive }) => `relative py-3.5 text-center font-mono text-[10px] uppercase tracking-[0.12em] ${isActive ? 'text-charcoal' : 'text-muted'}`}
        >
          {({ isActive }) => (
            <>
              {isActive && <motion.span layoutId="tab-marker" className="absolute inset-x-6 top-0 h-[2px] bg-clinic" />}
              {n.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
