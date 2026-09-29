import {
  AnimatePresence,
  type MotionValue,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'motion/react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BOOK_ARCH, NAV_ARCH, curveD, lerpCurve, pointAt, subCurve } from '../../lib/arch'
import { STEPS, type StepIndex, useVisit } from '../../store/visitStore'
import { OcclusionArch } from './OcclusionPath'

// Marketing navigation that sits on a shallow dental-arch baseline. A micro
// indicator travels the arch with scroll; hovering a label lights its segment.
// On entering booking, the arch deepens into the OcclusionPath progress arch.

const ITEMS = [
  { label: 'ABOUT', to: '/#studio', t: 0.12 },
  { label: 'CARE', to: '/care', t: 0.37 },
  { label: 'SMILE', to: '/#smile', t: 0.63 },
  { label: 'VISIT', to: '/#visit', t: 0.88 },
]

export default function DentalArchNav() {
  const { pathname } = useLocation()
  const booking = pathname.startsWith('/visit')
  const reduce = useReducedMotion()
  const morph = useMotionValue(booking ? 1 : 0)
  const [settled, setSettled] = useState(booking)
  const [hover, setHover] = useState<number | null>(null)

  useEffect(() => {
    setSettled(false)
    const controls = animate(morph, booking ? 1 : 0, {
      duration: reduce ? 0 : 0.9,
      ease: [0.65, 0, 0.35, 1],
      onComplete: () => setSettled(booking),
    })
    return () => controls.stop()
  }, [booking, morph, reduce])

  const d = useTransform(morph, (m) => curveD(lerpCurve(NAV_ARCH, BOOK_ARCH, m)))
  const labelsOpacity = useTransform(morph, [0, 0.35], [1, 0])

  // Scroll indicator: on the home page it maps page progress onto the arch;
  // elsewhere it rests on the active label.
  const { scrollYProgress } = useScroll()
  const activeIdx = ITEMS.findIndex((i) => i.to === pathname)
  const [dot, setDot] = useState(() => pointAt(NAV_ARCH, activeIdx >= 0 ? ITEMS[activeIdx].t : 0))
  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    if (pathname === '/') setDot(pointAt(NAV_ARCH, Math.min(1, Math.max(0, p))))
  })
  useEffect(() => {
    if (pathname !== '/') setDot(pointAt(NAV_ARCH, activeIdx >= 0 ? ITEMS[activeIdx].t : 0))
    else setDot(pointAt(NAV_ARCH, scrollYProgress.get()))
  }, [pathname, activeIdx, scrollYProgress])

  return (
    <header className="fixed inset-x-0 top-0 z-40">
      <div className="absolute inset-0 bg-gradient-to-b from-porcelain via-porcelain/85 to-transparent" aria-hidden />
      <DesktopArch
        booking={booking}
        settled={settled}
        d={d}
        labelsOpacity={labelsOpacity}
        dot={dot}
        hover={hover}
        setHover={setHover}
        activeIdx={activeIdx}
      />
      <MobileHeader booking={booking} />
    </header>
  )
}

interface DesktopProps {
  booking: boolean
  settled: boolean
  d: MotionValue<string>
  labelsOpacity: MotionValue<number>
  dot: [number, number]
  hover: number | null
  setHover: (i: number | null) => void
  activeIdx: number
}

function DesktopArch({ booking, settled, d, labelsOpacity, dot, hover, setHover, activeIdx }: DesktopProps) {
  const step = useVisit((s) => s.step)
  const go = useVisit((s) => s.go)
  const done = useVisit((s) => !!s.bookingCode)
  const navigate = useNavigate()
  const reduce = useReducedMotion()

  return (
    <nav aria-label={booking ? 'Booking progress' : 'Main'} className="relative mx-auto hidden aspect-[10/1] max-w-[1320px] md:block">
      {booking && (
        <p className="sr-only" aria-live="polite">
          {done ? 'Visit confirmed' : `Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}
        </p>
      )}
      <svg viewBox="0 0 1200 120" className="absolute inset-0 size-full" aria-hidden="true">
        <defs>
          <radialGradient id="arch-glow">
            <stop offset="0" stopColor="var(--color-clinic)" stopOpacity="0.35" />
            <stop offset="1" stopColor="var(--color-clinic)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <AnimatePresence>
          {!(booking && settled) && (
            <motion.path
              key="nav-arch"
              d={d}
              fill="none"
              stroke="var(--color-steel)"
              strokeWidth={1}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
            />
          )}
        </AnimatePresence>

        {/* Hover segment illumination */}
        {!booking &&
          ITEMS.map((it, i) => {
            const on = hover === i || (hover === null && activeIdx === i)
            return (
              <motion.path
                key={it.label}
                d={curveD(subCurve(NAV_ARCH, Math.max(0, it.t - 0.1), Math.min(1, it.t + 0.1)))}
                fill="none"
                stroke="var(--color-charcoal)"
                strokeWidth={1.6}
                strokeLinecap="round"
                initial={false}
                animate={{ opacity: on ? 1 : 0, pathLength: on ? 1 : 0.2 }}
                transition={{ duration: reduce ? 0 : 0.35 }}
              />
            )
          })}

        {/* Segment ticks — the anatomical division marks along the arch */}
        {!booking &&
          [0.25, 0.5, 0.75].map((t) => {
            const [x, y] = pointAt(NAV_ARCH, t)
            return <line key={t} x1={x} y1={y - 3} x2={x} y2={y + 3} stroke="var(--color-steel)" strokeWidth={0.8} />
          })}

        {/* Travelling micro-indicator */}
        {!booking && (
          <motion.g initial={false} animate={{ x: dot[0], y: dot[1] }} transition={{ type: 'spring', stiffness: 160, damping: 26 }}>
            <circle r={14} fill="url(#arch-glow)" />
            <circle r={3} fill="var(--color-ivory)" stroke="var(--color-clinic)" strokeWidth={1.4} />
          </motion.g>
        )}

        {booking && settled && (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            <OcclusionArch step={done ? 5 : step} onSelect={done ? undefined : (i) => go(i as StepIndex)} maxReachable={step} />
          </motion.g>
        )}
      </svg>

      {/* HTML overlay for accessible, crisp labels positioned on the arch */}
      <motion.ul style={{ opacity: labelsOpacity }} className={booking ? 'pointer-events-none' : ''} aria-hidden={booking}>
        {ITEMS.map((it, i) => {
          const [x, y] = pointAt(NAV_ARCH, it.t)
          return (
            <li
              key={it.label}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${(x / 1200) * 100}%`, top: `${((y - 17) / 120) * 100}%` }}
            >
              <NavLink
                to={it.to}
                onEnter={() => setHover(i)}
                onLeave={() => setHover(null)}
                active={activeIdx === i}
                tabIndex={booking ? -1 : 0}
              >
                {it.label}
              </NavLink>
            </li>
          )
        })}
      </motion.ul>

      <Link
        to="/"
        className="absolute left-[3.3%] top-[33%] flex -translate-y-1/2 items-baseline gap-0.5 font-display text-[30px] leading-none tracking-tight"
        aria-label="ORA Dental Studio — home"
      >
        ORA<span className="text-clinic">°</span>
        <span className="label ml-3 hidden text-[10px] xl:inline">Dental Studio</span>
      </Link>

      {booking ? (
        <div className="absolute right-[3.3%] top-[33%] flex -translate-y-1/2 items-center gap-6">
          <span className="label hidden lg:inline">{done ? 'Visit confirmed' : `Step ${step + 1} / ${STEPS.length}`}</span>
          <button className="btn-quiet" onClick={() => navigate('/')}>
            Leave booking ✕
          </button>
        </div>
      ) : (
        <div className="absolute right-[3.3%] top-[33%] flex -translate-y-1/2 items-center gap-6">
          <Link to="/staff" className="btn-quiet hidden lg:inline-flex" title="Staff sign-in">
            Staff login
          </Link>
          <Link to="/visit" className="btn-primary !py-3">
            Book <span aria-hidden>↗</span>
          </Link>
        </div>
      )}
    </nav>
  )
}

function NavLink({
  to,
  children,
  onEnter,
  onLeave,
  active,
  tabIndex,
}: {
  to: string
  children: string
  onEnter: () => void
  onLeave: () => void
  active: boolean
  tabIndex: number
}) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const go = (e: React.MouseEvent) => {
    const [path, hash] = to.split('#')
    if (hash) {
      e.preventDefault()
      if (pathname === path) document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' })
      else navigate(to)
    }
  }
  return (
    <Link
      to={to}
      onClick={go}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      tabIndex={tabIndex}
      aria-current={active ? 'page' : undefined}
      className={`block px-2 py-2 font-mono text-[11px] tracking-[0.2em] transition-colors ${active ? 'text-charcoal' : 'text-muted hover:text-charcoal'}`}
    >
      {children}
    </Link>
  )
}

function MobileHeader({ booking }: { booking: boolean }) {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const reduce = useReducedMotion()

  useEffect(() => setOpen(false), [pathname])

  return (
    <div className="relative md:hidden">
      <div className="flex h-16 items-center justify-between px-4">
        <Link to="/" className="font-display text-[26px] leading-none" aria-label="ORA Dental Studio — home">
          ORA<span className="text-clinic">°</span>
        </Link>
        <div className="flex items-center gap-3">
          {booking ? (
            <Link to="/" className="btn-quiet">
              Leave ✕
            </Link>
          ) : (
            <Link to="/visit" className="btn-primary !px-4 !py-2.5">
              Book ↗
            </Link>
          )}
          {!booking && (
            <button
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls="arch-drawer"
              aria-label={open ? 'Close menu' : 'Open menu'}
              className="grid size-10 place-items-center"
            >
              <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
                <motion.path
                  initial={false}
                  d="M4 9 Q12 13 20 9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.4}
                  animate={{ d: open ? 'M5 5 Q12 12 19 19' : 'M4 9 Q12 13 20 9' }}
                />
                <motion.path
                  initial={false}
                  d="M4 15 Q12 19 20 15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.4}
                  animate={{ d: open ? 'M5 19 Q12 12 19 5' : 'M4 15 Q12 19 20 15' }}
                />
              </svg>
            </button>
          )}
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            id="arch-drawer"
            initial={reduce ? { opacity: 0 } : { clipPath: 'ellipse(0% 0% at 50% 0%)' }}
            animate={reduce ? { opacity: 1 } : { clipPath: 'ellipse(120% 100% at 50% 0%)' }}
            exit={reduce ? { opacity: 0 } : { clipPath: 'ellipse(0% 0% at 50% 0%)' }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-0 top-0 -z-10 bg-ivory pb-16 pt-20 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.3)]"
            style={{ borderBottomLeftRadius: '50% 18%', borderBottomRightRadius: '50% 18%' }}
          >
            <ul className="px-6">
              {[{ label: 'Home', to: '/' }, ...ITEMS.map((i) => ({ label: i.label, to: i.to })), { label: 'Manage a visit', to: '/manage' }, { label: 'Staff login', to: '/staff' }].map(
                (it, i, all) => {
                  // Items step along an arch: the middle of the list sits furthest out.
                  const offset = Math.sin((i / (all.length - 1)) * Math.PI) * 36
                  return (
                    <li key={it.to} style={{ paddingLeft: offset }} className="border-b border-bone">
                      <Link to={it.to} className="flex items-baseline justify-between py-3.5">
                        <span className="display text-[34px] capitalize">{it.label.toLowerCase()}</span>
                        <span className="label">0{i + 1}</span>
                      </Link>
                    </li>
                  )
                },
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
