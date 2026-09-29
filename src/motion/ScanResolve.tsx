import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

// Fine contour scan lines resolve an incomplete surface into a complete one.
// Used for matching and staff sign-in.

export default function ScanResolve({ children, delay = 0, duration = 1.1, className = '' }: {
  children: ReactNode
  delay?: number
  duration?: number
  className?: string
}) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <div className={`relative ${className}`}>
      <motion.div
        initial={{ clipPath: 'inset(0 0 100% 0)', filter: 'blur(3px)' }}
        animate={{ clipPath: 'inset(0 0 0% 0)', filter: 'blur(0px)' }}
        transition={{ delay, duration, ease: [0.65, 0, 0.35, 1] }}
      >
        {children}
      </motion.div>
      {/* Contour lines ahead of the resolve edge */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-10"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(78,110,90,0.35) 0 1px, transparent 1px 4px)',
          maskImage: 'linear-gradient(0deg, black, transparent)',
        }}
        initial={{ top: '0%', opacity: 1 }}
        animate={{ top: '100%', opacity: 0 }}
        transition={{ delay, duration, ease: [0.65, 0, 0.35, 1], opacity: { delay: delay + duration * 0.85, duration: 0.2 } }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 h-px bg-clinic shadow-[0_0_12px_2px_rgba(78,110,90,0.45)]"
        initial={{ top: '0%', opacity: 1 }}
        animate={{ top: '100%', opacity: 0 }}
        transition={{ delay, duration, ease: [0.65, 0, 0.35, 1], opacity: { delay: delay + duration * 0.9, duration: 0.2 } }}
      />
    </div>
  )
}
