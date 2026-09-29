import { animate, motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUi } from '../../store/uiStore'
import { useVisit } from '../../store/visitStore'
import { WARM_GRADE, imageSet, imageSrc } from './EditorialImage'

// The studio seen through a smile aperture. Two porcelain forms — upper and
// lower — frame a real treatment room through a smile-shaped opening. The
// opening is the entrance, it widens as you scroll, and Begin opens it fully
// to carry the patient into booking.

const REST = 0.62

const curve = (side: number, center: number) => {
  const c = (center - 0.25 * side) / 0.75
  return { side: side.toFixed(2), c: c.toFixed(2) }
}
/** Porcelain form paths for an aperture opening `o` (0 closed → 1 open). */
const upperPath = (o: number) => {
  const { side, c } = curve(52 - 14 * o, 52 - 22 * o)
  return `M0 0 H100 V${side} C70 ${c}, 30 ${c}, 0 ${side} Z`
}
const lowerPath = (o: number) => {
  const { side, c } = curve(52 + 8 * o, 52 + 38 * o)
  return `M0 100 H100 V${side} C70 ${c}, 30 ${c}, 0 ${side} Z`
}
const upperEdge = (o: number) => {
  const { side, c } = curve(52 - 14 * o, 52 - 22 * o)
  return `M100 ${side} C70 ${c}, 30 ${c}, 0 ${side}`
}
const lowerEdge = (o: number) => {
  const { side, c } = curve(52 + 8 * o, 52 + 38 * o)
  return `M100 ${side} C70 ${c}, 30 ${c}, 0 ${side}`
}

export default function SmileApertureHero() {
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const introDone = useUi((s) => s.introDone)
  const resetVisit = useVisit((s) => s.reset)
  const section = useRef<HTMLElement>(null)
  const [opening, setOpening] = useState(false)

  // Aperture: entrance → scroll → begin.
  const base = useMotionValue(reduce ? REST : 0)
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end start'] })
  const open = useTransform(() => {
    const b = base.get()
    return b + (b >= REST - 0.001 ? scrollYProgress.get() * 0.55 : 0)
  })
  const up = useTransform(open, upperPath)
  const low = useTransform(open, lowerPath)
  const upEdge = useTransform(open, upperEdge)
  const lowEdge = useTransform(open, lowerEdge)

  useEffect(() => {
    if (!introDone || reduce) return
    const c = animate(base, REST, { duration: 1.4, ease: [0.65, 0, 0.35, 1], delay: 0.1 })
    return () => c.stop()
  }, [introDone, reduce, base])

  // Cursor depth: the room drifts against the porcelain.
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 50, damping: 18 })
  const sy = useSpring(my, { stiffness: 50, damping: 18 })
  const photoX = useTransform(sx, (v) => v * -14)
  const photoY = useTransform(sy, (v) => v * -10)
  const onMove = (e: React.PointerEvent) => {
    if (reduce) return
    mx.set((e.clientX / window.innerWidth - 0.5) * 2)
    my.set((e.clientY / window.innerHeight - 0.5) * 2)
  }

  const begin = () => {
    resetVisit()
    if (reduce) return navigate('/visit')
    setOpening(true)
    animate(base, 2.4, { duration: 0.95, ease: [0.7, 0, 0.3, 1] })
    window.setTimeout(() => navigate('/visit', { state: { via: 'aperture' } }), 950)
  }

  const show = introDone
  const rise = (delay: number) => ({
    initial: reduce ? false : { y: '105%' },
    animate: show ? { y: 0 } : undefined,
    transition: { delay, duration: 1, ease: [0.22, 1, 0.36, 1] as const },
  })
  const fade = (delay: number) => ({
    initial: reduce ? false : { opacity: 0 },
    animate: show ? { opacity: 1 } : undefined,
    transition: { delay, duration: 0.8 },
  })

  return (
    <section ref={section} onPointerMove={onMove} className="relative h-[100svh] min-h-[620px] overflow-hidden" aria-labelledby="hero-title">
      {/* The room */}
      <motion.div className="absolute inset-[-3%]" style={{ x: photoX, y: photoY }}>
        <motion.img
          src={imageSrc('treatmentRoom')}
          srcSet={imageSet('treatmentRoom')}
          sizes="100vw"
          alt="A treatment chair at ORA, seen from above"
          fetchPriority="high"
          className="size-full object-cover"
          style={{ filter: WARM_GRADE, objectPosition: '50% 58%' }}
          initial={reduce ? false : { scale: 1.2 }}
          animate={show ? { scale: 1.02 } : undefined}
          transition={{ duration: 2.4, ease: [0.22, 1, 0.36, 1] }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(28,28,26,0.2))]" />
      </motion.div>

      {/* Examination light crossing the aperture */}
      {!reduce && show && !opening && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-[16%] bg-gradient-to-r from-transparent via-white/30 to-transparent"
          initial={{ left: '-20%' }}
          animate={{ left: '110%' }}
          transition={{ delay: 1.8, duration: 2.8, repeat: Infinity, repeatDelay: 6, ease: 'easeInOut' }}
        />
      )}

      {/* Porcelain forms */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full" aria-hidden>
        <defs>
          <linearGradient id="hero-up" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f5f1e9" />
            <stop offset="0.8" stopColor="#efe9de" />
            <stop offset="1" stopColor="#e2d9c9" />
          </linearGradient>
          <linearGradient id="hero-low" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ddd3c2" />
            <stop offset="0.15" stopColor="#ece6da" />
            <stop offset="1" stopColor="#f5f1e9" />
          </linearGradient>
        </defs>
        <motion.path d={up} fill="url(#hero-up)" />
        <motion.path d={low} fill="url(#hero-low)" />
        <motion.path d={upEdge} fill="none" stroke="#fff" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
        <motion.path d={lowEdge} fill="none" stroke="#fff" strokeOpacity={0.85} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
      </svg>

      <div className="relative z-10 flex h-full flex-col justify-between px-4 pb-7 pt-24 md:px-[5%] md:pb-9 md:pt-[130px]">
        {/* Upper form: the statement */}
        <div className="flex items-start justify-between gap-6">
          <h1 id="hero-title" className="display text-[clamp(2.4rem,6.2vw,5.9rem)] uppercase">
            <span className="block overflow-hidden pb-[0.06em]">
              <motion.span className="block" {...rise(0.05)}>
                Your smile
              </motion.span>
            </span>
            <span className="block overflow-hidden pb-[0.06em]">
              <motion.span className="block" {...rise(0.16)}>
                starts <em className="font-light normal-case italic">with</em> being heard.
              </motion.span>
            </span>
          </h1>
          <motion.p className="label hidden pt-3 text-right lg:block" {...fade(0.9)}>
            Private dentistry
            <br />
            Victoria Island, Lagos
          </motion.p>
        </div>


        {/* Lower form: the action */}
        <motion.div
          className="flex flex-wrap items-end justify-between gap-6"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={show ? { opacity: opening ? 0 : 1, y: 0 } : undefined}
          transition={{ delay: opening ? 0 : 0.8, duration: 0.7 }}
        >
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <button onClick={begin} className="btn-primary group !px-7 !py-5">
              Begin your visit
              <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </button>
            <Link to="/manage" className="btn-quiet">
              Manage a visit
            </Link>
          </div>
          <p className="hidden max-w-[300px] text-[0.95rem] leading-relaxed text-graphite sm:block">
            Tell us what brings you in. We’ll find the right visit and a time that works.
          </p>
        </motion.div>
      </div>

      {opening && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-50 bg-porcelain"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.4 }}
        />
      )}
    </section>
  )
}
