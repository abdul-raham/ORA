import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'
import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CLINIC } from '../../data/clinic'
import { useVisit } from '../../store/visitStore'

// Editorial hero with an abstract "smile aperture": two porcelain forms that
// suggest upper and lower anatomy without drawing a mouth. The light follows
// the cursor; on Begin, the forms part and the page travels through the gap.

const UPPER = 'M 84 290 C 200 272, 400 272, 516 290 C 520 150, 80 150, 84 290 Z'
const LOWER = 'M 84 310 C 200 372, 400 372, 516 310 C 506 452, 94 452, 84 310 Z'
const APERTURE = 'M 84 290 C 200 272, 400 272, 516 290 L 516 310 C 400 372, 200 372, 84 310 Z'

const CONTOURS = Array.from({ length: 7 }, (_, i) => i)

export default function SmileApertureHero() {
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const resetVisit = useVisit((s) => s.reset)
  const stage = useRef<HTMLDivElement>(null)
  const [opening, setOpening] = useState(false)

  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 60, damping: 18 })
  const sy = useSpring(my, { stiffness: 60, damping: 18 })
  const upperX = useTransform(sx, (v) => v * 10)
  const upperY = useTransform(sy, (v) => v * 6)
  const lowerX = useTransform(sx, (v) => v * -7)
  const lowerY = useTransform(sy, (v) => v * -4)
  const ringX = useTransform(sx, (v) => v * -16)
  const ringY = useTransform(sy, (v) => v * -10)
  const lightX = useTransform(sx, (v) => 300 + v * 170)
  const lightY = useTransform(sy, (v) => 230 + v * 90)
  const lowerLightY = useTransform(lightY, (v) => v + 170)
  const tiltX = useTransform(sy, (v) => v * -6)
  const tiltY = useTransform(sx, (v) => v * 8)

  const onMove = (e: React.PointerEvent) => {
    if (reduce || !stage.current) return
    const r = stage.current.getBoundingClientRect()
    mx.set(((e.clientX - r.left) / r.width - 0.5) * 2)
    my.set(((e.clientY - r.top) / r.height - 0.5) * 2)
  }

  const begin = () => {
    resetVisit()
    if (reduce) return navigate('/visit')
    setOpening(true)
    window.setTimeout(() => navigate('/visit', { state: { via: 'aperture' } }), 980)
  }

  return (
    <section
      className="relative grid min-h-[100svh] items-center overflow-hidden px-4 pb-16 pt-28 md:px-[6%] md:pt-32 lg:grid-cols-[1fr_1.05fr]"
      onPointerMove={onMove}
      aria-labelledby="hero-title"
    >
      <div className="relative z-10 max-w-[640px]">
        <p className="label mb-8 flex items-center gap-3">
          <span className="inline-block h-px w-8 bg-steel" aria-hidden />
          Private dentistry · Victoria Island, Lagos
        </p>
        <h1 id="hero-title" className="display whitespace-nowrap text-[clamp(2.7rem,6.1vw,6.4rem)] uppercase">
          <Line delay={0.05}>Your smile.</Line>
          <Line delay={0.15}>
            Starts <em className="font-light italic normal-case">with</em>
          </Line>
          <Line delay={0.25}>being heard.</Line>
        </h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mt-8 max-w-[440px] text-[1.075rem] leading-relaxed text-graphite"
        >
          Tell us what brings you in. ORA will guide you to the appropriate appointment and find a time that works.
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-5"
        >
          <button onClick={begin} className="btn-primary group !px-7 !py-5">
            Begin your visit
            <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </button>
          <Link to="/manage" className="btn-quiet">
            Manage a visit
          </Link>
        </motion.div>
        <dl className="mt-14 grid max-w-[460px] grid-cols-3 gap-4 border-t border-bone pt-5">
          {[
            ['Chairs', '03'],
            ['Clinicians', '04'],
            ['Open', 'Mon—Sat'],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="label text-[10px]">{k}</dt>
              <dd className="mt-1 font-display text-2xl">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div
        ref={stage}
        className="relative mx-auto mt-10 aspect-square w-full max-w-[640px] lg:mt-0"
        style={{ perspective: 1200 }}
        aria-hidden
      >
        <motion.svg viewBox="0 0 600 600" className="size-full overflow-visible" style={{ rotateX: tiltX, rotateY: tiltY }}>
          <defs>
            <linearGradient id="porc-upper" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fbf8f2" />
              <stop offset="0.7" stopColor="#ece5d8" />
              <stop offset="1" stopColor="#d8cfbf" />
            </linearGradient>
            <linearGradient id="porc-lower" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#d6ccbb" />
              <stop offset="0.3" stopColor="#ebe4d7" />
              <stop offset="1" stopColor="#f8f4ec" />
            </linearGradient>
            <radialGradient id="aperture-light" cx="0.5" cy="0.45" r="0.6">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.45" stopColor="#eef3ec" />
              <stop offset="1" stopColor="#c9d6cb" />
            </radialGradient>
            <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="28" />
            </filter>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%">
              <feGaussianBlur stdDeviation="14" />
            </filter>
            <clipPath id="clip-upper">
              <path d={UPPER} />
            </clipPath>
            <clipPath id="clip-lower">
              <path d={LOWER} />
            </clipPath>
          </defs>

          {/* Scanner contours / impression mesh */}
          <motion.g style={{ x: ringX, y: ringY }}>
            {CONTOURS.map((i) => (
              <ellipse
                key={i}
                cx={300}
                cy={300}
                rx={236 + i * 22}
                ry={166 + i * 17}
                fill="none"
                stroke="var(--color-steel)"
                strokeOpacity={0.55 - i * 0.06}
                strokeWidth={0.7}
                strokeDasharray={i % 2 ? '1 6' : undefined}
              />
            ))}
            <line x1={300} y1={40} x2={300} y2={560} stroke="var(--color-steel-2)" strokeWidth={0.6} strokeDasharray="2 6" />
            <line x1={30} y1={300} x2={570} y2={300} stroke="var(--color-steel-2)" strokeWidth={0.6} strokeDasharray="2 6" />
          </motion.g>

          {/* Aperture light */}
          <motion.path
            d={APERTURE}
            fill="url(#aperture-light)"
            initial={false}
            animate={opening ? { scaleY: 26, opacity: 1 } : { scaleY: 1, opacity: 1 }}
            transition={{ duration: 0.95, ease: [0.7, 0, 0.3, 1] }}
            style={{ originX: 0.5, originY: 0.5 }}
          />

          {/* Upper form */}
          <motion.g
            style={{ x: upperX, y: upperY }}
            animate={opening ? { y: -340, opacity: 0.2 } : undefined}
            transition={{ duration: 0.95, ease: [0.7, 0, 0.3, 1] }}
          >
            <path d={UPPER} fill="#1c1c1a" opacity={0.18} filter="url(#shadow)" transform="translate(0 18)" />
            <path d={UPPER} fill="url(#porc-upper)" />
            <g clipPath="url(#clip-upper)">
              <motion.ellipse cx={lightX} cy={lightY} rx={150} ry={90} fill="#fff" opacity={0.85} filter="url(#soft)" />
              {[0, 1, 2, 3].map((i) => (
                <path
                  key={i}
                  d={`M 84 ${276 - i * 26} C 200 ${258 - i * 30}, 400 ${258 - i * 30}, 516 ${276 - i * 26}`}
                  fill="none"
                  stroke="#b9b0a0"
                  strokeOpacity={0.35}
                  strokeWidth={0.6}
                />
              ))}
            </g>
            <path d="M 90 289 C 200 271, 400 271, 510 289" fill="none" stroke="#fff" strokeWidth={1.4} opacity={0.9} />
          </motion.g>

          {/* Lower form */}
          <motion.g
            style={{ x: lowerX, y: lowerY }}
            animate={opening ? { y: 340, opacity: 0.2 } : undefined}
            transition={{ duration: 0.95, ease: [0.7, 0, 0.3, 1] }}
          >
            <path d={LOWER} fill="#1c1c1a" opacity={0.2} filter="url(#shadow)" transform="translate(0 26)" />
            <path d={LOWER} fill="url(#porc-lower)" />
            <g clipPath="url(#clip-lower)">
              <motion.ellipse cx={lightX} cy={lowerLightY} rx={140} ry={70} fill="#fff" opacity={0.6} filter="url(#soft)" />
            </g>
            <path d="M 92 312 C 200 369, 400 369, 508 312" fill="none" stroke="#fff" strokeWidth={1} opacity={0.7} />
          </motion.g>

          {/* Examination-light sweep */}
          {!reduce && !opening && (
            <motion.rect
              x={0}
              y={120}
              width={2}
              height={360}
              fill="url(#aperture-light)"
              opacity={0.7}
              animate={{ x: [40, 560] }}
              transition={{ duration: 5.5, repeat: Infinity, repeatDelay: 2.5, ease: 'easeInOut' }}
            />
          )}

          {/* Clinical labels */}
          <g style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.14em' }} fill="var(--color-muted)">
            <line x1={430} y1={176} x2={498} y2={122} stroke="var(--color-steel)" strokeWidth={0.7} />
            <circle cx={430} cy={176} r={2} fill="var(--color-charcoal)" />
            <text x={502} y={118}>UPPER · 11—28</text>
            <line x1={112} y1={300} x2={24} y2={300} stroke="var(--color-steel)" strokeWidth={0.7} />
            <circle cx={112} cy={300} r={2} fill="var(--color-clinic)" />
            <text x={24} y={290}>APERTURE</text>
            <line x1={170} y1={410} x2={100} y2={484} stroke="var(--color-steel)" strokeWidth={0.7} />
            <circle cx={170} cy={410} r={2} fill="var(--color-charcoal)" />
            <text x={30} y={500}>LOWER · 31—48</text>
            <text x={404} y={560}>{CLINIC.coordinates}</text>
          </g>
        </motion.svg>
      </div>

      {/* Full-viewport porcelain wash that carries the user through the aperture */}
      {opening && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-50 bg-porcelain"
          initial={{ clipPath: 'ellipse(0% 0% at 70% 50%)' }}
          animate={{ clipPath: 'ellipse(150% 150% at 70% 50%)' }}
          transition={{ delay: 0.35, duration: 0.6, ease: [0.7, 0, 0.3, 1] }}
        />
      )}
    </section>
  )
}

function Line({ children, delay }: { children: React.ReactNode; delay: number }) {
  const reduce = useReducedMotion()
  return (
    <span className="block overflow-hidden pb-[0.06em]">
      <motion.span
        className="block"
        initial={reduce ? false : { y: '105%' }}
        animate={{ y: 0 }}
        transition={{ delay, duration: 1, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.span>
    </span>
  )
}
