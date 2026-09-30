import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { type Curve, normalAt, pointAt } from '../../lib/arch'
import { DEMO_ACCOUNTS, DEMO_CODE, DEMO_PASSWORD, checkCode, checkPassword, findStaff, lastEmail, startSession } from '../../lib/auth'
import type { StaffUser } from '../../lib/types'

// Staff access as a digital impression, laid over the dormant studio. One
// surface moves through identity, passphrase and a second factor; each stage
// completes more of the impression and wakes another layer of the workspace
// behind it (navigation, then data, then controls). In resume mode it asks only
// for the passphrase and wakes the studio exactly where it was left.

type Stage = 0 | 1 | 2 | 3
const STAGES = ['Identity', 'Passphrase', 'Second factor', 'Open']

// Control points sit below the frame so the arch bottoms out under the form.
const TRAY: Curve = [
  [60, 40],
  [70, 640],
  [630, 640],
  [640, 40],
]
const CONTOURS = 11

const contourD = (k: number) => {
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

const firstName = (u: StaffUser) => (u.name.startsWith('Dr.') ? u.name : u.name.split(' ')[0])

export default function IdentityImpression({
  mode = 'signin',
  resumeUser,
  note,
  onStage,
  onSignedIn,
  onSwitchUser,
}: {
  mode?: 'signin' | 'resume'
  resumeUser?: StaffUser | null
  note?: string | null
  onStage?: (stage: number) => void
  onSignedIn: (u: StaffUser) => void
  onSwitchUser?: () => void
}) {
  const reduce = useReducedMotion()
  const shake = useAnimationControls()
  const resume = mode === 'resume' && !!resumeUser
  const [stage, setStage] = useState<Stage>(resume ? 1 : 0)
  const [email, setEmail] = useState(lastEmail)
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [user, setUser] = useState<StaffUser | null>(resume ? resumeUser : null)
  useEffect(() => onStage?.(stage), [stage, onStage])
  const [error, setError] = useState<string | null>(null)
  const [reveal, setReveal] = useState(false)
  const [caps, setCaps] = useState(false)
  const [scanning, setScanning] = useState(false)

  const fail = (msg: string) => {
    setError(msg)
    if (!reduce) shake.start({ x: [0, -8, 7, -4, 3, 0], transition: { duration: 0.45 } })
  }
  // A brief scan pass between stages, as the impression is read.
  const advance = (next: Stage, then?: () => void) => {
    setError(null)
    setScanning(true)
    window.setTimeout(
      () => {
        setScanning(false)
        setStage(next)
        then?.()
      },
      reduce ? 0 : 650,
    )
  }

  const submitIdentity = (e?: React.FormEvent, override?: string) => {
    e?.preventDefault()
    const u = findStaff(override ?? email)
    if (!u) return fail('That email isn’t registered to the studio.')
    setUser(u)
    advance(1)
  }
  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (!checkPassword(password)) return fail('That passphrase didn’t match the impression.')
    if (resume && user) {
      // Re-authentication inside a live session: the passphrase is enough.
      return advance(3, () => {
        startSession(user)
        window.setTimeout(() => onSignedIn(user), reduce ? 60 : 1100)
      })
    }
    advance(2)
  }
  const submitCode = (value: string, who: StaffUser | null = user) => {
    if (!who) return
    if (!checkCode(value)) return fail('That code didn’t match. Use the current code from your authenticator.')
    advance(3, () => {
      startSession(who)
      window.setTimeout(() => onSignedIn(who), reduce ? 60 : 1700)
    })
  }

  // One tap for judges: runs every stage with the demo credentials so the
  // studio can be seen waking layer by layer.
  const pickAccount = (u: StaffUser) => {
    const pause = reduce ? 0 : 700
    setEmail(u.email)
    setUser(u)
    setCode('')
    advance(1, () => {
      setPassword(DEMO_PASSWORD)
      window.setTimeout(
        () =>
          advance(2, () =>
            window.setTimeout(() => {
              setCode(DEMO_CODE)
              submitCode(DEMO_CODE, u)
            }, pause),
          ),
        pause,
      )
    })
  }

  const p = stage + (scanning ? 0.5 : 0)
  const target = stage === 3 ? 1 : p === 0 ? 0 : 0.1 + p * 0.3

  return (
    <motion.div
      className="fixed inset-0 z-[55] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={resume ? 'Resume studio session' : 'Studio sign-in'}
      initial={{ opacity: 0 }}
      animate={{ opacity: stage === 3 ? 0 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: stage === 3 ? 0.8 : 0.5, delay: stage === 3 ? 0.9 : 0 }}
      style={{
        background:
          'radial-gradient(ellipse 60% 70% at 50% 45%, rgba(243,239,231,0.97) 0%, rgba(243,239,231,0.88) 45%, rgba(243,239,231,0.35) 100%)',
      }}
    >
      <div className="relative z-10 mx-auto grid min-h-[100svh] max-w-[1100px] place-items-center px-4 py-20">
        <motion.div
          className="relative w-full max-w-[700px]"
          animate={stage === 3 && !reduce ? { opacity: 0, scale: 0.94, filter: 'blur(6px)' } : { opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ delay: stage === 3 ? 0.7 : 0, duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
        >
          <svg viewBox="0 0 700 540" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 -bottom-28 top-0 h-[calc(100%+7rem)] w-full" aria-hidden>
            {Array.from({ length: CONTOURS }, (_, k) => {
              const mid = k === Math.floor(CONTOURS / 2)
              const len = Math.max(0, Math.min(1, target * (1 + (k % 4) * 0.08) - (k % 3) * 0.04))
              return (
                <motion.path
                  key={k}
                  d={contourD(k)}
                  fill="none"
                  stroke={error ? 'var(--color-alert)' : stage === 3 ? 'var(--color-clinic)' : mid ? 'var(--color-charcoal)' : 'var(--color-steel)'}
                  strokeWidth={mid ? 1.2 : 0.7}
                  strokeOpacity={mid ? 0.8 : 0.35}
                  vectorEffect="non-scaling-stroke"
                  initial={{ pathLength: 0, pathOffset: 0.5 }}
                  animate={{ pathLength: len, pathOffset: (1 - len) / 2 }}
                  transition={{ duration: reduce ? 0 : 0.9, ease: [0.22, 1, 0.36, 1], delay: reduce ? 0 : 0.2 + k * 0.035 }}
                />
              )
            })}
            <motion.g initial={{ y: 40, opacity: 0 }} animate={{ y: 60 + Math.min(p, 3) * 130, opacity: 1 }} transition={{ duration: reduce ? 0 : 0.8, ease: [0.65, 0, 0.35, 1] }}>
              <line x1={70} x2={630} y1={0} y2={0} stroke="var(--color-clinic)" strokeOpacity={0.7} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            </motion.g>
          </svg>

          <motion.div animate={shake} className="relative mx-auto w-full max-w-[380px] px-1 pb-28 pt-16 md:pt-20" aria-live="polite">
            <StageCounter stage={stage} />
            <AnimatePresence mode="wait">
              <motion.div
                key={stage}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10, filter: 'blur(4px)' }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                {stage === 0 && (
                  <form onSubmit={submitIdentity}>
                    <Title>Who is entering the studio?</Title>
                    <label className="mb-8 block">
                      <span className="label mb-1 block text-[10px]">Studio email</span>
                      <input className="field" type="email" autoComplete="username" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </label>
                    <ErrorLine message={error} />
                    <Primary busy={scanning}>Resolve identity</Primary>
                  </form>
                )}
                {stage === 1 && user && (
                  <form onSubmit={submitPassword}>
                    <Recognised
                      user={user}
                      onChange={() => {
                        if (resume) onSwitchUser?.()
                        else setStage(0)
                      }}
                    />
                    <Title>{resume ? `Welcome back, ${firstName(user)}.` : 'Identity recognised.'}</Title>
                    {resume && (
                      <p className="-mt-6 mb-8 text-sm leading-relaxed text-muted">
                        {note ?? 'The studio is paused.'} Everything is exactly where you left it.
                      </p>
                    )}
                    <label className="mb-2 block">
                      <span className="label mb-1 block text-[10px]">Passphrase</span>
                      <span className="relative block">
                        <input
                          className="field pr-16"
                          type={reveal ? 'text' : 'password'}
                          autoComplete="current-password"
                          autoFocus
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onKeyUp={(e) => setCaps(e.getModifierState('CapsLock'))}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setReveal((r) => !r)}
                          className="label absolute right-0 top-1/2 -translate-y-1/2 text-[10px] hover:text-charcoal"
                          aria-label={reveal ? 'Hide passphrase' : 'Show passphrase'}
                        >
                          {reveal ? 'Hide' : 'Show'}
                        </button>
                      </span>
                    </label>
                    <p className="mb-6 h-5 text-xs text-alert">{caps ? 'Caps Lock is on.' : ''}</p>
                    <ErrorLine message={error} />
                    <Primary busy={scanning}>{resume ? 'Wake the studio' : 'Verify passphrase'}</Primary>
                  </form>
                )}
                {stage === 2 && (
                  <div>
                    <Title>One final signal.</Title>
                    <p className="-mt-6 mb-6 text-sm text-muted">Enter the six-digit code from your studio authenticator.</p>
                    <CrownCode
                      value={code}
                      onChange={(v) => {
                        setCode(v)
                        setError(null)
                        if (v.length === 6) submitCode(v)
                      }}
                    />
                    <div className="mt-5 flex items-center justify-between border-t border-bone pt-3">
                      <span className="label text-[10px]">
                        Demo code <span className="text-charcoal">{DEMO_CODE.slice(0, 3)} {DEMO_CODE.slice(3)}</span>
                      </span>
                      <button
                        type="button"
                        className="label text-[10px] underline underline-offset-4 hover:text-charcoal"
                        onClick={() => {
                          setCode(DEMO_CODE)
                          submitCode(DEMO_CODE)
                        }}
                      >
                        Use demo code
                      </button>
                    </div>
                    <div className="mt-4">
                      <ErrorLine message={error} />
                    </div>
                  </div>
                )}
                {stage === 3 && user && (
                  <div className="text-center">
                    <Title>{resume ? 'Resuming.' : `Welcome in, ${firstName(user)}.`}</Title>
                    <p className="label -mt-4 text-clinic-deep">Identity resolved · {user.role} · {resume ? 'waking in place' : 'opening the studio'}</p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.div>

        {stage < 3 && (
          <nav aria-label="Leave sign-in" className="relative z-10 mb-8 flex items-center gap-8">
            <Link to="/" className="btn-quiet">
              ← ORA<span className="text-clinic">°</span> public site
            </Link>
            {resume && (
              <button type="button" onClick={onSwitchUser} className="btn-quiet">
                Sign out
              </button>
            )}
          </nav>
        )}
        {stage < 3 && !resume && (
          <motion.section
            aria-labelledby="demo-access"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduce ? 0 : 0.9 }}
            className="relative z-10 w-full max-w-[560px] border-t border-bone pt-5"
          >
            <p id="demo-access" className="mb-1 font-display text-xl">
              Just looking? Enter as a demo user.
            </p>
            <p className="label mb-3 text-[10px]">
              One tap signs in · or type passphrase <span className="text-charcoal">{DEMO_PASSWORD}</span> and code <span className="text-charcoal">{DEMO_CODE}</span>
            </p>
            <ul className="grid gap-px bg-bone sm:grid-cols-3">
              {DEMO_ACCOUNTS.map((u) => (
                <li key={u.email}>
                  <button type="button" onClick={() => pickAccount(u)} className="h-full w-full bg-porcelain/90 px-3 py-3 text-left transition-colors hover:bg-ivory">
                    <span className="block text-sm">{u.name}</span>
                    <span className="label text-[9.5px]">{u.role}</span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.section>
        )}
      </div>
    </motion.div>
  )
}

function StageCounter({ stage }: { stage: Stage }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <p className="label">
        ORA<span className="text-clinic">°</span> studio access
      </p>
      <p className="label flex items-center gap-2" aria-label={`Step ${stage + 1} of 4: ${STAGES[stage]}`}>
        <span className="flex gap-1" aria-hidden>
          {STAGES.map((s, i) => (
            <span key={s} className={`h-[3px] w-4 transition-colors duration-500 ${i < stage ? 'bg-charcoal' : i === stage ? 'bg-clinic' : 'bg-steel-2'}`} />
          ))}
        </span>
        0{stage + 1} / 04
      </p>
    </div>
  )
}

const Title = ({ children }: { children: React.ReactNode }) => (
  <h1 className="display mb-10 text-[clamp(2.2rem,4.6vw,3.3rem)] !leading-[1]">{children}</h1>
)

const ErrorLine = ({ message }: { message: string | null }) =>
  message ? (
    <p role="alert" className="mb-5 text-sm text-alert">
      {message}
    </p>
  ) : null

const Primary = ({ children, busy }: { children: React.ReactNode; busy: boolean }) => (
  <button className="btn-primary w-full justify-between" disabled={busy}>
    <span>{busy ? 'Reading impression…' : children}</span>
    <span aria-hidden>{busy ? '···' : '→'}</span>
  </button>
)

function Recognised({ user, onChange }: { user: StaffUser; onChange: () => void }) {
  const initials = user.name
    .replace('Dr. ', '')
    .split(' ')
    .map((x) => x[0])
    .join('')
  return (
    <div className="mb-6 flex items-center gap-3 border-y border-bone py-3">
      <span className="grid size-9 place-items-center rounded-full bg-clinic text-xs text-ivory" aria-hidden>
        {initials}
      </span>
      <span className="flex-1">
        <span className="block text-sm leading-tight">{user.name}</span>
        <span className="label text-[9.5px]">{user.role}</span>
      </span>
      <button type="button" onClick={onChange} className="label text-[10px] underline underline-offset-4 hover:text-charcoal">
        Not you?
      </button>
    </div>
  )
}

const CROWN_ARCH: Curve = [
  [20, 70],
  [40, 8],
  [340, 8],
  [360, 70],
]

/** Six-digit code entered into crowns set along an arch. */
export function CrownCode({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)
  useEffect(() => input.current?.focus(), [])
  return (
    <div className="relative" onClick={() => input.current?.focus()}>
      <input
        ref={input}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="Six-digit verification code"
        className="absolute inset-0 z-10 cursor-text opacity-0"
      />
      <div className="relative h-[118px]" aria-hidden>
        {Array.from({ length: 6 }, (_, i) => {
          const t = 0.08 + (i / 5) * 0.84
          const [x, y] = pointAt(CROWN_ARCH, t)
          const filled = i < value.length
          const current = focused && i === Math.min(value.length, 5)
          return (
            <motion.span
              key={i}
              className={`absolute grid h-[58px] w-[46px] -translate-x-1/2 place-items-center border font-display text-2xl ${
                filled ? 'border-charcoal bg-ivory' : current ? 'border-clinic bg-ivory/70' : 'border-steel-2'
              }`}
              style={{ left: `${(x / 380) * 100}%`, top: y + 12, borderRadius: '42% 42% 14% 14% / 48% 48% 14% 14%' }}
              animate={{ y: filled ? -4 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              {value[i] ?? ''}
              {current && <span className="absolute bottom-2 h-px w-4 animate-pulse bg-clinic" />}
            </motion.span>
          )
        })}
      </div>
    </div>
  )
}
