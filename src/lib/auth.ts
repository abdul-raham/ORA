import type { StaffUser } from './types'

// Demo staff accounts. Credentials are intentionally public so judges and
// reviewers can sign in; the session lives only in this browser tab. Real
// authentication must be enforced by a server or identity provider.

export const DEMO_PASSWORD = 'porcelain'
/** Stand-in for an authenticator code; shown on screen in the demo. */
export const DEMO_CODE = '240118'
/** Idle time before the studio goes dormant and asks for the passphrase again. */
export const IDLE_LOCK_MS = 10 * 60 * 1000

export const DEMO_ACCOUNTS: StaffUser[] = [
  { email: 'frontdesk@ora.studio', name: 'Ife Adeleke', role: 'Front desk' },
  { email: 'manager@ora.studio', name: 'Bola Hassan', role: 'Practice manager' },
  { email: 'dr.okafor@ora.studio', name: 'Dr. Adaeze Okafor', role: 'Clinician' },
]

const KEY = 'ora.staff'
const LOCK = 'ora.staff.locked'
const LAST = 'ora.staff.lastEmail'

const safe = <T,>(fn: () => T, fallback: T): T => {
  try {
    return fn()
  } catch {
    return fallback
  }
}

export const findStaff = (email: string) => DEMO_ACCOUNTS.find((u) => u.email === email.trim().toLowerCase()) ?? null
export const checkPassword = (password: string) => password === DEMO_PASSWORD
export const checkCode = (code: string) => code.replace(/\D/g, '') === DEMO_CODE

export function startSession(user: StaffUser) {
  safe(() => {
    sessionStorage.setItem(KEY, JSON.stringify(user))
    sessionStorage.removeItem(LOCK)
    localStorage.setItem(LAST, user.email)
  }, undefined)
}

export const currentStaff = (): StaffUser | null =>
  safe(() => {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as StaffUser) : null
  }, null)

export const lastEmail = () => safe(() => localStorage.getItem(LAST) ?? '', '')

export const isLocked = () => safe(() => sessionStorage.getItem(LOCK) === '1', false)
export const lockSession = () => safe(() => sessionStorage.setItem(LOCK, '1'), undefined)
export const unlockSession = (password: string) => {
  if (!checkPassword(password)) return false
  safe(() => sessionStorage.removeItem(LOCK), undefined)
  return true
}

export function signOut() {
  safe(() => {
    sessionStorage.removeItem(KEY)
    sessionStorage.removeItem(LOCK)
  }, undefined)
}
