import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { findExceptions, type Exception } from '../components/ora/ReceptionCommand'
import { formatIsoTime, relativeDay, toWall } from '../lib/time'
import { resetDemo } from '../lib/api'
import { ACCESS_NOTE, useStaff } from './StaffContext'
import { STAFF_NAV } from './LivingSidebar'

// One header for search, status, notifications, quick-create and the account.

export default function CommandHeader() {
  const { pathname } = useLocation()
  const { setPaletteOpen, openNewBooking, access, awake } = useStaff()
  const section = [...STAFF_NAV].reverse().find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)))?.label ?? 'Today'
  const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

  return (
    <header className="sticky top-0 z-30 border-b border-bone bg-porcelain/90 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 md:px-6">
        <Link to="/staff" className="font-display text-2xl lg:hidden">
          ORA<span className="text-clinic">°</span>
        </Link>
        <p className="label hidden md:block">
          Studio <span className="text-steel">/</span> <span className="text-charcoal">{section}</span>
        </p>

        <button
          onClick={() => setPaletteOpen(true)}
          disabled={!awake}
          className="group ml-auto flex h-10 min-w-0 flex-1 items-center gap-3 border-b border-steel-2 px-1 text-left text-sm text-muted transition-colors hover:border-charcoal md:ml-8 md:max-w-[440px]"
          aria-label="Search patients, bookings and actions"
        >
          <svg viewBox="0 0 16 16" className="size-4 shrink-0" aria-hidden>
            <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          <span className="truncate">Search patients, bookings, actions…</span>
          <kbd className="ml-auto hidden font-mono text-[10px] text-steel sm:inline">{mac ? '⌘' : 'Ctrl'} K</kbd>
        </button>

        <div className="ml-auto flex items-center gap-1 md:gap-3">
          <StatusLayer />
          <button
            onClick={() => openNewBooking()}
            disabled={access('book') !== 'full'}
            title={access('book') !== 'full' ? ACCESS_NOTE.readonly : 'New booking'}
            className="btn-primary !gap-2 !px-3 !py-2.5 disabled:!opacity-30"
          >
            <span aria-hidden>+</span>
            <span className="hidden sm:inline">New booking</span>
          </button>
          <NotificationCenter />
          <AccountMenu />
        </div>
      </div>
    </header>
  )
}

/** Global status: live, syncing, offline or degraded — always in one place. */
function StatusLayer() {
  const { sync, refresh } = useStaff()
  const [, tick] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => tick((n) => n + 1), 5000)
    return () => window.clearInterval(t)
  }, [])
  const ago = sync.at ? Math.max(0, Math.round((Date.now() - sync.at) / 1000)) : null
  const map = {
    live: { dot: 'bg-clinic', text: ago !== null && ago > 20 ? `Live · ${ago < 60 ? `${ago}s` : `${Math.round(ago / 60)}m`} ago` : 'Live' },
    syncing: { dot: 'bg-steel animate-pulse', text: 'Syncing' },
    error: { dot: 'bg-alert', text: 'Schedule unreachable · retrying' },
    offline: { dot: 'bg-alert', text: 'Offline · changes paused' },
  }[sync.state]
  return (
    <button onClick={() => refresh()} className="hidden items-center gap-2 px-2 py-2 md:flex" title="Refresh now" aria-live="polite">
      <span className={`size-1.5 rounded-full ${map.dot}`} aria-hidden />
      <span className={`font-mono text-[10px] uppercase tracking-[0.12em] ${sync.state === 'error' || sync.state === 'offline' ? 'text-alert' : 'text-muted'}`}>{map.text}</span>
    </button>
  )
}

const TOPICS: { kind: Exception['kind']; title: string }[] = [
  { kind: 'late', title: 'Late arrivals' },
  { kind: 'conflict', title: 'Schedule conflicts' },
  { kind: 'reschedule', title: 'Patients asking for a call' },
  { kind: 'intake', title: 'Unresolved intake' },
]

/** Notifications clustered by topic, with ORA's automation as one digest line. */
function NotificationCenter() {
  const { view, openAppointment, awake } = useStaff()
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>('late')
  const exceptions = useMemo(() => (view ? findExceptions(view) : []), [view])
  const prepared = view?.events.filter((e) => e.status === 'simulated' && (e.completed_at ?? e.created_at).startsWith(new Date().toISOString().slice(0, 10))).length ?? 0
  const urgent = exceptions.some((x) => x.kind === 'late' || x.kind === 'conflict')

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={!awake}
        aria-expanded={open}
        aria-label={`Notifications, ${exceptions.length} need attention`}
        className="relative grid size-10 place-items-center hover:bg-ivory"
      >
        <svg viewBox="0 0 20 20" className="size-5" aria-hidden>
          <path d="M5 14V9a5 5 0 0 1 10 0v5l1.5 1.5h-13z M8.5 17.5a1.6 1.6 0 0 0 3 0" fill="none" stroke="currentColor" strokeWidth="1.2" />
        </svg>
        {exceptions.length > 0 && (
          <span className={`absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full px-1 font-mono text-[9px] text-ivory ${urgent ? 'bg-alert' : 'bg-charcoal'}`}>{exceptions.length}</span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="porcelain-surface fixed inset-x-3 top-16 z-50 max-h-[70vh] overflow-y-auto p-5 sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[380px]"
            >
              <p className="label mb-4">Notifications · grouped</p>
              {exceptions.length === 0 && <p className="mb-4 font-display text-xl">Nothing needs you.</p>}
              <ul className="border-t border-bone">
                {TOPICS.map((t) => {
                  const items = exceptions.filter((x) => x.kind === t.kind)
                  if (!items.length) return null
                  const isOpen = expanded === t.kind
                  return (
                    <li key={t.kind} className="border-b border-bone">
                      <button className="flex w-full items-center justify-between py-3 text-left" aria-expanded={isOpen} onClick={() => setExpanded(isOpen ? null : t.kind)}>
                        <span className="text-sm">
                          <span className={`mr-2 inline-block size-1.5 rounded-full align-middle ${t.kind === 'late' || t.kind === 'conflict' ? 'bg-alert' : 'bg-steel'}`} />
                          {t.title}
                        </span>
                        <span className="font-mono text-xs">{items.length}</span>
                      </button>
                      {isOpen && (
                        <ul className="pb-3 pl-4">
                          {items.map((x) => (
                            <li key={x.key}>
                              <button
                                className="w-full py-1.5 text-left text-[13px] hover:text-clinic-deep"
                                onClick={() => {
                                  openAppointment(x.appointment.id)
                                  setOpen(false)
                                }}
                              >
                                {view?.patients.get(x.appointment.patient_id)?.full_name}
                                <span className="text-muted">
                                  {' '}
                                  · {relativeDay(toWall(x.appointment.start_at).date)} {formatIsoTime(x.appointment.start_at)}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  )
                })}
              </ul>
              <p className="mt-4 flex items-center gap-2 text-sm text-muted">
                <span className="size-1.5 rounded-full border border-clinic" />
                ORA prepared {prepared} messages today — handled, no action needed.
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function AccountMenu() {
  const { user, lock, signOut, access, refresh, openAppointment } = useStaff()
  const [open, setOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [requested, setRequested] = useState(false)
  const [outage, setOutage] = useState(() => {
    try {
      return localStorage.getItem('ora.simulateOutage') === '1'
    } catch {
      return false
    }
  })
  if (!user) return null
  const initials = user.name.replace('Dr. ', '').split(' ').map((p) => p[0]).join('')
  const resetAccess = access('reset')

  const toggleOutage = () => {
    const next = !outage
    setOutage(next)
    try {
      if (next) localStorage.setItem('ora.simulateOutage', '1')
      else localStorage.removeItem('ora.simulateOutage')
    } catch {
      // Storage unavailable.
    }
    refresh()
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex items-center gap-3 pl-1 text-right" aria-label="Account and operations">
        <span className="hidden xl:block">
          <span className="block text-sm leading-tight">{user.name}</span>
          <span className="label text-[9px]">{user.role}</span>
        </span>
        <span className="grid size-9 place-items-center rounded-full border border-steel-2 text-xs">{initials}</span>
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="porcelain-surface absolute right-0 top-12 z-50 w-[300px] p-5"
            >
              <p className="text-sm">{user.name}</p>
              <p className="label mb-4 text-[9.5px]">
                {user.role} · {user.email}
              </p>
              <div className="h-px bg-bone" />
              <p className="label mb-2 mt-4">Operations</p>
              {resetAccess === 'readonly' ? (
                <p className="py-1.5 text-sm text-steel">Reset demo data · {ACCESS_NOTE.readonly.toLowerCase()}</p>
              ) : resetAccess === 'approval' ? (
                <button className="block w-full py-1.5 text-left text-sm hover:text-clinic-deep disabled:text-muted" disabled={requested} onClick={() => setRequested(true)}>
                  {requested ? 'Reset requested · awaiting the practice manager' : 'Request demo reset (needs approval)'}
                </button>
              ) : confirmReset ? (
                <div className="mb-2 border-l-2 border-alert pl-3">
                  <p className="text-sm">Remove every visit created in the demo and restore today’s seed schedule?</p>
                  <div className="mt-2 flex gap-4">
                    <button
                      className="btn-quiet !border-alert !text-alert"
                      disabled={resetting}
                      onClick={async () => {
                        setResetting(true)
                        await resetDemo().catch(() => undefined)
                        openAppointment(null)
                        setResetting(false)
                        setConfirmReset(false)
                        setOpen(false)
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
                <button className="block w-full py-1.5 text-left text-sm hover:text-clinic-deep" onClick={() => setConfirmReset(true)}>
                  Reset demo data…
                </button>
              )}
              <label className="flex cursor-pointer items-center justify-between py-1.5 text-sm">
                Simulate backend outage
                <input type="checkbox" checked={outage} onChange={toggleOutage} className="accent-[var(--color-alert)]" />
              </label>
              <div className="my-3 h-px bg-bone" />
              <button
                className="block w-full py-1.5 text-left text-sm hover:text-clinic-deep"
                onClick={() => {
                  setOpen(false)
                  lock('You locked the studio.')
                }}
              >
                Lock studio
              </button>
              <Link to="/" className="block py-1.5 text-sm hover:text-clinic-deep">
                Public site ↗
              </Link>
              <button className="block w-full py-1.5 text-left text-sm hover:text-alert" onClick={signOut}>
                Sign out
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
