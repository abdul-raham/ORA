import { motion, useAnimationControls, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { type Curve, curveD, normalAt, pointAt } from '../../lib/arch'
import { DEMO_ACCOUNTS, DEMO_PASSWORD, signIn } from '../../lib/auth'
import type { StaffUser } from '../../lib/types'

// Staff sign-in drawn as a digital impression. Contour lines of a lower arch
// resolve as credentials are entered; on success a scan pass completes the
// surface before the studio opens.

const TRAY: Curve = [
  [70, 70],
  [80, 470],
  [620, 470],
  [630, 70],
]
const CONTOURS = 11

const offsetD = (k: number) => {
  const pts = Array.from({ length: 48 }, (_, i) => {
    const t = i / 47
    const [x, y] = pointAt(TRAY, t)
    const [nx, ny] = normalAt(TRAY, t)
    const wobble = Math.sin(t * Math.PI * 14 + k) * (k % 3 === 0 ? 2.2 : 0.8)
    const d = (k - CONTOURS / 2) * 7 + wobble
    return `${(x + nx * d).toFixed(1)} ${(y + ny * d).toFixed(1)}`
  })
  return `M ${pts.join(' L ')}`
}

export default function IdentityImpression({ onSignedIn }: { onSignedIn: (u: StaffUser) => void }) {
  const reduce = useReducedMotion()
  const shake = useAnimationControls()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [state, setState] = useState<'idle' | 'scanning' | 'resolved' | 'error'>('idle')

  const completeness = Math.min(1, (email.includes('@') ? 0.5 : email.length / 30) + (password ? Math.min(0.5, password.length / 18) : 0))
  const target = state === 'scanning' || state === 'resolved' ? 1 : 0.12 + completeness * 0.7

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const user = signIn(email, password)
    if (!user) {
      setState('error')
      if (!reduce) shake.start({ x: [0, -8, 7, -4, 3, 0], transition: { duration: 0.45 } })
      return
    }
    setState('scanning')
    window.setTimeout(() => setState('resolved'), reduce ? 0 : 1100)
    window.setTimeout(() => onSignedIn(user), reduce ? 50 : 1700)
  }

  const pickAccount = (u: StaffUser) => {
    setEmail(u.email)
    setPassword(DEMO_PASSWORD)
    setState('idle')
  }

  return (
    <div className="relative mx-auto grid min-h-[100svh] max-w-[1100px] place-items-center px-4 py-16">
      <div className="relative w-full max-w-[700px]">
        <svg viewBox="0 0 700 540" className="pointer-events-none absolute inset-0 -top-6 w-full" aria-hidden>
          {Array.from({ length: CONTOURS }, (_, k) => (
            <motion.path
              key={k}
              d={offsetD(k)}
              fill="none"
              stroke={state === 'error' ? 'var(--color-alert)' : k === Math.floor(CONTOURS / 2) ? 'var(--color-charcoal)' : 'var(--color-steel)'}
              strokeWidth={k === Math.floor(CONTOURS / 2) ? 1.2 : 0.7}
              strokeOpacity={k === Math.floor(CONTOURS / 2) ? 0.9 : 0.55}
              initial={{ pathLength: 0, pathOffset: 0.5 }}
              animate={(() => {
                // Contours grow outward from the midline of the arch.
                const len = Math.max(0, Math.min(1, target * (1 + (k % 4) * 0.08) - (k % 3) * 0.04))
                return { pathLength: len, pathOffset: (1 - len) / 2 }
              })()}
              transition={{ duration: reduce ? 0 : state === 'scanning' ? 0.9 : 0.6, ease: [0.22, 1, 0.36, 1], delay: state === 'scanning' ? k * 0.03 : 0 }}
            />
          ))}
          <path d={curveD(TRAY)} fill="none" stroke="var(--color-steel-2)" strokeWidth={0.5} strokeDasharray="2 6" />
          {state === 'scanning' && !reduce && (
            <motion.rect
              x={40}
              width={620}
              height={2}
              fill="var(--color-clinic)"
              initial={{ y: 40, opacity: 0.9 }}
              animate={{ y: 500, opacity: 0 }}
              transition={{ duration: 1.05, ease: [0.65, 0, 0.35, 1] }}
            />
          )}
        </svg>

        <motion.form animate={shake} onSubmit={submit} className="relative z-10 mx-auto w-full max-w-[360px] pb-10 pt-24 md:pt-32" aria-labelledby="staff-title">
          <p className="label mb-3 text-center">
            ORA<span className="text-clinic">°</span> studio access
          </p>
          <h1 id="staff-title" className="display mb-10 text-center text-[clamp(2.4rem,5vw,3.6rem)]">
            {state === 'resolved' ? 'Identity resolved.' : 'Take an impression.'}
          </h1>
          <label className="mb-6 block">
            <span className="label mb-1 block text-[10px]">Studio email</span>
            <input className="field" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="mb-8 block">
            <span className="label mb-1 block text-[10px]">Passphrase</span>
            <input className="field" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {state === 'error' && (
            <p role="alert" className="mb-5 text-sm text-alert">
              That impression didn’t match. Check the email and passphrase.
            </p>
          )}
          <button className="btn-primary w-full justify-between" disabled={state === 'scanning' || state === 'resolved'}>
            <span>{state === 'scanning' ? 'Scanning…' : state === 'resolved' ? 'Opening the studio' : 'Sign in'}</span>
            <span aria-hidden>→</span>
          </button>
        </motion.form>
      </div>

      <section aria-labelledby="demo-access" className="relative z-10 w-full max-w-[560px] border-t border-bone pt-5">
        <p id="demo-access" className="label mb-3">
          Demo access · passphrase <span className="text-charcoal">{DEMO_PASSWORD}</span>
        </p>
        <ul className="grid gap-px bg-bone sm:grid-cols-3">
          {DEMO_ACCOUNTS.map((u) => (
            <li key={u.email}>
              <button type="button" onClick={() => pickAccount(u)} className="h-full w-full bg-porcelain px-3 py-3 text-left transition-colors hover:bg-ivory">
                <span className="block text-sm">{u.name}</span>
                <span className="label text-[9.5px]">{u.role}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
