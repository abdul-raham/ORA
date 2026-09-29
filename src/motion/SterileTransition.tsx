import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

// Global route transition: a thin examination-light sweep crosses the viewport,
// the content behind it resolves to porcelain, and the next route is revealed.
// The sweep travels in the direction of navigation.

const ORDER = ['/', '/care', '/visit', '/manage', '/staff/login', '/staff']
const rank = (path: string) => {
  const i = ORDER.findIndex((p) => (p === '/' ? path === '/' : path.startsWith(p)))
  return i < 0 ? 0 : i
}

export default function SterileTransition() {
  const location = useLocation()
  const reduce = useReducedMotion()
  const prev = useRef(location.pathname)
  const [sweep, setSweep] = useState<{ key: number; dir: 1 | -1 } | null>(null)

  useEffect(() => {
    const from = prev.current
    prev.current = location.pathname
    if (from === location.pathname || reduce) return
    if ((location.state as { via?: string } | null)?.via === 'aperture') return
    setSweep({ key: Date.now(), dir: rank(location.pathname) >= rank(from) ? 1 : -1 })
  }, [location.pathname, location.state, reduce])

  return (
    <AnimatePresence>
      {sweep && (
        <motion.div
          key={sweep.key}
          className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
          aria-hidden
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-y-0 w-[160%]"
            style={{ left: sweep.dir === 1 ? '-160%' : '100%' }}
            animate={{ x: sweep.dir === 1 ? '162.5%' : '-162.5%' }}
            transition={{ duration: 0.78, ease: [0.65, 0, 0.35, 1] }}
            onAnimationComplete={() => setSweep(null)}
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  sweep.dir === 1
                    ? 'linear-gradient(90deg, transparent 0%, var(--color-porcelain) 22%, var(--color-porcelain) 60%, transparent 62%)'
                    : 'linear-gradient(270deg, transparent 0%, var(--color-porcelain) 22%, var(--color-porcelain) 60%, transparent 62%)',
              }}
            />
            <div
              className="absolute inset-y-0 w-px bg-white"
              style={{
                [sweep.dir === 1 ? 'left' : 'right']: '60%',
                boxShadow: '0 0 24px 6px rgba(255,255,255,0.9), 0 0 80px 20px rgba(221,230,222,0.8)',
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
