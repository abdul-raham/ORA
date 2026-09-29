import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useUi } from '../store/uiStore'

// First-visit entrance. The mark resolves over a dental arch, then the screen
// parts along a smile line — two porcelain forms moving apart — and hands over
// to the hero's own aperture. Plays once per session; any click or key skips.

const EASE = [0.65, 0, 0.35, 1] as const

export default function StudioIntro() {
  const { pathname } = useLocation()
  const introDone = useUi((s) => s.introDone)
  const finish = useUi((s) => s.finishIntro)
  const [phase, setPhase] = useState<'mark' | 'part'>('mark')
  const show = !introDone && pathname === '/'

  useEffect(() => {
    if (!show) return
    const a = window.setTimeout(() => setPhase('part'), 1750)
    const b = window.setTimeout(finish, 2650)
    const skip = () => finish()
    window.addEventListener('keydown', skip)
    window.addEventListener('pointerdown', skip)
    document.documentElement.style.overflow = 'hidden'
    return () => {
      window.clearTimeout(a)
      window.clearTimeout(b)
      window.removeEventListener('keydown', skip)
      window.removeEventListener('pointerdown', skip)
      document.documentElement.style.overflow = ''
    }
  }, [show, finish])

  return (
    <AnimatePresence>
      {show && (
        <motion.div className="fixed inset-0 z-[80]" exit={{ opacity: 0, transition: { duration: 0.2 } }} aria-label="ORA Dental Studio" role="img">
          {/* Upper and lower porcelain forms meeting along a smile line */}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
            <defs>
              <linearGradient id="intro-up" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#f6f2ea" />
                <stop offset="1" stopColor="#ece6da" />
              </linearGradient>
              <linearGradient id="intro-low" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#e9e2d5" />
                <stop offset="1" stopColor="#f5f1e9" />
              </linearGradient>
            </defs>
            <motion.g initial={{ y: 0 }} animate={{ y: phase === 'part' ? -62 : 0 }} transition={{ duration: 0.9, ease: EASE }}>
              <path d="M0 0 H100 V52 C70 60, 30 60, 0 52 Z" fill="url(#intro-up)" />
              <path d="M0 52 C30 60, 70 60, 100 52" fill="none" stroke="#fff" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            </motion.g>
            <motion.g initial={{ y: 0 }} animate={{ y: phase === 'part' ? 62 : 0 }} transition={{ duration: 0.9, ease: EASE }}>
              <path d="M0 52 C30 60, 70 60, 100 52 V100 H0 Z" fill="url(#intro-low)" />
              <path d="M0 52.4 C30 60.4, 70 60.4, 100 52.4" fill="none" stroke="#1c1c1a" strokeOpacity="0.12" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            </motion.g>
          </svg>

          <motion.div
            className="absolute inset-0 grid place-items-center"
            animate={{ opacity: phase === 'part' ? 0 : 1, scale: phase === 'part' ? 1.04 : 1 }}
            transition={{ duration: 0.45 }}
          >
            <div className="text-center">
              <svg viewBox="0 0 240 70" className="mx-auto mb-2 w-[220px]" aria-hidden>
                <motion.path
                  d="M20 62 C30 10, 210 10, 220 62"
                  fill="none"
                  stroke="var(--color-charcoal)"
                  strokeWidth="1"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.1, ease: EASE }}
                />
                {[0.12, 0.3, 0.5, 0.7, 0.88].map((t, i) => {
                  const x = 20 + 200 * t
                  const y = 62 - 52 * 4 * t * (1 - t) * 0.72
                  return (
                    <motion.circle
                      key={t}
                      cx={x}
                      cy={y}
                      r={2.2}
                      fill={i === 2 ? 'var(--color-clinic)' : 'var(--color-charcoal)'}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.35 + i * 0.1, type: 'spring', stiffness: 400, damping: 18 }}
                    />
                  )
                })}
              </svg>
              <p className="display flex items-baseline justify-center overflow-hidden text-[clamp(4.5rem,11vw,8rem)] !leading-none">
                {'ORA'.split('').map((c, i) => (
                  <motion.span key={c} initial={{ y: '110%' }} animate={{ y: 0 }} transition={{ delay: 0.25 + i * 0.09, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
                    {c}
                  </motion.span>
                ))}
                <motion.span
                  className="text-clinic"
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.75, type: 'spring', stiffness: 300, damping: 14 }}
                >
                  °
                </motion.span>
              </p>
              <motion.p
                className="label mt-5"
                initial={{ opacity: 0, letterSpacing: '0.4em' }}
                animate={{ opacity: 1, letterSpacing: '0.14em' }}
                transition={{ delay: 0.8, duration: 0.9 }}
              >
                Dental Studio · Victoria Island, Lagos
              </motion.p>
            </div>
          </motion.div>
          <p className="label absolute bottom-6 left-1/2 -translate-x-1/2 text-[9px] text-steel">Tap to skip</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
