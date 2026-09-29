import type { StaffUser } from './types'

// Demo staff accounts. Credentials are intentionally public so judges and
// reviewers can sign in; the session lives only in this browser tab.

export const DEMO_PASSWORD = 'porcelain'

export const DEMO_ACCOUNTS: StaffUser[] = [
  { email: 'frontdesk@ora.studio', name: 'Ife Adeleke', role: 'Front desk' },
  { email: 'manager@ora.studio', name: 'Bola Hassan', role: 'Practice manager' },
  { email: 'dr.okafor@ora.studio', name: 'Dr. Adaeze Okafor', role: 'Clinician' },
]

const KEY = 'ora.staff'

export function signIn(email: string, password: string): StaffUser | null {
  const user = DEMO_ACCOUNTS.find((u) => u.email === email.trim().toLowerCase())
  if (!user || password !== DEMO_PASSWORD) return null
  try {
    sessionStorage.setItem(KEY, JSON.stringify(user))
  } catch {
    // Session storage blocked: sign-in still holds for this page view.
  }
  return user
}

export function currentStaff(): StaffUser | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as StaffUser) : null
  } catch {
    return null
  }
}

export function signOut() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // Nothing stored.
  }
}
