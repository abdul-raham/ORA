import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ApiError, getStaffView, type StaffView } from '../lib/api'
import { IDLE_LOCK_MS, currentStaff, isLocked, lockSession, signOut as endSession } from '../lib/auth'
import { subscribe } from '../lib/db/store'
import type { StaffUser } from '../lib/types'

// One staff workspace that is either dormant or awake. Signed out or locked,
// the real studio stays mounted behind the access surface — structure visible,
// patient identifiers redacted — and wakes in place once access is verified.

export type Action = 'book' | 'move' | 'cancel' | 'status' | 'remind' | 'reset'
export type Access = 'full' | 'approval' | 'readonly'

const MATRIX: Record<StaffUser['role'], Record<Action, Access>> = {
  'Practice manager': { book: 'full', move: 'full', cancel: 'full', status: 'full', remind: 'full', reset: 'full' },
  'Front desk': { book: 'full', move: 'full', cancel: 'full', status: 'full', remind: 'full', reset: 'approval' },
  Clinician: { book: 'readonly', move: 'readonly', cancel: 'readonly', status: 'full', remind: 'readonly', reset: 'readonly' },
}

export const ACCESS_NOTE: Record<Exclude<Access, 'full'>, string> = {
  approval: 'Needs practice manager approval',
  readonly: 'View only for your role',
}

export type SyncState = 'live' | 'syncing' | 'error' | 'offline'

export interface NewBookingPreset {
  typeSlug?: string
  patientId?: string
}

interface StaffCtx {
  user: StaffUser | null
  awake: boolean
  /** Wake level 0–3 while the access surface is in progress. */
  stage: number
  setStage: (n: number) => void
  view: StaffView | null
  error: string | null
  sync: { state: SyncState; at: number | null }
  refresh: () => Promise<void>
  access: (a: Action) => Access
  selectedId: string | null
  openAppointment: (id: string | null) => void
  /** Opens a visit by booking code as soon as it appears in the live view. */
  openByCode: (code: string) => void
  newBooking: NewBookingPreset | null
  openNewBooking: (preset?: NewBookingPreset) => void
  closeNewBooking: () => void
  paletteOpen: boolean
  setPaletteOpen: (o: boolean) => void
  wake: (u: StaffUser) => void
  lock: (reason?: string) => void
  lockReason: string | null
  signOut: () => void
}

const Ctx = createContext<StaffCtx | null>(null)

export const useStaff = () => {
  const c = useContext(Ctx)
  if (!c) throw new Error('useStaff must be used inside StaffProvider')
  return c
}

const mask = (s: string) => s.replace(/\S/g, '•')

/** Structure without identity: what a dormant studio is allowed to show. */
function redact(v: StaffView): StaffView {
  const patients = new Map([...v.patients].map(([id, p]) => [id, { ...p, full_name: mask(p.full_name), phone: '+234 ••• ••• ••••', email: null }]))
  return {
    ...v,
    patients,
    appointments: v.appointments.map((a) => ({ ...a, booking_code: 'ORA-•••••' })),
    intake: new Map(),
  }
}

export function StaffProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(currentStaff)
  const [locked, setLocked] = useState(isLocked)
  const [lockReason, setLockReason] = useState<string | null>(null)
  const [stage, setStage] = useState(user && !locked ? 3 : 0)
  const [raw, setRaw] = useState<StaffView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sync, setSync] = useState<{ state: SyncState; at: number | null }>({ state: 'syncing', at: null })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [newBooking, setNewBooking] = useState<NewBookingPreset | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [pendingCode, setPendingCode] = useState<string | null>(null)
  const awake = !!user && !locked

  const refresh = useCallback(async () => {
    if (!navigator.onLine) {
      setSync((s) => ({ ...s, state: 'offline' }))
      return
    }
    setSync((s) => ({ ...s, state: 'syncing' }))
    try {
      const v = await getStaffView()
      setRaw(v)
      setError(null)
      setSync({ state: 'live', at: Date.now() })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load the studio schedule.')
      setSync((s) => ({ ...s, state: 'error' }))
    }
  }, [])

  // Live data: store changes (this tab and others), a slow heartbeat, faster
  // retries while the backend is unreachable, and online/offline events.
  useEffect(() => {
    refresh()
    const unsub = subscribe(refresh)
    const beat = window.setInterval(refresh, 60000)
    const on = () => refresh()
    const off = () => setSync((s) => ({ ...s, state: 'offline' }))
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      unsub()
      window.clearInterval(beat)
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [refresh])
  useEffect(() => {
    if (sync.state !== 'error') return
    const t = window.setTimeout(refresh, 10000)
    return () => window.clearTimeout(t)
  }, [sync.state, refresh])

  const lock = useCallback((reason?: string) => {
    lockSession()
    setLocked(true)
    setLockReason(reason ?? null)
    setStage(1)
    setPaletteOpen(false)
  }, [])

  // Workspace dormancy after inactivity.
  const last = useRef(Date.now())
  useEffect(() => {
    if (!awake) return
    const bump = () => (last.current = Date.now())
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart']
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }))
    const t = window.setInterval(() => {
      if (Date.now() - last.current > IDLE_LOCK_MS) lock('The studio paused after 10 minutes without activity.')
    }, 15000)
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump))
      window.clearInterval(t)
    }
  }, [awake, lock])

  useEffect(() => {
    if (!pendingCode || !raw) return
    const a = raw.appointments.find((x) => x.booking_code === pendingCode)
    if (a) {
      setSelectedId(a.id)
      setPendingCode(null)
    }
  }, [pendingCode, raw])

  const view = useMemo(() => (raw ? (awake ? raw : redact(raw)) : null), [raw, awake])

  const value: StaffCtx = {
    user,
    awake,
    stage,
    setStage,
    view,
    error,
    sync,
    refresh,
    access: (a) => (user ? MATRIX[user.role][a] : 'readonly'),
    selectedId: awake ? selectedId : null,
    openAppointment: setSelectedId,
    openByCode: setPendingCode,
    newBooking: awake ? newBooking : null,
    openNewBooking: (preset = {}) => setNewBooking(preset),
    closeNewBooking: () => setNewBooking(null),
    paletteOpen: awake && paletteOpen,
    setPaletteOpen,
    wake: (u) => {
      last.current = Date.now()
      setUser(u)
      setLocked(false)
      setLockReason(null)
      setStage(3)
    },
    lock,
    lockReason,
    signOut: () => {
      endSession()
      setUser(null)
      setLocked(false)
      setStage(0)
      setSelectedId(null)
      setNewBooking(null)
    },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
